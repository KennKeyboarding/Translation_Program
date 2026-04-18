import { useEffect, useRef, useState } from 'react';

const LABELS = {
  autoAsr: '\u81ea\u52a8\u8bed\u97f3\u8bc6\u522b',
  startRecording: '\u5f00\u59cb\u5f55\u97f3',
  stopAndRecognize: '\u505c\u6b62\u5f55\u97f3\u5e76\u8bc6\u522b',
  retryRecognition: '\u91cd\u65b0\u8bc6\u522b',
  recognizing: '\u8bc6\u522b\u4e2d...',
  browserUnsupported: '\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301 `getUserMedia`\uff0c\u5efa\u8bae\u4f7f\u7528 Chrome \u6216 Edge\u3002',
  permissionGranted: '\u9ea6\u514b\u98ce\u5df2\u6388\u6743',
  permissionDenied: '\u9ea6\u514b\u98ce\u88ab\u62d2\u7edd',
  permissionPrompt: '\u7b49\u5f85\u6388\u6743',
  permissionUnknown: '\u6743\u9650\u672a\u68c0\u6d4b',
  recording: '\u5f55\u97f3\u4e2d',
  idle: '\u5f85\u673a\u4e2d',
  processing: '\u6b63\u5728\u81ea\u52a8\u8bc6\u522b',
  audioReady: '\u5f55\u97f3\u5df2\u5c31\u7eea',
  noRecording: '\u5c1a\u672a\u5f55\u97f3',
  asrDone: '\u5df2\u81ea\u52a8\u5b8c\u6210\u8bed\u97f3\u8f6c\u5199\u4e0e\u7ffb\u8bd1',
  transcript: '\u8bed\u97f3\u8f6c\u5199',
  translation: '\u82f1\u6587\u7ffb\u8bd1',
  summary: '\u5185\u5bb9\u603b\u7ed3',
  cultural: '\u6587\u5316\u62d3\u5c55',
};

