import React from "react";
import { X, FileText, CheckCircle2 } from "lucide-react";
import TermsContent from "./TermsContent";

export default function TermsModal({ isOpen, onClose, onAccept, theme = "dark" }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5"
      style={{ backgroundColor: theme === "light" ? "rgba(15, 23, 42, 0.5)" : "rgba(0, 0, 0, 0.82)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: theme === "light" ? "#ffffff" : "#131513",
          border: `1px solid ${theme === "light" ? "#e2e8f0" : "#2a332a"}`,
          maxHeight: "88vh"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme === "light" ? "#f8fafc" : "#161916",
            borderBottom: `1px solid ${theme === "light" ? "#e2e8f0" : "#242924"}`
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-green-500 shrink-0"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.25)" }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight" style={{ color: theme === "light" ? "#000000" : "#ffffff" }}>Terms &amp; Conditions</h2>
              <p className="text-xs mt-0.5 font-medium" style={{ color: theme === "light" ? "#000000" : "#9ca3af" }}>
                MatchConnect &mdash; Last updated: September 2026
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
            style={{ backgroundColor: theme === "light" ? "#f1f5f9" : "#202420", color: theme === "light" ? "#000000" : "#a3a3a3" }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pr-3">
          <TermsContent theme={theme} />
        </div>

        {/* Modal Footer */}
        <div
          className="p-4 flex items-center justify-end gap-2.5 shrink-0"
          style={{ backgroundColor: theme === "light" ? "#f8fafc" : "#161916", borderTop: `1px solid ${theme === "light" ? "#e2e8f0" : "#242924"}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ backgroundColor: theme === "light" ? "#f1f5f9" : "#202420", color: theme === "light" ? "#334155" : "#d4d4d4" }}
          >
            Close
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              style={{
                backgroundColor: theme === "light" ? "#16a34a" : "#22c55e",
                color: theme === "light" ? "#ffffff" : "#000",
                boxShadow: theme === "light" ? "0 2px 10px rgba(22, 163, 74, 0.3)" : "0 2px 10px rgba(34, 197, 94, 0.3)"
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Accept Terms &amp; Conditions</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
