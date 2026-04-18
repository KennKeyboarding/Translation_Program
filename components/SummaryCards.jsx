const LABELS = {
  summary: '\u5185\u5bb9\u603b\u7ed3',
  culture: '\u6587\u5316\u62d3\u5c55',
};

export default function SummaryCards({ result }) {
  if (!result) return null;

  return (
    <section
      style={{
        marginTop: '28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #fffaf0 0%, #fff4de 100%)',
          borderRadius: '22px',
          padding: '20px',
          border: '1px solid #f4d9a6',
          boxShadow: '0 16px 34px rgba(180, 83, 9, 0.08)',
        }}
      >
        <h3 style={{ margin: 0, color: '#7c3f00' }}>Content Summary</h3>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#a16207', fontWeight: 700 }}>
          {LABELS.summary}
        </div>
        <p style={{ margin: '8px 0 0', color: '#8b5e34', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {result.content_summary}
        </p>
      </div>

      <div
        style={{
          background: 'linear-gradient(180deg, #f4f9ff 0%, #e8f3ff 100%)',
          borderRadius: '22px',
          padding: '20px',
          border: '1px solid #cfe0f5',
          boxShadow: '0 16px 34px rgba(37, 99, 235, 0.08)',
        }}
      >
        <h3 style={{ margin: 0, color: '#0f3c79' }}>Cultural Insights</h3>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>
          {LABELS.culture}
        </div>
        <p style={{ margin: '8px 0 0', color: '#4c6b91', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {result.cultural_insights}
        </p>
      </div>
    </section>
  );
}
