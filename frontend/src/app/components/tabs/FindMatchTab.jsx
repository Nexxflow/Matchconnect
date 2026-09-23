import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Calendar, Clock, Filter, Search, ChevronDown, MapPin, CheckCircle, Phone, XCircle, AlertCircle, Users, Star, RotateCcw, Sparkles, Zap } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "../../api";
import { C, cn, Tag, GhostButton, normalizePhone, formatDateIST } from "../../utils/helpers.jsx";
import { FORMATS, DEFAULT_OVERS } from "../../utils/constants";
import TeamDetailsModal from "../TeamDetailsModal.jsx";
import CalendarField from "../CalendarField.jsx";

const challengePinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#22c55e"/>
    <circle cx="12" cy="9" r="3.5" fill="#0d0f0d"/>
  </svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const FORMAT_THEMES = {
  T20: {
    accent: "#10b981",
    bgActiveDark: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(6,78,59,0.12) 100%)",
    bgActiveLight: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    borderActiveDark: "#10b981",
    borderActiveLight: "#059669",
    glowDark: "0 0 20px -3px rgba(16,185,129,0.28)",
    glowLight: "0 6px 16px -2px rgba(16,185,129,0.22)",
    pillDark: "rgba(16,185,129,0.18)",
    pillLight: "#d1fae5",
  },
  ODI: {
    accent: "#0ea5e9",
    bgActiveDark: "linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(3,105,161,0.12) 100%)",
    bgActiveLight: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    borderActiveDark: "#0ea5e9",
    borderActiveLight: "#0284c7",
    glowDark: "0 0 20px -3px rgba(14,165,233,0.28)",
    glowLight: "0 6px 16px -2px rgba(14,165,233,0.22)",
    pillDark: "rgba(14,165,233,0.18)",
    pillLight: "#e0f2fe",
  },
  Turf: {
    accent: "#f59e0b",
    bgActiveDark: "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(180,83,9,0.12) 100%)",
    bgActiveLight: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    borderActiveDark: "#f59e0b",
    borderActiveLight: "#d97706",
    glowDark: "0 0 20px -3px rgba(245,158,11,0.28)",
    glowLight: "0 6px 16px -2px rgba(245,158,11,0.22)",
    pillDark: "rgba(245,158,11,0.18)",
    pillLight: "#fef3c7",
  },
  Test: {
    accent: "#a855f7",
    bgActiveDark: "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(126,34,206,0.12) 100%)",
    bgActiveLight: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
    borderActiveDark: "#a855f7",
    borderActiveLight: "#9333ea",
    glowDark: "0 0 20px -3px rgba(168,85,247,0.28)",
    glowLight: "0 6px 16px -2px rgba(168,85,247,0.22)",
    pillDark: "rgba(168,85,247,0.18)",
    pillLight: "#f3e8ff",
  }
};

