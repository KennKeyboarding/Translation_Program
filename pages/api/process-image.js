// pages/api/process-image.js
import { runImagePipeline } from '../../services/pipeline/imagePipeline';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const result = await runImagePipeline(req);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('process-image API error:', error);
    const rawMessage = error.message || 'Internal server error';
    const userMessage = rawMessage.includes('Baidu OCR request timed out')
      ? 'Baidu OCR processing took too long for this image. Please try once more, or use a clearer/cropped image.'
      : rawMessage;

    return res.status(500).json({
      success: false,
      error: userMessage,
    });
  }
}
