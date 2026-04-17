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


# ──────────────────── DEBUG/TEST ENDPOINTS ────────────────

@router.post("/test/create-reminder")
async def test_create_reminder(
    user_id: str,
    medicine: str,
    dosage: str,
    time: str  # Format: "HH:MM" e.g. "16:20"
):
    """
    Test endpoint to create a reminder without full request body.
    Use this to quickly test reminder notifications.
    
    Example: POST /api/reminders/test/create-reminder?user_id=<uid>&medicine=paracetamol&dosage=500mg&time=16:20
    """
    try:
        reminder = await supabase_service.create_reminder(
            user_id=user_id,
            medicine=medicine,
            dosage=dosage,
            time=time,
            frequency="daily"
        )
        return {
            "message": f"✓ Reminder created! Will send notification at {time}",
            "reminder": reminder
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test/send-now")
async def test_send_now(
    user_id: str,
    medicine: str = "Paracetamol",
    dosage: str = "500mg",
    time: str = "now"
):
    """
    Immediately send a push notification to the user's active subscription.
    Use this to verify browser popup delivery without waiting for the scheduler.
    """
    try:
        subscription = await supabase_service.get_push_subscription(user_id)
        if not subscription or not subscription.get("subscription"):
            raise HTTPException(status_code=404, detail="No active push subscription found for user")

        success = await notification_service.send_reminder_notification(
            subscription=subscription.get("subscription"),
            medicine=medicine,
            dosage=dosage,
            time=time,
        )

        return {
            "message": "Push send attempted",
            "success": success,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
