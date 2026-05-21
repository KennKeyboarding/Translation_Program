import { callKimi } from '../llm/kimiTranslator';
import { parseLLMResponse } from '../../utils/jsonRepair';
import { getAlignedTranslationLines } from '../../utils/translationAlignment';

function splitSourceTextUnits(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return [];

  const explicitLines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (explicitLines.length > 1) {
    return explicitLines;
  }

  const sentenceUnits = normalized
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？；!?;])/)
    .map((part) => part.trim())
    .filter(Boolean);

  return sentenceUnits.length ? sentenceUnits : [normalized];
}

function splitTranslatedTextUnits(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return [];

  const explicitLines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (explicitLines.length > 1) {
    return explicitLines;
  }

  const sentenceUnits = normalized
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return sentenceUnits.length ? sentenceUnits : [normalized];
}

export async function runTextPipeline(text) {
  const normalizedText = String(text || '').trim();

  if (!normalizedText) {
    throw new Error('No text provided');
  }

  const llmRaw = await callKimi(normalizedText);
  const llmParsed = parseLLMResponse(llmRaw);
  const inputLines = splitSourceTextUnits(normalizedText);
  const translatedUnits = splitTranslatedTextUnits(llmParsed.translated_text);
  const translationLines = getAlignedTranslationLines(
    translatedUnits.length ? translatedUnits : llmParsed.translated_text,
    inputLines.length || 1
  );

  return {
    original_text: normalizedText,
    translated_text: llmParsed.translated_text,
    translation_lines: translationLines,
    content_summary: llmParsed.content_summary,
    cultural_insights: llmParsed.cultural_insights,
  };
}
