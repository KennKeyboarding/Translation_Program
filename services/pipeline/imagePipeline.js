// services/pipeline/imagePipeline.js
import formidable from 'formidable';
import fs from 'fs';
import sharp from 'sharp';

import { preprocessImage } from '../image/preprocessImage';
import { baiduOCR } from '../ocr/baiduOCR';
import { processOCRResult } from '../ocr/processOCRResult';
import { callKimi } from '../llm/kimiTranslator';
import { parseLLMResponse } from '../../utils/jsonRepair';
import { createAnnotationImage } from '../image/createAnnotationImage';
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

export async function runImagePipeline(req) {
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

  const llmRaw = await callKimi(processedOCR.fullText);
  const llmParsed = parseLLMResponse(llmRaw);
  const translationLines = getAlignedTranslationLines(
    llmParsed.translated_text,
    processedOCR.textBlocks.length
  );

  const annotatedBuffer = await createAnnotationImage(
    preprocessedBuffer,
    processedOCR,
    translationLines
  );

  return {
    original_text: processedOCR.fullText,
    translated_text: llmParsed.translated_text,
    translation_lines: translationLines,
    content_summary: llmParsed.content_summary,
    cultural_insights: llmParsed.cultural_insights,
    text_blocks: processedOCR.textBlocks,
    total_blocks: processedOCR.totalBlocks,
    quadrant_counts: processedOCR.quadrantCounts,
    image_dimensions: {
      width: metadata.width,
      height: metadata.height,
    },
    annotated_image: annotatedBuffer.toString('base64'),
  };
}
