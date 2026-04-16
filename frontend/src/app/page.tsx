"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FiMail, FiLock, FiArrowRight, FiActivity } from "react-icons/fi";

export default function HomePage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/chat");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;

        // If email confirmation is enabled in Supabase, session is null until user verifies email.
        if (!data.session) {
          setInfo(
            "Account created. Please check your inbox and confirm your email before signing in."
          );
          setIsLogin(true);
          return;
        }

        router.push("/chat");
      }
    } catch (err: unknown) {
      let message =
        err instanceof Error ? err.message : "Something went wrong";

      if (message.toLowerCase().includes("email not confirmed")) {
        message =
          "Your email is not confirmed yet. Please open your inbox, click the Supabase confirmation link, then sign in again.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F3F5F8]">
      {/* Left — Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-[#1f2b43]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(30,158,153,0.35),transparent_40%),radial-gradient(circle_at_30%_80%,rgba(26,196,160,0.22),transparent_35%),linear-gradient(140deg,#0d1c39_0%,#1d2e52_60%,#0a1730_100%)]" />
        <div className="relative z-10 w-full px-10 py-12 flex flex-col justify-between text-white">
          <div className="inline-flex items-center gap-3 text-3xl font-semibold">
            <span className="h-10 w-10 rounded-xl bg-[#1AC4A0] text-[#0B1B36] grid place-items-center">
              <FiActivity className="h-5 w-5" />
            </span>
            HealthCare Bot
          </div>

          <div className="max-w-xl">
            <h1 className="text-[52px] leading-[1.08] font-extrabold tracking-tight">
              Smarter health guidance.
              <span className="block text-[#37D8B4]">Better decisions.</span>
            </h1>
            <p className="mt-8 text-[18px] text-white/85 leading-relaxed max-w-3xl">
              AI-powered symptom support with history tracking, nearby care discovery,
              medication reminders, and emergency-first responses.
            </p>

            <div className="mt-10 space-y-4 text-white/90">
              <div className="flex items-start gap-5">
                <span className="text-[#37D8B4] font-semibold w-7 text-[12px] mt-1">01</span>
                <span className="text-[16px] leading-tight">Analyze symptoms with context-aware recommendations</span>
              </div>
              <div className="flex items-start gap-5">
                <span className="text-[#37D8B4] font-semibold w-7 text-[12px] mt-1">02</span>
                <span className="text-[16px] leading-tight">Track health patterns through persistent history</span>
              </div>
              <div className="flex items-start gap-5">
                <span className="text-[#37D8B4] font-semibold w-7 text-[12px] mt-1">03</span>
                <span className="text-[16px] leading-tight">Get urgent alerts and nearby hospital directions instantly</span>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-white/40">© 2026 HealthCare Bot. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <h2 className="text-[50px] font-bold text-[#0D2344] mb-2 leading-none">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-[#5F7491] text-[16px] mb-10 leading-tight">
            {isLogin
              ? "Sign in to continue to HealthCare Bot"
              : "Create your account to start your health journey"}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {info && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-[14px] font-semibold text-[#1A2A44] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-[#D6DCE5] bg-[#F8FAFC] rounded-2xl px-5 py-4 text-[14px] focus:ring-2 focus:ring-[#10A37F] focus:border-transparent outline-none"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[14px] font-semibold text-[#1A2A44] mb-2">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#90A0B8] h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#D6DCE5] bg-[#F8FAFC] rounded-2xl pl-12 pr-4 py-4 text-[14px] focus:ring-2 focus:ring-[#10A37F] focus:border-transparent outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-[#1A2A44] mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#90A0B8] h-5 w-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#D6DCE5] bg-[#F8FAFC] rounded-2xl pl-12 pr-4 py-4 text-[14px] focus:ring-2 focus:ring-[#10A37F] focus:border-transparent outline-none"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#10A37F] text-white py-4 rounded-2xl text-[18px] font-semibold hover:bg-[#0F936F] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
              <FiArrowRight className="h-5 w-5" />
            </button>
          </form>

          <p className="text-center text-[14px] text-[#5F7491] mt-10">
            {isLogin
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setInfo("");
              }}
              className="text-[#10A37F] font-semibold hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
