import sharp from 'sharp';
import { getAlignedTranslationLines } from '../../utils/translationAlignment';

const QUADRANT_ORDER = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const QUADRANT_CONFIG = {
  'top-left': {
    title: 'Upper Left',
    subtitle: '左上区域',
    side: 'left',
    color: '#ef6c00',
    background: '#fff3e0',
  },
  'top-right': {
    title: 'Upper Right',
    subtitle: '右上区域',
    side: 'right',
    color: '#2e7d32',
    background: '#e8f5e9',
  },
  'bottom-left': {
    title: 'Lower Left',
    subtitle: '左下区域',
    side: 'left',
    color: '#1565c0',
    background: '#e3f2fd',
  },
  'bottom-right': {
    title: 'Lower Right',
    subtitle: '右下区域',
    side: 'right',
    color: '#6a1b9a',
    background: '#f3e5f5',
  },
};

function escapeSvgText(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapText(text, maxCharsPerLine) {
  const normalized = String(text || '').trim();
  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [normalized];
  }

  const lines = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      lines.push(current);
      current = words[index];
    }
  }

  lines.push(current);
  return lines;
}

function buildGroups(textBlocks, translatedText) {
  const translationLines = getAlignedTranslationLines(
    translatedText,
    (textBlocks || []).length
  );

  return QUADRANT_ORDER.reduce((result, quadrant) => {
    result[quadrant] = [];
    return result;
  }, {});
}

function prepareGroupData(textBlocks, translatedText, panelWidth) {
  const groups = buildGroups(textBlocks, translatedText);
  const translationLines = getAlignedTranslationLines(
    translatedText,
    (textBlocks || []).length
  );

  (textBlocks || []).forEach((block, index) => {
    const quadrant = QUADRANT_CONFIG[block.quadrant] ? block.quadrant : 'top-left';
    const translation = translationLines[index] || '';
    const wrappedText = wrapText(
      translation || 'Translation unavailable / 待补充',
      panelWidth > 360 ? 36 : 30
    ).slice(0, 4);

    groups[quadrant].push({
      ...block,
      displayIndex: index + 1,
      translation,
      wrappedText,
      itemHeight: Math.max(52, wrappedText.length * 22 + 18),
    });
  });

  return groups;
}

function getPanelLayout(imageWidth, imageHeight, groups) {
  const leftPanelWidth = 400;
  const rightPanelWidth = 400;
  const panelInnerWidth = leftPanelWidth - 44;
  const rowGap = 28;
  const topMargin = 24;
  const bottomMargin = 24;
  const headerHeight = 54;
  const panelPaddingTop = 20;
  const panelPaddingBottom = 18;

  const getPanelHeight = (blocks) => {
    const contentHeight = blocks.reduce((sum, block) => sum + block.itemHeight, 0);
    return Math.max(190, headerHeight + panelPaddingTop + panelPaddingBottom + contentHeight);
  };

  const topLeftHeight = getPanelHeight(groups['top-left']);
  const topRightHeight = getPanelHeight(groups['top-right']);
  const bottomLeftHeight = getPanelHeight(groups['bottom-left']);
  const bottomRightHeight = getPanelHeight(groups['bottom-right']);

  const topRowHeight = Math.max(topLeftHeight, topRightHeight);
  const bottomRowHeight = Math.max(bottomLeftHeight, bottomRightHeight);
  const canvasHeight = Math.max(
    imageHeight + 60,
    topMargin + topRowHeight + rowGap + bottomRowHeight + bottomMargin
  );
  const canvasWidth = imageWidth + leftPanelWidth + rightPanelWidth;
  const imageOffsetX = leftPanelWidth;
  const imageOffsetY = Math.round((canvasHeight - imageHeight) / 2);

  return {
    canvasWidth,
    canvasHeight,
    imageOffsetX,
    imageOffsetY,
    leftPanelWidth,
    rightPanelWidth,
    headerHeight,
    panelPaddingTop,
    panelPaddingBottom,
    panels: {
      'top-left': {
        x: 20,
        y: topMargin,
        width: leftPanelWidth - 40,
        height: topLeftHeight,
      },
      'top-right': {
        x: leftPanelWidth + imageWidth + 20,
        y: topMargin,
        width: rightPanelWidth - 40,
        height: topRightHeight,
      },
      'bottom-left': {
        x: 20,
        y: topMargin + topRowHeight + rowGap,
        width: leftPanelWidth - 40,
        height: bottomLeftHeight,
      },
      'bottom-right': {
        x: leftPanelWidth + imageWidth + 20,
        y: topMargin + topRowHeight + rowGap,
        width: rightPanelWidth - 40,
        height: bottomRightHeight,
      },
    },
  };
}

