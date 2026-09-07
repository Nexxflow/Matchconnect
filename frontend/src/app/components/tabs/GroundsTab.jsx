import React, { useState, useEffect } from "react";
import { Filter, Search, ChevronDown, MapPin, Star, Plus, X, Map, Pencil, Trash2, ExternalLink, Hash } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "../../api";
import { C, cn, Tag, GhostButton, buildGroundMapsEmbedUrl, buildGroundMapsLink } from "../../utils/helpers.jsx";
import { GROUNDS, TIME_SLOTS } from "../../utils/constants";

function GroundsMap({ grounds, canBookGround, displayPrice, displayLocation }) {
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
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#22c55e"/>
      <circle cx="12" cy="9" r="3.5" fill="#0d0f0d"/>
    </svg>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28]
  });
  const bookedIcon = L.divIcon({
    className: "",
    html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#ef4444"/>
      <circle cx="12" cy="9" r="3.5" fill="#0d0f0d"/>
    </svg>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28]
  });

  return (
    <div className={cn(C, "rounded-2xl p-4")}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-3.5 h-3.5 text-green-400" />
        <span className="text-sm font-semibold text-white">Grounds near you</span>
      </div>

      {withLocation.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ height: 220 }}>
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
        <p className="text-xs" style={{ color: "#6b7a6b" }}>No grounds with a saved location yet — see the list below.</p>
      )}

      {withoutLocation.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] mb-1.5" style={{ color: "#6b7a6b" }}>
            {withoutLocation.length} more ground{withoutLocation.length > 1 ? "s" : ""} — no location on file, so no pin on the map:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {withoutLocation.map(g => (
              <span key={g.id || g.name} className="px-2 py-1 rounded-lg text-[11px]" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
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

  if (!open && !editing) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 cursor-pointer"
        style={{
          border: `1px dashed ${isLight ? "#86efac" : "#2a2a2a"}`,
          backgroundColor: isLight ? "#f0fdf4" : "transparent",
          color: isLight ? "#16a34a" : "#22c55e",
          boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.05)" : "none"
        }}
      >
        <Plus className="w-4 h-4" /> Register a Ground
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(C, "rounded-2xl p-4 space-y-3")}
      style={{
        backgroundColor: isLight ? "#ffffff" : undefined,
        border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
        boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
      }}
    >
      <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "transparent" }}>
        <span className="text-sm font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{editing ? "Edit Ground" : "Register a Ground"}</span>
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
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
            placeholder="Green Park Cricket Ground"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Location / Area</label>
          <input
            value={form.area}
            onChange={e => update("area", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
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
            className="w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
            placeholder="1200"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Google Maps link</label>
          <input
            value={form.google_maps_url}
            onChange={e => update("google_maps_url", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
            placeholder="https://www.google.com/maps/..."
          />
        </div>
        <div>
          <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Availability</label>
          <select
            value={form.availability_mode}
            onChange={e => update("availability_mode", e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
          >
            <option value="always">Always available</option>
            <option value="scheduled">Available on a date/time</option>
          </select>
        </div>
        {form.availability_mode === "scheduled" && (
          <>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Available date</label>
              <input
                type="date"
                value={form.available_date}
                onChange={e => update("available_date", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Available time</label>
              <input
                type="time"
                value={form.available_time}
                onChange={e => update("available_time", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: isLight ? "#f8fafc" : "#111", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, color: isLight ? "#0f172a" : "#fff" }}
              />
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`, backgroundColor: isLight ? "#f8fafc" : "#0f0f0f" }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#1e1e1e" }}>
          <Map className="w-4 h-4" style={{ color: isLight ? "#16a34a" : "#4ade80" }} />
          <span className="text-xs font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Map Preview</span>
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
        {editing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
              isLight
                ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                : "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
            }`}
            style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
          >
            Delete Ground
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer"
          style={{
            backgroundColor: isLight ? "#16a34a" : "#22c55e",
            color: "#ffffff",
            boxShadow: isLight ? "0 2px 8px rgba(22,163,74,0.22)" : "none",
            ...(submitting ? { opacity: 0.6, cursor: "not-allowed" } : {})
          }}
        >
          {submitting ? (editing ? "Saving..." : "Registering...") : (editing ? "Save Changes" : "Register Ground")}
        </button>
      </div>
    </form>
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

  const activeFilterCount = [
    ratingFilter !== "Any Rating",
    locationFilter !== "All Locations",
    priceFilter !== "Any Price",
    searchQuery.trim() !== ""
  ].filter(Boolean).length;

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
    <div className="space-y-8">
      <div
        className={cn(C, "rounded-2xl p-4 transition-all")}
        style={{
          backgroundColor: isLight ? "#ffffff" : undefined,
          border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
          boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#4ade80" }} />
            <span className="text-sm font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Filter Grounds</span>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => { setRatingFilter("Any Rating"); setLocationFilter("All Locations"); setPriceFilter("Any Price"); setSearchQuery(""); }}
              className="text-[11px] font-semibold transition-colors cursor-pointer"
              style={{ color: isLight ? "#64748b" : "#6b7a6b" }}
            >
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ground name or area"
            className="w-full rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#111",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              color: isLight ? "#0f172a" : "#fff"
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="w-3.5 h-3.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors cursor-pointer"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#1a1a1a",
                border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                color: isLight ? "#0f172a" : "#c8ccc8"
              }}
            >
              <option>All Locations</option>
              {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
          </div>
          <div className="relative flex-1">
            <select
              value={priceFilter}
              onChange={e => setPriceFilter(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors cursor-pointer"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#1a1a1a",
                border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                color: isLight ? "#0f172a" : "#c8ccc8"
              }}
            >
              {["Any Price", "Under ₹500/hr", "₹500–₹1000/hr", "₹1000+/hr"].map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
          </div>
          <div className="relative flex-1">
            <select
              value={ratingFilter}
              onChange={e => setRatingFilter(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors cursor-pointer"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#1a1a1a",
                border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                color: isLight ? "#0f172a" : "#c8ccc8"
              }}
            >
              {["Any Rating", "4.7+", "4.5+", "4.0+"].map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
          </div>
        </div>
      </div>

      <GroundsMap
        grounds={filteredGrounds}
        canBookGround={canBookGround}
        displayPrice={displayPrice}
        displayLocation={displayLocation}
      />

      <div
        className="rounded-2xl p-5"
        style={{
          background: isLight ? "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)" : "linear-gradient(135deg,#1a1a1a,#1a2a1a)",
          border: isLight ? "1px solid #bbf7d0" : "1px solid rgba(22,101,52,0.4)",
          boxShadow: isLight ? "0 4px 20px rgba(22,163,74,0.08)" : "0 8px 32px rgba(22,101,52,0.08)"
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: isLight ? "#dcfce7" : "rgba(34,197,94,0.15)" }}>
            <Hash className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#4ade80" }} />
          </div>
          <span className="font-semibold text-sm" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Auto Cost Split Calculator</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Ground cost (₹/hr)</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none font-mono transition-colors"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#111",
                border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                color: isLight ? "#0f172a" : "#ffffff"
              }}
              placeholder="1200"
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Split between</label>
            <div className="relative">
              <select
                value={split}
                onChange={e => setSplit(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors cursor-pointer"
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
            className="rounded-xl p-3"
            style={{
              backgroundColor: isLight ? "#ffffff" : "#111",
              border: isLight ? "1px solid #dcfce7" : "1px solid rgba(22,101,52,0.3)",
              boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.05)" : "none"
            }}
          >
            <div className="text-xs mb-1 font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Per head</div>
            <div className="text-2xl font-bold font-mono" style={{ color: isLight ? "#16a34a" : "#4ade80" }}>₹{perHead}</div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: isLight ? "#ffffff" : "#111",
              border: isLight ? "1px solid #dcfce7" : "1px solid rgba(22,101,52,0.3)",
              boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.05)" : "none"
            }}
          >
            <div className="text-xs mb-1 font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Total cost</div>
            <div className="text-2xl font-bold font-mono" style={{ color: isLight ? "#047857" : "#86efac" }}>₹{Number(cost || 0).toLocaleString()}</div>
          </div>
        </div>
        <button
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer"
          style={{
            backgroundColor: isLight ? "#16a34a" : "#22c55e",
            color: "#ffffff",
            boxShadow: isLight ? "0 2px 8px rgba(22,163,74,0.22)" : "none"
          }}
        >
          Share Split Request
        </button>
      </div>

      <GroundForm token={token} onCreated={onGroundCreated} theme={theme} />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Available Grounds</h3>
          <span className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            {filteredGrounds.length} result{filteredGrounds.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} applied`}
          </span>
        </div>
        <div className="space-y-3">
          {filteredGrounds.length === 0 && <div className="text-sm text-center py-8" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>No grounds match your filters.</div>}
          {filteredGrounds.map(g => {
            const amenities = asArray(g.amenities);
            const tags = asArray(g.tags);
            const rating = Number(g.rating) || 0;
            const availableNow = canBookGround(g);
            return (
              <div
                key={g.id ?? g.name}
                className={cn(C, "rounded-2xl p-4 transition-all")}
                style={{
                  backgroundColor: isLight ? "#ffffff" : undefined,
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                  boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: isLight ? "#ecfdf5" : "rgba(22,101,52,0.15)",
                      border: `1px solid ${isLight ? "#a7f3d0" : "rgba(22,101,52,0.2)"}`
                    }}
                  >
                    <span className="text-2xl">🏟</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{g.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" style={{ color: isLight ? "#64748b" : "#4a5a4a" }} />
                          <span className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{displayLocation(g)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Tag color={availableNow ? "green" : "red"}>{availableNow ? "Available today" : "Booked today"}</Tag>
                          {isOwnedByMyTeam(g) && <Tag color="blue">Your team posted this</Tag>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm" style={{ color: isLight ? "#16a34a" : "#4ade80" }}>{displayPrice(g)}</div>
                        {rating > 0 && (
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {amenities.length > 0 && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {amenities.map((a, i) => (
                          <span key={a?.label ?? i} className="flex items-center gap-1 text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                            <span style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>{a?.icon}</span>{a?.label}
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
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    style={availableNow
                      ? { backgroundColor: isLight ? "#16a34a" : "#22c55e", color: "#ffffff", boxShadow: isLight ? "0 2px 8px rgba(22,163,74,0.22)" : "none" }
                      : { backgroundColor: isLight ? "#f1f5f9" : "#1e211e", color: isLight ? "#94a3b8" : "#3a3a3a", cursor: "not-allowed" }}
                    onMouseEnter={e => availableNow && (e.currentTarget.style.backgroundColor = isLight ? "#15803d" : "#4ade80")}
                    onMouseLeave={e => availableNow && (e.currentTarget.style.backgroundColor = isLight ? "#16a34a" : "#22c55e")}
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
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isLight
                            ? "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                            : "text-gray-300 hover:text-white bg-[#252525] hover:bg-[#333]"
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
                        className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-red-500 hover:text-red-600 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 cursor-pointer"
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
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
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
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setShowMap(prev => !prev)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
                style={{
                  backgroundColor: showMap ? (isLight ? "#dcfce7" : "#14532d") : (isLight ? "#f1f5f9" : "#1e211e"),
                  color: showMap ? (isLight ? "#15803d" : "#bbf7d0") : (isLight ? "#64748b" : "#8a978a"),
                  border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`
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

            <div className="pr-24">
              <div className="text-lg font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{selectedGround.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                <span className="text-sm" style={{ color: isLight ? "#64748b" : "#c8ccc8" }}>{displayLocation(selectedGround)}</span>
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
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#111",
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(34,197,94,0.18)",
                    boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.05)" : "none"
                  }}
                >
                  <div className="text-xs mb-1 font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Price</div>
                  <div className="text-base font-bold" style={{ color: isLight ? "#16a34a" : "#4ade80" }}>{displayPrice(selectedGround)}</div>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#111",
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(34,197,94,0.18)",
                    boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.05)" : "none"
                  }}
                >
                  <div className="text-xs mb-1 font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Rating</div>
                  <div className="text-base font-bold" style={{ color: isLight ? "#15803d" : "#86efac" }}>{selectedGround.rating || 0}★</div>
                </div>
              </div>

              <div
                className="rounded-2xl p-3"
                style={{
                  backgroundColor: isLight ? "#ffffff" : "#111",
                  border: `1px solid ${isLight ? "#e2e8f0" : "#1e1e1e"}`,
                  boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.05)" : "none"
                }}
              >
                <div className="text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Today's bookings</div>
                {bookedTodaySlots(selectedGround).length > 0 ? <div className="flex flex-wrap gap-1.5">{bookedTodaySlots(selectedGround).map(slot => <Tag key={slot} color="amber">{slot}</Tag>)}</div> : <div className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No bookings yet today.</div>}
                <div className="text-xs mt-2" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}>
                  Remaining timings: {TIME_SLOTS.filter(slot => !bookedTodaySlots(selectedGround).includes(slot)).join(" · ") || "No slots left today"}
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
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#16a34a" : "#22c55e",
                    color: "#ffffff"
                  }}
                >
                  {showMap ? "Hide Map" : "View Map"}
                </button>
                {isOwnedByMyTeam(selectedGround) && (
                  <button
                    type="button"
                    onClick={() => setEditingGround(selectedGround)}
                    className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
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
                    className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isLight ? "#f1f5f9" : "transparent",
                      border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                      color: isLight ? "#0f172a" : "#c8ccc8"
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
                    className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isLight ? "#fef2f2" : "transparent",
                      border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.3)"}`,
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
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
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
