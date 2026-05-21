import sharp from 'sharp';
import { getAlignedTranslationLines } from '../../utils/translationAlignment';

const QUADRANT_ORDER = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const KEYWORD_PANEL_ORDER = ['top-left', 'bottom-left', 'bottom-right'];

const QUADRANT_CONFIG = {
  'top-left': {
    title: 'Upper Left',
    side: 'left',
    color: '#ef6c00',
    background: '#fff3e0',
  },
  'top-right': {
    title: 'Upper Right',
    side: 'right',
    color: '#2e7d32',
    background: '#e8f5e9',
  },
  'bottom-left': {
    title: 'Lower Left',
    side: 'left',
    color: '#1565c0',
    background: '#e3f2fd',
  },
  'bottom-right': {
    title: 'Lower Right',
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

function normalizeKeywordDisplayItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const term = String(item.term || item.text || '').trim();
      const translation = String(item.translation || item.explanation || '').trim();

      if (!term && !translation) return null;

      return {
        ...item,
        text: term,
        term,
        translation,
        displayIndex: item.displayIndex || index + 1,
        keywordQuadrant: item.quadrant === 'top-right' ? 'bottom-right' : item.quadrant || 'bottom-right',
      };
    })
    .filter(Boolean);
}

function buildQuadrantGroups(displayBlocks, translationLines) {
  const groups = QUADRANT_ORDER.reduce((result, quadrant) => {
    result[quadrant] = [];
    return result;
  }, {});

  displayBlocks.forEach((block, index) => {
    const quadrant = QUADRANT_CONFIG[block.quadrant] ? block.quadrant : 'top-left';
    const translation = String(translationLines[index] || '').trim();
    const wrappedText = wrapText(translation || 'Translation unavailable.', 36).slice(0, 5);

    groups[quadrant].push({
      ...block,
      displayIndex: block.displayIndex || index + 1,
      wrappedText,
      itemHeight: Math.max(66, wrappedText.length * 25 + 22),
    });
  });

  return groups;
}

