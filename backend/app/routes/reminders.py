from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import supabase_service
from app.services import notification_service

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


class ReminderCreate(BaseModel):
    user_id: str
    medicine: str
    dosage: str
    time: str        # e.g. "08:00" or "20:00"
    frequency: str   # e.g. "daily", "twice_daily", "weekly"


class ReminderUpdate(BaseModel):
    medicine: str | None = None
    dosage: str | None = None
    time: str | None = None
    frequency: str | None = None
    is_active: bool | None = None


class PushSubscription(BaseModel):
    user_id: str
    subscription: dict  # Push subscription object from client


@router.post("/subscribe")
async def subscribe_to_notifications(req: PushSubscription):
    """Subscribe user to push notifications."""
    try:
        saved = await supabase_service.save_push_subscription(
            user_id=req.user_id,
            subscription=req.subscription
        )
        return {
            "message": "Subscribed to push notifications",
            "subscription_active": True,
            "subscription_id": saved.get("id")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/public-key")
async def get_notification_public_key():
    """Get VAPID public key for frontend."""
    return {
        "vapid_public_key": notification_service.get_vapid_public_key()
    }


@router.post("/create")
async def create_reminder(req: ReminderCreate):
    """Create a new medication reminder."""
    try:
        reminder = await supabase_service.create_reminder(
            user_id=req.user_id,
            medicine=req.medicine,
            dosage=req.dosage,
            time=req.time,
            frequency=req.frequency
        )
        return {"reminder": reminder}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_reminders(user_id: str):
    """Get all active reminders for a user."""
    reminders = await supabase_service.get_user_reminders(user_id)
    return {"reminders": reminders}


@router.put("/update/{reminder_id}")
async def update_reminder(reminder_id: str, req: ReminderUpdate):
    """Update an existing reminder."""
    try:
        update_data = req.model_dump(exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        reminder = await supabase_service.update_reminder(reminder_id, update_data)
        return {"reminder": reminder}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete/{reminder_id}")
async def delete_reminder(reminder_id: str):
    """Soft delete a reminder (set is_active to false)."""
    try:
        await supabase_service.delete_reminder(reminder_id)
        return {"message": "Reminder deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
