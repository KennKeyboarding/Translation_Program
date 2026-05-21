const LABELS = {
  subtitle: '\u5f15\u5bfc\u5f0f\u7ffb\u8bd1\u89c6\u56fe',
};

function formatQuadrantLabel(quadrant) {
  const labels = {
    'top-left': 'Upper Left',
    'top-right': 'Upper Right',
    'bottom-left': 'Lower Left',
    'bottom-right': 'Lower Right',
  };

  return labels[quadrant] || quadrant;
}

function formatSceneLabel(sceneType) {
  const labels = {
    menu: 'Menu',
    notice: 'Notice',
    goods: 'Goods',
    instruction: 'Instruction',
    poster: 'Poster',
    other: 'Other',
  };

  return labels[sceneType] || 'Other';
}

export default function ResultPanel({ result }) {
  if (!result?.annotated_image) return null;

  const isDenseMode = result.render_mode === 'full_translation';
  const quadrantCounts = Object.entries(result.quadrant_counts || {}).filter(([, count]) => count > 0);
  const sceneLabel = formatSceneLabel(result.scene_type);

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ marginBottom: '4px' }}>Guided Translation View</h3>
      <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, marginBottom: '8px' }}>
        {LABELS.subtitle}
      </div>
      <p style={{ marginTop: '-6px', marginBottom: '12px', color: '#475569', lineHeight: '1.5' }}>
        {isDenseMode
          ? 'Long-form notices, instructions, labels, and posters are shown with one overall translation area and keyword-based guide markers.'
          : 'Short structured text such as menus is grouped by quadrant and linked to English translations with numbered guide lines.'}
      </p>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '14px 16px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <span
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {sceneLabel}
          </span>
          {!isDenseMode &&
            quadrantCounts.map(([quadrant, count]) => (
              <span
                key={quadrant}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {formatQuadrantLabel(quadrant)}: {count}
              </span>
            ))}
        </div>

        <img
          src={`data:image/png;base64,${result.annotated_image}`}
          alt="Annotated Translation"
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
          }}
        />
      </div>
    </div>
  );
}
