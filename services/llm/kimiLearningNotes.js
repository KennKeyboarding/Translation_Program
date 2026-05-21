import axios from 'axios';
import { fixJSONResponse } from '../../utils/jsonRepair';

function normalizeKeywordItem(item) {
  if (!item) return null;

  if (typeof item === 'string') {
    const text = item.trim();
    if (!text) return null;
    return { term: text, explanation: '' };
  }

  const term = String(item.term || item.word || item.keyword || '').trim();
  const explanation = String(item.explanation || item.meaning || item.note || '').trim();

  if (!term && !explanation) return null;

  return {
    term,
    explanation,
  };
}

function normalizeNoteItem(item) {
  if (!item) return null;

  const text = String(item.text || '').trim();
  if (!text) return null;

  return {
    text,
    pinyin: String(item.pinyin || '').trim(),
    keywords: Array.isArray(item.keywords)
      ? item.keywords.map(normalizeKeywordItem).filter(Boolean).slice(0, 3)
      : [],
  };
}

function parseLearningNotesResponse(rawText) {
  try {
    const parsed = JSON.parse(fixJSONResponse(rawText));
    const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    return notes.map(normalizeNoteItem).filter(Boolean);
  } catch (error) {
    throw new Error('Failed to parse learning notes response');
  }
}

export async function callKimiForLearningNotes(texts) {
  const normalizedTexts = Array.isArray(texts)
    ? texts.map((text) => String(text || '').trim()).filter(Boolean)
    : [];

  if (!normalizedTexts.length) {
    return [];
  }

  const prompt = `
You are a Chinese learning assistant for international learners.

For each Chinese text item below, generate:
1. "pinyin": standard Hanyu Pinyin with tone marks and spaces.
2. "keywords": 1 to 3 important words or short phrases from the text, each with a simple English explanation for learners.

Rules:
- Keep every original text exactly unchanged in the "text" field.
- Return all items.
- Explanations must be concise and learner-friendly.
- Return strict JSON only, with this format:
{
  "notes": [
    {
      "text": "sample text",
      "pinyin": "shi li",
      "keywords": [
        { "term": "sample term", "explanation": "simple English explanation" }
      ]
    }
  ]
}

Texts:
${JSON.stringify(normalizedTexts, null, 2)}
`;

  try {
    const response = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1800,
        temperature: 0.2,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    return parseLearningNotesResponse(response.data.choices?.[0]?.message?.content || '');
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

    throw new Error(`Kimi learning notes error: ${error.message}`);
  }
}
