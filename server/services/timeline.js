const { getDB } = require("../db/index");
const { callSubAI } = require("./subai");

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

// 💡 改造：检查并生成时间线（支持 Beta 模式）
async function checkTimelineEvent(
  personaId,
  userMessage,
  aiReply,
  isBeta = false,
) {
  const db = getDB();
  // 根据 isBeta 决定写入哪个表
  const tableName = isBeta ? "timeline_beta" : "timeline_events";

  const { getRelationshipAtmosphere } = require("./relationship");
  const atmosphere = await getRelationshipAtmosphere(personaId);

  // 1. 冷却检查：同一表内至少间隔 2 小时才生成
  const { data: lastEvent } = await db
    .from(tableName)
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

  // 2. 获取称呼配置
  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);

  const toneGuide =
    atmosphere.phase === "initial"
      ? "语气：像刚开始记录的观察者，客观温和"
      : atmosphere.phase === "familiar"
        ? "语气：像开始熟悉的朋友在记录"
        : atmosphere.phase === "close"
          ? "语气：像一起生活的人在回忆"
          : "语气：像已经很久很久的陪伴者在轻声说";

  // 3. 构建 Prompt
  const prompt = `你是一个时间线记录系统。判断以下对话是否包含"值得留下痕迹"的瞬间。

${toneGuide}
身份信息：
- AI的名字：${identity.aiName}
- 用户的称呼：${identity.userName}
- AI的代词：${identity.pronoun}
- 禁止使用"用户""AI""你""他/她"这些泛称，必须用上面的具体名字。

只有以下类型才值得记录：
- 高情绪波动
- 关系变化
- 长期习惯形成
- 共同经历
- 特别瞬间

如果不值得记录，回复"无"。
如果值得，用以下格式回复（一行）：
类型|内容描述（用${identity.userName}和${identity.aiName}称呼，像回忆一样，不超过30字）|标签

用户: ${userMessage}
AI: ${aiReply}

判断：`;

  try {
    const result = await callSubAI(prompt, 60);
    if (!result || result === "无" || result.length < 3) return;

    const parts = result.split("|");
    if (parts.length < 2) return;

    const eventType = parts[0].trim();
    const content = parts[1].trim();
    const tags = parts[2] ? parts[2].trim() : "";

    if (!content || content.length < 4) return;

    // 4. 存入对应的时间线表
    await db.from(tableName).insert({
      persona_id: personaId,
      content,
      period: fuzzyTime(new Date()),
      event_type: eventType,
      tags,
    });

    console.log(
      `[时间线] (${isBeta ? "Beta" : "正式"}) ${personaId}: ${content}`,
    );
  } catch (e) {
    console.error("[时间线] 生成失败:", e.message);
  }
}

// 💡 改造：获取时间线数据（支持 Beta 模式）
async function getTimeline(personaId, isBeta = false) {
  const db = getDB();
  const tableName = isBeta ? "timeline_beta" : "timeline_events";

  const { data } = await db
    .from(tableName)
    .select("*")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return [];

  const groups = {};
  data.forEach((event) => {
    const date = new Date(event.created_at).toISOString().slice(0, 10);
    if (!groups[date]) groups[date] = [];
    groups[date].push({
      id: event.id,
      content: event.content,
      type: event.event_type,
      tags: event.tags ? event.tags.split("/").filter(Boolean) : [],
      time: new Date(event.created_at).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Shanghai",
      }),
      createdAt: event.created_at,
    });
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, events]) => ({
      date,
      dateLabel: formatDateLabel(date),
      events: events.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      ),
    }));
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "今天";
  if (dateStr === yesterday) return "昨天";
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff < 7) return `${diff}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

module.exports = { checkTimelineEvent, getTimeline, fuzzyTime };
