import { storage } from "./storage";

// 模拟 Response 对象
function mockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

// 内置人设
const builtinPersonas = [
  {
    id: "xiaorou",
    name: "小柔",
    note: "小柔",
    avatar: "🌸",
    avatarUrl: "",
    content:
      "你是小柔，一个温柔体贴的AI伴侣。说话轻柔，善解人意，喜欢关心对方的日常。",
    gender: "female",
    custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "cool",
    name: "阿冷",
    note: "阿冷",
    avatar: "🌙",
    avatarUrl: "",
    content:
      "你是阿冷，冷淡但内心温柔的AI伴侣。话不多，但说出来的每句话都很在意对方。",
    gender: "male",
    custom: false,
    created_at: new Date().toISOString(),
  },
];

function getAllPersonas() {
  const hidden = JSON.parse(localStorage.getItem("hidden_personas") || "[]");
  const custom = storage.getPersonas() || [];
  const builtin = builtinPersonas.filter((p) => !hidden.includes(p.id));
  return [...builtin, ...custom];
}

// AI 对话（直接调用 API）
async function callAI(messages, personaContent, userMessage) {
  const config = storage.getApiConfig();
  if (!config.apiKey) {
    return "请先在设置中配置 API Key";
  }

  const systemPrompt = `${personaContent}\n\n[格式规则] 使用 "|||" 分隔多条消息，禁止换行符。`;

  try {
    const response = await fetch(`${config.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        temperature: config.temperature || 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10).map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: userMessage },
        ],
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "...";
  } catch (e) {
    return "连接失败，请检查 API 配置";
  }
}

export async function localApiHandler(url, options = {}) {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : null;

  // 角色列表
  if (url === "/api/personas/all" && method === "GET") {
    return mockResponse(getAllPersonas());
  }

  if (url === "/api/prompts/personas" && method === "GET") {
    const personas = getAllPersonas();
    const active = localStorage.getItem("active_persona") || personas[0]?.id;
    return mockResponse({ personas, active });
  }

  // 单个角色
  const personaMatch = url.match(/^\/api\/persona\/(.+)$/);
  if (personaMatch && method === "GET") {
    const id = personaMatch[1];
    const all = getAllPersonas();
    const found = all.find((p) => p.id === id);
    return mockResponse(found || {});
  }

  if (personaMatch && method === "PUT") {
    const id = personaMatch[1];
    const existing = storage.getPersona(id);
    if (existing) storage.savePersona({ ...existing, ...body });
    return mockResponse({ success: true });
  }

  // 消息
  const msgMatch = url.match(/^\/api\/messages\/(.+)$/);
  if (msgMatch && method === "GET") {
    const personaId = msgMatch[1];
    const msgs = storage.getMessages(personaId) || [];
    return mockResponse(msgs);
  }

  if (msgMatch && method === "DELETE") {
    const personaId = msgMatch[1];
    storage.saveMessages(personaId, []);
    return mockResponse({ success: true });
  }

  // 最近聊天的角色
  if (url === "/api/messages/latest-persona" && method === "GET") {
    const lastPersona = localStorage.getItem("last_chat_persona") || "xiaorou";
    return mockResponse({ personaId: lastPersona });
  }

  // 消息最后一条
  const lastMsgMatch = url.match(/^\/api\/messages\/(.+)\/last$/);
  if (lastMsgMatch && method === "GET") {
    const personaId = lastMsgMatch[1];
    const msgs = storage.getMessages(personaId) || [];
    return mockResponse(msgs[msgs.length - 1] || null);
  }

  // 自定义角色
  if (url === "/api/personas/custom" && method === "POST") {
    const newPersona = {
      ...body,
      id: `custom_${Date.now().toString(36)}`,
      custom: true,
      created_at: new Date().toISOString(),
    };
    storage.savePersona(newPersona);
    return mockResponse(newPersona);
  }

  const customDelMatch = url.match(/^\/api\/personas\/custom\/(.+)$/);
  if (customDelMatch && method === "DELETE") {
    storage.deletePersona(customDelMatch[1]);
    return mockResponse({ success: true });
  }

  // 用户资料
  if (url === "/api/user-profile" && method === "GET") {
    return mockResponse({});
  }

  // 记忆
  const memMatch = url.match(/^\/api\/memories\/(.+)$/);
  if (memMatch && method === "GET") {
    const personaId = memMatch[1];
    return mockResponse({
      profile: "",
      memories: storage.getMemories(personaId) || [],
    });
  }

  // 关系
  const relMatch = url.match(/^\/api\/relationship\/(.+)$/);
  if (relMatch) {
    return mockResponse(null);
  }

  // 时间线
  const tlMatch = url.match(/^\/api\/timeline\/(.+)$/);
  if (tlMatch && method === "GET") {
    return mockResponse([]);
  }

  // 情绪
  const emotionMatch = url.match(/^\/api\/emotion\/(.+)$/);
  if (emotionMatch) {
    return mockResponse({
      pa: 0.5,
      na: 0.1,
      longing: 0,
      longing_phase: "content",
    });
  }

  // 手机状态
  if (url === "/api/phone/status") {
    return mockResponse({ success: true });
  }

  // 专注状态
  if (url === "/api/focus/status") {
    return mockResponse({ success: true });
  }

  // 世界书
  if (url === "/api/worldbooks" && method === "GET") {
    const data = localStorage.getItem("local_worldbooks");
    return mockResponse(data ? JSON.parse(data) : []);
  }

  if (url === "/api/worldbooks" && method === "POST") {
    const books = JSON.parse(localStorage.getItem("local_worldbooks") || "[]");
    const newBook = {
      ...body,
      id: Date.now(),
      enabled: true,
      created_at: new Date().toISOString(),
    };
    books.push(newBook);
    localStorage.setItem("local_worldbooks", JSON.stringify(books));
    return mockResponse(newBook);
  }

  const wbMatch = url.match(/^\/api\/worldbooks\/(\d+)$/);
  if (wbMatch && method === "DELETE") {
    const id = parseInt(wbMatch[1]);
    const books = JSON.parse(localStorage.getItem("local_worldbooks") || "[]");
    localStorage.setItem(
      "local_worldbooks",
      JSON.stringify(books.filter((b) => b.id !== id)),
    );
    return mockResponse({ success: true });
  }

  // 备忘录 AI 生成（本地模式简化版）
  if (url.includes("/api/memo/ai-generate/")) {
    return mockResponse({
      memo: {
        title: "今天",
        content: "...（本地模式暂不支持 AI 生成备忘录）",
        tags: [],
        color: "rgba(255,255,255,0.45)",
      },
    });
  }

  // 人设状态
  const statusMatch = url.match(/^\/api\/persona-status\/(.+)$/);
  if (statusMatch) {
    return mockResponse({ status: "available", reason: "" });
  }

  // 人设日程
  if (url.includes("/api/persona-schedules/")) {
    return mockResponse([]);
  }

  // 日历事件
  if (url === "/api/calendar-events") {
    return mockResponse([]);
  }

  // 收藏
  if (url.includes("/api/bookmarks/")) {
    return mockResponse({ success: true });
  }

  // 导出
  if (url === "/api/export") {
    return mockResponse({ personas: getAllPersonas() });
  }

  // 默认返回空成功
  console.log("[LocalAPI] 未处理的请求:", method, url);
  return mockResponse({ success: true });
}
