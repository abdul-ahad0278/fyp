import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function usePushNotifications(userId?: string) {
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;

    // Check if browser supports service workers
    if (!("serviceWorker" in navigator)) {
      console.log("Service Workers not supported");
      return;
    }

    // Check if browser supports push notifications
    if (!("PushManager" in window)) {
      console.log("Push Notifications not supported");
      return;
    }

    // Request notification permission
    const requestNotificationPermission = async () => {
      const permission = Notification.permission;

      if (permission === "denied") {
        console.log("User denied notification permission");
        return;
      }

      if (permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          console.log("User did not grant notification permission");
          return;
        }
      }

      // Register service worker (safe if already registered)
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log("✓ Service Worker registered");

        // Subscribe to push notifications
        subscribeUserToPushNotifications(registration, userId);
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    requestNotificationPermission();
  }, [userId]);
}

async function subscribeUserToPushNotifications(
  registration: ServiceWorkerRegistration,
  userId: string
) {
  const vapidPublicKey = await getVapidPublicKey();

  if (!vapidPublicKey) {
    console.warn("VAPID public key not configured");
    return;
  }

  try {
    // Convert public key from base64
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    if (convertedVapidKey.length !== 65) {
      console.error("Invalid VAPID public key length. Expected 65 bytes.");
      return;
    }

      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        console.log("Removed stale push subscription");
      }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    console.log("✓ Push subscription successful");

    // Send subscription to backend
    await fetch(`${API_URL}/api/reminders/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        subscription: subscription.toJSON(),
      }),
    });

    console.log("✓ Subscription sent to backend");
  } catch (error) {
    console.error("Push subscription failed:", error);
  }
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/reminders/notifications/public-key`);
    if (res.ok) {
      const data = await res.json();
      return data.vapid_public_key as string;
    }
  } catch (error) {
    console.warn("Failed to fetch VAPID key from backend, falling back to env.", error);
  }

  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
