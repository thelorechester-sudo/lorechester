/*
 * Service worker for the admin's order alerts. Registered from the admin only
 * (scope /admin). It does no caching and no offline handling — its one job is
 * to show a notification when the server pushes one and to open the right page
 * when it is tapped. iOS requires every push to show a notification.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Lorechester", {
      body: data.body || "",
      icon: "/icons/admin-192.png",
      badge: "/icons/admin-192.png",
      tag: data.tag,
      data: { url: data.url || "/admin/orders" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Only ever open a path inside the admin, whatever the payload says.
  const raw = (event.notification.data && event.notification.data.url) || "/admin";
  const url = typeof raw === "string" && /^\/admin(\/|$)/.test(raw) ? raw : "/admin";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (new URL(client.url).pathname.startsWith("/admin") && "focus" in client) {
            return client.focus().then((focused) => focused.navigate(url));
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
