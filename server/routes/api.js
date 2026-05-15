const express = require("express");
const router = express.Router();
const { reportStatus, getLatestStatus } = require("../services/phone");
const { addSubscription } = require("../services/push");
const {
  getRecentMemories,
  deleteRecentMemory,
  getMemoryProfile,
  setMemoryProfile,
  consolidateMemories,
} = require("../services/memory");
const { setUserInfo, getAllUserInfo } = require("../services/user");
const {
  getPersonaList,
  getActivePersona,
  setActivePersona,
  getUserPrompt,
  setUserPrompt,
  getUserPromptTemplate,
} = require("../services/prompt");
const {
  getProactiveSettings,
  setProactiveSettings,
  checkProactiveMessages,
} = require("../services/proactive");

// 手机状态
router.post("/phone/status", async (req, res) => {
  const { type, data } = req.body;
  await reportStatus(type, data);
  res.json({ success: true });
});

router.get("/phone/status", async (req, res) => {
  const status = await getLatestStatus();
  res.json(status);
});

// 聊天记录 - 按人格获取
router.get("/messages/latest-persona", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("persona_id")
    .order("id", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    res.json({ personaId: data[0].persona_id });
  } else {
    res.json({ personaId: null });
  }
});

router.get("/messages/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("*")
    .eq("persona_id", req.params.personaId)
    .order("id", { ascending: false })
    .limit(50);
  res.json((data || []).reverse());
});

// 记忆管理 - 按人格
router.get("/memories/:personaId", async (req, res) => {
  const profile = await getMemoryProfile(req.params.personaId);
  const recent = await getRecentMemories(req.params.personaId, 50);
  res.json({ profile, recent });
});

router.put("/memories/:personaId/profile", async (req, res) => {
  const { content } = req.body;
  await setMemoryProfile(req.params.personaId, content);
  res.json({ success: true });
});

router.delete("/memories/recent/:id", async (req, res) => {
  await deleteRecentMemory(req.params.id);
  res.json({ success: true });
});

