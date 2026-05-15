const { WebSocketServer } = require("ws");
const { handleChat } = require("../services/ai");
const { sendPushNotification } = require("../services/push");

let wss;
let clients = new Set();

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("客户端已连接");

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data);

        if (msg.type === "chat") {
          await handleChat(msg.content, ws, msg.personaId);
        }
      } catch (err) {
        console.error("消息处理错误:", err);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log("客户端断开");
    });
  });
}

function pushToAll(message) {
  const payload = JSON.stringify({
    type: "push",
    role: "ai",
    content: message,
    timestamp: new Date().toISOString(),
  });

  let delivered = false;
  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(payload);
      delivered = true;
    }
  });

  // 如果没有活跃的 WebSocket 连接，发 Push 通知
  if (!delivered) {
    sendPushNotification("AI 助手", message.slice(0, 100));
  }
}

module.exports = { initWebSocket, pushToAll };
