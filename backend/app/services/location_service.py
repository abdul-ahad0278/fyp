import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


async def find_nearby_places(lat: float, lng: float, place_type: str = "hospital", radius: int = 5000) -> list:
    """Find nearby hospitals, clinics, or pharmacies using Overpass API (OpenStreetMap).

    Args:
        lat: User's latitude
        lng: User's longitude
        place_type: "hospital", "clinic", "pharmacy", or "doctors"
        radius: Search radius in meters (default 5km)
    """
    query = f"""
    [out:json][timeout:10];
    (
      node["amenity"="{place_type}"](around:{radius},{lat},{lng});
      way["amenity"="{place_type}"](around:{radius},{lat},{lng});
    );
    out center body;
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                OVERPASS_URL,
                data={"data": query},
                timeout=15.0
            )
            data = response.json()

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
        print(f"Overpass API error: {e}")
        return []


def get_online_pharmacy_links(medicine_name: str) -> list:
    """Generate search links for online pharmacies in Pakistan."""
    encoded = medicine_name.replace(" ", "+")
    return [
        {"name": "Dvago", "url": f"https://dvago.pk/search?q={encoded}"},
        {"name": "Dawaai", "url": f"https://dawaai.pk/search?q={encoded}"},
        {"name": "Sehat", "url": f"https://sehat.com.pk/catalogsearch/result/?q={encoded}"},
    ]
