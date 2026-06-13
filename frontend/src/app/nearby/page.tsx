"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getNearbyPlaces } from "@/services/api";
import Sidebar from "@/components/Sidebar";
import dynamic from "next/dynamic";
import { FiNavigation, FiPhone, FiSearch } from "react-icons/fi";

// Dynamic import for MapView (Leaflet requires window)
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Place {
  name: string;
  lat: number;
  lng: number;
  phone: string;
  address: string;
  directions_url: string;
}

export default function NearbyPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeType, setPlaceType] = useState("hospital");
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/");
    });
  }, [router]);

  const findPlaces = () => {
    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        const results = await getNearbyPlaces(latitude, longitude, placeType);
        setPlaces(results);
        setLoading(false);
      },
      () => {
        setError("Location access denied. Please enable location in your browser settings.");
        setLoading(false);
      }
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const placeTypes = [
    { value: "hospital", label: "Hospitals" },
    { value: "clinic", label: "Clinics" },
    { value: "pharmacy", label: "Pharmacies" },
    { value: "doctors", label: "Doctors" },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Nearby Hospitals & Pharmacies
          </h2>
          <p className="text-gray-500 mb-6">
            Find healthcare facilities near your current location.
          </p>

          {/* Search Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {placeTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setPlaceType(type.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  placeType === type.value
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type.label}
              </button>
            ))}
            <button
              onClick={findPlaces}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 ml-auto"
            >
              <FiSearch className="w-4 h-4" />
              {loading ? "Searching..." : "Find Nearby"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6">
              {error}
            </div>
          )}

          {/* Map */}
          {userLocation && (
            <div className="mb-6">
              <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
              />
              <MapView places={places} center={userLocation} />
            </div>
          )}

          {/* Results List */}
          {places.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Found {places.length} {placeType}(s) nearby
              </h3>
              {places.map((place, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {place.name}
                    </h4>
                    {place.address && (
                      <p className="text-sm text-gray-500 mt-1">
                        {place.address}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={place.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      <FiNavigation className="w-4 h-4" /> Directions
                    </a>
                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <FiPhone className="w-4 h-4" /> Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && places.length === 0 && userLocation && (
            <div className="text-center py-8 text-gray-500">
              No {placeType}s found nearby. Try increasing the search radius.
            </div>
          )}

          {!userLocation && !loading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-lg font-semibold text-gray-700">
                Enable Location Access
              </h3>
              <p className="text-sm text-gray-500 mt-2 mb-4">
                Click &quot;Find Nearby&quot; to search for hospitals and pharmacies near
                you.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
