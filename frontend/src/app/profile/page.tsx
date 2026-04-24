"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { getProfile, UserProfile } from "@/services/api";
import { FiUser, FiMail, FiEdit2 } from "react-icons/fi";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
  } | null>(null);
  const [health, setHealth] = useState<UserProfile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/");
        return;
      }
      setUser({
        id: data.user.id,
        email: data.user.email || "",
        fullName: data.user.user_metadata?.full_name || "User",
        createdAt: data.user.created_at,
      });
      try {
        const res = await getProfile(data.user.id);
        setHealth(res.profile);
      } catch {
        setHealth(null);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const list = (arr?: string[]) =>
    arr && arr.length ? arr.join(", ") : "—";

  return (
    <div className="flex h-screen">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Profile</h2>

          {user && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <FiUser className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {health?.full_name || user.fullName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Member since{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FiMail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-800">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FiUser className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">User ID</p>
                      <p className="text-sm font-mono text-gray-600">
                        {user.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Health Profile
                  </h3>
                  <button
                    onClick={() => router.push("/onboarding?next=/profile")}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 transition-colors"
                  >
                    <FiEdit2 className="w-3 h-3" /> Edit
                  </button>
                </div>

                {!health ? (
                  <p className="text-sm text-gray-500">
                    You haven&apos;t set up your health profile yet.
                  </p>
                ) : (
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-gray-500">Age</dt>
                      <dd className="text-gray-800">{health.age ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Gender</dt>
                      <dd className="text-gray-800 capitalize">
                        {health.gender?.replaceAll("_", " ") ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Blood group</dt>
                      <dd className="text-gray-800">
                        {health.blood_group || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Height / Weight</dt>
                      <dd className="text-gray-800">
                        {health.height_cm ? `${health.height_cm} cm` : "—"}
                        {" / "}
                        {health.weight_kg ? `${health.weight_kg} kg` : "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-gray-500">Allergies</dt>
                      <dd className="text-gray-800">
                        {list(health.allergies)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-gray-500">
                        Chronic conditions
                      </dt>
                      <dd className="text-gray-800">
                        {list(health.chronic_conditions)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-gray-500">
                        Current medications
                      </dt>
                      <dd className="text-gray-800">
                        {list(health.current_medications)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-gray-500">
                        Previous symptoms
                      </dt>
                      <dd className="text-gray-800 whitespace-pre-wrap">
                        {health.previous_symptoms || "—"}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="mt-6 w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
