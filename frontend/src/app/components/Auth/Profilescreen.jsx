import { useState } from "react";
import { User, Phone, Pencil } from "lucide-react";
import EditProfileModal from "./EditProfileModal";

// Compact profile "card". On tap/click it only ever shows name + phone —
// everything else (email, team name, village, year, password) lives behind
// the Edit Profile button so the at-a-glance view stays minimal.
export default function ProfileScreen({ user, onUserUpdated }) {
  const [editing, setEditing] = useState(false);

  const missingFields = [];
  if (!user?.name?.trim()) missingFields.push("Name");
  if (!user?.phone?.trim()) missingFields.push("Phone number");
  if (!user?.team_name?.trim()) missingFields.push("Team name");
  const isProfileIncomplete = missingFields.length > 0;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}>
      {isProfileIncomplete && (
        <div className="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-300" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <span className="font-bold text-amber-400 text-sm leading-none mt-0.5">⚠️</span>
          <div>
            <div className="font-semibold text-amber-200">Incomplete Profile Details</div>
            <div className="mt-0.5 text-amber-300/90">
              Please update your <strong>{missingFields.join(", ")}</strong> to post/accept challenges & host tournaments.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}
        >
          <User className="w-6 h-6 text-green-400" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold text-white truncate">{user.name || "Unnamed User"}</div>
          <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: "#6b7a6b" }}>
            <Phone className="w-3.5 h-3.5" style={{ color: "#4a5a4a" }} />
            <span className="font-mono">{user.phone || "No phone added"}</span>
          </div>
          {user.team_name && (
            <div className="text-xs text-green-400/90 font-medium mt-1 truncate">
              Team: {user.team_name}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f0f2f0" }}
      >
        <Pencil className="w-3.5 h-3.5 text-green-400" /> {isProfileIncomplete ? "Complete Required Profile" : "Edit Profile"}
      </button>

      {editing && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={updated => {
            onUserUpdated(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}