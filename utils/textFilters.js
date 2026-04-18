function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

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
