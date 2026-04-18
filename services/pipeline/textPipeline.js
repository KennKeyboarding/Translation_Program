import { callKimi } from '../llm/kimiTranslator';
import { parseLLMResponse } from '../../utils/jsonRepair';
import { getAlignedTranslationLines } from '../../utils/translationAlignment';

export async function runTextPipeline(text) {
  const normalizedText = String(text || '').trim();

  if (!normalizedText) {
    throw new Error('No text provided');
  }

  const llmRaw = await callKimi(normalizedText);
  const llmParsed = parseLLMResponse(llmRaw);
  const inputLines = normalizedText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const translationLines = getAlignedTranslationLines(
    llmParsed.translated_text,
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
