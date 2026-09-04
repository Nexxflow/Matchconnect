import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Calendar, Clock, Filter, Search, ChevronDown, MapPin, CheckCircle, Phone, XCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "../../api";
import { C, cn, Tag, GhostButton, normalizePhone, formatDateIST } from "../../utils/helpers.jsx";
import { FORMATS, DEFAULT_OVERS } from "../../utils/constants";

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
const WEEKDAY_LABELS = ["S","M","T","W","T","F","S"];

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

function CalendarField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initialMonth = value ? new Date(value.split("-")[0], value.split("-")[1] - 1, 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInThisMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInThisMonth }, (_, i) => i + 1)
  ];

  const selectDay = day => {
    const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onChange(toISODate(picked));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full rounded-xl px-3 py-2 text-sm text-left focus:outline-none flex items-center justify-between" style={{ backgroundColor: "#111", border: `1px solid ${open ? "#22c55e" : "#2a2a2a"}`, color: value ? "#fff" : "#4a5a4a" }}>
        <span>{value ? formatDateDisplay(value) : "Select a date"}</span>
        <Calendar className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setOpen(false)}>
          <div className="rounded-2xl p-4 w-72" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a", boxShadow: "0 20px 40px rgba(0,0,0,0.8)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: "#c8ccc8" }}>‹</button>
              <span className="text-sm font-semibold text-white">{MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
              <button type="button" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: "#c8ccc8" }}>›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map((w, i) => <div key={i} className="text-center text-xs font-medium py-1" style={{ color: "#4a5a4a" }}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                const isPast = cellDate < today;
                const isSelected = value === toISODate(cellDate);
                const isToday = toISODate(cellDate) === toISODate(today);
                return (
                  <button key={i} type="button" disabled={isPast} onClick={() => selectDay(day)} className="aspect-square rounded-lg text-xs font-medium transition-colors" style={{
                    backgroundColor: isSelected ? "#22c55e" : "transparent",
                    color: isPast ? "#2a2a2a" : isSelected ? "#000" : isToday ? "#22c55e" : "#c8ccc8",
                    border: isToday && !isSelected ? "1px solid #22c55e" : "1px solid transparent",
                    cursor: isPast ? "not-allowed" : "pointer"
                  }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const { hour12, minute, ampm } = from24Hour(value);

  const set = (nextHour, nextMinute, nextAmpm) => onChange(to24Hour(nextHour, nextMinute, nextAmpm));

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full rounded-xl px-3 py-2 text-sm text-left focus:outline-none flex items-center justify-between" style={{ backgroundColor: "#111", border: `1px solid ${open ? "#22c55e" : "#2a2a2a"}`, color: value ? "#fff" : "#4a5a4a" }}>
        <span>{value ? formatTimeDisplay(value) : "Select a time"}</span>
        <Clock className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 sm:bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:left-0 top-1/2 -translate-y-1/2 sm:top-[calc(100%+6px)] sm:translate-y-0 z-50 rounded-2xl p-4 w-auto sm:w-60 max-w-xs mx-auto sm:mx-0" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a", boxShadow: "0 20px 40px rgba(0,0,0,0.8)" }}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-xs mb-1 block text-center" style={{ color: "#6b7a6b" }}>Hour</label>
                <select value={hour12} onChange={e => set(e.target.value, minute, ampm)} className="w-full rounded-lg px-1 py-1.5 text-sm text-white text-center focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block text-center" style={{ color: "#6b7a6b" }}>Min</label>
                <select value={minute} onChange={e => set(hour12, e.target.value, ampm)} className="w-full rounded-lg px-1 py-1.5 text-sm text-white text-center focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
                  {["00", "15", "30", "45"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block text-center" style={{ color: "#6b7a6b" }}>&nbsp;</label>
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
                  {["AM", "PM"].map(p => <button key={p} type="button" onClick={() => set(hour12, minute, p)} className="flex-1 py-1.5 text-xs font-bold transition-colors" style={{ backgroundColor: ampm === p ? "#22c55e" : "#111", color: ampm === p ? "#000" : "#6b7a6b" }}>{p}</button>)}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="w-full py-2 rounded-lg bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors">Done</button>
          </div>
        </>
      )}
    </div>
  );
}