export async function createAnnotationImage(imageBuffer, ocrResult, translatedText) {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const imageWidth = metadata.width || 0;
  const imageHeight = metadata.height || 0;
  const groups = prepareGroupData(ocrResult.textBlocks || [], translatedText, 356);
  const layout = getPanelLayout(imageWidth, imageHeight, groups);

  let svg = `
    <svg width="${layout.canvasWidth}" height="${layout.canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${layout.imageOffsetX - 1}"
        y="${layout.imageOffsetY - 1}"
        width="${imageWidth + 2}"
        height="${imageHeight + 2}"
        fill="none"
        stroke="#cbd5e1"
        stroke-width="1"
        rx="14"
      />
  `;

  QUADRANT_ORDER.forEach(quadrant => {
    const config = QUADRANT_CONFIG[quadrant];
    const panel = layout.panels[quadrant];
    const blocks = groups[quadrant];

    if (!blocks.length) {
      return;
    }

    svg += `
      <rect
        x="${panel.x}"
        y="${panel.y}"
        width="${panel.width}"
        height="${panel.height}"
        fill="${config.background}"
        stroke="${config.color}"
        stroke-width="2"
        rx="18"
      />
      <rect
        x="${panel.x}"
        y="${panel.y}"
        width="${panel.width}"
        height="${layout.headerHeight}"
        fill="${config.color}"
        rx="18"
      />
      <rect
        x="${panel.x}"
        y="${panel.y + layout.headerHeight - 16}"
        width="${panel.width}"
        height="16"
        fill="${config.color}"
      />
      <text
        x="${panel.x + panel.width / 2}"
        y="${panel.y + 24}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="18"
        font-weight="700"
        fill="#ffffff"
      >${escapeSvgText(config.title)}</text>
      <text
        x="${panel.x + panel.width / 2}"
        y="${panel.y + 42}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="12"
        fill="#ffffff"
        opacity="0.92"
      >${escapeSvgText(`${config.subtitle} (${blocks.length})`)}</text>
    `;

    let currentY = panel.y + layout.headerHeight + layout.panelPaddingTop;

    blocks.forEach(block => {
      const bubbleRadius = 13;
      const itemCenterY = currentY + 10;
      const blockLeft = layout.imageOffsetX + block.location.left;
      const blockTop = layout.imageOffsetY + block.location.top;
      const blockWidth = block.location.width;
      const blockHeight = block.location.height;
      const blockCenterY = blockTop + blockHeight / 2;
      const sourceBubbleX = config.side === 'left'
        ? blockLeft - 22
        : blockLeft + blockWidth + 22;
      const panelBubbleX = panel.x + 22;
      const guideStartX = sourceBubbleX;
      const guideEndX = panelBubbleX;
      const guideControlOffset = config.side === 'left' ? -110 : 110;
      const textX = panel.x + 46;
      const textBaseY = currentY + 4;
      const fontSize = 17;
      const lineHeight = 22;

      svg += `
        <rect
          x="${blockLeft - 6}"
          y="${blockTop - 6}"
          width="${blockWidth + 12}"
          height="${blockHeight + 12}"
          fill="${config.background}"
          stroke="${config.color}"
          stroke-width="2"
          rx="10"
          opacity="0.82"
        />
        <circle cx="${sourceBubbleX}" cy="${blockCenterY}" r="${bubbleRadius}" fill="${config.color}" />
        <text
          x="${sourceBubbleX}"
          y="${blockCenterY + 5}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="16"
          font-weight="700"
          fill="#ffffff"
        >${block.displayIndex}</text>
        <path
          d="M ${guideStartX} ${blockCenterY}
             C ${guideStartX + guideControlOffset} ${blockCenterY},
               ${guideEndX - guideControlOffset} ${itemCenterY},
               ${guideEndX} ${itemCenterY}"
          stroke="${config.color}"
          stroke-width="2.2"
          fill="none"
          stroke-dasharray="6,4"
          opacity="0.82"
        />
        <circle cx="${panelBubbleX}" cy="${itemCenterY}" r="12" fill="${config.color}" />
        <text
          x="${panelBubbleX}"
          y="${itemCenterY + 4}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="15"
          font-weight="700"
          fill="#ffffff"
        >${block.displayIndex}</text>
        <text
          x="${textX}"
          y="${textBaseY + 12}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          fill="#0f172a"
        >
          ${block.wrappedText.map((line, index) => `
            <tspan x="${textX}" y="${textBaseY + 12 + index * lineHeight}">${escapeSvgText(line)}</tspan>
          `).join('')}
        </text>
      `;

      currentY += block.itemHeight;
    });
  });

  svg += '</svg>';

  return await sharp({
    create: {
      width: layout.canvasWidth,
      height: layout.canvasHeight,
      channels: 4,
      background: '#f8fafc',
    },
  })
    .composite([
      {
        input: imageBuffer,
        left: layout.imageOffsetX,
        top: layout.imageOffsetY,
      },
      {
        input: Buffer.from(svg),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}
