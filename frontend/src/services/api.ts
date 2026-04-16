import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ───────────── Chat ─────────────

export async function sendMessage(
  message: string,
  userId: string,
  conversationId?: string
) {
  const res = await api.post("/api/chat/send", {
    message,
    user_id: userId,
    conversation_id: conversationId,
  });
  return res.data;
}

export async function getChatHistory(conversationId: string) {
  const res = await api.get(`/api/chat/history/${conversationId}`);
  return res.data.messages;
}

export async function getConversations(userId: string) {
  const res = await api.get(`/api/chat/conversations/${userId}`);
  return res.data.conversations;
}

export async function startNewConversation(userId: string) {
  const res = await api.post(`/api/chat/new-conversation?user_id=${userId}`);
  return res.data.conversation;
}

// ───────────── Health History ─────────────

export async function getHealthHistory(userId: string) {
  const res = await api.get(`/api/health/history/${userId}`);
  return res.data.records;
}

// ───────────── Reminders ─────────────

export async function getReminders(userId: string) {
  const res = await api.get(`/api/reminders/user/${userId}`);
  return res.data.reminders;
}

export async function createReminder(data: {
  user_id: string;
  medicine: string;
  dosage: string;
  time: string;
  frequency: string;
}) {
  const res = await api.post("/api/reminders/create", data);
  return res.data.reminder;
}

export async function deleteReminder(reminderId: string) {
  const res = await api.delete(`/api/reminders/delete/${reminderId}`);
  return res.data;
}

// ───────────── Location ─────────────

export async function getNearbyPlaces(
  lat: number,
  lng: number,
  placeType: string = "hospital"
) {
  const res = await api.post("/api/location/nearby", {
    lat,
    lng,
    place_type: placeType,
  });
  return res.data.places;
}

export async function getOnlinePharmacyLinks(medicineName: string) {
  const res = await api.get(`/api/location/pharmacies/online/${medicineName}`);
  return res.data.pharmacy_links;
}
