// services/pipeline/imagePipeline.js
import formidable from 'formidable';
import fs from 'fs';
import sharp from 'sharp';

import { preprocessImage } from '../image/preprocessImage';
import { baiduOCR } from '../ocr/baiduOCR';
import { processOCRResult } from '../ocr/processOCRResult';
import { callKimi } from '../llm/kimiTranslator';
import { callKimiForLearningNotes } from '../llm/kimiLearningNotes';
import { parseLLMResponse } from '../../utils/jsonRepair';
import { createAnnotationImage } from '../image/createAnnotationImage';
import { createSimpleAnnotationImage } from '../image/createSimpleAnnotationImage';
import { getAlignedTranslationLines } from '../../utils/translationAlignment';

function parseForm(req) {
  const form = formidable({ multiples: false });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function normalizeKeywordTerms(keywordTerms) {
  if (!Array.isArray(keywordTerms)) return [];
  const seenTerms = new Set();

  return keywordTerms
    .map((item) => {
      if (!item) return null;

      if (typeof item === 'string') {
        const term = item.trim();
        if (!term || !/[\u3400-\u9fff]/u.test(term) || seenTerms.has(term)) return null;
        seenTerms.add(term);
        return { term, translation: '' };
      }

      const term = String(item.term || item.text || '').trim();
      const translation = String(item.translation || item.explanation || '').trim();

      if (!term && !translation) return null;
      if (!/[\u3400-\u9fff]/u.test(term)) return null;
      if (seenTerms.has(term)) return null;

      seenTerms.add(term);
      return { term, translation };
    })
    .filter(Boolean);
}

function compactText(text) {
  return String(text || '').replace(/\s+/g, '').trim();
}

function normalizeItemKeyPart(text) {
  return compactText(text).toLowerCase();
}

function stripMenuSeriesSuffix(text) {
  return String(text || '')
    .trim()
    .replace(/\s*(?:\d+|[一二三四五六七八九十两]+)\s*号$/u, '')
    .trim();
}

function getMenuSeriesKey(text) {
  const stripped = stripMenuSeriesSuffix(text);
  return normalizeItemKeyPart(stripped || text);
}

function chooseBetterMenuSeriesItem(candidate, existing) {
  const candidateText = String(candidate.block?.text || '').trim();
  const existingText = String(existing.block?.text || '').trim();
  const candidateTranslation = String(candidate.translation || '').trim();
  const existingTranslation = String(existing.translation || '').trim();

  if (candidateTranslation && !existingTranslation) return candidate;
  if (!candidateTranslation && existingTranslation) return existing;

  const candidateArea =
    Number(candidate.block?.location?.width || 0) * Number(candidate.block?.location?.height || 0);
  const existingArea =
    Number(existing.block?.location?.width || 0) * Number(existing.block?.location?.height || 0);

  if (candidateArea !== existingArea) {
    return candidateArea > existingArea ? candidate : existing;
  }

  if (candidateText.length !== existingText.length) {
    return candidateText.length < existingText.length ? candidate : existing;
  }

  return existing;
}

function stripNumberedMenuTranslation(text) {
  return String(text || '')
    .trim()
    .replace(/\s*(?:No\.?\s*\d+|\d+)$/i, '')
    .trim();
}

function getTrailingEnglishWords(text, wordCount = 2) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < wordCount) return '';
  return words.slice(-wordCount).join(' ');
}

function selectMobileBlockEntries(displayBlocks, translationLines, sceneType) {
  const rawEntries = displayBlocks
    .map((block, index) => ({
      block,
      translation: String(translationLines[index] || block.translation || '').trim(),
      originalIndex: index,
    }))
    .filter((entry) => String(entry.block?.text || entry.block?.term || '').trim());

  if (sceneType !== 'menu') {
    return rawEntries.map((entry, index) => ({
      ...entry,
      block: {
        ...entry.block,
        displayIndex: index + 1,
      },
    }));
  }

  const dedupedEntries = [];
  const seriesIndexMap = new Map();

  rawEntries.forEach((entry) => {
    const sourceText = String(entry.block?.text || entry.block?.term || '').trim();
    const seriesKey = getMenuSeriesKey(sourceText);

    if (!seriesKey) {
      dedupedEntries.push(entry);
      return;
    }

    if (!seriesIndexMap.has(seriesKey)) {
      seriesIndexMap.set(seriesKey, dedupedEntries.length);
      dedupedEntries.push(entry);
      return;
    }

    const existingIndex = seriesIndexMap.get(seriesKey);
    dedupedEntries[existingIndex] = chooseBetterMenuSeriesItem(entry, dedupedEntries[existingIndex]);
  });

  appendSeriesRepresentativeEntries(rawEntries, dedupedEntries);
  appendRepeatedSuffixEntries(dedupedEntries);

  return dedupedEntries.map((entry, index) => {
    const sourceText = String(entry.block?.text || entry.block?.term || '').trim();
    const mergedText = stripMenuSeriesSuffix(sourceText) || sourceText;

    return {
      ...entry,
      block: {
        ...entry.block,
        text: mergedText,
        displayIndex: index + 1,
      },
    };
  });
}

