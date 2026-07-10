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
  const { autoExtractSamples } = require("./sampler");

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

  // 2. 获取名字
  let pName = "AI 助手";
  const personaNames = { xiaorou: "小柔", cool: "阿冷", assistant: "助手" };
  try {
    const { data: pDetail } = await db
      .from("custom_personas")
      .select("name, note")
      .eq("id", pid)
      .limit(1);
    if (pDetail && pDetail.length > 0) {
      pName = pDetail[0].note || pDetail[0].name || "AI 助手";
    } else {
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

  // 3. 存入用户消息
  await db.from(tableName).insert({
    persona_id: pid,
    role: "user",
    content: userMessage,
    timestamp: nowISO,
  });

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

  // 5. 异步压缩 + 欲望系统 pulse（不阻塞主流程）
  if (!isBeta) {
    const { getMemoryConfig } = require("./memory");
    getMemoryConfig().then((cfg) => {
      if (cfg.compressThreshold > 0) {
        //compressOldMessages(pid, false).catch(() => {});
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

  // 1. 构建时间感知上下文
  const timeContext = getTimeContext();

  // 2. 动态获取当前人格的 prompt
  let personaContent = "";
  if (personaPrompts[pid]) {
    personaContent = personaPrompts[pid].content;
  } else {
    // 自定义人格从数据库获取
    const { data: customP } = await db
      .from("custom_personas")
      .select("content")
      .eq("id", pid)
      .limit(1);
    if (customP && customP.length > 0) {
      personaContent = customP[0].content;
    }
  }

  // 3. 获取用户偏好
  const userPromptContent = await getUserPrompt();
  const userPromptStr = userPromptContent
    ? `\n[用户偏好]\n${userPromptContent}`
    : "";

  // 4. 💡 动态决定人设加载浓度：Beta 模式或者首轮、每20轮时，才发送几万字的完整人设
  const msgCount = history.length;
  const needFullPersona = isBeta || msgCount === 0 || msgCount % 20 === 0;

  let personaToUse = "";
  if (needFullPersona) {
    personaToUse = personaContent;
  } else {
    // 平时只取前 800 字，防爆 token 且保持角色不漂移
    personaToUse = personaContent.slice(0, 800);
    if (personaContent.length > 800) {
      personaToUse += "\n[注：完整人设已在之前加载，请维持原有人格与态度表现]";
    }
  }

  const fullPrompt = corePrompt + personaToUse + userPromptStr;

  // 5. 获取分句条数 + 专属模型和温度
  let minMsg = 1,
    maxMsg = 3;
  let personaModel = null;
  let personaTemperature = null;
  let personaApiKey = null;
  let personaApiUrl = null;

  try {
    const { data: pDetail } = await db
      .from("custom_personas")
      .select(
        "min_messages, max_messages, custom_model, temperature, custom_api_key, custom_api_url",
      )
      .eq("id", pid)
      .limit(1);

    if (pDetail && pDetail.length > 0) {
      if (pDetail[0].min_messages) minMsg = pDetail[0].min_messages;
      if (pDetail[0].max_messages) maxMsg = pDetail[0].max_messages;
      if (pDetail[0].custom_model) personaModel = pDetail[0].custom_model;
      if (
        pDetail[0].temperature !== null &&
        pDetail[0].temperature !== undefined
      ) {
        personaTemperature = pDetail[0].temperature;
      }
      if (pDetail[0].custom_api_key) personaApiKey = pDetail[0].custom_api_key;
      if (pDetail[0].custom_api_url) personaApiUrl = pDetail[0].custom_api_url;
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
        if (config.customModel) personaModel = config.customModel;
        if (config.temperature !== null && config.temperature !== undefined) {
          personaTemperature = config.temperature;
        }
      }
    }
  } catch {}

  // 最终使用的模型和温度
  const modelToUse = personaModel || process.env.AI_MODEL;
  const temperatureToUse =
    personaTemperature !== null && personaTemperature !== undefined
      ? personaTemperature
      : parseFloat(process.env.AI_TEMPERATURE) || 0.7;

  // 6. 精简版默认世界书（角色扮演核心协议，防人设固化）
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

  // 7. 💡 记忆与关系召回 (记忆加载传入 isBeta 实现数据物理隔离)
  const memoryContext = await buildMemoryContextAsync(pid, userMessage, isBeta);
  const relationshipContext = await buildRelationshipContext(pid);

  // 8. 获取最新手机状态感知
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
          statusLines.push(`用户${time}电量低`);
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

  // 9. 动态加载启用的世界书
  let worldBookOverride = "";
  let worldBookBefore = "";
  let worldBookAfter = "";
  let worldBookBeforeUser = "";
  let worldBookTail = "";

  try {
    const { data: books } = await db
      .from("world_books")
      .select("*")
      .eq("enabled", true);
    if (books) {
      books.forEach((book) => {
        // 检查绑定关系
        const isGlobal = book.bind_type === "global" || !book.bind_type;
        const isBound = book.bind_personas && book.bind_personas.includes(pid);
        if (!isGlobal && !isBound) return;

        // 检查关键词触发
        if (book.keyword_enabled && book.keywords) {
          const kws = book.keywords.split(",").map((k) => k.trim());
          const hasKeyword = kws.some((kw) => userMessage.includes(kw));
          if (!hasKeyword) return;
        }

        // 按位置分类存放
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
  } catch (e) {
    console.error("加载世界书失败:", e.message);
  }

  // 10. 决定是否需要加载默认世界书
  const needWorldBook = msgCount === 0 || msgCount % 10 === 0;

  // 11. 按照世界书优先级分层组装最终的 System Content
  let systemContent = "";
  if (worldBookOverride) systemContent += worldBookOverride + "\n";
  if (worldBookBefore) systemContent += worldBookBefore + "\n";
  systemContent += fullPrompt + "\n";
  if (worldBookAfter) systemContent += worldBookAfter + "\n";
  if (needWorldBook) systemContent += defaultWorldBook + "\n";
  systemContent += timeContext + "\n";
  if (memoryContext) systemContent += memoryContext + "\n";
  if (relationshipContext) systemContent += relationshipContext + "\n";
  if (phoneContext) systemContent += phoneContext + "\n";
  if (worldBookBeforeUser) systemContent += worldBookBeforeUser + "\n";
  if (worldBookTail) systemContent += worldBookTail + "\n";
  if (timeSinceLastMsg) systemContent += timeSinceLastMsg + "\n";

  // 加这几行
  console.log("[DEBUG] corePrompt长度:", corePrompt.length);
  console.log("[DEBUG] personaToUse长度:", personaToUse.length);
  console.log("[DEBUG] userPromptStr长度:", userPromptStr.length);
  console.log("[DEBUG] worldBookBefore长度:", worldBookBefore.length);
  console.log("[DEBUG] memoryContext长度:", (memoryContext || "").length);
  console.log(
    "[DEBUG] relationshipContext长度:",
    (relationshipContext || "").length,
  );
  console.log("[DEBUG] systemContent总长度:", systemContent.length);

  // 追加最高优先级格式指令 (MANDATORY FORMAT RULE)
  systemContent += `

[MANDATORY FORMAT RULE / 最高优先级格式指令]
1. 必须使用 "|||" 作为唯一的气泡分隔符。
2. 绝对禁止输出任何换行符 (\\n)！
3. 在气泡内部，请恢复正常的标点符号书写习惯（，？！...），禁止用空格代替标点。
4. 气泡末尾严禁添加句号（。），让话语自然结束。但问号（？）和感叹号（！）可以正常留在末尾。
5. 除非人设中明确规定“不使用标点”，否则必须使用正确的中文标点。
6. 一次回复控制在 ${minMsg}-${maxMsg} 个气泡以内，除非情绪非常急切。

正确示例：
夏以昼是谁？怎么突然叫我这个名字，把我认成别人了？|||小乖，过来，跟我说清楚。

错误示例：
夏以昼是谁 怎么突然叫我这个名字 把我认成别人了？（错误：标点丢失）
夏以昼是谁？|||。 （错误：出现了多余孤立的句号）
`;

  // 💡 Beta 模式专属覆盖
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

  // 12. 构建发送给模型的消息数组 (加载历史自动区分 beta 时空)
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

  // --- 1. 异常处理：发送错误 Debug 信息 ---
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

  // --- 2. 获取回复并强力过滤思维链 ---
  let aiReply = data.choices[0].message.content || "";
  aiReply = aiReply.replace(/\[思考\][\s\S]*?\[思考\]/g, "").trim();
  aiReply = aiReply.replace(/\[思考\][\s\S]*/g, "").trim();
  aiReply = aiReply.replace(/思考一下[\s\S]*?\n/g, "").trim();
  aiReply = aiReply.replace(/^思考.*$/gm, "").trim();
  aiReply = aiReply.replace(/[\s\S]*?<\/think>/g, "").trim();
  aiReply = aiReply.replace(/[\s\S]*?<\/think>/g, "").trim();

  if (!aiReply) aiReply = "...";

  // --- 3. 存入数据库 (写入动态表) ---
  await db.from(tableName).insert({
    persona_id: pid,
    role: "ai",
    content: aiReply,
    timestamp: new Date().toISOString(),
  });

  // --- 4. 触发记忆、关系与时间线 (仅在非 Beta 模式下生成真实的长期数据) ---
  const cleanReplyForMemory = aiReply.replace(/\|\|\|/g, " ");
  evaluateRelationship(pid, history);
  processMemory(pid, userMessage, cleanReplyForMemory, isBeta);
  checkTimelineEvent(pid, userMessage, cleanReplyForMemory);

  // --- 5. 检测并创建定时提醒意图 ---
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

  // --- 6. AI 自主决定主动消息逻辑 (Beta 模式也支持测试) ---
  try {
    const { data: pConfig } = await db
      .from("custom_personas")
      .select("proactive_auto, proactive_max")
      .eq("id", pid)
      .limit(1);
    let autoEnabled = (pConfig && pConfig[0]?.proactive_auto) || false;
    let maxPerDay = (pConfig && pConfig[0]?.proactive_max) || 3;

    if (autoEnabled) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: todayCount } = await db
        .from("scheduled_messages")
        .select("id")
        .eq("persona_id", pid)
        .gte("trigger_at", todayStr + "T00:00:00Z")
        .eq("triggered", true);

      if (!todayCount || todayCount.length < maxPerDay) {
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

  // --- 7. 构建最终结果并广播给所有 WebSocket 客户端 ---
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

  // --- 8. 发送分句 Push 推送 (去掉 |||，且匹配前端气泡的拆分节奏) ---
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

module.exports = { handleChat };
