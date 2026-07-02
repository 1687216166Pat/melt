// server/services/subai.js
async function callSubAI(prompt, maxTokens = 100) {
  let apiKey = process.env.AI_SUB_API_KEY || process.env.AI_API_KEY;
  let baseUrl = process.env.AI_SUB_BASE_URL || process.env.AI_BASE_URL;
  let model = process.env.AI_SUB_MODEL || process.env.AI_MODEL;

  // 1. 尝试正常调用
  try {
    console.log(`[副API] 正在发起请求... 模型: ${model}`);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (response.ok && data.choices?.[0]) {
      return data.choices[0].message.content.trim();
    }
    console.warn(`[副API] 首次尝试失败: ${JSON.stringify(data)}`);
  } catch (e) {
    console.warn(`[副API] 首次网络尝试失败: ${e.message}`);
  }

  // 2. 💡 强制主 API 原始配置进行二次兜底
  console.log(`[副API] 正在启动主 API 配置进行强制兜底...`);
  try {
    const mainResponse = await fetch(
      `${process.env.AI_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      },
    );
    const mainData = await mainResponse.json();
    console.log(`[副API] 兜底响应状态: ${mainResponse.status}`);
    return mainData.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[副API] 终极兜底也失败了，请检查 server/.env 配置");
    return null;
  }
}

module.exports = { callSubAI };
