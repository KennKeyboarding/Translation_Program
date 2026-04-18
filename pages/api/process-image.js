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

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}