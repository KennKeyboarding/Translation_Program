import { runTextPipeline } from '../../services/pipeline/textPipeline';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const result = await runTextPipeline(req.body?.text);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('process-text API error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