router.post("/memories/:personaId/consolidate", async (req, res) => {
  try {
    await consolidateMemories(req.params.personaId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 用户信息
router.get("/user", async (req, res) => {
  const info = await getAllUserInfo();
  res.json(info);
});

router.post("/user", async (req, res) => {
  const { key, value } = req.body;
  await setUserInfo(key, value);
  res.json({ success: true });
});

// Prompt 管理
router.get("/prompts/personas", (req, res) => {
  res.json({
    personas: getPersonaList(),
    active: getActivePersona(),
  });
});

router.post("/prompts/personas/:id/activate", async (req, res) => {
  const success = await setActivePersona(req.params.id);
  res.json({ success });
});

router.get("/prompts/user", async (req, res) => {
  const content = await getUserPrompt();
  res.json({
    content,
    template: getUserPromptTemplate(),
  });
});

router.post("/prompts/user", async (req, res) => {
  const { content } = req.body;
  await setUserPrompt(content);
  res.json({ success: true });
});

// 主动消息
router.get("/proactive/settings", async (req, res) => {
  const settings = await getProactiveSettings();
  res.json(settings);
});

router.post("/proactive/settings", async (req, res) => {
  await setProactiveSettings(req.body);
  res.json({ success: true });
});

router.post("/proactive/trigger", async (req, res) => {
  await checkProactiveMessages();
  res.json({ success: true });
});

// 推送订阅
router.post("/push/subscribe", (req, res) => {
  addSubscription(req.body);
  res.json({ success: true });
});

router.get("/push/vapid-key", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

const { getDimensionsForDisplay } = require("../services/relationship");

router.get("/relationship/:personaId", async (req, res) => {
  const data = await getDimensionsForDisplay(req.params.personaId);
  res.json(data);
});

const {
  createCustomPersona,
  deleteCustomPersona,
} = require("../services/prompt");

// 自定义人格
router.post("/personas/custom", async (req, res) => {
  const { name, content, avatar } = req.body;
  const id = "custom_" + Date.now().toString(36);
  await createCustomPersona(id, name, content, avatar);
  res.json({ success: true, id });
});

router.delete("/personas/custom/:id", async (req, res) => {
  await deleteCustomPersona(req.params.id);
  res.json({ success: true });
});

// 导出所有数据
router.get("/export", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();

  const { data: messages } = await db.from("messages").select("*");
  const { data: memories } = await db.from("memories_recent").select("*");
  const { data: patterns } = await db.from("memory_patterns").select("*");
  const { data: profile } = await db.from("user_profile").select("*");
  const { data: personas } = await db.from("custom_personas").select("*");
  const { data: dimensions } = await db
    .from("relationship_dimensions")
    .select("*");

  res.json({
    exportDate: new Date().toISOString(),
    messages: messages || [],
    memories: memories || [],
    patterns: patterns || [],
    profile: profile || [],
    customPersonas: personas || [],
    dimensions: dimensions || [],
  });
});

// 导入数据
router.post("/import", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const data = req.body;

  try {
    if (data.messages && data.messages.length > 0) {
      await db.from("messages").insert(
        data.messages.map((m) => ({
          persona_id: m.persona_id || "xiaorou",
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      );
    }
    if (data.memories && data.memories.length > 0) {
      await db.from("memories_recent").insert(
        data.memories.map((m) => ({
          persona_id: m.persona_id || "xiaorou",
          content: m.content,
          source_session: m.source_session,
        })),
      );
    }
    if (data.customPersonas && data.customPersonas.length > 0) {
      for (const p of data.customPersonas) {
        await db.from("custom_personas").upsert(p, { onConflict: "id" });
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取记忆热力图数据（最近60天每天的消息数）
router.get("/memories/:personaId/heatmap", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;

  const sixtyDaysAgo = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await db
    .from("messages")
    .select("timestamp")
    .eq("persona_id", personaId)
    .gte("timestamp", sixtyDaysAgo);

  // 按日期统计
  const counts = {};
  if (data) {
    data.forEach((m) => {
      const day = m.timestamp.slice(0, 10);
      counts[day] = (counts[day] || 0) + 1;
    });
  }

  res.json(counts);
});

// 获取某天的记忆
router.get("/memories/:personaId/date/:date", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { personaId, date } = req.params;

  const { data } = await db
    .from("memories_recent")
    .select("*")
    .eq("persona_id", personaId)
    .eq("source_session", date);

  res.json(data || []);
});

// 获取有记忆的年月列表
router.get("/memories/:personaId/dates", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;

  const { data } = await db
    .from("memories_recent")
    .select("source_session")
    .eq("persona_id", personaId)
    .order("source_session", { ascending: false });

  // 整理成 { "2026": ["05", "04", ...] } 格式
  const tree = {};
  if (data) {
    data.forEach((m) => {
      if (!m.source_session) return;
      const [year, month] = m.source_session.split("-");
      if (!tree[year]) tree[year] = new Set();
      tree[year].add(month);
    });
  }

  // Set 转 Array
  const result = {};
  Object.keys(tree)
    .sort()
    .reverse()
    .forEach((y) => {
      result[y] = [...tree[y]].sort().reverse();
    });

  res.json(result);
});

// 获取模型列表
router.post("/test/models", async (req, res) => {
  const { baseUrl, key } = req.body;
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 测试 API 连接
router.post("/test/connection", async (req, res) => {
  const { baseUrl, key, model } = req.body;
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
    });
    const data = await response.json();
    res.json({ ok: response.ok, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 保存 API 配置
router.post("/settings/api", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { key, baseUrl, model } = req.body;

  if (key) {
    process.env.AI_API_KEY = key;
    await db
      .from("user_profile")
      .upsert(
        { key: "api_key", value: key, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
  }
  if (baseUrl) {
    process.env.AI_BASE_URL = baseUrl;
    await db.from("user_profile").upsert(
      {
        key: "api_base_url",
        value: baseUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }
  if (model) {
    process.env.AI_MODEL = model;
    process.env.AI_MEMORY_MODEL = model;
    await db.from("user_profile").upsert(
      {
        key: "api_model",
        value: model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }

  res.json({ success: true });
});

// 启动时加载 API 配置
router.get("/settings/api", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("key, value")
    .in("key", ["api_key", "api_base_url", "api_model"]);

  const config = {};
  if (data) {
    data.forEach((row) => {
      if (row.key === "api_key") config.key = row.value;
      if (row.key === "api_base_url") config.baseUrl = row.value;
      if (row.key === "api_model") config.model = row.value;
    });
  }
  res.json(config);
});

// 助手详情
router.get("/persona/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const id = req.params.personaId;

  // 先查自定义人格表
  const { data } = await db
    .from("custom_personas")
    .select("*")
    .eq("id", id)
    .limit(1);
  if (data && data.length > 0) {
    res.json(data[0]);
  } else {
    // 内置人格：基本信息 + user_profile 里的配置
    const { getPersonaList } = require("../services/prompt");
    const list = getPersonaList();
    const found = list.find((p) => p.id === id) || {
      name: id,
      content: "",
      avatar: "💬",
    };

    // 查是否有额外配置
    const { data: configRow } = await db
      .from("user_profile")
      .select("value")
      .eq("key", `persona_config_${id}`)
      .limit(1);

    if (configRow && configRow.length > 0) {
      const extra = JSON.parse(configRow[0].value);
      Object.assign(found, extra);
    }

    res.json(found);
  }
});

router.put("/persona/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const id = req.params.personaId;
  const { name, content, avatar, avatarUrl, note, gender, worldBookId } =
    req.body;

  const { data: existing } = await db
    .from("custom_personas")
    .select("id")
    .eq("id", id)
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("custom_personas")
      .update({
        name,
        content,
        avatar: avatar || "💬",
        description: content ? content.slice(0, 30) : "",
        note: note || "",
        gender: gender || "",
        world_book_id: worldBookId || "",
      })
      .eq("id", id);
  } else {
    await db.from("user_profile").upsert(
      {
        key: `persona_config_${id}`,
        value: JSON.stringify({ name, note, gender, avatarUrl, worldBookId }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }

  res.json({ success: true });
});

// 清空对话
router.delete("/messages/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("messages").delete().eq("persona_id", req.params.personaId);
  res.json({ success: true });
});

// 清空记忆
router.delete("/memories/:personaId/clear", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const pid = req.params.personaId;
  await db.from("memories_recent").delete().eq("persona_id", pid);
  await db.from("memory_patterns").delete().eq("persona_id", pid);
  await db.from("user_profile").delete().eq("key", `memory_profile_${pid}`);
  res.json({ success: true });
});

// 世界书
router.get("/worldbooks", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("world_books")
    .select("*")
    .order("created_at", { ascending: false });
  res.json(data || []);
});

router.post("/worldbooks", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { title, content } = req.body;
  const id = "wb_" + Date.now().toString(36);
  await db.from("world_books").insert({ id, title, content });
  res.json({ success: true, id });
});

router.put("/worldbooks/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { title, content } = req.body;
  await db
    .from("world_books")
    .update({ title, content })
    .eq("id", req.params.id);
  res.json({ success: true });
});

router.delete("/worldbooks/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("world_books").delete().eq("id", req.params.id);
  res.json({ success: true });
});

// 获取行为模式
router.get("/patterns/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("memory_patterns")
    .select("*")
    .eq("persona_id", req.params.personaId)
    .order("frequency", { ascending: false })
    .limit(10);
  res.json(data || []);
});
module.exports = router;
