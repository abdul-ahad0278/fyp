"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import {
  analyzeImage,
  getProfile,
  VisionMode,
  VisionResult,
} from "@/services/api";
import {
  FiCamera,
  FiFileText,
  FiActivity,
  FiAlertTriangle,
  FiUpload,
  FiX,
} from "react-icons/fi";

const MODES: {
  value: VisionMode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "symptom",
    title: "Symptom photo",
    subtitle: "Rash, wound, eye, swelling",
    icon: FiActivity,
  },
  {
    value: "medicine",
    title: "Medicine identifier",
    subtitle: "Pill, tablet, blister, syrup",
    icon: FiCamera,
  },
  {
    value: "prescription",
    title: "Prescription reader",
    subtitle: "Handwritten or printed Rx",
    icon: FiFileText,
  },
];

const SEVERITY_STYLE: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  emergency: "bg-red-100 text-red-700",
};

export default function MediScanPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [mode, setMode] = useState<VisionMode>("symptom");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/");
        return;
      }
      setUserId(data.user.id);
      try {
        const res = await getProfile(data.user.id);
        if (!res.is_complete) {
          router.push("/onboarding?next=/mediscan");
          return;
        }
        setProfileReady(true);
      } catch {
        router.push("/onboarding?next=/mediscan");
      }
    })();
  }, [router]);

  const onPick = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!userId || !file) return;
    setLoading(true);
    setError(null);
    try {
      const r = await analyzeImage({ userId, mode, file, note: note || undefined });
      setResult(r);
    } catch (e) {
      if (
        axios.isAxiosError(e) &&
        e.response?.status === 412 &&
        e.response?.data?.detail?.code === "profile_incomplete"
      ) {
        router.push("/onboarding?next=/mediscan");
        return;
      }
      let msg = "Failed to analyze image";
      if (axios.isAxiosError(e)) {
        const detail = e.response?.data?.detail;
        if (typeof detail === "string") msg = detail;
        else if (detail && typeof detail === "object" && "message" in detail) {
          msg = String((detail as { message?: string }).message || msg);
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!profileReady) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FiCamera className="w-6 h-6 text-indigo-600" /> MediScan
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Upload a photo and get an AI visual analysis. Works for skin
              symptoms, unknown medicines, and doctor&apos;s prescriptions. Your
              health profile is used to flag warnings automatically.
            </p>
          </div>

          {/* Mode picker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    active
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${
                      active ? "text-indigo-600" : "text-gray-500"
                    }`}
                  />
                  <div className="font-semibold text-sm text-gray-800">
                    {m.title}
                  </div>
                  <div className="text-xs text-gray-500">{m.subtitle}</div>
                </button>
              );
            })}
          </div>

          {/* Uploader */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            {!preview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">
                  Upload or take a clear photo in good light
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPick(f);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                >
                  Choose image
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="preview"
                  className="w-full max-h-80 object-contain rounded-lg bg-gray-50"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-white/90 border border-gray-200 rounded-full p-2 hover:bg-white"
                  aria-label="Remove image"
                >
                  <FiX className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Optional note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === "symptom"
                    ? "e.g. rash appeared 2 days ago, itches at night"
                    : mode === "medicine"
                    ? "e.g. found in dad's drawer, can I take it for fever?"
                    : "e.g. prescription from Dr. Ahmed, 12 April"
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze with MediScan"}
            </button>

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Analysis</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full capitalize ${
                    SEVERITY_STYLE[result.severity] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  Severity: {result.severity}
                </span>
              </div>

              {result.response && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {result.response}
                </p>
              )}

              {result.detected_items.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Detected
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.detected_items.map((d, i) => (
                      <span
                        key={i}
                        className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-red-700 uppercase mb-1 flex items-center gap-1">
                    <FiAlertTriangle className="w-3 h-3" /> Warnings for you
                  </h4>
                  <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Recommendations
                  </h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                    {result.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.needs_emergency && (
                <div className="bg-red-600 text-white rounded-lg p-3 text-sm font-semibold">
                  This may be an emergency — please seek medical help
                  immediately. Emergency helpline: 1122
                </div>
              )}

              <p className="text-xs text-gray-400">
                AI analysis is informational only. Please confirm with a
                qualified doctor before taking action.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
