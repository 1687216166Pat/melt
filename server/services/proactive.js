// server/services/proactive.js
const { getDB } = require("../db/index");
const { pushToAll } = require("../ws/socket");
const { getMemoryProfile, getRecentMemories } = require("./memory");
const { getRelationshipAtmosphere } = require("./relationship");
const { getActivePersona } = require("./prompt");

async function getProactiveSettings() {
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "proactive_settings")
    .limit(1);
  if (data && data.length > 0) return JSON.parse(data[0].value);
  return {
    enabled: true,
    idleHours: 12,
    nightReminder: true,
    memoryReminder: true,
    maxPerDay: 3,
    minInterval: 4,
  };
}

async function setProactiveSettings(settings) {
  const db = getDB();

  // 先查是否存在
  const { data: existing } = await db
    .from("user_profile")
    .select("id")
    .eq("key", "proactive_settings")
    .limit(1);

  if (existing && existing.length > 0) {
    // 更新
    await db
      .from("user_profile")
      .update({
        value: JSON.stringify(settings),
        updated_at: new Date().toISOString(),
      })
      .eq("key", "proactive_settings");
  } else {
    // 插入
    await db
      .from("user_profile")
      .insert({ key: "proactive_settings", value: JSON.stringify(settings) });
  }
}

async function checkProactiveMessages() {
  const settings = await getProactiveSettings();
  if (!settings.enabled) return;

  const db = getDB();
  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().slice(0, 10);

  // 关系氛围影响主动消息频率
  const activePersona = getActivePersona();
  let intervalMultiplier = 1;
  try {
    const atmosphere = await getRelationshipAtmosphere(activePersona);
    if (atmosphere.phase === "close") intervalMultiplier = 0.8;
    if (atmosphere.phase === "deep") intervalMultiplier = 0.6;
    if (atmosphere.phase === "bonded") intervalMultiplier = 0.5;
  } catch {}

  // 边界检查
  const { data: todayLogs } = await db
    .from("proactive_log")
    .select("id")
    .eq("date", today);

  if (todayLogs && todayLogs.length >= settings.maxPerDay) return;

  const { data: lastLog } = await db
    .from("proactive_log")
    .select("sent_at")
    .order("sent_at", { ascending: false })
    .limit(1);

  if (lastLog && lastLog.length > 0) {
    const hoursSince = (now - new Date(lastLog[0].sent_at)) / (1000 * 60 * 60);
    if (hoursSince < settings.minInterval * intervalMultiplier) return;
  }

  // 获取最后一条用户消息
  const { data: lastMsg } = await db
    .from("messages")
    .select("timestamp")
    .eq("role", "user")
    .order("id", { ascending: false })
    .limit(1);

  const lastTime =
    lastMsg && lastMsg.length > 0 ? new Date(lastMsg[0].timestamp) : null;
  const idleHours = lastTime ? (now - lastTime) / (1000 * 60 * 60) : Infinity;

  let message = null;

  if (idleHours >= settings.idleHours) {
    message = await generateIdleMessage(idleHours);
  }

  if (!message && settings.memoryReminder && hour >= 8 && hour <= 10) {
    message = await generateMemoryReminder();
  }

  if (!message && settings.nightReminder) {
    message = await generateStatusMessage(hour, db);
  }

  if (message) {
    const { data: session } = await db
      .from("sessions")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);

    const sid = session && session.length > 0 ? session[0].id : "default";

    await db.from("messages").insert({
      session_id: sid,
      role: "ai",
      content: message,
      timestamp: now.toISOString(),
    });

    await db.from("proactive_log").insert({ date: today, message });

    pushToAll(message);
    console.log("主动消息已发送:", message);
  }
}

async function generateIdleMessage(idleHours) {
  const profile = await getMemoryProfile();
  const timeDesc = idleHours >= 24 ? "一天多" : "好久";
  const prompt = `你是用户手机里的AI伴侣。用户已经${timeDesc}没跟你说话了。
用户档案：${profile || "暂无"}
用一句话自然地打招呼或关心一下。只回复消息内容。`;
  return await callAI(prompt);
}

async function generateMemoryReminder() {
  const profile = await getMemoryProfile();
  const recentMems = await getRecentMemories(5);
  if (recentMems.length === 0 && !profile) return null;

  const recentText = recentMems.map((m) => m.content).join("\n");
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  const prompt = `你是用户手机里的AI伴侣。今天是${dateStr}。
用户档案：${profile || "暂无"}
最近记忆：${recentText || "暂无"}
判断今天是否有值得提醒的事。有则一句话提醒，没有则回复"无"。`;

  const result = await callAI(prompt);
  if (result === "无" || !result) return null;
  return result;
}

async function generateStatusMessage(hour, db) {
  if (hour >= 23 || hour <= 3) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data } = await db
      .from("messages")
      .select("id")
      .eq("role", "user")
      .gt("timestamp", oneHourAgo)
      .limit(1);

    if (data && data.length > 0) {
      const msgs = [
        "已经很晚了呢...要早点休息哦",
        "夜深了，明天还要早起吧？",
        "这么晚还没睡呀...要注意身体呢",
      ];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: msgCount } = await db
    .from("messages")
    .select("id", { count: "exact" })
    .eq("role", "user")
    .gt("timestamp", twoHoursAgo);

  if (msgCount && msgCount.length >= 20) {
    const msgs = [
      "今天聊了好多呀，开心~",
      "我们今天聊了好久呢，要不要休息一下眼睛？",
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  return null;
}

async function callAI(prompt) {
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
          temperature: 0.8,
        }),
      },
    );
    const data = await response.json();
    if (!data.choices || !data.choices[0]) return null;
    return data.choices[0].message.content.trim();
  } catch (e) {
    console.error("主动消息 AI 调用失败:", e);
    return null;
  }
}

module.exports = {
  checkProactiveMessages,
  getProactiveSettings,
  setProactiveSettings,
};
