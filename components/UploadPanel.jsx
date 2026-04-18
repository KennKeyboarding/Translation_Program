const LABELS = {
  subtitle: '\u5f00\u59cb\u65b0\u7684\u56fe\u50cf\u8bc6\u522b',
  chooseImage: '\u9009\u62e9\u56fe\u7247',
  processing: '\u5904\u7406\u4e2d...',
  start: '\u5f00\u59cb\u8bc6\u522b',
};

export default function UploadPanel({
  fileInputRef,
  onTriggerUpload,
  onChange,
  onProcess,
  hasImage,
  loading,
}) {
  return (
    <section
      style={{
        marginTop: '22px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '24px',
        padding: '20px',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#172033', fontSize: '22px' }}>Start a New Scan</h2>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#0f766e', fontWeight: 700 }}>
            {LABELS.subtitle}
          </div>
          <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: '1.5' }}>
            Upload an image, run OCR plus translation, then save useful expressions into your personal study deck.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onTriggerUpload}
            style={{
              padding: '12px 18px',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {LABELS.chooseImage}
          </button>

          <button
            onClick={onProcess}
            disabled={!hasImage || loading}
            style={{
              padding: '12px 18px',
              backgroundColor: !hasImage || loading ? '#cbd5e1' : '#d97706',
              color: !hasImage || loading ? '#475569' : '#ffffff',
              border: 'none',
              borderRadius: '999px',
              cursor: !hasImage || loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {loading ? LABELS.processing : LABELS.start}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {['OCR with location blocks', 'LLM translation and summary', 'Quadrant-guided visualization', 'Favorites for review'].map((item) => (
          <span
            key={item}
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              backgroundColor: '#f8fafc',
              border: '1px solid #dbe4ef',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {item}
          </span>
        ))}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </section>
  );
}
