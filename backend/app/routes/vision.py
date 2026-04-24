from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.services import gemini_service, supabase_service

router = APIRouter(prefix="/api/vision", tags=["Vision"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


@router.post("/analyze")
async def analyze(
    user_id: str = Form(...),
    mode: str = Form("symptom"),  # symptom | medicine | prescription
    note: str | None = Form(None),
    image: UploadFile = File(...),
):
    """MediScan — analyze a user-uploaded photo (rash / pill / prescription)."""
    profile = await supabase_service.get_user_profile(user_id)
    if not profile or not profile.get("is_complete"):
        raise HTTPException(
            status_code=412,
            detail={
                "code": "profile_incomplete",
                "message": "Please complete your health profile first.",
            },
        )

    mime = (image.content_type or "").lower()
    if mime not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {mime}")

    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 8 MB)")

    result = await gemini_service.analyze_image(
        image_bytes=data,
        mime_type=mime,
        mode=mode,
        user_note=note,
        profile=profile,
    )

    try:
        await supabase_service.save_vision_analysis(
            user_id=user_id,
            mode=result["mode"],
            user_note=note,
            detected_items=result["detected_items"],
            analysis=result["analysis"],
            severity=result["severity"],
            recommendations=result["recommendations"],
            warnings=result["warnings"],
        )
    except Exception as e:
        print(f"Failed saving vision analysis: {e}")

    return result


@router.get("/history/{user_id}")
async def history(user_id: str, limit: int = 20):
    records = await supabase_service.get_vision_history(user_id, limit=limit)
    return {"records": records}
