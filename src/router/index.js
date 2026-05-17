import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ChatView from "../views/ChatView.vue";
import AboutView from "../views/AboutView.vue";
import SettingsView from "../views/SettingsView.vue";
import MemoryView from "../views/MemoryView.vue";
import PersonaDetailView from "../views/PersonaDetailView.vue";
import WorldBookView from "../views/WorldBookView.vue";
import CustomizeView from "../views/CustomizeView.vue";
import ChatListView from "../views/ChatListView.vue";
import LogsView from "../views/LogsView.vue";
import PresenceView from "../views/PresenceView.vue";

//开发用，后续可以删掉
import PlaygroundView from "../views/PlaygroundView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/chat/:personaId",
      name: "chat",
      component: ChatView,
    },
    {
      path: "/about",
      name: "about",
      component: AboutView,
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
    {
      path: "/persona-detail/:personaId",
      name: "persona-detail",
      component: PersonaDetailView,
    },
    {
      path: "/worldbook",
      name: "worldbook",
      component: WorldBookView,
    },
    {
      path: "/playground",
      name: "playground",
      component: PlaygroundView,
    },
    {
      path: "/customize",
      name: "customize",
      component: CustomizeView,
    },
    {
      path: "/chat-list",
      name: "chat-list",
      component: ChatListView,
    },
    {
      path: "/logs",
      name: "logs",
      component: LogsView,
    },
    {
      path: "/presence",
      name: "presence",
      component: PresenceView,
    },
  ],
});

export default router;
