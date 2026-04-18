// services/ocr/processOCRResult.js
import {
  cleanTextEllipsis,
  isPriceText,
  isEllipsisText,
  isDecorationText,
  isNumberingText,
  isSimpleNumberText,
  isPriceUnitText,
  isMostlyEnglishText,
  isLowValueNoiseText,
} from '../../utils/textFilters';

function normalizeLocation(item) {
  if (item.location) return item.location;

  const vertices = item.vertexes_location || item.vertices;
  if (vertices && vertices.length >= 4) {
    const xs = vertices.map(v => v.x || v.X);
    const ys = vertices.map(v => v.y || v.Y);

    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  return { left: 0, top: 0, width: 100, height: 20 };
}

function getQuadrant(location, imageWidth, imageHeight) {
  const centerX = location.left + location.width / 2;
  const centerY = location.top + location.height / 2;

  if (centerX < imageWidth / 2 && centerY < imageHeight / 2) return 'top-left';
  if (centerX >= imageWidth / 2 && centerY < imageHeight / 2) return 'top-right';
  if (centerX < imageWidth / 2 && centerY >= imageHeight / 2) return 'bottom-left';
  return 'bottom-right';
}

export function processOCRResult(ocrResult, imageWidth, imageHeight) {
  if (!ocrResult.words_result || ocrResult.words_result.length === 0) {
    throw new Error('No text detected in image');
  }

  const processedBlocks = ocrResult.words_result
    .map(item => {
      const originalText = item.words || item.text || '';
      const cleanedText = cleanTextEllipsis(originalText);
      const location = normalizeLocation(item);

      return {
        text: cleanedText,
        originalText,
        location,
        confidence: item.probability || item.confidence || 0.9,
      };
    })
    .filter(block => {
      const text = block.text.trim();
      if (!text) return false;
      if (isPriceText(text)) return false;
      if (isSimpleNumberText(text)) return false;
      if (isNumberingText(text)) return false;
      if (isDecorationText(text)) return false;
      if (isEllipsisText(text)) return false;
      if (isPriceUnitText(text)) return false;
      if (isMostlyEnglishText(text)) return false;
      if (isLowValueNoiseText(text)) return false;
      if (text.length <= 1) return false;
      return true;
    })
    .map((block, index) => ({
      ...block,
      quadrant: getQuadrant(block.location, imageWidth, imageHeight),
      blockIndex: index,
    }))
    .sort((a, b) => {
      const quadrantOrder = {
        'top-left': 0,
        'top-right': 1,
        'bottom-left': 2,
        'bottom-right': 3,
      };

      if (quadrantOrder[a.quadrant] !== quadrantOrder[b.quadrant]) {
        return quadrantOrder[a.quadrant] - quadrantOrder[b.quadrant];
      }

      if (Math.abs(a.location.top - b.location.top) < 20) {
        return a.location.left - b.location.left;
      }

      return a.location.top - b.location.top;
    });

  const quadrantCounts = processedBlocks.reduce((counts, block) => {
    counts[block.quadrant] = (counts[block.quadrant] || 0) + 1;
    return counts;
  }, {});

  return {
    textBlocks: processedBlocks,
    fullText: processedBlocks.map(block => block.text).join('\n'),
    totalBlocks: processedBlocks.length,
    quadrantCounts,
    imageWidth,
    imageHeight,
  };
}
