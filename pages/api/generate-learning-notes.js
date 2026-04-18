import { callKimiForLearningNotes } from '../../services/llm/kimiLearningNotes';

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const texts = Array.isArray(req.body?.texts)
      ? req.body.texts.map((text) => String(text || '').trim()).filter(Boolean)
      : [];

    if (!texts.length) {
      return res.status(400).json({
        success: false,
        error: 'No texts provided',
      });
    }

    const uniqueTexts = [...new Set(texts)];
    const chunks = chunkArray(uniqueTexts, 4);
    const notes = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunkNotes = await callKimiForLearningNotes(chunks[index]);
      notes.push(...chunkNotes);

      if (index < chunks.length - 1) {
        await sleep(600);
      }
    }

    return res.status(200).json({
      success: true,
      notes,
    });
  } catch (error) {
    console.error('generate-learning-notes API error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