function mergeFloat32Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
}

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (outputSampleRate >= inputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;

    for (let index = offsetBuffer; index < nextOffsetBuffer && index < buffer.length; index += 1) {
      accum += buffer[index];
      count += 1;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let index = 0; index < string.length; index += 1) {
      view.setUint8(offset + index, string.charCodeAt(index));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function getPermissionLabel(permissionState) {
  if (permissionState === 'granted') return LABELS.permissionGranted;
  if (permissionState === 'denied') return LABELS.permissionDenied;
  if (permissionState === 'prompt') return LABELS.permissionPrompt;
  return LABELS.permissionUnknown;
}

function getProviderLabel(provider) {
  if (provider === 'qwen') return 'Qwen ASR';
  if (provider === 'baidu') return 'Baidu ASR';
  return provider || 'ASR';
}

export default function SpeechPanel({ onResult }) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [voiceResult, setVoiceResult] = useState(null);
  const [error, setError] = useState('');

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const chunksRef = useRef([]);
  const sampleRateRef = useRef(44100);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

  useEffect(
    () => () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [audioUrl]
  );

  const cleanupRecordingGraph = async () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    processorRef.current = null;
    sourceRef.current = null;
  };

  const processAudio = async (blob = audioBlob) => {
    if (!blob) return;

    setProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'ASR processing failed');
      }

      setVoiceResult(data);
      onResult?.(data);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || 'ASR processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const startRecording = async () => {
    if (!supported || recording || processing) return;

    setError('');
    setVoiceResult(null);
    onResult?.(null);
    chunksRef.current = [];

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }

    setAudioBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setPermissionState('granted');

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      sampleRateRef.current = audioContext.sampleRate;
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setRecording(true);
    } catch (recordError) {
      console.error(recordError);
      setPermissionState('denied');
      setError(recordError.message || 'Failed to access microphone');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setRecording(false);
    await cleanupRecordingGraph();

    const mergedBuffer = mergeFloat32Arrays(chunksRef.current);
    const downsampled = downsampleBuffer(mergedBuffer, sampleRateRef.current, 16000);
    const wavBlob = encodeWav(downsampled, 16000);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const nextAudioUrl = URL.createObjectURL(wavBlob);
    setAudioBlob(wavBlob);
    setAudioUrl(nextAudioUrl);

    await processAudio(wavBlob);
  };

  return (
    <section
      style={{
        marginTop: '24px',
        background: 'linear-gradient(135deg, #eef8ff 0%, #f8fbff 52%, #f6fffb 100%)',
        border: '1px solid #d8e8fb',
        borderRadius: '24px',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(37, 99, 235, 0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: '#16335b' }}>Automatic Speech Recognition</h2>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>
            {LABELS.autoAsr}
          </div>
          <p style={{ margin: '8px 0 0', color: '#4c6b91', lineHeight: '1.6', maxWidth: '760px' }}>
            Record a short Chinese utterance, then let the app automatically run ASR, translation,
            content summary, and cultural notes for speaking practice in everyday scenarios.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={startRecording}
            disabled={!supported || recording || processing}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '999px',
              cursor: !supported || recording || processing ? 'not-allowed' : 'pointer',
              backgroundColor: !supported || recording || processing ? '#cbd5e1' : '#0284c7',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            {LABELS.startRecording}
          </button>

          <button
            onClick={stopRecording}
            disabled={!recording}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '999px',
              cursor: !recording ? 'not-allowed' : 'pointer',
              backgroundColor: recording ? '#dc2626' : '#cbd5e1',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            {LABELS.stopAndRecognize}
          </button>

          <button
            onClick={() => processAudio()}
            disabled={!audioBlob || recording || processing}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '999px',
              cursor: !audioBlob || recording || processing ? 'not-allowed' : 'pointer',
              backgroundColor: !audioBlob || recording || processing ? '#cbd5e1' : '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            {processing ? LABELS.recognizing : LABELS.retryRecognition}
          </button>
        </div>
      </div>

      {!supported && (
        <div
          style={{
            marginTop: '14px',
            padding: '14px 16px',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            color: '#b45309',
            border: '1px dashed #fdba74',
          }}
        >
          {LABELS.browserUnsupported}
        </div>
      )}

      <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '12px' }}>
          {getPermissionLabel(permissionState)}
        </span>
        <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: recording ? '#fee2e2' : '#e2e8f0', color: recording ? '#b91c1c' : '#334155', fontWeight: 700, fontSize: '12px' }}>
          {recording ? LABELS.recording : LABELS.idle}
        </span>
        <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: processing ? '#ecfccb' : '#e2e8f0', color: processing ? '#3f6212' : '#334155', fontWeight: 700, fontSize: '12px' }}>
          {processing ? LABELS.processing : audioBlob ? LABELS.audioReady : LABELS.noRecording}
        </span>
      </div>

      {audioUrl && (
        <div style={{ marginTop: '16px' }}>
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '12px', color: '#b91c1c', fontWeight: 700 }}>
          {error}
        </div>
      )}

      {voiceResult && (
        <div
          style={{
            marginTop: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '6px 10px',
                borderRadius: '999px',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              ASR Provider: {getProviderLabel(voiceResult.asr_provider)}
            </span>
            <span
              style={{
                display: 'inline-flex',
                padding: '6px 10px',
                borderRadius: '999px',
                backgroundColor: '#fef3c7',
                color: '#a16207',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              {LABELS.asrDone}
            </span>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid #dbe4ef' }}>
            <h3 style={{ margin: 0, color: '#0f3c79' }}>Transcript</h3>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>{LABELS.transcript}</div>
            <p style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
              {voiceResult.original_text}
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid #dbe4ef' }}>
            <h3 style={{ margin: 0, color: '#0f3c79' }}>Translation</h3>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>{LABELS.translation}</div>
            <p style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
              {voiceResult.translated_text}
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid #dbe4ef' }}>
            <h3 style={{ margin: 0, color: '#0f3c79' }}>Content Summary</h3>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>{LABELS.summary}</div>
            <p style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
              {voiceResult.content_summary}
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid #dbe4ef' }}>
            <h3 style={{ margin: 0, color: '#0f3c79' }}>Cultural Insights</h3>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>{LABELS.cultural}</div>
            <p style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
              {voiceResult.cultural_insights}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
