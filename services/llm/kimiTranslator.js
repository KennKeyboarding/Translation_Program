// services/llm/kimiTranslator.js
//kimi prompt
import axios from 'axios';

export async function callKimi(chineseText) {
  const prompt = `
你是一个帮助外国人学习中文和理解中国文化的专业助手。请针对以下中文内容，提供两个独立的部分：

中文内容：
"""
${chineseText}
"""

1. 请保持完全相同的行数和行顺序
2. 每行中文对应一行英文翻译

请严格按照以下JSON格式回复：
{
  "translated_text": "完整的英文翻译",
  "content_summary": "基于图片内容的分析和总结",
  "cultural_insights": "相关的文化背景知识和拓展信息"
}

要求：
1. content_summary 要基于输入内容进行客观总结
2. cultural_insights 可以适当拓展背景知识
3. 使用自然流畅的英文
4. 确保返回有效JSON，不要包含额外文本
`;

  try {
    const response = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Kimi API: 无效的API Key');
    }
    if (error.response?.status === 429) {
      throw new Error('Kimi API: 请求频率超限');
    }
    if (error.response?.status === 402) {
      throw new Error('Kimi API: 余额不足');
    }

    throw new Error(`Kimi API 错误: ${error.message}`);
  }
}