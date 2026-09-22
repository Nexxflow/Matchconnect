import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle } from "lucide-react";
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
      setError("Please enter your password.");
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
      setError(err.message || "Something went wrong. Please try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#151715",
          border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
        }}
      >
        {step === 1 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                Delete your account
              </h3>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: isLight ? "#475569" : "#9ca3af" }}>
              This permanently deletes your profile, team memberships, match challenges and messages.
              This cannot be undone.
            </p>

            <div>
              <label className="text-xs font-semibold" style={{ color: isLight ? "#0f172a" : "#c8ccc8" }}>
                Enter your password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToConfirm()}
                autoFocus
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "#0d0f0d",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  color: isLight ? "#0f172a" : "#ffffff",
                }}
              />
            </div>

            {error && <p className="text-xs font-medium text-red-500">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  color: isLight ? "#0f172a" : "#c8ccc8",
                }}
              >
                Cancel
              </button>
              <button
                onClick={goToConfirm}
                className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-white"
                style={{ backgroundColor: "#dc2626" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                Are you sure?
              </h3>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: isLight ? "#475569" : "#9ca3af" }}>
              Your account and all its data will be permanently deleted. This action cannot be undone.
            </p>

            {error && <p className="text-xs font-medium text-red-500">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                disabled={loading}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  color: isLight ? "#0f172a" : "#c8ccc8",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-white"
                style={{
                  backgroundColor: "#dc2626",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {loading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}