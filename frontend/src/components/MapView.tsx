"use client";

import { useEffect, useState } from "react";
import { FiNavigation, FiPhone } from "react-icons/fi";

// Leaflet CSS must be imported in the page that uses this component
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icon issue with webpack/next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

interface Place {
  name: string;
  lat: number;
  lng: number;
  phone: string;
  address: string;
  directions_url: string;
}

interface MapViewProps {
  places: Place[];
  center: [number, number];
}

export default function MapView({ places, center }: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-[400px] rounded-xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place, idx) => (
        <Marker key={idx} position={[place.lat, place.lng]}>
          <Popup>
            <div className="text-sm">
              <strong>{place.name}</strong>
              {place.address && <p className="text-gray-500">{place.address}</p>}
              <div className="flex gap-2 mt-2">
                <a
                  href={place.directions_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 underline flex items-center gap-1"
                >
                  <FiNavigation className="w-3 h-3" /> Directions
                </a>
                {place.phone && (
                  <a
                    href={`tel:${place.phone}`}
                    className="text-blue-600 underline flex items-center gap-1"
                  >
                    <FiPhone className="w-3 h-3" /> Call
                  </a>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
