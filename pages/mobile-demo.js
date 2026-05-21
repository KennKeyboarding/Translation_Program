import { useMemo, useState } from 'react';

const cardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #dbe4ef',
  borderRadius: '18px',
  padding: '16px',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
};

function KeywordList({ keywords }) {
  if (!Array.isArray(keywords) || !keywords.length) return null;

  return (
    <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
      {keywords.map((keyword, index) => (
        <div
          key={`${keyword.term || 'keyword'}-${index}`}
          style={{
            padding: '8px 10px',
            borderRadius: '12px',
            backgroundColor: '#fff9ec',
            border: '1px solid #f3dfb2',
          }}
        >
          <div style={{ fontWeight: 700, color: '#7c3f00' }}>{keyword.term}</div>
          {keyword.explanation && (
            <div style={{ marginTop: '3px', color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
              {keyword.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MobileDemoPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/mobile/process-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Mobile demo processing failed');
      }

      setResult(data);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || 'Mobile demo processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)',
        padding: '32px 20px 48px',
      }}
    >
      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, color: '#0f172a' }}>Mobile API Demo</h1>
          <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: '1.7', maxWidth: '820px' }}>
            Upload one image to test <code>/api/mobile/process-image</code>. This page shows the simplified
            annotated image and the returned learning list, so you can hand the interface to the app front-end
            and back-end teams without using Postman or Apifox.
          </p>
        </header>

        <section style={{ ...cardStyle, marginBottom: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0f3c79', marginBottom: '8px' }}>Select Image</div>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={!file || loading}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '10px 16px',
                  cursor: !file || loading ? 'not-allowed' : 'pointer',
                  backgroundColor: !file || loading ? '#cbd5e1' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {loading ? 'Processing...' : 'Upload And Test API'}
              </button>

              {file && <span style={{ color: '#475569', fontSize: '14px' }}>{file.name}</span>}
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                }}
              >
                {error}
              </div>
            )}
          </form>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 12px', color: '#0f3c79', fontSize: '20px' }}>Source Image</h2>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Source preview"
                style={{ width: '100%', borderRadius: '16px', border: '1px solid #dbe4ef' }}
              />
            ) : (
              <div
                style={{
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                Upload an image to preview the original source here.
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 12px', color: '#0f3c79', fontSize: '20px' }}>Annotated Output</h2>
            {result?.annotated_image ? (
              <img
                src={result.annotated_image}
                alt="Annotated preview"
                style={{ width: '100%', borderRadius: '16px', border: '1px solid #dbe4ef' }}
              />
            ) : (
              <div
                style={{
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                The simplified annotation image returned by the mobile API will appear here.
              </div>
            )}
          </div>
        </section>

        {result && (
          <section style={{ ...cardStyle, marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f3c79', fontSize: '20px' }}>Returned Items</h2>
                <div style={{ marginTop: '6px', color: '#64748b', fontSize: '14px' }}>
                  scene_type: <strong>{result.scene_type}</strong> | render_mode: <strong>{result.render_mode}</strong>
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                {Array.isArray(result.items) ? `${result.items.length} items` : '0 items'}
              </div>
            </div>

            <div style={{ marginTop: '18px', display: 'grid', gap: '14px' }}>
              {Array.isArray(result.items) && result.items.length > 0 ? (
                result.items.map((item) => (
                  <article
                    key={`${item.index}-${item.chinese_text}`}
                    style={{
                      border: '1px solid #dbe4ef',
                      borderRadius: '16px',
                      padding: '14px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '4px 9px',
                          borderRadius: '999px',
                          backgroundColor: item.color || '#e2e8f0',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        #{item.index}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>{item.quadrant || 'unassigned'}</span>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                      {item.chinese_text}
                    </div>

                    {item.pinyin && (
                      <div style={{ marginTop: '6px', color: '#9a3412', fontWeight: 700 }}>
                        {item.pinyin}
                      </div>
                    )}

                    <div style={{ marginTop: '8px', color: '#475569', lineHeight: '1.6' }}>
                      {item.english_translation || 'Translation unavailable'}
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                      bbox: left {item.bbox?.left}, top {item.bbox?.top}, width {item.bbox?.width}, height{' '}
                      {item.bbox?.height}
                    </div>

                    <KeywordList keywords={item.keywords} />
                  </article>
                ))
              ) : (
                <div style={{ color: '#64748b' }}>No items returned yet.</div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
