import { useState, useEffect } from "react";
import { Bell, Search, MapPin, ChevronDown, Phone, Star, CheckCircle, Car, Droplets, Wind, Hash, Plus, Filter, Shield, Swords, Trophy, AlertCircle, CheckCheck, Clock, XCircle, Calendar, Users, X, CreditCard, CalendarCheck, LogOut, Pencil,ExternalLink, Map } from "lucide-react";
import AuthScreen from "./components/Auth/AuthScreen.jsx";
import { apiRequest, getStoredToken, setStoredToken } from "./api";
import LiveScoreTab from "./components/LiveScoreTab";
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

const STATUS_COLOR = { Registering: "blue", Ongoing: "green", Finals: "amber", Completed: "blue" };
function transformTournament(t) {
  const startDate = t.start_date ? new Date(t.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBA";
  return { ...t, statusColor: STATUS_COLOR[t.status] || "blue", teams: t.teams_count, matches: t.matches_count, completed: t.completed_count, startDate };
}

function transformBooking(b) {
  return {
    id: b.id,
    type: b.booking_type,
    name: b.booking_type === "ground" ? b.ground_name : b.umpire_name,
    date: b.booking_date ? new Date(b.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "",
    time: b.time_slot,
    amount: Number(b.total_amount)
  };
}

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
// to this demo data only while the backend is unreachable.
const FORMATS = [
  { key: "T20", emoji: "⚡", title: "T20 Match", desc: "20 overs per side, fast-paced" },
  { key: "ODI", emoji: "🏏", title: "ODI Format", desc: "50 overs, balanced game" },
  { key: "Test", emoji: "🎯", title: "Test Match", desc: "Multi-day, traditional format" },
  { key: "Box", emoji: "🔥", title: "Box Cricket", desc: "Short format, indoor/outdoor" }
];

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

const LEAGUES = [
  { id: "l1", name: "Bandra T20 Cup", status: "Ongoing", statusColor: "green", teams: 16, matches: 24, completed: 18, prize: "₹15,000", startDate: "Jul 8, 2026", format: "T20", venue: "Bandra Recreation Ground" },
  { id: "l2", name: "Corporate Cricket Bash", status: "Registering", statusColor: "blue", teams: 8, matches: 14, completed: 0, prize: "Trophy", startDate: "Jul 25, 2026", format: "T20", venue: "Cross Maidan" },
  { id: "l3", name: "Monsoon Mavericks", status: "Finals", statusColor: "amber", teams: 12, matches: 22, completed: 20, prize: "₹25,000", startDate: "Already underway", format: "ODI", venue: "Oval Maidan" }
];

const FEATURED_TOURNAMENT = { id: "featured", name: "Mumbai Premier Cricket League", status: "Registering", statusColor: "blue", teams: 24, matches: 48, completed: 0, prize: "₹50,000", startDate: "Aug 15, 2026", format: "T20", venue: "Multiple venues" };

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
function HomeTab({ setActiveTab, grounds = GROUNDS, challenges = ALL_CHALLENGES, tournaments = [FEATURED_TOURNAMENT, ...LEAGUES] }) {
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
          </div>
        </div>
        <div className="absolute right-6 bottom-4 text-7xl opacity-20 select-none">🏏</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
        { label: "Matches Played", value: "47", color: "#22c55e", icon: "🏏", sub: "+3 this week" },
        { label: "Active Teams", value: "312", color: "#3b82f6", icon: "👥", sub: "In Mumbai" },
        { label: "Active Grounds", value: String(grounds.length + 18), color: "#f97316", icon: "🏟", sub: "Bookable now" },
        { label: "Active Tournaments", value: String(tournaments.length), color: "#a855f7", icon: "🏆", sub: "Open or ongoing" }
      ].map(s => <div key={s.label} className={cn(C, "rounded-2xl p-4")}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{s.label}</div>
            <div className="text-xs mt-1" style={{ color: "#4a5a4a" }}>{s.sub}</div>
          </div>)}
      </div>

      {/* Urgent match requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Urgent Match Requests</h2>
          <button onClick={() => setActiveTab("Find Match")} className="text-xs text-green-400 hover:text-green-300">View all →</button>
        </div>
        <div className="space-y-3">
          {challenges.filter(c => c.urgent).map(req => <div key={req.id} className={cn(C, "rounded-2xl p-4")}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                      {req.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{req.team}</div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs" style={{ color: "#6b7a6b" }}>{req.rating} · W{req.wins}/L{req.losses}</span>
                      </div>
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
                <Tag color="amber">⚡ Urgent</Tag>
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
function ChallengeForm({ token, user, onCreated, disabledReason, grounds = [] }) {
  const emptyForm = {
    team_name: "",
    format: "T20",
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

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

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
    return <button onClick={() => setOpen(true)} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px dashed #2a2a2a", color: "#22c55e" }}>
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
            <select value={form.format} onChange={e => update("format", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white appearance-none pr-7 focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
              {FORMATS.map(f => <option key={f.key} value={f.key}>{f.title}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6b7a6b" }} />
          </div>
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
  const [teamName, setTeamName] = useState("");
  // Pulled straight from the logged-in account — not editable, so it always
  // matches what "My Team" later uses to recognize this as your match.
  const contact = user?.phone || "";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!teamName.trim()) return setError("Your team name is required.");
    if (!/^[0-9]{10,15}$/.test(contact.trim())) {
      return setError("Your account doesn't have a valid phone number on file. Please update your profile first.");
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

function FindMatchTab({
  acceptedChallenge,
  onChallengeAccepted,
  token,
  user, 
  challenges = [],
  onChallengeCreated,
  onChallengeDeleted,
  teammatePhones = []
}) {
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [dateFilter, setDateFilter] = useState(null); // ISO date string ("YYYY-MM-DD") or null for "Any Date"
  const [timeFilter, setTimeFilter] = useState(""); // exact time_slot value chosen by the user, "" = Any Time
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null); // challenge currently shown in the "View Details" modal

  const normalize = c => ({
    id: c.id,
    team: c.team_name,
    contact_no: c.contact_no,
    postedBy: c.posted_by_name || c.creator_name || null, // name of the person who posted, when the backend provides it
    postedAt: c.created_at || null,                        // when the challenge was posted
    format: c.format,
    date: formatDateIST(c.match_date),   // displayed in IST
    rawDate: c.match_date,               // raw value kept for filter comparisons
    time: c.time_slot,                   // stored as "HH:MM" (24-hr) from ChallengeForm
    ground: c.ground_name || (c.ground_id ? "Ground booked" : "Not booked yet"),
    note: c.note || "",
    urgent: !!c.urgent,
    rating: 0,
    wins: 0,
    losses: 0
  });

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

  const postDisabledReason = acceptedChallenge || myTeamAcceptedChallenge
    ? "You've already got a confirmed match — cancel it in My Team to post a new challenge"
    : myOpenChallenge
    ? (normalizePhone(myOpenChallenge.contact_no) === myPhone
        ? "You already have an open challenge waiting — cancel it before posting another"
        : "Your team already has an open challenge posted — cancel it before posting another")
    : null;

  const activeFilterCount = [dateFilter, timeFilter || null].filter(Boolean).length;

  const myOwnOpenChallenge = challenges.find(
    c => (c.status === "open" || c.status === "on_hold") && c.creator_id === user?.id
  );

  return <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Find a Match</h2>
        <p className="text-sm mt-1" style={{ color: "#6b7a6b" }}>Select your preferred format and get matched instantly</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      <div className={cn(C, "rounded-2xl p-4")}>
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

      <ChallengeForm token={token} user={user} onCreated={onChallengeCreated} disabledReason={postDisabledReason} />

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
          {hasActive && <span className="text-xs text-amber-400">You've got an active challenge — cancel it in My Team to accept another</span>}
        </div>
        <div className="space-y-3">
          {filtered.length === 0 && <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>No challenges match your filters right now.</div>}
          {filtered.map(t => {
            const blocked = hasActive;
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
          disabled={hasActive}
          onClick={() => { setAcceptTarget(detailsTarget); setDetailsTarget(null); }}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
          style={hasActive
            ? { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }
            : { backgroundColor: "#22c55e", color: "#000" }}
          onMouseEnter={e => !hasActive && (e.currentTarget.style.backgroundColor = "#4ade80")}
          onMouseLeave={e => !hasActive && (e.currentTarget.style.backgroundColor = "#22c55e")}
        >
          {hasActive ? "Unavailable" : "Accept Challenge"}
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

// ─── UMPIRES & SCORERS ──────────────────────────────────────────────────────────
// Live data only: the list comes straight from GET /api/umpires (loaded in App
// and passed down as `umpires`). There is no dummy fallback here anymore — if
// the backend is offline or the table is empty, the tab shows an empty state
// instead of silently displaying fake officials. The form below posts to
// POST /api/umpires (auth required) so a real record gets created and shows
// up immediately in the list.

function UmpireForm({ token, onCreated }) {
  const emptyForm = {
    name: "",
    mobile: "",
    role: "Umpire",
    experience: "",
    fee_per_match: ""
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Name is required.");
    if (!/^[0-9]{10,15}$/.test(form.mobile.trim())) return setError("Enter a valid mobile number (10-15 digits).");
    if (!form.fee_per_match || Number(form.fee_per_match) <= 0) return setError("Fee per match must be greater than 0.");
    if (form.experience !== "" &&
    Number(form.experience) < 0) return setError("Experience can't be negative.");
    if (!token) return setError("You need to be logged in to register as an umpire or scorer.");

    setSubmitting(true);
    try {
      const res = await apiRequest("/umpires", {
        method: "POST",
        token,
        body: {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          role: form.role,
          experience: Number(form.experience || 0),
          fee_per_match: Number(form.fee_per_match)
        }
      });
      onCreated(res.umpire);
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not register — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return <button onClick={() => setOpen(true)} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px dashed #2a2a2a", color: "#22c55e" }}>
        <Plus className="w-4 h-4" /> Register as Umpire / Scorer
      </button>;
  }

  return <form onSubmit={handleSubmit} className={cn(C, "rounded-2xl p-4 space-y-3")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Register as Umpire / Scorer</span>
        <button type="button" onClick={() => { setOpen(false); setError(null); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
          <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Full name</label>
          <input value={form.name} onChange={e => update("name", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Rahul Desai" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Mobile number</label>
          <input value={form.mobile} onChange={e => update("mobile", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="9876543210" />
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

      <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors" style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
        {submitting ? "Registering..." : "Register"}
      </button>
    </form>;
}

function UmpiresTab({ umpires, onBook, token, onCreated }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("default");

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

      <UmpireForm token={token} onCreated={onCreated} />

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
              {/* <option value="exp_high">Experience: most first</option>
              <option value="exp_low">Experience: least first</option>
              <option value="name">Name: A to Z</option> */}
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── LIVE SCORE ───────────────────────────────────────────────────────────────


// ─── TOURNAMENTS ──────────────────────────────────────────────────────────────
function TournamentsTab({ registeredIds, onRegister, tournaments }) {
  const [expandedId, setExpandedId] = useState(null);
  const [completedSteps] = useState([0, 1]);
  const steps = ["Set tournament name & format", "Configure teams & brackets", "Set schedule & venue", "Add prize details (optional)", "Publish & invite teams"];

  const allTournaments = tournaments && tournaments.length ? tournaments : [FEATURED_TOURNAMENT, ...LEAGUES];
  const FEATURED_TOURNAMENT_LOCAL = allTournaments.find(t => t.featured) || allTournaments[0];
  const LEAGUES_LOCAL = allTournaments.filter(t => t.id !== FEATURED_TOURNAMENT_LOCAL.id);
  const registered = allTournaments.filter(t => registeredIds.includes(t.id));

  const toggleExpand = id => setExpandedId(prev => prev === id ? null : id);

  return <div className="space-y-8">
      {/* Featured banner */}
      <div className="relative rounded-2xl overflow-hidden p-6" style={{ background: "linear-gradient(135deg,#166534,rgba(22,101,52,0.5) 50%,#0d0f0d)", border: "1px solid rgba(22,101,52,0.3)" }}>
        <Tag color="amber">🏆 Featured</Tag>
        <h2 className="text-xl font-bold text-white mt-3">{FEATURED_TOURNAMENT_LOCAL.name}</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(187,247,208,0.7)" }}>Season 3 · {FEATURED_TOURNAMENT_LOCAL.teams} teams · {FEATURED_TOURNAMENT_LOCAL.prize} prize pool</p>
        <div className="flex items-center gap-3 text-xs mt-2 mb-4" style={{ color: "#c8ccc8" }}>
          <span>📅 Starts {FEATURED_TOURNAMENT_LOCAL.startDate}</span>
          <span>·</span>
          <span>📍 {FEATURED_TOURNAMENT_LOCAL.venue}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          <Tag color="green">{FEATURED_TOURNAMENT_LOCAL.format} Format</Tag>
          <Tag color="blue">Open Registration</Tag>
          <Tag color="amber">12 spots left</Tag>
        </div>
        <div className="flex flex-wrap gap-3">
          {registeredIds.includes(FEATURED_TOURNAMENT_LOCAL.id) ? <span className="px-8 py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 font-bold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Registered
            </span> : <button onClick={() => onRegister(FEATURED_TOURNAMENT_LOCAL.id)} className="px-8 py-3 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors">
              Register Your Team →
            </button>}
          <GhostButton onClick={() => toggleExpand(FEATURED_TOURNAMENT_LOCAL.id)} className="px-6">
            {expandedId === FEATURED_TOURNAMENT_LOCAL.id ? "Hide Details" : "View Tournament"}
          </GhostButton>
        </div>
        {expandedId === FEATURED_TOURNAMENT_LOCAL.id && <div className="mt-4 rounded-xl p-4 text-xs space-y-1" style={{ backgroundColor: "rgba(13,15,13,0.5)", color: "#c8ccc8" }}>
            <div>Format: {FEATURED_TOURNAMENT_LOCAL.format} · Venue: {FEATURED_TOURNAMENT_LOCAL.venue}</div>
            <div>Matches scheduled: {FEATURED_TOURNAMENT_LOCAL.matches} · Prize pool: {FEATURED_TOURNAMENT_LOCAL.prize}</div>
            <div>Teams confirmed: {FEATURED_TOURNAMENT_LOCAL.teams}</div>
          </div>}
      </div>

      {/* Active leagues */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Active Leagues</h3>
          <button className="text-xs text-green-400">Browse all →</button>
        </div>
        <div className="space-y-3">
          {LEAGUES_LOCAL.map(l => <div key={l.id} className={cn(C, "rounded-2xl p-4")}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="font-semibold text-white text-sm">{l.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>Prize: {l.prize}</div>
                </div>
                <Tag color={l.statusColor}>{l.status}</Tag>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                {[{ val: l.teams, label: "Teams", color: "#22c55e" }, { val: l.matches, label: "Matches", color: "#3b82f6" }, { val: l.completed, label: "Done", color: "#f59e0b" }].map(stat => <div key={stat.label} className="rounded-xl py-2" style={{ backgroundColor: "#222", border: "1px solid #2a2a2a" }}>
                    <div className="font-bold text-sm font-mono" style={{ color: stat.color }}>{stat.val}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#4a5a4a" }}>{stat.label}</div>
                  </div>)}
              </div>
              <div className="flex gap-2">
                {registeredIds.includes(l.id) ? <span className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Registered
                  </span> : <button onClick={() => onRegister(l.id)} className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors text-green-400 hover:opacity-80" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    Register
                  </button>}
                <GhostButton onClick={() => toggleExpand(l.id)} className="flex-1 text-center">
                  {expandedId === l.id ? "Hide Details" : "View Tournament"}
                </GhostButton>
              </div>
              {expandedId === l.id && <div className="mt-3 rounded-xl p-3 text-xs space-y-1" style={{ backgroundColor: "#111", color: "#c8ccc8", border: "1px solid #2a2a2a" }}>
                  <div>Format: {l.format} · Venue: {l.venue}</div>
                  <div>Starts: {l.startDate}</div>
                </div>}
            </div>)}
        </div>
      </section>

      {/* Registered tournaments */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">Your Registered Tournaments</h3>
        {registered.length === 0 ? <div className={cn(C, "rounded-2xl p-6 text-center text-sm")} style={{ color: "#4a5a4a" }}>
            You haven't registered for any tournaments yet.
          </div> : <div className="space-y-2">
            {registered.map(t => <div key={t.id} className={cn(C, "rounded-2xl p-3 flex items-center gap-3")}>
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs" style={{ color: "#6b7a6b" }}>Starts {t.startDate} · {t.format}</div>
                </div>
                <Tag color="green">Registered</Tag>
              </div>)}
          </div>}
      </section>

      {/* Create tournament steps */}
      <section>
        <h3 className="text-base font-semibold text-white mb-4">Create a Tournament</h3>
        <div className={cn(C, "rounded-2xl p-5")}>
          {steps.map((step, i) => {
          const done = completedSteps.includes(i);
          const active = i === completedSteps.length;
          return <div key={step} className="flex items-start gap-4 relative">
                {i < steps.length - 1 && <div className="absolute w-0.5 z-0" style={{ left: 15, top: 32, height: "calc(100% - 16px)", backgroundColor: done ? "rgba(34,197,94,0.4)" : "#2a2a2a" }} />}
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 mt-0.5 text-xs font-bold" style={{ backgroundColor: done ? "#22c55e" : "#0d0f0d", border: done ? "2px solid #22c55e" : active ? "2px solid #22c55e" : "2px solid #2a2a2a", color: done ? "#000" : active ? "#22c55e" : "#4a5a4a" }}>
                  {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <div className={cn("flex-1", i < steps.length - 1 ? "pb-5" : "pb-0")}>
                  <div className="text-sm font-medium" style={{ color: done ? "#4a5a4a" : active ? "#fff" : "#4a5a4a", textDecoration: done ? "line-through" : "none" }}>{step}</div>
                  {active && <button className="mt-2 px-4 py-1.5 rounded-lg bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors">Start →</button>}
                </div>
              </div>;
        })}
        </div>
      </section>
    </div>;
}

// ─── MY TEAM ──────────────────────────────────────────────────────────────────
function ReputationRow({ label, stars, status }) {
  return <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <span className="text-sm" style={{ color: "#c8ccc8" }}>{label}</span>
      {stars !== undefined ? <StarRow count={stars} /> : <span className="text-sm font-semibold text-green-400">{status}</span>}
    </div>;
}





// ─── Squad section ──────────────────────────────────────────────────────────
// Any user who registers (or later edits their profile) with the same
// team_name + village_name + team_year as you is automatically your
// teammate. This section shows the shared team name up top and every
// member's name listed underneath — no phone numbers here, those only
// unlock once a challenge is accepted (see the section below).
function SquadSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest("/users/teammates");
        if (cancelled) return;
        setTeam(data.team);
        setMembers(data.members || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your squad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-green-400" />
        <h3 className="text-base font-semibold text-white">Squad</h3>
      </div>

      {loading && (
        <div className="rounded-2xl p-5 text-center text-xs" style={{ backgroundColor: "#131413", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
          Loading squad...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl p-5 text-center text-xs" style={{ backgroundColor: "#131413", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}

      {!loading && !error && !team && (
        <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
          <div className="text-4xl mb-3 opacity-60">🛡️</div>
          <div className="text-sm font-semibold text-white">No squad yet</div>
          <p className="text-xs mt-1.5 max-w-[28ch] mx-auto" style={{ color: "#6b7a6b" }}>
            Add your team name, village and the year your team was formed in Edit Profile to be grouped with your teammates.
          </p>
        </div>
      )}

      {!loading && !error && team && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}>
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{team.team_name}</div>
              <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#6b7a6b" }}>
                <MapPin className="w-3 h-3" style={{ color: "#4a5a4a" }} />
                {team.village_name} · Est. {team.team_year}
              </div>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: "#2a2a2a" }}>
            {members.map(m => (
              <div key={m.id} className="px-4 py-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                  {m.name?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-xs text-white">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MyTeamTab({
  acceptedChallenge,
  registeredTournaments,
  bookings,
  onCancelChallenge,
  cancelling,
  onOpenChat,
  challenges = [],
  teammatePhones = [],
  teammateIds = [],
  user,
}) {
  const myPhone = normalizePhone(user?.phone);

  // Every phone number on my own team — me plus each teammate pulled from
  // /users/teammates. Same construction FindMatchTab uses, so both screens
  // agree on who counts as "my team."
  const teamPhoneSet = new Set([myPhone, ...teammatePhones].filter(Boolean));

  // Every user id on my own team — me plus each teammate id. This is the
  // reliable way to check "did anyone on my team accept/post this," since
  // challenge rows carry creator_id/accepted_by_user_id straight from the
  // DB, whereas phone matching can miss on formatting differences.
  // IDs are coerced to Number so a string/number mismatch between the auth
  // payload (e.g. JWT claims serialized as strings) and DB rows (numeric)
  // can't silently break Set membership checks below.
  const teamIdSet = new Set(
    [user?.id, ...teammateIds]
      .filter(id => id !== undefined && id !== null)
      .map(id => Number(id))
  );

  // Resolve the team's accepted match straight from the shared challenges
  // list first — this is what makes an accept done by ANY teammate show up
  // here for EVERY teammate immediately, rather than only for whichever
  // teammate's own session happens to carry the acceptedChallenge prop.
  // Checks user ids first (reliable), falls back to phone number matching
  // for older challenge rows or callers that don't pass teammateIds yet.
  const teamAcceptedFromList = (teamIdSet.size || teamPhoneSet.size)
    ? challenges.find(c => {
        if (c.status !== "accepted") return false;
        const idMatch =
          teamIdSet.size &&
          (teamIdSet.has(Number(c.creator_id)) || teamIdSet.has(Number(c.accepted_by_user_id)));
        const phoneMatch =
          teamPhoneSet.size &&
          (teamPhoneSet.has(normalizePhone(c.contact_no)) ||
            teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no)));
        return idMatch || phoneMatch;
      })
    : null;

  const displayedChallenge = teamAcceptedFromList || acceptedChallenge;

  const scheduleCount = (displayedChallenge ? 1 : 0) + registeredTournaments.length;

  return <div className="space-y-6">
      {/* ...unchanged Team header + Stats + My Bookings above... */}

      <SquadSection />

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-400" />
            <h3 className="text-base font-semibold text-white">Schedule</h3>
          </div>
          {scheduleCount > 0 && <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
              {scheduleCount} upcoming
            </span>}
        </div>

        <div className="space-y-3">
          {!displayedChallenge && registeredTournaments.length === 0 && <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
              <div className="text-4xl mb-3 opacity-60">🗓️</div>
              <div className="text-sm font-semibold text-white">Nothing on the calendar yet</div>
              <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: "#6b7a6b" }}>
                Accept a challenge in Find Match, or register your team for a tournament, to see it here.
              </p>
            </div>}

          {displayedChallenge && <div className="rounded-2xl overflow-hidden relative" style={{ backgroundColor: "#151715", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg,#f59e0b,#b45309)" }} />
              <div className="p-4 pl-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                      <Swords className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">vs {displayedChallenge.team_name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>
                        {displayedChallenge.match_date} · {displayedChallenge.time_slot}
                      </div>
                    </div>
                  </div>
                  <Tag color="amber">Confirmed</Tag>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <Tag color="blue">{displayedChallenge.format}</Tag>
                  <span className="text-xs flex items-center gap-1" style={{ color: "#6b7a6b" }}>
                    <MapPin className="w-3 h-3" style={{ color: "#4a5a4a" }} />
                    {displayedChallenge.ground_name || "Ground TBD"}
                  </span>
                </div>

                {/* Phone numbers — only revealed now that both sides have agreed to play */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <a href={`tel:${displayedChallenge.contact_no}`} className="rounded-xl p-2.5 flex items-center gap-2 transition-colors hover:bg-white/5" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                    <Phone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs truncate" style={{ color: "#6b7a6b" }}>{displayedChallenge.team_name}</div>
                      <div className="text-xs font-mono text-white">{displayedChallenge.contact_no}</div>
                    </div>
                  </a>
                  <a href={`tel:${displayedChallenge.accepted_by_contact_no}`} className="rounded-xl p-2.5 flex items-center gap-2 transition-colors hover:bg-white/5" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                    <Phone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs truncate" style={{ color: "#6b7a6b" }}>{displayedChallenge.accepted_by_team_name}</div>
                      <div className="text-xs font-mono text-white">{displayedChallenge.accepted_by_contact_no}</div>
                    </div>
                  </a>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => onOpenChat(displayedChallenge)} className="flex-1 py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-1.5">
                    💬 Chat
                  </button>
                  <button disabled={cancelling} onClick={() => onCancelChallenge(displayedChallenge.id)} className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5" style={cancelling ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
                    <XCircle className="w-3.5 h-3.5" /> {cancelling ? "Cancelling..." : "Cancel Match"}
                  </button>
                </div>
              </div>
            </div>}

          {registeredTournaments.map(t => <div key={t.id} className={cn(C, "rounded-2xl p-4 flex items-center gap-3")}>
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
            </div>)}
        </div>
      </section>

      {/* ...unchanged Reputation scores + Notifications below... */}
    </div>;
}




// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  useForceDark();
  const [activeTab, setActiveTab] = useState("Home");
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
  // Umpires: live data only, no dummy fallback — starts empty and is filled
  // from GET /api/umpires once the backend responds (see loadAppData below).
  const [umpires, setUmpires] = useState([]);
  const [tournaments, setTournaments] = useState([FEATURED_TOURNAMENT, ...LEAGUES]);

  // Push notifications: FCM messages received while the app is in the
  // foreground get pushed into this list and surface as the red dot on the
  // navbar's bell icon. Backgrounded/closed-tab pushes are handled by
  // public/firebase-messaging-sw.js instead.
  const [pushNotifications, setPushNotifications] = useState([]);

  // A reset-password email link points at /reset-password/<token> — catch that
  // before anything else so the person lands straight on the reset form, even
  // if they're already logged in on this browser (e.g. testing your own flow,
  // or a stale session sitting around). Reset links always take priority.
  const resetMatch = window.location.pathname.match(/^\/reset-password\/(.+)$/);
  const resetToken = resetMatch ? resetMatch[1] : null;

  const registeredTournaments = tournaments.filter(t => registeredIds.includes(t.id));


const loadTeammates = async (token) => {
  try {
    const res = await apiRequest("/users/teammates", { token });
    const members = res.members || [];
    setTeammates({
      phones: members.map(m => m.phone).filter(Boolean),
      ids: members.map(m => m.id).filter(Boolean)
    });
  } catch (err) {
    // non-fatal — team-wide match visibility just won't work until this loads
    console.warn("Could not load teammates:", err.message);
  }
};

const loadAppData = async (token, user) => {
  try {
    const [groundsRes, umpiresRes, tournamentsRes, challengesRes] = await Promise.all([
      apiRequest("/grounds"),
      apiRequest("/umpires"),
      apiRequest("/tournaments"),
      apiRequest("/challenges")
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
    refreshBookings(token);
    loadTeammates(token); // ← add this
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

  // Ask the browser for notification permission, grab the FCM registration
  // token, and hand it to the backend so pushes can be targeted at this
  // user/device. Safe to call repeatedly — if permission was already
  // granted, requestNotificationPermission just resolves with the same
  // token again instead of re-prompting.
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

  // Listen for foreground FCM messages for the lifetime of the app (not
  // tied to auth state, since Firebase itself gates delivery by token).
  // Incoming pushes are appended to pushNotifications, which lights up the
  // bell icon in the navbar.
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

  // Try to restore a session from a previously stored token on first load.
  // Skipped entirely when a reset-password link brought us here — we don't
  // want a valid session silently hiding the reset form.
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
      loadAppData(token, user); // ← pass user through
      registerPushNotifications(token); // ← ask for push permission + save FCM token
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
  loadAppData(token, user); // ← pass user through
  registerPushNotifications(token); // ← ask for push permission + save FCM token
};
  

  const handleLogout = async () => {
  // Best-effort: tell the backend to stop targeting this device with pushes.
  // Non-fatal if it fails — we still want the local logout to proceed.
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
  setTeammates({ phones: [], ids: [] }); // ← add this
  setActiveTab("Home");
};

  // Called after AcceptChallengeModal successfully hits POST /challenges/:id/accept
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
  const handleRegister = id => setRegisteredIds(prev => prev.includes(id) ? prev : [...prev, id]);
  const handleBookingConfirm = () => { if (auth.token) refreshBookings(auth.token); };
  // A freshly created umpire/scorer (from the form in UmpiresTab) is added to
  // the front of the live list right away, so the person sees it without
  // needing a manual refresh or a second round-trip to the backend.
  const handleUmpireCreated = raw => setUmpires(prev => [transformUmpire(raw, prev.length), ...prev]);

//   const handleGroundCreated = (newGround) => {
//   setGrounds(prev => [newGround, ...prev]);
// };


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

  // Reset-password link takes priority over everything else, including an
  // already-authenticated session. Render it immediately — no need to wait
  // on authChecked since we skip the session-restore fetch above anyway.
  if (resetToken) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} resetToken={resetToken} initialMode="reset" />;
  }

  // Still resolving whether a stored session is valid — avoid a flash of the login screen.
  if (!authChecked) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#0d0f0d" }} />;
  }

  // Not logged in: show the auth screen, nothing else in the app renders until this succeeds.
  if (!auth.user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const content = {
  "Home": <HomeTab setActiveTab={setActiveTab} grounds={grounds} tournaments={tournaments} />,
  "Find Match": <FindMatchTab
  acceptedChallenge={acceptedChallenge}
  onChallengeAccepted={handleChallengeAccepted}
  token={auth.token}
  user={auth.user}
  challenges={challenges}
  onChallengeCreated={handleChallengeCreated}
  onChallengeDeleted={handleChallengeDeleted}
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
    token={auth.token}
    onCreated={handleUmpireCreated}
    onBook={u => setBookingModal({ type: "umpire", item: u })}
  />,
  "Live Score": <LiveScoreTab/>,
  "Tournaments": <TournamentsTab tournaments={tournaments} registeredIds={registeredIds} onRegister={handleRegister} />,
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
/>
};

  return <div style={{ minHeight: "100vh", backgroundColor: "#0d0f0d", fontFamily: "Inter, sans-serif" }}>
      <Navbar
  active={activeTab}
  setActive={setActiveTab}
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