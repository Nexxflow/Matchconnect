import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, X, Loader2, Lock } from "lucide-react";
import { apiRequest } from "../../api";

export default function DeleteAccountModal({ token, onClose, onDeleted, theme = "dark" }) {
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(1); // 1 = enter password, 2 = final confirm
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLight = theme === "light";

  const goToConfirm = () => {
    setError("");
    if (!password) {
      setError("Please enter your password to proceed.");
      return;
    }
    setStep(2);
  };

  const handleDelete = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("/auth/account", {
        method: "DELETE",
        body: { password },
        token,
      });
      onDeleted();
    } catch (err) {
      setError(err.message || "Something went wrong. Please check your password and try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl relative shadow-2xl animate-in zoom-in-95 duration-200 border p-5 sm:p-6 space-y-4"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#0f110f",
          borderColor: isLight ? "#fecdd3" : "#3a1d21",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 rounded-t-3xl z-10 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b" style={{ borderColor: isLight ? "#fee2e2" : "#2a1518" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
              style={{
                backgroundColor: isLight ? "#fff1f2" : "rgba(244,63,94,0.12)",
                borderColor: isLight ? "#fecdd3" : "rgba(244,63,94,0.28)",
                color: isLight ? "#e11d48" : "#fb7185"
              }}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  {step === 1 ? "Delete Account" : "Final Confirmation"}
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                  style={{
                    backgroundColor: isLight ? "#fff1f2" : "rgba(244,63,94,0.15)",
                    borderColor: isLight ? "#fecdd3" : "rgba(244,63,94,0.3)",
                    color: isLight ? "#e11d48" : "#fb7185"
                  }}
                >
                  Danger
                </span>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
                {step === 1 ? "Enter your password to verify ownership" : "Permanent and cannot be reversed"}
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

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed" style={{ color: isLight ? "#475569" : "#9ca3af" }}>
              This will permanently delete your profile, team memberships, challenges, and data.
            </p>

            <div>
              <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
                <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Enter your password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToConfirm()}
                autoFocus
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all border ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25"
                    : "bg-[#141212] border-[#2f1b1e] text-white placeholder:text-[#5a4044] focus:border-rose-500/70 focus:ring-2 focus:ring-rose-500/25"
                }`}
              />
            </div>

            {error && (
              <div
                className="text-xs rounded-xl p-3 flex items-start gap-2 border font-medium"
                style={{
                  backgroundColor: isLight ? "#fff1f2" : "rgba(239,68,68,0.1)",
                  borderColor: isLight ? "#fecdd3" : "rgba(239,68,68,0.25)",
                  color: isLight ? "#e11d48" : "#f87171"
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "transparent",
                  borderColor: isLight ? "#cbd5e1" : "#2a1518",
                  color: isLight ? "#334155" : "#c8ccc8"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={goToConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 text-white"
                style={{
                  background: "linear-gradient(135deg,#f43f5e 0%,#e11d48 50%,#be123c 100%)",
                  boxShadow: isLight ? "0 4px 14px -3px rgba(225,29,72,0.4)" : "0 6px 20px -6px rgba(244,63,94,0.6)"
                }}
              >
                <span>Continue</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div
              className="p-3.5 rounded-2xl border text-xs leading-relaxed"
              style={{
                backgroundColor: isLight ? "#fff1f2" : "rgba(244,63,94,0.08)",
                borderColor: isLight ? "#fecdd3" : "rgba(244,63,94,0.25)",
                color: isLight ? "#9f1239" : "#fda4af"
              }}
            >
              ⚠️ Are you absolutely sure? All your matches, chat messages, registered tournaments, and team data will be permanently purged from the system.
            </div>

            {error && (
              <div
                className="text-xs rounded-xl p-3 flex items-start gap-2 border font-medium"
                style={{
                  backgroundColor: isLight ? "#fff1f2" : "rgba(239,68,68,0.1)",
                  borderColor: isLight ? "#fecdd3" : "rgba(239,68,68,0.25)",
                  color: isLight ? "#e11d48" : "#f87171"
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "transparent",
                  borderColor: isLight ? "#cbd5e1" : "#2a1518",
                  color: isLight ? "#334155" : "#c8ccc8"
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-white"
                style={{
                  background: "linear-gradient(135deg,#e11d48 0%,#be123c 100%)",
                  boxShadow: isLight ? "0 4px 14px -3px rgba(225,29,72,0.4)" : "0 6px 20px -6px rgba(244,63,94,0.6)"
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}