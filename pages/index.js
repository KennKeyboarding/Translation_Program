import { useRef, useState } from 'react';
import UploadPanel from '../components/UploadPanel';
import ImagePreview from '../components/ImagePreview';
import ResultPanel from '../components/ResultPanel';
import SummaryCards from '../components/SummaryCards';
import DebugPanel from '../components/DebugPanel';
import LearningPanel from '../components/LearningPanel';
import SpeechPanel from '../components/SpeechPanel';

const FEATURE_ITEMS = [
  {
    en: 'Image OCR with location-aware text blocks',
    zh: '\u652f\u6301\u4f4d\u7f6e\u611f\u77e5\u7684\u56fe\u50cf\u6587\u5b57\u8bc6\u522b',
  },
  {
    en: 'Guided translation with quadrant panels',
    zh: '\u652f\u6301\u56db\u8c61\u9650\u5f15\u5bfc\u5f0f\u7ffb\u8bd1\u5c55\u793a',
  },
  {
    en: 'Automatic speech recognition for spoken Chinese',
    zh: '\u652f\u6301\u4e2d\u6587\u53e3\u8bed\u81ea\u52a8\u8bed\u97f3\u8bc6\u522b',
  },
  {
    en: 'Content summary and cultural learning notes',
    zh: '\u652f\u6301\u5185\u5bb9\u603b\u7ed3\u4e0e\u6587\u5316\u5b66\u4e60\u63d0\u793a',
  },
  {
    en: 'Saved learner cards for review and retention',
    zh: '\u652f\u6301\u6536\u85cf\u5b66\u4e60\u5361\u7247\u4e0e\u590d\u4e60\u8ffd\u8e2a',
  },
];

const PAGE_LABELS = {
  companion: '\u56fd\u9645\u4e2d\u6587\u5b66\u4e60\u8f85\u52a9\u5e94\u7528',
  subtitle: '\u9762\u5411\u56fd\u9645\u4e2d\u6587\u5b66\u4e60\u8005\u7684\u591a\u573a\u666f\u4e2d\u6587\u8bc6\u522b\u3001\u81ea\u52a8\u8bed\u97f3\u8bc6\u522b\u4e0e\u5f15\u5bfc\u5f0f\u7ffb\u8bd1',
  coreFeatures: '\u5e94\u7528\u6838\u5fc3\u529f\u80fd',
};

export default function Home() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [speechResult, setSpeechResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImage(loadEvent.target.result);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!image) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(image);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob);

      const apiResponse = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });

      const data = await apiResponse.json();

      if (data.success) {
        setResult(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fffaf0 0%, #f7fbff 38%, #ffffff 100%)',
      }}
    >
      <main style={{ padding: '28px 20px 48px', maxWidth: '1280px', margin: '0 auto' }}>
        <section
          style={{
            background: 'linear-gradient(135deg, #fff3d9 0%, #f3f7ff 52%, #eef8f1 100%)',
            borderRadius: '30px',
            padding: '28px',
            border: '1px solid #f0dfb3',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  backgroundColor: '#fff7e6',
                  color: '#9a5b13',
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Chinese Learning Companion
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#b26a17', fontWeight: 700 }}>
                {PAGE_LABELS.companion}
              </div>

              <h1 style={{ margin: '16px 0 10px', fontSize: '44px', lineHeight: '1.1', color: '#162033' }}>
                Multiscene Chinese Recognition and Guided Translation for International Learners
              </h1>
              <div style={{ marginBottom: '10px', fontSize: '14px', color: '#5f6f85', fontWeight: 700 }}>
                {PAGE_LABELS.subtitle}
              </div>

              <p style={{ margin: 0, maxWidth: '760px', fontSize: '17px', lineHeight: '1.7', color: '#425466' }}>
                Scan menus, notices, product labels, and everyday signage. The app detects Chinese text,
                groups it visually, provides English translation, supports spoken Chinese recognition,
                and lets learners save useful phrases into a reusable study deck.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.78)',
                borderRadius: '24px',
                padding: '20px',
                border: '1px solid #d7e3f7',
              }}
            >
              <div style={{ fontWeight: 800, color: '#20314a', marginBottom: '4px' }}>Core Features</div>
              <div style={{ fontSize: '12px', color: '#5b7aa5', fontWeight: 700, marginBottom: '14px' }}>
                {PAGE_LABELS.coreFeatures}
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {FEATURE_ITEMS.map((item, index) => (
                  <div
                    key={item.en}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr',
                      gap: '12px',
                      alignItems: 'start',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '999px',
                        backgroundColor: '#e0ecff',
                        color: '#1d4ed8',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ color: '#20314a', fontWeight: 700, lineHeight: '1.45' }}>{item.en}</div>
                      <div style={{ color: '#5f6f85', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                        {item.zh}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {[
              'Menus and prices',
              'Campus notices',
              'Street signs',
              'Packaged goods',
              'Spoken Chinese',
              'Saved study deck',
            ].map((item) => (
              <span
                key={item}
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  backgroundColor: '#ffffff',
                  color: '#355070',
                  border: '1px solid #d9e3f1',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <UploadPanel
          fileInputRef={fileInputRef}
          onTriggerUpload={() => fileInputRef.current?.click()}
          onChange={handleImageUpload}
          onProcess={processImage}
          hasImage={!!image}
          loading={loading}
        />

        <SpeechPanel onResult={setSpeechResult} />

        <section style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <ImagePreview image={image} />
          <ResultPanel result={result} />
        </section>

        <SummaryCards result={result} />
        <LearningPanel imageResult={result} speechResult={speechResult} />
        <DebugPanel result={result} />
      </main>
    </div>
  );
}
