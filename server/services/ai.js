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
const PERSONA_TTL = 10 * 60 * 1000; // 人设缓存10分钟
const WORLDBOOK_TTL = 5 * 60 * 1000; // 世界书缓存5分钟
const PROMPT_TTL = 5 * 60 * 1000; // 用户偏好缓存5分钟

// 人设数据变更时调用，清除对应缓存
function invalidatePersonaCache(pid) {
  personaCache.delete(pid);
  console.log(`[缓存] 清除人设缓存: ${pid}`);
}

// 世界书变更时调用，清除缓存
function invalidateWorldBookCache() {
  worldBookCache.clear();
  console.log(`[缓存] 清除世界书缓存`);
}

// 用户偏好变更时调用
function invalidateUserPromptCache() {
  userPromptCache.value = null;
  userPromptCache.time = 0;
}

async function getCachedPersona(db, pid) {
  const cached = personaCache.get(pid);
  if (cached && Date.now() - cached.time < PERSONA_TTL) {
    return cached.data;
  }
  const { data } = await db
    .from("custom_personas")
    .select(
      "name, note, avatar, avatar_url, content, min_messages, max_messages, custom_model, temperature, custom_api_key, custom_api_url, proactive_auto, proactive_max, show_debug, chat_theme, emoji_enabled",
    )
    .eq("id", pid)
    .limit(1);
  const result = data && data.length > 0 ? data[0] : null;
  if (result) personaCache.set(pid, { data: result, time: Date.now() });
  return result;
}

