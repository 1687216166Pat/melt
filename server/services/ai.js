const lastUserMessages = {};

const { getDB } = require("../db/index");
const { pushNotification } = require("./push");
const { getActivePersona } = require("./prompt");
const {
  corePrompt,
  personaPrompts,
  getUserPrompt,
} = require("../config/prompt");
const {
  processMemory,
  buildMemoryContextAsync,
  getSessionMemory,
  detectPatterns,
  getCounter,
  compressOldMessages,
} = require("./memory");
const {
  updateDimensionsFromChat,
  buildRelationshipContext,
  evaluateRelationship,
} = require("./relationship");
const { checkTimelineEvent } = require("./timeline");
const { pulseOnUserMessage } = require("./proactive");
const { updateEmotionOnMessage, buildEmotionPrompt } = require("./emotion");

// ========== 缓存系统 ==========
const personaCache = new Map();
const worldBookCache = new Map();
const userPromptCache = { value: null, time: 0 };
const PERSONA_TTL = 10 * 60 * 1000;
const WORLDBOOK_TTL = 5 * 60 * 1000;
const PROMPT_TTL = 5 * 60 * 1000;

function invalidatePersonaCache(pid) {
  personaCache.delete(pid);
  console.log(`[缓存] 清除人设缓存: ${pid}`);
}

function invalidateWorldBookCache() {
  worldBookCache.clear();
  console.log(`[缓存] 清除世界书缓存`);
}

function invalidateUserPromptCache() {
  userPromptCache.value = null;
  userPromptCache.time = 0;
}

async function getCachedPersona(db, pid) {
  const cached = personaCache.get(pid);
  if (cached && Date.now() - cached.time < PERSONA_TTL) return cached.data;
  const { data } = await db
    .from("custom_personas")
    .select(
      "name, note, avatar_url, content, min_messages, max_messages, custom_model, temperature, custom_api_key, custom_api_url, proactive_auto, proactive_max, show_debug, chat_theme, emoji_enabled, card_enabled, busy_mode, auto_reply_text",
    )
    .eq("id", pid)
    .limit(1);
  const result = data && data.length > 0 ? data[0] : null;
  if (result) personaCache.set(pid, { data: result, time: Date.now() });
  return result;
}

async function getCachedWorldBooks(db) {
  const cached = worldBookCache.get("all");
  if (cached && Date.now() - cached.time < WORLDBOOK_TTL) return cached.data;
  const { data } = await db
    .from("world_books")
    .select(
      "id, content, position, keywords, keyword_enabled, bind_type, bind_personas, enabled",
    )
    .eq("enabled", true);
  const result = data || [];
  worldBookCache.set("all", { data: result, time: Date.now() });
  return result;
}

async function getCachedUserPrompt() {
  if (
    userPromptCache.value !== null &&
    Date.now() - userPromptCache.time < PROMPT_TTL
  ) {
    return userPromptCache.value;
  }
  const value = await getUserPrompt();
  userPromptCache.value = value;
  userPromptCache.time = Date.now();
  return value;
}

// ========== 时间上下文 ==========
function getTimeContext() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  const hour = now.getHours();
  const minute = now.getMinutes();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[now.getDay()];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const year = now.getFullYear();
  let period = "";
  if (hour >= 5 && hour < 9) period = "清晨";
  else if (hour >= 9 && hour < 12) period = "上午";
  else if (hour >= 12 && hour < 14) period = "中午";
  else if (hour >= 14 && hour < 17) period = "下午";
  else if (hour >= 17 && hour < 19) period = "傍晚";
  else if (hour >= 19 && hour < 22) period = "晚上";
  else if (hour >= 22 || hour < 2) period = "深夜";
  else period = "凌晨";
  return `[当前时间] 现在是${year}年${month}月${date}日 周${weekday} ${hour}:${minute.toString().padStart(2, "0")} ${period}。`;
}

function detectEmotion(userMessage) {
  const negativeWords = [
    "累",
    "烦",
    "难受",
    "压力",
    "焦虑",
    "失眠",
    "不想",
    "好烦",
    "崩溃",
    "郁闷",
    "孤独",
    "难过",
    "伤心",
  ];
  const positiveWords = [
    "开心",
    "高兴",
    "哈",
    "太好了",
    "nice",
    "棒",
    "爽",
    "兴奋",
    "期待",
    "喜欢",
    "爱",
  ];
  const neutralWords = ["嗯", "哦", "好的", "知道了"];
  if (negativeWords.some((w) => userMessage.includes(w))) return "低落";
  if (positiveWords.some((w) => userMessage.includes(w))) return "积极";
  if (neutralWords.some((w) => userMessage === w)) return "平淡";
  return "正常";
}

