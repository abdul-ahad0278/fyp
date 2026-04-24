from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ───────────────── Conversations ─────────────────

async def create_conversation(user_id: str) -> dict:
    result = supabase.table("conversations").insert({
        "user_id": user_id,
        "is_active": True
    }).execute()
    return result.data[0]


async def get_active_conversation(user_id: str) -> dict | None:
    result = supabase.table("conversations") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("is_active", True) \
        .order("last_active", desc=True) \
        .limit(1) \
        .execute()
    return result.data[0] if result.data else None


async def update_conversation_activity(conversation_id: str):
    supabase.table("conversations") \
        .update({"last_active": "now()"}) \
        .eq("id", conversation_id) \
        .execute()


async def end_conversation(conversation_id: str):
    supabase.table("conversations") \
        .update({"is_active": False}) \
        .eq("id", conversation_id) \
        .execute()


async def get_user_conversations(user_id: str) -> list:
    result = supabase.table("conversations") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("last_active", desc=True) \
        .execute()
    return result.data


# ───────────────── Messages ─────────────────

async def save_message(
    conversation_id: str,
    role: str,
    content: str,
    emotion: str = None,
    symptoms: list = None,
    severity: str = None,
    conditions: list = None,
    recommendations: list = None,
    precautions: list = None
) -> dict:
    result = supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "emotion": emotion,
        "symptoms": symptoms or [],
        "severity": severity,
        "conditions": conditions or [],
        "recommendations": recommendations or [],
        "precautions": precautions or []
    }).execute()
    return result.data[0]


async def get_conversation_messages(conversation_id: str, limit: int = 10) -> list:
    result = supabase.table("messages") \
        .select("*") \
        .eq("conversation_id", conversation_id) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    return list(reversed(result.data))


# ───────────────── Health Records ─────────────────

async def save_health_record(
    user_id: str,
    symptoms: list,
    conditions: list,
    severity: str,
    emotion: str
) -> dict:
    result = supabase.table("health_records").insert({
        "user_id": user_id,
        "symptoms": symptoms or [],
        "conditions": conditions or [],
        "severity": severity,
        "emotion": emotion
    }).execute()
    return result.data[0]


async def get_health_history(user_id: str, limit: int = 50) -> list:
    result = supabase.table("health_records") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("date", desc=True) \
        .limit(limit) \
        .execute()
    return result.data


# ───────────────── Reminders ─────────────────

async def create_reminder(
    user_id: str,
    medicine: str,
    dosage: str,
    time: str,
    frequency: str
) -> dict:
    result = supabase.table("reminders").insert({
        "user_id": user_id,
        "medicine": medicine,
        "dosage": dosage,
        "time": time,
        "frequency": frequency,
        "is_active": True
    }).execute()
    return result.data[0]


async def get_user_reminders(user_id: str) -> list:
    result = supabase.table("reminders") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("is_active", True) \
        .order("time", desc=False) \
        .execute()
    return result.data


async def update_reminder(reminder_id: str, data: dict) -> dict:
    result = supabase.table("reminders") \
        .update(data) \
        .eq("id", reminder_id) \
        .execute()
    return result.data[0]


async def delete_reminder(reminder_id: str):
    supabase.table("reminders") \
        .update({"is_active": False}) \
        .eq("id", reminder_id) \
        .execute()


# ───────────────── User Profile ─────────────────

async def get_user_profile(user_id: str) -> dict | None:
    result = supabase.table("user_profiles") \
        .select("*") \
        .eq("user_id", user_id) \
        .limit(1) \
        .execute()
    return result.data[0] if result.data else None


async def upsert_user_profile(user_id: str, data: dict) -> dict:
    payload = {**data, "user_id": user_id}
    required = ["age", "gender"]
    payload["is_complete"] = all(payload.get(k) not in (None, "", []) for k in required)
    result = supabase.table("user_profiles") \
        .upsert(payload, on_conflict="user_id") \
        .execute()
    return result.data[0]


# ───────────────── Vision Analyses ─────────────────

async def save_vision_analysis(
    user_id: str,
    mode: str,
    user_note: str | None,
    detected_items: list,
    analysis: str,
    severity: str | None,
    recommendations: list,
    warnings: list,
) -> dict:
    result = supabase.table("vision_analyses").insert({
        "user_id": user_id,
        "mode": mode,
        "user_note": user_note,
        "detected_items": detected_items or [],
        "analysis": analysis,
        "severity": severity,
        "recommendations": recommendations or [],
        "warnings": warnings or [],
    }).execute()
    return result.data[0]


async def get_vision_history(user_id: str, limit: int = 20) -> list:
    result = supabase.table("vision_analyses") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    return result.data


# ───────────────── Push Subscriptions ─────────────────

async def save_push_subscription(user_id: str, subscription: dict) -> dict:
    """Create or update a user's push subscription."""
    result = supabase.table("push_subscriptions") \
        .upsert({
            "user_id": user_id,
            "subscription": subscription,
            "is_active": True,
        }, on_conflict="user_id") \
        .execute()
    return result.data[0]


async def get_push_subscription(user_id: str) -> dict | None:
    """Get active push subscription for a user."""
    result = supabase.table("push_subscriptions") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("is_active", True) \
        .limit(1) \
        .execute()
    return result.data[0] if result.data else None


async def deactivate_push_subscription(user_id: str):
    """Deactivate push subscription for a user."""
    supabase.table("push_subscriptions") \
        .update({"is_active": False}) \
        .eq("user_id", user_id) \
        .execute()
