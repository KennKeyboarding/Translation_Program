function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSuspiciousMixedFragmentText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  if (!hasHan(trimmed) || !/[A-Za-z]/.test(trimmed)) return false;

  return [
    /^[\u3400-\u9fff]{1,4}[A-Z]{2,}[.]?$/u,
    /^[A-Z]{2,}[\u3400-\u9fff]{1,4}[.]?$/u,
    /^[\u3400-\u9fff]{1,4}[A-Z]{1,3}\d{1,3}[.]?$/u,
    /^[\u3400-\u9fff]{1,4}\d{1,3}[A-Z]{1,3}[.]?$/u,
  ].some((pattern) => pattern.test(trimmed));
}

const YEN_SYMBOL_PATTERN = '[￥¥]';

function hasHan(text) {
  return /[\u3400-\u9fff]/u.test(text);
}

function getDigitRatio(text) {
  if (!text) return 0;
  const digits = (text.match(/\d/g) || []).length;
  return digits / text.length;
}

export function cleanTextEllipsis(text) {
  let cleaned = normalizeText(text);

  cleaned = cleaned.replace(/(?:\.{2,}|…{1,}|··+)/g, '');
  cleaned = cleaned.replace(/^[·•~\-_=/]+|[·•~\-_=/]+$/g, '');

  return cleaned.trim();
}

export function isEllipsisText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return true;

  return /^(?:\.{2,}|…+|··+|[·•]{2,})$/.test(trimmed);
}

export function isDecorationText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  if (/^[\p{P}\p{S}\s]+$/u.test(trimmed) && trimmed.length >= 2) {
    return true;
  }

  return [
    /^[\-_=~*+/\\|]{2,}$/,
    /^[()（）[\]【】<>《》「」『』]+$/u,
    /^[·•○●◎◇◆□■△▲▽▼※]+$/u,
  ].some(pattern => pattern.test(trimmed));
}

export function isPriceText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  if (new RegExp(`^${YEN_SYMBOL_PATTERN}\\s*\\d+(?:\\.\\d{1,2})?(?:\\s*\\/\\s*[A-Za-z\\u4e00-\\u9fff]+)?$`, 'u').test(trimmed)) {
    return true;
  }

  return [
    /^(?:[$¥￥]|rmb|cny)\s*\d+(?:\.\d{1,2})?$/i,
    /^\d+(?:\.\d{1,2})?\s*(?:元|块|人民币)$/u,
    /^\d+(?:\.\d{1,2})?\s*(?:元|块)?\s*\/\s*(?:份|例|位|个|串|盘|碗|杯|瓶|扎|斤|两|只|盒|袋|A|B)$/iu,
    /^\d+(?:\.\d{1,2})?\s*(?:元|块)(?:份|例|位|个|串|盘|碗|杯|瓶|扎|斤|两|只|盒|袋|A|B)$/iu,
    /^(?:价格|售价|现价|特价|会员价)[:：]?\s*(?:[$¥￥]|rmb|cny)?\s*\d+(?:\.\d{1,2})?\s*(?:元|块)?$/iu,
    /^\d+(?:\.\d{1,2})?\s*(?:元|块)\s*起$/u,
  ].some(pattern => pattern.test(trimmed));
}

export function isNumberingText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  return [
    /^(?:no|n0)\.?\s*\d+$/i,
    /^#\s*\d+$/,
    /^编号[:：]?\s*\d+$/u,
    /^\d+\s*(?:[.)、]|号)$/u,
    /^[一二三四五六七八九十百千两]+\s*[、.)]$/u,
    /^第\s*[一二三四五六七八九十百千两0-9]+\s*(?:号|页|章|节|项|道|款)$/u,
    /^[①-⑳㉑-㉟㊱-㊿]$/u,
  ].some(pattern => pattern.test(trimmed));
}

export function isSimpleNumberText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  const compact = trimmed.replace(/\s+/g, '');
  return /^[+-]?\d+(?:[.,:/xX×%+\-~]\d+)*%?$/.test(compact);
}

export function isPriceUnitText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  return /^(?:元|块|人民币|[$¥￥]|rmb|cny|\/(?:份|例|位|个|串|盘|碗|杯|瓶|扎|斤|两|只|盒|袋|A|B)|每(?:份|例|位|个|串|盘|碗|杯|瓶|扎|斤|两|只|盒|袋))$/iu.test(
    trimmed
  );
}

