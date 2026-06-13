"""
Cron-triggered endpoints.

An external scheduler (cron-job.org) pings these on a fixed interval, replacing
the old in-process APScheduler. Protected by a shared secret so only the cron
job can trigger them.
"""
from fastapi import APIRouter, Header, Query, HTTPException
from app.config import CRON_SECRET
from app.services import scheduler

router = APIRouter(prefix="/api/cron", tags=["Cron"])


def _verify_secret(token: str | None, header_secret: str | None) -> None:
    """Allow the request only if the secret matches (via header or query param)."""
    provided = header_secret or token
    if not CRON_SECRET or provided != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing cron secret")


@router.post("/check-reminders")
async def check_reminders(
    token: str | None = Query(default=None),
    x_cron_secret: str | None = Header(default=None),
):
    """
    Check for due medication reminders and send push notifications.
    Call this every minute from an external cron service.

    Auth: pass the secret either as ?token=... or as the X-Cron-Secret header.
    """
    _verify_secret(token, x_cron_secret)
    summary = await scheduler.check_and_send_reminders()
    return {"ok": True, "result": summary}
