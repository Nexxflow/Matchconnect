import { useState, useEffect } from "react";
import { Bell, Search, MapPin, CalendarDays, ChevronDown, Phone, Star, CheckCircle, Car, Droplets, Wind, Hash, Plus, Filter, Shield, Swords, Trophy, AlertCircle, CheckCheck, Clock, XCircle, Calendar, Users, X, CreditCard, CalendarCheck, LogOut, Pencil, Trash2, ExternalLink, Map, Award, DollarSign } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AuthScreen from "./components/Auth/AuthScreen.jsx";
import { apiRequest, getStoredToken, setStoredToken } from "./api";
import LiveScoreTab from "./components/LiveScoreTab";
import { Megaphone } from "lucide-react";
import CreateTournamentForm from "./components/CreateTournamentForm"; 

// Leaflet's default marker images don't resolve correctly with Vite's
// bundler, so we build a small custom pin icon from an inline SVG instead
// of relying on the library's default PNG assets.
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
// import AuthScreen from "./components/Auth/AuthScreen.jsx";
import EditProfileModal from "./components/Auth/EditProfileModal.jsx";
// import {   setStoredToken } from "./api";
import { useRef } from "react";

// ─── Push notifications (Firebase Cloud Messaging) ─────────────────────────
// requestNotificationPermission(): asks the browser for permission and
//   returns an FCM registration token (or null if denied/unsupported).
// listenForMessages(): kept for reference — we use getFirebaseMessaging +
//   onMessage directly below instead, so incoming pushes can be routed into
//   the app's own notification state rather than a blocking alert().
import {
  requestNotificationPermission,
  listenForMessages,
} from "../services/firebaseNotification";

import { getFirebaseMessaging } from "../firebase";

import { onMessage } from "firebase/messaging";

// Register the FCM background service worker once, as soon as this module
// loads. This must live at the site root (public/firebase-messaging-sw.js)
// — FCM will not find it under /src or any other path.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then(reg => console.log("FCM service worker registered:", reg.scope))
    .catch(err => console.error("FCM service worker registration failed:", err));
}

// ─── Backend → frontend shape transformers ─────────────────────────────────
const AMENITY_ICON = {
  Water: <Droplets className="w-3 h-3" />, Showers: <Droplets className="w-3 h-3" />,
  Parking: <Car className="w-3 h-3" />, "Open Air": <Wind className="w-3 h-3" />
};
const TAG_COLOR = { Floodlights: "blue", Heritage: "amber", Popular: "amber", Budget: "green" };



function formatGroundPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `₹${numeric}/hr`;
  if (typeof value === "string") return value.startsWith("₹") ? value : `₹${value}`;
  return String(value);
}

function transformGround(g) {
  const amenities = (g.amenities || []).map(label => ({
    icon: AMENITY_ICON[label] || <Droplets className="w-3 h-3" />,
    label
  }));
  const tags = (g.tags || []).map(label => ({
    label,
    color: TAG_COLOR[label] || (label.startsWith("Pitches") ? "green" : "blue")
  }));
  return {
    ...g,
    price: formatGroundPrice(g.price_per_hour ?? g.price),
    rating: Number(g.rating) || 0,
    amenities,
    tags,
    postedByName: g.posted_by_name || g.postedByName || "MatchConnect user",
    postedByPhone: g.posted_by_phone || g.postedByPhone || "",
    googleMapsUrl: g.google_maps_url || g.googleMapsUrl || ""
  };
}

function buildGroundMapsEmbedUrl(ground) {
  const rawUrl = ground?.googleMapsUrl || ground?.google_maps_url || "";
  if (rawUrl) {
    if (rawUrl.includes("output=embed")) return rawUrl;
    try {
      const parsed = new URL(rawUrl);
      const query = parsed.searchParams.get("q") || parsed.searchParams.get("query") || ground.area || ground.name;
      return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    } catch {
      return rawUrl;
    }
  }
  const query = ground?.area || ground?.address || ground?.name || "";
  return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : "";
}

function buildGroundMapsLink(ground) {
  const query = ground?.area || ground?.address || ground?.name || "";
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

const UMPIRE_GRADIENTS = [
  "linear-gradient(135deg,#7c3aed,#5b21b6)", "linear-gradient(135deg,#db2777,#9d174d)",
  "linear-gradient(135deg,#d97706,#92400e)", "linear-gradient(135deg,#2563eb,#1e40af)"
];
function transformUmpire(u, i) {
  return { ...u, exp: `${u.experience} yrs`, price: `₹${Number(u.fee_per_match)}/match`, avail: u.available, grad: UMPIRE_GRADIENTS[i % UMPIRE_GRADIENTS.length] };
}

// const STATUS_COLOR = { Registering: "blue", Ongoing: "green", Finals: "amber", Completed: "blue" };

// ─── Force dark body regardless of CSS cascade ────────────────────────────────
function useForceDark() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = "#0d0f0d";
    document.body.style.backgroundColor = "#0d0f0d";
    document.body.style.color = "#f0f2f0";
  }, []);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}



const C = "mc-card";

function Tag({ color, children }) {
  const map = {
    green: "bg-green-500/15 text-green-400 border-green-500/20",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    red: "bg-red-500/15 text-red-400 border-red-500/20",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/20"
  };
  return <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", map[color])}>{children}</span>;
}
function StarRow({ count, max = 5 }) {
  return <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => <Star key={i} className={cn("w-3.5 h-3.5", i < count ? "text-amber-400 fill-amber-400" : "text-[#333]")} />)}
    </div>;
}
function GhostButton({ children, onClick, disabled, className = "" }) {
  return <button disabled={disabled} onClick={onClick} className={cn("py-2 rounded-xl text-xs font-medium transition-colors", className)} style={{
    border: "1px solid #2a2a2a",
    color: disabled ? "#3a3a3a" : "#c8ccc8",
    backgroundColor: "transparent",
    cursor: disabled ? "not-allowed" : "pointer"
  }} onMouseEnter={e => !disabled && (e.currentTarget.style.backgroundColor = "#222")} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
      {children}
    </button>;
}

// ─── Dummy data shared across tabs ─────────────────────────────────────────────
// NOTE: Umpires no longer have a dummy dataset — that tab is 100% live-data now
// (see UmpiresTab / UmpireForm below). Grounds/Tournaments/etc. still fall back
// to this demo data only wh
// ile the backend is unreachable.
const FORMATS = [
  { key: "T20", emoji: "⚡", title: "T20 Match", desc: "20 overs per side, fast-paced" },
  { key: "ODI", emoji: "🏏", title: "ODI Format", desc: "50 overs, balanced game" },
  { key: "Turf", emoji: "🔥", title: "Turf Nets", desc: "Short format, indoor/outdoor" },
  { key: "Test", emoji: "🎯", title: "Test Match", desc: "Multi-day, traditional format" }
];

// Sensible default overs per format — shown as a starting point in the
// challenge form, but the user can type in a custom number (e.g. a 16-over
// T20 instead of the usual 20). Test matches don't use a fixed overs count.
const DEFAULT_OVERS = { T20: 20, ODI: 50, Turf: 10, Test: "" };

const ALL_CHALLENGES = [
  { id: 1, team: "Royal Strikers CC", rating: 4.7, wins: 23, losses: 8, format: "T20", date: "Today", time: "4:00 PM", ground: "Shivaji Park Ground", urgent: true, note: "Free entry" },
  { id: 2, team: "Mumbai Warriors", rating: 4.3, wins: 18, losses: 12, format: "ODI", date: "Weekend", time: "9:00 AM", ground: "Cross Maidan", urgent: false, note: "₹500/head" },
  { id: 3, team: "Thunder Bolts CC", rating: 4.6, wins: 31, losses: 9, format: "T20", date: "Weekend", time: "3:00 PM", ground: "Oval Maidan", urgent: false, note: "Intermediate" },
  { id: 4, team: "Green Eagles", rating: 4.4, wins: 24, losses: 14, format: "ODI", date: "Next Week", time: "8:00 AM", ground: "Azad Maidan", urgent: false, note: "Advanced" },
  { id: 5, team: "City Smashers", rating: 4.1, wins: 19, losses: 20, format: "Box", date: "Today", time: "6:00 PM", ground: "Kotturpuram Stadium", urgent: true, note: "Beginner" },
  { id: 6, team: "Deccan Chargers CC", rating: 4.5, wins: 27, losses: 11, format: "Test", date: "Next Week", time: "9:30 AM", ground: "Oval Maidan", urgent: false, note: "Multi-day" }
];

const GROUNDS = [
  { name: "Kotturpuram Stadium", area: "Kotturpuram, Chennai", amenities: [{ icon: <Droplets className="w-3 h-3" />, label: "Water" }, { icon: <Car className="w-3 h-3" />, label: "Parking" }], tags: [{ label: "Floodlights", color: "blue" }, { label: "Pitches: 3", color: "green" }], price: "₹800/hr", rating: 4.8 },
  { name: "Shivaji Park Ground", area: "Dadar, Mumbai", amenities: [{ icon: <Car className="w-3 h-3" />, label: "Parking" }, { icon: <Wind className="w-3 h-3" />, label: "Open Air" }], tags: [{ label: "Natural Turf", color: "green" }, { label: "Popular", color: "amber" }], price: "₹600/hr", rating: 4.5 },
  { name: "Oval Maidan", area: "Churchgate, Mumbai", amenities: [{ icon: <Droplets className="w-3 h-3" />, label: "Showers" }, { icon: <Car className="w-3 h-3" />, label: "Parking" }], tags: [{ label: "Floodlights", color: "blue" }, { label: "Heritage", color: "amber" }, { label: "Pitches: 5", color: "green" }], price: "₹1,200/hr", rating: 4.9 },
  { name: "Azad Maidan", area: "Fort, Mumbai", amenities: [{ icon: <Car className="w-3 h-3" />, label: "Parking" }], tags: [{ label: "Budget", color: "green" }], price: "₹500/hr", rating: 4.2 }
];

const TIME_SLOTS = ["6:00 AM", "8:00 AM", "10:00 AM", "2:00 PM", "4:00 PM", "6:00 PM"];

function getNext7Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      iso: d.toISOString().slice(0, 10)
    });
  }
  return days;
}



