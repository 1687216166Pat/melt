const { getDB } = require("../db/index");

// 时间线事件类型
const EVENT_TYPES = {
  emotion: "情绪痕迹",
  relation: "关系变化",
  experience: "共同经历",
  habit: "习惯形成",
  memory: "AI主动记住",
};

// 将精确时间转换为模糊时间描述
function fuzzyTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const hours = diff / (1000 * 60 * 60);
  const days = hours / 24;

  if (hours < 12) return "刚才";
  if (hours < 24) return "今天";
  if (days < 3) return "最近";
  if (days < 7) return "前几天";
  if (days < 14) return "那段时间";
  if (days < 30) return "不久之前";
  if (days < 60) return "上个月";
  if (days < 180) return "好像是很久之前了";
  return "很久很久以前";
}

// 检查是否应该生成时间线事件
async function checkTimelineEvent(personaId, userMessage, aiReply, context) {
  const db = getDB();

  const { getRelationshipAtmosphere } = require("./relationship");
  const atmosphere = await getRelationshipAtmosphere(personaId);

  // 不要太频繁生成（至少间隔 2 小时）
  const { data: lastEvent } = await db
    .from("timeline_events")
    .select("created_at")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (lastEvent && lastEvent.length > 0) {
    const hoursSince =
      (Date.now() - new Date(lastEvent[0].created_at).getTime()) /
      (1000 * 60 * 60);
    if (hoursSince < 2) return;
  }

  // 让 AI 判断是否值得记入时间线
  const toneGuide =
    atmosphere.phase === "initial"
      ? "语气：像刚开始记录的观察者，客观温和"
      : atmosphere.phase === "familiar"
        ? "语气：像开始熟悉的朋友在记录"
        : atmosphere.phase === "close"
          ? "语气：像一起生活的人在回忆"
          : "语气：像已经很久很久的陪伴者在轻声说";

  // 获取人格性别
  let pronoun = "TA";
  try {
    const { data: personaData } = await db
      .from("custom_personas")
      .select("gender")
      .eq("id", personaId)
      .limit(1);
    if (personaData && personaData.length > 0) {
      if (personaData[0].gender === "male") pronoun = "他";
      else if (personaData[0].gender === "female") pronoun = "她";
    } else {
      // 内置人格从 user_profile 获取
      const { data: configRow } = await db
        .from("user_profile")
        .select("value")
        .eq("key", `persona_config_${personaId}`)
        .limit(1);
      if (configRow && configRow.length > 0) {
        const config = JSON.parse(configRow[0].value);
        if (config.gender === "male") pronoun = "他";
        else if (config.gender === "female") pronoun = "她";
      }
    }
  } catch {}

  const prompt = `你是一个时间线记录系统。判断以下对话是否包含"值得留下痕迹"的瞬间。

${toneGuide}
注意：用"${pronoun}"来称呼这个角色，不要用"AI"或"它"

只有以下类型才值得记录：
- 高情绪波动
- 关系变化
- 长期习惯形成
- 共同经历
- 特别的瞬间

如果不值得记录，回复"无"。
如果值得，用以下格式回复（一行）：
类型|内容描述（用模糊温柔的语气，像回忆一样，不超过30字）|标签

用户: ${userMessage}
AI: ${aiReply}

判断：`;

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
          max_tokens: 60,
          temperature: 0.3,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const result = data.choices[0].message.content.trim();
    if (result === "无" || result.length < 3) return;

    const parts = result.split("|");
    if (parts.length < 2) return;

    const eventType = parts[0].trim();
    const content = parts[1].trim();
    const tags = parts[2] ? parts[2].trim() : "";

    if (!content || content.length < 4) return;

    // 存入时间线
    await db.from("timeline_events").insert({
      persona_id: personaId,
      content,
      period: fuzzyTime(new Date()),
      event_type: eventType,
      tags,
    });

    console.log(`[时间线] ${personaId}: ${content}`);
  } catch (e) {
    console.error("[时间线] 生成失败:", e.message);
  }
}

// 获取时间线数据（按时间分组）
async function getTimeline(personaId) {
  const db = getDB();
  const { data } = await db
    .from("timeline_events")
    .select("*")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return [];

  // 按时间段分组
  const groups = {};
  data.forEach((event) => {
    const period = fuzzyTime(event.created_at);
    if (!groups[period]) groups[period] = [];
    groups[period].push({
      id: event.id,
      content: event.content,
      type: event.event_type,
      tags: event.tags ? event.tags.split("/") : [],
      createdAt: event.created_at,
    });
  });

  // 转成数组
  return Object.entries(groups).map(([period, events]) => ({
    period,
    events,
  }));
}

module.exports = { checkTimelineEvent, getTimeline, fuzzyTime };
