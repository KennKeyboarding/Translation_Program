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

export default function ResultPanel({ result }) {
  if (!result?.annotated_image) return null;

  const quadrantCounts = Object.entries(result.quadrant_counts || {}).filter(([, count]) => count > 0);

  return (
    <div style={{ flex: '2', minWidth: '400px' }}>
      <h3 style={{ marginBottom: '4px' }}>Guided Translation View</h3>
      <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, marginBottom: '8px' }}>
        {LABELS.subtitle}
      </div>
      <p style={{ marginTop: '-6px', marginBottom: '12px', color: '#475569', lineHeight: '1.5' }}>
        OCR blocks are grouped by quadrant and linked to English translations with numbered guide lines,
        which makes menus, signs, and notices easier to scan for Chinese learners.
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
        {quadrantCounts.length > 0 && (
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
            {quadrantCounts.map(([quadrant, count]) => (
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
        )}

        <img
          src={`data:image/png;base64,${result.annotated_image}`}
          alt="Annotated Translation"
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
