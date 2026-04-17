import json
from pywebpush import webpush, WebPushException
from py_vapid import Vapid
from app.config import VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL


def _get_vapid_private_key_for_webpush() -> str:
    """Convert escaped-newline PEM from env into valid PEM string."""
    return (VAPID_PRIVATE_KEY or "").replace("\\n", "\n").strip()


def _get_vapid_client() -> Vapid:
    """Build a VAPID client from the PEM private key."""
    vapid_private_key = _get_vapid_private_key_for_webpush().encode("utf-8")
    return Vapid.from_pem(vapid_private_key)

async def send_reminder_notification(
    subscription: dict,
    medicine: str,
    dosage: str,
    time: str
) -> bool:
    """
    Send a push notification for medication reminder
    
    Args:
        subscription: Push subscription object from client
        medicine: Medicine name
        dosage: Medicine dosage
        time: Reminder time (e.g., "08:00")
    
    Returns:
        True if sent successfully, False otherwise
    """
    
    message_data = {
        "title": "💊 Medication Reminder",
        "body": f"Time to take {medicine} ({dosage})",
        "tag": "medication-reminder",
        "time": time,
        "medicine": medicine
    }
    
    try:
        vapid_client = _get_vapid_client()
        webpush(
            subscription_info=subscription,
            data=json.dumps(message_data),
            vapid_private_key=vapid_client,
            vapid_claims={"sub": VAPID_EMAIL},
            timeout=10
        )
        print(f"Notification sent for {medicine} at {time}")
        return True
    except WebPushException as e:
        print(f"Push notification failed for {medicine}: {str(e)}")
        return False
    except Exception as e:
        print(f"Unexpected error sending notification: {str(e)}")
        return False


async def send_emergency_alert_notification(
    subscription: dict,
    conditions: list
) -> bool:
    """
    Send emergency alert notification
    
    Args:
        subscription: Push subscription object from client
        conditions: List of possible conditions
    
    Returns:
        True if sent successfully, False otherwise
    """
    
    message_data = {
        "title": "🚨 Emergency Alert",
        "body": "Your symptoms may indicate a serious condition. Seek immediate medical attention.",
        "tag": "emergency-alert",
        "conditions": conditions
    }
    
    try:
        vapid_client = _get_vapid_client()
        webpush(
            subscription_info=subscription,
            data=json.dumps(message_data),
            vapid_private_key=vapid_client,
            vapid_claims={"sub": VAPID_EMAIL},
            timeout=10
        )
        print("Emergency notification sent")
        return True
    except WebPushException as e:
        print(f"Emergency notification failed: {str(e)}")
        return False
    except Exception as e:
        print(f"Unexpected error sending emergency notification: {str(e)}")
        return False


def get_vapid_public_key() -> str:
    """
    Get VAPID public key for frontend
    
    Returns:
        Base64-encoded public key without padding
    """
    return VAPID_PUBLIC_KEY
