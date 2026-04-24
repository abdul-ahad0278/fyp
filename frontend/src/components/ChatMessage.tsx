"use client";

import { useEffect, useRef, useState } from "react";
import { FiVolume2, FiAlertTriangle, FiSquare, FiExternalLink, FiShoppingCart } from "react-icons/fi";
import { getOnlinePharmacyLinks } from "@/services/api";

interface PharmacyLink {
  name: string;
  url: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  emotion?: string;
  symptoms?: string[];
  severity?: string;
  conditions?: string[];
  recommendations?: string[];
  needs_emergency?: boolean;
}

export default function ChatMessage({
  role,
  content,
  emotion,
  symptoms,
  severity,
  conditions,
  recommendations,
  needs_emergency,
}: ChatMessageProps) {
  const isBot = role === "assistant";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pharmacyLinks, setPharmacyLinks] = useState<PharmacyLink[]>([]);
  const [medicineToShow, setMedicineToShow] = useState<string>("");
  const [loadingPharmacy, setLoadingPharmacy] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Extract medicine names from recommendations (e.g., "Take Paracetamol 500mg")
  const extractMedicineNames = (): string[] => {
    const medicineList = [
      "Paracetamol", "Aspirin", "Ibuprofen", "Amoxicillin", "Cough Syrup",
      "Antihistamine", "Omeprazole", "Metformin", "Atorvastatin", "Lisinopril",
      "Loratadine", "Acetaminophen", "Naproxen", "Ciprofloxacin", "Vitamin D"
    ];
    
    if (!recommendations) return [];
    
    const found: string[] = [];
    recommendations.forEach(rec => {
      medicineList.forEach(med => {
        if (rec.toLowerCase().includes(med.toLowerCase()) && !found.includes(med)) {
          found.push(med);
        }
      });
    });
    return found;
  };

  // Fetch pharmacy links for a specific medicine
  const fetchPharmacyLinks = async (medicine: string) => {
    if (!medicine.trim()) return;
    setLoadingPharmacy(true);
    try {
      const links = await getOnlinePharmacyLinks(medicine);
      setPharmacyLinks(links);
      setMedicineToShow(medicine);
    } catch (error) {
      console.error("Error fetching pharmacy links:", error);
    } finally {
      setLoadingPharmacy(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  };

  const speakText = () => {
    if (typeof window === "undefined") return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    // Stop any queued/active speech before starting a fresh read.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.rate = 0.9;
    utterance.onend = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (utteranceRef.current && typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const severityColor: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    emergency: "bg-red-100 text-red-700",
  };

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`max-w-[75%] rounded-2xl px-5 py-3 ${
          isBot
            ? "bg-white border border-gray-200 text-gray-800"
            : "bg-emerald-600 text-white"
        }`}
      >
        {/* Emergency Alert */}
        {needs_emergency && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-700">
              Emergency: Please seek immediate medical attention!
            </span>
          </div>
        )}

        {/* Message Text */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

        {/* Bot Message Metadata */}
        {isBot && (
          <div className="mt-3 space-y-2">
            {/* Severity Badge */}
            {severity && (
              <span
                className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
                  severityColor[severity] || "bg-gray-100 text-gray-700"
                }`}
              >
                Severity: {severity}
              </span>
            )}

            {/* Emotion Badge */}
            {emotion && (
              <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 ml-2">
                Mood: {emotion}
              </span>
            )}

            {/* Symptoms Tags */}
            {symptoms && symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {symptoms.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Conditions */}
            {conditions && conditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {conditions.map((c, i) => (
                  <span
                    key={i}
                    className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Recommendations & Medicine Links */}
            {recommendations && recommendations.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiShoppingCart className="w-4 h-4" />
                  Recommendations
                </div>
                <div className="space-y-2">
                  {recommendations.map((rec, i) => {
                    const medicines = extractMedicineNames();
                    const hasMedicine = medicines.some(med => rec.toLowerCase().includes(med.toLowerCase()));
                    return (
                      <div key={i} className="text-xs text-gray-700">
                        <p className="mb-1">• {rec}</p>
                        {hasMedicine && (
                          <button
                            onClick={() => {
                              const med = medicines.find(m => rec.toLowerCase().includes(m.toLowerCase()));
                              if (med) fetchPharmacyLinks(med);
                            }}
                            className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-full inline-flex items-center gap-1 transition"
                          >
                            <FiExternalLink className="w-3 h-3" />
                            Buy Online
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Online Pharmacy Links Modal */}
                {pharmacyLinks.length > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-800 mb-2">
                      Buy {medicineToShow} Online:
                    </p>
                    <div className="space-y-1">
                      {pharmacyLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          <FiExternalLink className="w-3 h-3" />
                          {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {loadingPharmacy && (
                  <div className="text-xs text-gray-500 mt-2">Loading pharmacy links...</div>
                )}
              </div>
            )}

            {/* Speak Button */}
            <button
              onClick={speakText}
              className={`transition-colors mt-1 ${
                isSpeaking
                  ? "text-red-500 hover:text-red-600"
                  : "text-gray-400 hover:text-emerald-600"
              }`}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              {isSpeaking ? (
                <FiSquare className="w-4 h-4" />
              ) : (
                <FiVolume2 className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
