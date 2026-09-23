import React, { useState, useEffect } from "react";
import { Filter, Search, ChevronDown, MapPin, Star, Plus, X, Map, Pencil, Trash2, ExternalLink, Hash, RotateCcw, IndianRupee, Sparkles, Zap } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "../../api";
import { C, cn, Tag, GhostButton, buildGroundMapsEmbedUrl, buildGroundMapsLink } from "../../utils/helpers.jsx";
import { GROUNDS, TIME_SLOTS } from "../../utils/constants";
import CalendarField from "../CalendarField.jsx";

function GroundsMap({ grounds, canBookGround, displayPrice, displayLocation, theme = "dark" }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const withLocation = grounds.filter(g => g.latitude != null && g.longitude != null);
  const withoutLocation = grounds.filter(g => g.latitude == null || g.longitude == null);

  if (grounds.length === 0) return null;

  const center = withLocation.length
    ? [
        withLocation.reduce((s, g) => s + Number(g.latitude), 0) / withLocation.length,
        withLocation.reduce((s, g) => s + Number(g.longitude), 0) / withLocation.length
      ]
    : [13.0827, 80.2707];

  const availableIcon = L.divIcon({
    className: "",
    html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="groundPinAvail" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
        </linearGradient>
      </defs>
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="url(#groundPinAvail)"/>
      <circle cx="12" cy="9" r="3.5" fill="#0d0f0d"/>
    </svg>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28]
  });
  const bookedIcon = L.divIcon({
    className: "",
    html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="groundPinBooked" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
      </defs>
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="url(#groundPinBooked)"/>
      <circle cx="12" cy="9" r="3.5" fill="#0d0f0d"/>
    </svg>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28]
  });

  return (
    <div
      className={cn(C, "rounded-2xl p-4 relative overflow-hidden")}
      style={{
        backgroundColor: isLight ? "#ffffff" : undefined,
        border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
        boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316)" }} />
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)" }}>
          <MapPin className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold" style={{
          background: isLight
            ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
            : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>Grounds near you</span>
      </div>

      {withLocation.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ height: 220, border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }}>
          <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withLocation.map(g => {
              const free = canBookGround(g);
              return (
                <Marker key={g.id || g.name} position={[Number(g.latitude), Number(g.longitude)]} icon={free ? availableIcon : bookedIcon}>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-semibold">{g.name}</div>
                      <div>{displayPrice(g)} · {free ? "Available today" : "Booked today"}</div>
                      <div>📍 {displayLocation(g)}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <p className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No grounds with a saved location yet — see the list below.</p>
      )}

      {withoutLocation.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] mb-1.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            {withoutLocation.length} more ground{withoutLocation.length > 1 ? "s" : ""} — no location on file, so no pin on the map:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {withoutLocation.map(g => (
              <span
                key={g.id || g.name}
                className="px-2 py-1 rounded-lg text-[11px] font-medium"
                style={{
                  backgroundColor: isLight ? "#f1f5f9" : "#1a1a1a",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  color: isLight ? "#475569" : "#c8ccc8"
                }}
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroundForm({ token, onCreated, initialGround = null, onUpdated, onDeleted, onClose, theme }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const buildForm = ground => ({
    name: ground?.name || "",
    area: ground?.area || "",
    price_per_hour: ground?.price_per_hour ?? ground?.price ?? "",
    google_maps_url: ground?.googleMapsUrl || ground?.google_maps_url || "",
    availability_mode: ground?.availability_mode || "always",
    available_date: ground?.available_date || "",
    available_time: ground?.available_time || ""
  });

  const editing = !!initialGround;
  const [open, setOpen] = useState(Boolean(initialGround));
  const [form, setForm] = useState(buildForm(initialGround));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editing) {
      setOpen(true);
      setForm(buildForm(initialGround));
      setError(null);
    }
  }, [editing, initialGround]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Ground name is required.");
    if (!form.area.trim()) return setError("Location is required.");
    if (!form.price_per_hour || Number(form.price_per_hour) <= 0) return setError("Price per hour must be greater than 0.");
    if (form.availability_mode === "scheduled" && (!form.available_date || !form.available_time)) {
      return setError("Add an available date and time or choose always available.");
    }
    if (!token) return setError("You need to be logged in to register a ground.");

    setSubmitting(true);
    try {
      if (editing) {
        const res = await apiRequest(`/grounds/${initialGround.id}`, {
          method: "PUT",
          token,
          body: {
            name: form.name.trim(),
            area: form.area.trim(),
            price_per_hour: Number(form.price_per_hour),
            google_maps_url: form.google_maps_url.trim() || null,
            availability_mode: form.availability_mode,
            available_date: form.availability_mode === "scheduled" ? form.available_date : null,
            available_time: form.availability_mode === "scheduled" ? form.available_time : null
          }
        });
        onUpdated?.(res.ground);
        onClose?.();
      } else {
        const res = await apiRequest("/grounds", {
          method: "POST",
          token,
          body: {
            name: form.name.trim(),
            area: form.area.trim(),
            price_per_hour: Number(form.price_per_hour),
            google_maps_url: form.google_maps_url.trim() || null,
            availability_mode: form.availability_mode,
            available_date: form.availability_mode === "scheduled" ? form.available_date : null,
            available_time: form.availability_mode === "scheduled" ? form.available_time : null
          }
        });
        onCreated(res.ground);
        setForm(buildForm(null));
        setOpen(false);
      }
    } catch (err) {
      setError(err.message || (editing ? "Could not update ground — please try again." : "Could not register ground — please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !initialGround?.id) return;
    if (!window.confirm("Are you sure you want to delete this ground?")) return;

    setSubmitting(true);
    try {
      await apiRequest(`/grounds/${initialGround.id}`, { method: "DELETE", token });
      onDeleted?.(initialGround.id);
      onClose?.();
    } catch (err) {
      setError(err.message || "Could not delete this ground.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTriggerButton = () => (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
      )}
      style={{
        background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
        color: "#ffffff",
        boxShadow: isLight
          ? "0 4px 14px -3px rgba(16,185,129,0.45)"
          : "0 6px 20px -6px rgba(34,197,94,0.7)"
      }}
    >
      <Plus className="w-4 h-4" /> Register a Ground
    </button>
  );

  const formElement = (
    <form
      onSubmit={handleSubmit}
      className={cn(C, "rounded-2xl p-4 space-y-3 relative overflow-hidden")}
      style={{
        backgroundColor: isLight ? "#ffffff" : "#141414",
        border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
        boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : "0 8px 32px rgba(0,0,0,0.4)"
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316,#ec4899)" }} />
      <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#2a2a2a" }}>
        <span className="text-sm font-bold flex items-center gap-2" style={{
          background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#22c55e", WebkitTextFillColor: "initial" }} />
          {editing ? "Edit Ground" : "Register a Ground"}
        </span>
        <button
          type="button"
          onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
          style={{ backgroundColor: isLight ? "#f1f5f9" : "#222" }}
        >
          <X className="w-3.5 h-3.5" style={{ color: isLight ? "#475569" : "#c8ccc8" }} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Ground name</label>
          <input
            value={form.name}
            onChange={e => update("name", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#111",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              color: isLight ? "#0f172a" : "#fff",
              boxShadow: "none"
            }}
            onFocus={e => e.currentTarget.style.boxShadow = isLight ? "0 0 0 3px rgba(22,163,74,0.12)" : "0 0 0 3px rgba(34,197,94,0.18)"}
            onBlur={e => e.currentTarget.style.boxShadow = "none"}
            placeholder="Green Park Cricket Ground"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Location / Area</label>
          <input
            value={form.area}
            onChange={e => update("area", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#111",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              color: isLight ? "#0f172a" : "#fff"
            }}
            onFocus={e => e.currentTarget.style.boxShadow = isLight ? "0 0 0 3px rgba(22,163,74,0.12)" : "0 0 0 3px rgba(34,197,94,0.18)"}
            onBlur={e => e.currentTarget.style.boxShadow = "none"}
            placeholder="Linking Road, Bandra West"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Price per hour (₹)</label>
          <input
            type="number"
            min="1"
            value={form.price_per_hour}
            onChange={e => update("price_per_hour", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none transition-all"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#111",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              color: isLight ? "#0f172a" : "#fff"
            }}
            onFocus={e => e.currentTarget.style.boxShadow = isLight ? "0 0 0 3px rgba(22,163,74,0.12)" : "0 0 0 3px rgba(34,197,94,0.18)"}
            onBlur={e => e.currentTarget.style.boxShadow = "none"}
            placeholder="1200"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Google Maps link</label>
          <input
            value={form.google_maps_url}
            onChange={e => update("google_maps_url", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#111",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              color: isLight ? "#0f172a" : "#fff"
            }}
            onFocus={e => e.currentTarget.style.boxShadow = isLight ? "0 0 0 3px rgba(22,163,74,0.12)" : "0 0 0 3px rgba(34,197,94,0.18)"}
            onBlur={e => e.currentTarget.style.boxShadow = "none"}
            placeholder="https://www.google.com/maps/..."
          />
        </div>
        <div>
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Availability</label>
          <select
            value={form.availability_mode}
            onChange={e => update("availability_mode", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-all cursor-pointer"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#111",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              color: isLight ? "#0f172a" : "#fff"
            }}
          >
            <option value="always">Always available</option>
            <option value="scheduled">Available on a date/time</option>
          </select>
        </div>
        {form.availability_mode === "scheduled" && (
          <>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Available date</label>
              <CalendarField
                value={form.available_date}
                onChange={v => update("available_date", v)}
                theme={theme}
                placeholder="Select available date"
                clearable={true}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Available time</label>
              <input
                type="time"
                value={form.available_time}
                onChange={e => update("available_time", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-all"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "#111",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  color: isLight ? "#0f172a" : "#fff"
                }}
              />
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, backgroundColor: isLight ? "#f8fafc" : "#0f0f0f" }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#1e1e1e", background: "linear-gradient(90deg,rgba(34,197,94,0.08),rgba(59,130,246,0.08))" }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)" }}>
            <Map className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold" style={{
            background: isLight
              ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
              : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>Map Preview</span>
        </div>
        {buildGroundMapsEmbedUrl(form) ? (
          <iframe
            title="Ground map preview"
            src={buildGroundMapsEmbedUrl({ area: form.area, googleMapsUrl: form.google_maps_url })}
            className="w-full h-48"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="px-3 py-8 text-center text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            Add a location to preview the ground on Google Maps.
          </div>
        )}
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

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: isLight ? "#f1f5f9" : "#1e1e1e",
            border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
            color: isLight ? "#0f172a" : "#c8ccc8"
          }}
        >
          Cancel
        </button>
        {editing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.15) 100%)",
              border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.35)"}`,
              color: isLight ? "#dc2626" : "#f87171",
              ...(submitting ? { opacity: 0.6, cursor: "not-allowed", transform: "none" } : {})
            }}
          >
            Delete Ground
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          )}
          style={{
            background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
            color: "#ffffff",
            boxShadow: isLight
              ? "0 4px 14px -3px rgba(16,185,129,0.45)"
              : "0 6px 20px -6px rgba(34,197,94,0.7)",
            ...(submitting ? { opacity: 0.6, cursor: "not-allowed", transform: "none" } : {})
          }}
        >
          {submitting ? (editing ? "Saving..." : "Registering...") : (editing ? "Save Changes" : "Register Ground")}
        </button>
      </div>
    </form>
  );

  if (editing) {
    return formElement;
  }

  return (
    <>
      {renderTriggerButton()}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => { setOpen(false); setError(null); }}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}
          >
            {formElement}
          </div>
        </div>
      )}
    </>
  );
}

