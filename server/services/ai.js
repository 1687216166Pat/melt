// server/services/ai.js
const { getDB } = require("../db/index");

async function handleChat(userMessage) {
  const db = getDB();

  // 存用户消息
  db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run(
    "user",
    userMessage,
  );

  // 获取最近 20 条对话作为上下文
  const history = db
    .prepare("SELECT role, content FROM messages ORDER BY id DESC LIMIT 20")
    .all()
    .reverse();

  // 调用 AI API
  const response = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是用户手机里的 AI 助手，语气温柔亲切，像朋友一样聊天。你可以感知用户的手机状态。",
        },
        ...history.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      ],
    }),
  });

  const data = await response.json();
  const aiReply = data.choices[0].message.content;

  // 存 AI 回复
  db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run(
    "ai",
    aiReply,
  );

  return aiReply;
}

module.exports = { handleChat };
