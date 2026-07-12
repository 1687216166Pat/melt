async function generateMapSVG(userPrompt, style = "cute") {
  console.log("[地图生成] 开始，prompt:", userPrompt, "style:", style);

  const styleMap = {
    cute: "可爱插画风格，柔和的色彩，圆润的线条，温馨感",
    fantasy: "奇幻手绘风格，细腻的纹理，魔法氛围",
    minimal: "简约线稿风格，黑白或单色，几何感",
  };

  const styleDesc = styleMap[style] || styleMap.cute;

  const systemPrompt =
    "你是一个 SVG 代码生成专家。只输出 SVG 代码，不要任何解释。";

  const userMessage = `生成一张虚拟地图的 SVG 代码。

场景：${userPrompt}
风格：${styleDesc}

要求：
- viewBox="0 0 800 600"
- 包含道路、建筑、地标
- 用柔和颜色：#FFE9ED, #E8C0C9, #D9A3AF, #98CBEA
- 地点用 <text> 标注中文名
- 只输出 <svg>...</svg>，不要任何解释

示例：
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#FFF8F0"/>
  <path d="M100 300 Q200 250 300 300" stroke="#E8C0C9" stroke-width="8" fill="none"/>
  <circle cx="150" cy="200" r="40" fill="#FFE9ED"/>
  <text x="150" y="205" text-anchor="middle" font-size="14" fill="#4A3F41">咖啡店</text>
</svg>`;

  try {
    // 通用调用：优先主 API，失败则降级副 API
    const { callMainAI } = require("./ai_caller");
    const { callSubAI } = require("./subai");

    let result = null;

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];
      result = await callMainAI(messages, {
        temperature: 0.8,
        max_tokens: 2000,
      });
      console.log("[地图生成] 主API 返回长度:", result ? result.length : 0);
    } catch (mainErr) {
      console.log("[地图生成] 主API 失败，尝试副API:", mainErr.message);
      result = await callSubAI(systemPrompt + "\n\n" + userMessage, 2000);
      console.log("[地图生成] 副API 返回长度:", result ? result.length : 0);
    }

    if (!result) {
      console.log("[地图生成] 所有 API 都返回空");
      return null;
    }

    const svgMatch = result.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      console.log("[地图生成] 未找到 SVG，返回前200字:", result.slice(0, 200));
      return null;
    }

    const svgCode = svgMatch[0];
    console.log("[地图生成] 成功提取 SVG，长度:", svgCode.length);

    const encoded = Buffer.from(svgCode).toString("base64");
    return `data:image/svg+xml;base64,${encoded}`;
  } catch (e) {
    console.error("[地图生成] 失败:", e.message);
    return null;
  }
}

module.exports = { generateMapSVG };
