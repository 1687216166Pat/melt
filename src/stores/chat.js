// src/stores/chat.js
import { defineStore } from "pinia";
import { ref } from "vue";

const API = import.meta.env.VITE_API_URL || "";

export const useChatStore = defineStore("chat", () => {
  const messages = ref([]);

  function addMessage(msg) {
    messages.value.push({
      id: msg.id || Date.now() + Math.random(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    });
  }

  async function loadHistory() {
    try {
      const res = await fetch(`${API}/api/messages`);
      const data = await res.json();
      messages.value = data.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    } catch (e) {
      console.error("加载历史消息失败:", e);
    }
  }

  async function loadSessionMessages(sessionId) {
    try {
      const res = await fetch(`${API}/api/sessions/${sessionId}/messages`);
      const data = await res.json();
      messages.value = data.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    } catch (e) {
      console.error("加载会话消息失败:", e);
    }
  }

  function clearMessages() {
    messages.value = [];
  }

  return {
    messages,
    addMessage,
    loadHistory,
    loadSessionMessages,
    clearMessages,
  };
});
