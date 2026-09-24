import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Calendar, Clock, Search, ChevronDown, MapPin, Phone, XCircle, AlertCircle, Users, Star, RotateCcw, Zap } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "../../api";
import { cn, normalizePhone, formatDateIST } from "../../utils/helpers.jsx";
import { FORMATS, DEFAULT_OVERS } from "../../utils/constants";
import TeamDetailsModal from "../TeamDetailsModal.jsx";
import CalendarField from "../CalendarField.jsx";

/* ============================================================================
   SHARED UI — same visual pattern as the Tournaments tab
   ============================================================================ */
const ACCENT_BAR = "linear-gradient(90deg,#22c55e 0%,#10b981 100%)"; // used by section title bars
const BRAND_GRAD = "linear-gradient(135deg,#22c55e 0%,#14b8a6 100%)";
const DANGER_GRAD = "linear-gradient(135deg,#ef4444 0%,#e11d48 100%)";

const detectLight = theme =>
  theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));

const tokens = isLight => ({
  text: isLight ? "#0f172a" : "#ffffff",
  sub: isLight ? "#64748b" : "#9aa59c",
  faint: isLight ? "#94a3b8" : "#5f6b62",
  card: isLight ? "#ffffff" : "#0c120e",
  cardAlt: isLight ? "#f8fafc" : "#101812",
  border: isLight ? "#e2e8f0" : "#1d2a21",
  input: isLight ? "#f8fafc" : "#080d0a",
  inputBorder: isLight ? "#e2e8f0" : "#233027",
  green: isLight ? "#16a34a" : "#4ade80",
  greenSoft: isLight ? "#ecfdf5" : "rgba(34,197,94,0.08)",
  greenBorder: isLight ? "#a7f3d0" : "rgba(34,197,94,0.28)",
  red: isLight ? "#dc2626" : "#f87171",
  redSoft: isLight ? "#fef2f2" : "rgba(239,68,68,0.08)",
  redBorder: isLight ? "#fecaca" : "rgba(239,68,68,0.3)",
  overlay: isLight ? "rgba(15,23,42,0.55)" : "rgba(0,0,0,0.78)"
});

function Card({ isLight, children, className = "", style = {}, accent = true }) {
  const t = tokens(isLight);
  // accent=true -> soft green glow (no top line). accent=false -> plain surface (filter bar).
  const glow = accent
    ? isLight
      ? "0 0 0 1px rgba(22,163,74,0.06), 0 10px 28px -14px rgba(22,163,74,0.35)"
      : "0 0 0 1px rgba(34,197,94,0.05), 0 12px 34px -16px rgba(34,197,94,0.45)"
    : isLight
      ? "0 1px 3px rgba(15,23,42,0.06)"
      : "0 10px 30px -18px rgba(0,0,0,0.8)";
  return (
    <div
      className={cn("relative rounded-2xl border", className)}
      style={{
        backgroundColor: t.card,
        borderColor: accent ? (isLight ? "#bbf7d0" : "rgba(34,197,94,0.18)") : t.border,
        boxShadow: glow,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function PageHeader({ isLight, icon: Icon, title, subtitle, action }) {
  const t = tokens(isLight);
  return (
    <div className="pb-5 border-b" style={{ borderColor: t.border }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: BRAND_GRAD, boxShadow: "0 10px 24px -10px rgba(20,184,166,0.8)" }}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: isLight ? "linear-gradient(135deg,#15803d,#0f766e)" : "linear-gradient(135deg,#4ade80,#2dd4bf)" }}
            >
              {title}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: t.sub }}>{subtitle}</p>
          </div>
        </div>
        {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ isLight, title, badge, right }) {
  const t = tokens(isLight);
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: ACCENT_BAR }} />
        <h3 className="text-lg font-bold truncate" style={{ color: t.text }}>{title}</h3>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {right}
        {badge != null && (
          <span
            className="px-3 py-1 rounded-full text-xs font-bold border"
            style={{ backgroundColor: t.greenSoft, color: t.green, borderColor: t.greenBorder }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ tone = "green", children }) {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
      style={{ background: tone === "red" ? DANGER_GRAD : BRAND_GRAD }}
    >
      {children}
    </span>
  );
}

function Pill({ isLight, children, dot = true }) {
  const t = tokens(isLight);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border"
      style={{ backgroundColor: t.greenSoft, color: t.green, borderColor: t.greenBorder }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.green }} />}
      {children}
    </span>
  );
}

function MetaRow({ isLight, icon: Icon, children }) {
  const t = tokens(isLight);
  return (
    <div className="flex items-center gap-2 text-sm min-w-0" style={{ color: t.text }}>
      <Icon className="w-4 h-4 shrink-0" style={{ color: t.green }} />
      <span className="truncate">{children}</span>
    </div>
  );
}

function PrimaryButton({ children, className = "", style = {}, disabled, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
        className
      )}
      style={{ background: BRAND_GRAD, color: "#04130a", boxShadow: "0 10px 26px -12px rgba(34,197,94,0.9)", ...style }}
    >
      {children}
    </button>
  );
}

function SoftButton({ isLight, children, className = "", disabled, ...rest }) {
  const t = tokens(isLight);
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-colors cursor-pointer disabled:cursor-not-allowed",
        className
      )}
      style={
        disabled
          ? { backgroundColor: t.cardAlt, color: t.faint, borderColor: t.border }
          : { backgroundColor: t.greenSoft, color: t.green, borderColor: t.greenBorder }
      }
    >
      {children}
    </button>
  );
}

function OutlineButton({ isLight, children, className = "", tone = "neutral", ...rest }) {
  const t = tokens(isLight);
  const danger = tone === "danger";
  return (
    <button
      {...rest}
      className={cn(
        "py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      style={{
        backgroundColor: danger ? t.redSoft : "transparent",
        color: danger ? t.red : t.text,
        borderColor: danger ? t.redBorder : t.border
      }}
    >
      {children}
    </button>
  );
}

