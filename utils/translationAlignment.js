function normalizeLine(line) {
  return String(line || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getAlignedTranslationLines(translatedText, expectedCount = 0) {
  const rawLines = Array.isArray(translatedText)
    ? translatedText
    : String(translatedText || '').split(/\r?\n/);

  const lines = rawLines
    .map(normalizeLine)
    .filter(Boolean);

  if (!expectedCount) {
    return lines;
  }

  if (lines.length >= expectedCount) {
    return lines.slice(0, expectedCount);
  }

  return [
    ...lines,
    ...Array.from({ length: expectedCount - lines.length }, () => ''),
  ];
}
