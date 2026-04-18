import formidable from 'formidable';
import fs from 'fs';
import { baiduASR } from '../../services/asr/baiduASR';
import { qwenASR } from '../../services/asr/qwenASR';
import { runTextPipeline } from '../../services/pipeline/textPipeline';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  const form = formidable({ multiples: false });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { files } = await parseForm(req);
    const audioFile = files.audio;

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        error: 'No audio uploaded',
      });
    }

    const file = Array.isArray(audioFile) ? audioFile[0] : audioFile;
    const audioBuffer = fs.readFileSync(file.filepath);
    const format = (file.originalFilename?.split('.').pop() || 'wav').toLowerCase();
    const qwenConfigured = Boolean(String(process.env.QWEN_API_KEY || '').trim());

    const asrResult = qwenConfigured
      ? await qwenASR(audioBuffer, {
          format,
          mimeType: file.mimetype,
          language: 'zh',
        })
      : await baiduASR(audioBuffer, {
          format: 'wav',
          rate: 16000,
        });

    const result = await runTextPipeline(asrResult.transcript);

    return res.status(200).json({
      success: true,
      asr_provider: qwenConfigured ? 'qwen' : 'baidu',
      ...result,
    });
  } catch (error) {
    console.error('process-audio API error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
