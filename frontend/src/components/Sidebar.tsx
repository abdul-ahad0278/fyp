"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiMessageSquare,
  FiClock,
  FiBell,
  FiMapPin,
  FiUser,
  FiLogOut,
  FiCamera,
} from "react-icons/fi";

const navItems = [
  { href: "/chat", label: "Chat", icon: FiMessageSquare },
  { href: "/mediscan", label: "MediScan", icon: FiCamera },
  { href: "/history", label: "Health History", icon: FiClock },
  { href: "/reminders", label: "Reminders", icon: FiBell },
  { href: "/nearby", label: "Nearby", icon: FiMapPin },
  { href: "/profile", label: "Profile", icon: FiUser },
];

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-emerald-600">
          🩺 HealthCare Bot
        </h1>
        <p className="text-xs text-gray-500 mt-1">AI Health Assistant</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
        >
          <FiLogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