async function getCachedWorldBooks(db) {
  const cached = worldBookCache.get("all");
  if (cached && Date.now() - cached.time < WORLDBOOK_TTL) {
    return cached.data;
  }
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
    "哈哈",
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

async function handleChat(userMessage, ws, personaId, isBeta, clients) {
  const db = getDB();
  const pid = personaId || "xiaorou";
  const nowISO = new Date().toISOString();
  const tableName = isBeta ? "messages_beta" : "messages";

  // 1. 防重
  if (!isBeta) {
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

  // 2. 获取人设（走缓存，减少数据库查询）
  let pName = "AI 助手";
  let personaContent = "";
  let minMsg = 1,
    maxMsg = 3;
  let personaModel = null,
    personaTemperature = null;
  let personaApiKey = null,
    personaApiUrl = null;

  const personaNames = { xiaorou: "小柔", cool: "阿冷", assistant: "助手" };

  if (personaPrompts[pid]) {
    // 内置人格直接用
    personaContent = personaPrompts[pid].content;
    pName = personaPrompts[pid].name || pid;
  } else {
    // 自定义人格走缓存
    const cachedP = await getCachedPersona(db, pid);
    if (cachedP) {
      pName = cachedP.note || cachedP.name || "AI 助手";
      personaContent = cachedP.content || "";
      if (cachedP.min_messages) minMsg = cachedP.min_messages;
      if (cachedP.max_messages) maxMsg = cachedP.max_messages;
      if (cachedP.custom_model) personaModel = cachedP.custom_model;
      if (cachedP.temperature !== null && cachedP.temperature !== undefined) {
        personaTemperature = cachedP.temperature;
      }
      if (cachedP.custom_api_key) personaApiKey = cachedP.custom_api_key;
      if (cachedP.custom_api_url) personaApiUrl = cachedP.custom_api_url;
    } else {
      // fallback：查 user_profile
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
        if (config.temperature !== null && config.temperature !== undefined) {
          personaTemperature = config.temperature;
        }
      } else {
        pName = personaNames[pid] || "AI 助手";
      }
    }
  }

  // 3. 存入用户消息
  await db.from(tableName).insert({
    persona_id: pid,
    session_id: pid,
    role: "user",
    content: userMessage,
    timestamp: nowISO,
  });

  // 异步更新情绪状态
  if (!isBeta) {
    updateEmotionOnMessage(pid, userMessage).catch(() => {});
  }

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

  // 5. 异步任务（不阻塞主流程）
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

  // 计算距离上次对话的时间差
  let timeSinceLastMsg = "";
  if (history.length > 0) {
    const lastTimestamp = history[history.length - 1].timestamp;
    if (lastTimestamp) {
      const lastTime = new Date(lastTimestamp);
      const now = new Date();
      const diffMins = Math.floor((now - lastTime) / (1000 * 60));
      if (diffMins >= 5 && diffMins < 60) {
        timeSinceLastMsg = `[时间间隔] 距离上一条消息已经过去了${diffMins}分钟。`;
      } else if (diffMins >= 60 && diffMins < 1440) {
        timeSinceLastMsg = `[时间间隔] 距离上一条消息已经过去了${Math.floor(diffMins / 60)}小时${diffMins % 60}分钟。`;
      } else if (diffMins >= 1440) {
        timeSinceLastMsg = `[时间间隔] 距离上一条消息已经过去了${Math.floor(diffMins / 1440)}天。`;
      }
    }
  }

  // 8. 构建 prompt
  const timeContext = getTimeContext();
  const msgCount = history.length;
  const needFullPersona = isBeta || msgCount === 0 || msgCount % 20 === 0;

  let personaToUse = needFullPersona
    ? personaContent
    : personaContent.slice(0, 800) +
      (personaContent.length > 800
        ? "\n[注：完整人设已在之前加载，请维持原有人格与态度表现]"
        : "");

  // 用户偏好走缓存
  const userPromptContent = await getCachedUserPrompt();
  const userPromptStr = userPromptContent
    ? `\n[用户偏好]\n${userPromptContent}`
    : "";

  const fullPrompt = corePrompt + personaToUse + userPromptStr;

  // 最终使用的模型和温度
  const modelToUse = personaModel || process.env.AI_MODEL;
  const temperatureToUse =
    personaTemperature !== null && personaTemperature !== undefined
      ? personaTemperature
      : parseFloat(process.env.AI_TEMPERATURE) || 0.7;

  // 9. 默认世界书
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
- 位置：告知自己在哪、约见面时

规则：
- 不要频繁使用，要在真正合适的时机
- 格式必须严格遵守，不要随意修改
- 一次回复最多一个特殊格式
- 正常对话内容照常输出，特殊格式放在最后
`;

  // 10. 记忆与关系召回
  const memoryContext = await buildMemoryContextAsync(pid, userMessage, isBeta);
  const relationshipContext = await buildRelationshipContext(pid);

  // 11. 手机状态感知
  const { getLatestStatus } = require("./phone");
  const phoneStatus = await getLatestStatus();
  let phoneContext = "";
  if (phoneStatus && phoneStatus.length > 0) {
    const statusLines = [];
    for (const s of phoneStatus.slice(0, 5)) {
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
      } catch {}
    }
    if (statusLines.length > 0) {
      phoneContext = `[手机状态]\n${statusLines.join("\n")}\n你可以根据这些信息自然地关心用户，但不要每次都提起。\n`;
    }
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
  // 情绪状态注入
  const emotionPrompt = isBeta ? "" : await buildEmotionPrompt(pid);
  if (emotionPrompt) systemContent += emotionPrompt + "\n";
  if (memoryContext) systemContent += memoryContext + "\n";
  if (relationshipContext) systemContent += relationshipContext + "\n";
  if (phoneContext) systemContent += phoneContext + "\n";
  if (worldBookBeforeUser) systemContent += worldBookBeforeUser + "\n";
  if (worldBookTail) systemContent += worldBookTail + "\n";
  if (timeSinceLastMsg) systemContent += timeSinceLastMsg + "\n";

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

  console.log("System prompt 长度:", systemContent.length, "字符");
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
    if (clients) {
      clients.forEach((client) => {
        if (client.readyState === 1) client.send(errorPayload);
      });
    } else {
      ws.send(errorPayload);
    }
    return;
  }

  let aiReply = data.choices[0].message.content || "";
  aiReply = aiReply.replace(/\[思考\][\s\S]*?\[思考\]/g, "").trim();
  aiReply = aiReply.replace(/\[思考\][\s\S]*/g, "").trim();
  aiReply = aiReply.replace(/思考一下[\s\S]*?\n/g, "").trim();
  aiReply = aiReply.replace(/^思考.*$/gm, "").trim();
  aiReply = aiReply.replace(/[\s\S]*?<\/think>/g, "").trim();
  if (!aiReply) aiReply = "...";

  // ===== 解析特殊格式 =====
  let specialPayload = null;

  const giftMatch = aiReply.match(/\[GIFT:(\{.*?\})\]/s);
  const transferMatch = aiReply.match(/\[TRANSFER:(\{.*?\})\]/s);
  const locationMatch = aiReply.match(/\[LOCATION:(\{.*?\})\]/s);

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

  if (!aiReply) aiReply = "...";
  // ===== 特殊格式解析结束 =====

  await db.from(tableName).insert({
    persona_id: pid,
    session_id: pid,
    role: "ai",
    content: aiReply,
    timestamp: new Date().toISOString(),
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
      const todayStr = new Date().toISOString().slice(0, 10);
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

  const todayDateStr = new Date().toISOString().slice(0, 10);
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

  if (clients) {
    clients.forEach((client) => {
      if (client.readyState === 1) client.send(finalPayload);
    });
  } else {
    ws.send(finalPayload);
  }

  const pushBubbles = aiReply
    .split("|||")
    .map((s) => s.replace(/\\n/g, "").trim())
    .filter(Boolean);
  if (pushBubbles.length > 1) {
    pushBubbles.forEach((line, idx) => {
      setTimeout(() => {
        pushNotification(pName, line);
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
    );
  }
}

module.exports = {
  handleChat,
  invalidatePersonaCache,
  invalidateWorldBookCache,
  invalidateUserPromptCache,
};
