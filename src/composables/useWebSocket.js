import { ref } from "vue";

let socket = null;
const isConnected = ref(false);
const messageHandlers = new Set();
let lastReceivedContent = "";
let lastReceivedTime = 0;

function getWsUrl() {
  if (import.meta.env.PROD) {
    return "wss://gpt1-production-ba3b.up.railway.app";
  }
  return `ws:/${window.location.hostname}:3001`;
}

function connect() {
  console.log(
    "[WS] connect() 被调用, 当前 socket readyState:",
    socket?.readyState,
  );

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    console.log("[WS] 已有活跃连接，跳过");
    return;
  }

  if (socket) {
    socket.onclose = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.close();
    socket = null;
  }

  socket = new WebSocket(getWsUrl());

  socket.onopen = () => {
    isConnected.value = true;
    console.log("[WS] WebSocket 已连接");
  };

  socket.onmessage = (event) => {
    console.log("[WS] 收到消息, handlers数量:", messageHandlers.size);
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("[WS] 消息解析失败:", e);
      return;
    }

    const contentKey = (data.content || "") + (data.type || "");
    const now = Date.now();
    if (contentKey === lastReceivedContent && now - lastReceivedTime < 5000) {
      console.log("[WS] 拦截重复消息:", contentKey.slice(0, 30));
      return;
    }
    lastReceivedContent = contentKey;
    lastReceivedTime = now;

    messageHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (e) {
        console.error("[WS] handler 执行出错:", e);
      }
    });
  };

  socket.onclose = (event) => {
    isConnected.value = false;
    socket = null;
    console.log("[WS] 连接断开，3秒后重连, code:", event.code);
    setTimeout(connect, 3000);
  };

  socket.onerror = (err) => {
    console.error("[WS] 连接错误:", err);
    if (socket) socket.close();
  };
}

function send(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const isBeta = localStorage.getItem("is_beta_mode") === "true";
    socket.send(JSON.stringify({ ...data, isBeta }));
  } else {
    console.warn("[WS] 发送失败，连接未就绪, readyState:", socket?.readyState);
  }
}

function onMessage(handler) {
  messageHandlers.add(handler);
}

function removeHandler(handler) {
  messageHandlers.delete(handler);
}

function clearHandlers() {
  messageHandlers.clear();
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendSystemNotification(content, title) {
  if ("Notification" in window && Notification.permission === "granted") {
    const notif = new Notification(title || "AI 助手", {
      body: content.length > 60 ? content.slice(0, 60) + "..." : content,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  }
}

async function registerPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const BASE = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${BASE}/api/push/vapid-key`);
    const { key } = await res.json();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    await fetch(`${BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    console.log("[WS] Push 订阅成功");
  } catch (err) {
    console.error("[WS] Push 订阅失败:", err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebSocket() {
  return {
    connect,
    send,
    onMessage,
    removeHandler,
    clearHandlers,
    isConnected,
    requestNotificationPermission,
    sendSystemNotification,
    registerPushSubscription,
  };
}