function toISODate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDateDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function to24Hour(hour12, minute, ampm) {
  let h = Number(hour12) % 12;
  if (ampm === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}
function from24Hour(timeStr) {
  if (!timeStr) return { hour12: "6", minute: "00", ampm: "AM" };
  const [hStr, mStr] = timeStr.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { hour12: String(h), minute: mStr || "00", ampm };
}
function formatTimeDisplay(timeStr) {
  if (!timeStr) return "";
  const { hour12, minute, ampm } = from24Hour(timeStr);
  return `${hour12}:${minute} ${ampm}`;
}



function TimeField({ value, onChange, theme }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const [open, setOpen] = useState(false);
  const { hour12, minute, ampm } = from24Hour(value);

  const set = (nextHour, nextMinute, nextAmpm) => onChange(to24Hour(nextHour, nextMinute, nextAmpm));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl px-3 py-2 text-sm text-left focus:outline-none flex items-center justify-between transition-colors shadow-sm"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#111",
          border: `1px solid ${open ? (isLight ? "#16a34a" : "#22c55e") : (isLight ? "#e2e8f0" : "#2a2a2a")}`,
          color: value ? (isLight ? "#0f172a" : "#fff") : (isLight ? "#94a3b8" : "#4a5a4a")
        }}
      >
        <span>{value ? formatTimeDisplay(value) : "Select a time"}</span>
        <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 sm:bg-black/30" onClick={() => setOpen(false)} />
          <div
            className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:left-0 top-1/2 -translate-y-1/2 sm:top-[calc(100%+6px)] sm:translate-y-0 z-50 rounded-2xl p-4 w-auto sm:w-60 max-w-xs mx-auto sm:mx-0 shadow-2xl"
            style={{
              backgroundColor: isLight ? "#ffffff" : "#151715",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              boxShadow: isLight ? "0 20px 30px -5px rgba(15,23,42,0.15)" : "0 20px 40px rgba(0,0,0,0.8)"
            }}
          >
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-xs mb-1 block text-center font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Hour</label>
                <select
                  value={hour12}
                  onChange={e => set(e.target.value, minute, ampm)}
                  className="w-full rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none"
                  style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block text-center font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Min</label>
                <select
                  value={minute}
                  onChange={e => set(hour12, e.target.value, ampm)}
                  className="w-full rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none"
                  style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
                >
                  {["00", "15", "30", "45"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block text-center font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>&nbsp;</label>
                <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }}>
                  {["AM", "PM"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set(hour12, minute, p)}
                      className="flex-1 py-1.5 text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: ampm === p ? (isLight ? "#16a34a" : "#22c55e") : (isLight ? "#f8fafc" : "#111"),
                        color: ampm === p ? "#ffffff" : (isLight ? "#64748b" : "#6b7a6b")
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
              style={{ backgroundColor: isLight ? "#16a34a" : "#22c55e", color: "#ffffff" }}
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChallengeForm({ token, user, onCreated, disabledReason, grounds = [], autoOpen = false, onAutoOpenHandled, theme }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const emptyForm = {
    team_name: user?.team_name || "",
    format: "T20",
    overs: DEFAULT_OVERS.T20,
    match_date: "",
    time_slot: "",
    hasGround: false,
    ground_id: "",
    ground_custom: "",
    note: ""
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const contact = user?.phone || "";
  const normalizedContact = normalizePhone(contact);

  useEffect(() => {
    if (user?.team_name && !form.team_name) {
      setForm(prev => ({ ...prev, team_name: user.team_name }));
    }
  }, [user]);

  useEffect(() => {
    if (autoOpen && !disabledReason) {
      setOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpen, disabledReason]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const checkProfileCompleteness = () => {
    const missing = [];
    if (!user?.name?.trim()) missing.push("Name");
    if (!contact.trim() || normalizedContact.length < 10) missing.push("Phone number");
    if (!form.team_name.trim() && !user?.team_name?.trim()) missing.push("Team name");

    if (missing.length > 0) {
      const msg = `Please update your required profile details (${missing.join(", ")}) in the Profile page first.`;
      alert(msg);
      return msg;
    }
    return null;
  };

  const handleFormatChange = newFormat => {
    setForm(prev => ({ ...prev, format: newFormat, overs: DEFAULT_OVERS[newFormat] ?? "" }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    const profileErr = checkProfileCompleteness();
    if (profileErr) return setError(profileErr);

    if (!form.team_name.trim()) return setError("Team name is required.");
    if (normalizedContact.length < 10 || normalizedContact.length > 15) {
      return setError("Your account doesn't have a valid phone number on file. Please update your profile first.");
    }
    if (!form.format) return setError("Match format is required.");
    if (!form.match_date) return setError("Match date is required.");
    if (!form.time_slot) return setError("Match time is required.");
    if (form.hasGround && form.ground_id === "other" && !form.ground_custom.trim()) {
      return setError("Enter the ground name, or pick one from the list.");
    }
    if (form.hasGround && !form.ground_id) return setError("Select a ground, or mark ground as not booked yet.");
    if (form.format !== "Test" && form.overs !== "" && (isNaN(Number(form.overs)) || Number(form.overs) < 1 || Number(form.overs) > 90)) {
      return setError("Overs must be a whole number between 1 and 90.");
    }
    if (!token) return setError("You need to be logged in to post a challenge.");

    setSubmitting(true);
    try {
      const res = await apiRequest("/challenges", {
        method: "POST",
        token,
        body: {
          team_name: form.team_name.trim(),
          contact_no: normalizedContact,
          format: form.format,
          overs: form.format !== "Test" && form.overs !== "" ? Number(form.overs) : null,
          match_date: form.match_date,
          time_slot: form.time_slot,
          ground_id: form.hasGround
            ? (form.ground_id === "other" ? null : form.ground_id)
            : null,
          ground_name: form.hasGround && form.ground_id === "other" ? form.ground_custom.trim() : null,
          note: form.note.trim() || null
        }
      });
      onCreated(res.challenge);
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not post challenge — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTriggerButton = () => (
    <button
      type="button"
      onClick={() => {
        const err = checkProfileCompleteness();
        if (err) return;
        setOpen(true);
      }}
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer",
        isLight
          ? "bg-[#16a34a] text-white hover:bg-[#15803d] shadow-sm"
          : "bg-green-500 text-black hover:bg-green-400"
      )}
    >
      <Plus className="w-4 h-4" /> Post a Match Challenge
    </button>
  );

  if (disabledReason) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        className={cn(
          "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 cursor-not-allowed opacity-60",
          isLight
            ? "bg-[#16a34a] text-white shadow-sm"
            : "bg-green-500 text-black"
        )}
      >
        <Plus className="w-4 h-4" /> Post a Match Challenge
      </button>
    );
  }

  return (
    <>
      {renderTriggerButton()}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
        >
      <form
        onSubmit={handleSubmit}
        className={cn(C, "w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]")}
        style={{
          backgroundColor: isLight ? "#ffffff" : "#151715",
          border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
          boxShadow: isLight ? "0 20px 50px rgba(15,23,42,0.15)" : "0 20px 40px rgba(0,0,0,0.8)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#2a2a2a" }}>
          <span className="text-base font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Post a Match Challenge</span>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null); }}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
            style={{ backgroundColor: isLight ? "#f1f5f9" : "#222" }}
          >
            <X className="w-4 h-4" style={{ color: isLight ? "#475569" : "#c8ccc8" }} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="col-span-2">
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Team name</label>
            <input
              value={form.team_name}
              readOnly
              disabled
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold cursor-not-allowed"
              style={{ backgroundColor: isLight ? "#f8fafc" : "#151515", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#64748b" : "#6b7a6b" }}
              placeholder="Team Name"
            />
            <p className="text-xs mt-1" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>From your user account profile.</p>
          </div>

          <div className="col-span-2">
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Contact number</label>
            <input
              value={contact}
              readOnly
              disabled
              className="w-full rounded-xl px-3 py-2 text-sm font-mono cursor-not-allowed"
              style={{ backgroundColor: isLight ? "#f8fafc" : "#151515", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#64748b" : "#6b7a6b" }}
            />
            <p className="text-xs mt-1" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>From your account. Only shared with the team that accepts your challenge.</p>
          </div>

          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Format</label>
            <div className="relative">
              <select
                value={form.format}
                onChange={e => handleFormatChange(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm appearance-none pr-7 focus:outline-none"
                style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
              >
                {FORMATS.map(f => <option key={f.key} value={f.key}>{f.title}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
              Overs {form.format !== "Test" && <span style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>(default {DEFAULT_OVERS[form.format]})</span>}
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={form.overs}
              onChange={e => update("overs", e.target.value)}
              placeholder={form.format === "Test" ? "Not applicable" : String(DEFAULT_OVERS[form.format])}
              disabled={form.format === "Test"}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
            />
          </div>

          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Ground booked?</label>
            <div className="relative">
              <select
                value={form.hasGround ? "yes" : "no"}
                onChange={e => update("hasGround", e.target.value === "yes")}
                className="w-full rounded-xl px-3 py-2 text-sm appearance-none pr-7 focus:outline-none"
                style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
              >
                <option value="no">Not booked yet</option>
                <option value="yes">Already booked</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Match date</label>
            <CalendarField value={form.match_date} onChange={v => update("match_date", v)} theme={theme} />
          </div>

          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Match time</label>
            <TimeField value={form.time_slot} onChange={v => update("time_slot", v)} theme={theme} />
          </div>

          {form.hasGround && (
            <div className="col-span-2">
              <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Ground</label>
              {grounds.length > 0 ? (
                <>
                  <div className="relative">
                    <select
                      value={form.ground_id}
                      onChange={e => update("ground_id", e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm appearance-none pr-7 focus:outline-none"
                      style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
                    >
                      <option value="">Select a ground</option>
                      {grounds.map(g => <option key={g.id ?? g.name} value={g.id ?? g.name}>{g.name}{g.area ? ` — ${g.area}` : ""}</option>)}
                      <option value="other">Other / not listed</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
                  </div>
                  {form.ground_id === "other" && (
                    <input
                      value={form.ground_custom}
                      onChange={e => update("ground_custom", e.target.value)}
                      className="w-full mt-2 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
                      placeholder="Ground name"
                    />
                  )}
                </>
              ) : (
                <input
                  value={form.ground_custom}
                  onChange={e => { update("ground_custom", e.target.value); update("ground_id", "other"); }}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
                  placeholder="Green Park Cricket Ground"
                />
              )}
            </div>
          )}

          <div className="col-span-2">
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Description</label>
            <textarea
              value={form.note}
              onChange={e => update("note", e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
              placeholder="Looking for a friendly T20 match, intermediate level..."
            />
          </div>
        </div>

        {error && (
          <div
            className="text-xs rounded-lg p-2 font-medium"
            style={{
              backgroundColor: isLight ? "#fef2f2" : "rgba(239,68,68,0.1)",
              border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.2)"}`,
              color: isLight ? "#dc2626" : "#f87171"
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !normalizedContact}
          className={cn(
            "w-full py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer",
            isLight
              ? "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm"
              : "bg-green-500 text-black hover:bg-green-400"
          )}
          style={(submitting || !normalizedContact) ? { opacity: 0.6, cursor: "not-allowed" } : {}}
        >
          {submitting ? "Posting..." : "Post Challenge"}
        </button>
      </form>
    </div>
  )}
</>
);
}

function AcceptChallengeModal({ challenge, token, user, hasActiveAcceptedChallenge, onClose, onAccepted, theme }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const [teamName, setTeamName] = useState(user?.team_name || "");
  const contact = user?.phone || "";
  const normalizedContact = normalizePhone(contact);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.team_name && !teamName) {
      setTeamName(user.team_name);
    }
  }, [user]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (hasActiveAcceptedChallenge) {
      return setError("You already have an active accepted match challenge. Cancel it in 'My Team' before accepting another.");
    }
    const missing = [];
    if (!user?.name?.trim()) missing.push("Name");
    if (!contact.trim() || normalizedContact.length < 10) missing.push("Phone number");
    if (!teamName.trim()) missing.push("Team name");

    if (missing.length > 0) {
      const msg = `Please update your required profile details (${missing.join(", ")}) in the Profile page first.`;
      alert(msg);
      return setError(msg);
    }

    if (!token) return setError("You need to be logged in to accept a challenge.");

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest(`/challenges/${challenge.id}/accept`, {
        method: "POST",
        token,
        body: { team_name: teamName.trim(), contact_no: contact.trim() }
      });
      onAccepted(res.challenge);
    } catch (err) {
      setError(err.message || "Could not accept challenge — it may no longer be open.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.7)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#151715",
          border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
          boxShadow: isLight ? "0 20px 50px rgba(15,23,42,0.15)" : "none"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Accept Challenge vs {challenge.team}</span>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
            style={{ backgroundColor: isLight ? "#f1f5f9" : "#222" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: isLight ? "#475569" : "#c8ccc8" }} />
          </button>
        </div>
        <p className="text-xs mb-3 font-normal" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
          Share your team name so {challenge.team} can reach you to lock in details. Both numbers stay private until you accept.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Your team name</label>
            <input
              value={teamName}
              readOnly
              disabled
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold cursor-not-allowed"
              style={{ backgroundColor: isLight ? "#f8fafc" : "#151515", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#64748b" : "#6b7a6b" }}
              placeholder="Your team name"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Contact number</label>
            <input
              value={contact}
              readOnly
              disabled
              className="w-full rounded-xl px-3 py-2 text-sm font-mono cursor-not-allowed"
              style={{ backgroundColor: isLight ? "#f8fafc" : "#151515", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#64748b" : "#6b7a6b" }}
            />
            <p className="text-xs mt-1" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>From your account. Update it in your profile if it's wrong.</p>
          </div>
        </div>
        {error && (
          <div
            className="text-xs rounded-lg p-2 mt-3 font-medium"
            style={{
              backgroundColor: isLight ? "#fef2f2" : "rgba(239,68,68,0.1)",
              border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.2)"}`,
              color: isLight ? "#dc2626" : "#f87171"
            }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !contact}
          className="w-full py-2.5 rounded-xl font-bold text-sm mt-4 transition-colors shadow-sm cursor-pointer"
          style={{
            backgroundColor: isLight ? "#16a34a" : "#22c55e",
            color: "#ffffff",
            boxShadow: isLight ? "0 2px 8px rgba(22,163,74,0.25)" : "none",
            ...((submitting || !contact) ? { opacity: 0.6, cursor: "not-allowed" } : {})
          }}
        >
          {submitting ? "Accepting..." : "Confirm & Accept"}
        </button>
      </form>
    </div>
  );
}

function ChatModal({ challenge, token, onClose, theme }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const load = async () => {
    try {
      const res = await apiRequest(`/challenges/${challenge.id}/messages`, { token });
      setMessages(res.messages);
    } catch (err) {
      setError(err.message || "Could not load chat history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const body = text.trim();
    setText("");
    try {
      const res = await apiRequest(`/challenges/${challenge.id}/messages`, {
        method: "POST",
        token,
        body: { body }
      });
      setMessages(prev => [...prev, res.message]);
    } catch (err) {
      setError(err.message || "Message failed to send.");
      setText(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.7)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5 flex flex-col shadow-2xl"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#151715",
          border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
          height: "70vh",
          maxHeight: 520,
          boxShadow: isLight ? "0 20px 50px rgba(15,23,42,0.15)" : "none"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Match Chat</div>
            <div className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{challenge.team_name} vs {challenge.accepted_by_team_name}</div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
            style={{ backgroundColor: isLight ? "#f1f5f9" : "#222" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: isLight ? "#475569" : "#c8ccc8" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
          {loading && <div className="text-xs text-center py-6" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>Loading chat history...</div>}
          {!loading && messages.length === 0 && <div className="text-xs text-center py-6" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>No messages yet — say hello!</div>}
          {messages.map(m => (
            <div key={m.id} className="max-w-[80%]" style={{ marginLeft: m.sender_team_name === challenge.myTeamName ? "auto" : 0 }}>
              <div className="text-xs px-1 mb-0.5" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>{m.sender_team_name}</div>
              <div
                className="rounded-xl px-3 py-2 text-xs"
                style={m.sender_team_name === challenge.myTeamName
                  ? { backgroundColor: isLight ? "#16a34a" : "#22c55e", color: "#ffffff" }
                  : { backgroundColor: isLight ? "#f1f5f9" : "#1a1a1a", color: isLight ? "#1e293b" : "#c8ccc8", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }
                }
              >
                {m.body}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div
            className="text-xs rounded-lg p-2 mb-2 font-medium"
            style={{
              backgroundColor: isLight ? "#fef2f2" : "rgba(239,68,68,0.1)",
              border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.2)"}`,
              color: isLight ? "#dc2626" : "#f87171"
            }}
          >
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#111",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              color: isLight ? "#0f172a" : "#fff"
            }}
            placeholder="Type a message..."
          />
          <button
            onClick={send}
            disabled={sending}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            style={{
              backgroundColor: isLight ? "#16a34a" : "#22c55e",
              color: "#ffffff",
              ...(sending ? { opacity: 0.6, cursor: "not-allowed" } : {})
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function DateCalendarPicker({ value, onChange, theme }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const wrapRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toISO = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const quickPicks = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: new Date(today.getTime() + 86400000) },
    {
      label: "This Weekend",
      date: (() => {
        const day = today.getDay();
        const offset = day === 6 || day === 0 ? 0 : 6 - day;
        return new Date(today.getTime() + offset * 86400000);
      })()
    }
  ];

  const selectedISO = value || null;

  return (
    <div className="relative" ref={wrapRef}>
      <label className="text-xs mb-1.5 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Date</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl px-3 py-2 text-xs flex items-center justify-between focus:outline-none transition-colors shadow-sm"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#111",
          border: open ? (isLight ? "1px solid #16a34a" : "1px solid #22c55e") : (isLight ? "1px solid #e2e8f0" : "1px solid #2a2a2a"),
          color: value ? (isLight ? "#0f172a" : "#fff") : (isLight ? "#94a3b8" : "#c8ccc8")
        }}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
          {value
            ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "Any Date"}
        </span>
        {value && <X className="w-3 h-3 shrink-0" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} onClick={e => { e.stopPropagation(); onChange(null); }} />}
      </button>

      {open && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 mt-2 rounded-2xl p-3 w-64 shadow-2xl"
          style={{
            backgroundColor: isLight ? "#ffffff" : "#161616",
            border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
            boxShadow: isLight ? "0 12px 32px rgba(15,23,42,0.12)" : "0 12px 32px rgba(0,0,0,0.5)"
          }}
        >
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              style={!value
                ? (isLight ? { backgroundColor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" } : { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid #22c55e" })
                : (isLight ? { backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" } : { backgroundColor: "#1e211e", color: "#8a938a", border: "1px solid #2a2a2a" })}
            >
              Any Date
            </button>
            {quickPicks.map(q => {
              const iso = toISO(q.date);
              const active = selectedISO === iso;
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => { onChange(iso); setViewDate(q.date); setOpen(false); }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={active
                    ? (isLight ? { backgroundColor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" } : { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid #22c55e" })
                    : (isLight ? { backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" } : { backgroundColor: "#1e211e", color: "#8a938a", border: "1px solid #2a2a2a" })}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded-lg transition-colors" style={{ color: isLight ? "#0f172a" : "#6b7a6b" }}>
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
            </button>
            <span className="text-xs font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{monthLabel}</span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded-lg transition-colors" style={{ color: isLight ? "#0f172a" : "#6b7a6b" }}>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = toISO(d);
              const isPast = d < today;
              const isSelected = selectedISO === iso;
              const isToday = toISO(today) === iso;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className="aspect-square rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center"
                  style={
                    isSelected
                      ? { backgroundColor: "#16a34a", color: "#ffffff" }
                      : isPast
                      ? { color: isLight ? "#cbd5e1" : "#3a3a3a", cursor: "not-allowed" }
                      : isToday
                      ? { color: isLight ? "#16a34a" : "#22c55e", border: `1px solid ${isLight ? "#16a34a" : "#22c55e"}` }
                      : { color: isLight ? "#0f172a" : "#c8ccc8" }
                  }
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TimePicker({ value, onChange, theme, embedded = false }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const parseValue = v => {
    if (!v) return { hour: 6, minute: 0, period: "PM" };
    const match = String(v).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return { hour: 6, minute: 0, period: "PM" };
    return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10), period: match[3].toUpperCase() };
  };

  const [draft, setDraft] = useState(parseValue(value));

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setDraft(parseValue(value));
  }, [open, value]);

  const format = d => `${d.hour}:${String(d.minute).padStart(2, "0")} ${d.period}`;

  const apply = () => {
    onChange(format(draft));
    setOpen(false);
  };

  const POPULAR_SLOTS = ["6:00 AM", "7:00 AM", "8:30 AM", "10:00 AM", "2:00 PM", "4:00 PM", "5:30 PM", "7:00 PM"];

  return (
    <div className="relative w-full" ref={wrapRef}>
      {!embedded && (
        <label className="text-xs mb-1.5 block font-semibold flex items-center gap-1.5" style={{ color: isLight ? "#475569" : "#8a968a" }}>
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Time Slot</span>
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full text-xs flex items-center justify-between focus:outline-none transition-all cursor-pointer",
          embedded ? "p-0 bg-transparent border-0 shadow-none" : "rounded-xl px-3 py-2 shadow-xs"
        )}
        style={embedded ? {
          color: value ? (isLight ? "#0f172a" : "#fff") : (isLight ? "#94a3b8" : "#8a968a"),
          fontWeight: value ? "600" : "500",
        } : {
          backgroundColor: isLight ? "#f8fafc" : "#121512",
          border: open
            ? (isLight ? "1.5px solid #16a34a" : "1.5px solid #22c55e")
            : (isLight ? "1px solid #e2e8f0" : "1px solid #252b25"),
          color: value ? (isLight ? "#0f172a" : "#fff") : (isLight ? "#94a3b8" : "#8a968a")
        }}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: value ? (isLight ? "#16a34a" : "#4ade80") : (isLight ? "#64748b" : "#6b7a6b") }} />
          <span className="truncate">{value || "Any Time"}</span>
        </span>
        {value ? (
          <span
            role="button"
            className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors ml-1"
            onClick={e => { e.stopPropagation(); onChange(""); }}
            title="Clear time"
          >
            <X className="w-3 h-3 shrink-0" style={{ color: isLight ? "#64748b" : "#9ca3af" }} />
          </span>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60 ml-1" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 sm:left-0 z-30 mt-2 rounded-2xl p-4 w-72 shadow-2xl animate-[fadeIn_.15s_ease-out]"
          style={{
            backgroundColor: isLight ? "#ffffff" : "#131613",
            border: `1px solid ${isLight ? "#e2e8f0" : "#242a24"}`,
            boxShadow: isLight ? "0 16px 36px rgba(15,23,42,0.14)" : "0 16px 40px rgba(0,0,0,0.7)"
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            Popular Match Slots
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-3.5">
            {POPULAR_SLOTS.map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => { onChange(slot); setOpen(false); }}
                className={cn(
                  "py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate",
                  value === slot ? "shadow-xs scale-[1.02]" : "hover:border-emerald-500/50"
                )}
                style={
                  value === slot
                    ? {
                        backgroundColor: isLight ? "#16a34a" : "#22c55e",
                        color: "#ffffff"
                      }
                    : {
                        backgroundColor: isLight ? "#f1f5f9" : "#1c221c",
                        color: isLight ? "#334155" : "#c8ccc8",
                        border: `1px solid ${isLight ? "#e2e8f0" : "#273027"}`
                      }
                }
              >
                {slot}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider mb-2 pt-2 border-t" style={{ borderColor: isLight ? "#f1f5f9" : "#1e241e", color: isLight ? "#64748b" : "#6b7a6b" }}>
            Custom Time
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3.5">
            <div>
              <label className="text-[10px] mb-1 block text-center font-semibold" style={{ color: isLight ? "#64748b" : "#8a968a" }}>Hour</label>
              <select
                value={draft.hour}
                onChange={e => setDraft(d => ({ ...d, hour: parseInt(e.target.value, 10) }))}
                className="w-full rounded-xl px-2 py-1.5 text-xs text-center font-bold focus:outline-none transition-colors cursor-pointer"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "#1c221c",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#273027"}`,
                  color: isLight ? "#0f172a" : "#fff"
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] mb-1 block text-center font-semibold" style={{ color: isLight ? "#64748b" : "#8a968a" }}>Min</label>
              <select
                value={draft.minute}
                onChange={e => setDraft(d => ({ ...d, minute: parseInt(e.target.value, 10) }))}
                className="w-full rounded-xl px-2 py-1.5 text-xs text-center font-bold focus:outline-none transition-colors cursor-pointer"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "#1c221c",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#273027"}`,
                  color: isLight ? "#0f172a" : "#fff"
                }}
              >
                {[0, 15, 30, 45].map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] mb-1 block text-center font-semibold" style={{ color: isLight ? "#64748b" : "#8a968a" }}>AM / PM</label>
              <div
                className="flex rounded-xl p-0.5 overflow-hidden"
                style={{
                  backgroundColor: isLight ? "#f1f5f9" : "#1c221c",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#273027"}`
                }}
              >
                {["AM", "PM"].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, period: p }))}
                    className="flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    style={
                      draft.period === p
                        ? {
                            backgroundColor: isLight ? "#ffffff" : "#22c55e",
                            color: isLight ? "#16a34a" : "#0d0f0d",
                            boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.1)" : undefined
                          }
                        : {
                            color: isLight ? "#64748b" : "#8a968a"
                          }
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="flex-1 rounded-xl py-2 text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: isLight ? "#f1f5f9" : "#1c221c",
                color: isLight ? "#64748b" : "#8a968a",
                border: `1px solid ${isLight ? "#e2e8f0" : "#273027"}`
              }}
            >
              Any Time
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer shadow-sm text-white"
              style={{ backgroundColor: isLight ? "#16a34a" : "#22c55e" }}
            >
              Set Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyPostedChallengeCard({ challenge, token, onDeleted, onViewTeam, theme }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await apiRequest(`/challenges/${challenge.id}`, { method: "DELETE", token });
      onDeleted(challenge.id);
    } catch (err) {
      setError(err.message || "Could not delete — please try again.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className={cn(C, "rounded-2xl p-4 transition-all")}
      style={{
        backgroundColor: isLight ? "#ffffff" : undefined,
        border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
        boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: isLight ? "#16a34a" : "#4ade80" }}
        >
          Your Posted Challenge
        </span>
        <Tag color="blue">{challenge.status === "on_hold" ? "On Hold" : "Open"}</Tag>
      </div>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        <div className="text-sm font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
          {challenge.team_name}
        </div>
        {challenge.team_rating != null && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span>{Number(challenge.team_rating).toFixed(1)}</span>
            {challenge.reviews_count > 0 && (
              <span className="font-normal text-[10px]" style={{ color: isLight ? "#64748b" : "#a3a3a3" }}>
                ({challenge.reviews_count} review{challenge.reviews_count !== 1 ? "s" : ""})
              </span>
            )}
          </div>
        )}
      </div>

      {challenge.latest_review_text && (
        <div
          className="mt-2 p-2.5 rounded-xl text-[11px]"
          style={{
            backgroundColor: isLight ? "#f8fafc" : "#0f120f",
            border: `1px solid ${isLight ? "#e2e8f0" : "#222922"}`
          }}
        >
          <div className="flex items-center justify-between gap-1 text-[10px] mb-0.5" style={{ color: isLight ? "#64748b" : "#a3a3a3" }}>
            <span className="font-semibold truncate flex items-center gap-1" style={{ color: isLight ? "#1e293b" : "#e5e5e5" }}>
              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
              <span>{Number(challenge.latest_review_rating || 5.0).toFixed(1)}★</span>
              <span>by {challenge.latest_reviewer_name || "Opponent"}</span>
              {challenge.latest_reviewer_team_name ? ` (${challenge.latest_reviewer_team_name})` : ""}
            </span>
            <span className="shrink-0 text-[9px]" style={{ color: isLight ? "#94a3b8" : "#737373" }}>
              {challenge.latest_review_created_at
                ? new Date(challenge.latest_review_created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "Asia/Kolkata"
                  })
                : "Recent"}
            </span>
          </div>
          <p
            className="italic line-clamp-2 pl-2 border-l"
            style={{
              borderColor: isLight ? "#22c55e" : "rgba(34,197,94,0.4)",
              color: isLight ? "#475569" : "#d4d4d4"
            }}
          >
            "{challenge.latest_review_text}"
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <Tag color="blue">{challenge.format}</Tag>
        <Tag color="green">{challenge.match_date} · {challenge.time_slot}</Tag>
      </div>
      {challenge.note && <div className="text-xs mt-1.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{challenge.note}</div>}

      {error && (
        <div
          className="text-xs rounded-lg p-2 mt-3 font-medium"
          style={{
            backgroundColor: isLight ? "#fef2f2" : "rgba(239,68,68,0.1)",
            border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.2)"}`,
            color: isLight ? "#dc2626" : "#f87171"
          }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        {onViewTeam && (
          <button
            type="button"
            onClick={() => onViewTeam(challenge)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isLight
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20"
            }`}
            title="View team profile, performance and feedback reviews"
          >
            <Users className="w-3.5 h-3.5" /> View Team & Reviews
          </button>
        )}
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(
              "py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
              isLight
                ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                : "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20",
              onViewTeam ? "px-3" : "w-full"
            )}
          >
            <XCircle className="w-3.5 h-3.5" /> Delete
          </button>
        ) : (
          <div className="flex gap-1.5">
            <GhostButton onClick={() => setConfirming(false)} disabled={deleting} className="text-center py-1.5 px-2.5 text-xs">Keep</GhostButton>
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="py-1.5 px-3 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
              style={{ backgroundColor: isLight ? "#dc2626" : "#ef4444", color: "#ffffff" }}
            >
              {deleting ? "..." : "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeChallenge(c) {
  return {
    id: c.id,
    team: c.team_name,
    contact_no: c.contact_no,
    postedBy: c.posted_by_name || c.creator_name || null,
    creator_id: c.creator_id,
    postedAt: c.created_at || null,
    format: c.format,
    date: formatDateIST(c.match_date),
    rawDate: c.match_date,
    time: c.time_slot,
    ground: c.ground_name || (c.ground_id ? "Ground booked" : "Not booked yet"),
    groundLat: c.ground_lat != null ? Number(c.ground_lat) : null,
    groundLng: c.ground_lng != null ? Number(c.ground_lng) : null,
    note: c.note || "",
    urgent: !!c.urgent,
    rating: c.team_rating != null ? Number(c.team_rating) : (c.rating ? Number(c.rating) : 5.0),
    reviewsCount: Number(c.reviews_count) || 0,
    latestReview: c.latest_review || (c.latest_review_text ? {
      reviewer_name: c.latest_reviewer_name,
      reviewer_team_name: c.latest_reviewer_team_name,
      rating: c.latest_review_rating,
      review_text: c.latest_review_text,
      created_at: c.latest_review_created_at
    } : null),
    wins: 0,
    losses: 0
  };
}

function ChallengesMap({ challenges }) {
  const withLocation = challenges.filter(c => c.groundLat != null && c.groundLng != null);
  const withoutLocation = challenges.filter(c => c.groundLat == null || c.groundLng == null);

  if (challenges.length === 0) return null;

  const center = withLocation.length
    ? [
        withLocation.reduce((s, c) => s + c.groundLat, 0) / withLocation.length,
        withLocation.reduce((s, c) => s + c.groundLng, 0) / withLocation.length
      ]
    : [13.0827, 80.2707];

  return (
    <div className={cn(C, "rounded-2xl p-4")}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-3.5 h-3.5 text-green-400" />
        <span className="text-sm font-semibold text-white">Where teams are playing</span>
      </div>

      {withLocation.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ height: 220 }}>
          <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withLocation.map(c => (
              <Marker key={c.id} position={[c.groundLat, c.groundLng]} icon={challengePinIcon}>
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{c.team}</div>
                    <div>{c.format} · {c.date} {c.time}</div>
                    <div>📍 {c.ground}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "#6b7a6b" }}>
          No challenges with a booked ground yet — see the list below the map.
        </p>
      )}

      {withoutLocation.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] mb-1.5" style={{ color: "#6b7a6b" }}>
            {withoutLocation.length} more challenge{withoutLocation.length > 1 ? "s" : ""} — no ground picked yet, so no pin on the map:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {withoutLocation.map(c => (
              <span key={c.id} className="px-2 py-1 rounded-lg text-[11px]" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
                {c.team} · {c.format}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FindMatchTab({
  acceptedChallenge,
  onChallengeAccepted,
  token,
  user, 
  challenges = [],
  onChallengeCreated,
  onChallengeDeleted,
  teammatePhones = [],
  autoOpenForm = false,
  onAutoOpenHandled,
  entryMode = "browse",
  theme = "dark"
}) {
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [dateFilter, setDateFilter] = useState(null);
  const [timeFilter, setTimeFilter] = useState("");
  const [timePeriodFilter, setTimePeriodFilter] = useState(null); // null | "morning" | "afternoon" | "evening"
  const [groundFilter, setGroundFilter] = useState("all"); // "all" | "booked" | "needed"
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [viewTeamTarget, setViewTeamTarget] = useState(null);

  const normalize = normalizeChallenge;

  // Keep detailsTarget synchronized with incoming challenge updates (e.g. newly posted reviews/ratings)
  useEffect(() => {
    if (detailsTarget) {
      const updated = challenges.find(c => c.id === detailsTarget.id);
      if (updated) {
        setDetailsTarget(normalize(updated));
      }
    }
  }, [challenges]);

  const formatPostedAgo = timestamp => {
    if (!timestamp) return null;
    const posted = new Date(timestamp);
    if (isNaN(posted.getTime())) return null;

    const diffMs = Date.now() - posted.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return posted.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const formatPostedFull = timestamp => {
    if (!timestamp) return null;
    const posted = new Date(timestamp);
    if (isNaN(posted.getTime())) return null;
    return posted.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatReviewDate = ts => {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    });
  };

  const formatPhoneDisplay = phone => {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length !== 10) return phone;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const myPhone = normalizePhone(user?.phone);
  const teamPhoneSet = new Set([myPhone, ...teammatePhones].filter(Boolean));

  const myOpenChallenge = teamPhoneSet.size
    ? challenges.find(c => c.status === "open" && teamPhoneSet.has(normalizePhone(c.contact_no)))
    : null;

  const myAcceptedChallenge = challenges.find(
    c =>
      c.status === "accepted" &&
      ((user?.id && String(c.accepted_by_user_id) === String(user.id)) ||
        (myPhone && normalizePhone(c.accepted_by_contact_no) === myPhone) ||
        (teamPhoneSet.size > 0 && teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no))))
  );

  const hasActiveAcceptedChallenge = Boolean(acceptedChallenge || myAcceptedChallenge);

  const openChallenges = challenges.filter(
    c => (!c.status || c.status === "open") && !teamPhoneSet.has(normalizePhone(c.contact_no))
  );
  const normalized = openChallenges.map(normalize);
  const format = FORMATS[selectedFormat];

  const sameDay = (dateStr, isoTarget) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr === isoTarget;
    const istDateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return istDateStr === isoTarget;
  };

  const query = searchQuery.trim().toLowerCase();

  const toMinutes = timeStr => {
    if (!timeStr) return null;
    const s = String(timeStr).trim();

    let match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return hour * 60 + minute;
    }

    match = s.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      return hour * 60 + minute;
    }

    return null;
  };

  const sameTime = (timeStr, chosen) => {
    if (!chosen) return true;
    const a = toMinutes(timeStr);
    const b = toMinutes(chosen);
    if (a === null || b === null) return timeStr === chosen;
    return a === b;
  };

  const todayISO = toISODate(new Date());
  const tomorrowISO = toISODate(new Date(Date.now() + 86400000));
  const weekendISO = (() => {
    const now = new Date();
    const day = now.getDay();
    const offset = day === 6 || day === 0 ? 0 : 6 - day;
    return toISODate(new Date(now.getTime() + offset * 86400000));
  })();

  const formatCounts = FORMATS.reduce((acc, f) => {
    acc[f.key] = normalized.filter(c => c.format === f.key).length;
    return acc;
  }, {});

  const filtered = normalized
    .filter(c => c.format === format.key)
    .filter(c => !dateFilter || sameDay(c.rawDate, dateFilter))
    .filter(c => sameTime(c.time, timeFilter))
    .filter(c => {
      if (!query) return true;
      return (
        c.team.toLowerCase().includes(query) ||
        c.ground.toLowerCase().includes(query) ||
        c.note.toLowerCase().includes(query)
      );
    });

  const activeFilters = [];
  if (searchQuery.trim()) {
    activeFilters.push({ id: "search", label: `"${searchQuery.trim()}"`, clear: () => setSearchQuery("") });
  }
  if (dateFilter) {
    const isToday = dateFilter === todayISO;
    const isTomorrow = dateFilter === tomorrowISO;
    const isWeekend = dateFilter === weekendISO;
    const lbl = isToday ? "Today" : isTomorrow ? "Tomorrow" : isWeekend ? "Weekend" : formatDateDisplay(dateFilter);
    activeFilters.push({ id: "date", label: `📅 ${lbl}`, clear: () => setDateFilter(null) });
  }
  if (timeFilter) {
    activeFilters.push({ id: "time", label: `⏰ ${timeFilter}`, clear: () => setTimeFilter("") });
  }

  const clearAllFilters = () => {
    setSearchQuery("");
    setDateFilter(null);
    setTimeFilter("");
  };

  const isSameCalendarDay = (a, b) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
    return (
      da.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) ===
      db.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    );
  };

  const hasActiveOnDate = targetDate =>
    teamPhoneSet.size > 0 &&
    challenges.some(c => {
      if (c.status !== "accepted") return false;
      const involved =
        teamPhoneSet.has(normalizePhone(c.contact_no)) ||
        teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no));
      if (!involved) return false;
      return isSameCalendarDay(c.match_date, targetDate);
    });

  const activeFilterCount = activeFilters.length;

  const myOwnOpenChallenges = challenges.filter(
    c => (c.status === "open" || c.status === "on_hold") && c.creator_id === user?.id
  );

  const isLight = theme === "light";

  return (
    <div className="space-y-6">
      {/* Header section with Title on left and Post Challenge button on the right top corner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pb-0.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
            Find a Match
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: isLight ? "#475569" : "#8a968a" }}>
            Select your preferred format and get matched instantly
          </p>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          <ChallengeForm
            key="challenge-form"
            token={token}
            user={user}
            onCreated={onChallengeCreated}
            disabledReason={null}
            autoOpen={autoOpenForm}
            onAutoOpenHandled={onAutoOpenHandled}
            theme={theme}
          />
        </div>
      </div>

      {(() => {
        const formatCardsBlock = (
          <div key="format-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {FORMATS.map((f, i) => {
              const isSelected = i === selectedFormat;
              const count = formatCounts[f.key] || 0;
              const themeConfig = FORMAT_THEMES[f.key] || FORMAT_THEMES.T20;

              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFormat(i)}
                  className={cn(
                    "relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer overflow-hidden group",
                    isSelected ? "shadow-md scale-[1.01]" : "hover:-translate-y-0.5 hover:shadow-sm opacity-85 hover:opacity-100"
                  )}
                  style={{
                    background: isSelected
                      ? (isLight ? themeConfig.bgActiveLight : themeConfig.bgActiveDark)
                      : (isLight ? "#ffffff" : "#131613"),
                    border: isSelected
                      ? `1.5px solid ${isLight ? themeConfig.borderActiveLight : themeConfig.borderActiveDark}`
                      : `1px solid ${isLight ? "#e2e8f0" : "#242a24"}`,
                    boxShadow: isSelected
                      ? (isLight ? themeConfig.glowLight : themeConfig.glowDark)
                      : undefined,
                  }}
                >
                  {/* Subtle decorative glow in corner */}
                  {isSelected && (
                    <div
                      className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-xl pointer-events-none opacity-30"
                      style={{ backgroundColor: themeConfig.accent }}
                    />
                  )}

                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: isSelected
                          ? (isLight ? "#ffffff" : "rgba(255,255,255,0.08)")
                          : (isLight ? "#f8fafc" : "#1a1f1a"),
                        border: `1px solid ${isLight ? "#e2e8f0" : "#2a332a"}`
                      }}
                    >
                      {f.emoji}
                    </div>

                    {count > 0 ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight shadow-xs"
                        style={
                          isSelected
                            ? { backgroundColor: themeConfig.accent, color: "#ffffff" }
                            : (isLight ? { backgroundColor: "#f1f5f9", color: "#475569" } : { backgroundColor: "#1e241e", color: "#9ca3af" })
                        }
                      >
                        {count} open
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>
                        0 open
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-sm truncate" style={{ color: isSelected ? (isLight ? "#0f172a" : "#ffffff") : (isLight ? "#334155" : "#e2e8f0") }}>
                    {f.title}
                  </div>
                  <div className="text-[11px] mt-0.5 line-clamp-1" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                    {f.desc}
                  </div>

                  {isSelected && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: isLight ? themeConfig.borderActiveLight : themeConfig.accent }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: themeConfig.accent }} />
                      <span>Active Selection</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );

        const mapBlock = <ChallengesMap key="map" challenges={filtered} />;

        const filterBlock = (
          <div key="filter" className="space-y-2">
            {/* Header: Title and match count badge */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isLight ? "#334155" : "#a6b5a6" }}>
                  Filter {format.title}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: isLight ? "#f0fdf4" : "rgba(34,197,94,0.1)",
                    color: isLight ? "#15803d" : "#22c55e",
                    border: `1px solid ${isLight ? "#bbf7d0" : "rgba(34,197,94,0.2)"}`
                  }}
                >
                  {filtered.length} match{filtered.length === 1 ? "" : "es"}
                </span>
              </div>

              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            {/* UNIFIED MERGED FILTER BAR: SEARCH + DATE + TIME */}
            <div
              className={cn(
                "rounded-2xl transition-all duration-200 border",
                "flex flex-col sm:flex-row sm:items-center",
                isLight
                  ? "bg-white border-slate-200 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10"
                  : "bg-[#111411] border-[#252c25] shadow-lg focus-within:border-emerald-500/60"
              )}
            >
              {/* 1. Search Section */}
              <div className="flex-1 flex items-center px-3.5 py-2.5 min-w-0">
                <Search
                  className="w-4 h-4 shrink-0 mr-2.5 transition-colors"
                  style={{ color: searchQuery ? (isLight ? "#16a34a" : "#22c55e") : (isLight ? "#94a3b8" : "#6b7a6b") }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search team, ground, note..."
                  className="w-full text-xs font-medium bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-[#556055]"
                  style={{ color: isLight ? "#0f172a" : "#ffffff" }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 ml-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: isLight ? "#64748b" : "#9ca3af" }} />
                  </button>
                )}
              </div>

              {/* Divider between Search and Date/Time */}
              <div className="hidden sm:block w-[1px] h-7 bg-slate-200 dark:bg-[#252d25] shrink-0" />
              <div className="block sm:hidden h-[1px] w-full bg-slate-100 dark:bg-[#1b221b]" />

              {/* 2. Date & Time Combined Section */}
              <div className="flex items-center divide-x divide-slate-100 dark:divide-[#252d25] sm:divide-x-0">
                {/* Date (Calendar) */}
                <div className="flex-1 sm:w-44 px-3.5 py-2 sm:py-2.5 flex items-center min-w-0">
                  <CalendarField
                    value={dateFilter}
                    onChange={setDateFilter}
                    theme={theme}
                    placeholder="Any Date"
                    clearable={true}
                    iconPosition="left"
                    className="w-full"
                    buttonStyle={{
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      padding: "0",
                      fontSize: "0.75rem",
                      fontWeight: dateFilter ? "600" : "500",
                    }}
                  />
                </div>

                <div className="hidden sm:block w-[1px] h-7 bg-slate-200 dark:bg-[#252d25] shrink-0" />

                {/* Time Slot */}
                <div className="flex-1 sm:w-40 px-3.5 py-2 sm:py-2.5 flex items-center min-w-0">
                  <TimePicker
                    value={timeFilter}
                    onChange={setTimeFilter}
                    theme={theme}
                    embedded={true}
                  />
                </div>
              </div>

              {/* Clear button on far right if any filter is active */}
              {activeFilters.length > 0 && (
                <>
                  <div className="hidden sm:block w-[1px] h-7 bg-slate-200 dark:bg-[#252d25] shrink-0" />
                  <div className="px-3 py-1.5 sm:py-0 shrink-0 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Clear all filters"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Active filter tags */}
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider mr-0.5" style={{ color: isLight ? "#94a3b8" : "#6b7a6b" }}>
                  Active:
                </span>
                {activeFilters.map(f => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs"
                    style={{
                      backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.12)",
                      color: isLight ? "#065f46" : "#4ade80",
                      borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.25)"
                    }}
                  >
                    <span>{f.label}</span>
                    <button
                      type="button"
                      onClick={f.clear}
                      className="p-0.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );

        return (
          <>
            {formatCardsBlock}
            {filterBlock}
            {mapBlock}
          </>
        );
      })()}

      {myOwnOpenChallenges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Your Posted Challenges ({myOwnOpenChallenges.length})</h3>
          </div>
          {myOwnOpenChallenges.map(ch => (
            <MyPostedChallengeCard
              key={ch.id}
              challenge={{
                ...ch,
                match_date: formatDateIST(ch.match_date)
              }}
              token={token}
              theme={theme}
              onDeleted={onChallengeDeleted}
              onViewTeam={c => setViewTeamTarget(c)}
            />
          ))}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Challenge Requests</h3>
        </div>

        {hasActiveAcceptedChallenge && (
          <div
            className="flex items-center gap-2.5 text-xs rounded-xl p-3 mb-3"
            style={{
              backgroundColor: isLight ? "#fffbeb" : "rgba(245,158,11,0.08)",
              border: `1px solid ${isLight ? "#fde68a" : "rgba(245,158,11,0.25)"}`,
              color: isLight ? "#b45309" : "#f59e0b",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              You already have an active accepted match challenge. You can only accept one challenge at a time. To accept another challenge, cancel your active match in <strong>My Team</strong>.
            </span>
          </div>
        )}

        <div className="space-y-3">
          {filtered.length === 0 && <div className="text-sm text-center py-8" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>No challenges match your filters right now.</div>}
          {filtered.map(t => {
            const blocked = hasActiveOnDate(t.rawDate);
            const postedAgo = formatPostedAgo(t.postedAt);
            return (
              <div
                key={t.id}
                className={cn(C, "rounded-2xl p-4 transition-all")}
                style={{
                  borderColor: t.urgent ? "rgba(245,158,11,0.35)" : (isLight ? "#e2e8f0" : "#2a2a2a"),
                  backgroundColor: isLight ? "#ffffff" : undefined,
                  boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                    {t.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{t.team}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{t.rating.toFixed(1)}</span>
                      </div>
                      {t.reviewsCount > 0 ? (
                        <span className="text-[10px]" style={{ color: isLight ? "#64748b" : "#a3a3a3" }}>
                          ({t.reviewsCount} review{t.reviewsCount !== 1 ? "s" : ""})
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: isLight ? "#94a3b8" : "#737373" }}>New team</span>
                      )}
                    </div>

                    {/* Latest Review under Team Name */}
                    {t.latestReview && (
                      <div
                        className="mt-2 p-2.5 rounded-xl text-[11px]"
                        style={{
                          backgroundColor: isLight ? "#f8fafc" : "#0f120f",
                          border: `1px solid ${isLight ? "#e2e8f0" : "#222922"}`
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] mb-1" style={{ color: isLight ? "#64748b" : "#a3a3a3" }}>
                          <span className="font-semibold truncate flex items-center gap-1" style={{ color: isLight ? "#1e293b" : "#e5e5e5" }}>
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                            <span>{Number(t.latestReview.rating || 5.0).toFixed(1)}★</span>
                            <span>by {t.latestReview.reviewer_name}</span>
                            {t.latestReview.reviewer_team_name ? ` (${t.latestReview.reviewer_team_name})` : ""}:
                          </span>
                          <span className="shrink-0 text-[9px]" style={{ color: isLight ? "#94a3b8" : "#737373" }}>
                            {formatReviewDate(t.latestReview.created_at)}
                          </span>
                        </div>
                        <p
                          className="italic line-clamp-2 pl-2 border-l"
                          style={{
                            borderColor: isLight ? "#22c55e" : "rgba(34,197,94,0.4)",
                            color: isLight ? "#475569" : "#d4d4d4"
                          }}
                        >
                          "{t.latestReview.review_text}"
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {postedAgo && (
                      <span className="text-[10px] font-medium" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>{postedAgo}</span>
                    )}
                    {t.urgent && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: isLight ? "#fffbeb" : "rgba(245,158,11,0.15)", color: isLight ? "#b45309" : "#f59e0b", border: isLight ? "1px solid #fde68a" : "none" }}>⚡ Urgent</span>}
                  </div>
                </div> 

                <div
                  className="mt-3 rounded-2xl p-4 space-y-3"
                  style={{
                    backgroundColor: isLight ? "#f8fafc" : "#111",
                    border: `1px solid ${isLight ? "#e2e8f0" : "#1e1e1e"}`
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs" style={{ color: isLight ? "#334155" : "#c8d0c8" }}>
                      <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                      <span className="font-medium">{t.date}</span>
                      <span style={{ color: isLight ? "#cbd5e1" : "#3a3a3a" }}>•</span>
                      <span className="font-medium">{t.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: isLight ? "#334155" : "#c8d0c8" }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                      <span className="truncate font-medium">{t.ground}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Tag color="blue">{format.title}</Tag>
                  {t.note && <Tag color="purple">{t.note}</Tag>}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  {!hasActiveAcceptedChallenge && (
                    <button
                      disabled={blocked}
                      onClick={() => setAcceptTarget(t)}
                      className="flex-1 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      style={blocked
                        ? { backgroundColor: isLight ? "#f1f5f9" : "#1e211e", color: isLight ? "#94a3b8" : "#3a3a3a", cursor: "not-allowed" }
                        : { backgroundColor: isLight ? "#16a34a" : "#22c55e", color: "#ffffff", boxShadow: isLight ? "0 2px 8px rgba(22,163,74,0.22)" : "none" }}
                      onMouseEnter={e => !blocked && (e.currentTarget.style.backgroundColor = isLight ? "#15803d" : "#4ade80")}
                      onMouseLeave={e => !blocked && (e.currentTarget.style.backgroundColor = isLight ? "#16a34a" : "#22c55e")}
                    >
                      {blocked ? "Unavailable" : "Accept Challenge"}
                    </button>
                  )}
                  <GhostButton className="flex-1 text-center py-2.5 sm:py-2" onClick={() => setDetailsTarget(t)}>View Details</GhostButton>
                  <button
                    type="button"
                    onClick={() => setViewTeamTarget(t)}
                    className={`px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                      isLight
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                        : "text-green-400 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20"
                    }`}
                    title={`View ${t.team} reviews and performance`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Reviews ({t.reviewsCount})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {detailsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
          onClick={() => setDetailsTarget(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: isLight ? "#ffffff" : "#141414",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              boxShadow: isLight ? "0 20px 50px rgba(15,23,42,0.15)" : "0 20px 60px rgba(0,0,0,0.5)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {formatPostedAgo(detailsTarget.postedAt) && (
                <span
                  className="text-[10px] font-semibold px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: isLight ? "#f1f5f9" : "#1e211e",
                    color: isLight ? "#64748b" : "#8a978a",
                    border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`
                  }}
                >
                  {formatPostedAgo(detailsTarget.postedAt)}
                </span>
              )}
              <button
                onClick={() => setDetailsTarget(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
                style={{ backgroundColor: isLight ? "#f1f5f9" : "#1e211e" }}
              >
                <X className="w-4 h-4" style={{ color: isLight ? "#475569" : "#9ca39c" }} />
              </button>
            </div>

            <div className="flex items-center gap-3 pr-20">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                {detailsTarget.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Tag color="blue">{format.title}</Tag>
                {detailsTarget.urgent && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isLight ? "#fffbeb" : "rgba(245,158,11,0.15)",
                      color: isLight ? "#b45309" : "#f59e0b",
                      border: isLight ? "1px solid #fde68a" : "none"
                    }}
                  >
                    ⚡ Urgent
                  </span>
                )}
              </div>
            </div>

            <div
              className="mt-4 rounded-2xl p-4 space-y-3"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#0f0f0f",
                border: `1px solid ${isLight ? "#e2e8f0" : "#1e1e1e"}`
              }}
            >
              <div className="pb-3 border-b flex items-start justify-between gap-3" style={{ borderColor: isLight ? "#e2e8f0" : "#1e1e1e" }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-lg font-bold truncate" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{detailsTarget.team}</div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{detailsTarget.rating.toFixed(1)}</span>
                      {detailsTarget.reviewsCount > 0 && (
                        <span className="font-normal text-[10px]" style={{ color: isLight ? "#64748b" : "#a3a3a3" }}>
                          ({detailsTarget.reviewsCount})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs mt-1" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                    Posted by{" "}
                    <span className="font-semibold" style={{ color: isLight ? "#16a34a" : "#4ade80" }}>
                      {detailsTarget.postedBy || formatPhoneDisplay(detailsTarget.contact_no) || "team contact"}
                    </span>
                    {formatPostedFull(detailsTarget.postedAt) && (
                      <span style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}> · {formatPostedFull(detailsTarget.postedAt)}</span>
                    )}
                  </div>

                  {/* Latest Review under Team Name in Details Modal */}
                  {detailsTarget.latestReview && (
                    <div
                      className="mt-2.5 p-2.5 rounded-xl text-xs"
                      style={{
                        backgroundColor: isLight ? "#ffffff" : "#121612",
                        border: `1px solid ${isLight ? "#e2e8f0" : "#222a22"}`
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] mb-1" style={{ color: isLight ? "#64748b" : "#a3a3a3" }}>
                        <span className="font-semibold truncate flex items-center gap-1" style={{ color: isLight ? "#1e293b" : "#e5e5e5" }}>
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                          <span>{Number(detailsTarget.latestReview.rating || 5.0).toFixed(1)}★</span>
                          <span>by {detailsTarget.latestReview.reviewer_name}</span>
                          {detailsTarget.latestReview.reviewer_team_name ? ` (${detailsTarget.latestReview.reviewer_team_name})` : ""}
                        </span>
                        <span className="shrink-0 text-[10px]" style={{ color: isLight ? "#94a3b8" : "#737373" }}>
                          {formatReviewDate(detailsTarget.latestReview.created_at)}
                        </span>
                      </div>
                      <p
                        className="italic pl-2 border-l"
                        style={{
                          borderColor: isLight ? "#22c55e" : "rgba(34,197,94,0.4)",
                          color: isLight ? "#475569" : "#d4d4d4"
                        }}
                      >
                        "{detailsTarget.latestReview.review_text}"
                      </p>
                    </div>
                  )}
                </div>

                {/* View Team Button in Marked Area */}
                <button
                  type="button"
                  onClick={() => setViewTeamTarget(detailsTarget)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ecfdf5" : "rgba(34, 197, 94, 0.12)",
                    color: isLight ? "#047857" : "#4ade80",
                    border: `1px solid ${isLight ? "#a7f3d0" : "rgba(34, 197, 94, 0.35)"}`,
                    boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : "0 2px 10px rgba(0,0,0,0.3)"
                  }}
                  title={`View ${detailsTarget.team} details, ratings and reviews`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View Team</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm" style={{ color: isLight ? "#334155" : "#e2e8e2" }}>
                  <Calendar className="w-4 h-4 shrink-0" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                  <span className="font-medium">{detailsTarget.date}</span>
                  <span style={{ color: isLight ? "#cbd5e1" : "#3a3a3a" }}>•</span>
                  <span className="font-medium">{detailsTarget.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: isLight ? "#334155" : "#e2e8e2" }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                  <span className="font-medium">{detailsTarget.ground}</span>
                </div>
                {formatPhoneDisplay(detailsTarget.contact_no) && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: isLight ? "#334155" : "#e2e8e2" }}>
                    <Phone className="w-4 h-4 shrink-0" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                    <a href={`tel:${detailsTarget.contact_no}`} className="font-semibold" style={{ color: isLight ? "#15803d" : "#4ade80" }}>
                      {formatPhoneDisplay(detailsTarget.contact_no)}
                    </a>
                  </div>
                )}
                {detailsTarget.note && (
                  <div className="text-sm pt-2 border-t" style={{ color: isLight ? "#64748b" : "#9ca39c", borderColor: isLight ? "#e2e8f0" : "#1e1e1e" }}>{detailsTarget.note}</div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {!hasActiveAcceptedChallenge && (
                <button
                  disabled={hasActiveOnDate(detailsTarget.rawDate)}
                  onClick={() => { setAcceptTarget(detailsTarget); setDetailsTarget(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  style={hasActiveOnDate(detailsTarget.rawDate)
                    ? { backgroundColor: isLight ? "#f1f5f9" : "#1e211e", color: isLight ? "#94a3b8" : "#3a3a3a", cursor: "not-allowed" }
                    : { backgroundColor: isLight ? "#16a34a" : "#22c55e", color: "#ffffff", boxShadow: isLight ? "0 2px 8px rgba(22,163,74,0.22)" : "none" }}
                  onMouseEnter={e => !hasActiveOnDate(detailsTarget.rawDate) && (e.currentTarget.style.backgroundColor = isLight ? "#15803d" : "#4ade80")}
                  onMouseLeave={e => !hasActiveOnDate(detailsTarget.rawDate) && (e.currentTarget.style.backgroundColor = isLight ? "#16a34a" : "#22c55e")}
                >
                  {hasActiveOnDate(detailsTarget.rawDate) ? "Unavailable" : "Accept Challenge"}
                </button>
              )}
              <GhostButton className="flex-1" onClick={() => setDetailsTarget(null)}>Close</GhostButton>
            </div>
          </div>
        </div>
      )}

      {acceptTarget && (
        <AcceptChallengeModal
          challenge={acceptTarget}
          token={token}
          user={user}
          hasActiveAcceptedChallenge={hasActiveAcceptedChallenge}
          onClose={() => setAcceptTarget(null)}
          onAccepted={updated => { setAcceptTarget(null); onChallengeAccepted(updated); }}
          theme={theme}
        />
      )}

      {viewTeamTarget && (
        <TeamDetailsModal
          teamName={viewTeamTarget.team || viewTeamTarget.team_name}
          contactFallback={viewTeamTarget.contact_no}
          postedByFallback={viewTeamTarget.postedBy || viewTeamTarget.creator_name}
          user={user}
          token={token}
          onClose={() => setViewTeamTarget(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
