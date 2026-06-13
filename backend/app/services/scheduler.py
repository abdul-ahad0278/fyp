"""
Reminder checking logic.

This used to run on an in-process APScheduler timer, which required the
backend to stay alive 24/7. Instead, the check now runs on demand when an
external cron service (e.g. cron-job.org) calls POST /api/cron/check-reminders
every minute. This lets the backend run on a free, non-always-on host.
"""
from datetime import datetime
from app.services import supabase_service, notification_service


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


async def check_and_send_reminders() -> dict:
    """
    Check if any reminders are due and send notifications.
    Triggered once per minute by an external cron ping.

    Returns a small summary dict so the cron caller can see what happened.
    """
    sent = 0
    failed = 0
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
            return {"checked_at": current_time, "due": 0, "sent": 0, "failed": 0}

        # Check which reminders are due at current time
        due_reminders = [
            r for r in active_reminders
            if _normalize_time_value(r.get("time")) == current_time
        ]

        if not due_reminders:
            print("  No reminders due this minute")
            return {"checked_at": current_time, "due": 0, "sent": 0, "failed": 0}

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
                success = await notification_service.send_reminder_notification(
                    subscription=subscription.get("subscription"),
                    medicine=medicine,
                    dosage=dosage,
                    time=time
                )

                if success:
                    sent += 1
                    print(f"  ✓ Sent notification for {medicine} to user {user_id}")
                else:
                    failed += 1
                    print(f"  ✗ Failed to send notification for {medicine}")
            else:
                failed += 1
                print(f"  ⚠ No active subscription for user {user_id}")

        return {
            "checked_at": current_time,
            "due": len(due_reminders),
            "sent": sent,
            "failed": failed,
        }

    except Exception as e:
        print(f"✗ Error in reminder check: {str(e)}")
        return {"error": str(e), "sent": sent, "failed": failed}
