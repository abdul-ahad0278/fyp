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

// ───────────── Profile ─────────────

export interface UserProfile {
  full_name?: string | null;
  age?: number | null;
  gender?: string | null;
  blood_group?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  previous_symptoms?: string | null;
  family_history?: string | null;
  lifestyle?: string | null;
  is_complete?: boolean;
}

export async function getProfile(userId: string): Promise<{ profile: UserProfile | null; is_complete: boolean }> {
  const res = await api.get(`/api/profile/${userId}`);
  return res.data;
}

export async function upsertProfile(userId: string, data: UserProfile) {
  const res = await api.post(`/api/profile/${userId}`, data);
  return res.data;
}

// ───────────── MediScan / Vision ─────────────

export type VisionMode = "symptom" | "medicine" | "prescription";

export interface VisionResult {
  mode: VisionMode;
  detected_items: string[];
  analysis: string;
  severity: "low" | "medium" | "high" | "emergency";
  recommendations: string[];
  warnings: string[];
  needs_emergency: boolean;
  response: string;
}

export async function analyzeImage(params: {
  userId: string;
  mode: VisionMode;
  file: File;
  note?: string;
}): Promise<VisionResult> {
  const form = new FormData();
  form.append("user_id", params.userId);
  form.append("mode", params.mode);
  if (params.note) form.append("note", params.note);
  form.append("image", params.file);
  // Clear the instance default application/json so the browser can set
  // "multipart/form-data; boundary=..." for the FormData body itself.
  const res = await api.post("/api/vision/analyze", form, {
    headers: { "Content-Type": undefined as unknown as string },
  });
  return res.data;
}

export async function getVisionHistory(userId: string) {
  const res = await api.get(`/api/vision/history/${userId}`);
  return res.data.records;
}
