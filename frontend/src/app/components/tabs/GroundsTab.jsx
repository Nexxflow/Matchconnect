import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, MapPin, Star, Plus, X, Map, Pencil, Trash2, ExternalLink, Hash, RotateCcw, IndianRupee, Clock, Loader2, MessageSquare, Lock, Send, CheckCircle2, Camera, Phone, Image as ImageIcon } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "../../api";
import { cn, Tag, buildGroundMapsEmbedUrl, buildGroundMapsLink } from "../../utils/helpers.jsx";
import { GROUNDS, TIME_SLOTS } from "../../utils/constants";
import CalendarField from "../CalendarField.jsx";
import { showToast } from "../../utils/toast.jsx";

/* ============================================================================
   SHARED UI — same visual pattern as the Tournaments tab
   ============================================================================ */
const ACCENT_BAR = "linear-gradient(90deg,#22c55e 0%,#10b981 100%)";
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
  return (
    <div
      className={cn("relative rounded-2xl border", className)}
      style={{
        backgroundColor: t.card,
        borderColor: t.border,
        boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : "0 10px 30px -18px rgba(0,0,0,0.8)",
        ...style
      }}
    >
      {accent && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: ACCENT_BAR }} />}
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

function MetaRow({ isLight, icon: Icon, children, className = "", onClick, ...rest }) {
  const t = tokens(isLight);
  return (
    <div
      className={cn("flex items-center gap-2 text-sm min-w-0", onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : "", className)}
      style={{ color: t.text }}
      onClick={onClick}
      {...rest}
    >
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
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl relative shadow-2xl animate-in zoom-in-95 duration-200 border",
          maxWidth
        )}
        style={{
          borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)",
          backgroundColor: t.card
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl z-10 pointer-events-none" />
        {children}
      </div>
    </div>,
    document.body
  );
}

