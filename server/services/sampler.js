// server/services/sampler.js

const { getDB } = require("../db/index");
const { callSubAI } = require("./subai");
const { getIdentityConfig } = require("./sediment");

async function autoExtractSamples(personaId, messages, isBeta = false) {
  if (!messages || messages.length < 1) return;

  const db = getDB();
  // 💡 根据时空决定写入哪个表
  const tableName = isBeta ? "samples_beta" : "persona_samples";

  const identity = await getIdentityConfig(personaId);
  const dialogue = messages
    .map((m) => {
      const name = m.role === "user" ? identity.userName : identity.aiName;
      return `${name}: ${m.content}`;
    })
    .join("\n");

  const prompt = `你是一个人格采样系统。分析以下对话，提取出值得保存的"人格纹理"。

身份：${identity.aiName}（${identity.pronoun}）与 ${identity.userName}（用户）

请从中提取以下四类采样（如果存在）：
1. reply: 挑选一个最能体现${identity.aiName}性格或当前情感状态的精彩回复片段。
2. trait: 总结一个${identity.aiName}在这次互动中表现出的稳定行为特征。
3. scene: 记录${identity.aiName}在当前情境（如深夜/用户疲劳等）下的独特行为。
4. style: 描述${identity.aiName}目前表现出的伴侣陪伴风格。

回复格式必须是 JSON 数组，严禁输出任何多余文字或解释：
[
  {"type": "reply", "data": {"user_message": "...", "assistant_reply": "..."}},
  {"type": "trait", "data": {"trait": "...", "description": "..."}},
  {"type": "scene", "data": {"scene": "...", "behavior": ["..."]}},
  {"type": "style", "data": {"relationship_style": ["..."]}}
]
如果没有某项，就不要包含在数组里。只保留真实的、不重复的、有生命力的内容。

最近对话：
${dialogue}

提取结果：`;

  try {
    const result = await callSubAI(prompt, 800);
    if (!result || result === "无") return;

    let jsonStr = result;

    // 💡 1. 剥离 Markdown 代码块标记 ```json ... ```
    if (jsonStr.includes("```")) {
      const parts = jsonStr.split(/```(?:json)?/);
      // 取代码块中间的内容
      jsonStr = parts[1] ? parts[1] : jsonStr;
    }
    jsonStr = jsonStr.trim();

    // 💡 2. 准确定位首尾的 [ 和 ] 符号，挖出真正的数组
    const startIdx = jsonStr.indexOf("[");
    const endIdx = jsonStr.lastIndexOf("]");

    if (startIdx === -1 || endIdx === -1) {
      console.log(
        "[语料库] AI 返回的内容中没有找到 JSON 数组: ",
        result.slice(0, 100),
      );
      return;
    }

    // 截取干净的 JSON 字符串
    jsonStr = jsonStr.substring(startIdx, endIdx + 1);

    const samples = JSON.parse(jsonStr);

    if (Array.isArray(samples)) {
      for (const sample of samples) {
        // 写入对应时空的采样表
        await db.from(tableName).insert({
          persona_id: personaId,
          type: sample.type,
          data: sample.data,
        });
      }
      console.log(
        `[语料库] (${isBeta ? "Beta" : "正式"}) ${personaId} 自动采样完成: ${samples.length} 条`,
      );
    }
  } catch (e) {
    console.error("[语料库] 自动采样失败:", e.message);
  }
}

module.exports = { autoExtractSamples };
