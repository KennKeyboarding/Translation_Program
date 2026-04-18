// services/ocr/baiduOCR.js
import axios from 'axios';

async function getBaiduAccessToken() {
  const API_KEY = process.env.BAIDU_API_KEY;
  const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

  const response = await axios.post(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`
  );

  return response.data.access_token;
}

export async function baiduOCR(imageBuffer) {
  const accessToken = await getBaiduAccessToken();

  const response = await axios.post(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/general?access_token=${accessToken}`,
    {
      image: imageBuffer.toString('base64'),
      language_type: 'CHN_ENG',
      recognize_granularity: 'big',
      vertexes_location: 'true',
      probability: 'true',
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    }
  );

  return response.data;
}