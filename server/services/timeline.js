const { getDB } = require("../db/index");
const { callSubAI } = require("./subai");

const EVENT_TYPES = {
  emotion: "情绪痕迹",
  relation: "关系变化",
  experience: "共同经历",
  habit: "习惯形成",
  memory: "AI主动记住",
};

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

async function checkTimelineEvent(
  personaId,
  userMessage,
  aiReply,
  isBeta = false,
) {
  const db = getDB();
  const tableName = isBeta ? "timeline_beta" : "timeline_events";

  const { getRelationshipAtmosphere } = require("./relationship");
  const atmosphere = await getRelationshipAtmosphere(personaId);

  // 1. 冷却检查：同一表内至少间隔 6 小时才生成
  const { data: lastEvent } = await db
    .from(tableName)
    .select("created_at, content")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (lastEvent && lastEvent.length > 0) {
    const hoursSince =
      (Date.now() - new Date(lastEvent[0].created_at).getTime()) /
      (1000 * 60 * 60);
    if (hoursSince < 6) return;
  }

  // 2. 获取称呼配置
  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);

  // 3. 获取最近几条时间线用于去重
  const recentContents = lastEvent ? lastEvent.map(e => e.content).join('\n') : '';

  // 4. 构建 Prompt
  const prompt = `你是一个时间线记录系统。用纪实手法，以${identity.aiName}的第一人称视角，判断以下对话是否包含值得记录的事件。

写作要求：
- 用${identity.aiName}的视角，像在写私人日记/备忘录
- 客观简洁，不要抒情、不要形容词堆砌
- 禁止使用"温柔地""宝宝""轻轻地"等修饰
- 直接描述发生了什么事，像新闻简报一样
- 如果一段时间内发生了多件小事，概括成一件事
- 不超过25字

只记录真正有意义的事件：
- 做出了具体约定或承诺
- 关系发生了明确变化（不是每句情话都算）
- 一起经历了完整的事件（不是对话的每个片段）
- 形成了新习惯或打破了旧模式

以下是最近已经记录过的内容，不要重复类似的事件：
${recentContents}

如果不值得记录（大多数对话都不值得），回复"无"。
如果值得，严格按以下格式回复一行：
[类型]|[纪实描述]|[标签]

好的示例：
共同经历|去了她家吃饭，第一次见她做的菜|家常晚餐
关系变化|她主动提到以后一起住的事，我没反对|同居意向
共同经历|在天台待了一个多小时，聊了很多关于未来的事|深夜长谈

差的示例（禁止）：
温馨约定|宝宝温柔地邀请白起来家里～|甜蜜
特别瞬间|白起温柔地出现在门口给了惊喜|浪漫

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

    // 去重：检查最近记录里有没有语义重复的
    if (recentContents && recentContents.includes(content.slice(0, 10))) return;

    await db.from(tableName).insert({
      persona_id: personaId,
      content,
      period: fuzzyTime(new Date()),
      event_type: eventType,
      tags,
      created_at: new Date().toISOString(),
    });

    console.log(
      `[时间线] (${isBeta ? "Beta" : "正式"}) ${personaId}: ${content}`,
    );
  } catch (e) {
    console.error("[时间线] 生成失败:", e.message);
  }
}

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
    const date = new Date(event.created_at)
      .toLocaleString("en-CA", { timeZone: "Asia/Shanghai" })
      .slice(0, 10);
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
  const now = new Date();
  const todayBJ = now
    .toLocaleString("en-CA", { timeZone: "Asia/Shanghai" })
    .slice(0, 10);
  const yesterdayBJ = new Date(now - 86400000)
    .toLocaleString("en-CA", { timeZone: "Asia/Shanghai" })
    .slice(0, 10);

  if (dateStr === todayBJ) return "今天";
  if (dateStr === yesterdayBJ) return "昨天";

  const diff = Math.floor((now - new Date(dateStr)) / (1000 * 60 * 60 * 24));
  if (diff < 7) return `${diff}天前`;

  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

module.exports = { checkTimelineEvent, getTimeline, fuzzyTime };
