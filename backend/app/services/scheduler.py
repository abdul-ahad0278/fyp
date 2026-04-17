"""
APScheduler job for sending medication reminders
"""
import asyncio
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.services import supabase_service, notification_service

scheduler = None


def _normalize_time_value(value) -> str:
    """Convert Supabase time values into HH:MM for comparison and logging."""
    if value is None:
        return ""

    if isinstance(value, str):
        parts = value.split(":")
        if len(parts) >= 2:
            return f"{parts[0]}:{parts[1]}"
        return value[:5]

    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")

    return str(value)[:5]


def start_scheduler():
    """Start the background scheduler for reminders."""
    global scheduler
    if scheduler is None:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            check_and_send_reminders_sync,  # Use sync wrapper
            trigger=IntervalTrigger(minutes=1),  # Check every minute
            id="reminder_check",
            name="Check and send medication reminders",
            replace_existing=True
        )
        scheduler.start()
        print("✓ Reminder scheduler started (checks every 1 minute)")


def stop_scheduler():
    """Stop the background scheduler."""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        scheduler = None
        print("✓ Reminder scheduler stopped")


async def check_and_send_reminders():
    """
    Check if any reminders are due and send notifications.
    Runs every minute via APScheduler.
    """
    try:
        current_time = datetime.now().strftime("%H:%M")
        print(f"⏱️ Reminder check running at {current_time}")
        
        # Get all active reminders
        result = supabase_service.supabase.table("reminders") \
            .select("*") \
            .eq("is_active", True) \
            .execute()
        
        active_reminders = result.data if result.data else []
        print(f"  Active reminders found: {len(active_reminders)}")
        
        if not active_reminders:
            return
        
        # Check which reminders are due at current time
        due_reminders = [
            r for r in active_reminders
            if _normalize_time_value(r.get("time")) == current_time
        ]
        print(
            "  Reminder times:",
            [
                {
                    "id": r.get("id"),
                    "medicine": r.get("medicine"),
                    "time": _normalize_time_value(r.get("time")),
                }
                for r in active_reminders
            ]
        )
        
        if not due_reminders:
            print("  No reminders due this minute")
            return
        
        print(f"\n⏰ Found {len(due_reminders)} reminder(s) due at {current_time}")
        
        # For each due reminder, send notification to user
        for reminder in due_reminders:
            user_id = reminder.get("user_id")
            medicine = reminder.get("medicine")
            dosage = reminder.get("dosage")
            time = reminder.get("time")
            
            # Get user's active push subscription
            subscription = await supabase_service.get_push_subscription(user_id)
            
            if subscription and subscription.get("subscription"):
                # Send push notification
                success = await notification_service.send_reminder_notification(
                    subscription=subscription.get("subscription"),
                    medicine=medicine,
                    dosage=dosage,
                    time=time
                )
                
                if success:
                    print(f"  ✓ Sent notification for {medicine} to user {user_id}")
                else:
                    print(f"  ✗ Failed to send notification for {medicine}")
            else:
                print(f"  ⚠ No active subscription for user {user_id}")
    
    except Exception as e:
        print(f"✗ Error in reminder scheduler: {str(e)}")


# If running in async context, wrap the check
def check_and_send_reminders_sync():
    """Sync wrapper for the async reminder check."""
    try:
        asyncio.run(check_and_send_reminders())
    except Exception as e:
        print(f"✗ Error in reminder scheduler (sync): {str(e)}")
