// utils/jsonRepair.js
export function fixJSONResponse(text) {
  if (!text) return '{}';

  let fixed = text.trim();

  fixed = fixed.replace(/```json/g, '').replace(/```/g, '');
  const firstBrace = fixed.indexOf('{');
  const lastBrace = fixed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    fixed = fixed.slice(firstBrace, lastBrace + 1);
  }

  return fixed;
}

export function extractFromTextResponse(text) {
  return {
    translated_text: text || '',
    content_summary: 'Content summary not available.',
    cultural_insights: 'Cultural insights not available.',
  };
}

export function parseLLMResponse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    try {
      const fixed = fixJSONResponse(text);
      return JSON.parse(fixed);
    } catch (secondError) {
      return extractFromTextResponse(text);
    }
  }
}