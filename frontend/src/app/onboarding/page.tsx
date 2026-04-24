"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, upsertProfile, UserProfile } from "@/services/api";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export default function OnboardingPage() {
  const router = useRouter();
  const [next, setNext] = useState<string>("/chat");

  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [allergies, setAllergies] = useState("");
  const [chronic, setChronic] = useState("");
  const [meds, setMeds] = useState("");
  const [previousSymptoms, setPreviousSymptoms] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [lifestyle, setLifestyle] = useState("");

  useEffect(() => {
    (async () => {
      if (typeof window !== "undefined") {
        const qp = new URLSearchParams(window.location.search).get("next");
        if (qp) setNext(qp);
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/");
        return;
      }
      setUserId(data.user.id);
      const authFullName =
        (data.user.user_metadata?.full_name as string | undefined) || "";
      setFullName(authFullName);

      try {
        const res = await getProfile(data.user.id);
        if (res.profile) {
          const p = res.profile;
          setFullName(p.full_name || authFullName);
          setAge(p.age ? String(p.age) : "");
          setGender(p.gender || "");
          setBloodGroup(p.blood_group || "");
          setHeightCm(p.height_cm ? String(p.height_cm) : "");
          setWeightKg(p.weight_kg ? String(p.weight_kg) : "");
          setAllergies((p.allergies || []).join(", "));
          setChronic((p.chronic_conditions || []).join(", "));
          setMeds((p.current_medications || []).join(", "));
          setPreviousSymptoms(p.previous_symptoms || "");
          setFamilyHistory(p.family_history || "");
          setLifestyle(p.lifestyle || "");
        }
      } catch {
        // ignore — fresh profile
      }
    })();
  }, [router]);

  const toList = (s: string): string[] =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setError(null);

    if (!age || Number(age) < 1 || Number(age) > 129) {
      setError("Please enter a valid age.");
      return;
    }
    if (!gender) {
      setError("Please select a gender.");
      return;
    }

    const payload: UserProfile = {
      full_name: fullName || null,
      age: Number(age),
      gender,
      blood_group: bloodGroup || null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      allergies: toList(allergies),
      chronic_conditions: toList(chronic),
      current_medications: toList(meds),
      previous_symptoms: previousSymptoms || null,
      family_history: familyHistory || null,
      lifestyle: lifestyle || null,
    };

    setSaving(true);
    try {
      const res = await upsertProfile(userId, payload);
      if (res.is_complete) {
        router.push(next);
      } else {
        setError("Please fill in at least age and gender to continue.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save profile.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🩺</div>
          <h1 className="text-2xl font-bold text-gray-800">
            Tell us about yourself
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your health profile helps the bot give safer, more personalised
            advice. This is required before you can start chatting.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g. Ayesha Khan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={129}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="e.g. 28"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">Select...</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">—</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="e.g. 170"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="e.g. 65"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Known Allergies <span className="text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g. penicillin, peanuts, dust"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chronic Conditions <span className="text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={chronic}
              onChange={(e) => setChronic(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g. diabetes, hypertension, asthma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Medications <span className="text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={meds}
              onChange={(e) => setMeds(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g. metformin 500mg, losartan 50mg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Previous Symptoms / Past Medical History
            </label>
            <textarea
              value={previousSymptoms}
              onChange={(e) => setPreviousSymptoms(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g. had dengue in 2024, recurring migraines, ulcer history"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Family Medical History
            </label>
            <textarea
              value={familyHistory}
              onChange={(e) => setFamilyHistory(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g. father diabetic, mother hypertensive"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lifestyle Notes <span className="text-gray-400">(smoking, exercise, diet)</span>
            </label>
            <input
              type="text"
              value={lifestyle}
              onChange={(e) => setLifestyle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g. non-smoker, 30 min walk daily, vegetarian"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & continue"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Your data stays in your Supabase account and is used only to
            personalise bot responses.
          </p>
        </form>
      </div>
    </div>
  );
}
