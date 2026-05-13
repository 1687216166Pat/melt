// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ChatView from "../views/ChatView.vue";
import SessionsView from "../views/SessionsView.vue";
import SettingsView from "../views/SettingsView.vue";
import MemoryView from "../views/MemoryView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/chat",
      name: "chat",
      component: ChatView,
    },
    {
      path: "/chat/:id",
      name: "chat-session",
      component: ChatView,
    },
    {
      path: "/sessions",
      name: "sessions",
      component: SessionsView,
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
    },
    {
      path: "/memory",
      name: "memory",
      component: MemoryView,
    },
  ],
});

export default router;
