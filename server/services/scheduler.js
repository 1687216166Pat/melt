const { getDB } = require("../db/index");
const { pushToAll } = require("../ws/socket");

// 检查并触发到期的定时消息
async function checkScheduledMessages() {
  const db = getDB();
  const now = new Date().toISOString();

  const { data } = await db
    .from("scheduled_messages")
    .select("*")
    .eq("triggered", false)
    .lte("trigger_at", now);

  if (!data || data.length === 0) return;

  for (const msg of data) {
    await db
      .from("scheduled_messages")
      .update({ triggered: true })
      .eq("id", msg.id);

    await db.from("messages").insert({
      persona_id: msg.persona_id,
      role: "ai",
      content: msg.content,
      timestamp: new Date().toISOString(),
    });

    // 获取人格名字
    let pName = "AI 助手";
    try {
      const { data: pDetail } = await db
        .from("custom_personas")
        .select("name, note")
        .eq("id", msg.persona_id)
        .limit(1);
      if (pDetail && pDetail.length > 0) {
        pName = pDetail[0].note || pDetail[0].name || "AI 助手";
      }
    } catch {}

    pushToAll(msg.content);
    // 单独发 Push 通知带名字
    const { pushNotification } = require("./push");
    pushNotification(pName, msg.content);

    console.log(`[定时] ${msg.persona_id}: ${msg.content}`);
  }
}

// 创建定时消息
async function createScheduledMessage(personaId, content, triggerAt) {
  const db = getDB();
  await db.from("scheduled_messages").insert({
    persona_id: personaId,
    content,
    trigger_at: triggerAt,
  });
  console.log(`[定时] 已创建: ${content} → ${triggerAt}`);
}

// 从对话中检测时间意图
function parseTimeIntent(message) {
  const now = new Date();
  let match;

  // "xx分钟后"
  match = message.match(/(\d+)\s*分钟后/);
  if (match) {
    const mins = parseInt(match[1]);
    return new Date(now.getTime() + mins * 60 * 1000);
  }

  // "xx小时后"
  match = message.match(/(\d+)\s*小时后/);
  if (match) {
    const hours = parseInt(match[1]);
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  // "半小时后"
  if (message.includes("半小时后") || message.includes("半个小时后")) {
    return new Date(now.getTime() + 30 * 60 * 1000);
  }

  // "明天xx点"
  match = message.match(/明天\s*(\d+)\s*点/);
  if (match) {
    const hour = parseInt(match[1]);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, 0, 0, 0);
    return tomorrow;
  }

  // "今天xx点" 或 "xx点"
  match = message.match(/(?:今天\s*)?(\d+)\s*点/);
  if (match && !message.includes("明天")) {
    const hour = parseInt(match[1]);
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);
    // 如果已经过了就设为明天
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }

  return null;
}

module.exports = {
  checkScheduledMessages,
  createScheduledMessage,
  parseTimeIntent,
};
