function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasHan(text) {
  return /[\u3400-\u9fff]/u.test(String(text || ''));
}

function getDigitRatio(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;

  const digitCount = (normalized.match(/\d/g) || []).length;
  return digitCount / normalized.length;
}

function countMatches(texts, pattern) {
  return texts.filter((text) => pattern.test(text)).length;
}

function looksLikeMenuBlock(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  if (/[¥￥$]/.test(normalized)) return true;
  if (/\d+\s*(?:元|块|份|例|斤|两|串|杯|瓶|听|个|盘|碗|盒|袋)/u.test(normalized)) return true;
  if (/(?:\/\s*(?:份|例|斤|两|串|杯|瓶|听|个|盘|碗|盒|袋|A|B))/iu.test(normalized)) return true;
  if (/(?:套餐|招牌|主食|饮料|甜品|凉菜|热菜|面|饭|汤|小吃|加料|单点)/u.test(normalized)) return true;

  return false;
}

function getAverageLineLength(blocks) {
  if (!blocks.length) return 0;
  return blocks.reduce((sum, block) => sum + normalizeText(block.text).length, 0) / blocks.length;
}

function getLeftAlignmentScore(blocks) {
  if (blocks.length < 3) return 0;

  const sorted = [...blocks].sort((a, b) => a.location.top - b.location.top);
  let alignedPairs = 0;
  let comparablePairs = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const verticalGap = current.location.top - (previous.location.top + previous.location.height);

    if (verticalGap < -10 || verticalGap > 32) {
      continue;
    }

    comparablePairs += 1;

    const leftDiff = Math.abs(current.location.left - previous.location.left);
    const rightDiff = Math.abs(
      current.location.left + current.location.width - (previous.location.left + previous.location.width)
    );

    if (leftDiff <= 32 || rightDiff <= 46) {
      alignedPairs += 1;
    }
  }

  return comparablePairs ? alignedPairs / comparablePairs : 0;
}

function detectSpecificScene(normalizedTexts, menuSignalScore) {
  const joined = normalizedTexts.join('\n');

  if (menuSignalScore >= Math.max(2, normalizedTexts.length * 0.3)) {
    return 'menu';
  }

  if (
    /(?:通知|公告|讲座|会议|地点|时间|请于|请在|报到|参加|安排|同学|师生|活动|签到|开会|截止)/u.test(joined)
  ) {
    return 'notice';
  }

  if (
    /(?:说明书|使用方法|使用说明|操作步骤|注意事项|安装|功能|请勿|适用于|步骤|方法|禁忌|维护)/u.test(joined)
  ) {
    return 'instruction';
  }

  if (
    /(?:产品名称|规格|净含量|生产日期|保质期|配料|成分|厂址|执行标准|品牌|型号|使用期限)/u.test(joined)
  ) {
    return 'goods';
  }

  if (
    /(?:海报|扫码|开业|优惠|欢迎参加|活动主题|主办|承办|宣传|讲座主题|展览|演出|报名)/u.test(joined)
  ) {
    return 'poster';
  }

  return 'other';
}

export function detectSceneMode(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return {
      sceneType: 'other',
      renderMode: 'full_translation',
      reasoning: 'fallback-empty',
    };
  }

  const normalizedTexts = blocks.map((block) => normalizeText(block.text)).filter(Boolean);
  const averageLineLength = getAverageLineLength(blocks);
  const longLineCount = normalizedTexts.filter((text) => text.length >= 12).length;
  const shortLineCount = normalizedTexts.filter((text) => text.length <= 8).length;
  const priceLikeCount = normalizedTexts.filter(looksLikeMenuBlock).length;
  const hanLineCount = normalizedTexts.filter(hasHan).length;
  const highDigitCount = normalizedTexts.filter((text) => getDigitRatio(text) >= 0.28).length;
  const leftAlignmentScore = getLeftAlignmentScore(blocks);

  const menuSignalScore =
    priceLikeCount * 2 + (shortLineCount / Math.max(1, normalizedTexts.length)) * 3;
  const denseSignalScore =
    (longLineCount / Math.max(1, normalizedTexts.length)) * 4 +
    leftAlignmentScore * 3 +
    (averageLineLength >= 10 ? 1.5 : 0);

  const sceneType = detectSpecificScene(normalizedTexts, menuSignalScore);
  const shouldUseDenseMode =
    sceneType !== 'menu' ||
    (hanLineCount >= 3 &&
      denseSignalScore > menuSignalScore &&
      (leftAlignmentScore >= 0.34 || averageLineLength >= 10 || longLineCount >= 3) &&
      priceLikeCount <= Math.max(1, Math.floor(normalizedTexts.length * 0.18)) &&
      highDigitCount <= Math.max(2, Math.floor(normalizedTexts.length * 0.45)));

  return {
    sceneType,
    renderMode: shouldUseDenseMode ? 'full_translation' : 'quadrant',
    reasoning: shouldUseDenseMode ? 'dense-or-non-menu' : 'menu-structured',
  };
}

function mergeLocations(base, next) {
  const left = Math.min(base.left, next.left);
  const top = Math.min(base.top, next.top);
  const right = Math.max(base.left + base.width, next.left + next.width);
  const bottom = Math.max(base.top + base.height, next.top + next.height);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function getHorizontalOverlap(a, b) {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.left + a.width, b.left + b.width);
  return Math.max(0, right - left);
}

function shouldMergeDenseBlocks(previous, current) {
  const verticalGap = current.location.top - (previous.location.top + previous.location.height);
  if (verticalGap < -10 || verticalGap > Math.max(28, previous.location.height * 1.4)) {
    return false;
  }

  const leftDiff = Math.abs(current.location.left - previous.location.left);
  const rightDiff = Math.abs(
    current.location.left + current.location.width - (previous.location.left + previous.location.width)
  );
  const overlap = getHorizontalOverlap(previous.location, current.location);
  const minWidth = Math.max(1, Math.min(previous.location.width, current.location.width));
  const overlapRatio = overlap / minWidth;

  return leftDiff <= 40 || rightDiff <= 56 || overlapRatio >= 0.55;
}

export function mergeDenseTextBlocks(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return [];
  }

  const sorted = [...blocks].sort((a, b) => {
    if (Math.abs(a.location.top - b.location.top) < 18) {
      return a.location.left - b.location.left;
    }
    return a.location.top - b.location.top;
  });

  const merged = [];

  sorted.forEach((block) => {
    const previous = merged[merged.length - 1];

    if (!previous) {
      merged.push({
        ...block,
        text: block.text,
        sourceBlockIndices: [block.blockIndex],
        lineCount: 1,
      });
      return;
    }

    if (!shouldMergeDenseBlocks(previous, block)) {
      merged.push({
        ...block,
        text: block.text,
        sourceBlockIndices: [block.blockIndex],
        lineCount: 1,
      });
      return;
    }

    previous.text = `${previous.text}\n${block.text}`;
    previous.location = mergeLocations(previous.location, block.location);
    previous.sourceBlockIndices = [...previous.sourceBlockIndices, block.blockIndex];
    previous.lineCount += 1;
    previous.confidence = Math.min(previous.confidence || 1, block.confidence || 1);
  });

  return merged.map((block, index) => ({
    ...block,
    displayIndex: index + 1,
    displayLabel: `Paragraph ${index + 1}`,
  }));
}