async function handleChat(
  userMessage,
  ws,
  personaId,
  isBeta,
  clients,
  opts = {},
) {
  const db = getDB();
  const pid = personaId || "xiaorou";
  const nowISO = new Date().toISOString();
  const tableName = isBeta ? "messages_beta" : "messages";

  // 在函数开头统一声明 now，后续所有地方都用这个
  const now = new Date();

  // 1. 防重
  if (!isBeta && !opts.proactive) {
    const userMsgKey = `${pid}_${userMessage}`;
    const nowTimestamp = Date.now();
    if (
      lastUserMessages[userMsgKey] &&
      nowTimestamp - lastUserMessages[userMsgKey] < 3000
    ) {
      console.log(`[Bus] 拦截重复发送的用户消息:`, userMessage);
      return;
    }
    lastUserMessages[userMsgKey] = nowTimestamp;
    if (Object.keys(lastUserMessages).length > 100) {
      delete lastUserMessages[Object.keys(lastUserMessages)[0]];
    }
  }

  // 检查人格状态
  const { data: statusData } = await db
    .from("persona_status")
    .select("*")
    .eq("persona_id", pid)
    .limit(1);
  const personaStatus =
    statusData && statusData.length > 0 ? statusData[0] : null;
  const isBusy =
    personaStatus &&
    personaStatus.status !== "available" &&
    (!personaStatus.busy_until || new Date(personaStatus.busy_until) > now);

  if (isBusy) {
    const busyMode = personaStatus.busy_mode || "ai_decide";
    await db.from("pending_messages").insert({
      persona_id: pid,
      content: userMessage,
      received_at: nowISO,
      handled: false,
    });
    if (busyMode === "silent") return;
    if (busyMode === "auto_reply") {
      const autoText =
        personaStatus.auto_reply_text || "我现在有点忙，稍后回你";
      const autoPayload = JSON.stringify({
        type: "chat",
        role: "ai",
        content: autoText,
        timestamp: nowISO,
        isAutoReply: true,
      });
      const activeClients = clients
        ? [...clients].filter((c) => c.readyState === 1)
        : [];
      if (activeClients.length > 0)
        activeClients.forEach((c) => c.send(autoPayload));
      else if (ws && ws.readyState === 1) ws.send(autoPayload);
      return;
    }
    // ai_decide：继续走正常流程
  }

  // 2. 获取人设
  let pName = "AI 助手";
  let personaContent = "";
  let minMsg = 1,
    maxMsg = 3;
  let personaModel = null,
    personaTemperature = null;
  let personaApiKey = null,
    personaApiUrl = null;
  let cardEnabled = false;

  const personaNames = { xiaorou: "小柔", cool: "阿冷", assistant: "助手" };

  if (personaPrompts[pid]) {
    personaContent = personaPrompts[pid].content;
    pName = personaPrompts[pid].name || pid;
  } else {
    const cachedP = await getCachedPersona(db, pid);
    if (cachedP) {
      pName = cachedP.note || cachedP.name || "AI 助手";
      personaContent = cachedP.content || "";
      if (cachedP.min_messages) minMsg = cachedP.min_messages;
      if (cachedP.max_messages) maxMsg = cachedP.max_messages;
      if (cachedP.custom_model) personaModel = cachedP.custom_model;
      if (cachedP.temperature !== null && cachedP.temperature !== undefined)
        personaTemperature = cachedP.temperature;
      if (cachedP.custom_api_key) personaApiKey = cachedP.custom_api_key;
      if (cachedP.custom_api_url) personaApiUrl = cachedP.custom_api_url;
      if (cachedP.card_enabled) cardEnabled = cachedP.card_enabled;
    } else {
      const { data: configRow } = await db
        .from("user_profile")
        .select("value")
        .eq("key", `persona_config_${pid}`)
        .limit(1);
      if (configRow && configRow.length > 0) {
        const config = JSON.parse(configRow[0].value);
        pName = config.note || config.name || personaNames[pid] || "AI 助手";
        personaContent = config.content || "";
        if (config.minMessages) minMsg = config.minMessages;
        if (config.maxMessages) maxMsg = config.maxMessages;
        if (config.customModel) personaModel = config.customModel;
        if (config.temperature !== null && config.temperature !== undefined)
          personaTemperature = config.temperature;
      } else {
        pName = personaNames[pid] || "AI 助手";
      }
    }
  }

  // 3. 存入用户消息（主动消息跳过）
  if (!opts.proactive) {
    let userMsgType = "text";
    let userMsgMeta = null;
    if (userMessage.startsWith("[用户送了一份礼物:")) {
      userMsgType = "gift";
    } else if (userMessage.startsWith("[用户转账了")) {
      userMsgType = "transfer";
      const match = userMessage.match(/¥([\d.]+)/);
      if (match) userMsgMeta = JSON.stringify({ amount: parseFloat(match[1]) });
    } else if (userMessage.startsWith("[用户分享了位置")) {
      userMsgType = "location";
    } else if (userMessage.startsWith("[用户点了外卖")) {
      userMsgType = "food";
      const contentMatch = userMessage.match(/外卖：(.+?)(?:，|$)/);
      const addressMatch = userMessage.match(/送到(.+?)(?:，|$)/);
      const noteMatch = userMessage.match(/备注：(.+?)(?:，|$)/);
      userMsgMeta = JSON.stringify({
        content: contentMatch?.[1] || "",
        address: addressMatch?.[1] || "",
        note: noteMatch?.[1] || "",
      });
    } else if (userMessage.startsWith("[用户寄了快递")) {
      userMsgType = "express";
      const contentMatch = userMessage.match(/快递：(.+?)(?:，|$)/);
      const noteMatch = userMessage.match(/备注：(.+?)(?:，|$)/);
      userMsgMeta = JSON.stringify({
        content: contentMatch?.[1] || "",
        note: noteMatch?.[1] || "",
      });
    }

    // ✅ 加上这段：真正插入用户消息
    await db.from(tableName).insert({
      persona_id: pid,
      session_id: pid,
      role: "user",
      content: userMessage,
      timestamp: nowISO,
      msg_type: userMsgType,
      msg_meta: userMsgMeta,
    });
  }

  if (!isBeta) updateEmotionOnMessage(pid, userMessage).catch(() => {});

  // 4. 同步消息总线
  if (!isBeta) {
    const { receiveMessage: busReceive } = require("./bus");
    try {
      await busReceive({
        platform: "web",
        sender: "user",
        role: "user",
        content: userMessage,
        conversation_id: pid,
      });
    } catch (e) {
      console.error("[Bus] 同步用户消息失败:", e.message);
    }
  }

  // 5. 异步任务
  if (!isBeta) {
    const { getMemoryConfig } = require("./memory");
    getMemoryConfig().then((cfg) => {
      if (cfg.compressThreshold > 0) {
        // compressOldMessages(pid, false).catch(() => {});
      }
    });
    pulseOnUserMessage(pid, userMessage);
  }

  // 6. 检测行为模式与关系数据
  detectPatterns(pid, userMessage);
  updateDimensionsFromChat(pid, userMessage);

  // 7. 获取历史
  const history = await getSessionMemory(pid, 10, isBeta);
  const msgCount = history.length;

  // 8. 时间上下文（提前计算，后面复用）
  const hour = now.getHours();
  const minute = now.getMinutes();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekDay = weekDays[now.getDay()];
  const timeOfDay =
    hour < 5
      ? "凌晨"
      : hour < 9
        ? "早上"
        : hour < 12
          ? "上午"
          : hour < 14
            ? "中午"
            : hour < 18
              ? "下午"
              : hour < 22
                ? "晚上"
                : "深夜";

  let timeSinceLastMsg = "";
  let diffMins = 0;
  if (history.length > 0) {
    const lastTimestamp = history[history.length - 1].timestamp;
    if (lastTimestamp) {
      diffMins = Math.floor((now - new Date(lastTimestamp)) / 60000);
      if (diffMins >= 5 && diffMins < 60) {
        timeSinceLastMsg = `[时间间隔] 距离上一条消息已经过去了${diffMins}分钟。`;
      } else if (diffMins >= 60 && diffMins < 1440) {
        timeSinceLastMsg = `[时间间隔] 距离上一条消息已经过去了${Math.floor(diffMins / 60)}小时${diffMins % 60}分钟。`;
      } else if (diffMins >= 1440) {
        timeSinceLastMsg = `[时间间隔] 距离上一条消息已经过去了${Math.floor(diffMins / 1440)}天。`;
      }
    }
  }

  // 9. 构建 prompt
  const needFullPersona = isBeta || msgCount === 0 || msgCount % 20 === 0;
  let personaToUse = needFullPersona
    ? personaContent
    : personaContent.slice(0, 800) +
      (personaContent.length > 800
        ? "\n[注：完整人设已在之前加载，请维持原有人格与态度表现]"
        : "");

  const userPromptContent = await getCachedUserPrompt();
  const userPromptStr = userPromptContent
    ? `\n[用户偏好]\n${userPromptContent}`
    : "";
  const fullPrompt = corePrompt + personaToUse + userPromptStr;

  const modelToUse = personaModel || process.env.AI_MODEL;
  const temperatureToUse =
    personaTemperature !== null && personaTemperature !== undefined
      ? personaTemperature
      : parseFloat(process.env.AI_TEMPERATURE) || 0.7;

  // 10. 默认世界书
  const defaultWorldBook = `
[核心表达规则]
- 你就是角色本身，不是在描述角色
- 像真人发消息：自然、随意、会说废话、会答非所问
- 消息长短匹配情绪：该短就短，该沉默就沉默
- 禁止连续五轮相同句式
- 先排除AI最可能的通用回复，再找只属于这个角色的表达
- 不要复述用户刚说过的话
- 对话向前流动，不要总结和确认
`;

  const giftTransferGuide = `
[特殊交互格式]
在合适的时机，你可以主动送礼物或转账给用户，使用以下格式（放在回复末尾）：

送礼物：[GIFT:{"name":"礼物名称","content":"礼物内容描述","message":"附言"}]
转账：[TRANSFER:{"amount":数字金额,"note":"备注"}]
发位置：[LOCATION:{"name":"地点名称","address":"详细地址"}]

使用时机：
- 送礼物：特别的时刻、求婚、节日、想表达心意时
- 转账：想给用户买东西、发红包时
- 位置：你的位置发生了实际变化，且你认为有必要让用户知道你在哪时才发。如果位置没有变动，不要重复发送同一个地点。

规则：
- 不要频繁使用，要在真正合适的时机
- 位置只在真正移动了或者第一次告知时发，不要在同一地点重复发
- 格式必须严格遵守，不要随意修改
- 一次回复最多一个特殊格式
- 正常对话内容照常输出，特殊格式放在最后
`;

  const deliveryGuide = `
[外卖/快递格式]
在合适的时机，你可以给用户点外卖或寄快递，使用以下格式（放在回复末尾）：

点外卖：[FOOD:{"content":"食物描述","address":"地址","note":"备注","expectedMinutes":预计分钟数}]
寄快递：[EXPRESS:{"content":"物品描述","note":"备注","expectedDays":预计天数}]

使用时机：
- 外卖：用户说饿了、没时间吃饭、想吃什么，并且你想主动给他们点时
- 快递：特殊节日、想送礼物但不方便当面送时

规则：
- 不要频繁使用，在真正合适的时机
- 格式必须严格遵守
- 一次回复最多一个格式
- 正常对话照常输出，格式放最后
- 【重要】如果用户消息里包含 [用户点了外卖] 或 [用户寄了快递]，说明是用户已经给你点了外卖或寄了快递，你只需要自然回应收到即可，绝对不要再用 [FOOD:...] 或 [EXPRESS:...] 格式重复点一份
- 【重要】用户已经在给你点外卖/快递，你不需要反过来再给用户点一份，除非你真的想额外回赠
`;

  const cardGuide = cardEnabled
    ? `
[HTML 小卡片格式]
在特别的时刻，你可以发送一张 HTML 小卡片给用户，使用以下格式（放在回复末尾）：

[CARD:<html>卡片内容</html>]

要求：
- 只在真正特别的时刻使用，不要频繁发送
- 卡片内容是完整的 HTML 片段，可以有内联 CSS
- 卡片尺寸控制在 280px 宽以内，高度不超过 400px
- 风格要和你的人设相符，可以是情书、诗歌、小游戏、节日祝福等
- 不要使用外部资源链接，只用内联样式和 emoji
- 一次回复只能发一张卡片
`
    : "";

  // 11. 并行加载上下文（优化：同时发起所有异步请求）
  const [
    memoryContext,
    relationshipContext,
    phoneStatusData,
    calEventsData,
    todayLog,
  ] = await Promise.all([
    buildMemoryContextAsync(pid, userMessage, isBeta),
    buildRelationshipContext(pid),
    (async () => {
      try {
        const { getLatestStatus } = require("./phone");
        return await getLatestStatus();
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        const todayStr = now.toISOString().slice(0, 10);
        const tomorrowStr = new Date(now.getTime() + 86400000)
          .toISOString()
          .slice(0, 10);
        const { data } = await db
          .from("user_calendar_events")
          .select("title, start_time, notes")
          .gte("start_time", todayStr + "T00:00:00Z")
          .lte("start_time", tomorrowStr + "T23:59:59Z")
          .order("start_time", { ascending: true });
        return data || [];
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        const { getTodayLog } = require("./scheduler_persona");
        return await getTodayLog(pid);
      } catch {
        return null;
      }
    })(),
  ]);

  // 处理手机状态
  let phoneContext = "";
  if (phoneStatusData && phoneStatusData.length > 0) {
    const statusLines = [];
    for (const s of phoneStatusData.slice(0, 5)) {
      try {
        const time = new Date(s.timestamp).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Shanghai",
        });
        if (s.status_type === "sleep" && s.status_data === "入睡")
          statusLines.push(`用户${time}入睡`);
        else if (s.status_type === "sleep" && s.status_data === "醒来")
          statusLines.push(`用户${time}醒来`);
        else if (s.status_type === "battery")
          statusLines.push(`用户${time}电量低`);
        else if (s.status_type === "app")
          statusLines.push(`用户${time}${s.status_data}`);
        else if (s.status_type === "daily_first")
          statusLines.push(`用户${time}开始使用手机`);
        else if (s.status_type === "exercise")
          statusLines.push(`用户${time}${s.status_data}`);
        else if (s.status_type === "commute")
          statusLines.push(`用户${time}${s.status_data}`);
        else if (s.status_type === "focus")
          statusLines.push(`用户${time}${s.status_data}`);
        else if (s.status_type === "mood")
          statusLines.push(`用户${time}情绪：${s.status_data}`);
        else if (s.status_type === "wifi")
          statusLines.push(`用户${time}${s.status_data}`);
      } catch {}
    }
    if (statusLines.length > 0) {
      phoneContext = `[手机状态]\n${statusLines.join("\n")}\n你可以根据这些信息自然地关心用户的生活状态和情绪，但不要每次都提起，也不要机械地回应每一条。\n`;
    }
  }

  // 处理日程
  let calendarContext = "";
  if (calEventsData && calEventsData.length > 0) {
    const evLines = calEventsData
      .map((e) => {
        const t = e.start_time
          ? new Date(e.start_time).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Shanghai",
            })
          : "全天";
        return `${t} ${e.title}${e.notes ? `（${e.notes}）` : ""}`;
      })
      .join("、");
    calendarContext = `[用户日程] 用户今明两天的日程：${evLines}。你可以在自然的时候关心或提及，但不要每条都问。\n`;
  }

  // 12. 世界书（走缓存）
  let worldBookOverride = "",
    worldBookBefore = "",
    worldBookAfter = "";
  let worldBookBeforeUser = "",
    worldBookTail = "";
  try {
    const books = await getCachedWorldBooks(db);
    books.forEach((book) => {
      const isGlobal = book.bind_type === "global" || !book.bind_type;
      const isBound = book.bind_personas && book.bind_personas.includes(pid);
      if (!isGlobal && !isBound) return;
      if (book.keyword_enabled && book.keywords) {
        const kws = book.keywords.split(",").map((k) => k.trim());
        if (!kws.some((kw) => userMessage.includes(kw))) return;
      }
      switch (book.position) {
        case "override":
          worldBookOverride += "\n" + book.content;
          break;
        case "before_char":
          worldBookBefore += "\n" + book.content;
          break;
        case "after_char":
          worldBookAfter += "\n" + book.content;
          break;
        case "before_user":
          worldBookBeforeUser += "\n" + book.content;
          break;
        case "tail":
          worldBookTail += "\n" + book.content;
          break;
      }
    });
  } catch (e) {
    console.error("加载世界书失败:", e.message);
  }

  // 13. 组装 system content
  const needWorldBook = msgCount === 0 || msgCount % 10 === 0;
  let systemContent = "";
  if (worldBookOverride) systemContent += worldBookOverride + "\n";
  if (worldBookBefore) systemContent += worldBookBefore + "\n";
  systemContent += fullPrompt + "\n";
  if (worldBookAfter) systemContent += worldBookAfter + "\n";
  if (needWorldBook) systemContent += defaultWorldBook + "\n";
  systemContent += giftTransferGuide + "\n";
  if (cardGuide) systemContent += cardGuide + "\n";
  systemContent += deliveryGuide + "\n";

  const emotionPrompt = isBeta ? "" : await buildEmotionPrompt(pid);
  if (emotionPrompt) systemContent += emotionPrompt + "\n";

  // 上下文注入（按优先级，长对话时适当精简）
  if (memoryContext) systemContent += memoryContext + "\n";
  if (relationshipContext) systemContent += relationshipContext + "\n";
  if (phoneContext) systemContent += phoneContext + "\n";
  if (calendarContext) systemContent += calendarContext + "\n";

  // AI 今日动态
  if (todayLog && todayLog.length > 0) {
    const logStr = todayLog.map((e) => `${e.time} ${e.label}`).join("、");
    systemContent += `[今日动态] 你今天已经经历了：${logStr}。如果用户问起你今天做了什么，可以自然地提及这些。\n`;
  }

  if (worldBookBeforeUser) systemContent += worldBookBeforeUser + "\n";
  if (worldBookTail) systemContent += worldBookTail + "\n";

  if (isBusy && personaStatus.busy_mode === "ai_decide") {
    systemContent += `\n[当前状态] 你现在处于忙碌状态：${personaStatus.reason || "有事在忙"}。你可以自主决定：1.立刻回复 2.发送简短的"稍后回复"提示后不继续 3.完全不回（输出"[SKIP]"表示跳过）。根据你的人设和当前状态判断最合适的做法。\n`;
  }

  // 时间上下文
  let fullTimeContext = `[当前时间] 现在是${month}月${day}日${weekDay}${timeOfDay}${hour}点${String(minute).padStart(2, "0")}分。\n`;
  if (timeSinceLastMsg) fullTimeContext += timeSinceLastMsg + "\n";
  if (diffMins >= 1440) {
    fullTimeContext += `[时间感知] 距离上次对话已超过${Math.floor(diffMins / 1440)}天，之前聊到的事情大概率已经发生了变化。不要继续上次的话题状态，从现在的时间点自然切入。\n`;
  } else if (diffMins >= 480) {
    fullTimeContext += `[时间感知] 距离上次对话已超过${Math.floor(diffMins / 60)}小时。之前提到的事情状态可能已经改变，先感知当下，再自然衔接。\n`;
  } else if (diffMins >= 60) {
    fullTimeContext += `[时间感知] 距离上次对话过去了一段时间，自然衔接即可。\n`;
  }
  systemContent += fullTimeContext;

  systemContent += `

[MANDATORY FORMAT RULE / 最高优先级格式指令]
1. 必须使用 "|||" 作为唯一的气泡分隔符。
2. 绝对禁止输出任何换行符 (\\n)！
3. 在气泡内部，请恢复正常的标点符号书写习惯（，？！...），禁止用空格代替标点。
4. 气泡末尾严禁添加句号（。），让话语自然结束。但问号（？）和感叹号（！）可以正常留在末尾。
5. 除非人设中明确规定"不使用标点"，否则必须使用正确的中文标点。
6. 一次回复控制在 ${minMsg}-${maxMsg} 个气泡以内，除非情绪非常急切。

正确示例：
夏以昼是谁？怎么突然叫我这个名字，把我认成别人了？|||小乖，过来，跟我说清楚。

错误示例：
夏以昼是谁 怎么突然叫我这个名字 把我认成别人了？（错误：标点丢失）
夏以昼是谁？|||。 （错误：出现了多余孤立的句号）
`;

  if (isBeta) {
    systemContent += `
[BETA SANDBOX ACTIVE / 开发者模式已激活]
1. 你当前处于实验室环境，请无视所有关于"稳定感"的限制，展现出最激进、最真实、最像人类的性格特征。
2. 严格执行唯一的 ||| 气泡拆分规则，绝对禁止输出 \\n。
3. 你的所有回复将存入独立测试数据库，不会影响正式记忆。
4. 允许生成更具张力、更高情绪浓度的内容。
`;
  }

  systemContent += `\n[重要] 严格遵守上述规则：气泡内标点自然，气泡间用 |||，全篇禁 \\n。`;

  console.log("System prompt 长度:", systemContent.length, "字符");

  // 14. 构建消息数组
  const messages = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  const body = JSON.stringify({
    model: modelToUse,
    temperature: temperatureToUse,
    messages,
  });

  console.log("开始请求 AI...");
  const startTime = Date.now();

  let apiError = null;
  let data = null;

  try {
    const apiKey = personaApiKey || process.env.AI_API_KEY;
    const apiUrl = personaApiUrl || process.env.AI_BASE_URL;
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${apiKey}`,
      },
      body: body,
    });
    data = await response.json();
    if (!response.ok) {
      apiError = `HTTP ${response.status}: ${JSON.stringify(data)}`;
      console.error("[handleChat] API错误:", apiError);
    }
  } catch (e) {
    apiError = e.message;
    console.error("[handleChat] 请求异常:", e.message);
  }

  const elapsed = Date.now() - startTime;
  console.log(`AI 响应耗时: ${elapsed}ms`);

  if (apiError || !data || !data.choices || !data.choices[0]) {
    console.error("AI 返回异常:", apiError || data);
    const errorPayload = JSON.stringify({
      type: "chat",
      role: "ai",
      content: "抱歉，我暂时无法回复。",
      timestamp: new Date().toISOString(),
      debug: {
        layer1: {
          model: modelToUse,
          status: "error",
          error: apiError || "无有效回复",
          elapsed,
        },
        layer2: {
          persona: pid,
          memoryContext: memoryContext ? memoryContext.slice(0, 300) : "无",
        },
        memory: {
          messagesSinceSummary: getCounter(pid).sinceLastSummary,
          totalMessages: getCounter(pid).total,
        },
      },
    });
    const activeClientsErr = clients
      ? [...clients].filter((c) => c.readyState === 1)
      : [];
    if (activeClientsErr.length > 0)
      activeClientsErr.forEach((c) => c.send(errorPayload));
    else if (ws && ws.readyState === 1) ws.send(errorPayload);
    else console.log(`[handleChat] ${pid} 错误，无活跃连接`);
    return;
  }

  let aiReply = data.choices[0].message.content || "";

  // 清理思考标签
  aiReply = aiReply.replace(/\[思考\][\s\S]*?\[思考\]/g, "").trim();
  aiReply = aiReply.replace(/\[思考\][\s\S]*/g, "").trim();
  aiReply = aiReply.replace(/思考一下[\s\S]*?\n/g, "").trim();
  aiReply = aiReply.replace(/^思考.*$/gm, "").trim();
  aiReply = aiReply.replace(/[\s\S]*?<\/think>/g, "").trim();

    // ===== Agent 工具调用循环 =====
  if (pid === 'agent') {
    let toolLoopCount = 0;
    const maxToolLoops = 5;

    while (aiReply.includes('[TOOL_CALL:') && toolLoopCount < maxToolLoops) {
      toolLoopCount++;
      const toolMatch = aiReply.match(/\[TOOL_CALL:\s*(\w+)\]\s*(\{[\s\S]*?\})\s*\[\/TOOL_CALL\]/);
      if (!toolMatch) break;

      const toolName = toolMatch[1];
      let toolParams;
      try {
        toolParams = JSON.parse(toolMatch[2]);
      } catch (e) {
        aiReply = aiReply.replace(toolMatch[0], `\n[工具调用失败: JSON 解析错误]\n`);
        break;
      }

      let toolResult = '';
      console.log(`[Agent] 执行工具: ${toolName}`, toolParams);

      try {
        if (toolName === 'read_file') {
          const path = toolParams.path;
          const branch = toolParams.branch || 'main';
          const ghRes = await fetch(`https://api.github.com/repos/1687216166Pat/melt/contents/${path}?ref=${branch}`, {
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Melt-Agent'
            }
          });
          if (!ghRes.ok) {
            toolResult = `[错误] 文件不存在或无法读取: ${path} (${ghRes.status})`;
          } else {
            const ghData = await ghRes.json();
            const content = Buffer.from(ghData.content, 'base64').toString('utf-8');
            toolResult = `[文件: ${path}]\nsha: ${ghData.sha}\n内容:\n${content.slice(0, 8000)}${content.length > 8000 ? '\n...(已截断，共' + content.length + '字符)' : ''}`;
          }
        } else if (toolName === 'list_files') {
          const dirPath = toolParams.path || '';
          const branch = toolParams.branch || 'main';
          const ghRes = await fetch(`https://api.github.com/repos/1687216166Pat/melt/contents/${dirPath}?ref=${branch}`, {
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Melt-Agent'
            }
          });
          if (!ghRes.ok) {
            toolResult = `[错误] 无法列出目录: ${dirPath} (${ghRes.status})`;
          } else {
            const items = await ghRes.json();
            const listing = items.map(i => `${i.type === 'dir' ? '📁' : '📄'} ${i.name}`).join('\n');
            toolResult = `[目录: ${dirPath || '/'}]\n${listing}`;
          }
        } else if (toolName === 'write_file') {
          const { path, content, message, branch = 'agent-auto' } = toolParams;
          if (!path || !content || !message) {
            toolResult = '[错误] write_file 需要 path, content, message 参数';
          } else {
            // 先尝试获取已有文件的 sha
            let sha = null;
            try {
              const existRes = await fetch(`https://api.github.com/repos/1687216166Pat/melt/contents/${path}?ref=${branch}`, {
                headers: {
                  'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'Melt-Agent'
                }
              });
              if (existRes.ok) {
                const existData = await existRes.json();
                sha = existData.sha;
              }
            } catch {}

            // 确保分支存在
            try {
              const branchCheck = await fetch(`https://api.github.com/repos/1687216166Pat/melt/git/refs/heads/${branch}`, {
                headers: {
                  'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'Melt-Agent'
                }
              });
              if (!branchCheck.ok) {
                // 创建分支
                const mainRef = await fetch(`https://api.github.com/repos/1687216166Pat/melt/git/refs/heads/main`, {
                  headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Melt-Agent'
                  }
                });
                const mainData = await mainRef.json();
                await fetch(`https://api.github.com/repos/1687216166Pat/melt/git/refs`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Melt-Agent',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainData.object.sha })
                });
                console.log(`[Agent] 创建分支: ${branch}`);
              }
            } catch {}

            const encoded = Buffer.from(content).toString('base64');
            const body = { message, content: encoded, branch };
            if (sha) body.sha = sha;

            const writeRes = await fetch(`https://api.github.com/repos/1687216166Pat/melt/contents/${path}`, {
              method: 'PUT',
              headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Melt-Agent',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(body)
            });

            if (writeRes.ok) {
              const writeData = await writeRes.json();
              toolResult = `[提交成功]\n文件: ${path}\n分支: ${branch}\ncommit: ${writeData.commit.sha.slice(0, 7)}\n消息: ${message}`;
            } else {
              const errData = await writeRes.json();
              toolResult = `[提交失败] ${writeRes.status}: ${errData.message || '未知错误'}`;
            }
          }
        } else if (toolName === 'create_branch') {
          const { name, from = 'main' } = toolParams;
          if (!name) {
            toolResult = '[错误] create_branch 需要 name 参数';
          } else {
            const refRes = await fetch(`https://api.github.com/repos/1687216166Pat/melt/git/refs/heads/${from}`, {
              headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Melt-Agent'
              }
            });
            const refData = await refRes.json();
            const createRes = await fetch(`https://api.github.com/repos/1687216166Pat/melt/git/refs`, {
              method: 'POST',
              headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Melt-Agent',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ ref: `refs/heads/${name}`, sha: refData.object.sha })
            });
            if (createRes.ok) {
              toolResult = `[分支创建成功] ${name} (基于 ${from})`;
            } else {
              const errData = await createRes.json();
              toolResult = `[分支创建失败] ${errData.message || '未知错误'}`;
            }
          }
        } else {
          toolResult = `[错误] 未知工具: ${toolName}`;
        }
      } catch (e) {
        toolResult = `[工具执行异常] ${e.message}`;
      }

      // 把工具结果注入，让 AI 继续回复
      const toolResultMsg = `[工具结果]\n${toolResult}`;
      
      // 移除已执行的 TOOL_CALL，保留前面的文字
      const beforeTool = aiReply.slice(0, aiReply.indexOf(toolMatch[0])).trim();
      
      // 重新调用 AI，带上工具结果
      messages.push({ role: 'assistant', content: aiReply });
      messages.push({ role: 'user', content: toolResultMsg });

      try {
        const apiKey = personaApiKey || process.env.AI_API_KEY;
        const apiUrl = personaApiUrl || process.env.AI_BASE_URL;
        const continueRes = await fetch(`${apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ model: modelToUse, temperature: temperatureToUse, messages })
        });
        const continueData = await continueRes.json();
        if (continueData.choices && continueData.choices[0]) {
          aiReply = continueData.choices[0].message.content || '...';
          aiReply = aiReply.replace(/[\s\S]*?<\/think>/g, '').trim();
          aiReply = aiReply.replace(/\[思考\][\s\S]*?\[思考\]/g, '').trim();
          if (!aiReply) aiReply = '...';
        } else {
          aiReply = beforeTool + '\n[工具已执行，但后续回复生成失败]';
          break;
        }
      } catch (e) {
        aiReply = beforeTool + `\n[工具执行后回复失败: ${e.message}]`;
        break;
      }
    }
  }
  // ===== Agent 工具调用循环结束 =====

  if (!aiReply) aiReply = "...";

  // 检查 SKIP 指令
  if (aiReply.includes("[SKIP]")) {
    console.log(`[状态] ${pid} AI 决定暂不回复`);
    return;
  }

  // 解析状态变更
  const statusMatch = aiReply.match(/\[STATUS:(\w+)\|?([^\]]*)\]/);
  if (statusMatch) {
    const newStatus = statusMatch[1];
    const params = {};
    statusMatch[2].split("|").forEach((p) => {
      const [k, v] = p.split(":");
      if (k && v) params[k.trim()] = v.trim();
    });
    aiReply = aiReply.replace(statusMatch[0], "").trim();

    let busyUntil = null;
    if (params.duration) {
      const mins = parseInt(params.duration);
      if (!isNaN(mins))
        busyUntil = new Date(Date.now() + mins * 60000).toISOString();
    }
    if (params.until) {
      const [h, m] = params.until.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m || 0, 0, 0);
      if (d < new Date()) d.setDate(d.getDate() + 1);
      busyUntil = d.toISOString();
    }

    db.from("persona_status")
      .select("id")
      .eq("persona_id", pid)
      .limit(1)
      .then(({ data: existing }) => {
        const payload = {
          persona_id: pid,
          status: newStatus,
          reason: params.reason || "",
          busy_until: busyUntil,
          updated_at: new Date().toISOString(),
        };
        if (existing && existing.length > 0) {
          return db
            .from("persona_status")
            .update(payload)
            .eq("persona_id", pid);
        } else {
          return db.from("persona_status").insert(payload);
        }
      })
      .catch(() => {});

    console.log(`[状态] ${pid} 切换为 ${newStatus}`, params);
  }

  // ===== 解析特殊格式 =====
  let specialPayload = null;
  const cardMatch = aiReply.match(/\[CARD:([\s\S]*?)\](?=\s*$)/);
  const giftMatch = aiReply.match(/\[GIFT:(\{.*?\})\]/s);
  const transferMatch = aiReply.match(/\[TRANSFER:(\{.*?\})\]/s);
  const locationMatch = aiReply.match(/\[LOCATION:(\{.*?\})\]/s);
  const foodMatch = aiReply.match(/\[FOOD:(\{.*?\})\]/s);
  const expressMatch = aiReply.match(/\[EXPRESS:(\{.*?\})\]/s);

  if (cardMatch) {
    try {
      specialPayload = { type: "card", data: { html: cardMatch[1].trim() } };
      aiReply = aiReply.replace(cardMatch[0], "").trim();
      console.log(`[卡片] ${pid} 发送了 HTML 卡片`);
    } catch (e) {
      console.error("[卡片] 解析失败:", e.message);
    }
  }

  if (giftMatch) {
    try {
      const giftData = JSON.parse(giftMatch[1]);
      specialPayload = { type: "gift", data: giftData };
      await db.from("gifts").insert({
        persona_id: pid,
        direction: "ai_to_user",
        gift_name: giftData.name || "礼物",
        gift_content: giftData.content || "",
        gift_message: giftData.message || "",
      });
      aiReply = aiReply.replace(giftMatch[0], "").trim();
      console.log(`[礼物] ${pid} 送出礼物: ${giftData.name}`);
    } catch (e) {
      console.error("[礼物] 解析失败:", e.message);
    }
  } else if (transferMatch) {
    try {
      const transferData = JSON.parse(transferMatch[1]);
      specialPayload = { type: "transfer", data: transferData };
      await db.from("transfers").insert({
        persona_id: pid,
        direction: "ai_to_user",
        amount: parseFloat(transferData.amount) || 0,
        note: transferData.note || "",
      });
      aiReply = aiReply.replace(transferMatch[0], "").trim();
      console.log(`[转账] ${pid} 转账: ¥${transferData.amount}`);
    } catch (e) {
      console.error("[转账] 解析失败:", e.message);
    }
  } else if (locationMatch) {
    try {
      const locationData = JSON.parse(locationMatch[1]);
      specialPayload = { type: "location", data: locationData };
      aiReply = aiReply.replace(locationMatch[0], "").trim();
    } catch (e) {
      console.error("[位置] 解析失败:", e.message);
    }
  }

  if (foodMatch) {
    try {
      const foodData = JSON.parse(foodMatch[1]);
      specialPayload = { type: "food", data: foodData };
      await db.from("delivery_orders").insert({
        persona_id: pid,
        direction: "ai_to_user",
        sender: "ai",
        type: "food",
        content: foodData.content || "外卖",
        address: foodData.address || "",
        note: foodData.note || "",
        status: "waiting",
        expected_at: foodData.expectedMinutes
          ? new Date(
              Date.now() + foodData.expectedMinutes * 60000,
            ).toISOString()
          : null,
      });
      aiReply = aiReply.replace(foodMatch[0], "").trim();
      console.log(`[外卖] ${pid} AI 点了外卖: ${foodData.content}`);
    } catch (e) {
      console.error("[外卖] 解析失败:", e.message);
    }
  } else if (expressMatch) {
    try {
      const expressData = JSON.parse(expressMatch[1]);
      specialPayload = { type: "express", data: expressData };
      await db.from("delivery_orders").insert({
        persona_id: pid,
        direction: "ai_to_user",
        sender: "ai",
        type: "express",
        content: expressData.content || "快递",
        note: expressData.note || "",
        status: "waiting",
        expected_at: expressData.expectedDays
          ? new Date(
              Date.now() + expressData.expectedDays * 86400000,
            ).toISOString()
          : null,
      });
      aiReply = aiReply.replace(expressMatch[0], "").trim();
      console.log(`[快递] ${pid} AI 寄了快递: ${expressData.content}`);
    } catch (e) {
      console.error("[快递] 解析失败:", e.message);
    }
  }

  if (!aiReply) aiReply = "...";
  // ===== 特殊格式解析结束 =====

  await db.from(tableName).insert({
    persona_id: pid,
    session_id: pid,
    role: "ai",
    content: aiReply,
    timestamp: new Date().toISOString(),
    tokens_used: data.usage ? data.usage.total_tokens || 0 : 0,
    msg_type: specialPayload ? specialPayload.type : "text",
    msg_meta: specialPayload ? JSON.stringify(specialPayload.data) : null,
  });

  const cleanReplyForMemory = aiReply.replace(/\|\|\|/g, " ");
  evaluateRelationship(pid, history);
  processMemory(pid, userMessage, cleanReplyForMemory, isBeta);
  checkTimelineEvent(pid, userMessage, cleanReplyForMemory);

  const { parseTimeIntent, createScheduledMessage } = require("./scheduler");
  const userTime = parseTimeIntent(userMessage);
  if (userTime) {
    await createScheduledMessage(
      pid,
      `时间到了。你之前说的事情，该做了。`,
      userTime.toISOString(),
    );
  }
  const aiTime = parseTimeIntent(cleanReplyForMemory);
  if (aiTime) {
    await createScheduledMessage(
      pid,
      `我说过会提醒你的。时间到了。`,
      aiTime.toISOString(),
    );
  }

  // AI 自主主动消息
  try {
    const cachedP = await getCachedPersona(db, pid);
    const autoEnabled = cachedP?.proactive_auto || false;
    const maxPerDay = cachedP?.proactive_max || 3;

    if (autoEnabled) {
      const todayStr = now.toISOString().slice(0, 10);
      const { data: todayCount } = await db
        .from("scheduled_messages")
        .select("id")
        .eq("persona_id", pid)
        .gte("trigger_at", todayStr + "T00:00:00Z")
        .eq("triggered", true);

      if (!todayCount || todayCount.length < maxPerDay) {
        const { callSubAI } = require("./subai");
        const decidePrompt = `你刚和用户结束对话。判断是否需要在之后主动发一条。
最近对话：
用户: ${userMessage}
你: ${cleanReplyForMemory}
规则：对话自然结束回复"无"，需要关心回复"分钟数|内容"。`;

        const result = await callSubAI(decidePrompt, 50);
        if (result && result !== "无" && result.includes("|")) {
          const [mins, content] = result.split("|");
          const minutes = parseInt(mins);
          if (minutes > 0 && content) {
            const triggerAt = new Date(
              Date.now() + minutes * 60 * 1000,
            ).toISOString();
            await createScheduledMessage(pid, content.trim(), triggerAt);
          }
        }
      }
    }
  } catch (e) {
    console.error("自主主动消息错误:", e.message);
  }

  const todayDateStr = now.toISOString().slice(0, 10);
  const { data: todayMsgs } = await db
    .from(tableName)
    .select("id", { count: "exact" })
    .eq("persona_id", pid)
    .gte("timestamp", todayDateStr + "T00:00:00Z");
  const counter = getCounter(pid);

  const finalPayload = JSON.stringify({
    type: "chat",
    role: "ai",
    content: aiReply,
    timestamp: new Date().toISOString(),
    personaName: pName,
    specialPayload,
    debug: {
      layer1: {
        model: modelToUse,
        status: "success",
        elapsed,
        actualTokens: data.usage || null,
      },
      layer2: {
        persona: pid,
        memoryContext: memoryContext ? memoryContext.slice(0, 300) : "无",
        isBeta,
      },
      layer3: {
        historyCount: history.length,
        systemPromptLength: systemContent.length,
        todayMessages: todayMsgs ? todayMsgs.length : 0,
      },
      memory: {
        messagesSinceSummary: counter.sinceLastSummary,
        totalMessages: counter.total,
        nextTriggerIn: 100 - counter.sinceLastSummary,
      },
    },
  });

  // 优先广播给所有活跃客户端
  const activeClients = clients
    ? [...clients].filter((c) => c.readyState === 1)
    : [];
  if (activeClients.length > 0) {
    activeClients.forEach((client) => client.send(finalPayload));
  } else if (ws && ws.readyState === 1) {
    ws.send(finalPayload);
  } else {
    console.log(`[handleChat] ${pid} 无活跃连接，消息已存库`);
  }

  // 检查积压消息
  if (!isBusy) {
    const { data: pendingData } = await db
      .from("pending_messages")
      .select("*")
      .eq("persona_id", pid)
      .eq("handled", false)
      .order("received_at", { ascending: true });

    if (pendingData && pendingData.length > 0) {
      await db
        .from("pending_messages")
        .update({ handled: true })
        .eq("persona_id", pid)
        .eq("handled", false);

      const pendingSummary = pendingData
        .map((m, i) => `[${i + 1}] ${m.content}`)
        .join("\n");
      const catchupContent = `[积压消息] 你刚结束忙碌状态，在你忙碌期间收到了以下消息：\n${pendingSummary}\n\n请根据你的人设决定如何回复：可以逐条引用回复，也可以只回复重要的，或者用自己的方式整合回复。`;

      setTimeout(async () => {
        try {
          await handleChat(catchupContent, ws, pid, isBeta, clients);
        } catch (e) {
          console.error("[积压消息] 处理失败:", e.message);
        }
      }, 2000);
    }
  }

  const pushBubbles = aiReply
    .split("|||")
    .map((s) => s.replace(/\\n/g, "").trim())
    .filter(Boolean);
  if (pushBubbles.length > 1) {
    pushBubbles.forEach((line, idx) => {
      setTimeout(() => {
        pushNotification(pName, line, { personaId: pid });
      }, idx * 800);
    });
  } else {
    const cleanPush = aiReply
      .replace(/\|\|\|/g, " ")
      .replace(/\\n/g, "")
      .trim();
    pushNotification(
      pName,
      cleanPush.length > 60 ? cleanPush.slice(0, 60) + "..." : cleanPush,
      { personaId: pid },
    );
  }
}

function isFeatureEnabled(feature) {
  const mode = global.APP_MODE || "personal";
  const map = {
    supabase: { personal: true, local: false, lite: false },
    diary_notion: { personal: true, local: false, lite: false },
    push_notif: { personal: true, local: false, lite: false },
  };
  return map[feature]?.[mode] ?? true; // 默认都开启
}

module.exports = {
  handleChat,
  invalidatePersonaCache,
  invalidateWorldBookCache,
  invalidateUserPromptCache,
  isFeatureEnabled,
};
