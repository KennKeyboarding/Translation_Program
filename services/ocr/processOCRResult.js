import {
  cleanTextEllipsis,
  isPriceText,
  isEllipsisText,
  isDecorationText,
  isNumberingText,
  isSimpleNumberText,
  isPriceUnitText,
  isMostlyEnglishText,
  isLowValueNoiseText,
  cleanMenuInlinePriceText,
  isMenuPortionOnlyText,
  isLikelyMenuPriceNoise,
  isQuantityUnitText,
  isMenuOptionTagText,
  isSuspiciousMixedFragmentText,
} from '../../utils/textFilters';
import { detectSceneMode, mergeDenseTextBlocks } from '../../utils/sceneMode';

function hasHan(text) {
  return /[\u3400-\u9fff]/u.test(String(text || ''));
}

function hasLatin(text) {
  return /[A-Za-z]/.test(String(text || ''));
}

function getHanCount(text) {
  return (String(text || '').match(/[\u3400-\u9fff]/gu) || []).length;
}

function getLatinCount(text) {
  return (String(text || '').match(/[A-Za-z]/g) || []).length;
}

function normalizeLocation(item) {
  if (item.location) return item.location;

  const vertices = item.vertexes_location || item.vertices;
  if (vertices && vertices.length >= 4) {
    const xs = vertices.map((vertex) => vertex.x || vertex.X);
    const ys = vertices.map((vertex) => vertex.y || vertex.Y);

    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  return { left: 0, top: 0, width: 100, height: 20 };
}

function getQuadrant(location, imageWidth, imageHeight) {
  const centerX = location.left + location.width / 2;
  const centerY = location.top + location.height / 2;

  if (centerX < imageWidth / 2 && centerY < imageHeight / 2) return 'top-left';
  if (centerX >= imageWidth / 2 && centerY < imageHeight / 2) return 'top-right';
  if (centerX < imageWidth / 2 && centerY >= imageHeight / 2) return 'bottom-left';
  return 'bottom-right';
}

function sortBlocks(blocks) {
  const quadrantOrder = {
    'top-left': 0,
    'top-right': 1,
    'bottom-left': 2,
    'bottom-right': 3,
  };

  return [...blocks].sort((a, b) => {
    if (quadrantOrder[a.quadrant] !== quadrantOrder[b.quadrant]) {
      return quadrantOrder[a.quadrant] - quadrantOrder[b.quadrant];
    }

    if (Math.abs(a.location.top - b.location.top) < 20) {
      return a.location.left - b.location.left;
    }

    return a.location.top - b.location.top;
  });
}

function compactText(text) {
  return String(text || '').replace(/\s+/g, '').trim();
}

function getIntersectionRatio(locationA, locationB) {
  const left = Math.max(locationA.left, locationB.left);
  const top = Math.max(locationA.top, locationB.top);
  const right = Math.min(locationA.left + locationA.width, locationB.left + locationB.width);
  const bottom = Math.min(locationA.top + locationA.height, locationB.top + locationB.height);

  if (right <= left || bottom <= top) return 0;

  const intersection = (right - left) * (bottom - top);
  const areaA = Math.max(1, locationA.width * locationA.height);
  const areaB = Math.max(1, locationB.width * locationB.height);

  return intersection / Math.min(areaA, areaB);
}

function isDuplicateBlock(candidate, existing) {
  if (compactText(candidate.text) !== compactText(existing.text)) return false;
  if (candidate.quadrant !== existing.quadrant) return false;

  return getIntersectionRatio(candidate.location, existing.location) >= 0.55;
}

function pickBetterBlock(candidate, existing) {
  const candidateConfidence = Number(candidate.confidence || 0);
  const existingConfidence = Number(existing.confidence || 0);
  if (candidateConfidence !== existingConfidence) {
    return candidateConfidence > existingConfidence ? candidate : existing;
  }

  const candidateArea = Number(candidate.location?.width || 0) * Number(candidate.location?.height || 0);
  const existingArea = Number(existing.location?.width || 0) * Number(existing.location?.height || 0);

  return candidateArea >= existingArea ? candidate : existing;
}

function dedupeBlocks(blocks) {
  return blocks.reduce((accumulator, block) => {
    const duplicateIndex = accumulator.findIndex((existing) => isDuplicateBlock(block, existing));
    if (duplicateIndex < 0) {
      accumulator.push(block);
      return accumulator;
    }

    accumulator[duplicateIndex] = pickBetterBlock(block, accumulator[duplicateIndex]);
    return accumulator;
  }, []);
}

function shouldKeepBlock(block, sceneType) {
  const text = String(block.text || '').trim();
  if (!text) return false;
  if (isEllipsisText(text)) return false;
  if (isDecorationText(text)) return false;
  if (isMostlyEnglishText(text)) return false;
  if (isSuspiciousMixedFragmentText(text)) return false;
  if (!hasHan(text) && hasLatin(text)) return false;
  if (text.length <= 1) return false;

  const hanCount = getHanCount(text);
  const latinCount = getLatinCount(text);

  if (hanCount > 0 && latinCount >= hanCount + 2 && text.length <= 18) {
    return false;
  }

  if (sceneType === 'menu') {
    if (isPriceText(text)) return false;
    if (isSimpleNumberText(text)) return false;
    if (isNumberingText(text)) return false;
    if (isPriceUnitText(text)) return false;
    if (isLowValueNoiseText(text)) return false;
    if (isMenuPortionOnlyText(text)) return false;
    if (isLikelyMenuPriceNoise(text)) return false;
    if (isQuantityUnitText(text)) return false;
    if (isMenuOptionTagText(text)) return false;
    return true;
  }

  if (isPriceText(text)) return false;
  if (isPriceUnitText(text)) return false;
  if (!hasHan(text) && isSimpleNumberText(text)) return false;
  if (!hasHan(text) && isLowValueNoiseText(text)) return false;
  return true;
}

function buildQuadrantCounts(blocks) {
  return blocks.reduce(
    (counts, block) => {
      counts[block.quadrant] = (counts[block.quadrant] || 0) + 1;
      return counts;
    },
    {
      'top-left': 0,
      'top-right': 0,
      'bottom-left': 0,
      'bottom-right': 0,
    }
  );
}

function buildPromptText(displayBlocks, renderMode) {
  if (!displayBlocks.length) return '';

  if (renderMode === 'full_translation') {
    return displayBlocks.map((block) => block.text).join('\n\n');
  }

  return displayBlocks.map((block) => block.text).join('\n');
}

export function processOCRResult(ocrResult, imageWidth, imageHeight) {
  if (!ocrResult.words_result || ocrResult.words_result.length === 0) {
    throw new Error('No text detected in image');
  }

  const candidateBlocks = ocrResult.words_result
    .map((item, index) => {
      const originalText = item.words || item.text || '';
      const cleanedText = cleanTextEllipsis(originalText);
      const location = normalizeLocation(item);

      return {
        text: cleanedText,
        originalText,
        location,
        confidence: item.probability || item.confidence || 0.9,
        blockIndex: index,
      };
    })
    .filter((block) => String(block.text || '').trim());

  const modeDecision = detectSceneMode(candidateBlocks);

  const processedBlocks = sortBlocks(
    dedupeBlocks(
      candidateBlocks
      .map((block) => {
        if (modeDecision.sceneType !== 'menu') return block;

        return {
          ...block,
          text: cleanMenuInlinePriceText(block.text),
        };
      })
      .filter((block) => String(block.text || '').trim())
      .filter((block) => shouldKeepBlock(block, modeDecision.sceneType))
      .map((block) => ({
        ...block,
        quadrant: getQuadrant(block.location, imageWidth, imageHeight),
      }))
    )
  );

  if (!processedBlocks.length) {
    throw new Error('No usable text detected after filtering');
  }

  const paragraphBlocks =
    modeDecision.renderMode === 'full_translation'
      ? mergeDenseTextBlocks(processedBlocks)
      : processedBlocks.map((block, index) => ({
          ...block,
          displayIndex: index + 1,
          displayLabel: `Block ${index + 1}`,
        }));

  const displayBlocks =
    modeDecision.renderMode === 'full_translation' ? paragraphBlocks : processedBlocks;

  return {
    sceneType: modeDecision.sceneType,
    renderMode: modeDecision.renderMode,
    textBlocks: processedBlocks.map((block, index) => ({
      ...block,
      displayIndex: index + 1,
      displayLabel: `Block ${index + 1}`,
    })),
    displayBlocks,
    paragraphBlocks,
    fullText: buildPromptText(displayBlocks, modeDecision.renderMode),
    totalBlocks: processedBlocks.length,
    displayBlockCount: displayBlocks.length,
    quadrantCounts: buildQuadrantCounts(processedBlocks),
    imageWidth,
    imageHeight,
  };
}
