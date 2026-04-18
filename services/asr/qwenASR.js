import axios from 'axios';

function getAudioMimeType(format, fallbackMimeType) {
  if (fallbackMimeType) return fallbackMimeType;

  const normalized = String(format || '').toLowerCase();
  if (normalized === 'wav') return 'audio/wav';
  if (normalized === 'mp3') return 'audio/mpeg';
  if (normalized === 'm4a') return 'audio/mp4';
  if (normalized === 'ogg') return 'audio/ogg';

  return 'audio/wav';
}

export async function qwenASR(audioBuffer, options = {}) {
  const apiKey = String(process.env.QWEN_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('Qwen ASR is not configured: missing QWEN_API_KEY');
  }

  const baseUrl = String(
    process.env.QWEN_ASR_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  ).replace(/\/$/, '');
  const model = process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash';
  const format = String(options.format || 'wav').toLowerCase();
  const mimeType = getAudioMimeType(format, options.mimeType);
  const dataUri = `data:${mimeType};base64,${audioBuffer.toString('base64')}`;

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: dataUri,
              },
            },
          ],
        },
      ],
      stream: false,
      asr_options: {
        language: options.language || 'zh',
        enable_itn: options.enable_itn ?? true,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const data = response.data || {};
  const transcript = String(data.choices?.[0]?.message?.content || '').trim();

  if (!transcript) {
    throw new Error('Qwen ASR returned an empty transcript');
  }

  return {
    raw: data,
    transcript,
    annotations: data.choices?.[0]?.message?.annotations || [],
  };
}