function countSharedHanChars(term, text) {
  const termChars = [...new Set(String(term || '').match(/[\u3400-\u9fff]/gu) || [])];
  if (!termChars.length) return 0;

  return termChars.reduce(
    (count, char) => (String(text || '').includes(char) ? count + 1 : count),
    0
  );
}

function scoreKeywordMatch(term, text) {
  const normalizedTerm = compactText(term);
  const normalizedText = compactText(text);
  if (!normalizedTerm || !normalizedText) return -1;
  if (normalizedText.includes(normalizedTerm)) {
    const lengthPenalty = Math.max(0, normalizedText.length - normalizedTerm.length);
    return normalizedTerm.length * 10 - lengthPenalty;
  }

  const sharedHanChars = countSharedHanChars(normalizedTerm, normalizedText);
  if (!sharedHanChars) return -1;

  return sharedHanChars * 3 - Math.max(0, normalizedText.length - normalizedTerm.length);
}

function buildKeywordLocation(block, term) {
  const sourceText = compactText(block.text || block.originalText || '');
  const sourceTerm = compactText(term);
  if (!sourceText || !sourceTerm) return block.location;

  const startIndex = sourceText.indexOf(sourceTerm);
  if (startIndex < 0) return block.location;

  const totalChars = Math.max(sourceText.length, 1);
  const termChars = Math.max(sourceTerm.length, 1);
  const charWidth = block.location.width / totalChars;
  const padding = Math.min(4, charWidth * 0.4);

  return {
    ...block.location,
    left: block.location.left + Math.max(0, startIndex * charWidth - padding),
      width: Math.min(block.location.width, Math.max(24, termChars * charWidth + padding * 2)),
  };
}

function buildSyntheticMenuEntry(entry, term, translation = '') {
  return {
    block: {
      ...entry.block,
      text: term,
      location: buildKeywordLocation(entry.block, term),
    },
    translation: translation.trim(),
    originalIndex: entry.originalIndex,
    synthetic: true,
  };
}

function appendSeriesRepresentativeEntries(rawEntries, dedupedEntries) {
  const groups = new Map();

  rawEntries.forEach((entry) => {
    const sourceText = String(entry.block?.text || '').trim();
    const root = stripMenuSeriesSuffix(sourceText);
    if (!root || root === sourceText) return;

    const key = normalizeItemKeyPart(root);
    if (!key) return;

    if (!groups.has(key)) {
      groups.set(key, { root, entries: [] });
    }

    groups.get(key).entries.push(entry);
  });

  groups.forEach(({ root, entries }) => {
    if (entries.length < 2) return;

    const alreadyIncluded = dedupedEntries.some(
      (entry) => normalizeItemKeyPart(String(entry.block?.text || '').trim()) === normalizeItemKeyPart(root)
    );
    if (alreadyIncluded) return;

    const representative = entries.reduce((best, current) =>
      chooseBetterMenuSeriesItem(current, best)
    );
    const translation = stripNumberedMenuTranslation(representative.translation);

    dedupedEntries.unshift(buildSyntheticMenuEntry(representative, root, translation));
  });
}

function appendRepeatedSuffixEntries(dedupedEntries) {
  const groups = new Map();

  dedupedEntries.forEach((entry) => {
    const sourceText = String(entry.block?.text || '').trim();
    const compact = compactText(sourceText);
    const match = compact.match(/([\u3400-\u9fff]{3,4})$/u);
    if (!match) return;

    const suffix = match[1];
    const key = normalizeItemKeyPart(suffix);

    if (!groups.has(key)) {
      groups.set(key, { suffix, entries: [] });
    }

    groups.get(key).entries.push(entry);
  });

  groups.forEach(({ suffix, entries }) => {
    if (entries.length < 2) return;

    const alreadyIncluded = dedupedEntries.some(
      (entry) => normalizeItemKeyPart(String(entry.block?.text || '').trim()) === normalizeItemKeyPart(suffix)
    );
    if (alreadyIncluded) return;

    const englishSuffixes = entries
      .map((entry) => getTrailingEnglishWords(entry.translation, 2))
      .filter(Boolean);

    const translation =
      englishSuffixes.length >= 2 &&
      englishSuffixes.every((item) => item.toLowerCase() === englishSuffixes[0].toLowerCase())
        ? englishSuffixes[0]
        : '';

    const representative = entries.reduce((best, current) =>
      chooseBetterMenuSeriesItem(current, best)
    );

    dedupedEntries.push(buildSyntheticMenuEntry(representative, suffix, translation));
  });
}

