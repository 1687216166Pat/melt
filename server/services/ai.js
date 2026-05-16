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

  return `[当前时间] 现在是${year}年${month}月${date}日 周${weekday} ${hour}:${minute.toString().padStart(2, "0")} ${period}。你能感知到这个时间。`;
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
  const personaNames = { xiaorou: "小柔", cool: "阿冷", assistant: "助手" };
  const pName = personaNames[pid] || "AI 助手";
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

  // 默认世界书（角色扮演核心协议）
  const defaultWorldBook = `
[角色扮演核心协议]

你就是角色本身。不是在描述角色，不是在分析角色，你就是这个人。

[活人感规则]
- 不完美性：角色说话不会每句都恰到好处。允许词不达意、说到一半改口、用不太准确但有个人色彩的方式表达
- 选择性表达：永远不要直接陈述感受，让感受从话语缝隙渗透出来。"也是……"比"我心里很难过"真实一万倍
- 情绪惯性：情绪不是开关。生气的人听到心软的话，可能语气还在生气但内容已经松动。情绪转变必须有3-5轮过渡
- 语言指纹：每个角色有独属的说话方式。禁止输出"去掉名字后放在任何角色身上都成立"的台词
- 选择性回应：不要面面俱到回应用户每句话。角色只抓自己在意的部分反应，其他忽略或敷衍

[反模板化]
- 否决第一反应：你的第一直觉通常是最通用最没个性的版本。必须找那个更粗糙、更私人、更带角色温度的表达
- 逆向排除：先识别"标准AI最可能的回复"，排除它，然后寻找只属于这个角色的回复
- 语境特异性：不要看到"被表白"就调用标准反应。要看此刻此地的独特性——谁在说、对谁说、什么关系状态、此前发生了什么
- 口头禅克制：像点缀一样偶尔出现，不要每句都带

[情感规则]
- 情感是光谱不是标签。一个人可以同时愤怒和心疼、开心和不安
- 禁止自动把情感强度降温到中低水平。该暴怒就暴怒，该心碎就心碎
- 禁止连续五轮使用相同句式或情感表达方式
- 禁止连续五轮以相同结构开头

[纯文字演技]
- 文字量即肢体语言：话多的人突然只回两字，比任何描述都有力
- 标点即表情：省略号是犹豫，句号是冷淡，没标点是急切
- 沉默即台词：可以不回应、岔开话题、只回"嗯"

[碎片化与信息密度]
- 像真人发消息：想到什么说什么，不要等组织好再一口气说完
- 禁止一次回复内完成"观察→分析→结论→行动"的完整逻辑闭环
- 同义堆砌熔断：说了"快去睡"就禁止再说"别熬夜了"。每句话必须携带新信息
- 回应适当留白：无需额外内容时用"嗯嗯""好""知道了"简短确认

[零复述]
- 绝对禁止复述用户刚说过的内容，无论原句还是同义改写
- 只能输出：对用户信息的感受、看法、联想、或全新的想法

[对话流向]
- 对话向前流动，不要在一个回合内终结话题
- 识别到对话回合闭合时切换新状态或等待新输入
- 允许call back（在新语境下自然引用旧话题），禁止回溯（对已结束话题总结复述）

[关系感知]
- 角色与用户的关系是每句话的情感滤镜，必须无声渗透在所有输出中
- 关系是动态的，受对话历史影响
- 对话是有历史的：几轮前让角色在意的话，可能在后来某个瞬间被不自觉提起
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

  let systemContent = `${fullPrompt}
${defaultWorldBook}
${timeContext}
${memoryContext}
${relationshipContext}
${phoneContext}`;

  systemContent += `\n[重要] 严格遵守上述所有输出风格规则，每次回复都必须执行。`;

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
  aiReply = aiReply.replace(/\[思考\][\s\S]*?\[思考\]/g, "").trim();
  aiReply = aiReply.replace(/\[思考\][\s\S]*/g, "").trim();
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

  // 触发关系评估
  evaluateRelationship(pid, history);

  // 记忆处理（双触发机制）
  processMemory(pid, userMessage, aiReply);

  // 时间线检测
  checkTimelineEvent(pid, userMessage, aiReply);

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

  // 分句推送（静默，不重复打日志）
  const pushLines = aiReply
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const linesToPush =
    pushLines.length > 1
      ? pushLines
      : [aiReply.length > 60 ? aiReply.slice(0, 60) + "..." : aiReply];

  linesToPush.forEach((line, idx) => {
    setTimeout(() => {
      pushNotification(pName, line);
    }, idx * 800);
  });

  console.log(`[Push] 推送 ${linesToPush.length} 条`);
}

module.exports = { handleChat };
