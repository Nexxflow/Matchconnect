import { useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Mail, Phone, Shield, MapPin, Calendar, AlertCircle } from "lucide-react";
import { apiRequest } from "../../api";

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4a5a4a" }} />
      <input
        {...props}
        className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f0f2f0" }}
        onFocus={e => (e.target.style.borderColor = "#22c55e")}
        onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
      />
    </div>
  );
}

// Full profile editor — mirrors every field collected at signup (name,
// email, phone, team name, village, year founded). Password changes are
// handled separately (e.g. via "Forgot password"), not from this form.
export default function EditProfileModal({ user, onClose, onSaved }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [teamName, setTeamName] = useState(user.team_name || "");
  const [villageName, setVillageName] = useState(user.village_name || "");
  const [teamYear, setTeamYear] = useState(user.team_year || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentYear = new Date().getFullYear();

  const handleSubmit = async e => {
    e.preventDefault();
    if (teamYear && (Number(teamYear) < 1900 || Number(teamYear) > currentYear)) {
      setError(`Team year must be between 1900 and ${currentYear}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user: updated } = await apiRequest("/auth/profile", {
        method: "PUT",
        body: {
          name,
          email,
          phone,
          team_name: teamName || undefined,
          village_name: villageName || undefined,
          team_year: teamYear || undefined
        }
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message || "Could not update profile");
    } finally {
      setLoading(false);
    }
  };

  // The overlay itself scrolls (not just the card) and uses a min-h-full
  // flex wrapper so the card is always centered — both horizontally and
  // vertically — whether the viewport is short, tall, or the keyboard is
  // open on mobile. If the card content is taller than the viewport it
  // still scrolls into view instead of getting clipped off-center.
  const modal = (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999 }}
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-2xl p-6"
          style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Edit Profile</h2>
            <button type="button" onClick={onClose} style={{ color: "#6b7a6b" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div
                className="text-xs mb-1 rounded-lg p-2.5 flex items-start gap-2"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <Field icon={User} required placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <Field icon={Phone} type="tel" required placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />

            <div className="pt-1 pb-0.5 flex items-center gap-1.5">
              <span className="h-px flex-1" style={{ backgroundColor: "#2a2a2a" }} />
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#6b7a6b" }}>Team details</span>
              <span className="h-px flex-1" style={{ backgroundColor: "#2a2a2a" }} />
            </div>

            <Field icon={Shield} placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} />
            <Field icon={MapPin} placeholder="Village / town name" value={villageName} onChange={e => setVillageName(e.target.value)} />
            <Field
              icon={Calendar}
              type="number"
              min="1900"
              max={currentYear}
              placeholder="Year team was formed"
              value={teamYear}
              onChange={e => setTeamYear(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-colors"
              style={loading ? { backgroundColor: "#1e211e", color: "#3a3a3a" } : { backgroundColor: "#22c55e", color: "#000" }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // Portal straight to <body>. This is the key fix: if EditProfileModal is
  // rendered *inside* ProfileScreen's normal DOM position, any ancestor up
  // the tree with a `transform`, `filter`, `perspective`, or `will-change`
  // style turns into a containing block for `position: fixed` elements —
  // so the overlay stops covering the real viewport and can end up
  // rendered behind later siblings/parents instead of on top of the page.
  // Mounting via a portal on document.body sidesteps that entirely.
  return createPortal(modal, document.body);
}