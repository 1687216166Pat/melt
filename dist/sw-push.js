// public/sw-push.js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  // 检查是否有活跃的页面
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 如果有任何页面是可见的，不弹通知
        const hasVisibleClient = clientList.some(
          (client) => client.visibilityState === "visible",
        );
        if (hasVisibleClient) return;

        // 页面不可见或完全关闭，弹通知
        const title = data.title || "AI 助手";
        const options = {
          body: data.body || "你有一条新消息",
          icon: "/app-icon.png",
          badge: "/app-icon.png",
          data: { url: data.url || "/" },
        };
        return self.registration.showNotification(title, options);
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 如果有已打开的窗口，聚焦它
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        // 没有窗口就打开新的
        return clients.openWindow("/");
      }),
  );
});