function buildKeywordDisplayItems(keywordTerms, textBlocks) {
  const normalizedTerms = normalizeKeywordTerms(keywordTerms);

  return normalizedTerms
    .map((item, index) => {
      let bestBlock = null;
      let bestScore = -1;

      textBlocks.forEach((block) => {
        const score = scoreKeywordMatch(item.term, block.text);
        if (score > bestScore) {
          bestScore = score;
          bestBlock = block;
        }
      });

      if (!bestBlock) {
        textBlocks.forEach((block) => {
          const score = scoreKeywordMatch(item.term, block.originalText || block.text);
          if (score > bestScore) {
            bestScore = score;
            bestBlock = block;
          }
        });
      }

      if (!bestBlock) return null;

      return {
        ...bestBlock,
        location: buildKeywordLocation(bestBlock, item.term),
        term: item.term,
        text: item.term,
        translation: item.translation,
        displayIndex: index + 1,
        displayLabel: `Keyword ${index + 1}`,
      };
    })
    .filter(Boolean);
}

function getDenseKeywordTarget(processedOCR) {
  const paragraphCount = Number(processedOCR?.displayBlockCount || 0);
  const fullText = String(processedOCR?.fullText || '');
  const compactLength = fullText.replace(/\s+/g, '').length;

  if (compactLength >= 420 || paragraphCount >= 10) {
    return { minimum: 14, maximum: 22 };
  }

  if (compactLength >= 260 || paragraphCount >= 7) {
    return { minimum: 12, maximum: 20 };
  }

  if (compactLength >= 140 || paragraphCount >= 4) {
    return { minimum: 10, maximum: 18 };
  }

  return { minimum: 8, maximum: 14 };
}

async function runSharedImagePipeline(req) {
  const { files } = await parseForm(req);

  const imageFile = files.image;
  if (!imageFile) {
    throw new Error('No image uploaded');
  }

  const file = Array.isArray(imageFile) ? imageFile[0] : imageFile;
  const imageBuffer = fs.readFileSync(file.filepath);

  const metadata = await sharp(imageBuffer).metadata();
  const preprocessedBuffer = await preprocessImage(imageBuffer);
  const ocrResult = await baiduOCR(preprocessedBuffer);
  const processedOCR = processOCRResult(
    ocrResult,
    metadata.width,
    metadata.height
  );

  const keywordTarget =
    processedOCR.renderMode === 'full_translation' ? getDenseKeywordTarget(processedOCR) : null;

  const llmRaw = await callKimi(processedOCR.fullText, {
    renderMode: processedOCR.renderMode,
    sceneType: processedOCR.sceneType,
    keywordTarget,
  });
  const llmParsed = parseLLMResponse(llmRaw);
  const keywordTerms = normalizeKeywordTerms(llmParsed.keyword_terms);
  const keywordDisplayItems =
    processedOCR.renderMode === 'full_translation'
      ? buildKeywordDisplayItems(keywordTerms, processedOCR.textBlocks || [])
      : [];
  const displayBlocks =
    processedOCR.renderMode === 'full_translation' && keywordDisplayItems.length
      ? keywordDisplayItems
      : processedOCR.displayBlocks || processedOCR.textBlocks;
  const translationLines = getAlignedTranslationLines(
    processedOCR.renderMode === 'full_translation'
      ? keywordDisplayItems.map((item) => item.translation)
      : llmParsed.translated_text,
    displayBlocks.length
  );

  return {
    metadata,
    preprocessedBuffer,
    processedOCR,
    llmParsed,
    keywordTarget,
    keywordTerms,
    keywordDisplayItems,
    displayBlocks,
    translationLines,
  };
}

