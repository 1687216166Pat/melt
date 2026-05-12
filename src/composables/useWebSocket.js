// src/composables/useWebSocket.js
import { ref } from "vue";

const socket = ref(null);
const isConnected = ref(false);
const messageHandlers = new Set();

export function useWebSocket() {
  function connect() {
    socket.value = new WebSocket("ws://localhost:3001");

    socket.value.onopen = () => {
      isConnected.value = true;
      console.log("WebSocket 已连接");
    };

    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data);
      messageHandlers.forEach((handler) => handler(data));
    };

    socket.value.onclose = () => {
      isConnected.value = false;
      // 3秒后重连
      setTimeout(connect, 3000);
    };
  }

  function send(data) {
    if (socket.value && socket.value.readyState === 1) {
      socket.value.send(JSON.stringify(data));
    }
  }

  function onMessage(handler) {
    messageHandlers.add(handler);
  }

  function removeHandler(handler) {
    messageHandlers.delete(handler);
  }

  return { connect, send, onMessage, removeHandler, isConnected };
}
