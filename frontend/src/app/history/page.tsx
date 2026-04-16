"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getHealthHistory } from "@/services/api";
import Sidebar from "@/components/Sidebar";

interface HealthRecord {
  id: string;
  date: string;
  symptoms: string[];
  conditions: string[];
  severity: string;
  emotion: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
      } else {
        setUser({ id: data.user.id });
      }
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    getHealthHistory(user.id)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const severityColor: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    emergency: "bg-red-100 text-red-700",
  };

  // Count frequent symptoms
  const symptomCounts: Record<string, number> = {};
  records.forEach((r) =>
    r.symptoms?.forEach((s) => {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    })
  );
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex h-screen">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Health History
          </h2>
          <p className="text-gray-500 mb-8">
            Track your symptoms and health patterns over time.
          </p>

          {/* Frequent Symptoms Summary */}
          {topSymptoms.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Most Frequent Symptoms
              </h3>
              <div className="flex flex-wrap gap-2">
                {topSymptoms.map(([symptom, count]) => (
                  <span
                    key={symptom}
                    className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm"
                  >
                    {symptom}{" "}
                    <span className="font-semibold">({count}x)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-700">
                No health records yet
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Start a chat and describe your symptoms to begin tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-800">
                      {new Date(record.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      {record.severity && (
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            severityColor[record.severity] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {record.severity}
                        </span>
                      )}
                      {record.emotion && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                          {record.emotion}
                        </span>
                      )}
                    </div>
                  </div>

                  {record.symptoms?.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 font-medium">
                        Symptoms:{" "}
                      </span>
                      {record.symptoms.map((s, i) => (
                        <span
                          key={i}
                          className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full mr-1 mb-1"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {record.conditions?.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 font-medium">
                        Possible conditions:{" "}
                      </span>
                      {record.conditions.map((c, i) => (
                        <span
                          key={i}
                          className="inline-block text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full mr-1 mb-1"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
