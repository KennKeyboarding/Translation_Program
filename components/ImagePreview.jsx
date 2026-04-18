const LABELS = {
  subtitle: '\u539f\u59cb\u56fe\u7247',
};

export default function ImagePreview({ image }) {
  if (!image) return null;

  return (
    <div
      style={{
        flex: '1',
        minWidth: '320px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '22px',
        padding: '16px',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#172033' }}>Source Image</h3>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
          {LABELS.subtitle}
        </div>
        <p style={{ margin: '6px 0 0', color: '#64748b', lineHeight: '1.5' }}>
          Preview the uploaded scene before translation and annotation.
        </p>
      </div>

      <img
        src={image}
        alt="Original"
        style={{
          maxWidth: '100%',
          height: 'auto',
          border: '1px solid #dbe4ef',
          borderRadius: '16px',
          display: 'block',
        }}
      />
    </div>
  );
}
