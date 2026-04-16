"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getReminders, createReminder, deleteReminder } from "@/services/api";
import Sidebar from "@/components/Sidebar";
import { FiPlus, FiTrash2, FiClock } from "react-icons/fi";

interface Reminder {
  id: string;
  medicine: string;
  dosage: string;
  time: string;
  frequency: string;
}

export default function RemindersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [reminders, setRemindersList] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");
  const [frequency, setFrequency] = useState("daily");
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
    loadReminders();
  }, [user]);

  const loadReminders = async () => {
    if (!user) return;
    const data = await getReminders(user.id);
    setRemindersList(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await createReminder({
      user_id: user.id,
      medicine,
      dosage,
      time,
      frequency,
    });

    setMedicine("");
    setDosage("");
    setTime("08:00");
    setFrequency("daily");
    setShowForm(false);
    loadReminders();
  };

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    loadReminders();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const frequencyLabels: Record<string, string> = {
    daily: "Every day",
    twice_daily: "Twice a day",
    weekly: "Once a week",
    as_needed: "As needed",
  };

  return (
    <div className="flex h-screen">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Medication Reminders
              </h2>
              <p className="text-gray-500">
                Set reminders for your medications and follow-ups.
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
            >
              <FiPlus className="w-4 h-4" /> Add Reminder
            </button>
          </div>

          {/* Add Form */}
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                New Reminder
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medicine Name
                    </label>
                    <input
                      type="text"
                      value={medicine}
                      onChange={(e) => setMedicine(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="e.g. Paracetamol"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="e.g. 500mg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="twice_daily">Twice Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="as_needed">As Needed</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                  >
                    Save Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reminders List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💊</div>
              <h3 className="text-lg font-semibold text-gray-700">
                No reminders yet
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Click &quot;Add Reminder&quot; to set up medication reminders.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <FiClock className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {r.medicine}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {r.dosage} &middot; {r.time} &middot;{" "}
                        {frequencyLabels[r.frequency] || r.frequency}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    title="Delete reminder"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
