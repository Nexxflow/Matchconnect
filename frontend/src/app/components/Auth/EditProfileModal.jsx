import { useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Mail, Phone, Shield, MapPin, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "../../api";

function Field({ icon: Icon, isLight, required, label, ...props }) {
  return (
    <div>
      {label && (
        <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
          {Icon && <Icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {!label && Icon && (
          <Icon
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
            style={{ color: isLight ? "#94a3b8" : "#5f6b62" }}
          />
        )}
        <input
          {...props}
          className={`w-full rounded-xl py-2.5 text-sm outline-none transition-all border ${
            !label && Icon ? "pl-10 pr-3.5" : "px-3.5"
          } ${
            isLight
              ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
              : "bg-[#0d130e] border-[#233027] text-white placeholder:text-[#4a5a4a] focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/25"
          }`}
        />
      </div>
    </div>
  );
}

export default function EditProfileModal({ user, token, onClose, onSaved, theme = "dark" }) {
  const isLight = theme === "light";
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
    if (!token) {
      setError("You're not logged in. Please log in again and retry.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user: updated } = await apiRequest("/auth/profile", {
        method: "PUT",
        token,
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

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl relative shadow-2xl animate-in zoom-in-95 duration-200 border p-5 sm:p-6 space-y-4"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#0d120e",
          borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl z-10 pointer-events-none" />

        {/* Unified ModalHeader */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
              style={{
                backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.12)",
                borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.28)",
                color: isLight ? "#16a34a" : "#4ade80"
              }}
            >
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  Edit Profile
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                  style={{
                    backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.15)",
                    borderColor: isLight ? "#bbf7d0" : "rgba(34,197,94,0.3)",
                    color: isLight ? "#15803d" : "#4ade80"
                  }}
                >
                  Account Details
                </span>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
                Update your personal and team information
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-200 hover:rotate-90 hover:scale-105 active:scale-95 shrink-0"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "rgba(255,255,255,0.06)",
              borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
              color: isLight ? "#64748b" : "#9aa59c"
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div
              className="text-xs rounded-xl p-3 flex items-start gap-2 border font-medium"
              style={{
                backgroundColor: isLight ? "#fff1f2" : "rgba(239,68,68,0.1)",
                borderColor: isLight ? "#fecdd3" : "rgba(239,68,68,0.25)",
                color: isLight ? "#e11d48" : "#f87171"
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Field
            isLight={isLight}
            icon={User}
            required
            label="Full name"
            placeholder="Rahul Sharma"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <Field
            isLight={isLight}
            icon={Mail}
            type="email"
            required
            label="Email address"
            placeholder="rahul@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <Field
            isLight={isLight}
            icon={Phone}
            type="tel"
            required
            label="Phone number"
            placeholder="9876543210"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          {/* Section Divider */}
          <div className="pt-2 pb-1 flex items-center gap-2">
            <span className="h-px flex-1" style={{ backgroundColor: isLight ? "#e2e8f0" : "#1d2a21" }} />
            <span
              className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 border"
              style={{
                backgroundColor: isLight ? "#f1f5f9" : "#111812",
                borderColor: isLight ? "#e2e8f0" : "#1d2a21",
                color: isLight ? "#64748b" : "#9aa59c"
              }}
            >
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>Team & Club Details</span>
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: isLight ? "#e2e8f0" : "#1d2a21" }} />
          </div>

          <Field
            isLight={isLight}
            icon={Shield}
            label="Team name"
            placeholder="Chennai Super Kings Club"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              isLight={isLight}
              icon={MapPin}
              label="Village / City"
              placeholder="Chennai"
              value={villageName}
              onChange={e => setVillageName(e.target.value)}
            />
            <Field
              isLight={isLight}
              icon={Calendar}
              type="number"
              min="1900"
              max={currentYear}
              label="Year formed"
              placeholder={String(currentYear)}
              value={teamYear}
              onChange={e => setTeamYear(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "transparent",
                borderColor: isLight ? "#cbd5e1" : "#1d2a21",
                color: isLight ? "#334155" : "#c8ccc8"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                color: "#ffffff",
                boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Save Changes</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}