function ModalHeader({ isLight, icon: Icon, title, subtitle, badge, onClose }) {
  const t = tokens(isLight);
  return (
    <div className="flex items-start justify-between gap-3 pb-3.5 mb-3 border-b" style={{ borderColor: t.border }}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
            style={{
              backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.12)",
              borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.28)",
              color: isLight ? "#16a34a" : "#4ade80"
            }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: t.text }}>
              {title}
            </h3>
            {badge && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                style={{
                  backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.15)",
                  borderColor: isLight ? "#bbf7d0" : "rgba(34,197,94,0.3)",
                  color: isLight ? "#15803d" : "#4ade80"
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs truncate mt-0.5" style={{ color: t.sub }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-200 hover:rotate-90 hover:scale-105 active:scale-95 shrink-0"
        style={{
          backgroundColor: isLight ? "#f8fafc" : "rgba(255,255,255,0.06)",
          borderColor: t.border,
          color: t.sub
        }}
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
   GROUNDS MAP
   ============================================================================ */
const makePin = (id, from, to, core) =>
  L.divIcon({
    className: "",
    html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
      </linearGradient></defs>
      <path d="M12 1C7.03 1 3 5.03 3 10c0 6.75 9 14 9 14s9-7.25 9-14c0-4.97-4.03-9-9-9z" fill="url(#${id})"/>
      <circle cx="12" cy="10" r="3.5" fill="#0c120e"/>
      <circle cx="12" cy="10" r="1.5" fill="${core}"/>
    </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

const availableIcon = makePin("groundPinAvail", "#22c55e", "#14b8a6", "#4ade80");
const bookedIcon = makePin("groundPinBooked", "#ef4444", "#e11d48", "#f87171");

function GroundsMap({ grounds, canBookGround, displayPrice, displayLocation, theme = "dark" }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
  const withLocation = grounds.filter(g => g.latitude != null && g.longitude != null);
  const withoutLocation = grounds.filter(g => g.latitude == null || g.longitude == null);

  if (grounds.length === 0) return null;

  const center = withLocation.length
    ? [
        withLocation.reduce((s, g) => s + Number(g.latitude), 0) / withLocation.length,
        withLocation.reduce((s, g) => s + Number(g.longitude), 0) / withLocation.length
      ]
    : [13.0827, 80.2707];

  return (
    <Card isLight={isLight} className="p-5 pt-6">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4" style={{ color: t.green }} />
        <span className="text-base font-bold" style={{ color: t.text }}>Grounds near you</span>
      </div>

      {withLocation.length > 0 ? (
        /* isolation keeps Leaflet's internal z-indexes (400–1000) inside this box */
        <div
          className="rounded-xl overflow-hidden border"
          style={{ height: 240, borderColor: t.border, isolation: "isolate", position: "relative", zIndex: 0 }}
        >
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
        <p className="text-sm" style={{ color: t.sub }}>No grounds with a saved location yet. See the list below.</p>
      )}

      {withoutLocation.length > 0 && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: t.sub }}>
            {withoutLocation.length} more ground{withoutLocation.length > 1 ? "s" : ""} without a saved location:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {withoutLocation.map(g => (
              <span
                key={g.id || g.name}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                style={{ backgroundColor: t.cardAlt, borderColor: t.border, color: t.sub }}
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ============================================================================
   REGISTER / EDIT GROUND FORM
   ============================================================================ */
function GroundForm({ token, onCreated, initialGround = null, onUpdated, onDeleted, onClose, theme }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
  const fileInputRef = useRef(null);

  const buildForm = ground => ({
    name: ground?.name || "",
    area: ground?.area || "",
    price_per_hour: ground?.price_per_hour ?? ground?.price ?? "",
    google_maps_url: ground?.googleMapsUrl || ground?.google_maps_url || "",
    availability_mode: ground?.availability_mode || "always",
    available_date: ground?.available_date || "",
    available_time: ground?.available_time || "",
    alt_phone: ground?.alt_phone || ground?.alternate_phone || "",
    images: Array.isArray(ground?.images) ? ground.images : []
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = form.images || [];
    if (currentImages.length + files.length > 8) {
      setError("You can upload up to 8 images of the ground.");
      return;
    }

    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        setError(`"${file.name}" is over 2MB. Please upload smaller images.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(prev => ({
          ...prev,
          images: [...(prev.images || []), ev.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove) => {
    setForm(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const closeForm = () => {
    if (editing) onClose?.();
    else {
      setOpen(false);
      setError(null);
    }
  };

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

    const body = {
      name: form.name.trim(),
      area: form.area.trim(),
      price_per_hour: Number(form.price_per_hour),
      google_maps_url: form.google_maps_url.trim() || null,
      availability_mode: form.availability_mode,
      available_date: form.availability_mode === "scheduled" ? form.available_date : null,
      available_time: form.availability_mode === "scheduled" ? form.available_time : null,
      alt_phone: form.alt_phone.trim() || null,
      images: form.images || []
    };

    setSubmitting(true);
    try {
      if (editing) {
        const res = await apiRequest(`/grounds/${initialGround.id}`, { method: "PUT", token, body });
        showToast.success("Ground updated successfully!");
        onUpdated?.(res.ground);
        onClose?.();
      } else {
        const res = await apiRequest("/grounds", { method: "POST", token, body });
        showToast.success("Ground registered successfully!");
        onCreated(res.ground);
        setForm(buildForm(null));
        setOpen(false);
      }
    } catch (err) {
      showToast.error(err, editing ? "Could not update ground." : "Could not register ground.");
      setError(err.message || (editing ? "Could not update ground. Please try again." : "Could not register ground. Please try again."));
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
      showToast.delete("Ground deleted successfully.");
      onDeleted?.(initialGround.id);
      onClose?.();
    } catch (err) {
      showToast.error(err, "Could not delete this ground.");
      setError(err.message || "Could not delete this ground.");
    } finally {
      setSubmitting(false);
    }
  };

  // Same shape for both the check and the iframe (was inconsistent before)
  const previewUrl = buildGroundMapsEmbedUrl({ area: form.area, googleMapsUrl: form.google_maps_url });

  const formElement = (
    <Card isLight={isLight} className="p-5 sm:p-6 border-0 shadow-none bg-transparent">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalHeader
          isLight={isLight}
          icon={MapPin}
          title={editing ? "Edit Ground" : "Register a Ground"}
          subtitle={editing ? "Update venue information, pricing, or map location" : "Add your cricket venue to the MatchConnect community directory"}
          badge="Cricket Venue"
          onClose={closeForm}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <Label isLight={isLight}>Ground name *</Label>
            <input
              value={form.name}
              onChange={e => update("name", e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all"
              style={fieldStyle(isLight)}
              placeholder="e.g. Green Park Cricket Ground"
            />
          </div>
          <div className="sm:col-span-2">
            <Label isLight={isLight}>Location / Area *</Label>
            <input
              value={form.area}
              onChange={e => update("area", e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all"
              style={fieldStyle(isLight)}
              placeholder="e.g. Thailapuram, Vanur, Chennai"
            />
          </div>
          <div>
            <Label isLight={isLight}>Price per hour (₹) *</Label>
            <input
              type="number"
              min="1"
              value={form.price_per_hour}
              onChange={e => update("price_per_hour", e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all"
              style={fieldStyle(isLight)}
              placeholder="1200"
            />
          </div>
          <div>
            <Label isLight={isLight}>Google Maps link (optional)</Label>
            <input
              value={form.google_maps_url}
              onChange={e => update("google_maps_url", e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all"
              style={fieldStyle(isLight)}
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>

          <div className="sm:col-span-2">
            <Label isLight={isLight}>
              Alternative Phone Number <span className="font-normal text-xs" style={{ color: t.sub }}>(optional)</span>
            </Label>
            <input
              type="tel"
              value={form.alt_phone}
              onChange={e => update("alt_phone", e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all"
              style={fieldStyle(isLight)}
              placeholder="e.g. 9876543210 (secondary contact for ground booking)"
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label isLight={isLight}>
              Ground Photos <span className="font-normal text-xs" style={{ color: t.sub }}>(optional, up to 8 images)</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2.5 items-center">
              {(form.images || []).map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="w-20 h-20 rounded-xl relative overflow-hidden border shadow-sm group shrink-0"
                  style={{ borderColor: t.border }}
                >
                  <img src={imgUrl} alt={`Ground photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {(form.images || []).length < 8 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
                  style={{
                    borderColor: t.greenBorder,
                    backgroundColor: t.greenSoft,
                    color: t.green
                  }}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Add Photo</span>
                </button>
              )}
            </div>
            <p className="text-[11px]" style={{ color: t.faint }}>
              Upload pictures of the pitch, outfield, pavilion, or nets (max 2MB each).
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label isLight={isLight}>Availability Schedule</Label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border" style={{ backgroundColor: isLight ? "#f1f5f9" : "#0d130e", borderColor: t.border }}>
              <button
                type="button"
                onClick={() => update("availability_mode", "always")}
                className={cn(
                  "py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  form.availability_mode !== "scheduled"
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <span>⚡</span>
                <span>Always Available</span>
              </button>
              <button
                type="button"
                onClick={() => update("availability_mode", "scheduled")}
                className={cn(
                  "py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  form.availability_mode === "scheduled"
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <span>📅</span>
                <span>Specific Date / Time</span>
              </button>
            </div>
          </div>

          {form.availability_mode === "scheduled" && (
            <>
              <div>
                <Label isLight={isLight}>Available date</Label>
                <CalendarField
                  value={form.available_date}
                  onChange={v => update("available_date", v)}
                  theme={theme}
                  placeholder="Select available date"
                  clearable={true}
                />
              </div>
              <div>
                <Label isLight={isLight}>Available time</Label>
                <input
                  type="time"
                  value={form.available_time}
                  onChange={e => update("available_time", e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all"
                  style={fieldStyle(isLight)}
                />
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: t.border }}>
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b" style={{ borderColor: t.border, backgroundColor: t.cardAlt }}>
            <Map className="w-4 h-4" style={{ color: t.green }} />
            <span className="text-xs font-bold" style={{ color: t.text }}>Google Maps Location Preview</span>
          </div>
          {previewUrl ? (
            <iframe
              title="Ground map preview"
              src={previewUrl}
              className="w-full h-44"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="px-3 py-6 text-center text-xs" style={{ color: t.sub }}>
              Enter an area or map link above to see the live location preview.
            </div>
          )}
        </div>

        {error && (
          <div className="text-xs rounded-xl p-3 font-medium border" style={{ backgroundColor: t.redSoft, borderColor: t.redBorder, color: t.red }}>
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <OutlineButton isLight={isLight} type="button" onClick={closeForm} className="flex-1">
            Cancel
          </OutlineButton>
          {editing && (
            <OutlineButton isLight={isLight} tone="danger" type="button" onClick={handleDelete} disabled={submitting} className="flex-1">
              <Trash2 className="w-4 h-4" /> Delete Ground
            </OutlineButton>
          )}
          <PrimaryButton type="submit" disabled={submitting} className="flex-1">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{editing ? "Saving..." : "Registering..."}</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{editing ? "Save Changes" : "Register Ground"}</span>
              </span>
            )}
          </PrimaryButton>
        </div>
      </form>
    </Card>
  );

  if (editing) return formElement;

  return (
    <>
      <PrimaryButton type="button" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Register a Ground
      </PrimaryButton>
      {open && (
        <Modal isLight={isLight} onClose={closeForm}>
          {formElement}
        </Modal>
      )}
    </>
  );
}

/* ============================================================================
   GROUND REVIEWS MODAL
   ============================================================================ */
function GroundReviewsModal({ ground, isLight, user, token, onClose, onReviewAdded, onReviewDeleted }) {
  const t = tokens(isLight);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [hasBooked, setHasBooked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [averageRating, setAverageRating] = useState(ground?.rating || 0);
  const [reviewsCount, setReviewsCount] = useState(ground?.reviews_count || 0);

  // New review form state
  const [starRating, setStarRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadReviews() {
      try {
        setLoading(true);
        const res = await apiRequest(`/grounds/${ground.id}/reviews`, { token });
        if (mounted && res) {
          setReviews(res.reviews || []);
          setCanReview(!!res.can_review);
          setHasBooked(!!res.has_booked);
          setIsOwner(!!res.is_owner);
          setAverageRating(res.rating || 0);
          setReviewsCount(res.reviews_count || 0);
        }
      } catch (err) {
        console.error("Failed to load ground reviews:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (ground?.id) {
      loadReviews();
    }
    return () => { mounted = false; };
  }, [ground?.id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      showToast.warning("Please log in to submit a review.");
      return;
    }
    if (!reviewText.trim()) {
      showToast.warning("Please enter your review comments.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest(`/grounds/${ground.id}/reviews`, {
        method: "POST",
        token,
        body: { rating: starRating, review_text: reviewText.trim() }
      });
      showToast.success("Ground review submitted successfully!");
      setReviewText("");
      setStarRating(5);
      if (res?.review) {
        const updatedList = [res.review, ...reviews];
        setReviews(updatedList);
        const newCount = updatedList.length;
        const newAvg = Number((updatedList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / newCount).toFixed(1));
        setAverageRating(newAvg);
        setReviewsCount(newCount);
        onReviewAdded?.({ ...ground, rating: newAvg, reviews_count: newCount });
      }
    } catch (err) {
      showToast.error(err, "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      setDeletingId(reviewId);
      await apiRequest(`/grounds/${ground.id}/reviews/${reviewId}`, {
        method: "DELETE",
        token
      });
      showToast.delete("Ground review deleted successfully.");
      const updatedList = reviews.filter(r => r.id !== reviewId);
      setReviews(updatedList);
      const newCount = updatedList.length;
      const newAvg = newCount > 0
        ? Number((updatedList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / newCount).toFixed(1))
        : 0;
      setAverageRating(newAvg);
      setReviewsCount(newCount);
      onReviewDeleted?.({ ...ground, rating: newAvg, reviews_count: newCount });
    } catch (err) {
      showToast.error(err, "Could not delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const isAdmin = user?.is_admin === true || (user?.phone && String(user.phone).includes("6382757532"));

  return (
    <Modal isLight={isLight} onClose={onClose} maxWidth="max-w-2xl">
      <Card isLight={isLight} className="p-5 pt-6 space-y-4 max-h-[88vh] overflow-y-auto">
        <ModalHeader
          isLight={isLight}
          icon={MessageSquare}
          title={`${ground.name} — Reviews`}
          subtitle="Player feedback & ratings"
          badge={
            <span className="flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {averageRating > 0 ? averageRating : "No rating"} ({reviewsCount} {reviewsCount === 1 ? "review" : "reviews"})
            </span>
          }
          onClose={onClose}
        />

        {/* Eligibility Banner / Add Review Form */}
        {!token ? (
          <div className="rounded-xl p-3.5 border flex items-center gap-3 text-xs" style={{ backgroundColor: t.cardAlt, borderColor: t.border, color: t.sub }}>
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Please log in to see if you can review this ground.</span>
          </div>
        ) : isOwner ? (
          <div className="rounded-xl p-3.5 border flex items-center gap-3 text-xs" style={{ backgroundColor: t.cardAlt, borderColor: t.border, color: t.sub }}>
            <span className="text-base">🛡️</span>
            <span>You posted this ground. Ground owners cannot leave reviews on their own ground.</span>
          </div>
        ) : !hasBooked ? (
          <div className="rounded-xl p-3.5 border flex items-start sm:items-center justify-between gap-3 text-xs" style={{ backgroundColor: t.cardAlt, borderColor: t.border }}>
            <div className="flex items-center gap-2.5" style={{ color: t.sub }}>
              <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Only players who have <strong>booked this ground</strong> can leave a review.</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Verified Bookers Only
            </span>
          </div>
        ) : (
          /* User has booked the ground -> Show Add Review Form */
          <form onSubmit={handleSubmit} className="rounded-2xl p-4 border space-y-3" style={{ backgroundColor: t.cardAlt, borderColor: t.greenBorder }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: t.green }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Booker — Leave Your Review
              </span>
              {/* Star selector */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStarRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={cn(
                        "w-5 h-5 transition-colors",
                        (hoverRating ? s <= hoverRating : s <= starRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-500"
                      )}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold ml-1 font-mono" style={{ color: t.text }}>
                  {hoverRating || starRating}.0
                </span>
              </div>
            </div>

            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How was the pitch, outfield, lighting, and ground management? Share your feedback..."
              className="w-full rounded-xl p-3 text-xs font-medium focus:outline-none border transition-all resize-none"
              style={{
                backgroundColor: t.input,
                borderColor: t.inputBorder,
                color: t.text
              }}
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !reviewText.trim()}
                className="py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all text-white shadow-md disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: BRAND_GRAD }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: t.border }}>
            <h4 className="text-sm font-bold" style={{ color: t.text }}>
              Reviews ({reviews.length})
            </h4>
            {averageRating > 0 && (
              <span className="text-xs font-medium" style={{ color: t.sub }}>
                Average rating: <strong style={{ color: t.text }}>{averageRating}</strong> / 5.0
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs flex items-center justify-center gap-2" style={{ color: t.sub }}>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Loading reviews...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-8 text-center" style={{ color: t.sub }}>
              <div className="text-2xl mb-1">🏏</div>
              <p className="text-xs font-semibold">No reviews yet for this ground.</p>
              <p className="text-[11px] mt-0.5" style={{ color: t.faint }}>
                Players who have booked this ground can be the first to leave feedback!
              </p>
            </div>
          ) : (
            reviews.map((r) => {
              const isAuthor = user?.id && Number(r.user_id) === Number(user.id);
              const canDelete = isAuthor || isAdmin;

              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-4 border space-y-2 relative transition-all"
                  style={{ backgroundColor: t.cardAlt, borderColor: t.border }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                        style={{ background: BRAND_GRAD }}
                      >
                        {r.user_avatar ? (
                          <img src={r.user_avatar} alt={r.user_name} className="w-full h-full object-cover" />
                        ) : (
                          (r.user_name || "P").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: t.text }}>
                          <span>{r.user_name || "MatchConnect Player"}</span>
                          {r.user_team_name && (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                              {r.user_team_name}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: t.faint }}>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "w-3.5 h-3.5",
                              s <= Math.round(Number(r.rating) || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-neutral-500"
                            )}
                          />
                        ))}
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          title="Delete review"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: t.text }}>
                    {r.review_text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </Modal>
  );
}

/* ============================================================================
   GROUNDS TAB
   ============================================================================ */
export default function GroundsTab({ onBook, grounds = GROUNDS, token, onGroundCreated, onGroundUpdated, onGroundDeleted, user, teammateIds = [], theme = "dark" }) {
  const isLight = detectLight(theme);
  const t = tokens(isLight);
  const [cost, setCost] = useState("1200");
  const [split, setSplit] = useState("11");
  const [ratingFilter, setRatingFilter] = useState("Any Rating");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [priceFilter, setPriceFilter] = useState("Any Price");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGround, setSelectedGround] = useState(null);
  const [selectedDetailImg, setSelectedDetailImg] = useState(0);
  const [reviewsGround, setReviewsGround] = useState(null);
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
  const bookedTodaySlots = g => (Array.isArray(g.booked_time_slots_today) ? g.booked_time_slots_today : []);
  const canBookGround = g => !isOwnedByMyTeam(g) && (Number(g.booking_count_today) || 0) < 2;

  const getPriceNum = g => {
    if (g.price_per_hour !== undefined && g.price_per_hour !== null && g.price_per_hour !== "") {
      const n = Number(g.price_per_hour);
      if (Number.isFinite(n)) return n;
    }
    const n = Number(String(g.price ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  // Case-insensitive deduplication and normalized display for locations
  const locationMap = new Map();
  grounds.forEach(g => {
    const raw = (displayLocation(g) || "").trim();
    if (raw) {
      const key = raw.toLowerCase();
      if (!locationMap.has(key)) {
        const formatted = raw
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        locationMap.set(key, formatted);
      }
    }
  });
  const uniqueLocations = Array.from(locationMap.values()).sort((a, b) => a.localeCompare(b));

  const ratingThreshold = { "Any Rating": 0, "4.7+": 4.7, "4.5+": 4.5, "4.0+": 4.0 }[ratingFilter];

  const filteredGrounds = [...grounds]
    .filter(g => (Number(g.rating) || 0) >= ratingThreshold)
    .filter(g => {
      if (locationFilter === "All Locations") return true;
      const gLoc = (displayLocation(g) || "").trim().toLowerCase();
      return gLoc === locationFilter.trim().toLowerCase();
    })
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
      const nameMatch = (g.name || "").toLowerCase().includes(q);
      const locMatch = (displayLocation(g) || "").toLowerCase().includes(q);
      const areaMatch = (g.area || "").toLowerCase().includes(q);
      const addressMatch = (g.address || "").toLowerCase().includes(q);
      return nameMatch || locMatch || areaMatch || addressMatch;
    })
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  const activeFilters = [];
  if (searchQuery.trim()) activeFilters.push({ id: "search", label: `"${searchQuery.trim()}"`, clear: () => setSearchQuery("") });
  if (locationFilter !== "All Locations") activeFilters.push({ id: "location", label: `📍 ${locationFilter}`, clear: () => setLocationFilter("All Locations") });
  if (priceFilter !== "Any Price") activeFilters.push({ id: "price", label: `💰 ${priceFilter}`, clear: () => setPriceFilter("Any Price") });
  if (ratingFilter !== "Any Rating") activeFilters.push({ id: "rating", label: `⭐ ${ratingFilter}`, clear: () => setRatingFilter("Any Rating") });

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

  const deleteGround = async (g, afterDelete) => {
    if (!window.confirm("Delete this ground?")) return;
    try {
      await apiRequest(`/grounds/${g.id}`, { method: "DELETE", token });
      showToast.delete("Ground deleted successfully.");
      onGroundDeleted?.(g.id);
      afterDelete?.();
    } catch (err) {
      showToast.error(err, "Could not delete ground");
    }
  };

  const selectClass = "w-full text-sm bg-transparent focus:outline-none appearance-none pr-6 cursor-pointer truncate";
  const optionClass = isLight ? "bg-white text-slate-800" : "bg-[#0c120e] text-[#e5e7eb]";

  return (
    <div className="space-y-6">
      <PageHeader
        isLight={isLight}
        icon={MapPin}
        title="Cricket Grounds"
        subtitle="Explore, book or register grounds for your matches"
        action={<GroundForm token={token} onCreated={onGroundCreated} theme={theme} />}
      />

      {/* FILTERS */}
      <section>
        <SectionTitle
          isLight={isLight}
          title="Filter Grounds"
          badge={`${filteredGrounds.length} ground${filteredGrounds.length === 1 ? "" : "s"}`}
          right={
            activeFilters.length > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                style={{ color: t.red }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )
          }
        />

        <Card isLight={isLight} accent={false} className="flex flex-col md:flex-row md:items-center">
          <div className="flex-1 flex items-center px-4 py-3 min-w-0">
            <Search className="w-4 h-4 shrink-0 mr-2.5" style={{ color: searchQuery ? t.green : t.faint }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by ground name or area"
              className="w-full text-sm bg-transparent focus:outline-none"
              style={{ color: t.text }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="p-1 cursor-pointer" aria-label="Clear search">
                <X className="w-3.5 h-3.5" style={{ color: t.sub }} />
              </button>
            )}
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 border-t md:border-t-0 md:border-l shrink-0"
            style={{ borderColor: t.border }}
          >
            <div className="relative px-4 py-3 flex items-center min-w-[150px] border-b sm:border-b-0 sm:border-r" style={{ borderColor: t.border }}>
              <MapPin className="w-4 h-4 shrink-0 mr-2" style={{ color: locationFilter !== "All Locations" ? t.green : t.faint }} />
              <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className={selectClass} style={{ color: t.text }}>
                <option value="All Locations" className={optionClass}>All Locations</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc} className={optionClass}>{loc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: t.sub }} />
            </div>

            <div className="relative px-4 py-3 flex items-center min-w-[150px] border-b sm:border-b-0 sm:border-r" style={{ borderColor: t.border }}>
              <IndianRupee className="w-4 h-4 shrink-0 mr-2" style={{ color: priceFilter !== "Any Price" ? t.green : t.faint }} />
              <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} className={selectClass} style={{ color: t.text }}>
                {["Any Price", "Under ₹500/hr", "₹500–₹1000/hr", "₹1000+/hr"].map(o => (
                  <option key={o} value={o} className={optionClass}>{o}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: t.sub }} />
            </div>

            <div className="relative px-4 py-3 flex items-center min-w-[130px]">
              <Star
                className={cn("w-4 h-4 shrink-0 mr-2", ratingFilter !== "Any Rating" ? "fill-amber-400" : "")}
                style={{ color: ratingFilter !== "Any Rating" ? "#f59e0b" : t.faint }}
              />
              <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} className={selectClass} style={{ color: t.text }}>
                {["Any Rating", "4.7+", "4.5+", "4.0+"].map(o => (
                  <option key={o} value={o} className={optionClass}>{o === "Any Rating" ? o : `${o} ★`}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: t.sub }} />
            </div>
          </div>
        </Card>

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5">
            {activeFilters.map(af => (
              <span
                key={af.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ backgroundColor: t.greenSoft, color: t.green, borderColor: t.greenBorder }}
              >
                {af.label}
                <button type="button" onClick={af.clear} className="cursor-pointer" aria-label="Remove filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <GroundsMap
        grounds={filteredGrounds}
        canBookGround={canBookGround}
        displayPrice={displayPrice}
        displayLocation={displayLocation}
        theme={theme}
      />

      {/* COST SPLIT */}
      <Card isLight={isLight} className="p-5 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4" style={{ color: t.green }} />
          <span className="text-base font-bold" style={{ color: t.text }}>Cost split calculator</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label isLight={isLight}>Ground cost (₹/hr)</Label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              style={fieldStyle(isLight)}
              placeholder="1200"
            />
          </div>
          <div>
            <Label isLight={isLight}>Split between</Label>
            <div className="relative">
              <select
                value={split}
                onChange={e => setSplit(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none cursor-pointer"
                style={fieldStyle(isLight)}
              >
                {[11, 12, 14, 22].map(n => (
                  <option key={n} value={n}>{n} players</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.sub }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3 border" style={{ backgroundColor: t.greenSoft, borderColor: t.greenBorder }}>
            <div className="text-xs mb-1 font-medium" style={{ color: t.sub }}>Per head</div>
            <div className="text-2xl font-black" style={{ color: t.green }}>₹{perHead}</div>
          </div>
          <div className="rounded-xl p-3 border" style={{ backgroundColor: t.cardAlt, borderColor: t.border }}>
            <div className="text-xs mb-1 font-medium" style={{ color: t.sub }}>Total cost</div>
            <div className="text-2xl font-black" style={{ color: t.text }}>₹{Number(cost || 0).toLocaleString()}</div>
          </div>
        </div>
        <SoftButton isLight={isLight} type="button" className="w-full">Share Split Request</SoftButton>
      </Card>

      {/* GROUND LIST */}
      <section>
        <SectionTitle
          isLight={isLight}
          title="Available Grounds"
          badge={`${filteredGrounds.length} result${filteredGrounds.length === 1 ? "" : "s"}`}
        />

        <div className="space-y-4">
          {filteredGrounds.length === 0 && (
            <Card isLight={isLight} className="p-8 text-center">
              <div className="text-3xl mb-2">🏟</div>
              <div className="text-sm font-bold" style={{ color: t.text }}>No grounds match your filters</div>
              <p className="text-xs mt-1" style={{ color: t.sub }}>Try a different search, location, price or rating.</p>
              {activeFilters.length > 0 && (
                <div className="flex justify-center mt-4">
                  <SoftButton isLight={isLight} type="button" onClick={clearAllFilters}>
                    <RotateCcw className="w-4 h-4" /> Clear all filters
                  </SoftButton>
                </div>
              )}
            </Card>
          )}

          {filteredGrounds.map(g => {
            const amenities = asArray(g.amenities);
            const tags = asArray(g.tags);
            const rating = Number(g.rating) || 0;
            const availableNow = canBookGround(g);
            const isPremium = getPriceNum(g) > 1000;
            const mine = isOwnedByMyTeam(g);
            return (
              <Card key={g.id ?? g.name} isLight={isLight} className="p-5 pt-6">
                {Array.isArray(g.images) && g.images.length > 0 && (
                  <div
                    className="relative mb-3.5 rounded-xl overflow-hidden h-44 w-full bg-black/20 cursor-pointer group"
                    onClick={() => {
                      setSelectedDetailImg(0);
                      setSelectedGround(g);
                      setShowMap(false);
                    }}
                  >
                    <img
                      src={g.images[0]}
                      alt={g.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    {g.images.length > 1 && (
                      <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm flex items-center gap-1.5 shadow">
                        <ImageIcon className="w-3.5 h-3.5" /> {g.images.length} photos
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h4 className="text-xl font-bold truncate" style={{ color: t.text }}>{g.name}</h4>
                    {mine && <StatusBadge>Your team</StatusBadge>}
                    {isPremium && <StatusBadge>Premium</StatusBadge>}
                  </div>
                  <StatusBadge tone={availableNow ? "green" : "red"}>{availableNow ? "Available today" : "Booked today"}</StatusBadge>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                  <MetaRow isLight={isLight} icon={MapPin}>{displayLocation(g) || "Location TBD"}</MetaRow>
                  <MetaRow isLight={isLight} icon={IndianRupee}>{displayPrice(g)}</MetaRow>
                  {g.alt_phone && (
                    <MetaRow isLight={isLight} icon={Phone}>
                      <span>Alt: <a href={`tel:${g.alt_phone}`} className="hover:underline">{g.alt_phone}</a></span>
                    </MetaRow>
                  )}
                  {rating > 0 && (
                    <MetaRow isLight={isLight} icon={Star} onClick={() => setReviewsGround(g)} title="Click to view reviews">
                      {rating} {g.reviews_count ? `(${g.reviews_count})` : ""}
                    </MetaRow>
                  )}
                </div>

                {amenities.length > 0 && (
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {amenities.map((a, i) => (
                      <span key={a?.label ?? i} className="flex items-center gap-1 text-xs" style={{ color: t.sub }}>
                        <span style={{ color: t.green }}>{a?.icon}</span>
                        {a?.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  <Pill isLight={isLight}>
                    {bookedTodaySlots(g).length} booked today · {g.availability_mode === "scheduled" ? "Scheduled" : "Always open"}
                  </Pill>
                  {tags.map((tg, i) => (
                    <Tag key={tg?.label ?? i} color={tg?.color}>{tg?.label}</Tag>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <SoftButton isLight={isLight} type="button" disabled={!availableNow} onClick={() => onBook(g)} className="flex-1">
                    {availableNow ? "Book Now" : "Unavailable"}
                  </SoftButton>
                  <OutlineButton
                    isLight={isLight}
                    type="button"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDetailImg(0);
                      setSelectedGround(g);
                      setShowMap(false);
                    }}
                  >
                    View Details
                  </OutlineButton>
                  <OutlineButton
                    isLight={isLight}
                    type="button"
                    className="flex-1"
                    onClick={() => setReviewsGround(g)}
                  >
                    <MessageSquare className="w-4 h-4" /> Reviews {g.reviews_count ? `(${g.reviews_count})` : ""}
                  </OutlineButton>
                  {mine && (
                    <div className="flex gap-2">
                      <OutlineButton isLight={isLight} type="button" onClick={() => setEditingGround(g)} title="Edit ground" className="px-3.5">
                        <Pencil className="w-4 h-4" />
                      </OutlineButton>
                      <OutlineButton isLight={isLight} tone="danger" type="button" onClick={() => deleteGround(g)} title="Delete ground" className="px-3.5">
                        <Trash2 className="w-4 h-4" />
                      </OutlineButton>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* DETAILS MODAL */}
      {selectedGround && (
        <Modal isLight={isLight} onClose={() => setSelectedGround(null)} maxWidth="max-w-2xl">
          <Card isLight={isLight} className="p-5 pt-6">
            <ModalHeader isLight={isLight} title={selectedGround.name} onClose={() => setSelectedGround(null)} />

            {Array.isArray(selectedGround.images) && selectedGround.images.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl overflow-hidden h-56 sm:h-64 w-full bg-black/20 border" style={{ borderColor: t.border }}>
                  <img
                    src={selectedGround.images[selectedDetailImg] || selectedGround.images[0]}
                    alt={selectedGround.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedGround.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedGround.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDetailImg(idx)}
                        className={cn(
                          "relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer",
                          (selectedDetailImg || 0) === idx
                            ? "border-emerald-500 scale-105 shadow-md"
                            : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 mt-3">
              <MetaRow isLight={isLight} icon={MapPin}>{displayLocation(selectedGround) || "Location TBD"}</MetaRow>
              <MetaRow isLight={isLight} icon={Clock}>
                {selectedGround.availability_mode === "scheduled"
                  ? `${selectedGround.available_date || "Date TBD"} at ${selectedGround.available_time || "Time TBD"}`
                  : "Always available"}
              </MetaRow>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl p-3 border" style={{ backgroundColor: t.greenSoft, borderColor: t.greenBorder }}>
                <div className="text-xs mb-1 font-medium" style={{ color: t.sub }}>Price</div>
                <div className="text-lg font-black" style={{ color: t.green }}>{displayPrice(selectedGround)}</div>
              </div>
              <div
                className="rounded-xl p-3 border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: t.cardAlt, borderColor: t.border }}
                onClick={() => {
                  const target = selectedGround;
                  setSelectedGround(null);
                  setReviewsGround(target);
                }}
                title="Click to view all reviews"
              >
                <div className="text-xs mb-1 font-medium flex items-center justify-between" style={{ color: t.sub }}>
                  <span>Rating & Reviews</span>
                  <span className="text-[10px] font-bold text-emerald-500">View all →</span>
                </div>
                <div className="text-lg font-black flex items-center gap-1.5" style={{ color: t.text }}>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {selectedGround.rating || 0}
                  <span className="text-xs font-normal" style={{ color: t.sub }}>
                    ({selectedGround.reviews_count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 border mt-3" style={{ backgroundColor: t.cardAlt, borderColor: t.border }}>
              <div className="text-xs font-semibold mb-1" style={{ color: t.sub }}>Posted by</div>
              <div className="text-sm font-semibold" style={{ color: t.text }}>{selectedGround.postedByName || "MatchConnect user"}</div>
              <div className="text-xs mt-1 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ color: t.sub }}>
                {selectedGround.postedByPhone ? (
                  <a href={`tel:${selectedGround.postedByPhone}`} className="hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-500" /> {selectedGround.postedByPhone}
                  </a>
                ) : (
                  <span>No phone number saved.</span>
                )}
                {selectedGround.alt_phone && (
                  <a href={`tel:${selectedGround.alt_phone}`} className="hover:underline flex items-center gap-1 font-semibold" style={{ color: t.green }}>
                    <Phone className="w-3 h-3" /> Alt: {selectedGround.alt_phone}
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-xl p-4 border mt-3" style={{ backgroundColor: t.cardAlt, borderColor: t.border }}>
              <div className="text-xs font-semibold mb-2" style={{ color: t.sub }}>Today's bookings</div>
              {bookedTodaySlots(selectedGround).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {bookedTodaySlots(selectedGround).map(slot => (
                    <Tag key={slot} color="amber">{slot}</Tag>
                  ))}
                </div>
              ) : (
                <div className="text-xs" style={{ color: t.sub }}>No bookings yet today.</div>
              )}
              <div className="text-xs mt-2" style={{ color: t.faint }}>
                Free slots: {TIME_SLOTS.filter(slot => !bookedTodaySlots(selectedGround).includes(slot)).join(", ") || "No slots left today"}
              </div>
            </div>

            {(selectedGround.googleMapsUrl || displayLocation(selectedGround)) && showMap && (
              <div className="rounded-xl overflow-hidden border mt-3" style={{ borderColor: t.border }}>
                <iframe
                  title="Ground map"
                  src={buildGroundMapsEmbedUrl(selectedGround)}
                  className="w-full h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <SoftButton
                isLight={isLight}
                type="button"
                onClick={() => {
                  const target = selectedGround;
                  setSelectedGround(null);
                  setReviewsGround(target);
                }}
              >
                <MessageSquare className="w-4 h-4" /> Reviews ({selectedGround.reviews_count || 0})
              </SoftButton>
              <SoftButton isLight={isLight} type="button" onClick={() => setShowMap(prev => !prev)}>
                <Map className="w-4 h-4" /> {showMap ? "Hide Map" : "View Map"}
              </SoftButton>
              {buildGroundMapsLink(selectedGround) && (
                <a
                  href={buildGroundMapsLink(selectedGround)}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 border"
                  style={{ borderColor: t.border, color: t.text }}
                >
                  <ExternalLink className="w-4 h-4" /> Open in Google Maps
                </a>
              )}
              {isOwnedByMyTeam(selectedGround) && (
                <>
                  <OutlineButton isLight={isLight} type="button" onClick={() => setEditingGround(selectedGround)}>
                    <Pencil className="w-4 h-4" /> Edit
                  </OutlineButton>
                  <OutlineButton
                    isLight={isLight}
                    tone="danger"
                    type="button"
                    onClick={() => deleteGround(selectedGround, () => setSelectedGround(null))}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </OutlineButton>
                </>
              )}
            </div>
          </Card>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editingGround && (
        <Modal isLight={isLight} onClose={() => setEditingGround(null)} maxWidth="max-w-2xl">
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
        </Modal>
      )}

      {/* REVIEWS MODAL */}
      {reviewsGround && (
        <GroundReviewsModal
          ground={reviewsGround}
          isLight={isLight}
          user={user}
          token={token}
          onClose={() => setReviewsGround(null)}
          onReviewAdded={updated => {
            onGroundUpdated?.(updated);
            setReviewsGround(updated);
            if (selectedGround?.id === updated.id) setSelectedGround(updated);
          }}
          onReviewDeleted={updated => {
            onGroundUpdated?.(updated);
            setReviewsGround(updated);
            if (selectedGround?.id === updated.id) setSelectedGround(updated);
          }}
        />
      )}
    </div>
  );
}