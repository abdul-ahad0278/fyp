"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { sendMessage, getConversations, getChatHistory, startNewConversation } from "@/services/api";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import VoiceInput from "@/components/VoiceInput";
import EmergencyAlert from "@/components/EmergencyAlert";
import { FiSend, FiPlus } from "react-icons/fi";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Message {
  role: "user" | "assistant";
  content: string;
  emotion?: string;
  symptoms?: string[];
  severity?: string;
  conditions?: string[];
  recommendations?: string[];
  needs_emergency?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; started_at: string }[]>([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  usePushNotifications(user?.id);

  // Check auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
      } else {
        setUser({ id: data.user.id, email: data.user.email || "" });
      }
    });
  }, [router]);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    getConversations(user.id).then(setConversations);
  }, [user]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await sendMessage(userMessage, user.id, conversationId || undefined);
      setConversationId(response.conversation_id);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.response,
          emotion: response.emotion,
          symptoms: response.symptoms,
          severity: response.severity,
          conditions: response.conditions,
          recommendations: response.recommendations,
          needs_emergency: response.needs_emergency,
        },
      ]);

      // Show emergency alert if needed
      if (response.needs_emergency) {
        setShowEmergency(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!user) return;
    const conv = await startNewConversation(user.id);
    setConversationId(conv.id);
    setMessages([]);
    getConversations(user.id).then(setConversations);
  };

  const loadConversation = async (convId: string) => {
    setConversationId(convId);
    const msgs = await getChatHistory(convId);
    setMessages(
      msgs.map((m: { role: string; content: string; emotion?: string; symptoms?: string[]; severity?: string; conditions?: string[]; recommendations?: string[] }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        emotion: m.emotion,
        symptoms: m.symptoms,
        severity: m.severity,
        conditions: m.conditions,
        recommendations: m.recommendations,
      }))
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
  };

  return (
    <div className="flex h-screen">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
            <p className="text-xs text-gray-500">
              Describe your symptoms — I&apos;ll help you understand them
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" /> New Chat
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Previous Conversations Sidebar */}
          <div className="w-56 bg-gray-50 border-r border-gray-200 overflow-y-auto hidden md:block">
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Recent Chats
              </h3>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-colors ${
                    conversationId === conv.id
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {new Date(conv.started_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-4">
                  No conversations yet
                </p>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-5xl mb-4">🩺</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Describe your symptoms in text or use the mic button for
                    voice input. I&apos;ll analyze them and provide guidance.
                  </p>
                  <div className="flex gap-2 mt-6">
                    {[
                      "I have a headache and fever",
                      "My throat is sore",
                      "I feel dizzy and tired",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-full hover:bg-emerald-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <ChatMessage key={i} {...msg} />
              ))}

              {loading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 max-w-3xl mx-auto">
                <VoiceInput onTranscript={handleVoiceTranscript} />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Describe your symptoms..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                This is an AI assistant — not a substitute for professional
                medical advice.
              </p>
            </div>
          </div>
        </div>
      </div>

      <EmergencyAlert
        show={showEmergency}
        onClose={() => setShowEmergency(false)}
      />
    </div>
  );
}
