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
} = require("./memory");

const {
  updateDimensionsFromChat,
  buildRelationshipContext,
  evaluateRelationship,
} = require("./relationship");

const { checkTimelineEvent } = require("./timeline");

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

async function handleChat(userMessage, ws, personaId) {
  const db = getDB();
  const pid = personaId || "xiaorou";

  // 获取推送用的名字（备注优先）
  let pName = "AI 助手";
  try {
    const { data: pDetail } = await db
      .from("custom_personas")
      .select("name, note")
      .eq("id", pid)
      .limit(1);
    if (pDetail && pDetail.length > 0) {
      pName = pDetail[0].note || pDetail[0].name || "AI 助手";
    } else {
      // 内置人格
      const { data: configRow } = await db
        .from("user_profile")
        .select("value")
        .eq("key", `persona_config_${pid}`)
        .limit(1);
      if (configRow && configRow.length > 0) {
        const config = JSON.parse(configRow[0].value);
        pName = config.note || config.name || personaNames[pid] || "AI 助手";
      } else {
        pName = personaNames[pid] || "AI 助手";
      }
    }
  } catch {}

  const nowISO = new Date().toISOString();

  // 存用户消息
  await db.from("messages").insert({
    persona_id: pid,
    role: "user",
    content: userMessage,
    timestamp: nowISO,
  });

  // 检测行为模式
  detectPatterns(pid, userMessage);
  updateDimensionsFromChat(pid, userMessage);

  // 获取历史
  const history = await getSessionMemory(pid, 10);

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

  // 构建 prompt
  const timeContext = getTimeContext();

  // 动态获取当前人格的 prompt
  let personaContent = "";
  if (personaPrompts[pid]) {
    personaContent = personaPrompts[pid].content;
  } else {
    // 自定义人格从数据库获取
    const db2 = getDB();
    const { data: customP } = await db2
      .from("custom_personas")
      .select("content")
      .eq("id", pid)
      .limit(1);
    if (customP && customP.length > 0) {
      personaContent = customP[0].content;
    }
  }

  // 获取用户偏好
  const userPromptContent = await getUserPrompt();
  const userPromptStr = userPromptContent
    ? `\n[用户偏好]\n${userPromptContent}`
    : "";

  const fullPrompt = corePrompt + personaContent + userPromptStr;

  // 获取分句设置
  let minMsg = 1,
    maxMsg = 3;
  try {
    const { data: pDetail } = await db
      .from("custom_personas")
      .select("min_messages, max_messages")
      .eq("id", pid)
      .limit(1);
    if (pDetail && pDetail.length > 0) {
      if (pDetail[0].min_messages) minMsg = pDetail[0].min_messages;
      if (pDetail[0].max_messages) maxMsg = pDetail[0].max_messages;
    } else {
      const { data: configRow } = await db
        .from("user_profile")
        .select("value")
        .eq("key", `persona_config_${pid}`)
        .limit(1);
      if (configRow && configRow.length > 0) {
        const config = JSON.parse(configRow[0].value);
        if (config.minMessages) minMsg = config.minMessages;
        if (config.maxMessages) maxMsg = config.maxMessages;
      }
    }
  } catch {}

  // 默认世界书（角色扮演核心协议）
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

  const memoryContext = await buildMemoryContextAsync(pid, userMessage);
  const relationshipContext = await buildRelationshipContext(pid);

  // 获取最新手机状态
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
        if (s.status_type === "sleep" && s.status_data === "入睡") {
          statusLines.push(`用户${time}入睡`);
        } else if (s.status_type === "sleep" && s.status_data === "醒来") {
          statusLines.push(`用户${time}醒来`);
        } else if (s.status_type === "battery") {
          statusLines.push(`用户手机电量低`);
        } else if (s.status_type === "app") {
          statusLines.push(`用户${time}${s.status_data}`);
        } else if (s.status_type === "daily_first") {
          statusLines.push(`用户${time}开始使用手机`);
        }
      } catch {}
    }
    if (statusLines.length > 0) {
      phoneContext = `[手机状态]\n${statusLines.join("\n")}\n你可以根据这些信息自然地关心用户，但不要每次都提起。\n`;
    }
  }

  // 加载世界书
  let worldBookBefore = "";
  let worldBookAfter = "";
  let worldBookBeforeUser = "";
  let worldBookTail = "";
  let worldBookOverride = "";

  try {
    const { data: books } = await db.from("world_books").select("*");
    if (books) {
      books.forEach((book) => {
        // 检查绑定
        const isGlobal = book.bind_type === "global" || !book.bind_type;
        const isBound = book.bind_personas && book.bind_personas.includes(pid);
        if (!isGlobal && !isBound) return;

        // 检查关键词触发
        if (book.keyword_enabled && book.keywords) {
          const kws = book.keywords.split(",").map((k) => k.trim());
          const hasKeyword = kws.some((kw) => userMessage.includes(kw));
          if (!hasKeyword) return;
        }

        // 按位置分类
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
    }
  } catch {}

  let systemContent = "";
  if (worldBookOverride) systemContent += worldBookOverride + "\n";
  if (worldBookBefore) systemContent += worldBookBefore + "\n";
  systemContent += fullPrompt + "\n";
  if (worldBookAfter) systemContent += worldBookAfter + "\n";
  systemContent += defaultWorldBook + "\n";
  systemContent += timeContext + "\n";
  systemContent += memoryContext + "\n";
  systemContent += relationshipContext + "\n";
  systemContent += phoneContext + "\n";
  if (worldBookBeforeUser) systemContent += worldBookBeforeUser + "\n";
  if (worldBookTail) systemContent += worldBookTail + "\n";
  systemContent += timeSinceLastMsg ? `\n${timeSinceLastMsg}` : "";
  if (timeSinceLastMsg) systemContent += "\n" + timeSinceLastMsg;
  systemContent += `\n[重要] 严格遵守上述所有规则。`;

  const messages = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  const body = JSON.stringify({
    model: process.env.AI_MODEL,
    messages,
  });

  const totalChars =
    systemContent.length +
    history.reduce((sum, m) => sum + m.content.length, 0) +
    userMessage.length;
  const estimatedTokens = Math.round(totalChars * 1.5);

  console.log("System prompt 长度:", systemContent.length, "字符");
  console.log("开始请求 AI...");
  const startTime = Date.now();

  let apiError = null;
  let data = null;

  try {
    const response = await fetch(
      `${process.env.AI_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: body,
      },
    );

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
          model: process.env.AI_MODEL,
          status: "error",
          error: apiError || "无有效回复",
          estimatedTokens,
          actualTokens: null,
          elapsed,
        },
        layer2: {
          persona: pid,
          memoryContext: memoryContext ? memoryContext.slice(0, 300) : "无",
          memoryLength: memoryContext ? memoryContext.length : 0,
        },
        layer3: {
          historyCount: history.length,
          systemPromptLength: systemContent.length,
          timeContext: timeContext.trim(),
        },
        memory: {
          messagesSinceSummary: getCounter(pid).sinceLastSummary,
          totalMessages: getCounter(pid).total,
          nextTriggerIn: 100 - getCounter(pid).sinceLastSummary,
          longTermProfile: "未知",
          recentMemories: "未知",
        },
      },
    });

    ws.send(errorPayload);

    return;
  }

  let aiReply = data.choices[0].message.content || "";
  // 过滤思维链
  aiReply = aiReply.replace(/思考一下[\s\S]*?\n/g, "").trim();
  aiReply = aiReply.replace(/^思考.*$/gm, "").trim();
  aiReply = aiReply.replace(/[\s\S]*?<\/think>/g, "").trim();

  // 如果过滤后为空，用原始内容
  if (!aiReply) {
    aiReply = data.choices[0].message.content || "...";
  }

  // 存 AI 回复
  await db.from("messages").insert({
    persona_id: pid,
    role: "ai",
    content: aiReply,
    timestamp: new Date().toISOString(),
  });

  // 检测定时提醒意图
  const { parseTimeIntent, createScheduledMessage } = require("./scheduler");

  // 检查用户消息里的时间
  const userTime = parseTimeIntent(userMessage);
  if (userTime) {
    // 用户说了时间，让 AI 到时候提醒
    const reminderContent = `时间到了哦。你之前说的事情，该做了。`;
    await createScheduledMessage(pid, reminderContent, userTime.toISOString());
  }

  // 检查 AI 回复里的时间承诺
  const aiTime = parseTimeIntent(aiReply);
  if (aiTime) {
    const reminderContent = `我说过到时候会提醒你的。时间到了。`;
    await createScheduledMessage(pid, reminderContent, aiTime.toISOString());
  }

  // 触发关系评估
  evaluateRelationship(pid, history);

  // 记忆处理（双触发机制）
  processMemory(pid, userMessage, aiReply);

  // 时间线检测
  checkTimelineEvent(pid, userMessage, aiReply);

  // AI 自主决定主动消息
  try {
    const { data: pConfig } = await db
      .from("custom_personas")
      .select("proactive_auto, proactive_max")
      .eq("id", pid)
      .limit(1);

    let autoEnabled = false;
    let maxPerDay = 3;

    if (pConfig && pConfig.length > 0) {
      autoEnabled = pConfig[0].proactive_auto;
      maxPerDay = pConfig[0].proactive_max || 3;
    } else {
      const { data: configRow } = await db
        .from("user_profile")
        .select("value")
        .eq("key", `persona_config_${pid}`)
        .limit(1);
      if (configRow && configRow.length > 0) {
        const config = JSON.parse(configRow[0].value);
        autoEnabled = config.proactiveAuto;
        maxPerDay = config.proactiveMax || 3;
      }
    }

    if (autoEnabled) {
      // 检查今天已发送次数
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayCount } = await db
        .from("scheduled_messages")
        .select("id")
        .eq("persona_id", pid)
        .gte("trigger_at", today + "T00:00:00Z")
        .eq("triggered", true);

      if (!todayCount || todayCount.length < maxPerDay) {
        // 让 AI 决定是否需要主动消息
        const decidePrompt = `你刚刚和用户结束了一段对话。根据对话氛围，判断你是否需要在之后主动发一条消息。

最近对话：
用户: ${userMessage}
你: ${aiReply}

现在时间: ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" })}

规则：
- 如果对话自然结束了，不需要主动消息，回复"无"
- 如果你觉得过一会儿应该关心一下用户，回复格式：时间|内容
- 时间用分钟数表示（例如：30 表示30分钟后）
- 内容是你到时候想说的话，简短自然
- 不要每次都发，只在真的有必要时才发

示例回复：
无
或
60|睡了吗
或
30|刚才说的那个事，想到一个办法`;

        const decideRes = await fetch(
          `${process.env.AI_BASE_URL}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              Authorization: `Bearer ${process.env.AI_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.AI_MEMORY_MODEL || process.env.AI_MODEL,
              messages: [{ role: "user", content: decidePrompt }],
              max_tokens: 50,
              temperature: 0.5,
            }),
          },
        );

        const decideData = await decideRes.json();
        if (decideData.choices && decideData.choices[0]) {
          const result = decideData.choices[0].message.content.trim();
          if (result !== "无" && result.includes("|")) {
            const [mins, content] = result.split("|");
            const minutes = parseInt(mins);
            if (minutes > 0 && content) {
              const triggerAt = new Date(
                Date.now() + minutes * 60 * 1000,
              ).toISOString();
              const { createScheduledMessage } = require("./scheduler");
              await createScheduledMessage(pid, content.trim(), triggerAt);
              console.log(
                `[主动] ${pid} 将在 ${minutes} 分钟后发: ${content.trim()}`,
              );
            }
          }
        }
      }
    }
  } catch (e) {
    // 静默失败，不影响正常回复
  }

  // 获取今日消息数
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayMsgs } = await db
    .from("messages")
    .select("id", { count: "exact" })
    .eq("persona_id", pid)
    .gte("timestamp", today + "T00:00:00Z");

  // 获取行为模式
  const { data: patterns } = await db
    .from("memory_patterns")
    .select("pattern_type, frequency")
    .eq("persona_id", pid)
    .gte("frequency", 2)
    .order("frequency", { ascending: false })
    .limit(3);

  // 获取记忆计数器
  const counter = getCounter(pid);
  console.log("[handleChat] 发送回复:", aiReply.slice(0, 50));

  const payload = JSON.stringify({
    type: "chat",
    role: "ai",
    content: aiReply,
    timestamp: new Date().toISOString(),
    personaName: pName,
    debug: {
      layer1: {
        model: process.env.AI_MODEL,
        status: "success",
        error: null,
        estimatedTokens,
        actualTokens: data.usage || null,
        elapsed,
      },
      layer2: {
        persona: pid,
        memoryContext: memoryContext ? memoryContext.slice(0, 300) : "无",
        memoryLength: memoryContext ? memoryContext.length : 0,
      },
      layer3: {
        historyCount: history.length,
        systemPromptLength: systemContent.length,
        timeContext: timeContext.trim(),
      },
      memory: {
        messagesSinceSummary: counter.sinceLastSummary,
        totalMessages: counter.total,
        nextTriggerIn: 100 - counter.sinceLastSummary,
        longTermProfile: memoryContext.includes("[长期印象]") ? "有" : "无",
        recentMemories: memoryContext.includes("[近期印象]") ? "有" : "无",
      },
    },
  });

  ws.send(payload);

  // 按空行分条推送
  const pushParts = aiReply
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\n/g, "").trim())
    .filter(Boolean);
  if (pushParts.length <= 1) {
    const preview = aiReply.replace(/\n/g, "");
    pushNotification(
      pName,
      preview.length > 60 ? preview.slice(0, 60) + "..." : preview,
    );
  } else {
    pushParts.forEach((part, idx) => {
      setTimeout(() => {
        pushNotification(pName, part);
      }, idx * 800);
    });
  }
}

module.exports = { handleChat };
