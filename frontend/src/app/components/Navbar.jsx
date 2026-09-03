import React, { useState } from "react";
import { Bell, Pencil, LogOut, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import EditProfileModal from "./Auth/EditProfileModal.jsx";
import { cn } from "../utils/helpers.jsx";

export default function Navbar({
  active,
  setActive,
  user,
  onLogout,
  token,
  onUserUpdated,
  notifications = [],
  onMarkAllRead,
  onClearNotifications,
  onOpenNotifications,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const tabs = ["Home", "Find Match", "Grounds", "Umpires", "Live Score", "Tournaments", "My Team"];
  const initials = (user?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = (item) => {
    const type = item.type || item.data?.type || "";
    if (type.includes("challenge")) {
      setActive("Find Match");
    } else if (type.includes("tournament")) {
      setActive("Tournaments");
    } else if (type.includes("ground")) {
      setActive("Grounds");
    } else if (type.includes("match")) {
      setActive("Live Score");
    } else if (type.includes("team")) {
      setActive("My Team");
    }
    setBellOpen(false);
  };

  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getNotificationIcon = (type) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("tournament")) return "🏆";
    if (t.includes("ground")) return "🏟️";
    if (t.includes("accepted")) return "🤝";
    if (t.includes("challenge") || t.includes("match")) return "🏏";
    return "🔔";
  };

  return (
    <nav style={{ backgroundColor: "#0d0f0d" }} className="sticky top-0 z-50 border-b border-[#2a2a2a] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <span className="text-black font-black text-sm">MC</span>
          </div>
          <span className="font-bold text-white text-base tracking-tight">MatchConnect</span>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={cn(
                  "relative px-3 py-4 text-sm font-medium transition-colors whitespace-nowrap",
                  active === tab ? "text-green-400" : "text-[#6b7a6b] hover:text-[#c8ccc8]"
                )}
              >
                {tab}
                {active === tab && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-green-500 rounded-full" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Notification Bell with Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                const next = !bellOpen;
                setBellOpen(next);
                if (next && typeof onOpenNotifications === "function") {
                  onOpenNotifications();
                }
              }}
              style={{ backgroundColor: "#1e211e" }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[#c8ccc8]" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-lg"
                  style={{ border: "2px solid #0d0f0d" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                <div
                  className="absolute right-0 top-11 w-80 sm:w-96 rounded-2xl overflow-hidden z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                  style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}
                >
                  {/* Dropdown Header */}
                  <div className="px-4 py-3 border-b border-[#242624] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-extrabold text-[10px]">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && onMarkAllRead && (
                        <button
                          onClick={onMarkAllRead}
                          className="text-[11px] text-green-400 hover:text-green-300 font-semibold flex items-center gap-1 transition"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Read
                        </button>
                      )}
                      {notifications.length > 0 && onClearNotifications && (
                        <button
                          onClick={onClearNotifications}
                          className="text-[11px] text-slate-400 hover:text-red-400 font-semibold flex items-center gap-1 transition"
                          title="Clear all"
                        >
                          <Trash2 className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#1e211e]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <div className="text-3xl">🔔</div>
                        <div className="text-xs font-semibold text-slate-300">No Notifications</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Match challenges, tournaments, grounds, and team match updates will appear here in real-time.
                        </p>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={cn(
                            "p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-white/5",
                            !item.is_read ? "bg-green-500/[0.04]" : ""
                          )}
                        >
                          <span className="text-xl shrink-0 mt-0.5">{getNotificationIcon(item.type || item.data?.type)}</span>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white truncate">
                                {item.title}
                              </span>
                              {!item.is_read && (
                                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                              {item.body}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>{formatNotificationTime(item.created_at)}</span>
                              <span className="text-green-400 hover:underline flex items-center gap-0.5">
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-black font-bold text-sm cursor-pointer"
            >
              {initials}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-11 w-48 rounded-xl overflow-hidden z-50"
                  style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #2a2a2a" }}>
                    <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                    <div className="text-xs font-mono truncate" style={{ color: "#6b7a6b" }}>
                      {user?.phone || "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors"
                    style={{ color: "#c8ccc8" }}
                  >
                    <Pencil className="w-3.5 h-3.5 text-green-400" /> Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EditProfileModal
          user={user}
          token={token}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            onUserUpdated(updated);
            setEditing(false);
          }}
        />
      )}
    </nav>
  );
}
