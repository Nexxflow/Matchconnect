import React, { useState } from "react";
import { Bell, Pencil, LogOut, CheckCheck, Trash2, ExternalLink, Sun, Moon } from "lucide-react";
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
  onNotificationClick,
  theme = "dark",
  onToggleTheme,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Admin accounts only ever see the Dashboard tab in the top nav — no access
  // to the regular player-facing tabs (Find Match, Grounds, etc). Regular
  // users keep the full app experience starting from Home.
  const tabs = user?.is_admin
    ? ["Dashboard"]
    : ["Home", "Find Match", "Grounds", "Umpires", "Live Score", "Tournaments", "My Team"];
  const initials = (user?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = (item) => {
    setBellOpen(false);
    if (typeof onNotificationClick === "function") {
      onNotificationClick(item);
    } else {
      const type = String(item.type || item.data?.type || "").toLowerCase();
      const full = `${type} ${item.title || ""} ${item.body || ""}`.toLowerCase();
      if (full.includes("chat") || full.includes("message") || full.includes("accepted")) {
        setActive("My Team");
      } else if (full.includes("challenge")) {
        setActive("Find Match");
      } else if (full.includes("tournament")) {
        setActive("Tournaments");
      } else if (full.includes("ground")) {
        setActive("Grounds");
      } else if (full.includes("match") || full.includes("score") || full.includes("live")) {
        setActive("Live Score");
      } else if (full.includes("umpire")) {
        setActive("Umpires");
      } else if (full.includes("team")) {
        setActive("My Team");
      } else {
        setActive(user?.is_admin ? "Dashboard" : "Home");
      }
    }
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

  const getNotificationActionText = (item) => {
    const type = String(item.type || item.data?.type || "").toLowerCase();
    const full = `${type} ${item.title || ""} ${item.body || ""}`.toLowerCase();
    if (full.includes("chat") || full.includes("message")) return "Open Chat";
    if (full.includes("accepted") || full.includes("our match")) return "View Match in My Team";
    if (full.includes("tournament")) return "View Tournaments";
    if (full.includes("ground")) return "View Grounds";
    if (full.includes("umpire")) return "View Umpires";
    if (full.includes("live") || full.includes("score")) return "View Live Score";
    if (full.includes("challenge")) return "View Challenge";
    if (full.includes("team")) return "View Team";
    return "View";
  };

  const getNotificationIcon = (type) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("tournament")) return "🏆";
    if (t.includes("ground")) return "🏟️";
    if (t.includes("accepted")) return "🤝";
    if (t.includes("chat") || t.includes("message")) return "💬";
    if (t.includes("challenge") || t.includes("match")) return "🏏";
    if (t.includes("umpire")) return "⚖️";
    return "🔔";
  };

  return (
    <nav
      style={{
        backgroundColor: theme === "light" ? "#ffffff" : "#0d0f0d",
        borderColor: theme === "light" ? "#e2e8f0" : "#2a2a2a"
      }}
      className="sticky top-0 z-50 border-b backdrop-blur-sm transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between md:justify-start gap-2 sm:gap-6">
        <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => setActive(user?.is_admin ? "Dashboard" : "Home")}>
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-md shadow-green-500/20">
            <span className="text-black font-black text-sm">MC</span>
          </div>
          <span
            className="font-bold text-base tracking-tight hidden xs:inline"
            style={{ color: theme === "light" ? "#000000" : "#ffffff" }}
          >
            MatchConnect
          </span>
        </div>

        {/* Desktop / Tablet Navigation Tabs */}
        <div className="hidden md:flex flex-1 items-center justify-center overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={cn(
                  "relative px-3 py-4 text-sm font-medium transition-colors whitespace-nowrap",
                  active === tab
                    ? "text-green-500 font-semibold"
                    : theme === "light"
                      ? "text-black font-bold hover:text-green-600"
                      : "text-[#6b7a6b] hover:text-[#c8ccc8]"
                )}
              >
                {tab}
                {active === tab && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-green-500 rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        {/* Actions (Theme Toggle + Notification Bell + Profile) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto md:ml-0">
          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            style={{
              backgroundColor: theme === "light" ? "#f1f5f9" : "#1e211e",
              border: `1px solid ${theme === "light" ? "#e2e8f0" : "#2a2a2a"}`
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-85 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-slate-700 transition-colors" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400 transition-colors" />
            )}
          </button>

          {/* Notification Bell with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const next = !bellOpen;
                setBellOpen(next);
                if (next && typeof onOpenNotifications === "function") {
                  onOpenNotifications();
                }
              }}
              style={{
                backgroundColor: theme === "light" ? "#f1f5f9" : "#1e211e",
                border: `1px solid ${theme === "light" ? "#e2e8f0" : "#2a2a2a"}`
              }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center hover:opacity-85 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
              title="Notifications"
            >
              <Bell className={cn("w-4 h-4", theme === "light" ? "text-slate-600" : "text-[#c8ccc8]")} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-lg"
                  style={{ border: `2px solid ${theme === "light" ? "#ffffff" : "#0d0f0d"}` }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent" onClick={() => setBellOpen(false)} />
                <div
                  className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-11 w-auto sm:w-96 max-w-sm mx-auto sm:mx-0 rounded-2xl overflow-hidden z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    backgroundColor: theme === "light" ? "#ffffff" : "#151715",
                    border: `1px solid ${theme === "light" ? "#e2e8f0" : "#2a2a2a"}`
                  }}
                >
                  {/* Dropdown Header */}
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: theme === "light" ? "#f1f5f9" : "#242624" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}>
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-extrabold text-[10px]">
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
                            "p-3.5 flex items-start gap-3 transition cursor-pointer",
                            theme === "light" ? "hover:bg-slate-50" : "hover:bg-white/5",
                            !item.is_read ? (theme === "light" ? "bg-green-50/70" : "bg-green-500/[0.04]") : ""
                          )}
                        >
                          <span className="text-xl shrink-0 mt-0.5">{getNotificationIcon(item.type || item.data?.type)}</span>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate" style={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}>
                                {item.title}
                              </span>
                              {!item.is_read && (
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: theme === "light" ? "#475569" : "#cbd5e1" }}>
                              {item.body}
                            </p>
                            <div className="flex items-center justify-between text-[10px]" style={{ color: theme === "light" ? "#64748b" : "#64748b" }}>
                              <span>{formatNotificationTime(item.created_at)}</span>
                              <span className="text-green-500 hover:underline flex items-center gap-0.5 font-medium">
                                {getNotificationActionText(item)} <ExternalLink className="w-2.5 h-2.5" />
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
                  className="absolute right-0 top-11 w-48 rounded-xl overflow-hidden z-50 shadow-xl"
                  style={{
                    backgroundColor: theme === "light" ? "#ffffff" : "#151715",
                    border: `1px solid ${theme === "light" ? "#e2e8f0" : "#2a2a2a"}`
                  }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${theme === "light" ? "#f1f5f9" : "#2a2a2a"}` }}>
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-sm font-semibold truncate" style={{ color: theme === "light" ? "#000000" : "#ffffff" }}>
                        {user?.name}
                      </div>
                      {user?.is_admin && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono truncate" style={{ color: theme === "light" ? "#000000" : "#6b7a6b" }}>
                      {user?.phone || "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors"
                    style={{ color: theme === "light" ? "#000000" : "#c8ccc8" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Pencil className="w-3.5 h-3.5 text-green-500" /> Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-500 transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme === "light" ? "#fef2f2" : "rgba(255,255,255,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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
          theme={theme}
        />
      )}
    </nav>
  );
}