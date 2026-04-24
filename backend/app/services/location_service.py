import re
from urllib.parse import quote_plus

import httpx

OVERPASS_URLS = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

USER_AGENT = "HealthcareBot/1.0 (local development; contact: support@healthcare-bot.local)"


def _build_overpass_query(place_type: str, radius: int, lat: float, lng: float) -> str:
    """Build an Overpass query that covers common OSM tags for the requested place type."""
    tag_map = {
        "hospital": [("amenity", "hospital"), ("healthcare", "hospital")],
        "clinic": [("amenity", "clinic"), ("healthcare", "clinic")],
        "pharmacy": [("amenity", "pharmacy"), ("healthcare", "pharmacy")],
        "doctors": [("amenity", "doctors"), ("healthcare", "doctor"), ("healthcare", "doctors")],
    }

    tag_pairs = tag_map.get(place_type, [("amenity", place_type)])
    clauses = []
    for key, value in tag_pairs:
        clauses.append(f'node["{key}"="{value}"](around:{radius},{lat},{lng});')
        clauses.append(f'way["{key}"="{value}"](around:{radius},{lat},{lng});')

    return "\n    ".join([
        "[out:json][timeout:15];",
        "(",
        *clauses,
        ");",
        "out center body;",
    ])


async def find_nearby_places(lat: float, lng: float, place_type: str = "hospital", radius: int = 5000) -> list:
    """Find nearby hospitals, clinics, or pharmacies using Overpass API (OpenStreetMap).

    Args:
        lat: User's latitude
        lng: User's longitude
        place_type: "hospital", "clinic", "pharmacy", or "doctors"
        radius: Search radius in meters (default 5km)
    """
    query = _build_overpass_query(place_type, radius, lat, lng)

    try:
        async with httpx.AsyncClient(
            headers={
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
                "Referer": "http://localhost:3000",
            }
        ) as client:
            last_error: Exception | None = None
            for endpoint in OVERPASS_URLS:
                try:
                    response = await client.post(
                        endpoint,
                        data={"data": query},
                        timeout=20.0,
                    )

                    response.raise_for_status()

                    try:
                        data = response.json()
                    except ValueError as json_error:
                        snippet = response.text[:300].replace("\n", " ")
                        raise RuntimeError(
                            f"Non-JSON response from Overpass ({response.status_code}): {snippet}"
                        ) from json_error

                    if isinstance(data, dict) and data.get("elements") is not None:
                        break

                    raise RuntimeError("Overpass response did not contain elements")
                except Exception as endpoint_error:
                    last_error = endpoint_error
                    continue
            else:
                raise last_error or RuntimeError("All Overpass endpoints failed")

        places = []
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            # For 'way' elements, coordinates are in center
            el_lat = element.get("lat") or element.get("center", {}).get("lat")
            el_lng = element.get("lon") or element.get("center", {}).get("lon")

            if not el_lat or not el_lng:
                continue

            name = tags.get("name", f"Unknown {place_type.title()}")
            places.append({
                "name": name,
                "lat": el_lat,
                "lng": el_lng,
                "phone": tags.get("phone", ""),
                "address": tags.get("addr:full", tags.get("addr:street", "")),
                "website": tags.get("website", ""),
                "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={el_lat},{el_lng}",
            })

        # Sort by distance (approximate — using simple coordinate difference)
        places.sort(key=lambda p: ((p["lat"] - lat) ** 2 + (p["lng"] - lng) ** 2))
        return places[:10]  # Return top 10 nearest

    except Exception as e:
        print(f"Overpass API error: {type(e).__name__}: {e}")
        return []


def _normalize_medicine_query(medicine_name: str) -> str:
    """Strip dosage/form words so pharmacy search focuses on the drug name."""
    cleaned = (medicine_name or "").strip()
    cleaned = re.sub(r"\b\d+(?:\.\d+)?\s*(mg|mcg|g|ml|mls|tablet|tablets|capsule|capsules|syrup|drop|drops|injection|cream|ointment)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or (medicine_name or "").strip()


def get_online_pharmacy_links(medicine_name: str) -> list:
    """Generate search links for online pharmacies in Pakistan."""
    query = _normalize_medicine_query(medicine_name)
    encoded = quote_plus(query)
    return [
        {"name": "Dvago", "url": f"https://dvago.pk/search?q={encoded}"},
        {"name": "Dawaai", "url": f"https://dawaai.pk/search?q={encoded}"},
        {"name": "Sehat", "url": f"https://sehat.com.pk/catalogsearch/result/?q={encoded}"},
    ]
