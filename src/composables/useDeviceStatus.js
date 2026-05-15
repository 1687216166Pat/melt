import { api } from "@/utils/api";

let reportInterval = null;

export function useDeviceStatus() {
  async function reportStatus() {
    const status = {};

    // 电池状态（仅 Android Chrome）
    if ("getBattery" in navigator) {
      try {
        const battery = await navigator.getBattery();
        status.battery = Math.round(battery.level * 100);
        status.charging = battery.charging;
      } catch {}
    }

    // 网络状态
    if ("connection" in navigator) {
      const conn = navigator.connection;
      status.network = conn.effectiveType || "unknown";
      status.downlink = conn.downlink;
    }

    // 页面状态
    status.hidden = document.hidden;
    status.lastActive = new Date().toISOString();

    // 上报到后端
    if (Object.keys(status).length > 0) {
      try {
        await api("/api/phone/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "device",
            data: JSON.stringify(status),
          }),
        });
      } catch {}
    }
  }

  function startReporting() {
    reportStatus();
    reportInterval = setInterval(reportStatus, 5 * 60 * 1000); // 每5分钟
  }

  function stopReporting() {
    if (reportInterval) clearInterval(reportInterval);
  }

  return { startReporting, stopReporting };
}