// ─── BOOKING MODAL (Grounds + Umpires shared flow) ─────────────────────────────
function BookingModal({ item, type, token, onClose, onConfirm }) {
  const [step, setStep] = useState(1); // 1: date/time, 2: review/payment, 3: success
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const days = getNext7Days();

  if (!item) return null;

  const priceNum = Number(String(item.price).replace(/[^\d]/g, "")) || 0;
  const platformFee = Math.round(priceNum * 0.05);
  const total = priceNum + platformFee;

  const handleConfirmPayment = async () => {
    if (!item.id) {
      setPayError("This item isn't loaded from the backend yet — refresh and try again.");
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const res = await apiRequest("/bookings/create-order", {
        method: "POST",
        token,
        body: { booking_type: type, ref_id: item.id, booking_date: days[selectedDay].iso, time_slot: selectedSlot }
      });
      onConfirm(res.booking);
      setStep(3);
    } catch (err) {
      setPayError(err.message || "Payment failed, please try again.");
    } finally {
      setPaying(false);
    }
  };

  return <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[88vh] overflow-y-auto" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">{type === "ground" ? "Book Ground" : "Book Official"}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: "#222" }}>
            <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
            {type === "ground" ? "🏟" : "🧑‍⚖️"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{item.name}</div>
            <div className="text-xs" style={{ color: "#6b7a6b" }}>{type === "ground" ? item.area : `${item.role} · ${item.exp}`}</div>
          </div>
        </div>

        {step === 1 && <>
            <div className="mb-4">
              <label className="text-xs mb-2 block font-medium" style={{ color: "#6b7a6b" }}>Select Date</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d, i) => <button key={i} onClick={() => setSelectedDay(i)} className="shrink-0 px-3 py-2 rounded-xl text-center transition-colors" style={{
              backgroundColor: selectedDay === i ? "rgba(34,197,94,0.15)" : "#1a1a1a",
              border: selectedDay === i ? "1px solid #22c55e" : "1px solid #2a2a2a"
            }}>
                    <div className="text-xs font-semibold" style={{ color: selectedDay === i ? "#22c55e" : "#c8ccc8" }}>{d.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{d.date}</div>
                  </button>)}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs mb-2 block font-medium" style={{ color: "#6b7a6b" }}>Select Time Slot</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(slot => <button key={slot} onClick={() => setSelectedSlot(slot)} className="py-2 rounded-xl text-xs font-medium transition-colors" style={{
              backgroundColor: selectedSlot === slot ? "rgba(34,197,94,0.15)" : "#1a1a1a",
              border: selectedSlot === slot ? "1px solid #22c55e" : "1px solid #2a2a2a",
              color: selectedSlot === slot ? "#22c55e" : "#c8ccc8"
            }}>
                    {slot}
                  </button>)}
              </div>
            </div>
            <button disabled={!selectedSlot} onClick={() => setStep(2)} className="w-full py-3 rounded-xl font-bold text-sm transition-colors" style={selectedSlot ? { backgroundColor: "#22c55e", color: "#000" } : { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }}>
              Continue to Payment
            </button>
          </>}

        {step === 2 && <>
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <CalendarCheck className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-xs" style={{ color: "#c8ccc8" }}>{days[selectedDay].label}, {days[selectedDay].date} · {selectedSlot}</span>
            </div>
            <div className="rounded-xl p-4 mb-5 space-y-2" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6b7a6b" }}>{type === "ground" ? "Ground charges" : "Booking fee"}</span>
                <span className="font-mono text-white">₹{priceNum.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6b7a6b" }}>Platform fee (5%)</span>
                <span className="font-mono text-white">₹{platformFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-sm font-bold" style={{ borderTop: "1px solid #2a2a2a" }}>
                <span className="text-white">Total Payable</span>
                <span className="text-green-400 font-mono">₹{total.toLocaleString()}</span>
              </div>
            </div>
            {payError && <div className="text-xs text-red-400 mb-3 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{payError}</div>}
            <div className="flex gap-2">
              <GhostButton onClick={() => setStep(1)} disabled={paying} className="flex-1 text-center">Back</GhostButton>
              <button disabled={paying} onClick={handleConfirmPayment} className="flex-[2] py-3 rounded-xl bg-green-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-400 transition-colors" style={paying ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
                <CreditCard className="w-4 h-4" /> {paying ? "Processing..." : `Pay ₹${total.toLocaleString()}`}
              </button>
            </div>
          </>}

        {step === 3 && <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div className="font-bold text-white text-base mb-1">Booking Confirmed!</div>
            <p className="text-xs mb-5" style={{ color: "#6b7a6b" }}>{item.name} · {days[selectedDay].label} {selectedSlot}. Check "My Bookings" in My Team tab.</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors">Done</button>
          </div>}
      </div>
    </div>;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ active, setActive, user, onLogout, token, onUserUpdated, pushCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const tabs = ["Home", "Find Match", "Grounds", "Umpires", "Live Score", "Tournaments", "My Team"];
  const initials = (user?.name || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <nav style={{ backgroundColor: "#0d0f0d" }} className="sticky top-0 z-50 border-b border-[#2a2a2a] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <span className="text-black font-black text-sm">MC</span>
          </div>
          <span className="font-bold text-white text-base tracking-tight">MatchConnect</span>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5 min-w-max">
            {tabs.map(tab => <button key={tab} onClick={() => setActive(tab)} className={cn("relative px-3 py-4 text-sm font-medium transition-colors whitespace-nowrap", active === tab ? "text-green-400" : "text-[#6b7a6b] hover:text-[#c8ccc8]")}>
                {tab}
                {active === tab && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-green-500 rounded-full" />}
              </button>)}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button style={{ backgroundColor: "#1e211e" }} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
            <Bell className="w-4 h-4 text-[#c8ccc8]" />
            {pushCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" style={{ border: "2px solid #0d0f0d" }} />}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-black font-bold text-sm cursor-pointer">
              {initials}
            </button>
            {menuOpen && <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-48 rounded-xl overflow-hidden z-50" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}>
                  <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #2a2a2a" }}>
                    <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                    {/* Username shown as the account's phone number, not email */}
                    <div className="text-xs font-mono truncate" style={{ color: "#6b7a6b" }}>{user?.phone || "—"}</div>
                  </div>
                  <button onClick={() => { setMenuOpen(false); setEditing(true); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors" style={{ color: "#c8ccc8" }}>
                    <Pencil className="w-3.5 h-3.5 text-green-400" /> Edit Profile
                  </button>
                  <button onClick={() => { setMenuOpen(false); onLogout(); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-400 hover:bg-white/5 transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Log out
                  </button>
                </div>
              </>}
          </div>
        </div>
      </div>

      {editing && (
        <EditProfileModal
          user={user}
          token={token}
          onClose={() => setEditing(false)}
          onSaved={updated => {
            onUserUpdated(updated);
            setEditing(false);
          }}
        />
      )}
    </nav>;
}
// Strip everything except digits so "9876543210", "+91 98765 43210",
// and "919876543210" all compare equal.
function normalizePhone(p) {
  return String(p || "").replace(/\D/g, "");
}
// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeTab({ setActiveTab, grounds = GROUNDS, challenges = ALL_CHALLENGES, tournaments = [], allChallenges = [], onCreateChallenge }) {
// Real counts derived from actual data — no more hardcoded/inflated numbers.
  // "Matches Played" counts confirmed (accepted) challenges; "Active Teams"
  // counts distinct team names that have ever posted or accepted a challenge.
  const matchesPlayedCount = allChallenges.filter(c => c.status === "accepted").length;
  const activeTeamsCount = new Set(
    allChallenges.flatMap(c => [c.team_name, c.accepted_by_team_name].filter(Boolean))
  ).size;
  return <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden p-6 md:p-8 border border-green-800/40" style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 40%, #0d2a16 100%)" }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #22c55e 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4" style={{ backgroundColor: "rgba(13,15,13,0.5)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <MapPin className="w-3 h-3 text-green-400" />
            <span className="text-green-300 text-xs font-medium">Mumbai, Maharashtra</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Find your next</h1>
          <h1 className="text-2xl md:text-3xl font-bold text-green-400 mb-5">cricket match</h1>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setActiveTab("Find Match")} className="px-5 py-2 rounded-full border-2 border-green-400 text-green-300 text-sm font-semibold hover:bg-green-400/10 transition-colors">
              🏏 Find a Match
            </button>
            <button onClick={() => setActiveTab("Grounds")} className="px-5 py-2 rounded-full text-white/80 text-sm font-semibold hover:bg-white/5 transition-colors" style={{ border: "2px solid rgba(255,255,255,0.3)" }}>
              🏟 Book a Ground
            </button>
            <button onClick={onCreateChallenge} className="px-5 py-2 rounded-full bg-green-500 text-black text-sm font-semibold hover:bg-green-400 transition-colors">
              ⚡ Create Challenge
            </button>
          </div>
        </div>
        <div className="absolute right-6 bottom-4 text-7xl opacity-20 select-none">🏏</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
        { label: "Matches Played", value: String(matchesPlayedCount), color: "#22c55e", icon: "🏏", sub: "Confirmed matches" },
        { label: "Active Teams", value: String(activeTeamsCount), color: "#3b82f6", icon: "👥", sub: "On MatchConnect" },
        { label: "Active Grounds", value: String(grounds.length), color: "#f97316", icon: "🏟", sub: "Bookable now" },
        { label: "Active Tournaments", value: String(tournaments.length), color: "#a855f7", icon: "🏆", sub: "Open or ongoing" }
      ].map(s => <div key={s.label} className={cn(C, "rounded-2xl p-4")}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{s.label}</div>
            <div className="text-xs mt-1" style={{ color: "#4a5a4a" }}>{s.sub}</div>
          </div>)}
      </div>

      {/* Urgent match requests — shows real posted challenges (urgent ones first), not just dummy demo data */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Urgent Match Requests</h2>
          <button onClick={() => setActiveTab("Find Match")} className="text-xs text-green-400 hover:text-green-300">View all →</button>
        </div>
        <div className="space-y-3">
          {[...challenges]
            .sort((a, b) => (b.urgent === a.urgent ? 0 : b.urgent ? 1 : -1))
            .slice(0, 3)
            .map(req => <div key={req.id} className={cn(C, "rounded-2xl p-4")}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                      {req.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{req.team}</div>
                      {(req.rating > 0 || req.wins > 0 || req.losses > 0) && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs" style={{ color: "#6b7a6b" }}>{req.rating} · W{req.wins}/L{req.losses}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-green-500 flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
                  <span className="text-green-400 font-bold text-xs">VS</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="rounded-xl p-3 text-center" style={{ border: "2px dashed #2a2a2a" }}>
                    <div className="text-xs font-medium" style={{ color: "#4a5a4a" }}>Opponent needed</div>
                    <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>11/11 players</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {req.urgent && <Tag color="amber">⚡ Urgent</Tag>}
                <Tag color="blue">{req.format}</Tag>
                <Tag color="green">{req.date} {req.time}</Tag>
              </div>
              <div className="text-xs mt-2" style={{ color: "#4a5a4a" }}>📍 {req.ground}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setActiveTab("Find Match")} className="flex-1 py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors">
                  Accept Challenge
                </button>
                <GhostButton onClick={() => setActiveTab("Find Match")} className="flex-1">View Details</GhostButton>
              </div>
            </div>)}
        </div>
      </section>

      {/* Nearby grounds */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Nearby Grounds</h2>
          <button onClick={() => setActiveTab("Grounds")} className="text-xs text-green-400 hover:text-green-300">View all →</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {grounds.map(g => <div key={g.name} className={cn(C, "rounded-2xl overflow-hidden")}>
              <div className="h-16 flex items-center justify-center border-b border-[#2a2a2a]" style={{ backgroundColor: "rgba(22,101,52,0.15)" }}>
                <span className="text-3xl opacity-50">🏟</span>
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm text-white leading-tight">{g.name}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs" style={{ color: "#6b7a6b" }}>{g.rating} · {g.area}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {g.amenities.map(a => <span key={a.label} className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#222", color: "#6b7a6b", border: "1px solid #2a2a2a" }}>{a.label}</span>)}
                </div>
                <div className="font-bold text-sm mt-2 text-green-400">{g.price}</div>
              </div>
            </div>)}
        </div>
      </section>
    </div>;
}

// ─── FIND MATCH ───────────────────────────────────────────────────────────────
// ─── Small date/time helpers (local, no external date library) ────────────
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

// ─── Calendar dropdown ──────────────────────────────────────────────────────
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

  return <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full rounded-xl px-3 py-2 text-sm text-left focus:outline-none flex items-center justify-between" style={{ backgroundColor: "#111", border: `1px solid ${open ? "#22c55e" : "#2a2a2a"}`, color: value ? "#fff" : "#4a5a4a" }}>
        <span>{value ? formatDateDisplay(value) : "Select a date"}</span>
        <Calendar className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
      </button>

      {open && <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 rounded-xl p-3 w-72" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
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
                return <button key={i} type="button" disabled={isPast} onClick={() => selectDay(day)} className="aspect-square rounded-lg text-xs font-medium transition-colors" style={{
                  backgroundColor: isSelected ? "#22c55e" : "transparent",
                  color: isPast ? "#2a2a2a" : isSelected ? "#000" : isToday ? "#22c55e" : "#c8ccc8",
                  border: isToday && !isSelected ? "1px solid #22c55e" : "1px solid transparent",
                  cursor: isPast ? "not-allowed" : "pointer"
                }}>
                    {day}
                  </button>;
              })}
            </div>
          </div>
        </>}
    </div>;
}

// ─── Time picker (hour / minute / AM-PM) ───────────────────────────────────
function TimeField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const { hour12, minute, ampm } = from24Hour(value);

  const set = (nextHour, nextMinute, nextAmpm) => onChange(to24Hour(nextHour, nextMinute, nextAmpm));

  return <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full rounded-xl px-3 py-2 text-sm text-left focus:outline-none flex items-center justify-between" style={{ backgroundColor: "#111", border: `1px solid ${open ? "#22c55e" : "#2a2a2a"}`, color: value ? "#fff" : "#4a5a4a" }}>
        <span>{value ? formatTimeDisplay(value) : "Select a time"}</span>
        <Clock className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
      </button>

      {open && <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 rounded-xl p-3 w-56" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
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
        </>}
    </div>;
}

// ─── Challenge form ─────────────────────────────────────────────────────────
function ChallengeForm({ token, user, onCreated, disabledReason, grounds = [], autoOpen = false, onAutoOpenHandled }) {
  const emptyForm = {
    team_name: user?.team_name || "",
    format: "T20",
    overs: DEFAULT_OVERS.T20,
    match_date: "",
    time_slot: "",
    hasGround: false,
    ground_id: "",       // holds the registered ground's id when selected from the list
    ground_custom: "",   // free-text fallback when "Other / not listed" is chosen
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

  // When navigated here via the Home page's "⚡ Create Challenge" shortcut,
  // pop the form open right away instead of showing the collapsed button.
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

  // Changing format resets overs to that format's typical default —
  // the user can still type a custom number afterwards.
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
    return <div className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2" style={{ border: "1px dashed #2a2a2a", color: "#4a5a4a", backgroundColor: "#131413" }}>
        {disabledReason}
      </div>;
  }

  if (!open) {
    return <button onClick={() => {
      const err = checkProfileCompleteness();
      if (err) return;
      setOpen(true);
    }} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px dashed #2a2a2a", color: "#22c55e" }}>
        <Plus className="w-4 h-4" /> Post a Match Challenge
      </button>;
  }

  return <form onSubmit={handleSubmit} className={cn(C, "rounded-2xl p-4 space-y-3")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Post a Match Challenge</span>
        <button type="button" onClick={() => { setOpen(false); setError(null); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
          <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Team name</label>
          <input value={form.team_name} onChange={e => update("team_name", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Thunder Strikers XI" />
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

        {form.hasGround && <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Ground</label>
            {grounds.length > 0 ? <>
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
                {form.ground_id === "other" && <input
                    value={form.ground_custom}
                    onChange={e => update("ground_custom", e.target.value)}
                    className="w-full mt-2 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
                    placeholder="Ground name"
                  />}
              </> : <input
                value={form.ground_custom}
                onChange={e => { update("ground_custom", e.target.value); update("ground_id", "other"); }}
                className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
                placeholder="Green Park Cricket Ground"
              />}
          </div>}

        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Description</label>
          <textarea value={form.note} onChange={e => update("note", e.target.value)} rows={3} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none resize-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Looking for a friendly T20 match, intermediate level..." />
        </div>
      </div>

      {error && <div className="text-xs text-red-400 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

      <button type="submit" disabled={submitting || !normalizedContact} className="w-full py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors" style={(submitting || !normalizedContact) ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
        {submitting ? "Posting..." : "Post Challenge"}
      </button>
    </form>;
}

function AcceptChallengeModal({ challenge, token, user, onClose, onAccepted }) {
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

  return <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
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
            <input value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Your team name" />
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
    </div>;
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

  // Load history on open, then poll every 4s so both teams see new
  // messages without needing to reopen the chat.
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
      setText(body); // put it back so they don't lose what they typed
    } finally {
      setSending(false);
    }
  };

  return <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
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
          {messages.map(m => <div key={m.id} className="max-w-[80%]" style={{ marginLeft: m.sender_team_name === challenge.myTeamName ? "auto" : 0 }}>
              <div className="text-xs px-1 mb-0.5" style={{ color: "#4a5a4a" }}>{m.sender_team_name}</div>
              <div className="rounded-xl px-3 py-2 text-xs" style={m.sender_team_name === challenge.myTeamName ? { backgroundColor: "#22c55e", color: "#000" } : { backgroundColor: "#1a1a1a", color: "#c8ccc8", border: "1px solid #2a2a2a" }}>
                {m.body}
              </div>
            </div>)}
          <div ref={bottomRef} />
        </div>

        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} className="flex-1 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Type a message..." />
          <button onClick={send} disabled={sending} className="px-4 py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors" style={sending ? { opacity: 0.6, cursor: "not-allowed" } : {}}>Send</button>
        </div>
      </div>
    </div>;
}


// NOTE: add Search, Calendar, Clock, and X to your existing lucide-react import
// line at the top of the file, alongside Filter, ChevronDown, CheckCircle, Star:
//   import { Filter, ChevronDown, CheckCircle, Star, Search, Calendar, Clock, X } from "lucide-react";

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
        const daysToSat = (6 - day + 7) % 7 || 7 - (day === 6 ? 0 : 0);
        const offset = day === 6 || day === 0 ? 0 : 6 - day;
        return new Date(today.getTime() + offset * 86400000);
      })()
    }
  ];

  const selectedISO = value || null;

  return <div className="relative" ref={wrapRef}>
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

    {open && <div className="absolute z-20 mt-2 rounded-2xl p-3 w-64" style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
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
          return <button
            key={q.label}
            type="button"
            onClick={() => { onChange(iso); setViewDate(q.date); setOpen(false); }}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={active ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid #22c55e" } : { backgroundColor: "#1e211e", color: "#8a938a", border: "1px solid #2a2a2a" }}
          >
            {q.label}
          </button>;
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
          return <button
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
          </button>;
        })}
      </div>
    </div>}
  </div>;
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

  return <div className="relative" ref={wrapRef}>
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

    {open && <div className="absolute z-20 mt-2 rounded-2xl p-3 w-64" style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
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
    </div>}
  </div>;
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

  return <div className={cn(C, "rounded-2xl p-4")}>
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

    {!confirming
      ? <button onClick={() => setConfirming(true)} className="w-full mt-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5">
          <XCircle className="w-3.5 h-3.5" /> Delete Challenge
        </button>
      : <div className="flex gap-2 mt-3">
          <GhostButton onClick={() => setConfirming(false)} disabled={deleting} className="flex-1 text-center">Keep it</GhostButton>
          <button disabled={deleting} onClick={handleDelete} className="flex-[2] py-2 rounded-xl bg-red-500 text-black font-bold text-xs hover:bg-red-400 transition-colors" style={deleting ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>}
  </div>;
}


// ─── Date/time display helper (Indian time) ────────────────────────────────
// match_date can arrive as a plain "YYYY-MM-DD" or a full timestamp from the
// backend — either way we render it in IST so everyone sees the same date
// regardless of their browser's local timezone.
// ─── Date/time display helper (Indian time) ────────────────────────────────
function formatDateIST(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });
}

// Turns a raw challenge row from the backend into the display-friendly shape
// used across the app (Find Match list, Home page, etc). Real challenges
// don't carry a team rating/win-loss record — those default to 0 so the UI
// can render the same card layout gracefully for both real and dummy data.
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

// ─── Challenges Map ──────────────────────────────────────────────────────
// Shows a pin for every challenge that has a booked ground (which carries
// lat/lng). Challenges with no ground selected yet don't have a location,
// so they're listed underneath instead of being silently hidden.
function ChallengesMap({ challenges }) {
  const withLocation = challenges.filter(c => c.groundLat != null && c.groundLng != null);
  const withoutLocation = challenges.filter(c => c.groundLat == null || c.groundLng == null);

  if (challenges.length === 0) return null;

  // Center the map on the average of all pinned locations, falling back to
  // Chennai if nothing has a location yet.
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

// ─── Grounds Map ─────────────────────────────────────────────────────────
// Shows a pin for every ground that has lat/lng on file, colored by whether
// it can be booked right now (green) or is fully booked today (red).
// Grounds missing coordinates are listed underneath instead of being hidden.
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

function FindMatchTab({
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
  const [dateFilter, setDateFilter] = useState(null); // ISO date string ("YYYY-MM-DD") or null for "Any Date"
  const [timeFilter, setTimeFilter] = useState(""); // exact time_slot value chosen by the user, "" = Any Time
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null); // challenge currently shown in the "View Details" modal

  const normalize = normalizeChallenge;

  // Turns a timestamp into a short relative label ("2h ago", "5m ago",
  // "Just now") for the "posted" indicator on each card. Falls back to a
  // plain date if the challenge is older than a week.
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

  // Full posted date + time (IST) for the details modal, e.g. "14 Jul, 4:32 PM"
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

  // Masks a phone number for display so the full number isn't shown in a
  // public list — e.g. "9876543210" -> "98765 43210" is left as-is if you'd
  // rather show it in full; this just formats it into a readable group.
  const formatPhoneDisplay = phone => {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length !== 10) return phone;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const myPhone = normalizePhone(user?.phone);

  // Every phone number on my own team — me plus each teammate pulled from
  // /users/teammates. A challenge posted or accepted by ANY of these numbers
  // is treated as "my team's," matching the backend's team-wide rule: only
  // one member of a team may have an active post/match at a time, and
  // nobody on the same team can accept a teammate's own post.
  const teamPhoneSet = new Set([myPhone, ...teammatePhones].filter(Boolean));

  const myOpenChallenge = teamPhoneSet.size
    ? challenges.find(c => c.status === "open" && teamPhoneSet.has(normalizePhone(c.contact_no)))
    : null;

  const myTeamAcceptedChallenge = teamPhoneSet.size
    ? challenges.find(
        c =>
          c.status === "accepted" &&
          (teamPhoneSet.has(normalizePhone(c.contact_no)) ||
            teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no)))
      )
    : null;

  const hasActive = !!acceptedChallenge || !!myTeamAcceptedChallenge || !!myOpenChallenge;

  const openChallenges = challenges.filter(
    c => (!c.status || c.status === "open") && !teamPhoneSet.has(normalizePhone(c.contact_no))
  );
  const normalized = openChallenges.map(normalize);
  const format = FORMATS[selectedFormat];

  const sameDay = (dateStr, isoTarget) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr === isoTarget;
    const istDateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // en-CA = YYYY-MM-DD
    return istDateStr === isoTarget;
  };

  const query = searchQuery.trim().toLowerCase();

  // Converts EITHER "4:00 PM" (12-hour, from the TimePicker filter) OR
  // "16:00" (24-hour, as stored by ChallengeForm's TimeField) into minutes
  // since midnight, so both formats can be compared on equal footing.
  const toMinutes = timeStr => {
    if (!timeStr) return null;
    const s = String(timeStr).trim();

    // 12-hour: "4:00 PM" / "4:00PM" / "04:00 am"
    let match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return hour * 60 + minute;
    }

    // 24-hour: "16:00" / "4:00"
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

  // Posting is no longer pre-blocked just because *some* challenge exists —
  // the backend now allows a team to have separate matches on different
  // dates. If the date the user picks in the form does conflict with an
  // existing active challenge on that same date, the backend rejects it and
  // ChallengeForm shows that error inline. So there's nothing to block here.
  const postDisabledReason = null;

  // Date-aware "is my team already busy on this specific date" check, used
  // to decide whether the Accept button on a given challenge card should be
  // enabled. A confirmed/open/on_hold challenge on a DIFFERENT date no
  // longer blocks accepting this one.
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
      if (!["open", "on_hold", "accepted"].includes(c.status)) return false;
      const involved =
        teamPhoneSet.has(normalizePhone(c.contact_no)) ||
        teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no));
      if (!involved) return false;
      return isSameCalendarDay(c.match_date, targetDate);
    });

  const activeFilterCount = [dateFilter, timeFilter || null].filter(Boolean).length;

  const myOwnOpenChallenge = challenges.find(
    c => (c.status === "open" || c.status === "on_hold") && c.creator_id === user?.id
  );

  return <div className="space-y-8">
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
            disabledReason={postDisabledReason}
            autoOpen={autoOpenForm}
            onAutoOpenHandled={onAutoOpenHandled}
          />
        );

        const formatCardsBlock = (
          <div key="format-cards" className="grid grid-cols-2 gap-3">
            {FORMATS.map((f, i) => <button key={f.key} onClick={() => setSelectedFormat(i)} className="p-4 rounded-2xl text-left transition-all" style={{
            backgroundColor: i === selectedFormat ? "rgba(34,197,94,0.1)" : "#1a1a1a",
            border: i === selectedFormat ? "1px solid #22c55e" : "1px solid #2a2a2a",
            boxShadow: i === selectedFormat ? "0 0 0 1px rgba(34,197,94,0.2)" : "none"
          }}>
                <div className="text-3xl mb-2">{f.emoji}</div>
                <div className="font-semibold text-sm" style={{ color: i === selectedFormat ? "#22c55e" : "#fff" }}>{f.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{f.desc}</div>
                {i === selectedFormat && <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-green-400" style={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
                    <CheckCircle className="w-3 h-3" /> Selected
                  </div>}
              </button>)}
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
              {activeFilterCount > 0 && <button
                type="button"
                onClick={() => { setDateFilter(null); setTimeFilter(""); }}
                className="text-[11px] font-semibold transition-colors"
                style={{ color: "#6b7a6b" }}
              >
                Clear filters ({activeFilterCount})
              </button>}
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
              {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
              </button>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DateCalendarPicker value={dateFilter} onChange={setDateFilter} />
              <TimePicker value={timeFilter} onChange={setTimeFilter} />
            </div>
          </div>
        );

        // Format cards always stay fixed at the top. Only the order of the
        // remaining sections below it changes based on entry point:
        // "create" (Home page's Create Challenge shortcut) → form first.
        // "browse" (clicking the Find Match nav tab) → filters first.
        return (
          <>
            {formatCardsBlock}
            {entryMode === "create"
              ? <>{challengeFormBlock}{mapBlock}{filterBlock}</>
              : <>{filterBlock}{mapBlock}{challengeFormBlock}</>}
          </>
        );
      })()}

      {myOwnOpenChallenge && (
        <MyPostedChallengeCard
          challenge={{
            ...myOwnOpenChallenge,
            match_date: formatDateIST(myOwnOpenChallenge.match_date)
          }}
          token={token}
          onDeleted={onChallengeDeleted}
        />
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Challenge Requests</h3>
        </div>
        <div className="space-y-3">
          {filtered.length === 0 && <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>No challenges match your filters right now.</div>}
          {filtered.map(t => {
            const blocked = hasActiveOnDate(t.rawDate);
            const postedAgo = formatPostedAgo(t.postedAt);
            const phoneDisplay = formatPhoneDisplay(t.contact_no);
            return <div key={t.id} className={cn(C, "rounded-2xl p-4 transition-colors")} style={{ borderColor: t.urgent ? "rgba(245,158,11,0.35)" : "#2a2a2a" }}>

              {/* Header: team + posted info, posted-time pinned top-right */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                  {t.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{t.team}</div>
                  {/* <div className="text-xs mt-0.5 truncate" style={{ color: "#6b7a6b" }}>
                    Posted by {t.postedBy || phoneDisplay || "team contact"}
                  </div> */}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {postedAgo && (
                    <span className="text-[10px] font-medium" style={{ color: "#4a5a4a" }}>{postedAgo}</span>
                  )}
                  {t.urgent && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>⚡ Urgent</span>}
                </div>
              </div> 

              {/* Match details */}
              <div className="mt-3 rounded-2xl p-4 space-y-3" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
  {/* Team name + posted by — shown first, as the primary identity */}
  

  {/* Match logistics */}
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
    {/* {phoneDisplay && (
      <div className="flex items-center gap-2 text-xs" style={{ color: "#c8d0c8" }}>
        <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />
        <span>{phoneDisplay}</span>
      </div>
    )} */}
  </div>
</div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <Tag color="blue">{format.title}</Tag>
                {t.note && <Tag color="purple">{t.note}</Tag>}
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  disabled={blocked}
                  onClick={() => setAcceptTarget(t)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={blocked
                    ? { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }
                    : { backgroundColor: "#22c55e", color: "#000" }}
                  onMouseEnter={e => !blocked && (e.currentTarget.style.backgroundColor = "#4ade80")}
                  onMouseLeave={e => !blocked && (e.currentTarget.style.backgroundColor = "#22c55e")}
                >
                  {blocked ? "Unavailable" : "Accept Challenge"}
                </button>
                <GhostButton className="flex-1" onClick={() => setDetailsTarget(t)}>View Details</GhostButton>
              </div>
            </div>;
          })}
        </div>
      </section>

      {/* View Details modal — centered, shows poster/contact info highlighted, keeps the "ago" badge top-right */}
      {/* View Details modal — centered, unified details card */}
{detailsTarget && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
    onClick={() => setDetailsTarget(null)}
  >
    <div
      className="w-full max-w-md rounded-3xl p-5 relative animate-in fade-in zoom-in-95 duration-150"
      style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
      onClick={e => e.stopPropagation()}
    >
      {/* Top-right corner: relative "ago" badge + close button */}
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

      {/* Avatar */}
      <div className="flex items-center gap-3 pr-20">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
          {detailsTarget.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag color="blue">{format.title}</Tag>
          {detailsTarget.urgent && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>⚡ Urgent</span>}
        </div>
      </div>

      {/* Unified details card: team + posted by, then logistics */}
      <div className="mt-4 rounded-2xl p-4 space-y-3" style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e" }}>
        {/* Team name + posted by — primary identity, shown first */}
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

        {/* Match logistics */}
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
        <GhostButton className="flex-1" onClick={() => setDetailsTarget(null)}>Close</GhostButton>
      </div>
    </div>
  </div>
)}

       {acceptTarget && <AcceptChallengeModal
        challenge={acceptTarget}
        token={token}
        user={user}
        onClose={() => setAcceptTarget(null)}
        onAccepted={updated => { setAcceptTarget(null); onChallengeAccepted(updated); }}
      />}
       </div>;
}
// ─── GROUNDS ──────────────────────────────────────────────────────────────────

function GroundForm({ token, onCreated, initialGround = null, onUpdated, onDeleted, onClose }) {
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
      const res = await apiRequest(editing ? `/grounds/${initialGround.id}` : "/grounds", {
        method: editing ? "PUT" : "POST",
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

      if (editing) {
        onUpdated?.(res.ground);
        onClose?.();
      } else {
        onCreated(res.ground);
        setForm(buildForm(null));
        setOpen(false);
      }
    } catch (err) {
      setError(err.message || "Could not register — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !initialGround?.id || !token) return;
    if (!window.confirm("Delete this ground?")) return;

    setSubmitting(true);
    setError(null);
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
    return <button onClick={() => setOpen(true)} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px dashed #2a2a2a", color: "#22c55e" }}>
        <Plus className="w-4 h-4" /> Register a Ground
      </button>;
  }

  return <form onSubmit={handleSubmit} className={cn(C, "rounded-2xl p-4 space-y-3")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{editing ? "Edit Ground" : "Register a Ground"}</span>
        <button type="button" onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
          <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Ground name</label>
          <input value={form.name} onChange={e => update("name", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Green Park Cricket Ground" />
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Location / Area</label>
          <input value={form.area} onChange={e => update("area", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Linking Road, Bandra West" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Price per hour (₹)</label>
          <input type="number" min="1" value={form.price_per_hour} onChange={e => update("price_per_hour", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="1200" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Google Maps link</label>
          <input value={form.google_maps_url} onChange={e => update("google_maps_url", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="https://www.google.com/maps/..." />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Availability</label>
          <select value={form.availability_mode} onChange={e => update("availability_mode", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
            <option value="always">Always available</option>
            <option value="scheduled">Available on a date/time</option>
          </select>
        </div>
        {form.availability_mode === "scheduled" && <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Available date</label>
              <input type="date" value={form.available_date} onChange={e => update("available_date", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Available time</label>
              <input type="time" value={form.available_time} onChange={e => update("available_time", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
            </div>
          </>}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2a2a", backgroundColor: "#0f0f0f" }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "#1e1e1e" }}>
          <Map className="w-4 h-4 text-green-400" />
          <span className="text-xs font-semibold text-white">Map Preview</span>
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
          <div className="px-3 py-8 text-center text-xs" style={{ color: "#6b7a6b" }}>
            Add a location to preview the ground on Google Maps.
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red-400 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

      <div className="flex gap-2">
        {editing && <button type="button" onClick={handleDelete} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors" style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
            Delete Ground
          </button>}
        <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors" style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
          {submitting ? (editing ? "Saving..." : "Registering...") : (editing ? "Save Changes" : "Register Ground")}
        </button>
      </div>
    </form>;
}

function GroundsTab({ onBook, grounds = GROUNDS, token, onGroundCreated, onGroundUpdated, onGroundDeleted, user, teammateIds = [] }) {
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

  // Numeric price, regardless of whether the ground carries a raw
  // price_per_hour (from the backend) or a pre-formatted "₹800/hr" string
  // (from the GROUNDS demo fallback).
  const getPriceNum = g => {
    if (g.price_per_hour !== undefined && g.price_per_hour !== null && g.price_per_hour !== "") {
      const n = Number(g.price_per_hour);
      if (Number.isFinite(n)) return n;
    }
    const n = Number(String(g.price ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  // Only areas that actually belong to a registered ground show up here —
  // no more hardcoded Bandra/Andheri/Thane/Navi Mumbai list.
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

  return <div className="space-y-8">
      <div className={cn(C, "rounded-2xl p-4")}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-green-400" />
            <span className="text-sm font-semibold text-white">Filter Grounds</span>
          </div>
          {activeFilterCount > 0 && <button
            type="button"
            onClick={() => { setRatingFilter("Any Rating"); setLocationFilter("All Locations"); setPriceFilter("Any Price"); setSearchQuery(""); }}
            className="text-[11px] font-semibold transition-colors"
            style={{ color: "#6b7a6b" }}
          >
            Clear filters ({activeFilterCount})
          </button>}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ground name or area"
            className="w-full rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
          />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} />
          </button>}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
              <option>All Locations</option>
              {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#6b7a6b" }} />
          </div>
          <div className="relative flex-1">
            <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
              {["Any Price", "Under ₹500/hr", "₹500–₹1000/hr", "₹1000+/hr"].map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#6b7a6b" }} />
          </div>
          <div className="relative flex-1">
            <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
              {["Any Rating", "4.7+", "4.5+", "4.0+"].map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#6b7a6b" }} />
          </div>
        </div>
      </div>

      <GroundsMap
        grounds={filteredGrounds}
        canBookGround={canBookGround}
        displayPrice={displayPrice}
        displayLocation={displayLocation}
      />

      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#1a1a1a,#1a2a1a)", border: "1px solid rgba(22,101,52,0.4)", boxShadow: "0 8px 32px rgba(22,101,52,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
            <Hash className="w-3.5 h-3.5 text-green-400" />
          </div>
          <span className="font-semibold text-white text-sm">Auto Cost Split Calculator</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "#6b7a6b" }}>Ground cost (₹/hr)</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none font-mono transition-colors" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="1200" />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "#6b7a6b" }}>Split between</label>
            <div className="relative">
              <select value={split} onChange={e => setSplit(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm text-white appearance-none pr-8 focus:outline-none transition-colors" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
                {[11, 12, 14, 22].map(n => <option key={n} value={n}>{n} players</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#6b7a6b" }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3" style={{ backgroundColor: "#111", border: "1px solid rgba(22,101,52,0.3)" }}>
            <div className="text-xs mb-1" style={{ color: "#6b7a6b" }}>Per head</div>
            <div className="text-2xl font-bold text-green-400 font-mono">₹{perHead}</div>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: "#111", border: "1px solid rgba(22,101,52,0.3)" }}>
            <div className="text-xs mb-1" style={{ color: "#6b7a6b" }}>Total cost</div>
            <div className="text-2xl font-bold text-green-300 font-mono">₹{Number(cost || 0).toLocaleString()}</div>
          </div>
        </div>
        <button className="w-full py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors">
          Share Split Request
        </button>
      </div>

      <GroundForm token={token} onCreated={onGroundCreated} />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Available Grounds</h3>
          <span className="text-xs" style={{ color: "#6b7a6b" }}>
            {filteredGrounds.length} result{filteredGrounds.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} applied`}
          </span>
        </div>
        <div className="space-y-3">
          {filteredGrounds.length === 0 && <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>No grounds match your filters.</div>}
          {filteredGrounds.map(g => {
            const amenities = asArray(g.amenities);
            const tags = asArray(g.tags);
            const rating = Number(g.rating) || 0;
            const availableNow = canBookGround(g);
            return <div key={g.id ?? g.name} className={cn(C, "rounded-2xl p-4")}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(22,101,52,0.15)", border: "1px solid rgba(22,101,52,0.2)" }}>
                  <span className="text-2xl">🏟</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-white">{g.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" style={{ color: "#4a5a4a" }} />
                        <span className="text-xs" style={{ color: "#6b7a6b" }}>{displayLocation(g)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Tag color={availableNow ? "green" : "red"}>{availableNow ? "Available today" : "Booked today"}</Tag>
                        {isOwnedByMyTeam(g) && <Tag color="blue">Your team posted this</Tag>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-green-400 font-bold text-sm">{displayPrice(g)}</div>
                      {rating > 0 && <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs" style={{ color: "#6b7a6b" }}>{rating}</span>
                        </div>}
                    </div>
                  </div>
                  {amenities.length > 0 && <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {amenities.map((a, i) => <span key={a?.label ?? i} className="flex items-center gap-1 text-xs" style={{ color: "#6b7a6b" }}>
                          <span style={{ color: "#4a5a4a" }}>{a?.icon}</span>{a?.label}
                        </span>)}
                    </div>}
                  {tags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((t, i) => <Tag key={t?.label ?? i} color={t?.color}>{t?.label}</Tag>)}
                    </div>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button disabled={!availableNow} onClick={() => onBook(g)} className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors" style={availableNow ? { backgroundColor: "#22c55e", color: "#000" } : { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }}>
                  {availableNow ? "Book Now" : "Unavailable"}
                </button>
                <GhostButton className="flex-1 text-center" onClick={() => { setSelectedGround(g); setShowMap(false); }}>View Details</GhostButton>
                {isOwnedByMyTeam(g) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingGround(g)}
                      title="Edit Ground"
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-gray-300 hover:text-white bg-[#252525] hover:bg-[#333]"
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
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>;
          })}
        </div>
      </section>

      {selectedGround && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }} onClick={() => setSelectedGround(null)}>
          <div className="w-full max-w-2xl rounded-3xl p-5 relative animate-in fade-in zoom-in-95 duration-150" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button onClick={() => setShowMap(prev => !prev)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors" style={{ backgroundColor: showMap ? "#14532d" : "#1e211e", color: showMap ? "#bbf7d0" : "#8a978a", border: "1px solid #2a2a2a" }}>
                <Map className="w-3.5 h-3.5" />
                {showMap ? "Hide Map" : "View Map"}
              </button>
              <button onClick={() => setSelectedGround(null)} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: "#1e211e" }}>
                <X className="w-4 h-4" style={{ color: "#9ca39c" }} />
              </button>
            </div>

            <div className="pr-24">
              <div className="text-lg font-bold text-white">{selectedGround.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" style={{ color: "#22c55e" }} />
                <span className="text-sm" style={{ color: "#c8ccc8" }}>{displayLocation(selectedGround)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl p-4 space-y-3" style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e" }}>
              <div className="pb-3 border-b" style={{ borderColor: "#1e1e1e" }}>
                <div className="text-xs uppercase tracking-wide" style={{ color: "#6b7a6b" }}>Posted by</div>
                <div className="text-sm font-semibold text-white mt-1">{selectedGround.postedByName || "MatchConnect user"}</div>
                {selectedGround.postedByPhone ? <div className="text-xs mt-1 font-mono" style={{ color: "#6b7a6b" }}>{selectedGround.postedByPhone}</div> : <div className="text-xs mt-1" style={{ color: "#6b7a6b" }}>No posted phone number was saved.</div>}
              </div>
              <div className="pb-3 border-b" style={{ borderColor: "#1e1e1e" }}>
                <div className="text-xs uppercase tracking-wide" style={{ color: "#6b7a6b" }}>Availability</div>
                <div className="text-sm mt-1 text-white">
                  {selectedGround.availability_mode === "scheduled"
                    ? `${selectedGround.available_date || "Date TBD"} · ${selectedGround.available_time || "Time TBD"}`
                    : "Always available"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "#111", border: "1px solid rgba(34,197,94,0.18)" }}>
                  <div className="text-xs mb-1" style={{ color: "#6b7a6b" }}>Price</div>
                  <div className="text-base font-bold text-green-400">{displayPrice(selectedGround)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#111", border: "1px solid rgba(34,197,94,0.18)" }}>
                  <div className="text-xs mb-1" style={{ color: "#6b7a6b" }}>Rating</div>
                  <div className="text-base font-bold text-green-300">{selectedGround.rating || 0}</div>
                </div>
              </div>

              <div className="rounded-2xl p-3" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "#6b7a6b" }}>Today&apos;s bookings</div>
                {bookedTodaySlots(selectedGround).length > 0 ? <div className="flex flex-wrap gap-1.5">{bookedTodaySlots(selectedGround).map(slot => <Tag key={slot} color="amber">{slot}</Tag>)}</div> : <div className="text-xs" style={{ color: "#6b7a6b" }}>No bookings yet today.</div>}
                <div className="text-xs mt-2" style={{ color: "#4a5a4a" }}>
                  Remaining timings: {TIME_SLOTS.filter(slot => !bookedTodaySlots(selectedGround).includes(slot)).join(" · ") || "No slots left today"}
                </div>
              </div>

              {selectedGround.googleMapsUrl || displayLocation(selectedGround) ? <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
                  {showMap ? <iframe title="Ground map" src={buildGroundMapsEmbedUrl(selectedGround)} className="w-full h-72" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="p-4 text-sm text-center" style={{ color: "#6b7a6b" }}>Click View Map to open the ground on Google Maps.</div>}
                </div> : null}

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowMap(prev => !prev)} className="px-4 py-2 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-colors">{showMap ? "Hide Map" : "View Map"}</button>
                {isOwnedByMyTeam(selectedGround) && <button type="button" onClick={() => setEditingGround(selectedGround)} className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>}
                {buildGroundMapsLink(selectedGround) && <a href={buildGroundMapsLink(selectedGround)} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Maps
                  </a>}
                {isOwnedByMyTeam(selectedGround) && <button type="button" onClick={async () => {
                    if (!window.confirm("Delete this ground?")) return;
                    try {
                      await apiRequest(`/grounds/${selectedGround.id}`, { method: "DELETE", token });
                      onGroundDeleted?.(selectedGround.id);
                      setSelectedGround(null);
                    } catch (err) {
                      console.error(err.message || "Could not delete ground");
                    }
                  }} className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                    Delete
                  </button>}
              </div>
            </div>
          </div>
        </div>}

      {editingGround && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }} onClick={() => setEditingGround(null)}>
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
            />
          </div>
        </div>}
    </div>;
}

function UmpireForm({ user, token, onCreated, onUpdated, onDeleted, initialUmpire = null, onClose }) {
  
  console.log("UmpireForm received user:", user);
  const editing = !!initialUmpire;

  const buildForm = (ump, u) => ({
    name: ump?.name || u?.name || "",
    role: ump?.role || "Umpire",
    experience: ump?.experience !== undefined && ump?.experience !== null ? String(ump.experience) : "",
    fee_per_match: ump?.fee_per_match !== undefined && ump?.fee_per_match !== null
      ? String(ump.fee_per_match)
      : (ump?.price ? String(ump.price).replace(/[^0-9.]/g, "") : "")
  });

  const [open, setOpen] = useState(editing);
  const [form, setForm] = useState(() => buildForm(initialUmpire, user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const normalizedPhone = normalizePhone(user?.phone);

  // Re-sync whenever the umpire being edited changes, or the account's
  // name updates (e.g. profile edited elsewhere) — but never clobber the
  // person's fee/experience edits mid-form, and never touch the name once
  // they've started typing something different from the current default.
  useEffect(() => {
    setForm(prev => {
      const fresh = buildForm(initialUmpire, user);
      const prevDefaultName = initialUmpire?.name || user?.name || "";
      const nameWasUntouched = prev.name === prevDefaultName || prev.name === "";
      return {
        ...prev,
        name: nameWasUntouched ? fresh.name : prev.name,
        role: initialUmpire ? fresh.role : prev.role,
        experience: initialUmpire ? fresh.experience : prev.experience,
        fee_per_match: initialUmpire ? fresh.fee_per_match : prev.fee_per_match
      };
    });
    if (editing) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUmpire?.id, user?.name]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Name is required.");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return setError("Your account doesn't have a valid phone number on file. Please update your profile first.");
    }
    if (!form.fee_per_match || Number(form.fee_per_match) <= 0) return setError("Fee per match must be greater than 0.");
    if (form.experience !== "" && Number(form.experience) < 0) return setError("Experience can't be negative.");
    if (!token) return setError("You need to be logged in.");

    setSubmitting(true);
    try {
      const res = await apiRequest(editing ? `/umpires/${initialUmpire.id}` : "/umpires", {
        method: editing ? "PUT" : "POST",
        token,
        body: {
          name: form.name.trim(),
          mobile: normalizedPhone,      // always from the account, never from free-text input
          role: form.role,
          experience: Number(form.experience || 0),
          fee_per_match: Number(form.fee_per_match)
        }
      });
      if (editing) {
        onUpdated?.(res.umpire);
        onClose?.();
      } else {
        onCreated(res.umpire);
        setForm(buildForm(null, user));
        setOpen(false);
      }
    } catch (err) {
      setError(err.message || "Could not save — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !initialUmpire?.id || !token) return;
    if (!window.confirm("Are you sure you want to delete this umpire?")) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/umpires/${initialUmpire.id}`, { method: "DELETE", token });
      onDeleted?.(initialUmpire.id);
      onClose?.();
    } catch (err) {
      setError(err.message || "Could not delete umpire.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open && !editing) {
    return <button onClick={() => setOpen(true)} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px dashed #2a2a2a", color: "#22c55e" }}>
        <Plus className="w-4 h-4" /> Register as Umpire / Scorer
      </button>;
  }

  return <form onSubmit={handleSubmit} className={cn(C, "rounded-2xl p-4 space-y-3")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{editing ? "Edit Umpire / Scorer" : "Register as Umpire / Scorer"}</span>
        <button type="button" onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
          <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Full name</label>
          <input value={user?.name || form.name} readOnly onChange={e => update("name", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Rahul Desai" />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Mobile number</label>
          <input
            value={user?.phone || ""}
            readOnly
            className="w-full rounded-xl px-3 py-2 text-sm font-mono cursor-not-allowed"
            style={{ backgroundColor: "#151515", border: "1px solid #2a2a2a", color: "#6b7a6b" }}
          />
          <p className="text-xs mt-1" style={{ color: "#4a5a4a" }}>From your account. Update it in Edit Profile if it's wrong.</p>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Role</label>
          <div className="relative">
            <select value={form.role} onChange={e => update("role", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white appearance-none pr-7 focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
              {["Umpire", "Scorer", "Umpire + Scorer"].map(r => <option key={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6b7a6b" }} />
          </div>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Experience (years)</label>
          <input type="number" min="0" value={form.experience} onChange={e => update("experience", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="5" />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Fee per match (₹)</label>
          <input type="number" min="1" value={form.fee_per_match} onChange={e => update("fee_per_match", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="800" />
        </div>
      </div>

      {error && <div className="text-xs text-red-400 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

      <div className="flex gap-2">
        {editing && <button type="button" onClick={handleDelete} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors" style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
            Delete Umpire
          </button>}
        <button type="submit" disabled={submitting || !normalizedPhone} className="flex-1 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors" style={(submitting || !normalizedPhone) ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
          {submitting ? (editing ? "Saving..." : "Registering...") : (editing ? "Save Changes" : "Register")}
        </button>
      </div>
    </form>;
}

function UmpiresTab({ umpires, onBook, token, user, onCreated, onUpdated, onDeleted }) {
  
  console.log("UmpiresTab received user:", user);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [editingUmpire, setEditingUmpire] = useState(null);

  const userPhoneNorm = normalizePhone(user?.phone);
  console.log("userphone", user?.phone);
  const myUmpire = umpires.find(
    (u) => (u.user_id && user?.id && String(u.user_id) === String(user.id)) || (userPhoneNorm && normalizePhone(u.mobile) === userPhoneNorm)
  );

  const roleColor = (role) => {
    if (role === "Scorer") return { bg: "bg-blue-900", text: "text-blue-300" };
    if (role === "Umpire + Scorer") return { bg: "bg-yellow-900", text: "text-yellow-300" };
    return { bg: "bg-emerald-900", text: "text-emerald-300" }; // Umpire (default)
  };

  const roles = ["All", ...Array.from(new Set(umpires.map((u) => u.role || "Umpire"))).sort()];

  const priceNum = (u) => Number(String(u.price).replace(/[^0-9.]/g, "")) || 0;
  const expNum = (u) => Number(String(u.exp).replace(/[^0-9.]/g, "")) || 0;

  const filtered = umpires
    .filter((u) => (roleFilter === "All" ? true : (u.role || "Umpire") === roleFilter))
    .filter((u) => (query.trim() ? u.name?.toLowerCase().includes(query.trim().toLowerCase()) : true))
    .sort((a, b) => {
      if (sortBy === "price_low") return priceNum(a) - priceNum(b);
      if (sortBy === "price_high") return priceNum(b) - priceNum(a);
      if (sortBy === "exp_high") return expNum(b) - expNum(a);
      if (sortBy === "exp_low") return expNum(a) - expNum(b);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Umpires & Scorers
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Book experienced umpires and scorers for your cricket matches.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-[#171717] border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-green-400">
            {umpires.length}
          </div>
          <div className="text-xs text-gray-500">
            Available
          </div>
        </div>
      </div>

      {myUmpire ? (
        <div className="w-full p-4 rounded-2xl flex items-center justify-between gap-3" style={{ backgroundColor: "#151715", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-400 font-bold border border-green-500/20 shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                You are registered as {myUmpire.role || "Umpire"}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                {myUmpire.name} • 📞 {myUmpire.mobile} • ₹{myUmpire.price || myUmpire.fee_per_match || 0}/match
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingUmpire(myUmpire)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#252525] hover:bg-[#333] text-white flex items-center gap-1.5 transition-colors border border-[#333] shrink-0"
          >
            <Pencil className="w-3.5 h-3.5 text-green-400" /> Edit Registration
          </button>
        </div>
      ) : (
        <UmpireForm user={user} token={token} onCreated={onCreated} />
      )}

      {umpires.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center border border-dashed border-[#333]"
          style={{ background: "#151515" }}
        >
          <div className="text-5xl mb-3">🧑‍⚖️</div>

          <h3 className="text-white font-semibold text-lg">
            No Umpires Registered
          </h3>

          <p className="text-gray-500 mt-2">
            Register yourself as an umpire or scorer.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="flex-1 min-w-[160px] rounded-xl px-3 py-2 text-sm text-white bg-[#171717] border border-[#2a2a2a] focus:outline-none focus:border-green-500"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm text-white bg-[#171717] border border-[#2a2a2a] focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm text-white bg-[#171717] border border-[#2a2a2a] focus:outline-none"
            >
              <option value="default">Sort: default</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center border border-dashed border-[#333]"
              style={{ background: "#151515" }}
            >
              <p className="text-gray-500">No umpires match your filters.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
              {filtered.map((u) => {
                const role = u.role || "Umpire";
                const rc = roleColor(role);
                return (
                  <div
                    key={u.id ?? u.name}
                    className="flex items-center gap-4 px-4 py-3 bg-[#161616] hover:bg-[#1c1c1c] transition-colors"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: u.grad }}
                    >
                      {u.name?.split(" ").map((x) => x[0]).join("")}
                    </div>

                    <div className="min-w-[160px] flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{u.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${rc.bg} ${rc.text}`}>
                          {role}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            u.avail ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                          }`}
                        >
                          {u.avail ? "Available" : "Busy"}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:block text-xs text-gray-400 font-mono w-28 shrink-0">
                      📞 {u.mobile}
                    </div>

                    <div className="hidden sm:block text-xs text-gray-400 w-20 shrink-0">
                      🏏 {u.exp}
                    </div>

                    <div className="text-green-400 font-bold text-sm w-20 text-right shrink-0">
                      {u.price}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingUmpire(u)}
                        title="Edit Umpire"
                        className="p-2 rounded-xl text-xs font-bold transition-colors text-gray-300 hover:text-white bg-[#252525] hover:bg-[#333]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${u.name}?`)) return;
                          try {
                            await apiRequest(`/umpires/${u.id}`, { method: "DELETE", token });
                            onDeleted?.(u.id);
                          } catch (err) {
                            alert(err.message || "Could not delete umpire.");
                          }
                        }}
                        title="Delete Umpire"
                        className="p-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={!u.avail}
                        onClick={() => u.avail && onBook(u)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                          u.avail
                            ? "bg-green-500 hover:bg-green-400 text-black"
                            : "bg-[#252525] text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {u.avail ? "Book" : "Unavailable"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {editingUmpire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }} onClick={() => setEditingUmpire(null)}>
          <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <UmpireForm
              user={user}
              token={token}
              initialUmpire={editingUmpire}
              onUpdated={updated => {
                onUpdated?.(updated);
                setEditingUmpire(null);
              }}
              onDeleted={id => {
                onDeleted?.(id);
                setEditingUmpire(null);
              }}
              onClose={() => setEditingUmpire(null)}
            />
          </div>
        </div>
      )}

      {/* ─── New Rules (dummy/static for now — wire up to a real backend later) ─── */}
      <div className="pt-2">
        <h3 className="text-lg font-bold text-white mb-3">📋 New Rules</h3>
        <div className="rounded-2xl overflow-hidden border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
          {[
            {
              title: "New DRS review limit for T20 leagues",
              desc: "Teams now get 2 unsuccessful reviews per innings instead of 1, effective this season.",
              date: "Jul 2026"
            },
            {
              title: "Front-foot no-ball tech mandatory",
              desc: "Local tournaments must use the automated no-ball detection line where available.",
              date: "Jun 2026"
            },
            {
              title: "Concussion substitute rule updated",
              desc: "A like-for-like concussion substitute can now be used without match referee pre-approval.",
              date: "Jun 2026"
            }
          ].map((r, i) => (
            <div key={i} className="px-4 py-3 bg-[#161616]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{r.title}</span>
                <span className="text-[10px] text-gray-500 shrink-0">{r.date}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mt-2">Sample updates — real rule feed coming soon.</p>
      </div>
    </div>
  );
}

// ─── LIVE SCORE ───────────────────────────────────────────────────────────────

/* Assumes `cn`, `C` (card class string), `Tag`, and `GhostButton` are already
   available in this file's scope, exactly as in the original — only the
   tournament-card / details / tab pieces below have changed. */
// import { useState, useEffect } from "react";

/* Assumes `cn`, `C` (card class string), `Tag`, and `GhostButton` are already
   available in this file's scope, exactly as in the original — only the
   tournament-card / details / tab pieces below have changed. */

const STATUS_META = {
  registering: { label: "Registering", color: "green" },
  ongoing: { label: "Ongoing", color: "amber" },
  completed: { label: "Completed", color: "blue" },
  cancelled: { label: "Cancelled", color: "red" },
};
function statusMeta(status) {
  return STATUS_META[status] || { label: status || "Unknown", color: "blue" };
}
function formatMoney(n) {
  if (n === null || n === undefined || n === "") return "-";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function TeamsRemainingBadge({ spotsLeft, maxTeams }) {
  return (
    <Tag color={spotsLeft === 0 ? "red" : "amber"}>
      {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`} · {maxTeams ?? 0} teams
    </Tag>
  );
}

function PrizesSummary({ prizes }) {
  if (!Array.isArray(prizes) || prizes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {prizes.map((p) => (
        <div
          key={p.position}
          className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
          style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#c8ccc8" }}
        >
          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium text-white">#{p.position}</span>
          <span>{formatMoney(p.money)}</span>
          {p.trophy && <span className="text-amber-400">+ trophy</span>}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Centered details modal (replaces the old inline expand panel)          */
/* ---------------------------------------------------------------------- */

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#6b7a6b" }} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide" style={{ color: "#4a5a4a" }}>
          {label}
        </div>
        <div className="text-sm text-white truncate">{value}</div>
      </div>
    </div>
  );
}

function TournamentDetailsModal({ t, onClose, isMine, roleLabel, registered, onRegister, onEdit, onDelete, token }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const maxTeams = t.max_teams ?? 0;
  const teamCount = t.team_count ?? 0;
  const spotsLeft = t.spots_left ?? Math.max(maxTeams - teamCount, 0);
  const full = spotsLeft === 0;
  const canRegister = t.status === "registering" && !full && !registered && !isMine;
  const meta = statusMeta(t.status);

  const dotColor = {
    green: "#22c55e",
    amber: "#f59e0b",
    blue: "#3b82f6",
    red: "#ef4444",
  }[meta.color];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
        style={{
          backgroundColor: "#0d0f0d",
          border: "1px solid #2a2a2a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 pt-5 pb-4 flex items-start justify-between gap-3"
          style={{ backgroundColor: "#0d0f0d", borderBottom: "1px solid #1c1f1c" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${dotColor}1a`, color: dotColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                {meta.label}
              </span>
              {t.format && <Tag color="blue">{t.format} Format</Tag>}
              {isMine && <Tag color="green">{roleLabel}</Tag>}
            </div>
            <h2 className="text-xl font-bold text-white leading-snug truncate">{t.name}</h2>
            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "#6b7a6b" }}>
              <Trophy className="w-3 h-3" /> {t.creator_team_name || "Unknown organizer"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "#6b7a6b" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1c1f1c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid #1c1f1c" }}
          >
            <DetailRow icon={MapPin} label="Venue" value={t.venue || "TBD"} />
            <DetailRow icon={CalendarDays} label="Starts" value={t.startDate || "TBD"} />
            <DetailRow icon={Users} label="Teams" value={`${teamCount} / ${maxTeams} confirmed`} />
            <DetailRow icon={DollarSign} label="Entry fee" value={formatMoney(t.entry_fee)} />
            <DetailRow icon={Phone} label="Contact" value={t.phone || "-"} />
            <DetailRow icon={Phone} label="Co-contact" value={t.co_phone || "-"} />
          </div>

          {Array.isArray(t.prizes) && t.prizes.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Prizes
              </div>
              <PrizesSummary prizes={t.prizes} />
            </div>
          )}

          {t.description && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} /> Description
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#c8ccc8" }}>
                {t.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="sticky bottom-0 px-6 py-4 flex gap-3"
          style={{ backgroundColor: "#0d0f0d", borderTop: "1px solid #1c1f1c" }}
        >
          <GhostButton onClick={onClose} className="flex-1 text-center">
            Close
          </GhostButton>

          {isMine && roleLabel === "Organizing" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit?.(t);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors bg-[#1c1f1c] hover:bg-[#252825] text-white border border-[#2a2a2a]"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to delete this tournament?")) return;
                  try {
                    await apiRequest(`/tournaments/${t.id}`, { method: "DELETE", token });
                    onDelete?.(t.id);
                    onClose();
                  } catch (err) {
                    alert(err.message || "Failed to delete tournament");
                  }
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}

          {isMine ? (
            <span className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1.5"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle className="w-3.5 h-3.5" /> {roleLabel}
            </span>
          ) : registered ? (
            <span className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1.5"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle className="w-3.5 h-3.5" /> Registered
            </span>
          ) : (
            <button
              onClick={() => {
                onRegister(t.id);
                onClose();
              }}
              disabled={!canRegister}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors text-green-400 hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              {full ? "Full" : t.status !== "registering" ? meta.label : "Register"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Card                                                                    */
/* ---------------------------------------------------------------------- */

function TournamentCard({ t, isMine, roleLabel, registered, onRegister, onView, onEdit, onDelete, token }) {
  const spotsLeft = t.spots_left ?? Math.max((t.max_teams || 0) - (t.team_count || 0), 0);
  const full = spotsLeft === 0;
  const canRegister = t.status === "registering" && !full && !registered && !isMine;

  return (
    <div
      className={cn(C, "rounded-2xl p-4 transition-all duration-200 hover:border-[#3a3a3a]")}
      style={
        isMine
          ? {
              border: "1px solid rgba(34,197,94,0.35)",
              background: "linear-gradient(135deg, rgba(22,101,52,0.12), rgba(13,15,13,0.4))",
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">{t.name}</span>
            {isMine && <Tag color="green">{roleLabel}</Tag>}
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#6b7a6b" }}>
            <Trophy className="w-3 h-3" /> {t.creator_team_name || "Unknown organizer"}
          </div>
        </div>
        <Tag color={statusMeta(t.status).color}>{statusMeta(t.status).label}</Tag>
      </div>

      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "#c8ccc8" }}>
        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {t.startDate || "TBA"}</span>
        <span style={{ color: "#3a3a3a" }}>·</span>
        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {t.venue || "TBD"}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {t.format && <Tag color="blue">{t.format} Format</Tag>}
        <TeamsRemainingBadge spotsLeft={spotsLeft} maxTeams={t.max_teams} />
      </div>

      <div className="flex gap-2">
        {isMine ? (
          <div className="flex-1 flex gap-1.5">
            <span
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> {roleLabel}
            </span>
            {roleLabel === "Organizing" && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit?.(t)}
                  title="Edit Tournament"
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-gray-300 hover:text-white bg-[#252525] hover:bg-[#333]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Delete this tournament?")) return;
                    try {
                      await apiRequest(`/tournaments/${t.id}`, { method: "DELETE", token });
                      onDelete?.(t.id);
                    } catch (err) {
                      alert(err.message || "Could not delete tournament");
                    }
                  }}
                  title="Delete Tournament"
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ) : registered ? (
          <span
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Registered
          </span>
        ) : (
          <button
            onClick={() => onRegister(t.id)}
            disabled={!canRegister}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors text-green-400 hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            {full ? "Full" : t.status !== "registering" ? statusMeta(t.status).label : "Register"}
          </button>
        )}
        <GhostButton onClick={onView} className="flex-1 text-center">
          View Tournament
        </GhostButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Tab                                                                     */
/* ---------------------------------------------------------------------- */

function TournamentsTab({ registeredIds, onRegister, tournaments, token, currentUser, myTeamId, onTournamentCreated, onTournamentUpdated, onTournamentDeleted }) {
  const [viewingId, setViewingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  const allTournaments = tournaments || [];
  const isMine = (t) => t.creator_team_id === myTeamId || registeredIds.includes(t.id);
  const myTournaments = allTournaments.filter(isMine);
  const otherTournaments = allTournaments.filter((t) => !isMine(t));
  const viewingTournament = allTournaments.find((t) => t.id === viewingId) || null;

  const handleCreated = (tournament) => {
    setShowCreateForm(false);
    onTournamentCreated?.(tournament);
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Your Tournaments</h3>
          {myTournaments.length > 0 && (
            <span className="text-xs" style={{ color: "#6b7a6b" }}>
              {myTournaments.length} active
            </span>
          )}
        </div>
        {myTournaments.length === 0 ? (
          <div className={cn(C, "rounded-2xl p-6 text-center text-sm")} style={{ color: "#4a5a4a" }}>
            You haven't organized or registered for any tournament yet.
          </div>
        ) : (
          <div className="space-y-3">
            {myTournaments.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                isMine
                roleLabel={t.creator_team_id === myTeamId ? "Organizing" : "Registered"}
                registered={registeredIds.includes(t.id)}
                onRegister={onRegister}
                onView={() => setViewingId(t.id)}
                onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)}
                token={token}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">All Tournaments</h3>
          <span className="text-xs" style={{ color: "#6b7a6b" }}>
            {otherTournaments.length} available
          </span>
        </div>
        {otherTournaments.length === 0 ? (
          <div className={cn(C, "rounded-2xl p-6 text-center text-sm")} style={{ color: "#4a5a4a" }}>
            No other tournaments yet.
          </div>
        ) : (
          <div className="space-y-3">
            {otherTournaments.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                isMine={false}
                registered={registeredIds.includes(t.id)}
                onRegister={onRegister}
                onView={() => setViewingId(t.id)}
                onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)}
                token={token}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div
          className={cn(C, "rounded-2xl p-5 flex items-center justify-between gap-4")}
          style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(13,15,13,0.4))" }}
        >
          <div>
            <div className="text-sm font-medium text-white">Ready to run your own tournament?</div>
            <div className="text-xs mt-1" style={{ color: "#6b7a6b" }}>
              Set the team count, entry fee, prizes and publish in one step.
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-5 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors shrink-0"
          >
            + Create Tournament
          </button>
        </div>
      </section>

      {viewingTournament && (
        <TournamentDetailsModal
          t={viewingTournament}
          onClose={() => setViewingId(null)}
          isMine={isMine(viewingTournament)}
          roleLabel={viewingTournament.creator_team_id === myTeamId ? "Organizing" : "Registered"}
          registered={registeredIds.includes(viewingTournament.id)}
          onRegister={onRegister}
          onEdit={(item) => setEditingTournament(item)}
          onDelete={(id) => onTournamentDeleted?.(id)}
          token={token}
        />
      )}

      {showCreateForm && (
        <CreateTournamentForm
          token={token}
          user={currentUser}
          tournaments={allTournaments}
          onClose={() => setShowCreateForm(false)}
          onCreated={handleCreated}
        />
      )}

      {editingTournament && (
        <CreateTournamentForm
          token={token}
          user={currentUser}
          tournaments={allTournaments}
          initialTournament={editingTournament}
          onClose={() => setEditingTournament(null)}
          onUpdated={(updated) => {
            onTournamentUpdated?.(updated);
            setEditingTournament(null);
          }}
          onDeleted={(id) => {
            onTournamentDeleted?.(id);
            setEditingTournament(null);
          }}
        />
      )}
    </div>
  );
}

// ─── MY TEAM ──────────────────────────────────────────────────────────────────
function ReputationRow({ label, stars, status }) {
  return <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <span className="text-sm" style={{ color: "#c8ccc8" }}>{label}</span>
      {stars !== undefined ? <StarRow count={stars} /> : <span className="text-sm font-semibold text-green-400">{status}</span>}
    </div>;
}

// ─── Squad section ──────────────────────────────────────────────────────────
function SquadSection({ token, currentUserId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("You need to be logged in to view your squad.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest("/users/teammates", { token });
        if (cancelled) return;
        setTeam(data.team);
        setMembers(data.members || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your squad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>Loading squad...</div>;
  if (error) return <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>{error}</div>;

  if (!team) {
    return (
      <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
        <div className="text-4xl mb-3 opacity-60">🧑‍🤝‍🧑</div>
        <div className="text-sm font-semibold text-white">No squad yet</div>
        <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: "#6b7a6b" }}>
          Add your team name, village and the year formed in Edit Profile — anyone with the same three values is grouped with you automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}>
        <div className="text-sm font-semibold text-white">{team.team_name}</div>
        <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{team.village_name} · Formed {team.team_year}</div>
        <div className="text-xs mt-1" style={{ color: "#4a5a4a" }}>{members.length} member{members.length !== 1 ? "s" : ""}</div>
      </div>
      <div className="rounded-2xl overflow-hidden border divide-y" style={{ borderColor: "#2a2a2a" }}>
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#161616" }}>
            <div className="w-9 h-9 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-xs font-bold shrink-0">
              {m.name?.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-white truncate flex items-center gap-1.5">
                {m.name}
                {m.id === currentUserId && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}>You</span>
                )}
              </div>
              <div className="text-xs font-mono" style={{ color: "#6b7a6b" }}>{m.phone}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyTeamTab({
  acceptedChallenge,
  registeredTournaments,
  bookings,
  onCancelChallenge,
  onDeleteChallenge,
  cancelling,
  deleting,
  onOpenChat,
  challenges = [],
  teammatePhones = [],
  teammateIds = [],
  user,
  token,
}) {
  const [activeSection, setActiveSection] = useState("bookings");
  const myPhone = normalizePhone(user?.phone);

  const teamPhoneSet = new Set([myPhone, ...teammatePhones].filter(Boolean));
  const teamIdSet = new Set(
    [user?.id, ...teammateIds]
      .filter(id => id !== undefined && id !== null)
      .map(id => Number(id))
  );

  const hasTeamIdentity = teamIdSet.size > 0 || teamPhoneSet.size > 0;

  // Stricter match: when a challenge carries BOTH creator_id and contact_no,
  // require both to line up with your team. This avoids a false-positive
  // match slipping through on a shared/duplicate creator_id or phone alone
  // (e.g. from a different real team that happens to share your team_name +
  // village + year, which is how /users/teammates groups people).
  const isTeamCreator = c => {
    const hasId = c.creator_id !== undefined && c.creator_id !== null;
    const hasPhone = !!c.contact_no;

    if (hasId && hasPhone && teamIdSet.size && teamPhoneSet.size) {
      return teamIdSet.has(Number(c.creator_id)) && teamPhoneSet.has(normalizePhone(c.contact_no));
    }
    if (hasId && teamIdSet.size) {
      return teamIdSet.has(Number(c.creator_id));
    }
    if (hasPhone && teamPhoneSet.size) {
      return teamPhoneSet.has(normalizePhone(c.contact_no));
    }
    return false;
  };

  const isTeamAcceptor = c => {
    const hasId = c.accepted_by_user_id !== undefined && c.accepted_by_user_id !== null;
    const hasPhone = !!c.accepted_by_contact_no;

    if (hasId && hasPhone && teamIdSet.size && teamPhoneSet.size) {
      return teamIdSet.has(Number(c.accepted_by_user_id)) && teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no));
    }
    if (hasId && teamIdSet.size) {
      return teamIdSet.has(Number(c.accepted_by_user_id));
    }
    if (hasPhone && teamPhoneSet.size) {
      return teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no));
    }
    return false;
  };

  // ── Category 1: Posted Challenges ──────────────────────────────────────
  // Only show a challenge here if it was created by a confirmed teammate
  // AND it's still actually "open" (not on_hold / accepted / anything else).
  const postedChallenges = hasTeamIdentity
    ? challenges.filter(c => isTeamCreator(c) && c.status === "open")
    : [];

  // ── Category 2: Accepted Challenges ────────────────────────────────────
  const acceptedChallenges = hasTeamIdentity
    ? challenges.filter(c => c.status === "accepted" && (isTeamCreator(c) || isTeamAcceptor(c)))
    : [];

  const acceptedChallengesFinal = acceptedChallenges.length
    ? acceptedChallenges
    : (acceptedChallenge ? [acceptedChallenge] : []);

  const scheduleCount = postedChallenges.length + acceptedChallengesFinal.length + registeredTournaments.length;

  
  return <div className="space-y-6">
      <div className="flex gap-2">
        {[
          { key: "bookings", label: "My Bookings", icon: CalendarCheck },
          { key: "squad", label: "Squad", icon: Users },
          { key: "schedule", label: "Schedule", icon: Calendar }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeSection === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveSection(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-all"
              style={isActive
                ? { backgroundColor: "#22c55e", color: "#000", boxShadow: "0 2px 10px rgba(34,197,94,0.35)" }
                : { backgroundColor: "#151715", color: "#c8ccc8", border: "1px solid #2a2a2a" }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeSection === "bookings" && bookings.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="w-4 h-4 text-green-400" />
            <h3 className="text-base font-semibold text-white">My Bookings</h3>
          </div>
          <div className="space-y-2">
            {bookings.map(b => (
              <div key={b.id} className={cn(C, "rounded-xl p-3 flex items-center justify-between gap-3")}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    {b.type === "ground" ? <MapPin className="w-4 h-4 text-green-400" /> : <Shield className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{b.name}</div>
                    <div className="text-xs" style={{ color: "#6b7a6b" }}>{b.date} · {b.time}</div>
                  </div>
                </div>
                <div className="text-sm font-mono text-green-400 shrink-0">₹{b.amount}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "bookings" && bookings.length === 0 && (
        <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
          <div className="text-4xl mb-3 opacity-60">🎟️</div>
          <div className="text-sm font-semibold text-white">No bookings yet</div>
          <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: "#6b7a6b" }}>
            Book a ground or an umpire and it'll show up here.
          </p>
        </div>
      )}

      {activeSection === "squad" && <SquadSection token={token} currentUserId={user?.id} />}

      {activeSection === "schedule" && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-400" />
              <h3 className="text-base font-semibold text-white">Schedule</h3>
            </div>
            {scheduleCount > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                {scheduleCount} upcoming
              </span>
            )}
          </div>

          {postedChallenges.length === 0 && acceptedChallengesFinal.length === 0 && registeredTournaments.length === 0 && (
            <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
              <div className="text-4xl mb-3 opacity-60">🗓️</div>
              <div className="text-sm font-semibold text-white">Nothing on the calendar yet</div>
              <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: "#6b7a6b" }}>
                Post or accept a challenge in Find Match, or register your team for a tournament, to see it here.
              </p>
            </div>
          )}

          {/* ═════════ Two-card layout: Posted Challenges & Accepted Challenges ═════════ */}
          <div className="space-y-4">
            {/* Card 1: Posted Challenges */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#151715", border: "1px solid rgba(56,189,248,0.22)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <Megaphone className="w-3.5 h-3.5 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8fa08f" }}>Posted Challenges</h4>
                {postedChallenges.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                    {postedChallenges.length}
                  </span>
                )}
              </div>

              {postedChallenges.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: "#6b7a6b" }}>No posted challenges yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
                  {postedChallenges.map(pc => (
                    <div key={pc.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{pc.team_name}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>
                            {pc.match_date} · {pc.time_slot}
                          </div>
                        </div>
                        <Tag color="sky">{pc.status === "on_hold" ? "On Hold" : "Awaiting Opponent"}</Tag>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <Tag color="blue">{pc.format}</Tag>
                        <span className="text-xs flex items-center gap-1" style={{ color: "#6b7a6b" }}>
                          <MapPin className="w-3 h-3" style={{ color: "#4a5a4a" }} />
                          {pc.ground_name || "Ground TBD"}
                        </span>
                      </div>

                      {pc.note && (
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: "#8fa08f" }}>{pc.note}</p>
                      )}

                      <button
                        disabled={deleting}
                        onClick={() => onDeleteChallenge?.(pc.id)}
                        className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                        style={deleting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                      >
                        <XCircle className="w-3.5 h-3.5" /> {deleting ? "Withdrawing..." : "Withdraw Challenge"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 2: Accepted Challenges */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#151715", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8fa08f" }}>Accepted Challenges</h4>
                {acceptedChallengesFinal.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                    {acceptedChallengesFinal.length}
                  </span>
                )}
              </div>

              {acceptedChallengesFinal.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: "#6b7a6b" }}>No accepted challenges yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
                  {acceptedChallengesFinal.map(ac => {
                    const iAmCreator = isTeamCreator(ac);
                    const opponentName = iAmCreator ? ac.accepted_by_team_name : ac.team_name;
                    return (
                      <div key={ac.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">vs {opponentName}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>
                              {ac.match_date} · {ac.time_slot}
                            </div>
                          </div>
                          <Tag color="amber">Confirmed</Tag>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Tag color="blue">{ac.format}</Tag>
                          <span className="text-xs flex items-center gap-1" style={{ color: "#6b7a6b" }}>
                            <MapPin className="w-3 h-3" style={{ color: "#4a5a4a" }} />
                            {ac.ground_name || "Ground TBD"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <a href={`tel:${ac.contact_no}`} className="rounded-xl p-2.5 flex items-center gap-2 transition-colors hover:bg-white/5" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                            <Phone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs truncate" style={{ color: "#6b7a6b" }}>{ac.team_name}</div>
                              <div className="text-xs font-mono text-white">{ac.contact_no}</div>
                            </div>
                          </a>
                          <a href={`tel:${ac.accepted_by_contact_no}`} className="rounded-xl p-2.5 flex items-center gap-2 transition-colors hover:bg-white/5" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                            <Phone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs truncate" style={{ color: "#6b7a6b" }}>{ac.accepted_by_team_name}</div>
                              <div className="text-xs font-mono text-white">{ac.accepted_by_contact_no}</div>
                            </div>
                          </a>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => onOpenChat(ac)} className="flex-1 py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-1.5">
                            💬 Chat
                          </button>
                          <button disabled={cancelling} onClick={() => onCancelChallenge(ac.id)} className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5" style={cancelling ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
                            <XCircle className="w-3.5 h-3.5" /> {cancelling ? "Cancelling..." : "Cancel Match"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═════════ Tournaments (unchanged) ═════════ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-3.5 h-3.5 text-green-400" />
              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8fa08f" }}>
                Tournaments
              </h4>
              {registeredTournaments.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                  {registeredTournaments.length}
                </span>
              )}
            </div>

            {registeredTournaments.length === 0 ? (
              <div className="rounded-xl p-4 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
                <p className="text-xs" style={{ color: "#6b7a6b" }}>No tournament registrations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {registeredTournaments.map(t => (
                  <div key={t.id} className={cn(C, "rounded-2xl p-4 flex items-center gap-3")}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <Trophy className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "#6b7a6b" }}>
                        Starts {t.startDate} · {t.format} · 📍 {t.venue}
                      </div>
                    </div>
                    <Tag color="green">Registered</Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>;
}




// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  useForceDark();
  const [activeTab, setActiveTab] = useState("Home");
  const [autoOpenChallengeForm, setAutoOpenChallengeForm] = useState(false);
  const [findMatchEntryMode, setFindMatchEntryMode] = useState("browse");
  const goCreateChallenge = () => {
    setActiveTab("Find Match");
    setAutoOpenChallengeForm(true);
    setFindMatchEntryMode("create");
  };
  const handleNavTabClick = tab => {
    setFindMatchEntryMode("browse");
    setActiveTab(tab);
  };
  const [teammates, setTeammates] = useState({ phones: [], ids: [] });
  const [acceptedChallenge, setAcceptedChallenge] = useState(null);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingModal, setBookingModal] = useState(null); // { type, item }
   const [cancellingChallenge, setCancellingChallenge] = useState(false); // ← add
  const [chatChallenge, setChatChallenge] = useState(null);  
  const [auth, setAuth] = useState({ token: null, user: null });
  const [authChecked, setAuthChecked] = useState(false); // have we finished trying to restore a session?
  const [backendStatus, setBackendStatus] = useState("connecting"); // connecting | online | offline
  const [challenges, setChallenges] = useState([]);
  const [grounds, setGrounds] = useState(GROUNDS.map(g => ({ ...g }))); // fallback until API loads
  const [umpires, setUmpires] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [tournaments, setTournaments] = useState([]);

  const [pushNotifications, setPushNotifications] = useState([]);

  const resetMatch = window.location.pathname.match(/^\/reset-password\/(.+)$/);
  const resetToken = resetMatch ? resetMatch[1] : null;

  const registeredTournaments = tournaments.filter(t => registeredIds.includes(t.id));


  function transformTournament(t) {
  if (!t) return null;

  // prizes may arrive as a JSON string (from the jsonb column) or already parsed
  let prizes = t.prizes;
  if (typeof prizes === "string") {
    try { prizes = JSON.parse(prizes); } catch { prizes = []; }
  }

  const maxTeams = t.max_teams ?? 0;
  const teamCount = t.team_count ?? 0;

  return {
    ...t,
    startDate: t.start_date ?? t.startDate ?? null, // normalize snake_case -> camelCase
    prizes: Array.isArray(prizes) ? prizes : [],
    max_teams: maxTeams,
    team_count: teamCount,
    spots_left: t.spots_left ?? Math.max(maxTeams - teamCount, 0),
  };
}

  const loadTeammates = async (token) => {
    try {
      const res = await apiRequest("/users/teammates", { token });
      const members = res.members || [];
      setTeammates({
        phones: members.map(m => m.phone).filter(Boolean),
        ids: members.map(m => m.id).filter(Boolean)
      });
    } catch (err) {
      console.warn("Could not load teammates:", err.message);
    }
  };

  // FIXED: moved inside App() so these close over the component's own
  // setMyTeam / setRegisteredIds / setTournaments — they used to live at
  // module scope with a stray top-level useState(), which crashed the app
  // with "Invalid hook call" / "Cannot read properties of null (reading
  // 'useState')" since hooks can only run inside a function component.
  const loadMyTeamAndRegistrations = async (token) => {
    try {
      const teamRes = await apiRequest("/teams/mine", { token });
      const team = teamRes.team || null;
      setMyTeam(team);
      if (team) {
        const res = await apiRequest(`/tournaments/mine/${team.id}`, { token });
        setRegisteredIds((res.tournaments || []).map(t => t.id));
      }
    } catch (err) {
      console.warn("Could not load team/tournament registrations:", err.message);
    }
  };

  const refreshTournaments = async () => {
    try {
      const res = await apiRequest("/tournaments");
      setTournaments(res.tournaments.map(transformTournament));
    } catch (err) {
      console.warn("Could not refresh tournaments:", err.message);
    }
  };

  const loadAppData = async (token, user) => {
    try {
      const [groundsRes, umpiresRes, tournamentsRes, challengesRes] = await Promise.all([
        apiRequest("/grounds"),
        apiRequest("/umpires"),
        apiRequest("/tournaments"),
        apiRequest("/challenges",{token})
      ]);
      setGrounds(groundsRes.grounds.map(transformGround));
      setUmpires(umpiresRes.umpires.map(transformUmpire));
      setTournaments(tournamentsRes.tournaments.map(transformTournament));

      const allChallenges = challengesRes.challenges || [];
      setChallenges(allChallenges);

      const myPhone = normalizePhone(user?.phone);
      const myActive = myPhone
        ? allChallenges.find(
            c =>
              c.status === "accepted" &&
              (normalizePhone(c.contact_no) === myPhone ||
                normalizePhone(c.accepted_by_contact_no) === myPhone)
          )
        : null;
      setAcceptedChallenge(myActive || null);

      setBackendStatus("online");
      loadMyTeamAndRegistrations(token);
      refreshBookings(token);
      loadTeammates(token);
    } catch (err) {
      console.warn("Backend unavailable, using demo data:", err.message);
      setBackendStatus("offline");
    }
  };

  const refreshBookings = async token => {
    try {
      const res = await apiRequest("/bookings/mine", { token });
      setBookings(res.bookings.map(transformBooking));
    } catch {
      // non-fatal — keep whatever bookings we already have in memory
    }
  };

  const registerPushNotifications = async (token) => {
    try {
      console.log("Starting FCM registration...");

      const fcmToken = await requestNotificationPermission();

      console.log("Generated FCM Token:", fcmToken);

      if (!fcmToken) {
        console.log("No FCM token generated");
        return;
      }

      const response = await apiRequest("/notifications/save-token", {
        method: "POST",
        token,
        body: { token: fcmToken },
      });

      console.log("Save token response:", response);
    } catch (err) {
      console.error("FCM Registration Error:", err);
    }
  };

  useEffect(() => {
    if (!auth.token) return;
    const interval = setInterval(() => {
      refreshTournaments();
    }, 8000);
    return () => clearInterval(interval);
  }, [auth.token]);

  useEffect(() => {
    let unsubscribe;
    (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return; // unsupported browser (e.g. no service worker support)
      unsubscribe = onMessage(messaging, payload => {
        setPushNotifications(prev => [
          {
            id: Date.now(),
            title: payload?.notification?.title || "MatchConnect",
            body: payload?.notification?.body || ""
          },
          ...prev
        ]);
      });
    })();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (resetToken) {
      setAuthChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = getStoredToken();
      if (!token) {
        setAuthChecked(true);
        return;
      }
      try {
        const { user } = await apiRequest("/auth/me", { token });
        if (cancelled) return;
        setAuth({ token, user });
        loadAppData(token, user);
        registerPushNotifications(token);
      } catch {
        setStoredToken(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthSuccess = (user, token) => {
    setStoredToken(token);
    setAuth({ token, user });
    loadAppData(token, user);
    registerPushNotifications(token);
  };

  const handleLogout = async () => {
    try {
      if (auth.token) {
        await apiRequest("/notifications/clear-token", { method: "POST", token: auth.token });
      }
    } catch (err) {
      console.warn("Could not clear FCM token on logout:", err.message);
    }
    setStoredToken(null);
    setAuth({ token: null, user: null });
    setBookings([]);
    setTeammates({ phones: [], ids: [] });
    setActiveTab("Home");
  };

  const handleChallengeAccepted = (updatedChallenge) => {
    setChallenges(prev => prev.map(c => c.id === updatedChallenge.id ? updatedChallenge : c));
    setAcceptedChallenge(updatedChallenge);
  };

  const handleCancelAcceptedChallenge = async () => {
    if (!acceptedChallenge || !auth.token) return;
    setCancellingChallenge(true);
    try {
      const res = await apiRequest(`/challenges/${acceptedChallenge.id}/cancel`, { method: "POST", token: auth.token });
      setChallenges(prev => prev.map(c => c.id === res.challenge.id ? res.challenge : c));
      setAcceptedChallenge(null);
    } catch (err) {
      console.error("Could not cancel challenge:", err.message);
    } finally {
      setCancellingChallenge(false);
    }
  };

  const handleRegisterTournament = async (tournamentId) => {
    if (!auth.token) return;
    if (!myTeam) {
      alert("You need a registered team before joining a tournament. Add your team details in Edit Profile first.");
      return;
    }
    try {
      const res = await apiRequest(`/tournaments/${tournamentId}/register`, {
        method: "POST",
        token: auth.token,
        body: { team_id: myTeam.id },
      });
      setRegisteredIds(prev => (prev.includes(tournamentId) ? prev : [...prev, tournamentId]));
      if (res.tournament) {
        setTournaments(prev => prev.map(t => (t.id === tournamentId ? transformTournament(res.tournament) : t)));
      } else {
        refreshTournaments();
      }
    } catch (err) {
      alert(err.message || "Could not register for this tournament.");
    }
  };
  const handleUmpireCreated = raw => setUmpires(prev => [transformUmpire(raw, prev.length), ...prev]);
  const handleUmpireUpdated = raw => {
    const t = transformUmpire(raw);
    setUmpires(prev => prev.map(u => u.id === t.id ? { ...u, ...t } : u));
  };
  const handleUmpireDeleted = id => {
    setUmpires(prev => prev.filter(u => u.id !== id));
  };

  const handleTournamentCreated = (newTournament) => {
    setTournaments(prev => [transformTournament(newTournament), ...prev]);
  };
  const handleTournamentUpdated = (updated) => {
    const t = transformTournament(updated);
    setTournaments(prev => prev.map(x => x.id === t.id ? t : x));
  };
  const handleTournamentDeleted = (id) => {
    setTournaments(prev => prev.filter(x => x.id !== id));
  };

  const handleGroundCreated = (newGround) => {
    setGrounds(prev => [transformGround(newGround), ...prev]);
  };

  const handleGroundUpdated = (updatedGround) => {
    const t = transformGround(updatedGround);
    setGrounds(prev => prev.map(g => g.id === t.id ? t : g));
  };

  const handleGroundDeleted = (id) => {
    setGrounds(prev => prev.filter(g => g.id !== id));
  };

  const handleChallengeCreated = (newChallenge) => {
    setChallenges(prev => [newChallenge, ...prev]);
  };

  const handleChallengeDeleted = (id) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  if (resetToken) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} resetToken={resetToken} initialMode="reset" />;
  }

  if (!authChecked) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#0d0f0d" }} />;
  }

  if (!auth.user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const content = {
    "Home": <HomeTab
      setActiveTab={setActiveTab}
      grounds={grounds}
      tournaments={tournaments}
      challenges={challenges.filter(c => c.status === "open").map(normalizeChallenge)}
      allChallenges={challenges}
      onCreateChallenge={goCreateChallenge}
    />,
    "Find Match": <FindMatchTab
  acceptedChallenge={acceptedChallenge}
  onChallengeAccepted={handleChallengeAccepted}
  token={auth.token}
  user={auth.user}
  challenges={challenges}
  onChallengeCreated={handleChallengeCreated}
  onChallengeDeleted={handleChallengeDeleted}
  teammatePhones={teammates.phones}  
  teammateIds={teammates.ids}         
  autoOpenForm={autoOpenChallengeForm}
  onAutoOpenHandled={() => setAutoOpenChallengeForm(false)}
  entryMode={findMatchEntryMode}
/>,
    "Grounds": <GroundsTab
      grounds={grounds}
      token={auth.token}
      user={auth.user}
      teammateIds={teammates.ids}
      onGroundCreated={handleGroundCreated}
      onGroundUpdated={handleGroundUpdated}
      onGroundDeleted={handleGroundDeleted}
      onBook={g => setBookingModal({ type: "ground", item: g })}
    />,
    "Umpires": <UmpiresTab
      umpires={umpires}
      user={auth.user}
      token={auth.token}
      onCreated={handleUmpireCreated}
      onUpdated={handleUmpireUpdated}
      onDeleted={handleUmpireDeleted}
      onBook={u => setBookingModal({ type: "umpire", item: u })}
    />,
    "Live Score": <LiveScoreTab/>,
    "Tournaments": <TournamentsTab
      tournaments={tournaments}
      registeredIds={registeredIds}
      onRegister={handleRegisterTournament}
      token={auth.token}
      currentUser={auth.user}
      myTeamId={myTeam?.id}
      onTournamentCreated={handleTournamentCreated}
      onTournamentUpdated={handleTournamentUpdated}
      onTournamentDeleted={handleTournamentDeleted}
    />,
    "My Team": <MyTeamTab
  acceptedChallenge={acceptedChallenge}
  registeredTournaments={registeredTournaments}
  bookings={bookings}
  onCancelChallenge={handleCancelAcceptedChallenge}
  cancelling={cancellingChallenge}
  onOpenChat={setChatChallenge}
  challenges={challenges}
  teammatePhones={teammates.phones}
  teammateIds={teammates.ids}
  user={auth.user}
  token={auth.token}   // ← add this
/>
  };

  return <div style={{ minHeight: "100vh", backgroundColor: "#0d0f0d", fontFamily: "Inter, sans-serif" }}>
      <Navbar
        active={activeTab}
        setActive={handleNavTabClick}
        user={auth.user}
        onLogout={handleLogout}
        token={auth.token}
        pushCount={pushNotifications.length}
        onUserUpdated={updatedUser => {
          setAuth(prev => ({ ...prev, user: updatedUser }));
          if (auth.token) loadTeammates(auth.token);
        }}
      />
      {backendStatus === "offline" && <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="rounded-xl px-3 py-2 text-xs text-amber-400 flex items-center gap-2" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Backend not reachable at localhost:8000 — showing demo data. Bookings won't save until the server is running.
          </div>
        </div>}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {content[activeTab]}
      </main>
      {bookingModal && <BookingModal type={bookingModal.type} item={bookingModal.item} token={auth.token} onClose={() => setBookingModal(null)} onConfirm={handleBookingConfirm} />}
      {chatChallenge && (
        <ChatModal
          challenge={{
            ...chatChallenge,
            myTeamName: chatChallenge.creator_id === auth.user.id ? chatChallenge.team_name : chatChallenge.accepted_by_team_name
          }}
          token={auth.token}
          onClose={() => setChatChallenge(null)}
        />
      )}
      </div>;
}