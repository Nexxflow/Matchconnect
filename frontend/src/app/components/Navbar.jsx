import React, { useState } from "react";
import { Bell, Pencil, LogOut } from "lucide-react";
import EditProfileModal from "./Auth/EditProfileModal.jsx";
import { cn } from "../utils/helpers.jsx";

export default function Navbar({ active, setActive, user, onLogout, token, onUserUpdated, pushCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const tabs = ["Home", "Find Match", "Grounds", "Umpires", "Live Score", "Tournaments", "My Team"];
  const initials = (user?.name || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={cn("relative px-3 py-4 text-sm font-medium transition-colors whitespace-nowrap", active === tab ? "text-green-400" : "text-[#6b7a6b] hover:text-[#c8ccc8]")}
              >
                {tab}
                {active === tab && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-green-500 rounded-full" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button style={{ backgroundColor: "#1e211e" }} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
            <Bell className="w-4 h-4 text-[#c8ccc8]" />
            {pushCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" style={{ border: "2px solid #0d0f0d" }} />}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-black font-bold text-sm cursor-pointer">
              {initials}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-48 rounded-xl overflow-hidden z-50" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}>
                  <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #2a2a2a" }}>
                    <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                    <div className="text-xs font-mono truncate" style={{ color: "#6b7a6b" }}>{user?.phone || "—"}</div>
                  </div>
                  <button onClick={() => { setMenuOpen(false); setEditing(true); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors" style={{ color: "#c8ccc8" }}>
                    <Pencil className="w-3.5 h-3.5 text-green-400" /> Edit Profile
                  </button>
                  <button onClick={() => { setMenuOpen(false); onLogout(); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-400 hover:bg-white/5 transition-colors">
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
          onSaved={updated => {
            onUserUpdated(updated);
            setEditing(false);
          }}
        />
      )}
    </nav>
  );
}