export function isMostlyEnglishText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;
  if (hasHan(trimmed)) return false;
  if (!/[a-z]/i.test(trimmed)) return false;

  return /^[a-z0-9\s&'".,!?():+\-/]+$/i.test(trimmed);
}

export function isLowValueNoiseText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  if (
    /^\d+(?:\.\d{1,2})?(?:元|块)?(?:份|例|位|个|串|盘|碗|杯|瓶|扎|斤|两|只|盒|袋|A|B|利)?$/iu.test(
      trimmed
    )
  ) {
    return true;
  }

  if (/^\d+(?:元|块)?[/／][A-Za-z一-龥]$/u.test(trimmed)) {
    return true;
  }

  if (trimmed.length <= 4 && getDigitRatio(trimmed) >= 0.34) {
    if (!hasHan(trimmed)) return true;
    if (/^[\d元块份例位个串盘碗杯瓶扎斤两只盒袋利A-Za-z/／]+$/iu.test(trimmed)) {
      return true;
    }
  }

  return false;
}

export function cleanMenuInlinePriceText(text) {
  let cleaned = normalizeText(text);
  if (!cleaned) return '';

  cleaned = cleaned.replace(
    /[（(]\s*(?:大|中|小|超大|特大|\d+\s*(?:只|个|份|碗|杯|盘|盒|袋|瓶|听|串)|[一二两三四五六七八九十百半]+\s*(?:只|个|份|碗|杯|盘|盒|袋|瓶|听|串))\s*[)）]/gu,
    ' '
  );

  cleaned = cleaned.replace(
    new RegExp(`\\s*${YEN_SYMBOL_PATTERN}\\s*\\d+(?:\\.\\d{1,2})?(?:\\s*\\/\\s*[A-Za-z\\u4e00-\\u9fff]+)?\\s*`, 'gu'),
    ' '
  );
  cleaned = cleaned.replace(
    /\s*\d+(?:\.\d{1,2})?\s*(?:元|块|RMB|rmb|CNY|cny)(?:\s*\/\s*[A-Za-z\u4e00-\u9fff]+)?\s*/g,
    ' '
  );
  cleaned = cleaned.replace(/\s*\d+(?:\.\d{1,2})?\s*(?:元|块)\s*/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  const compact = cleaned.replace(/\s+/g, '');
  const repeatedMatch = compact.match(/^([\u3400-\u9fff]{2,12})\1$/u);
  if (repeatedMatch) {
    cleaned = repeatedMatch[1];
  }

  cleaned = cleaned.replace(
    /^([\u3400-\u9fff]{2,20})\s*(?:大|中|小|超大|特大)(?:碗|份|杯|盘|锅|扎|例|瓶|盒|袋|听)$/u,
    '$1'
  );

  return cleaned.trim();
}

export function isMenuPortionOnlyText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  return /^(?:大|中|小|超大|特大)(?:碗|份|杯|盘|锅|扎|例|瓶|盒|袋|听)$/u.test(trimmed);
}

export function isLikelyMenuPriceNoise(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  const compact = trimmed.replace(/\s+/g, '');
  const digitRatio = getDigitRatio(compact);

  if (compact.length <= 6 && digitRatio >= 0.25) {
    if (/^[\u3400-\u9fff]{1,3}\d{1,3}(?:\.\d{1,2})?[\u3400-\u9fff]{1,3}$/u.test(compact)) {
      return true;
    }

    if (/^(?:大|中|小|超大|特大)?[\u3400-\u9fff]{0,2}\d{1,3}(?:\.\d{1,2})?[\u3400-\u9fff]{0,2}$/u.test(compact)) {
      return true;
    }
  }

  return false;
}

export function isQuantityUnitText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  return /^(?:\d+|[一二两三四五六七八九十百半]+)\s*(?:只|个|份|碗|杯|盘|盒|袋|瓶|听|串|斤|两|块|包|张|条)$/u.test(
    trimmed
  );
}

export function isMenuOptionTagText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  return /^[（(]\s*(?:大|中|小|超大|特大|\d+\s*(?:只|个|份|碗|杯|盘|盒|袋|瓶|听|串)|[一二两三四五六七八九十百半]+\s*(?:只|个|份|碗|杯|盘|盒|袋|瓶|听|串))\s*[)）]$/u.test(
    trimmed
  );
}
