import { useState } from 'react';

const LABELS = {
  subtitle: '\u539f\u59cb\u56fe\u7247',
  hint: '\u70b9\u51fb\u7f29\u7565\u56fe\u53ef\u653e\u5927\u67e5\u770b',
  close: '\u5173\u95ed',
};

export default function ImagePreview({ image }) {
  const [expanded, setExpanded] = useState(false);

  if (!image) return null;

  return (
    <>
      <div
        style={{
          width: '100%',
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
          <div style={{ marginTop: '6px', color: '#2563eb', fontSize: '12px', fontWeight: 700 }}>
            {LABELS.hint}
          </div>
        </div>

        <button
          onClick={() => setExpanded(true)}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'zoom-in',
          }}
        >
          <img
            src={image}
            alt="Original"
            style={{
              width: '100%',
              maxHeight: '240px',
              objectFit: 'contain',
              border: '1px solid #dbe4ef',
              borderRadius: '16px',
              display: 'block',
              backgroundColor: '#f8fafc',
            }}
          />
        </button>
      </div>

      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(1100px, 100%)',
              maxHeight: '90vh',
              backgroundColor: '#ffffff',
              borderRadius: '22px',
              padding: '18px',
              boxShadow: '0 30px 80px rgba(15, 23, 42, 0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#172033' }}>Source Image</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                  {LABELS.subtitle}
                </div>
              </div>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  border: 'none',
                  backgroundColor: '#e2e8f0',
                  color: '#172033',
                  borderRadius: '999px',
                  padding: '8px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {LABELS.close}
              </button>
            </div>

            <img
              src={image}
              alt="Original enlarged"
              style={{
                width: '100%',
                maxHeight: 'calc(90vh - 120px)',
                objectFit: 'contain',
                border: '1px solid #dbe4ef',
                borderRadius: '16px',
                display: 'block',
                backgroundColor: '#f8fafc',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
