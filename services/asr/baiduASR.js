import axios from 'axios';

async function getBaiduAccessToken() {
  const API_KEY = process.env.BAIDU_API_KEY;
  const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

  const response = await axios.post(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`
  );

  return response.data.access_token;
}

export async function baiduASR(audioBuffer, options = {}) {
  const accessToken = await getBaiduAccessToken();

  const payload = {
    format: options.format || 'wav',
    rate: options.rate || 16000,
    channel: 1,
    cuid: options.cuid || 'translation_program_web',
    token: accessToken,
    dev_pid: options.dev_pid || 1537,
    speech: audioBuffer.toString('base64'),
    len: audioBuffer.length,
  };

  const response = await axios.post(
    'https://vop.baidu.com/server_api',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const data = response.data || {};

  if (data.err_no !== 0) {
    throw new Error(`Baidu ASR error ${data.err_no}: ${data.err_msg || 'Unknown error'}`);
  }

  return {
    raw: data,
    transcript: Array.isArray(data.result) ? data.result.join('\n').trim() : '',
  };
}
