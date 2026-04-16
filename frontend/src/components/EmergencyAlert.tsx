"use client";

import { useEffect, useState } from "react";
import { FiAlertTriangle, FiNavigation, FiPhone } from "react-icons/fi";
import { getNearbyPlaces } from "@/services/api";

interface Place {
  name: string;
  lat: number;
  lng: number;
  phone: string;
  address: string;
  directions_url: string;
}

interface EmergencyAlertProps {
  show: boolean;
  onClose: () => void;
}

export default function EmergencyAlert({ show, onClose }: EmergencyAlertProps) {
  const [hospitals, setHospitals] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const places = await getNearbyPlaces(latitude, longitude, "hospital");
        setHospitals(places);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-red-600 text-white p-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold">Emergency Alert</h2>
              <p className="text-sm text-red-100">
                Your symptoms may indicate a serious condition
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Please seek <strong>immediate medical attention</strong>. Here are
            the nearest hospitals:
          </p>

          {loading ? (
            <div className="text-center py-4 text-gray-500">
              Finding nearby hospitals...
            </div>
          ) : hospitals.length > 0 ? (
            <div className="space-y-3">
              {hospitals.slice(0, 5).map((h, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-gray-800">{h.name}</h3>
                  {h.address && (
                    <p className="text-xs text-gray-500 mt-1">{h.address}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <a
                      href={h.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full hover:bg-emerald-200"
                    >
                      <FiNavigation className="w-3 h-3" /> Directions
                    </a>
                    {h.phone && (
                      <a
                        href={`tel:${h.phone}`}
                        className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200"
                      >
                        <FiPhone className="w-3 h-3" /> Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Could not find nearby hospitals. Please call emergency services
              (1122).
            </p>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium">
              Emergency Helpline: <strong>1122</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
