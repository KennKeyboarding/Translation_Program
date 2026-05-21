import axios from 'axios';

const TOKEN_TIMEOUT_MS = 10000;
const OCR_TIMEOUT_MS = 12000;
const OCR_RETRY_TIMEOUT_MS = 18000;
const MAX_RETRIES = 2;

let cachedAccessToken = null;
let cachedTokenExpiresAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRetryableErrorMessage(error) {
  if (error.code === 'ECONNABORTED') return 'Baidu OCR request timed out';
  if (error.code === 'ECONNRESET') return 'Baidu OCR connection was reset';
  if (error.response?.status) return `Baidu OCR HTTP ${error.response.status}`;
  return error.message || 'Baidu OCR request failed';
}

function isRetryableError(error) {
  if (!error) return false;

  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'EAI_AGAIN' ||
    error.code === 'ENOTFOUND' ||
    error.response?.status >= 500 ||
    error.response?.status === 429
  );
}

async function requestWithRetry(task, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        break;
      }

      await sleep(400 * attempt);
    }
  }

  throw new Error(`${label}: ${buildRetryableErrorMessage(lastError)}`);
}

async function fetchBaiduAccessToken() {
  const API_KEY = process.env.BAIDU_API_KEY;
  const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

  if (!API_KEY || !SECRET_KEY) {
    throw new Error('Baidu OCR credentials are missing');
  }

  return requestWithRetry(async () => {
    const response = await axios.post(
      'https://aip.baidubce.com/oauth/2.0/token',
      null,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: API_KEY,
          client_secret: SECRET_KEY,
        },
        timeout: TOKEN_TIMEOUT_MS,
      }
    );

    const accessToken = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in || 0);

    if (!accessToken) {
      throw new Error('Baidu OCR access token missing in response');
    }

    cachedAccessToken = accessToken;
    cachedTokenExpiresAt = Date.now() + Math.max(0, (expiresIn - 300) * 1000);

    return accessToken;
  }, 'Baidu token request failed');
}

async function getBaiduAccessToken() {
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt) {
    return cachedAccessToken;
  }

  return fetchBaiduAccessToken();
}

export async function baiduOCR(imageBuffer) {
  const accessToken = await getBaiduAccessToken();
  const formData = new URLSearchParams();

  formData.append('image', imageBuffer.toString('base64'));
  formData.append('language_type', 'CHN_ENG');
  formData.append('recognize_granularity', 'big');
  formData.append('vertexes_location', 'true');

  return requestWithRetry(async (attempt) => {
    const timeout = attempt === 1 ? OCR_TIMEOUT_MS : OCR_RETRY_TIMEOUT_MS;

    const response = await axios.post(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/general?access_token=${accessToken}`,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data?.error_code) {
      throw new Error(
        `Baidu OCR service error ${response.data.error_code}: ${response.data.error_msg || 'unknown error'}`
      );
    }

    return response.data;
  }, 'Baidu OCR failed');
}
