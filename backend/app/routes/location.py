from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.location_service import find_nearby_places, get_online_pharmacy_links

router = APIRouter(prefix="/api/location", tags=["Location"])


class NearbyRequest(BaseModel):
    lat: float
    lng: float
    place_type: str = "hospital"   # hospital, clinic, pharmacy, doctors
    radius: int = 5000             # meters


@router.post("/nearby")
async def get_nearby_places(req: NearbyRequest):
    """Find nearby hospitals, clinics, or pharmacies using OpenStreetMap."""
    valid_types = ["hospital", "clinic", "pharmacy", "doctors"]
    if req.place_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"place_type must be one of: {valid_types}")

    places = await find_nearby_places(
        lat=req.lat,
        lng=req.lng,
        place_type=req.place_type,
        radius=req.radius
    )
    return {"places": places, "count": len(places)}


@router.get("/pharmacies/online/{medicine_name}")
async def get_online_pharmacies(medicine_name: str):
    """Get online pharmacy search links for a medicine."""
    links = get_online_pharmacy_links(medicine_name)
    return {"pharmacy_links": links}
