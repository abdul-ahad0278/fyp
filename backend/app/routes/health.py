from fastapi import APIRouter
from app.services import supabase_service

router = APIRouter(prefix="/api/health", tags=["Health History"])


@router.get("/history/{user_id}")
async def get_health_history(user_id: str, limit: int = 50):
    """Get user's health history (symptoms, conditions, severity over time)."""
    records = await supabase_service.get_health_history(user_id, limit=limit)
    return {"records": records}