function ChallengeForm({ token, user, onCreated, disabledReason, grounds = [], autoOpen = false, onAutoOpenHandled }) {
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
    if (!normalizedContact || normalizedContact.length < 10 || normalizedContact.length > 15) missing.push("Phone number");
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

  if (disabledReason) {
    return (
      <div className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2" style={{ border: "1px dashed #2a2a2a", color: "#4a5a4a", backgroundColor: "#131413" }}>
        {disabledReason}
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => {
        const err = checkProfileCompleteness();
        if (err) return;
        setOpen(true);
      }} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px dashed #2a2a2a", color: "#22c55e" }}>
        <Plus className="w-4 h-4" /> Post a Match Challenge
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }} onClick={() => setOpen(false)}>
      <form onSubmit={handleSubmit} className={cn(C, "w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]")} style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
          <span className="text-base font-semibold text-white">Post a Match Challenge</span>
          <button type="button" onClick={() => { setOpen(false); setError(null); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors" style={{ backgroundColor: "#222" }}>
            <X className="w-4 h-4 text-[#c8ccc8]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Team name</label>
            <input value={form.team_name} readOnly disabled className="w-full rounded-xl px-3 py-2 text-sm font-semibold cursor-not-allowed" style={{ backgroundColor: "#151515", border: "1px solid #2a2a2a", color: "#6b7a6b" }} placeholder="Team Name" />
            <p className="text-xs mt-1" style={{ color: "#4a5a4a" }}>From your user account profile.</p>
          </div>

          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Contact number</label>
            <input value={contact} readOnly disabled className="w-full rounded-xl px-3 py-2 text-sm font-mono cursor-not-allowed" style={{ backgroundColor: "#151515", border: "1px solid #2a2a2a", color: "#6b7a6b" }} />
            <p className="text-xs mt-1" style={{ color: "#4a5a4a" }}>From your account. Only shared with the team that accepts your challenge.</p>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Format</label>
            <div className="relative">
              <select value={form.format} onChange={e => handleFormatChange(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white appearance-none pr-7 focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
                {FORMATS.map(f => <option key={f.key} value={f.key}>{f.title}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6b7a6b" }} />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>
              Overs {form.format !== "Test" && <span style={{ color: "#4a5a4a" }}>(default {DEFAULT_OVERS[form.format]})</span>}
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={form.overs}
              onChange={e => update("overs", e.target.value)}
              placeholder={form.format === "Test" ? "Not applicable" : String(DEFAULT_OVERS[form.format])}
              disabled={form.format === "Test"}
              className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
            />
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Ground booked?</label>
            <div className="relative">
              <select value={form.hasGround ? "yes" : "no"} onChange={e => update("hasGround", e.target.value === "yes")} className="w-full rounded-xl px-3 py-2 text-sm text-white appearance-none pr-7 focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
                <option value="no">Not booked yet</option>
                <option value="yes">Already booked</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6b7a6b" }} />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Match date</label>
            <CalendarField value={form.match_date} onChange={v => update("match_date", v)} />
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Match time</label>
            <TimeField value={form.time_slot} onChange={v => update("time_slot", v)} />
          </div>

          {form.hasGround && (
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Ground</label>
              {grounds.length > 0 ? (
                <>
                  <div className="relative">
                    <select
                      value={form.ground_id}
                      onChange={e => update("ground_id", e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm text-white appearance-none pr-7 focus:outline-none"
                      style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
                    >
                      <option value="">Select a ground</option>
                      {grounds.map(g => <option key={g.id ?? g.name} value={g.id ?? g.name}>{g.name}{g.area ? ` — ${g.area}` : ""}</option>)}
                      <option value="other">Other / not listed</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6b7a6b" }} />
                  </div>
                  {form.ground_id === "other" && (
                    <input
                      value={form.ground_custom}
                      onChange={e => update("ground_custom", e.target.value)}
                      className="w-full mt-2 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
                      placeholder="Ground name"
                    />
                  )}
                </>
              ) : (
                <input
                  value={form.ground_custom}
                  onChange={e => { update("ground_custom", e.target.value); update("ground_id", "other"); }}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
                  placeholder="Green Park Cricket Ground"
                />
              )}
            </div>
          )}

          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Description</label>
            <textarea value={form.note} onChange={e => update("note", e.target.value)} rows={3} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none resize-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Looking for a friendly T20 match, intermediate level..." />
          </div>
        </div>

        {error && <div className="text-xs text-red-400 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

        <button type="submit" disabled={submitting || !normalizedContact} className="w-full py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors" style={(submitting || !normalizedContact) ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
          {submitting ? "Posting..." : "Post Challenge"}
        </button>
      </form>
    </div>
  );
}

function AcceptChallengeModal({ challenge, token, user, hasActiveAcceptedChallenge, onClose, onAccepted }) {
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
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <form onSubmit={handleSubmit} className="w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-white">Accept Challenge vs {challenge.team}</span>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
            <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: "#6b7a6b" }}>
          Share your team name so {challenge.team} can reach you to lock in details. Both numbers stay private until you accept.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Your team name</label>
            <input value={teamName} readOnly disabled className="w-full rounded-xl px-3 py-2 text-sm font-semibold cursor-not-allowed" style={{ backgroundColor: "#151515", border: "1px solid #2a2a2a", color: "#6b7a6b" }} placeholder="Your team name" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Contact number</label>
            <input
              value={contact}
              readOnly
              disabled
              className="w-full rounded-xl px-3 py-2 text-sm font-mono cursor-not-allowed"
              style={{ backgroundColor: "#151515", border: "1px solid #2a2a2a", color: "#6b7a6b" }}
            />
            <p className="text-xs mt-1" style={{ color: "#4a5a4a" }}>From your account. Update it in your profile if it's wrong.</p>
          </div>
        </div>
        {error && <div className="text-xs text-red-400 rounded-lg p-2 mt-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
        <button type="submit" disabled={submitting || !contact} className="w-full py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm mt-4 hover:bg-green-400 transition-colors" style={(submitting || !contact) ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
          {submitting ? "Accepting..." : "Confirm & Accept"}
        </button>
      </form>
    </div>
  );
}

function ChatModal({ challenge, token, onClose }) {
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
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5 flex flex-col" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a", height: "70vh", maxHeight: 520 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white">Match Chat</div>
            <div className="text-xs" style={{ color: "#6b7a6b" }}>{challenge.team_name} vs {challenge.accepted_by_team_name}</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
            <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
          {loading && <div className="text-xs text-center py-6" style={{ color: "#4a5a4a" }}>Loading chat history...</div>}
          {!loading && messages.length === 0 && <div className="text-xs text-center py-6" style={{ color: "#4a5a4a" }}>No messages yet — say hello!</div>}
          {messages.map(m => (
            <div key={m.id} className="max-w-[80%]" style={{ marginLeft: m.sender_team_name === challenge.myTeamName ? "auto" : 0 }}>
              <div className="text-xs px-1 mb-0.5" style={{ color: "#4a5a4a" }}>{m.sender_team_name}</div>
              <div className="rounded-xl px-3 py-2 text-xs" style={m.sender_team_name === challenge.myTeamName ? { backgroundColor: "#22c55e", color: "#000" } : { backgroundColor: "#1a1a1a", color: "#c8ccc8", border: "1px solid #2a2a2a" }}>
                {m.body}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} className="flex-1 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Type a message..." />
          <button onClick={send} disabled={sending} className="px-4 py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors" style={sending ? { opacity: 0.6, cursor: "not-allowed" } : {}}>Send</button>
        </div>
      </div>
    </div>
  );
}

function DateCalendarPicker({ value, onChange }) {
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
      <label className="text-xs mb-1.5 block" style={{ color: "#6b7a6b" }}>Date</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl px-3 py-2 text-xs flex items-center justify-between focus:outline-none transition-colors"
        style={{ backgroundColor: "#111", border: open ? "1px solid #22c55e" : "1px solid #2a2a2a", color: value ? "#fff" : "#c8ccc8" }}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#6b7a6b" }} />
          {value
            ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "Any Date"}
        </span>
        {value && <X className="w-3 h-3 shrink-0" style={{ color: "#6b7a6b" }} onClick={e => { e.stopPropagation(); onChange(null); }} />}
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 mt-2 rounded-2xl p-3 w-64" style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              style={!value ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid #22c55e" } : { backgroundColor: "#1e211e", color: "#8a938a", border: "1px solid #2a2a2a" }}
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
                  style={active ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid #22c55e" } : { backgroundColor: "#1e211e", color: "#8a938a", border: "1px solid #2a2a2a" }}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded-lg transition-colors" style={{ color: "#6b7a6b" }}>
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
            </button>
            <span className="text-xs font-semibold text-white">{monthLabel}</span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded-lg transition-colors" style={{ color: "#6b7a6b" }}>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center text-[10px]" style={{ color: "#4a5a4a" }}>{d}</div>)}
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
                      ? { backgroundColor: "#22c55e", color: "#000" }
                      : isPast
                      ? { color: "#3a3a3a", cursor: "not-allowed" }
                      : isToday
                      ? { color: "#22c55e", border: "1px solid #22c55e" }
                      : { color: "#c8ccc8" }
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

function TimePicker({ value, onChange }) {
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
  }, [open]);

  const format = d => `${d.hour}:${String(d.minute).padStart(2, "0")} ${d.period}`;

  const apply = () => {
    onChange(format(draft));
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="text-xs mb-1.5 block" style={{ color: "#6b7a6b" }}>Time</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl px-3 py-2 text-xs flex items-center justify-between focus:outline-none transition-colors"
        style={{ backgroundColor: "#111", border: open ? "1px solid #22c55e" : "1px solid #2a2a2a", color: value ? "#fff" : "#c8ccc8" }}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "#6b7a6b" }} />
          {value || "Any Time"}
        </span>
        {value && <X className="w-3 h-3 shrink-0" style={{ color: "#6b7a6b" }} onClick={e => { e.stopPropagation(); onChange(""); }} />}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 rounded-2xl p-3 w-64" style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "#4a5a4a" }}>Hour</label>
              <select
                value={draft.hour}
                onChange={e => setDraft(d => ({ ...d, hour: parseInt(e.target.value, 10) }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "#4a5a4a" }}>Minute</label>
              <select
                value={draft.minute}
                onChange={e => setDraft(d => ({ ...d, minute: parseInt(e.target.value, 10) }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
              >
                {[0, 15, 30, 45].map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "#4a5a4a" }}>Period</label>
              <select
                value={draft.period}
                onChange={e => setDraft(d => ({ ...d, period: e.target.value }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors"
              style={{ backgroundColor: "#1e211e", color: "#8a938a", border: "1px solid #2a2a2a" }}
            >
              Any Time
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors"
              style={{ backgroundColor: "#22c55e", color: "#000" }}
            >
              Set Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyPostedChallengeCard({ challenge, token, onDeleted }) {
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
    <div className={cn(C, "rounded-2xl p-4")}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Your Posted Challenge</span>
        <Tag color="blue">{challenge.status === "on_hold" ? "On Hold" : "Open"}</Tag>
      </div>
      <div className="text-sm font-semibold text-white">{challenge.team_name}</div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <Tag color="blue">{challenge.format}</Tag>
        <Tag color="green">{challenge.match_date} · {challenge.time_slot}</Tag>
      </div>
      {challenge.note && <div className="text-xs mt-1.5" style={{ color: "#6b7a6b" }}>{challenge.note}</div>}

      {error && <div className="text-xs text-red-400 rounded-lg p-2 mt-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="w-full mt-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5">
          <XCircle className="w-3.5 h-3.5" /> Delete Challenge
        </button>
      ) : (
        <div className="flex gap-2 mt-3">
          <GhostButton onClick={() => setConfirming(false)} disabled={deleting} className="flex-1 text-center">Keep it</GhostButton>
          <button disabled={deleting} onClick={handleDelete} className="flex-[2] py-2 rounded-xl bg-red-500 text-black font-bold text-xs hover:bg-red-400 transition-colors" style={deleting ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

function normalizeChallenge(c) {
  return {
    id: c.id,
    team: c.team_name,
    contact_no: c.contact_no,
    postedBy: c.posted_by_name || c.creator_name || null,
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
    rating: 0,
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
  entryMode = "browse"
}) {
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [dateFilter, setDateFilter] = useState(null);
  const [timeFilter, setTimeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);

  const normalize = normalizeChallenge;

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

  const myTeamAcceptedChallenge = challenges.find(
    c =>
      c.status === "accepted" &&
      ((user?.id && (c.accepted_by_user_id === user.id || c.creator_id === user.id)) ||
        (myPhone &&
          (normalizePhone(c.contact_no) === myPhone ||
            normalizePhone(c.accepted_by_contact_no) === myPhone)) ||
        (teamPhoneSet.size > 0 &&
          (teamPhoneSet.has(normalizePhone(c.contact_no)) ||
            teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no)))))
  );

  const hasActiveAcceptedChallenge = Boolean(acceptedChallenge || myTeamAcceptedChallenge);

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

  const activeFilterCount = [dateFilter, timeFilter || null].filter(Boolean).length;

  const myOwnOpenChallenges = challenges.filter(
    c => (c.status === "open" || c.status === "on_hold") && c.creator_id === user?.id
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Find a Match</h2>
        <p className="text-sm mt-1" style={{ color: "#6b7a6b" }}>Select your preferred format and get matched instantly</p>
      </div>

      {(() => {
        const challengeFormBlock = (
          <ChallengeForm
            key="challenge-form"
            token={token}
            user={user}
            onCreated={onChallengeCreated}
            disabledReason={null}
            autoOpen={autoOpenForm}
            onAutoOpenHandled={onAutoOpenHandled}
          />
        );

        const formatCardsBlock = (
          <div key="format-cards" className="grid grid-cols-2 gap-3">
            {FORMATS.map((f, i) => (
              <button key={f.key} onClick={() => setSelectedFormat(i)} className="p-4 rounded-2xl text-left transition-all" style={{
                backgroundColor: i === selectedFormat ? "rgba(34,197,94,0.1)" : "#1a1a1a",
                border: i === selectedFormat ? "1px solid #22c55e" : "1px solid #2a2a2a",
                boxShadow: i === selectedFormat ? "0 0 0 1px rgba(34,197,94,0.2)" : "none"
              }}>
                <div className="text-3xl mb-2">{f.emoji}</div>
                <div className="font-semibold text-sm" style={{ color: i === selectedFormat ? "#22c55e" : "#fff" }}>{f.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{f.desc}</div>
                {i === selectedFormat && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-green-400" style={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
                    <CheckCircle className="w-3 h-3" /> Selected
                  </div>
                )}
              </button>
            ))}
          </div>
        );

        const mapBlock = <ChallengesMap key="map" challenges={filtered} />;

        const filterBlock = (
          <div key="filter" className={cn(C, "rounded-2xl p-4")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-green-400" />
                <span className="text-sm font-semibold text-white">Filter {format.title} challenges</span>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setDateFilter(null); setTimeFilter(""); }}
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: "#6b7a6b" }}
                >
                  Clear filters ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by team or ground"
                className="w-full rounded-xl pl-9 pr-8 py-2.5 text-xs focus:outline-none transition-colors"
                style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DateCalendarPicker value={dateFilter} onChange={setDateFilter} />
              <TimePicker value={timeFilter} onChange={setTimeFilter} />
            </div>
          </div>
        );

        return (
          <>
            {formatCardsBlock}
            {entryMode === "create"
              ? <>{challengeFormBlock}{mapBlock}{filterBlock}</>
              : <>{filterBlock}{mapBlock}{challengeFormBlock}</>}
          </>
        );
      })()}

      {myOwnOpenChallenges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Your Posted Challenges ({myOwnOpenChallenges.length})</h3>
          </div>
          {myOwnOpenChallenges.map(ch => (
            <MyPostedChallengeCard
              key={ch.id}
              challenge={{
                ...ch,
                match_date: formatDateIST(ch.match_date)
              }}
              token={token}
              onDeleted={onChallengeDeleted}
            />
          ))}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Challenge Requests</h3>
        </div>

        {hasActiveAcceptedChallenge && (
          <div
            className="flex items-center gap-2.5 text-xs rounded-xl p-3 mb-3"
            style={{
              backgroundColor: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#f59e0b",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              You already have an active accepted match challenge. You can only accept one challenge at a time. To accept another challenge, cancel your active match in <strong>My Team</strong>.
            </span>
          </div>
        )}

        <div className="space-y-3">
          {filtered.length === 0 && <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>No challenges match your filters right now.</div>}
          {filtered.map(t => {
            const blocked = hasActiveOnDate(t.rawDate);
            const postedAgo = formatPostedAgo(t.postedAt);
            return (
              <div key={t.id} className={cn(C, "rounded-2xl p-4 transition-colors")} style={{ borderColor: t.urgent ? "rgba(245,158,11,0.35)" : "#2a2a2a" }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                    {t.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{t.team}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {postedAgo && (
                      <span className="text-[10px] font-medium" style={{ color: "#4a5a4a" }}>{postedAgo}</span>
                    )}
                    {t.urgent && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>⚡ Urgent</span>}
                  </div>
                </div> 

                <div className="mt-3 rounded-2xl p-4 space-y-3" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#c8d0c8" }}>
                      <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />
                      <span>{t.date}</span>
                      <span style={{ color: "#3a3a3a" }}>•</span>
                      <span>{t.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#c8d0c8" }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />
                      <span className="truncate">{t.ground}</span>
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
                      className="flex-1 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-colors text-center"
                      style={blocked
                        ? { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }
                        : { backgroundColor: "#22c55e", color: "#000" }}
                      onMouseEnter={e => !blocked && (e.currentTarget.style.backgroundColor = "#4ade80")}
                      onMouseLeave={e => !blocked && (e.currentTarget.style.backgroundColor = "#22c55e")}
                    >
                      {blocked ? "Unavailable" : "Accept Challenge"}
                    </button>
                  )}
                  <GhostButton className="flex-1 text-center py-2.5 sm:py-2" onClick={() => setDetailsTarget(t)}>View Details</GhostButton>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {detailsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
          onClick={() => setDetailsTarget(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative animate-in fade-in zoom-in-95 duration-150"
            style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {formatPostedAgo(detailsTarget.postedAt) && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "#1e211e", color: "#8a978a", border: "1px solid #2a2a2a" }}>
                  {formatPostedAgo(detailsTarget.postedAt)}
                </span>
              )}
              <button onClick={() => setDetailsTarget(null)} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: "#1e211e" }}>
                <X className="w-4 h-4" style={{ color: "#9ca39c" }} />
              </button>
            </div>

            <div className="flex items-center gap-3 pr-20">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                {detailsTarget.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Tag color="blue">{format.title}</Tag>
                {detailsTarget.urgent && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>⚡ Urgent</span>}
              </div>
            </div>

            <div className="mt-4 rounded-2xl p-4 space-y-3" style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e" }}>
              <div className="pb-3 border-b" style={{ borderColor: "#1e1e1e" }}>
                <div className="text-lg font-bold text-white truncate">{detailsTarget.team}</div>
                <div className="text-xs mt-1" style={{ color: "#6b7a6b" }}>
                  Posted by{" "}
                  <span className="font-semibold" style={{ color: "#4ade80" }}>
                    {detailsTarget.postedBy || formatPhoneDisplay(detailsTarget.contact_no) || "team contact"}
                  </span>
                  {formatPostedFull(detailsTarget.postedAt) && (
                    <span style={{ color: "#4a5a4a" }}> · {formatPostedFull(detailsTarget.postedAt)}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm" style={{ color: "#e2e8e2" }}>
                  <Calendar className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />
                  <span>{detailsTarget.date}</span>
                  <span style={{ color: "#3a3a3a" }}>•</span>
                  <span>{detailsTarget.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "#e2e8e2" }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />
                  <span>{detailsTarget.ground}</span>
                </div>
                {formatPhoneDisplay(detailsTarget.contact_no) && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#e2e8e2" }}>
                    <Phone className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />
                    <a href={`tel:${detailsTarget.contact_no}`} className="font-semibold" style={{ color: "#4ade80" }}>
                      {formatPhoneDisplay(detailsTarget.contact_no)}
                    </a>
                  </div>
                )}
                {detailsTarget.note && (
                  <div className="text-sm pt-2 border-t" style={{ color: "#9ca39c", borderColor: "#1e1e1e" }}>{detailsTarget.note}</div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {!hasActiveAcceptedChallenge && (
                <button
                  disabled={hasActiveOnDate(detailsTarget.rawDate)}
                  onClick={() => { setAcceptTarget(detailsTarget); setDetailsTarget(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={hasActiveOnDate(detailsTarget.rawDate)
                    ? { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }
                    : { backgroundColor: "#22c55e", color: "#000" }}
                  onMouseEnter={e => !hasActiveOnDate(detailsTarget.rawDate) && (e.currentTarget.style.backgroundColor = "#4ade80")}
                  onMouseLeave={e => !hasActiveOnDate(detailsTarget.rawDate) && (e.currentTarget.style.backgroundColor = "#22c55e")}
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
        />
      )}
    </div>
  );
}