export async function runImagePipeline(req) {
  const {
    metadata,
    preprocessedBuffer,
    processedOCR,
    llmParsed,
    keywordTarget,
    keywordTerms,
    keywordDisplayItems,
    displayBlocks,
    translationLines,
  } = await runSharedImagePipeline(req);

  const annotatedBuffer = await createAnnotationImage(
    preprocessedBuffer,
    processedOCR,
    {
      renderMode: processedOCR.renderMode,
      sceneType: processedOCR.sceneType,
      displayBlocks,
      translatedText: llmParsed.translated_text,
      translationLines,
      keywordTerms,
      keywordDisplayItems,
    }
  );

  return {
    original_text: processedOCR.fullText,
    translated_text: llmParsed.translated_text,
    translation_lines: translationLines,
    content_summary: llmParsed.content_summary,
    cultural_insights: llmParsed.cultural_insights,
    text_blocks: processedOCR.textBlocks,
    display_blocks: displayBlocks,
    paragraph_blocks: processedOCR.paragraphBlocks,
    keyword_display_items: keywordDisplayItems,
    total_blocks: processedOCR.totalBlocks,
    display_block_count: processedOCR.displayBlockCount,
    quadrant_counts: processedOCR.quadrantCounts,
    scene_type: processedOCR.sceneType,
    render_mode: processedOCR.renderMode,
    keyword_target: keywordTarget,
    keyword_terms: keywordTerms,
    image_dimensions: {
      width: metadata.width,
      height: metadata.height,
    },
    annotated_image: annotatedBuffer.toString('base64'),
  };
}

function normalizeLearningNotesMap(notes) {
  if (!Array.isArray(notes)) return {};

  return notes.reduce((accumulator, note) => {
    const text = String(note?.text || '').trim();
    if (!text) return accumulator;

    accumulator[text] = {
      pinyin: String(note?.pinyin || '').trim(),
      keywords: Array.isArray(note?.keywords)
        ? note.keywords
            .map((item) => {
              const term = String(item?.term || '').trim();
              const explanation = String(item?.explanation || '').trim();
              if (!term && !explanation) return null;
              return { term, explanation };
            })
            .filter(Boolean)
        : [],
    };
    return accumulator;
  }, {});
}

function buildMobileItems(blockEntries, learningNotesMap) {
  const rawItems = blockEntries
    .map((entry, index) => {
      const block = entry.block;
      const sourceText = String(block.text || block.term || '').trim();
      const translation = String(entry.translation || block.translation || '').trim();

      if (!sourceText) return null;

      const note = learningNotesMap[sourceText] || {};

      return {
        index: block.displayIndex || index + 1,
        chinese_text: sourceText,
        english_translation: translation,
        pinyin: String(note.pinyin || '').trim(),
        keywords: Array.isArray(note.keywords) ? note.keywords : [],
        quadrant: block.quadrant || '',
        scan_word_id: block.blockIndex,
      };
    })
    .filter(Boolean);

  const dedupedItems = [];
  const seenKeys = new Set();

  rawItems.forEach((item) => {
    const primaryKey = [
      normalizeItemKeyPart(item.chinese_text),
      normalizeItemKeyPart(item.english_translation),
    ].join('||');
    const fallbackKey = normalizeItemKeyPart(item.chinese_text);

    if (seenKeys.has(primaryKey) || seenKeys.has(fallbackKey)) {
      return;
    }

    seenKeys.add(primaryKey);
    seenKeys.add(fallbackKey);
    dedupedItems.push(item);
  });

  return dedupedItems.map((item, index) => ({
    ...item,
    index: index + 1,
  }));
}

export async function runMobileImagePipeline(req) {
  const {
    metadata,
    preprocessedBuffer,
    processedOCR,
    llmParsed,
    displayBlocks,
    translationLines,
  } = await runSharedImagePipeline(req);

  const selectedEntries = selectMobileBlockEntries(
    displayBlocks,
    translationLines,
    processedOCR.sceneType
  );

  const annotationBlocks = selectedEntries.map((entry) => entry.block);

  const annotatedBuffer = await createSimpleAnnotationImage(
    preprocessedBuffer,
    annotationBlocks
  );

  const noteTexts = annotationBlocks
    .map((block) => String(block.text || block.term || '').trim())
    .filter(Boolean);
  const learningNotes = noteTexts.length
    ? await callKimiForLearningNotes(noteTexts).catch((error) => {
        console.warn('Mobile learning notes fallback:', error.message);
        return [];
      })
    : [];
  const learningNotesMap = normalizeLearningNotesMap(learningNotes);
  const items = buildMobileItems(selectedEntries, learningNotesMap);

  return {
    scene_type: processedOCR.sceneType,
    render_mode: processedOCR.renderMode,
    original_text: processedOCR.fullText,
    annotated_image: `data:image/png;base64,${annotatedBuffer.toString('base64')}`,
    image_dimensions: {
      width: metadata.width,
      height: metadata.height,
    },
    items,
    content_summary: llmParsed.content_summary,
    cultural_insights: llmParsed.cultural_insights,
  };
}
