from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services import supabase_service

router = APIRouter(prefix="/api/profile", tags=["Profile"])


class ProfileUpsert(BaseModel):
    full_name: str | None = None
    age: int | None = Field(default=None, ge=1, le=129)
    gender: str | None = None  # male | female | other | prefer_not_to_say
    blood_group: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    allergies: list[str] = []
    chronic_conditions: list[str] = []
    current_medications: list[str] = []
    previous_symptoms: str | None = None
    family_history: str | None = None
    lifestyle: str | None = None


@router.get("/{user_id}")
async def get_profile(user_id: str):
    profile = await supabase_service.get_user_profile(user_id)
    if not profile:
        return {"profile": None, "is_complete": False}
    return {"profile": profile, "is_complete": bool(profile.get("is_complete"))}


@router.post("/{user_id}")
async def upsert_profile(user_id: str, body: ProfileUpsert):
    if body.gender and body.gender not in ("male", "female", "other", "prefer_not_to_say"):
        raise HTTPException(status_code=400, detail="Invalid gender value")
    try:
        profile = await supabase_service.upsert_user_profile(user_id, body.model_dump())
        return {"profile": profile, "is_complete": bool(profile.get("is_complete"))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