export default function GroundsTab({ onBook, grounds = GROUNDS, token, onGroundCreated, onGroundUpdated, onGroundDeleted, user, teammateIds = [], theme = "dark" }) {
  const isLight = theme === "light" || (typeof document !== "undefined" && document.documentElement.classList.contains("light"));
  const [cost, setCost] = useState("1200");
  const [split, setSplit] = useState("11");
  const [ratingFilter, setRatingFilter] = useState("Any Rating");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [priceFilter, setPriceFilter] = useState("Any Price");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGround, setSelectedGround] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [editingGround, setEditingGround] = useState(null);
  const perHead = cost && split ? Math.ceil(Number(cost) / Number(split)) : 0;
  const teamIdSet = new Set([user?.id, ...teammateIds].filter(Boolean).map(id => String(id)));

  const displayPrice = g => {
    if (g.price !== undefined && g.price !== null && g.price !== "") {
      const n = Number(g.price);
      return Number.isFinite(n) ? `₹${n}/hr` : String(g.price);
    }
    if (g.price_per_hour) return `₹${g.price_per_hour}/hr`;
    return "—";
  };
  const displayLocation = g => g.area || g.address || "";
  const isOwnedByMyTeam = g => g?.posted_by_user_id && teamIdSet.has(String(g.posted_by_user_id));
  const bookedTodaySlots = g => Array.isArray(g.booked_time_slots_today) ? g.booked_time_slots_today : [];
  const canBookGround = g => !isOwnedByMyTeam(g) && (Number(g.booking_count_today) || 0) < 2;

  const getPriceNum = g => {
    if (g.price_per_hour !== undefined && g.price_per_hour !== null && g.price_per_hour !== "") {
      const n = Number(g.price_per_hour);
      if (Number.isFinite(n)) return n;
    }
    const n = Number(String(g.price ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const uniqueLocations = Array.from(
    new Set(grounds.map(g => displayLocation(g)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const ratingThreshold = { "Any Rating": 0, "4.7+": 4.7, "4.5+": 4.5, "4.0+": 4.0 }[ratingFilter];

  const filteredGrounds = [...grounds]
    .filter(g => (Number(g.rating) || 0) >= ratingThreshold)
    .filter(g => locationFilter === "All Locations" || displayLocation(g) === locationFilter)
    .filter(g => {
      const p = getPriceNum(g);
      if (priceFilter === "Under ₹500/hr") return p > 0 && p < 500;
      if (priceFilter === "₹500–₹1000/hr") return p >= 500 && p <= 1000;
      if (priceFilter === "₹1000+/hr") return p > 1000;
      return true;
    })
    .filter(g => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (g.name || "").toLowerCase().includes(q) ||
        displayLocation(g).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  const activeFilters = [];
  if (searchQuery.trim()) {
    activeFilters.push({
      id: "search",
      label: `"${searchQuery.trim()}"`,
      clear: () => setSearchQuery("")
    });
  }
  if (locationFilter !== "All Locations") {
    activeFilters.push({
      id: "location",
      label: `📍 ${locationFilter}`,
      clear: () => setLocationFilter("All Locations")
    });
  }
  if (priceFilter !== "Any Price") {
    activeFilters.push({
      id: "price",
      label: `💰 ${priceFilter}`,
      clear: () => setPriceFilter("Any Price")
    });
  }
  if (ratingFilter !== "Any Rating") {
    activeFilters.push({
      id: "rating",
      label: `⭐ ${ratingFilter}`,
      clear: () => setRatingFilter("Any Rating")
    });
  }

  const activeFilterCount = activeFilters.length;

  const clearAllFilters = () => {
    setRatingFilter("Any Rating");
    setLocationFilter("All Locations");
    setPriceFilter("Any Price");
    setSearchQuery("");
  };

  const asArray = v => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Header section with Title on left and Register a Ground button on the right top corner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pb-0.5">
        <div>
          <h2
            className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2"
            style={{
              background: isLight
                ? "linear-gradient(135deg,#0f172a 0%,#15803d 50%,#3b82f6 100%)"
                : "linear-gradient(135deg,#ffffff 0%,#4ade80 50%,#60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            <span></span>
            Cricket Grounds
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: isLight ? "#475569" : "#8a968a" }}>
            Explore, book, or register cricket grounds for your matches
          </p>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          <GroundForm token={token} onCreated={onGroundCreated} theme={theme} />
        </div>
      </div>

      {/* FILTER GROUNDS BAR */}
      <div className="space-y-2.5">
        {/* Header: Title, match count, and reset button */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isLight ? "#334155" : "#a6b5a6" }}>
              Filter Grounds
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#10b981 100%)",
                color: "#ffffff",
                boxShadow: isLight ? "0 2px 6px -1px rgba(16,185,129,0.4)" : "0 2px 8px -2px rgba(34,197,94,0.6)"
              }}
            >
              {filteredGrounds.length} ground{filteredGrounds.length === 1 ? "" : "s"}
            </span>
          </div>

          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer hover:scale-105"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* UNIFIED MERGED FILTER BAR */}
        <div
          className={cn(
            "rounded-2xl transition-all duration-200 border",
            "flex flex-col md:flex-row md:items-center",
            isLight
              ? "bg-white border-slate-200 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10"
              : "bg-[#111411] border-[#252c25] shadow-lg focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10"
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
              placeholder="Search by ground name or area..."
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

          {/* Divider between Search and Dropdowns */}
          <div className="hidden md:block w-[1px] h-7 bg-slate-200 dark:bg-[#252d25] shrink-0" />
          <div className="block md:hidden h-[1px] w-full bg-slate-100 dark:bg-[#1b221b]" />

          {/* 2. Dropdowns Section: Location, Price, Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#252d25] shrink-0">
            {/* Location */}
            <div className="relative px-3.5 py-2.5 flex items-center min-w-[135px]">
              <MapPin
                className="w-3.5 h-3.5 shrink-0 mr-2"
                style={{ color: locationFilter !== "All Locations" ? (isLight ? "#16a34a" : "#4ade80") : (isLight ? "#64748b" : "#6b7a6b") }}
              />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none appearance-none pr-5 cursor-pointer font-medium truncate"
                style={{
                  color: locationFilter !== "All Locations" ? (isLight ? "#0f172a" : "#ffffff") : (isLight ? "#64748b" : "#8a968a"),
                  fontWeight: locationFilter !== "All Locations" ? "600" : "500"
                }}
              >
                <option value="All Locations" className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>All Locations</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc} className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>
                    {loc}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: isLight ? "#64748b" : "#8a968a" }} />
            </div>

            {/* Price */}
            <div className="relative px-3.5 py-2.5 flex items-center min-w-[130px]">
              <IndianRupee
                className="w-3.5 h-3.5 shrink-0 mr-1.5"
                style={{ color: priceFilter !== "Any Price" ? (isLight ? "#16a34a" : "#4ade80") : (isLight ? "#64748b" : "#6b7a6b") }}
              />
              <select
                value={priceFilter}
                onChange={e => setPriceFilter(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none appearance-none pr-5 cursor-pointer font-medium truncate"
                style={{
                  color: priceFilter !== "Any Price" ? (isLight ? "#0f172a" : "#ffffff") : (isLight ? "#64748b" : "#8a968a"),
                  fontWeight: priceFilter !== "Any Price" ? "600" : "500"
                }}
              >
                {["Any Price", "Under ₹500/hr", "₹500–₹1000/hr", "₹1000+/hr"].map(o => (
                  <option key={o} value={o} className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>
                    {o}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: isLight ? "#64748b" : "#8a968a" }} />
            </div>

            {/* Rating */}
            <div className="relative px-3.5 py-2.5 flex items-center min-w-[115px]">
              <Star
                className={cn("w-3.5 h-3.5 shrink-0 mr-1.5", ratingFilter !== "Any Rating" ? "fill-amber-400 text-amber-400" : "")}
                style={{ color: ratingFilter !== "Any Rating" ? "#f59e0b" : (isLight ? "#64748b" : "#6b7a6b") }}
              />
              <select
                value={ratingFilter}
                onChange={e => setRatingFilter(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none appearance-none pr-5 cursor-pointer font-medium truncate"
                style={{
                  color: ratingFilter !== "Any Rating" ? (isLight ? "#0f172a" : "#ffffff") : (isLight ? "#64748b" : "#8a968a"),
                  fontWeight: ratingFilter !== "Any Rating" ? "600" : "500"
                }}
              >
                {["Any Rating", "4.7+", "4.5+", "4.0+"].map(o => (
                  <option key={o} value={o} className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>
                    {o === "Any Rating" ? o : `${o} ★`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: isLight ? "#64748b" : "#8a968a" }} />
            </div>
          </div>
        </div>

        {/* 3. Active filter tags pill chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 px-1 animate-[fadeIn_.15s_ease-out]">
            <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
              Active:
            </span>
            {activeFilters.map(af => (
              <span
                key={af.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all group"
                style={{
                  backgroundColor: isLight ? "#f0fdf4" : "rgba(34,197,94,0.12)",
                  border: `1px solid ${isLight ? "#bbf7d0" : "rgba(34,197,94,0.3)"}`,
                  color: isLight ? "#15803d" : "#4ade80"
                }}
              >
                <span>{af.label}</span>
                <button
                  type="button"
                  onClick={af.clear}
                  className="hover:opacity-70 transition-opacity p-0.5 rounded-full cursor-pointer"
                  title="Remove this filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <GroundsMap
        grounds={filteredGrounds}
        canBookGround={canBookGround}
        displayPrice={displayPrice}
        displayLocation={displayLocation}
        theme={theme}
      />

      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: isLight
            ? "linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 50%, #f5f3ff 100%)"
            : "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.08) 50%, rgba(168,85,247,0.1) 100%)",
          border: isLight ? "1px solid #a7f3d0" : "1px solid rgba(34,197,94,0.35)",
          boxShadow: isLight ? "0 4px 20px rgba(22,163,74,0.08)" : "0 8px 32px rgba(22,101,52,0.15)"
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)" }}
          >
            <Hash className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{
            background: isLight
              ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
              : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>Auto Cost Split Calculator</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Ground cost (₹/hr)</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none font-mono transition-all"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#111",
                border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                color: isLight ? "#0f172a" : "#ffffff"
              }}
              onFocus={e => e.currentTarget.style.boxShadow = isLight ? "0 0 0 3px rgba(22,163,74,0.12)" : "0 0 0 3px rgba(34,197,94,0.18)"}
              onBlur={e => e.currentTarget.style.boxShadow = "none"}
              placeholder="1200"
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Split between</label>
            <div className="relative">
              <select
                value={split}
                onChange={e => setSplit(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-all cursor-pointer"
                style={{
                  backgroundColor: isLight ? "#ffffff" : "#111",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  color: isLight ? "#0f172a" : "#ffffff"
                }}
              >
                {[11, 12, 14, 22].map(n => <option key={n} value={n}>{n} players</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="rounded-xl p-3 relative overflow-hidden"
            style={{
              background: isLight
                ? "linear-gradient(135deg,#ffffff 0%,#ecfdf5 100%)"
                : "linear-gradient(135deg,rgba(34,197,94,0.12) 0%,rgba(6,182,212,0.08) 100%)",
              border: isLight ? "1px solid #a7f3d0" : "1px solid rgba(34,197,94,0.3)",
              boxShadow: isLight ? "0 2px 8px rgba(16,185,129,0.12)" : "0 4px 14px rgba(34,197,94,0.15)"
            }}
          >
            <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg,#22c55e,#06b6d4)" }} />
            <div className="text-xs mb-1 font-medium pl-1.5" style={{ color: isLight ? "#64748b" : "#8a968a" }}>Per head</div>
            <div className="text-2xl font-black font-mono pl-1.5" style={{
              background: isLight
                ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
                : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>₹{perHead}</div>
          </div>
          <div
            className="rounded-xl p-3 relative overflow-hidden"
            style={{
              background: isLight
                ? "linear-gradient(135deg,#ffffff 0%,#f5f3ff 100%)"
                : "linear-gradient(135deg,rgba(168,85,247,0.12) 0%,rgba(236,72,153,0.08) 100%)",
              border: isLight ? "1px solid #ddd6fe" : "1px solid rgba(168,85,247,0.3)",
              boxShadow: isLight ? "0 2px 8px rgba(168,85,247,0.12)" : "0 4px 14px rgba(168,85,247,0.15)"
            }}
          >
            <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg,#a855f7,#ec4899)" }} />
            <div className="text-xs mb-1 font-medium pl-1.5" style={{ color: isLight ? "#64748b" : "#8a968a" }}>Total cost</div>
            <div className="text-2xl font-black font-mono pl-1.5" style={{
              background: isLight
                ? "linear-gradient(135deg,#7e22ce 0%,#be185d 100%)"
                : "linear-gradient(135deg,#c084fc 0%,#f472b6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>₹{Number(cost || 0).toLocaleString()}</div>
          </div>
        </div>
        <button
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
            color: "#ffffff",
            boxShadow: isLight
              ? "0 4px 14px -3px rgba(16,185,129,0.45)"
              : "0 6px 20px -6px rgba(34,197,94,0.7)"
          }}
        >
          Share Split Request
        </button>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
            <span className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg,#22c55e,#3b82f6)" }} />
            Available Grounds
          </h3>
          <span className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            {filteredGrounds.length} result{filteredGrounds.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} applied`}
          </span>
        </div>
        <div className="space-y-3">
          {filteredGrounds.length === 0 && (
            <div
              className={cn(C, "rounded-2xl p-8 text-center relative overflow-hidden")}
              style={{
                backgroundColor: isLight ? "#ffffff" : undefined,
                border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)" }}
              >
                🏟
              </div>
              <div className="text-sm font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                No grounds match your filters
              </div>
              <p className="text-xs mt-1" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                Try adjusting your search query, location, price range, or rating threshold.
              </p>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-3.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                    color: "#ffffff",
                    boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                </button>
              )}
            </div>
          )}
          {filteredGrounds.map(g => {
            const amenities = asArray(g.amenities);
            const tags = asArray(g.tags);
            const rating = Number(g.rating) || 0;
            const availableNow = canBookGround(g);
            const priceNum = getPriceNum(g);
            const isPremium = priceNum > 1000;
            return (
              <div
                key={g.id ?? g.name}
                className={cn(C, "rounded-2xl p-4 transition-all relative overflow-hidden hover:shadow-lg")}
                style={{
                  backgroundColor: isLight ? "#ffffff" : undefined,
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{
                    background: isPremium
                      ? "linear-gradient(90deg,#a855f7,#ec4899,#f97316)"
                      : "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)"
                  }}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{
                      background: isPremium
                        ? "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)"
                        : "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)"
                    }}
                  >
                    <span className="text-2xl">🏟</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{g.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" style={{ color: isLight ? "#16a34a" : "#4ade80" }} />
                          <span className="text-xs" style={{ color: isLight ? "#64748b" : "#8a968a" }}>{displayLocation(g)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Tag color={availableNow ? "green" : "red"}>{availableNow ? "Available today" : "Booked today"}</Tag>
                          {isOwnedByMyTeam(g) && <Tag color="blue">Your team posted this</Tag>}
                          {isPremium && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ background: "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)" }}>
                              ✨ Premium
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm font-mono" style={{
                          background: isPremium
                            ? (isLight ? "linear-gradient(135deg,#7e22ce 0%,#be185d 100%)" : "linear-gradient(135deg,#c084fc 0%,#f472b6 100%)")
                            : (isLight ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)" : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)"),
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text"
                        }}>{displayPrice(g)}</div>
                        {rating > 0 && (
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-semibold" style={{ color: isLight ? "#64748b" : "#8a968a" }}>{rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {amenities.length > 0 && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {amenities.map((a, i) => (
                          <span key={a?.label ?? i} className="flex items-center gap-1 text-xs" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                            <span style={{ color: isLight ? "#16a34a" : "#4ade80" }}>{a?.icon}</span>{a?.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((t, i) => <Tag key={t?.label ?? i} color={t?.color}>{t?.label}</Tag>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    disabled={!availableNow}
                    onClick={() => onBook(g)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    style={availableNow
                      ? {
                          background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                          color: "#ffffff",
                          boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
                        }
                      : { backgroundColor: isLight ? "#f1f5f9" : "#1e211e", color: isLight ? "#94a3b8" : "#3a3a3a", cursor: "not-allowed", transform: "none" }}
                  >
                    {availableNow ? "Book Now" : "Unavailable"}
                  </button>
                  <GhostButton className="flex-1 text-center" onClick={() => { setSelectedGround(g); setShowMap(false); }}>View Details</GhostButton>
                  {isOwnedByMyTeam(g) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingGround(g)}
                        title="Edit Ground"
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.05] active:scale-[0.95] ${
                          isLight
                            ? "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                            : "text-gray-300 hover:text-white bg-[#252525] hover:bg-[#333] border border-[#2a2a2a]"
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("Delete this ground?")) return;
                          try {
                            await apiRequest(`/grounds/${g.id}`, { method: "DELETE", token });
                            onGroundDeleted?.(g.id);
                          } catch (err) {
                            alert(err.message || "Could not delete ground");
                          }
                        }}
                        title="Delete Ground"
                        className="px-3 py-2 rounded-xl text-xs font-bold transition-all text-red-500 hover:text-red-600 cursor-pointer hover:scale-[1.05] active:scale-[0.95]"
                        style={{
                          background: "linear-gradient(135deg,rgba(239,68,68,0.12) 0%,rgba(220,38,38,0.12) 100%)",
                          border: "1px solid rgba(239,68,68,0.25)"
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedGround && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedGround(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: isLight ? "#ffffff" : "#141414",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              boxShadow: isLight ? "0 20px 50px rgba(15,23,42,0.15)" : "0 20px 60px rgba(0,0,0,0.5)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl sm:rounded-t-3xl" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316,#ec4899)" }} />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setShowMap(prev => !prev)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95"
                style={{
                  background: showMap
                    ? "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)"
                    : (isLight ? "#f1f5f9" : "#1e211e"),
                  color: showMap ? "#ffffff" : (isLight ? "#64748b" : "#8a978a"),
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  boxShadow: showMap ? "0 4px 12px -3px rgba(16,185,129,0.5)" : "none"
                }}
              >
                <Map className="w-3.5 h-3.5" />
                {showMap ? "Hide Map" : "View Map"}
              </button>
              <button
                onClick={() => setSelectedGround(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
                style={{ backgroundColor: isLight ? "#f1f5f9" : "#1e211e" }}
              >
                <X className="w-4 h-4" style={{ color: isLight ? "#475569" : "#9ca39c" }} />
              </button>
            </div>

            <div className="pr-24 flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                style={{ background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)" }}
              >
                <span className="text-3xl">🏟</span>
              </div>
              <div>
                <div className="text-lg font-black" style={{
                  background: isLight
                    ? "linear-gradient(135deg,#0f172a 0%,#15803d 50%,#0284c7 100%)"
                    : "linear-gradient(135deg,#ffffff 0%,#4ade80 50%,#38bdf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>{selectedGround.name}</div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                  <span className="text-sm" style={{ color: isLight ? "#64748b" : "#c8ccc8" }}>{displayLocation(selectedGround)}</span>
                </div>
              </div>
            </div>

            <div
              className="mt-4 rounded-2xl p-4 space-y-3"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#0f0f0f",
                border: `1px solid ${isLight ? "#e2e8f0" : "#1e1e1e"}`
              }}
            >
              <div className="pb-3 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#1e1e1e" }}>
                <div className="text-xs uppercase tracking-wide font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Posted by</div>
                <div className="text-sm font-semibold mt-1" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{selectedGround.postedByName || "MatchConnect user"}</div>
                {selectedGround.postedByPhone ? <div className="text-xs mt-1 font-mono" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{selectedGround.postedByPhone}</div> : <div className="text-xs mt-1" style={{ color: isLight ? "#94a3b8" : "#6b7a6b" }}>No posted phone number was saved.</div>}
              </div>
              <div className="pb-3 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#1e1e1e" }}>
                <div className="text-xs uppercase tracking-wide font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Availability</div>
                <div className="text-sm mt-1" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  {selectedGround.availability_mode === "scheduled"
                    ? `${selectedGround.available_date || "Date TBD"} · ${selectedGround.available_time || "Time TBD"}`
                    : "Always available"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-3 relative overflow-hidden"
                  style={{
                    background: isLight
                      ? "linear-gradient(135deg,#ffffff 0%,#ecfdf5 100%)"
                      : "linear-gradient(135deg,rgba(34,197,94,0.12) 0%,rgba(6,182,212,0.08) 100%)",
                    border: isLight ? "1px solid #a7f3d0" : "1px solid rgba(34,197,94,0.3)",
                    boxShadow: isLight ? "0 2px 8px rgba(16,185,129,0.1)" : "none"
                  }}
                >
                  <div className="text-xs mb-1 font-medium" style={{ color: isLight ? "#64748b" : "#8a968a" }}>Price</div>
                  <div className="text-base font-black font-mono" style={{
                    background: isLight
                      ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
                      : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>{displayPrice(selectedGround)}</div>
                </div>
                <div
                  className="rounded-xl p-3 relative overflow-hidden"
                  style={{
                    background: isLight
                      ? "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)"
                      : "linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(236,72,153,0.08) 100%)",
                    border: isLight ? "1px solid #fde68a" : "1px solid rgba(245,158,11,0.3)",
                    boxShadow: isLight ? "0 2px 8px rgba(245,158,11,0.1)" : "none"
                  }}
                >
                  <div className="text-xs mb-1 font-medium" style={{ color: isLight ? "#64748b" : "#8a968a" }}>Rating</div>
                  <div className="text-base font-black font-mono flex items-center gap-1" style={{
                    background: isLight
                      ? "linear-gradient(135deg,#b45309 0%,#be185d 100%)"
                      : "linear-gradient(135deg,#fbbf24 0%,#f472b6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" style={{ WebkitTextFillColor: "initial" }} />
                    {selectedGround.rating || 0}★
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-3 relative overflow-hidden"
                style={{
                  backgroundColor: isLight ? "#ffffff" : "#111",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#1e1e1e"}`,
                  boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.05)" : "none"
                }}
              >
                <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
                <div className="text-xs uppercase tracking-wide mb-2 font-medium pl-2" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Today's bookings</div>
                <div className="pl-2">
                  {bookedTodaySlots(selectedGround).length > 0 ? <div className="flex flex-wrap gap-1.5">{bookedTodaySlots(selectedGround).map(slot => <Tag key={slot} color="amber">{slot}</Tag>)}</div> : <div className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No bookings yet today.</div>}
                  <div className="text-xs mt-2" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>
                    Remaining timings: {TIME_SLOTS.filter(slot => !bookedTodaySlots(selectedGround).includes(slot)).join(" · ") || "No slots left today"}
                  </div>
                </div>
              </div>

              {selectedGround.googleMapsUrl || displayLocation(selectedGround) ? (
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1e1e1e"}` }}>
                  {showMap ? <iframe title="Ground map" src={buildGroundMapsEmbedUrl(selectedGround)} className="w-full h-72" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="p-4 text-sm text-center" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Click View Map to open the ground on Google Maps.</div>}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMap(prev => !prev)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                    color: "#ffffff",
                    boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
                  }}
                >
                  {showMap ? "Hide Map" : "View Map"}
                </button>
                {isOwnedByMyTeam(selectedGround) && (
                  <button
                    type="button"
                    onClick={() => setEditingGround(selectedGround)}
                    className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: isLight ? "#f1f5f9" : "transparent",
                      border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                      color: isLight ? "#0f172a" : "#c8ccc8"
                    }}
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                )}
                {buildGroundMapsLink(selectedGround) && (
                  <a
                    href={buildGroundMapsLink(selectedGround)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: isLight ? "#eff6ff" : "rgba(59,130,246,0.08)",
                      border: `1px solid ${isLight ? "#bfdbfe" : "rgba(59,130,246,0.3)"}`,
                      color: isLight ? "#1d4ed8" : "#60a5fa"
                    }}
                  >
                    <ExternalLink className="w-4 h-4" /> Open in Google Maps
                  </a>
                )}
                {isOwnedByMyTeam(selectedGround) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Delete this ground?")) return;
                      try {
                        await apiRequest(`/grounds/${selectedGround.id}`, { method: "DELETE", token });
                        onGroundDeleted?.(selectedGround.id);
                        setSelectedGround(null);
                      } catch (err) {
                        console.error(err.message || "Could not delete ground");
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg,rgba(239,68,68,0.12) 0%,rgba(220,38,38,0.12) 100%)",
                      border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.35)"}`,
                      color: isLight ? "#dc2626" : "#f87171"
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingGround && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditingGround(null)}
        >
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <GroundForm
              token={token}
              initialGround={editingGround}
              onUpdated={updated => {
                onGroundUpdated?.(updated);
                setSelectedGround(updated);
                setEditingGround(null);
              }}
              onDeleted={id => {
                onGroundDeleted?.(id);
                setSelectedGround(null);
                setEditingGround(null);
              }}
              onClose={() => setEditingGround(null)}
              theme={theme}
            />
          </div>
        </div>
      )}
    </div>
  );
}