import axios from 'axios';

function getSceneInstruction(sceneType) {
  switch (sceneType) {
    case 'notice':
      return 'This is likely a notice or announcement. In content_summary, explicitly mention the purpose, time, place, target audience, and required action if they appear.';
    case 'instruction':
      return 'This is likely an instruction or manual. In content_summary, mention the product/object, main usage steps, and warnings or cautions if they appear.';
    case 'goods':
      return 'This is likely a goods label or packaging text. In content_summary, mention the product name, specification, ingredients or composition, and shelf-life or date information if they appear.';
    case 'poster':
      return 'This is likely a poster or promotional text. In content_summary, mention the event/theme, organizer, time, place, and call to action if they appear.';
    case 'menu':
      return 'This is likely a menu or short structured text. In content_summary, describe the overall type of dishes or offerings instead of repeating every line.';
    default:
      return 'Use the content_summary field to capture the most important facts, not just a vague description.';
  }
}

function getKeywordInstruction(keywordTarget = {}) {
  const minimum = Math.max(6, Number(keywordTarget.minimum || 8));
  const maximum = Math.max(minimum, Number(keywordTarget.maximum || 14));

  return `${minimum} to ${maximum}`;
}

function buildMenuPrompt(chineseText) {
  return `
You are a translation assistant for international learners of Chinese.

Input text:
"""
${chineseText}
"""

Task:
1. Keep the exact same line order as the input.
2. Translate each Chinese line into exactly one English line.
3. Write a short but useful content summary in English.
4. Add short cultural or usage insights in English when helpful.
5. Return 3 to 6 key Chinese terms with short English explanations.

Return strict JSON only:
{
  "translated_text": "line 1 translation\\nline 2 translation",
  "content_summary": "brief summary",
  "cultural_insights": "brief cultural notes",
  "keyword_terms": [
    { "term": "term in Chinese", "translation": "short English explanation" }
  ]
}
`;
}

function buildDenseTextPrompt(chineseText, sceneType, keywordTarget) {
  return `
You are a translation and reading-support assistant for international learners of Chinese.

Input text:
"""
${chineseText}
"""

Scene hint:
${getSceneInstruction(sceneType)}

Task:
1. The input is paragraph-like text from a notice, poster, manual, label, or other dense reading material.
2. Translate each input paragraph into one English paragraph in the same order.
3. Keep the translated_text field paragraph-based. Separate translated paragraphs with "\\n\\n".
4. Write a concise but information-rich content_summary in English. Prefer key facts such as what happened, when, where, who, required action, cautions, or product facts if present.
5. Add short cultural or contextual reading notes in English.
6. Extract ${getKeywordInstruction(keywordTarget)} important Chinese keywords or short phrases from the image text and give short English translations.
7. Prefer broader learner-relevant coverage for language learning: titles, people, places, times, actions, object names, warnings, requirements, product facts, and useful scene vocabulary when present.
8. Prefer exact Chinese words or short phrases that appear in the input text, so they can be linked back to the image.
9. Do not output English-only OCR fragments as keywords.

Return strict JSON only:
{
  "translated_text": "paragraph 1 translation\\n\\nparagraph 2 translation",
  "content_summary": "overall summary with key facts",
  "cultural_insights": "contextual notes",
  "keyword_terms": [
    { "term": "term in Chinese", "translation": "short English translation" }
  ]
}
`;
}

export async function callKimi(chineseText, options = {}) {
  const { renderMode = 'quadrant', sceneType = 'menu', keywordTarget = null } = options;
  const prompt =
    renderMode === 'full_translation' || sceneType !== 'menu'
      ? buildDenseTextPrompt(chineseText, sceneType, keywordTarget)
      : buildMenuPrompt(chineseText);

  try {
    const response = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2200,
        temperature: 0.2,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices?.[0]?.message?.content || '';
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Kimi API: invalid API key');
    }
    if (error.response?.status === 429) {
      throw new Error('Kimi API: rate limit exceeded');
    }
    if (error.response?.status === 402) {
      throw new Error('Kimi API: insufficient balance');
    }

    throw new Error(`Kimi API error: ${error.message}`);
  }
}