function getQuadrantLayout(imageWidth, imageHeight, groups) {
  const leftPanelWidth = 400;
  const rightPanelWidth = 400;
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
    headerHeight,
    panelPaddingTop,
    panels: {
      'top-left': { x: 20, y: topMargin, width: leftPanelWidth - 40, height: topLeftHeight },
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

function renderQuadrantSvg(layout, imageWidth, imageHeight, groups) {
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

  QUADRANT_ORDER.forEach((quadrant) => {
    const config = QUADRANT_CONFIG[quadrant];
    const panel = layout.panels[quadrant];
    const blocks = groups[quadrant];
    if (!blocks.length) return;

    svg += `
      <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}"
        fill="${config.background}" stroke="${config.color}" stroke-width="2" rx="18" />
      <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${layout.headerHeight}"
        fill="${config.color}" rx="18" />
      <rect x="${panel.x}" y="${panel.y + layout.headerHeight - 16}" width="${panel.width}" height="16"
        fill="${config.color}" />
      <text x="${panel.x + panel.width / 2}" y="${panel.y + 24}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">${escapeSvgText(config.title)}</text>
      <text x="${panel.x + panel.width / 2}" y="${panel.y + 42}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="12" fill="#ffffff" opacity="0.92">${escapeSvgText(
          `${config.title} (${blocks.length})`
        )}</text>
    `;

    let currentY = panel.y + layout.headerHeight + layout.panelPaddingTop;

    blocks.forEach((block) => {
      const blockLeft = layout.imageOffsetX + block.location.left;
      const blockTop = layout.imageOffsetY + block.location.top;
      const blockWidth = block.location.width;
      const blockHeight = block.location.height;
      const blockCenterY = blockTop + blockHeight / 2;
      const sourceBubbleX = config.side === 'left' ? blockLeft - 22 : blockLeft + blockWidth + 22;
      const panelBubbleX = panel.x + 22;
      const itemCenterY = currentY + 10;
      const guideControlOffset = config.side === 'left' ? -110 : 110;
      const textX = panel.x + 46;
      const textBaseY = currentY + 4;

      svg += `
        <rect x="${blockLeft - 6}" y="${blockTop - 6}" width="${blockWidth + 12}" height="${blockHeight + 12}"
          fill="${config.background}" stroke="${config.color}" stroke-width="2" rx="10" opacity="0.82" />
        <circle cx="${sourceBubbleX}" cy="${blockCenterY}" r="13" fill="${config.color}" />
        <text x="${sourceBubbleX}" y="${blockCenterY + 5}" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="17" font-weight="700" fill="#ffffff">${block.displayIndex}</text>
        <path
          d="M ${sourceBubbleX} ${blockCenterY}
             C ${sourceBubbleX + guideControlOffset} ${blockCenterY},
               ${panelBubbleX - guideControlOffset} ${itemCenterY},
               ${panelBubbleX} ${itemCenterY}"
          stroke="${config.color}" stroke-width="2.2" fill="none" stroke-dasharray="6,4" opacity="0.82"
        />
        <circle cx="${panelBubbleX}" cy="${itemCenterY}" r="12" fill="${config.color}" />
        <text x="${panelBubbleX}" y="${itemCenterY + 4}" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="16" font-weight="700" fill="#ffffff">${block.displayIndex}</text>
        <text x="${textX}" y="${textBaseY + 13}" font-family="Arial, sans-serif" font-size="19" fill="#0f172a">
          ${block.wrappedText
            .map((line, index) => `<tspan x="${textX}" y="${textBaseY + 13 + index * 25}">${escapeSvgText(line)}</tspan>`)
            .join('')}
        </text>
      `;

      currentY += block.itemHeight;
    });
  });

  svg += '</svg>';
  return svg;
}

function buildDenseKeywordGroups(keywordDisplayItems) {
  const normalizedItems = normalizeKeywordDisplayItems(keywordDisplayItems);
  const groups = KEYWORD_PANEL_ORDER.reduce((result, quadrant) => {
    result[quadrant] = [];
    return result;
  }, {});

  normalizedItems.forEach((item, index) => {
    const quadrant = groups[item.keywordQuadrant] ? item.keywordQuadrant : KEYWORD_PANEL_ORDER[index % KEYWORD_PANEL_ORDER.length];
    const wrappedText = wrapText(item.translation || 'Keyword meaning unavailable.', 28).slice(0, 4);

    groups[quadrant].push({
      ...item,
      displayIndex: item.displayIndex || index + 1,
      wrappedText,
      itemHeight: Math.max(68, wrappedText.length * 25 + 24),
    });
  });

  return groups;
}

function getDenseLayout(imageWidth, imageHeight, keywordGroups, translationText) {
  const leftPanelWidth = 380;
  const rightPanelWidth = 430;
  const rowGap = 28;
  const topMargin = 24;
  const bottomMargin = 24;
  const headerHeight = 56;
  const panelPaddingTop = 20;
  const panelPaddingBottom = 20;
  const translationLines = String(translationText || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => [...wrapText(paragraph, 34), ''])
    .slice(0, 44);

  const getKeywordPanelHeight = (items) => {
    const contentHeight = items.reduce((sum, item) => sum + item.itemHeight, 0);
    return Math.max(170, headerHeight + panelPaddingTop + panelPaddingBottom + contentHeight);
  };

  const topLeftHeight = getKeywordPanelHeight(keywordGroups['top-left']);
  const bottomLeftHeight = getKeywordPanelHeight(keywordGroups['bottom-left']);
  const bottomRightHeight = getKeywordPanelHeight(keywordGroups['bottom-right']);
  const fullTranslationHeight = Math.max(290, headerHeight + 40 + translationLines.length * 25);

  const topRowHeight = Math.max(topLeftHeight, fullTranslationHeight);
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
    headerHeight,
    panelPaddingTop,
    translationLines,
    panels: {
      'top-left': { x: 20, y: topMargin, width: leftPanelWidth - 40, height: topLeftHeight },
      'top-right': {
        x: leftPanelWidth + imageWidth + 20,
        y: topMargin,
        width: rightPanelWidth - 40,
        height: fullTranslationHeight,
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

function renderDenseKeywordPanel(svgParts, panel, title, color, background, layout, imageOffsetX, imageOffsetY, items, side) {
  if (!items.length) return;

  svgParts.push(`
    <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}"
      fill="${background}" stroke="${color}" stroke-width="2" rx="18" />
    <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${layout.headerHeight}"
      fill="${color}" rx="18" />
    <rect x="${panel.x}" y="${panel.y + layout.headerHeight - 16}" width="${panel.width}" height="16"
      fill="${color}" />
    <text x="${panel.x + panel.width / 2}" y="${panel.y + 24}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">${escapeSvgText(title)}</text>
    <text x="${panel.x + panel.width / 2}" y="${panel.y + 42}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="12" fill="#ffffff" opacity="0.92">${items.length} keywords</text>
  `);

  let currentY = panel.y + layout.headerHeight + layout.panelPaddingTop;

  items.forEach((item) => {
    const blockLeft = imageOffsetX + item.location.left;
    const blockTop = imageOffsetY + item.location.top;
    const blockWidth = item.location.width;
    const blockHeight = item.location.height;
    const blockCenterY = blockTop + blockHeight / 2;
    const sourceBubbleX = side === 'left' ? blockLeft - 22 : blockLeft + blockWidth + 22;
    const panelBubbleX = panel.x + 22;
    const itemCenterY = currentY + 10;
    const guideControlOffset = side === 'left' ? -105 : 105;
    const textX = panel.x + 46;
    const textBaseY = currentY + 4;

    svgParts.push(`
      <rect x="${blockLeft - 6}" y="${blockTop - 6}" width="${blockWidth + 12}" height="${blockHeight + 12}"
        fill="${background}" stroke="${color}" stroke-width="2" rx="10" opacity="0.82" />
      <circle cx="${sourceBubbleX}" cy="${blockCenterY}" r="13" fill="${color}" />
      <text x="${sourceBubbleX}" y="${blockCenterY + 5}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="17" font-weight="700" fill="#ffffff">${item.displayIndex}</text>
      <path
        d="M ${sourceBubbleX} ${blockCenterY}
           C ${sourceBubbleX + guideControlOffset} ${blockCenterY},
             ${panelBubbleX - guideControlOffset} ${itemCenterY},
             ${panelBubbleX} ${itemCenterY}"
        stroke="${color}" stroke-width="2.2" fill="none" stroke-dasharray="6,4" opacity="0.82"
      />
      <circle cx="${panelBubbleX}" cy="${itemCenterY}" r="12" fill="${color}" />
      <text x="${panelBubbleX}" y="${itemCenterY + 4}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="16" font-weight="700" fill="#ffffff">${item.displayIndex}</text>
      <text x="${textX}" y="${textBaseY + 13}" font-family="Arial, sans-serif" font-size="18" fill="#0f172a">
        ${item.wrappedText
          .map((line, index) => `<tspan x="${textX}" y="${textBaseY + 13 + index * 25}">${escapeSvgText(line)}</tspan>`)
          .join('')}
      </text>
    `);

    currentY += item.itemHeight;
  });
}

function renderDenseSvg(layout, imageWidth, imageHeight, sceneType, translationText, keywordDisplayItems) {
  const keywordGroups = buildDenseKeywordGroups(keywordDisplayItems);
  const svgParts = [
    `<svg width="${layout.canvasWidth}" height="${layout.canvasHeight}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect x="${layout.imageOffsetX - 1}" y="${layout.imageOffsetY - 1}" width="${imageWidth + 2}" height="${imageHeight + 2}" fill="none" stroke="#cbd5e1" stroke-width="1" rx="14" />`,
  ];

  renderDenseKeywordPanel(
    svgParts,
    layout.panels['top-left'],
    'Keyword Guide',
    QUADRANT_CONFIG['top-left'].color,
    QUADRANT_CONFIG['top-left'].background,
    layout,
    layout.imageOffsetX,
    layout.imageOffsetY,
    keywordGroups['top-left'],
    'left'
  );

  renderDenseKeywordPanel(
    svgParts,
    layout.panels['bottom-left'],
    'Keyword Guide',
    QUADRANT_CONFIG['bottom-left'].color,
    QUADRANT_CONFIG['bottom-left'].background,
    layout,
    layout.imageOffsetX,
    layout.imageOffsetY,
    keywordGroups['bottom-left'],
    'left'
  );

  renderDenseKeywordPanel(
    svgParts,
    layout.panels['bottom-right'],
    'Keyword Guide',
    QUADRANT_CONFIG['bottom-right'].color,
    QUADRANT_CONFIG['bottom-right'].background,
    layout,
    layout.imageOffsetX,
    layout.imageOffsetY,
    keywordGroups['bottom-right'],
    'right'
  );

  const translationPanel = layout.panels['top-right'];
  const sceneLabelMap = {
    notice: 'Notice',
    goods: 'Goods',
    instruction: 'Instruction',
    poster: 'Poster',
    other: 'Other',
    menu: 'Menu',
  };

  svgParts.push(`
    <rect x="${translationPanel.x}" y="${translationPanel.y}" width="${translationPanel.width}" height="${translationPanel.height}"
      fill="#f8fafc" stroke="#2563eb" stroke-width="2" rx="18" />
    <rect x="${translationPanel.x}" y="${translationPanel.y}" width="${translationPanel.width}" height="${layout.headerHeight}"
      fill="#2563eb" rx="18" />
    <rect x="${translationPanel.x}" y="${translationPanel.y + layout.headerHeight - 16}" width="${translationPanel.width}" height="16"
      fill="#2563eb" />
    <text x="${translationPanel.x + 24}" y="${translationPanel.y + 24}" font-family="Arial, sans-serif"
      font-size="20" font-weight="700" fill="#ffffff">Guided Translation</text>
    <text x="${translationPanel.x + 24}" y="${translationPanel.y + 42}" font-family="Arial, sans-serif"
      font-size="12" fill="#dbeafe">${escapeSvgText(sceneLabelMap[sceneType] || 'Other')}</text>
    <text x="${translationPanel.x + 24}" y="${translationPanel.y + 94}" font-family="Arial, sans-serif"
      font-size="14" font-weight="700" fill="#1d4ed8">Overall translation</text>
    <text x="${translationPanel.x + 24}" y="${translationPanel.y + 118}" font-family="Arial, sans-serif"
      font-size="18" fill="#0f172a">
      ${layout.translationLines
        .map((line, index) => {
          const y = translationPanel.y + 118 + index * 25;
          const safe = line ? escapeSvgText(line) : '';
          return `<tspan x="${translationPanel.x + 24}" y="${y}">${safe}</tspan>`;
        })
        .join('')}
    </text>
  `);

  svgParts.push('</svg>');
  return svgParts.join('');
}

async function compositeSvg(imageBuffer, svg, left, top, width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#f8fafc',
    },
  })
    .composite([
      { input: imageBuffer, left, top },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

export async function createAnnotationImage(imageBuffer, ocrResult, renderPayload = {}) {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const imageWidth = metadata.width || 0;
  const imageHeight = metadata.height || 0;
  const renderMode = renderPayload.renderMode || ocrResult.renderMode || 'quadrant';
  const displayBlocks = renderPayload.displayBlocks || ocrResult.displayBlocks || ocrResult.textBlocks || [];

  if (renderMode === 'full_translation') {
    const keywordGroups = buildDenseKeywordGroups(renderPayload.keywordDisplayItems || []);
    const layout = getDenseLayout(
      imageWidth,
      imageHeight,
      keywordGroups,
      renderPayload.translatedText
    );
    const svg = renderDenseSvg(
      layout,
      imageWidth,
      imageHeight,
      renderPayload.sceneType,
      renderPayload.translatedText,
      renderPayload.keywordDisplayItems || []
    );

    return compositeSvg(
      imageBuffer,
      svg,
      layout.imageOffsetX,
      layout.imageOffsetY,
      layout.canvasWidth,
      layout.canvasHeight
    );
  }

  const translationLines = getAlignedTranslationLines(
    renderPayload.translationLines || renderPayload.translatedText || '',
    displayBlocks.length
  );
  const groups = buildQuadrantGroups(displayBlocks, translationLines);
  const layout = getQuadrantLayout(imageWidth, imageHeight, groups);
  const svg = renderQuadrantSvg(layout, imageWidth, imageHeight, groups);

  return compositeSvg(
    imageBuffer,
    svg,
    layout.imageOffsetX,
    layout.imageOffsetY,
    layout.canvasWidth,
    layout.canvasHeight
  );
}
