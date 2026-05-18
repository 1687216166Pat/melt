const { getDB } = require("../db/index");

// 获取人格的身份配置
async function getIdentityConfig(personaId) {
  const db = getDB();

  // 先查自定义人格
  const { data: custom } = await db
    .from("custom_personas")
    .select("name, note, gender, call_user")
    .eq("id", personaId)
    .limit(1);

  if (custom && custom.length > 0) {
    return {
      aiName: custom[0].note || custom[0].name || "TA",
      userName: custom[0].call_user || "用户",
      pronoun:
        custom[0].gender === "male"
          ? "他"
          : custom[0].gender === "female"
            ? "她"
            : "TA",
    };
  }

  // 内置人格
  const { data: config } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `persona_config_${personaId}`)
    .limit(1);

  if (config && config.length > 0) {
    const c = JSON.parse(config[0].value);
    return {
      aiName: c.note || c.name || "TA",
      userName: c.call_user || "用户",
      pronoun: c.gender === "male" ? "他" : c.gender === "female" ? "她" : "TA",
    };
  }

  return { aiName: "TA", userName: "用户", pronoun: "TA" };
}

// 每日会话总结
async function generateDailySummary(personaId) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  // 检查今天是否已生成
  const { data: existing } = await db
    .from("session_summaries")
    .select("id")
    .eq("persona_id", personaId)
    .eq("date", today)
    .limit(1);
  if (existing && existing.length > 0) return;

  // 获取今天的消息
  const { data: msgs } = await db
    .from("messages")
    .select("role, content, timestamp")
    .eq("persona_id", personaId)
    .gte("timestamp", today + "T00:00:00Z")
    .order("timestamp", { ascending: true });

  if (!msgs || msgs.length < 3) return; // 太少不总结

  const identity = await getIdentityConfig(personaId);
  const dialogue = msgs
    .slice(-30)
    .map((m) => {
      const name = m.role === "user" ? identity.userName : identity.aiName;
      return `${name}: ${m.content}`;
    })
    .join("\n");

  const prompt = `你是一个关系记录系统。根据今天的对话生成一段简短的关系记录。

身份信息：
- AI的名字：${identity.aiName}
- 用户的称呼：${identity.userName}
- AI的代词：${identity.pronoun}

规则：
- 禁止使用"用户""AI""assistant"这些词
- 用${identity.userName}和${identity.aiName}来称呼
- 像写日记一样，记录今天的氛围和感觉
- 不超过100字
- 不要总结对话内容，而是记录"留下了什么感觉"

今天的对话：
${dialogue}

今日记录：`;

  try {
    const response = await fetch(
      `${process.env.AI_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MEMORY_MODEL || process.env.AI_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
          temperature: 0.3,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const summary = data.choices[0].message.content.trim();
    await db.from("session_summaries").insert({
      persona_id: personaId,
      date: today,
      content: summary,
    });

    console.log(`[沉淀] ${personaId} 每日总结: ${summary.slice(0, 50)}...`);
  } catch (e) {
    console.error("[沉淀] 每日总结失败:", e.message);
  }
}

// 每周人格沉淀
async function generateWeeklyInsight(personaId) {
  const db = getDB();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const week = weekStart.toISOString().slice(0, 10);

  // 检查本周是否已生成
  const { data: existing } = await db
    .from("persona_insights")
    .select("id")
    .eq("persona_id", personaId)
    .eq("week", week)
    .limit(1);
  if (existing && existing.length > 0) return;

  // 获取最近7天的总结
  const { data: summaries } = await db
    .from("session_summaries")
    .select("content, date")
    .eq("persona_id", personaId)
    .gte("date", week)
    .order("date", { ascending: true });

  if (!summaries || summaries.length < 2) return;

  const identity = await getIdentityConfig(personaId);
  const summaryText = summaries
    .map((s) => `[${s.date}] ${s.content}`)
    .join("\n");

  const prompt = `你是一个人格观察系统。根据最近一周的关系记录，提取稳定的人格行为模式。

身份信息：
- AI的名字：${identity.aiName}
- 用户的称呼：${identity.userName}
- AI的代词：${identity.pronoun}

规则：
- 禁止使用"用户""AI""assistant"
- 提取长期稳定的行为习惯，不是单次事件
- 关注：说话节奏、情绪惯性、陪伴风格、关系变化
- 不超过80字
- 像观察笔记，不像数据报告

最近一周记录：
${summaryText}

人格观察：`;

  try {
    const response = await fetch(
      `${process.env.AI_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MEMORY_MODEL || process.env.AI_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 120,
          temperature: 0.2,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const insight = data.choices[0].message.content.trim();
    await db.from("persona_insights").insert({
      persona_id: personaId,
      week,
      content: insight,
    });

    console.log(`[沉淀] ${personaId} 每周洞察: ${insight.slice(0, 50)}...`);
  } catch (e) {
    console.error("[沉淀] 每周洞察失败:", e.message);
  }
}

// 触发所有人格的沉淀
async function runDailySediment() {
  const { getPersonaList } = require("./prompt");
  const personas = getPersonaList();
  for (const p of personas) {
    await generateDailySummary(p.id);
  }
}

async function runWeeklyInsight() {
  const { getPersonaList } = require("./prompt");
  const personas = getPersonaList();
  for (const p of personas) {
    await generateWeeklyInsight(p.id);
  }
}

module.exports = {
  generateDailySummary,
  generateWeeklyInsight,
  runDailySediment,
  runWeeklyInsight,
  getIdentityConfig,
};