/* Modal rendered into document.body so it is never trapped under
   transformed parents or Leaflet map panes (fixes map-over-modal bug). */
function Modal({ isLight, onClose, children, maxWidth = "max-w-lg" }) {
  const t = tokens(isLight);
  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: t.overlay, backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className={cn("w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl", maxWidth)}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function ModalHeader({ isLight, title, onClose }) {
  const t = tokens(isLight);
  return (
    <div className="flex items-center justify-between gap-3 pb-3 mb-1 border-b" style={{ borderColor: t.border }}>
      <h3 className="text-base font-bold" style={{ color: t.text }}>{title}</h3>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer"
        style={{ borderColor: t.border, color: t.sub }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const fieldStyle = isLight => {
  const t = tokens(isLight);
  return { backgroundColor: t.input, border: `1px solid ${t.inputBorder}`, color: t.text };
};

function Label({ isLight, children }) {
  return (
    <label className="text-xs mb-1.5 block font-semibold" style={{ color: tokens(isLight).sub }}>
      {children}
    </label>
  );
}

/* ============================================================================
   DATE / TIME HELPERS
   ============================================================================ */
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

function prettyTime(value) {
  if (!value) return "";
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return String(value);
  let h = parseInt(m[1], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm}`;
}

/* ============================================================================
   TIME FIELD (used in the Post Challenge form)
   ============================================================================ */
function TimeField({ value, onChange, theme }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
  const [open, setOpen] = useState(false);
  const { hour12, minute, ampm } = from24Hour(value);

  const set = (nextHour, nextMinute, nextAmpm) => onChange(to24Hour(nextHour, nextMinute, nextAmpm));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl px-3 py-2.5 text-sm text-left focus:outline-none flex items-center justify-between cursor-pointer"
        style={{ ...fieldStyle(isLight), color: value ? t.text : t.faint, borderColor: open ? t.green : t.inputBorder }}
      >
        <span>{value ? formatTimeDisplay(value) : "Select a time"}</span>
        <Clock className="w-4 h-4 shrink-0" style={{ color: t.green }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 sm:right-auto top-[calc(100%+6px)] z-50 rounded-2xl p-4 sm:w-64 border"
            style={{ backgroundColor: t.card, borderColor: t.border, boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }}
          >
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-xs mb-1 block text-center font-medium" style={{ color: t.sub }}>Hour</label>
                <select
                  value={hour12}
                  onChange={e => set(e.target.value, minute, ampm)}
                  className="w-full rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none"
                  style={fieldStyle(isLight)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block text-center font-medium" style={{ color: t.sub }}>Min</label>
                <select
                  value={minute}
                  onChange={e => set(hour12, e.target.value, ampm)}
                  className="w-full rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none"
                  style={fieldStyle(isLight)}
                >
                  {["00", "15", "30", "45"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block text-center font-medium" style={{ color: t.sub }}>&nbsp;</label>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: t.inputBorder }}>
                  {["AM", "PM"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set(hour12, minute, p)}
                      className="flex-1 py-1.5 text-xs font-bold cursor-pointer"
                      style={ampm === p ? { background: BRAND_GRAD, color: "#04130a" } : { backgroundColor: t.input, color: t.sub }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <PrimaryButton type="button" onClick={() => setOpen(false)} className="w-full py-2">
              Done
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================================
   POST CHALLENGE FORM
   ============================================================================ */
function ChallengeForm({ token, user, onCreated, disabledReason, grounds = [], autoOpen = false, onAutoOpenHandled, theme }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (autoOpen && !disabledReason) {
      setOpen(true);
      onAutoOpenHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const closeForm = () => {
    setOpen(false);
    setError(null);
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
          ground_id: form.hasGround ? (form.ground_id === "other" ? null : form.ground_id) : null,
          ground_name: form.hasGround && form.ground_id === "other" ? form.ground_custom.trim() : null,
          note: form.note.trim() || null
        }
      });
      onCreated(res.challenge);
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not post challenge. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (disabledReason) {
    return (
      <PrimaryButton type="button" disabled title={disabledReason}>
        <Plus className="w-4 h-4" /> Post a Match Challenge
      </PrimaryButton>
    );
  }

  return (
    <>
      <PrimaryButton
        type="button"
        onClick={() => {
          if (checkProfileCompleteness()) return;
          setOpen(true);
        }}
      >
        <Plus className="w-4 h-4" /> Post a Match Challenge
      </PrimaryButton>

      {open && (
        <Modal isLight={isLight} onClose={closeForm}>
          <Card isLight={isLight} className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <ModalHeader isLight={isLight} title="Post a Match Challenge" onClose={closeForm} />

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label isLight={isLight}>Team name</Label>
                  <input
                    value={form.team_name}
                    readOnly
                    disabled
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold cursor-not-allowed opacity-80"
                    style={fieldStyle(isLight)}
                    placeholder="Team name"
                  />
                  <p className="text-xs mt-1" style={{ color: t.faint }}>From your profile.</p>
                </div>

                <div className="col-span-2">
                  <Label isLight={isLight}>Contact number</Label>
                  <input
                    value={contact}
                    readOnly
                    disabled
                    className="w-full rounded-xl px-3 py-2.5 text-sm cursor-not-allowed opacity-80"
                    style={fieldStyle(isLight)}
                  />
                  <p className="text-xs mt-1" style={{ color: t.faint }}>Only shared with the team that accepts your challenge.</p>
                </div>

                <div>
                  <Label isLight={isLight}>Format</Label>
                  <div className="relative">
                    <select
                      value={form.format}
                      onChange={e => handleFormatChange(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none cursor-pointer"
                      style={fieldStyle(isLight)}
                    >
                      {FORMATS.map(f => (
                        <option key={f.key} value={f.key}>{f.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.sub }} />
                  </div>
                </div>

                <div>
                  <Label isLight={isLight}>
                    Overs {form.format !== "Test" && <span style={{ color: t.faint }}>(default {DEFAULT_OVERS[form.format]})</span>}
                  </Label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={form.overs}
                    onChange={e => update("overs", e.target.value)}
                    placeholder={form.format === "Test" ? "Not applicable" : String(DEFAULT_OVERS[form.format])}
                    disabled={form.format === "Test"}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    style={fieldStyle(isLight)}
                  />
                </div>

                <div>
                  <Label isLight={isLight}>Ground booked?</Label>
                  <div className="relative">
                    <select
                      value={form.hasGround ? "yes" : "no"}
                      onChange={e => update("hasGround", e.target.value === "yes")}
                      className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none cursor-pointer"
                      style={fieldStyle(isLight)}
                    >
                      <option value="no">Not booked yet</option>
                      <option value="yes">Already booked</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.sub }} />
                  </div>
                </div>

                <div>
                  <Label isLight={isLight}>Match date</Label>
                  <CalendarField value={form.match_date} onChange={v => update("match_date", v)} theme={theme} />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label isLight={isLight}>Match time</Label>
                  <TimeField value={form.time_slot} onChange={v => update("time_slot", v)} theme={theme} />
                </div>

                {form.hasGround && (
                  <div className="col-span-2">
                    <Label isLight={isLight}>Ground</Label>
                    {grounds.length > 0 ? (
                      <>
                        <div className="relative">
                          <select
                            value={form.ground_id}
                            onChange={e => update("ground_id", e.target.value)}
                            className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none cursor-pointer"
                            style={fieldStyle(isLight)}
                          >
                            <option value="">Select a ground</option>
                            {grounds.map(g => (
                              <option key={g.id ?? g.name} value={g.id ?? g.name}>
                                {g.name}
                                {g.area ? ` (${g.area})` : ""}
                              </option>
                            ))}
                            <option value="other">Other / not listed</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.sub }} />
                        </div>
                        {form.ground_id === "other" && (
                          <input
                            value={form.ground_custom}
                            onChange={e => update("ground_custom", e.target.value)}
                            className="w-full mt-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                            style={fieldStyle(isLight)}
                            placeholder="Ground name"
                          />
                        )}
                      </>
                    ) : (
                      <input
                        value={form.ground_custom}
                        onChange={e => {
                          update("ground_custom", e.target.value);
                          update("ground_id", "other");
                        }}
                        className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                        style={fieldStyle(isLight)}
                        placeholder="Green Park Cricket Ground"
                      />
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <Label isLight={isLight}>Description</Label>
                  <textarea
                    value={form.note}
                    onChange={e => update("note", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                    style={fieldStyle(isLight)}
                    placeholder="Looking for a friendly T20 match, intermediate level"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs rounded-xl p-3 font-medium border" style={{ backgroundColor: t.redSoft, borderColor: t.redBorder, color: t.red }}>
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <OutlineButton isLight={isLight} type="button" onClick={closeForm} className="flex-1">
                  Cancel
                </OutlineButton>
                <PrimaryButton type="submit" disabled={submitting || !normalizedContact} className="flex-1">
                  {submitting ? "Posting..." : "Post Challenge"}
                </PrimaryButton>
              </div>
            </form>
          </Card>
        </Modal>
      )}
    </>
  );
}

/* ============================================================================
   ACCEPT CHALLENGE MODAL
   ============================================================================ */
function AcceptChallengeModal({ challenge, token, user, hasActiveAcceptedChallenge, onClose, onAccepted, theme }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
  const [teamName, setTeamName] = useState(user?.team_name || "");
  const contact = user?.phone || "";
  const normalizedContact = normalizePhone(contact);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.team_name && !teamName) setTeamName(user.team_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(err.message || "Could not accept challenge. It may no longer be open.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isLight={isLight} onClose={onClose} maxWidth="max-w-md">
      <Card isLight={isLight} className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ModalHeader isLight={isLight} title={`Accept vs ${challenge.team}`} onClose={onClose} />
          <p className="text-sm" style={{ color: t.sub }}>
            {challenge.team} will get your team name and number so both captains can lock in the details.
          </p>
          <div>
            <Label isLight={isLight}>Your team name</Label>
            <input
              value={teamName}
              readOnly
              disabled
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold cursor-not-allowed opacity-80"
              style={fieldStyle(isLight)}
            />
          </div>
          <div>
            <Label isLight={isLight}>Contact number</Label>
            <input
              value={contact}
              readOnly
              disabled
              className="w-full rounded-xl px-3 py-2.5 text-sm cursor-not-allowed opacity-80"
              style={fieldStyle(isLight)}
            />
            <p className="text-xs mt-1" style={{ color: t.faint }}>Wrong number? Update it in your profile.</p>
          </div>
          {error && (
            <div className="text-xs rounded-xl p-3 font-medium border" style={{ backgroundColor: t.redSoft, borderColor: t.redBorder, color: t.red }}>
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <OutlineButton isLight={isLight} type="button" onClick={onClose} className="flex-1">
              Cancel
            </OutlineButton>
            <PrimaryButton type="submit" disabled={submitting || !contact} className="flex-1">
              {submitting ? "Accepting..." : "Confirm & Accept"}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </Modal>
  );
}

/* ============================================================================
   TIME FILTER (filter bar)
   ============================================================================ */
function TimePicker({ value, onChange, theme }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
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
  const POPULAR_SLOTS = ["6:00 AM", "7:00 AM", "8:30 AM", "10:00 AM", "2:00 PM", "4:00 PM", "5:30 PM", "7:00 PM"];

  const chip = active =>
    active
      ? { background: BRAND_GRAD, color: "#04130a", borderColor: "transparent" }
      : { backgroundColor: t.cardAlt, color: t.text, borderColor: t.border };

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-sm flex items-center justify-between focus:outline-none cursor-pointer"
        style={{ color: value ? t.text : t.sub, fontWeight: value ? 600 : 500 }}
      >
        <span className="flex items-center gap-2 truncate">
          <Clock className="w-4 h-4 shrink-0" style={{ color: value ? t.green : t.faint }} />
          <span className="truncate">{value || "Any Time"}</span>
        </span>
        {value ? (
          <span
            role="button"
            className="p-0.5 ml-1"
            onClick={e => {
              e.stopPropagation();
              onChange("");
            }}
            title="Clear time"
          >
            <X className="w-3.5 h-3.5" style={{ color: t.sub }} />
          </span>
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 ml-1" style={{ color: t.sub }} />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-3 rounded-2xl p-4 w-72 border"
          style={{ backgroundColor: t.card, borderColor: t.border, boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }}
        >
          <div className="text-xs font-bold mb-2" style={{ color: t.sub }}>Popular slots</div>
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {POPULAR_SLOTS.map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  onChange(slot);
                  setOpen(false);
                }}
                className="py-1.5 px-1 rounded-lg text-[11px] font-bold text-center border cursor-pointer truncate"
                style={chip(value === slot)}
              >
                {slot}
              </button>
            ))}
          </div>

          <div className="text-xs font-bold mb-2 pt-3 border-t" style={{ color: t.sub, borderColor: t.border }}>Custom time</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <select
              value={draft.hour}
              onChange={e => setDraft(d => ({ ...d, hour: parseInt(e.target.value, 10) }))}
              className="w-full rounded-xl px-2 py-1.5 text-sm text-center font-bold focus:outline-none cursor-pointer"
              style={fieldStyle(isLight)}
              aria-label="Hour"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select
              value={draft.minute}
              onChange={e => setDraft(d => ({ ...d, minute: parseInt(e.target.value, 10) }))}
              className="w-full rounded-xl px-2 py-1.5 text-sm text-center font-bold focus:outline-none cursor-pointer"
              style={fieldStyle(isLight)}
              aria-label="Minute"
            >
              {[0, 15, 30, 45].map(m => (
                <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
              ))}
            </select>
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: t.inputBorder }}>
              {["AM", "PM"].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, period: p }))}
                  className="flex-1 py-1.5 text-xs font-bold cursor-pointer"
                  style={draft.period === p ? { background: BRAND_GRAD, color: "#04130a" } : { backgroundColor: t.input, color: t.sub }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <OutlineButton
              isLight={isLight}
              type="button"
              className="flex-1 py-2 text-xs"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Any Time
            </OutlineButton>
            <PrimaryButton
              type="button"
              className="flex-1 py-2 text-xs"
              onClick={() => {
                onChange(format(draft));
                setOpen(false);
              }}
            >
              Set Time
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   REVIEW SNIPPET
   ============================================================================ */
function ReviewSnippet({ isLight, rating, reviewer, team, text, when }) {
  const t = tokens(isLight);
  return (
    <div className="mt-3 p-3 rounded-xl border text-xs" style={{ backgroundColor: t.cardAlt, borderColor: t.border }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-semibold truncate flex items-center gap-1" style={{ color: t.text }}>
          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
          {Number(rating || 5).toFixed(1)} by {reviewer || "Opponent"}
          {team ? ` (${team})` : ""}
        </span>
        {when && <span className="shrink-0 text-[10px]" style={{ color: t.faint }}>{when}</span>}
      </div>
      <p className="italic pl-2 border-l-2 line-clamp-2" style={{ borderColor: t.green, color: t.sub }}>"{text}"</p>
    </div>
  );
}

const formatReviewDate = ts => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
};

/* ============================================================================
   YOUR POSTED CHALLENGE CARD
   ============================================================================ */
function MyPostedChallengeCard({ challenge, token, onDeleted, onViewTeam, theme }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
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
      setError(err.message || "Could not delete. Please try again.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <Card isLight={isLight} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h4 className="text-xl font-bold truncate" style={{ color: t.text }}>{challenge.team_name}</h4>
          <StatusBadge>Posted by you</StatusBadge>
        </div>
        <StatusBadge>{challenge.status === "on_hold" ? "On Hold" : "Open"}</StatusBadge>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
        <MetaRow isLight={isLight} icon={Calendar}>{challenge.match_date}</MetaRow>
        <MetaRow isLight={isLight} icon={Clock}>{prettyTime(challenge.time_slot)}</MetaRow>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Pill isLight={isLight}>{challenge.format}</Pill>
        {challenge.team_rating != null && (
          <Pill isLight={isLight} dot={false}>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {Number(challenge.team_rating).toFixed(1)}
            {challenge.reviews_count > 0 ? ` (${challenge.reviews_count} review${challenge.reviews_count !== 1 ? "s" : ""})` : ""}
          </Pill>
        )}
      </div>

      {challenge.note && <div className="text-sm mt-3" style={{ color: t.sub }}>{challenge.note}</div>}

      {challenge.latest_review_text && (
        <ReviewSnippet
          isLight={isLight}
          rating={challenge.latest_review_rating}
          reviewer={challenge.latest_reviewer_name}
          team={challenge.latest_reviewer_team_name}
          text={challenge.latest_review_text}
          when={formatReviewDate(challenge.latest_review_created_at)}
        />
      )}

      {error && (
        <div className="text-xs rounded-xl p-3 mt-3 font-medium border" style={{ backgroundColor: t.redSoft, borderColor: t.redBorder, color: t.red }}>
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        {onViewTeam && (
          <SoftButton isLight={isLight} type="button" onClick={() => onViewTeam(challenge)} className="flex-1">
            <Users className="w-4 h-4" /> View Team & Reviews
          </SoftButton>
        )}
        {!confirming ? (
          <OutlineButton isLight={isLight} tone="danger" type="button" onClick={() => setConfirming(true)} className="flex-1">
            <XCircle className="w-4 h-4" /> Delete
          </OutlineButton>
        ) : (
          <div className="flex gap-2 flex-1">
            <OutlineButton isLight={isLight} type="button" onClick={() => setConfirming(false)} disabled={deleting} className="flex-1">
              Keep
            </OutlineButton>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-60"
              style={{ background: DANGER_GRAD }}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ============================================================================
   DATA NORMALIZER
   ============================================================================ */
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
    rating: c.team_rating != null ? Number(c.team_rating) : c.rating ? Number(c.rating) : 5.0,
    reviewsCount: Number(c.reviews_count) || 0,
    latestReview:
      c.latest_review ||
      (c.latest_review_text
        ? {
            reviewer_name: c.latest_reviewer_name,
            reviewer_team_name: c.latest_reviewer_team_name,
            rating: c.latest_review_rating,
            review_text: c.latest_review_text,
            created_at: c.latest_review_created_at
          }
        : null),
    wins: 0,
    losses: 0
  };
}

/* ============================================================================
   CHALLENGES MAP
   ============================================================================ */
const challengePinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/><stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient></defs>
    <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="url(#pinGrad)"/>
    <circle cx="12" cy="9" r="3.5" fill="#0c120e"/>
  </svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

function ChallengesMap({ challenges, isLight }) {
  const t = tokens(isLight);
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
    <Card isLight={isLight} className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4" style={{ color: t.green }} />
        <span className="text-base font-bold" style={{ color: t.text }}>Where teams are playing</span>
      </div>

      {withLocation.length > 0 ? (
        /* isolation keeps Leaflet's z-indexes inside this box, so modals stay on top */
        <div
          className="rounded-xl overflow-hidden border"
          style={{ height: 240, borderColor: t.border, isolation: "isolate", position: "relative", zIndex: 0 }}
        >
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
                    <div>{c.format} · {c.date} {prettyTime(c.time)}</div>
                    <div>📍 {c.ground}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <p className="text-sm" style={{ color: t.sub }}>No challenges with a booked ground yet. See the list below.</p>
      )}

      {withoutLocation.length > 0 && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: t.sub }}>
            {withoutLocation.length} more challenge{withoutLocation.length > 1 ? "s" : ""} without a ground picked:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {withoutLocation.map(c => (
              <span
                key={c.id}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                style={{ backgroundColor: t.cardAlt, borderColor: t.border, color: t.sub }}
              >
                {c.team} · {c.format}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* Format card colours (match the Home stats cards: green / blue / orange / purple) */
const makeFormatColor = (solid, to, text) => ({
  solid,
  text,
  grad: `linear-gradient(135deg, ${solid} 0%, ${to} 100%)`,
  border: `${solid}55`,
  tint: `${solid}1f`,
  soft: `${solid}14`,
  glow: `${solid}40`
});
const FORMAT_COLOR_LIST = [
  makeFormatColor("#22c55e", "#16a34a", "#4ade80"),
  makeFormatColor("#3b82f6", "#2563eb", "#60a5fa"),
  makeFormatColor("#f97316", "#ea580c", "#fb923c"),
  makeFormatColor("#a855f7", "#9333ea", "#c084fc")
];
const FORMAT_COLORS = {
  T20: FORMAT_COLOR_LIST[0],
  ODI: FORMAT_COLOR_LIST[1],
  Turf: FORMAT_COLOR_LIST[2],
  Test: FORMAT_COLOR_LIST[3]
};

/* Banner illustrations for each format (inline SVG, no image files needed) */
function FormatArt({ kind }) {
  const ground = <ellipse cx="100" cy="98" rx="110" ry="30" fill="#ffffff" fillOpacity="0.14" />;
  const ball = (cx, cy, r = 8) => (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#dc2626" />
      <path d={`M${cx - r * 0.55} ${cy - r * 0.8} Q${cx + r * 0.2} ${cy} ${cx - r * 0.55} ${cy + r * 0.8}`} stroke="#fff" strokeOpacity="0.8" strokeWidth="1.2" fill="none" />
    </g>
  );
  const common = { viewBox: "0 0 200 90", preserveAspectRatio: "xMidYMid slice", className: "absolute inset-0 w-full h-full", "aria-hidden": true };

  if (kind === "ODI") {
    return (
      <svg {...common}>
        {ground}
        <text x="16" y="46" fontSize="34" fontWeight="900" fill="#fff" fillOpacity="0.18">50</text>
        <g transform="rotate(-38 104 52)">
          <rect x="96" y="22" width="17" height="50" rx="7" fill="#fde68a" />
          <rect x="101" y="6" width="7" height="20" rx="3" fill="#92400e" />
        </g>
        {ball(146, 60, 9)}
        <path d="M160 52 h18 M162 60 h20 M160 68 h16" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "Turf") {
    const v = Array.from({ length: 11 }, (_, i) => 24 + i * 15.2);
    const h = Array.from({ length: 6 }, (_, i) => 16 + i * 11);
    return (
      <svg {...common}>
        <rect x="0" y="74" width="200" height="16" fill="#fff" fillOpacity="0.16" />
        <rect x="20" y="10" width="160" height="66" rx="6" fill="#fff" fillOpacity="0.06" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
        {v.map(x => <line key={`v${x}`} x1={x} y1="10" x2={x} y2="76" stroke="#fff" strokeOpacity="0.22" />)}
        {h.map(y => <line key={`h${y}`} x1="20" y1={y} x2="180" y2={y} stroke="#fff" strokeOpacity="0.22" />)}
        {ball(118, 46, 8)}
        <path d="M84 40 h18 M80 47 h20 M84 54 h16" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "Test") {
    return (
      <svg {...common}>
        {ground}
        <text x="14" y="36" fontSize="18" fontWeight="900" fill="#fff" fillOpacity="0.2">5 DAYS</text>
        {[86, 97, 108].map(x => <rect key={x} x={x} y="26" width="6" height="52" rx="2" fill="#fef3c7" />)}
        <rect x="86" y="21" width="12" height="4" rx="2" fill="#fde68a" />
        <rect x="102" y="21" width="12" height="4" rx="2" fill="#fde68a" />
        {ball(150, 64, 9)}
      </svg>
    );
  }

  // T20 (default): floodlights, night game, lightning
  return (
    <svg {...common}>
      {ground}
      <rect x="90" y="68" width="20" height="30" rx="2" fill="#fff" fillOpacity="0.2" />
      <path d="M40 18 L96 66 L72 74 Z" fill="#fff" fillOpacity="0.12" />
      <path d="M160 18 L104 66 L128 74 Z" fill="#fff" fillOpacity="0.12" />
      <line x1="30" y1="82" x2="30" y2="22" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" />
      <line x1="170" y1="82" x2="170" y2="22" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" />
      <rect x="19" y="11" width="22" height="12" rx="2" fill="#fff" fillOpacity="0.92" />
      <rect x="159" y="11" width="22" height="12" rx="2" fill="#fff" fillOpacity="0.92" />
      <path d="M106 16 L92 42 H102 L96 62 L114 34 H104 L110 16 Z" fill="#fde047" />
    </svg>
  );
}

/* ============================================================================
   FIND MATCH TAB
   ============================================================================ */
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
  const isLight = detectLight(theme);
  const t = tokens(isLight);
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [dateFilter, setDateFilter] = useState(null);
  const [timeFilter, setTimeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [viewTeamTarget, setViewTeamTarget] = useState(null);

  // Keep the open details modal in sync with fresh challenge data (new reviews etc.)
  useEffect(() => {
    if (detailsTarget) {
      const updated = challenges.find(c => c.id === detailsTarget.id);
      if (updated) setDetailsTarget(normalizeChallenge(updated));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges]);

  const formatPostedAgo = timestamp => {
    if (!timestamp) return null;
    const posted = new Date(timestamp);
    if (isNaN(posted.getTime())) return null;
    const diffMin = Math.floor((Date.now() - posted.getTime()) / 60000);
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
    return posted.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  };

  const formatPhoneDisplay = phone => {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length !== 10) return phone;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const myPhone = normalizePhone(user?.phone);
  const teamPhoneSet = new Set([myPhone, ...teammatePhones].filter(Boolean));

  const myAcceptedChallenge = challenges.find(
    c =>
      c.status === "accepted" &&
      ((user?.id && String(c.accepted_by_user_id) === String(user.id)) ||
        (myPhone && normalizePhone(c.accepted_by_contact_no) === myPhone) ||
        (teamPhoneSet.size > 0 && teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no))))
  );

  const hasActiveAcceptedChallenge = Boolean(acceptedChallenge || myAcceptedChallenge);

  const openChallenges = challenges.filter(c => (!c.status || c.status === "open") && !teamPhoneSet.has(normalizePhone(c.contact_no)));
  const normalized = openChallenges.map(normalizeChallenge);
  const format = FORMATS[selectedFormat];

  const sameDay = (dateStr, isoTarget) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr === isoTarget;
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === isoTarget;
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
    if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
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
      return c.team.toLowerCase().includes(query) || c.ground.toLowerCase().includes(query) || c.note.toLowerCase().includes(query);
    });

  const activeFilters = [];
  if (searchQuery.trim()) activeFilters.push({ id: "search", label: `"${searchQuery.trim()}"`, clear: () => setSearchQuery("") });
  if (dateFilter) {
    const lbl =
      dateFilter === todayISO ? "Today" : dateFilter === tomorrowISO ? "Tomorrow" : dateFilter === weekendISO ? "Weekend" : formatDateDisplay(dateFilter);
    activeFilters.push({ id: "date", label: `📅 ${lbl}`, clear: () => setDateFilter(null) });
  }
  if (timeFilter) activeFilters.push({ id: "time", label: `⏰ ${timeFilter}`, clear: () => setTimeFilter("") });

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
    return da.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === db.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  };

  const hasActiveOnDate = targetDate =>
    teamPhoneSet.size > 0 &&
    challenges.some(c => {
      if (c.status !== "accepted") return false;
      const involved = teamPhoneSet.has(normalizePhone(c.contact_no)) || teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no));
      return involved && isSameCalendarDay(c.match_date, targetDate);
    });

  const myOwnOpenChallenges = challenges.filter(c => (c.status === "open" || c.status === "on_hold") && c.creator_id === user?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        isLight={isLight}
        icon={Zap}
        title="Find a Match"
        subtitle="Pick a format and challenge teams near you"
        action={
          <ChallengeForm
            token={token}
            user={user}
            onCreated={onChallengeCreated}
            disabledReason={null}
            autoOpen={autoOpenForm}
            onAutoOpenHandled={onAutoOpenHandled}
            theme={theme}
          />
        }
      />

      {/* FORMAT CARDS — illustrated banner + big centered count */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {FORMATS.map((f, i) => {
          const isSelected = i === selectedFormat;
          const count = formatCounts[f.key] || 0;
          const c = FORMAT_COLORS[f.key] || FORMAT_COLOR_LIST[i % FORMAT_COLOR_LIST.length];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setSelectedFormat(i)}
              aria-pressed={isSelected}
              className="relative overflow-hidden rounded-2xl border flex flex-col text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
              style={{
                background: isLight
                  ? `linear-gradient(180deg, #ffffff 0%, ${c.soft} 100%)`
                  : `linear-gradient(180deg, #0f1411 0%, ${c.tint} 100%)`,
                borderColor: isSelected ? c.solid : c.border,
                boxShadow: isSelected ? `0 0 0 1px ${c.solid}, 0 16px 36px -16px ${c.solid}` : `0 10px 26px -18px ${c.solid}`
              }}
            >
              {/* Banner */}
              <div className="relative h-20 sm:h-24 overflow-hidden" style={{ background: c.grad }}>
                <FormatArt kind={f.key} />
                <div className="absolute inset-x-0 bottom-0 h-6" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.18))" }} />
                {isSelected && (
                  <span
                    className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: "rgba(255,255,255,0.92)", color: c.solid }}
                  >
                    Selected
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="relative px-3 py-4 sm:py-5 flex flex-col items-center">
                <span
                  className="text-5xl sm:text-6xl font-black leading-none tracking-tighter tabular-nums"
                  style={{
                    background: c.grad,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: `drop-shadow(0 4px 14px ${c.glow})`
                  }}
                >
                  {count}
                </span>
                <span className="mt-3 font-bold text-sm sm:text-base" style={{ color: t.text }}>
                  {f.title}
                </span>
                <span className="text-xs sm:text-sm mt-0.5" style={{ color: t.sub }}>
                  {count === 1 ? "1 open challenge" : `${count} open challenges`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FILTERS */}
      <section>
        <SectionTitle
          isLight={isLight}
          title={`Filter ${format.title}`}
          badge={`${filtered.length} match${filtered.length === 1 ? "" : "es"}`}
          right={
            activeFilters.length > 0 && (
              <button type="button" onClick={clearAllFilters} className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer" style={{ color: t.red }}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )
          }
        />

        <Card isLight={isLight} accent={false} className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex-1 flex items-center px-4 py-3 min-w-0">
            <Search className="w-4 h-4 shrink-0 mr-2.5" style={{ color: searchQuery ? t.green : t.faint }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search team, ground or note"
              className="w-full text-sm bg-transparent focus:outline-none"
              style={{ color: t.text }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="p-1 cursor-pointer" aria-label="Clear search">
                <X className="w-3.5 h-3.5" style={{ color: t.sub }} />
              </button>
            )}
          </div>

          <div className="flex items-stretch border-t sm:border-t-0 sm:border-l" style={{ borderColor: t.border }}>
            <div className="flex-1 sm:w-44 px-4 py-3 flex items-center min-w-0 border-r" style={{ borderColor: t.border }}>
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
                  fontSize: "0.875rem",
                  fontWeight: dateFilter ? "600" : "500"
                }}
              />
            </div>
            <div className="flex-1 sm:w-44 px-4 py-3 flex items-center min-w-0">
              <TimePicker value={timeFilter} onChange={setTimeFilter} theme={theme} />
            </div>
          </div>
        </Card>

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5">
            {activeFilters.map(f => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ backgroundColor: t.greenSoft, color: t.green, borderColor: t.greenBorder }}
              >
                {f.label}
                <button type="button" onClick={f.clear} className="cursor-pointer" aria-label="Remove filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <ChallengesMap challenges={filtered} isLight={isLight} />

      {/* YOUR POSTED CHALLENGES */}
      {myOwnOpenChallenges.length > 0 && (
        <section>
          <SectionTitle isLight={isLight} title="Your Challenges" badge={`${myOwnOpenChallenges.length} active`} />
          <div className="space-y-4">
            {myOwnOpenChallenges.map(ch => (
              <MyPostedChallengeCard
                key={ch.id}
                challenge={{ ...ch, match_date: formatDateIST(ch.match_date) }}
                token={token}
                theme={theme}
                onDeleted={onChallengeDeleted}
                onViewTeam={c => setViewTeamTarget(c)}
              />
            ))}
          </div>
        </section>
      )}

      {/* CHALLENGE REQUESTS */}
      <section>
        <SectionTitle isLight={isLight} title="Challenge Requests" badge={`${filtered.length} open`} />

        {hasActiveAcceptedChallenge && (
          <div
            className="flex items-start gap-2.5 text-sm rounded-xl p-3 mb-4 border"
            style={{
              backgroundColor: isLight ? "#fffbeb" : "rgba(245,158,11,0.08)",
              borderColor: isLight ? "#fde68a" : "rgba(245,158,11,0.3)",
              color: isLight ? "#b45309" : "#fbbf24"
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              You already have an accepted match. Cancel it in <strong>My Team</strong> to accept another challenge.
            </span>
          </div>
        )}

        <div className="space-y-4">
          {filtered.length === 0 && (
            <Card isLight={isLight} className="p-8 text-center">
              <div className="text-3xl mb-2">🏏</div>
              <div className="text-sm font-bold" style={{ color: t.text }}>No {format.title} challenges right now</div>
              <p className="text-xs mt-1" style={{ color: t.sub }}>Try another format or clear your filters, or post your own challenge.</p>
            </Card>
          )}

          {filtered.map(c => {
            const blocked = hasActiveOnDate(c.rawDate);
            const postedAgo = formatPostedAgo(c.postedAt);
            return (
              <Card key={c.id} isLight={isLight} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h4 className="text-xl font-bold truncate" style={{ color: t.text }}>{c.team}</h4>
                    <StatusBadge>
                      ★ {c.rating.toFixed(1)}
                      {c.reviewsCount > 0 ? ` (${c.reviewsCount})` : " New"}
                    </StatusBadge>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge tone={c.urgent ? "red" : "green"}>{c.urgent ? "Urgent" : "Open"}</StatusBadge>
                    {postedAgo && <span className="text-[11px]" style={{ color: t.faint }}>{postedAgo}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                  <MetaRow isLight={isLight} icon={Calendar}>{c.date}</MetaRow>
                  <MetaRow isLight={isLight} icon={Clock}>{prettyTime(c.time)}</MetaRow>
                  <MetaRow isLight={isLight} icon={MapPin}>{c.ground}</MetaRow>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Pill isLight={isLight}>{format.title}</Pill>
                  {c.note && <Pill isLight={isLight} dot={false}>{c.note}</Pill>}
                </div>

                {c.latestReview && (
                  <ReviewSnippet
                    isLight={isLight}
                    rating={c.latestReview.rating}
                    reviewer={c.latestReview.reviewer_name}
                    team={c.latestReview.reviewer_team_name}
                    text={c.latestReview.review_text}
                    when={formatReviewDate(c.latestReview.created_at)}
                  />
                )}

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  {!hasActiveAcceptedChallenge && (
                    <SoftButton isLight={isLight} type="button" disabled={blocked} onClick={() => setAcceptTarget(c)} className="flex-1">
                      {blocked ? "Unavailable" : "Accept Challenge"}
                    </SoftButton>
                  )}
                  <OutlineButton isLight={isLight} type="button" onClick={() => setDetailsTarget(c)} className="flex-1">
                    View Details
                  </OutlineButton>
                  <OutlineButton isLight={isLight} type="button" onClick={() => setViewTeamTarget(c)} title={`View ${c.team} reviews`}>
                    <Users className="w-4 h-4" /> Reviews ({c.reviewsCount})
                  </OutlineButton>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* DETAILS MODAL */}
      {detailsTarget && (
        <Modal isLight={isLight} onClose={() => setDetailsTarget(null)} maxWidth="max-w-md">
          <Card isLight={isLight} className="p-5">
            <ModalHeader isLight={isLight} title={detailsTarget.team} onClose={() => setDetailsTarget(null)} />

            <div className="flex flex-wrap gap-2 mt-3">
              <StatusBadge>
                ★ {detailsTarget.rating.toFixed(1)}
                {detailsTarget.reviewsCount > 0 ? ` (${detailsTarget.reviewsCount})` : " New"}
              </StatusBadge>
              <StatusBadge tone={detailsTarget.urgent ? "red" : "green"}>{detailsTarget.urgent ? "Urgent" : "Open"}</StatusBadge>
              <Pill isLight={isLight}>{format.title}</Pill>
            </div>

            <div className="text-xs mt-3" style={{ color: t.sub }}>
              Posted by <span className="font-semibold" style={{ color: t.green }}>{detailsTarget.postedBy || formatPhoneDisplay(detailsTarget.contact_no) || "team contact"}</span>
              {formatPostedFull(detailsTarget.postedAt) && <span style={{ color: t.faint }}> on {formatPostedFull(detailsTarget.postedAt)}</span>}
            </div>

            <div className="rounded-xl p-4 border mt-4 space-y-2.5" style={{ backgroundColor: t.cardAlt, borderColor: t.border }}>
              <MetaRow isLight={isLight} icon={Calendar}>{detailsTarget.date}</MetaRow>
              <MetaRow isLight={isLight} icon={Clock}>{prettyTime(detailsTarget.time)}</MetaRow>
              <MetaRow isLight={isLight} icon={MapPin}>{detailsTarget.ground}</MetaRow>
              {formatPhoneDisplay(detailsTarget.contact_no) && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 shrink-0" style={{ color: t.green }} />
                  <a href={`tel:${detailsTarget.contact_no}`} className="font-semibold" style={{ color: t.green }}>
                    {formatPhoneDisplay(detailsTarget.contact_no)}
                  </a>
                </div>
              )}
              {detailsTarget.note && (
                <div className="text-sm pt-2.5 border-t" style={{ color: t.sub, borderColor: t.border }}>{detailsTarget.note}</div>
              )}
            </div>

            {detailsTarget.latestReview && (
              <ReviewSnippet
                isLight={isLight}
                rating={detailsTarget.latestReview.rating}
                reviewer={detailsTarget.latestReview.reviewer_name}
                team={detailsTarget.latestReview.reviewer_team_name}
                text={detailsTarget.latestReview.review_text}
                when={formatReviewDate(detailsTarget.latestReview.created_at)}
              />
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              {!hasActiveAcceptedChallenge && (
                <SoftButton
                  isLight={isLight}
                  type="button"
                  disabled={hasActiveOnDate(detailsTarget.rawDate)}
                  onClick={() => {
                    setAcceptTarget(detailsTarget);
                    setDetailsTarget(null);
                  }}
                  className="flex-1"
                >
                  {hasActiveOnDate(detailsTarget.rawDate) ? "Unavailable" : "Accept Challenge"}
                </SoftButton>
              )}
              <OutlineButton isLight={isLight} type="button" onClick={() => setViewTeamTarget(detailsTarget)} className="flex-1">
                <Users className="w-4 h-4" /> View Team
              </OutlineButton>
              <OutlineButton isLight={isLight} type="button" onClick={() => setDetailsTarget(null)} className="flex-1">
                Close
              </OutlineButton>
            </div>
          </Card>
        </Modal>
      )}

      {acceptTarget && (
        <AcceptChallengeModal
          challenge={acceptTarget}
          token={token}
          user={user}
          hasActiveAcceptedChallenge={hasActiveAcceptedChallenge}
          onClose={() => setAcceptTarget(null)}
          onAccepted={updated => {
            setAcceptTarget(null);
            onChallengeAccepted(updated);
          }}
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