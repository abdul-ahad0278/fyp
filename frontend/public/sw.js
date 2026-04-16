// Service Worker for Push Notifications
// Place this file in: frontend/public/sw.js

self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  let data = {
    title: "Healthcare Bot Notification",
    body: "You have a new notification",
    icon: "/medical-icon.png",
    tag: "healthcare-notification",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/medical-icon.png",
    badge: "/badge-icon.png",
    tag: data.tag || "default",
    requireInteraction: data.tag === "emergency-alert", // Stay until user closes for emergencies
    data: {
      url: data.url || "/",
      medicine: data.medicine,
      time: data.time,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.notification.tag);
  event.notification.close();

  const urlToOpen =
    event.notification.data.url ||
    (typeof clients !== "undefined" && clients.matchAll ? "/" : "");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // If not open, open it
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("Notification dismissed:", event.notification.tag);
});
