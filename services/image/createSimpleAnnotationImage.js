import sharp from 'sharp';

const QUADRANT_COLORS = {
  'top-left': {
    stroke: '#ef6c00',
    fill: 'rgba(239, 108, 0, 0.16)',
    label: '#ef6c00',
  },
  'top-right': {
    stroke: '#2e7d32',
    fill: 'rgba(46, 125, 50, 0.16)',
    label: '#2e7d32',
  },
  'bottom-left': {
    stroke: '#1565c0',
    fill: 'rgba(21, 101, 192, 0.16)',
    label: '#1565c0',
  },
  'bottom-right': {
    stroke: '#6a1b9a',
    fill: 'rgba(106, 27, 154, 0.16)',
    label: '#6a1b9a',
  },
  default: {
    stroke: '#475569',
    fill: 'rgba(71, 85, 105, 0.14)',
    label: '#475569',
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

export async function createSimpleAnnotationImage(imageBuffer, blocks = []) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const svgParts = [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
  ];

  blocks.forEach((block, index) => {
    const colorConfig = QUADRANT_COLORS[block.quadrant] || QUADRANT_COLORS.default;
    const displayIndex = block.displayIndex || index + 1;
    const left = Math.max(0, Number(block.location?.left || 0));
    const top = Math.max(0, Number(block.location?.top || 0));
    const boxWidth = Math.max(18, Number(block.location?.width || 0));
    const boxHeight = Math.max(18, Number(block.location?.height || 0));
    const labelWidth = 30;
    const labelHeight = 24;
    const labelX = Math.max(0, left);
    const labelY = Math.max(0, top - labelHeight - 4);

    block.color = colorConfig.label;

    svgParts.push(`
      <rect
        x="${left}"
        y="${top}"
        width="${boxWidth}"
        height="${boxHeight}"
        rx="8"
        fill="${colorConfig.fill}"
        stroke="${colorConfig.stroke}"
        stroke-width="2.4"
      />
      <rect
        x="${labelX}"
        y="${labelY}"
        width="${labelWidth}"
        height="${labelHeight}"
        rx="8"
        fill="${colorConfig.label}"
      />
      <text
        x="${labelX + labelWidth / 2}"
        y="${labelY + 17}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="15"
        font-weight="700"
        fill="#ffffff"
      >${escapeSvgText(displayIndex)}</text>
    `);
  });

  svgParts.push(`</svg>`);
  const overlay = Buffer.from(svgParts.join(''));

  return sharp(imageBuffer)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}
