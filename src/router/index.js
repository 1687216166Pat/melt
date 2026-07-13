import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ChatView from "../views/ChatView.vue";
import AboutView from "../views/AboutView.vue";
import MemoryView from "../views/MemoryView.vue";
import PersonaDetailView from "../views/PersonaDetailView.vue";
import WorldBookView from "../views/WorldBookView.vue";
import CustomizeView from "../views/CustomizeView.vue";
import ChatListView from "../views/ChatListView.vue";
import LogsView from "../views/LogsView.vue";
import PresenceView from "../views/PresenceView.vue";
import DiaryView from "../views/DiaryView.vue";
import PlaygroundView from "../views/PlaygroundView.vue";
import SettingsView from "../views/SettingsView.vue";
import SettingsProfileView from "../views/settings/SettingsProfileView.vue";
import SettingsApiView from "../views/settings/SettingsApiView.vue";
import SettingsControlView from "../views/settings/SettingsControlView.vue";
import SettingsGeneralView from "../views/settings/SettingsGeneralView.vue";
import SettingsNotifView from "../views/settings/SettingsNotifView.vue";
import SettingsStorageView from "../views/settings/SettingsStorageView.vue";
import SettingsLockView from "../views/settings/SettingsLockView.vue";
import SettingsLifestyleView from "../views/settings/SettingsLifestyleView.vue";
import SettingsLifeAwareView from "../views/settings/SettingsLifeAwareView.vue";
import SettingsMemoryView from "../views/settings/SettingsMemoryView.vue";
import WalletView from "../views/settings/WalletView.vue";
import PomodoroView from "../views/PomodoroView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/chat/:personaId", name: "chat", component: ChatView },
    { path: "/about", name: "about", component: AboutView },
    { path: "/settings", name: "settings", component: SettingsView },
    { path: "/memory", name: "memory", component: MemoryView },
    {
      path: "/persona-detail/:personaId",
      name: "persona-detail",
      component: PersonaDetailView,
    },
    { path: "/worldbook", name: "worldbook", component: WorldBookView },
    { path: "/playground", name: "playground", component: PlaygroundView },
    { path: "/customize", name: "customize", component: CustomizeView },
    { path: "/chat-list", name: "chat-list", component: ChatListView },
    { path: "/logs", name: "logs", component: LogsView },
    { path: "/presence", name: "presence", component: PresenceView },
    { path: "/diary", name: "diary", component: DiaryView },
    {
      path: "/settings/profile",
      name: "settings-profile",
      component: SettingsProfileView,
    },
    { path: "/settings/api", name: "settings-api", component: SettingsApiView },
    {
      path: "/settings/control",
      name: "settings-control",
      component: SettingsControlView,
    },
    {
      path: "/settings/general",
      name: "settings-general",
      component: SettingsGeneralView,
    },
    {
      path: "/settings/notifications",
      name: "settings-notifications",
      component: SettingsNotifView,
    },
    {
      path: "/settings/storage",
      name: "settings-storage",
      component: SettingsStorageView,
    },
    {
      path: "/settings/lock",
      name: "settings-lock",
      component: SettingsLockView,
    },
    {
      path: "/settings/lifestyle",
      name: "settings-lifestyle",
      component: SettingsLifestyleView,
    },
    {
      path: "/settings/life-aware",
      name: "settings-life-aware",
      component: SettingsLifeAwareView,
    },
    {
      path: "/settings/memory-manage",
      name: "settings-memory-manage",
      component: SettingsMemoryView,
    },
    { path: "/wallet", name: "wallet", component: WalletView },
    { path: "/pomodoro", name: "pomodoro", component: PomodoroView },
    {
      path: "/memo",
      name: "memo",
      component: () => import("@/views/MemoView.vue"),
    },
    {
      path: "/persona-cards",
      name: "persona-cards",
      component: () => import("@/views/PersonaCardView.vue"),
    },
    {
      path: "/memory-graph",
      name: "memory-graph",
      component: () => import("@/views/WishlistView.vue"),
    },
    {
      path: "/settings/guide",
      name: "settings-guide",
      component: () => import("@/views/settings/SettingsGuideView.vue"),
    },
    {
      path: "/settings/maintenance",
      name: "settings-maintenance",
      component: () => import("@/views/settings/SettingsMaintenanceView.vue"),
    },
  ],
});

export default router;
