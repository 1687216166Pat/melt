import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ChatView from "../views/ChatView.vue";
import AboutView from "../views/AboutView.vue";
import SettingsView from "../views/SettingsView.vue";
import MemoryView from "../views/MemoryView.vue";
import PersonaDetailView from "../views/PersonaDetailView.vue";
import WorldBookView from "../views/WorldBookView.vue";

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
  ],
});

export default router;
