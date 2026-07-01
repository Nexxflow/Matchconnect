import { useState, useEffect } from "react";
import { Bell, MapPin, ChevronDown, Star, CheckCircle, Car, Droplets, Wind, Hash, Plus, Filter, Shield, Swords, Trophy, AlertCircle, CheckCheck, Clock, XCircle, Calendar, Users, X, CreditCard, CalendarCheck } from "lucide-react";

// ─── API layer ──────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api";

async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// Demo account so bookings/challenges work without building a full login UI yet.
// Swap this out once you add real signup/login screens.
const DEMO_USER = { name: "Rahul Kapoor", email: "demo@matchconnect.app", password: "matchconnect_demo_123" };

async function ensureDemoAuth() {
  try {
    const { user, token } = await apiRequest("/auth/login", { method: "POST", body: DEMO_USER });
    return { user, token };
  } catch {
    // Not registered yet — sign up, then we already get a token back
    const { user, token } = await apiRequest("/auth/signup", { method: "POST", body: DEMO_USER });
    return { user, token };
  }
}

// ─── Backend → frontend shape transformers ─────────────────────────────────
const AMENITY_ICON = {
  Water: <Droplets className="w-3 h-3" />, Showers: <Droplets className="w-3 h-3" />,
  Parking: <Car className="w-3 h-3" />, "Open Air": <Wind className="w-3 h-3" />
};
const TAG_COLOR = { Floodlights: "blue", Heritage: "amber", Popular: "amber", Budget: "green" };

function transformGround(g) {
  const amenities = (g.amenities || []).map(label => ({ icon: AMENITY_ICON[label] || <Droplets className="w-3 h-3" />, label }));
  const tags = (g.tags || []).map(label => ({ label, color: TAG_COLOR[label] || (label.startsWith("Pitches") ? "green" : "blue") }));
  return { ...g, price: `₹${Number(g.price_per_hour)}/hr`, rating: Number(g.rating), amenities, tags };
}

const UMPIRE_GRADIENTS = [
  "linear-gradient(135deg,#7c3aed,#5b21b6)", "linear-gradient(135deg,#db2777,#9d174d)",
  "linear-gradient(135deg,#d97706,#92400e)", "linear-gradient(135deg,#2563eb,#1e40af)"
];
function transformUmpire(u, i) {
  return { ...u, exp: `${u.experience_years} yrs`, price: `₹${Number(u.price)}/match`, avail: u.available, grad: UMPIRE_GRADIENTS[i % UMPIRE_GRADIENTS.length] };
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

const UMPIRES = [
  { name: "Rahul Desai", role: "Certified Umpire", exp: "8 yrs", price: "₹800/match", avail: true, grad: "linear-gradient(135deg,#7c3aed,#5b21b6)" },
  { name: "Priya Sharma", role: "Scorer", exp: "4 yrs", price: "₹400/match", avail: true, grad: "linear-gradient(135deg,#db2777,#9d174d)" },
  { name: "Vikram Nair", role: "Umpire + Scorer", exp: "12 yrs", price: "₹1,100/match", avail: false, grad: "linear-gradient(135deg,#d97706,#92400e)" },
  { name: "Ananya Iyer", role: "Certified Umpire", exp: "6 yrs", price: "₹700/match", avail: true, grad: "linear-gradient(135deg,#2563eb,#1e40af)" }
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
function Navbar({ active, setActive }) {
  const tabs = ["Home", "Find Match", "Grounds", "Umpires", "Live Score", "Tournaments", "My Team"];
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
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" style={{ border: "2px solid #0d0f0d" }} />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-black font-bold text-sm cursor-pointer">
            RK
          </div>
        </div>
      </div>
    </nav>;
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
function FindMatchTab({ acceptedChallenge, onAccept, onCancel }) {
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [dateFilter, setDateFilter] = useState("Any Date");
  const [timeFilter, setTimeFilter] = useState("Any Time");
  const [skillFilter, setSkillFilter] = useState("Any Skill");

  const format = FORMATS[selectedFormat];
  const filtered = ALL_CHALLENGES.filter(c => c.format === format.key).filter(c => dateFilter === "Any Date" || c.date === dateFilter).filter(c => {
    if (timeFilter === "Any Time") return true;
    const hour = parseInt(c.time, 10);
    const isPM = c.time.includes("PM");
    const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
    if (timeFilter === "Morning") return hour24 < 12;
    if (timeFilter === "Afternoon") return hour24 >= 12 && hour24 < 17;
    if (timeFilter === "Evening") return hour24 >= 17;
    return true;
  }).filter(c => skillFilter === "Any Skill" || c.note === skillFilter);

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

      {/* Filters — appear once a format is selected */}
      <div className={cn(C, "rounded-2xl p-4")}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-green-400" />
          <span className="text-sm font-semibold text-white">Filter {format.title} challenges</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
          { label: "Date", value: dateFilter, setValue: setDateFilter, options: ["Any Date", "Today", "Weekend", "Next Week"] },
          { label: "Time", value: timeFilter, setValue: setTimeFilter, options: ["Any Time", "Morning", "Afternoon", "Evening"] },
          { label: "Skill Level", value: skillFilter, setValue: setSkillFilter, options: ["Any Skill", "Beginner", "Intermediate", "Advanced"] }
        ].map(f => <div key={f.label} className="relative">
              <label className="text-xs mb-1.5 block" style={{ color: "#6b7a6b" }}>{f.label}</label>
              <select value={f.value} onChange={e => f.setValue(e.target.value)} className="w-full rounded-xl px-3 py-2 text-xs appearance-none pr-7 focus:outline-none transition-colors" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 bottom-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6b7a6b" }} />
            </div>)}
        </div>
      </div>

      {/* Challenge requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Challenge Requests</h3>
          {acceptedChallenge && <span className="text-xs text-amber-400">You've accepted a challenge — cancel it to accept another</span>}
        </div>
        <div className="space-y-3">
          {filtered.length === 0 && <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>No challenges match your filters right now.</div>}
          {filtered.map(t => {
          const isAccepted = acceptedChallenge?.id === t.id;
          const blocked = acceptedChallenge && !isAccepted;
          return <div key={t.id} className={cn(C, "rounded-2xl p-4 flex items-center gap-3")} style={isAccepted ? { border: "1px solid #22c55e" } : undefined}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: "linear-gradient(135deg,#166534,#14532d)" }}>
                  {t.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{t.team}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs" style={{ color: "#6b7a6b" }}>{t.rating}</span>
                    </div>
                    <span className="text-xs" style={{ color: "#6b7a6b" }}>W{t.wins}/L{t.losses}</span>
                    <span className="text-xs" style={{ color: "#4a5a4a" }}>{Math.round(t.wins / (t.wins + t.losses) * 100)}% WR</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {isAccepted && <Tag color="green">✓ Accepted</Tag>}
                    {t.urgent && !isAccepted && <Tag color="amber">⚡ Urgent</Tag>}
                    <Tag color="blue">{t.date} · {t.time}</Tag>
                    <Tag color="purple">{t.note}</Tag>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#4a5a4a" }}>📍 {t.ground}</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0 w-28">
                  {isAccepted ? <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button> : <button disabled={blocked} onClick={() => onAccept(t)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" style={blocked ? { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" } : { backgroundColor: "#22c55e", color: "#000" }} onMouseEnter={e => !blocked && (e.currentTarget.style.backgroundColor = "#4ade80")} onMouseLeave={e => !blocked && (e.currentTarget.style.backgroundColor = "#22c55e")}>
                      {blocked ? "Unavailable" : "Challenge"}
                    </button>}
                  <GhostButton className="text-center">Profile</GhostButton>
                </div>
              </div>;
        })}
        </div>
      </section>
    </div>;
}

// ─── GROUNDS ──────────────────────────────────────────────────────────────────
function GroundsTab({ onBook, grounds = GROUNDS }) {
  const [cost, setCost] = useState("1200");
  const [split, setSplit] = useState("11");
  const [ratingFilter, setRatingFilter] = useState("Any Rating");
  const perHead = cost && split ? Math.ceil(Number(cost) / Number(split)) : 0;

  const ratingThreshold = { "Any Rating": 0, "4.7+": 4.7, "4.5+": 4.5, "4.0+": 4.0 }[ratingFilter];
  const filteredGrounds = [...grounds].filter(g => g.rating >= ratingThreshold).sort((a, b) => b.rating - a.rating);

  return <div className="space-y-8">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <select className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
            <option>All Locations</option>
            {["Bandra", "Andheri", "Thane", "Navi Mumbai"].map(o => <option key={o}>{o}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#6b7a6b" }} />
        </div>
        <div className="relative flex-1">
          <select className="w-full rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none transition-colors" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8ccc8" }}>
            <option>Any Price</option>
            {["Under ₹500/hr", "₹500–₹1000/hr", "₹1000+/hr"].map(o => <option key={o}>{o}</option>)}
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

      {/* Cost split calculator */}
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

      {/* Available grounds list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Available Grounds</h3>
          <span className="text-xs" style={{ color: "#6b7a6b" }}>{filteredGrounds.length} result{filteredGrounds.length !== 1 ? "s" : ""} {ratingFilter !== "Any Rating" && `· rated ${ratingFilter}`}</span>
        </div>
        <div className="space-y-3">
          {filteredGrounds.length === 0 && <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>No grounds match that rating filter.</div>}
          {filteredGrounds.map(g => <div key={g.name} className={cn(C, "rounded-2xl p-4")}>
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
                        <span className="text-xs" style={{ color: "#6b7a6b" }}>{g.area}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-green-400 font-bold text-sm">{g.price}</div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs" style={{ color: "#6b7a6b" }}>{g.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {g.amenities.map(a => <span key={a.label} className="flex items-center gap-1 text-xs" style={{ color: "#6b7a6b" }}>
                        <span style={{ color: "#4a5a4a" }}>{a.icon}</span>{a.label}
                      </span>)}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {g.tags.map(t => <Tag key={t.label} color={t.color}>{t.label}</Tag>)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => onBook(g)} className="flex-1 py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors">Book Now</button>
                <GhostButton className="flex-1 text-center">View Details</GhostButton>
              </div>
            </div>)}
        </div>
      </section>
    </div>;
}

// ─── UMPIRES & SCORERS ──────────────────────────────────────────────────────────
function UmpiresTab({ onBook, umpires = UMPIRES }) {
  return <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Umpires &amp; Scorers</h2>
        <p className="text-sm mt-1" style={{ color: "#6b7a6b" }}>Book certified officials for your next match</p>
      </div>
      <div className={cn(C, "rounded-2xl overflow-hidden")}>
        {umpires.map((u, i, arr) => <div key={u.name} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? "1px solid #2a2a2a" : "none" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: u.grad }}>
              {u.name.split(" ").map(w => w[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{u.name}</div>
              <div className="text-xs" style={{ color: "#6b7a6b" }}>{u.role} · {u.exp}</div>
            </div>
            <div className="text-green-400 font-bold text-xs shrink-0 mr-3">{u.price}</div>
            <button disabled={!u.avail} onClick={() => u.avail && onBook(u)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors", u.avail ? "bg-green-500 text-black hover:bg-green-400" : "")} style={!u.avail ? { backgroundColor: "#1e211e", color: "#4a5a4a", cursor: "not-allowed" } : {}}>
              {u.avail ? "Book" : "Busy"}
            </button>
          </div>)}
      </div>
    </div>;
}

// ─── LIVE SCORE ───────────────────────────────────────────────────────────────
function LiveScoreTab() {
  const balls = [{ val: "4", type: "boundary" }, { val: "0", type: "dot" }, { val: "1", type: "single" }, { val: "W", type: "wicket" }, { val: "6", type: "six" }, { val: "2", type: "single" }, { val: "1", type: "single" }, { val: "0", type: "dot" }, { val: "NB", type: "noball" }, { val: "4", type: "boundary" }];
  const ballStyle = type => {
    if (type === "wicket") return { backgroundColor: "#ef4444", color: "#fff", border: "1px solid transparent" };
    if (type === "six") return { backgroundColor: "#22c55e", color: "#000", border: "1px solid transparent" };
    if (type === "boundary") return { backgroundColor: "#3b82f6", color: "#fff", border: "1px solid transparent" };
    if (type === "noball") return { backgroundColor: "#f59e0b", color: "#000", border: "1px solid transparent" };
    if (type === "dot") return { backgroundColor: "#1e211e", color: "#6b7a6b", border: "1px solid #2a2a2a" };
    return { backgroundColor: "#222", color: "#c8ccc8", border: "1px solid #2a2a2a" };
  };
  return <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Live Matches</h2>

      <div className="relative rounded-2xl overflow-hidden p-5" style={{ background: "linear-gradient(135deg,#14532d,#0d2a16 60%,#0d0f0d)", border: "1px solid rgba(22,101,52,0.3)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-400 tracking-widest">LIVE</span>
          </div>
          <span className="text-xs" style={{ color: "#6b7a6b" }}>Shivaji Park · Over 14.3</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="font-bold text-white text-sm mb-1">Royal Strikers</div>
            <div className="text-3xl font-black text-white font-mono">187<span className="text-lg" style={{ color: "#6b7a6b" }}>/4</span></div>
            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>20 ov</div>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ border: "2px solid rgba(34,197,94,0.4)" }}>
            <span className="text-green-400 font-bold text-xs">VS</span>
          </div>
          <div className="flex-1 text-center">
            <div className="font-bold text-white text-sm mb-1">Mumbai Warriors</div>
            <div className="text-3xl font-black text-green-400 font-mono">143<span className="text-lg text-green-700">/6</span></div>
            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>14.3 ov</div>
          </div>
        </div>
        <div className="mt-3 text-center text-xs rounded-lg py-1.5 text-amber-400 font-medium" style={{ backgroundColor: "rgba(13,15,13,0.5)" }}>
          Need 45 runs off 33 balls · RRR: 8.18
        </div>
      </div>

      <div className={cn(C, "rounded-2xl overflow-hidden")}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <span className="text-sm font-semibold text-white">🏏 Batting</span>
          <span className="text-xs" style={{ color: "#6b7a6b" }}>CRR: 9.86</span>
        </div>
        <div className="px-4 py-2 grid grid-cols-5 text-xs font-medium" style={{ color: "#4a5a4a", borderBottom: "1px solid #2a2a2a" }}>
          <span className="col-span-2">Batter</span>
          <span className="text-center">R</span><span className="text-center">B</span><span className="text-center">SR</span>
        </div>
        {[{ name: "A. Sharma *", runs: 68, balls: 41, sr: "165.8", on: true }, { name: "R. Patel", runs: 34, balls: 28, sr: "121.4", on: false }].map((b, i, arr) => <div key={b.name} className="px-4 py-2.5 grid grid-cols-5 items-center" style={{ borderBottom: i < arr.length - 1 ? "1px solid #2a2a2a" : "none" }}>
            <span className="col-span-2 text-sm font-medium" style={{ color: b.on ? "#22c55e" : "#fff" }}>{b.name}</span>
            <span className="text-center font-bold text-white text-sm font-mono">{b.runs}</span>
            <span className="text-center text-sm font-mono" style={{ color: "#6b7a6b" }}>{b.balls}</span>
            <span className="text-center text-xs font-mono" style={{ color: "#6b7a6b" }}>{b.sr}</span>
          </div>)}
      </div>

      <div className={cn(C, "rounded-2xl overflow-hidden")}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <span className="text-sm font-semibold text-white">🎯 Bowling</span>
        </div>
        <div className="px-4 py-2 grid grid-cols-5 text-xs font-medium" style={{ color: "#4a5a4a", borderBottom: "1px solid #2a2a2a" }}>
          <span className="col-span-2">Bowler</span>
          <span className="text-center">O</span><span className="text-center">W</span><span className="text-center">ER</span>
        </div>
        {[{ name: "K. Singh *", overs: "3.3", wkts: 2, er: "7.71", on: true }, { name: "V. Mehta", overs: "4", wkts: 2, er: "8.25", on: false }, { name: "P. Kumar", overs: "4", wkts: 1, er: "9.50", on: false }].map((b, i, arr) => <div key={b.name} className="px-4 py-2.5 grid grid-cols-5 items-center" style={{ borderBottom: i < arr.length - 1 ? "1px solid #2a2a2a" : "none" }}>
            <span className="col-span-2 text-sm font-medium" style={{ color: b.on ? "#3b82f6" : "#fff" }}>{b.name}</span>
            <span className="text-center text-sm font-mono" style={{ color: "#6b7a6b" }}>{b.overs}</span>
            <span className="text-center font-bold text-red-400 text-sm font-mono">{b.wkts}</span>
            <span className="text-center text-xs font-mono" style={{ color: "#6b7a6b" }}>{b.er}</span>
          </div>)}
      </div>

      <div className={cn(C, "rounded-2xl p-4")}>
        <div className="text-sm font-semibold text-white mb-3">Recent Balls</div>
        <div className="flex items-center gap-2 flex-wrap">
          {balls.map((b, i) => <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={ballStyle(b.type)}>{b.val}</div>)}
        </div>
      </div>
    </div>;
}

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
function MyTeamTab({ acceptedChallenge, registeredTournaments, bookings }) {
  return <div className="space-y-6">
      {/* Team header */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg,#1a1a1a,#1a2a1a)", border: "1px solid #2a2a2a" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: "linear-gradient(135deg,#16a34a,#14532d)", border: "1px solid rgba(22,163,74,0.3)" }}>🏏</div>
        <div className="flex-1">
          <h2 className="font-bold text-white text-lg">Royal Strikers CC</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-sm" style={{ color: "#6b7a6b" }}>4.7 · Est. 2019</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400 font-semibold">Verified</span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Tag color="green">Active</Tag>
            <Tag color="blue">T20 Specialists</Tag>
          </div>
        </div>
        <button className="p-2.5 rounded-xl shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: "#222", border: "1px solid #2a2a2a" }}>
          <Filter className="w-4 h-4" style={{ color: "#6b7a6b" }} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[{ label: "Matches", value: "47", color: "#f0f2f0" }, { label: "Won", value: "31", color: "#22c55e" }, { label: "Lost", value: "16", color: "#ef4444" }].map(s => <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{s.label}</div>
          </div>)}
      </div>

      {/* My Bookings */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-green-400" />
          <h3 className="text-base font-semibold text-white">My Bookings</h3>
        </div>
        {bookings.length === 0 ? <div className={cn(C, "rounded-2xl p-5 text-center text-sm")} style={{ color: "#4a5a4a" }}>
            No bookings yet. Book a ground or umpire to see it here.
          </div> : <div className="space-y-2">
            {bookings.map(b => <div key={b.id} className={cn(C, "rounded-2xl p-4 flex items-center gap-3")}>
                <span className="text-xl shrink-0">{b.type === "ground" ? "🏟" : "🧑‍⚖️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{b.name}</div>
                  <div className="text-xs" style={{ color: "#6b7a6b" }}>{b.date} · {b.time} · ₹{b.amount.toLocaleString()}</div>
                </div>
                <Tag color="green">Paid</Tag>
              </div>)}
          </div>}
      </section>

      {/* Schedule */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-green-400" />
          <h3 className="text-base font-semibold text-white">Schedule</h3>
        </div>
        <div className="space-y-2">
          {!acceptedChallenge && registeredTournaments.length === 0 && <div className={cn(C, "rounded-2xl p-5 text-center text-sm")} style={{ color: "#4a5a4a" }}>
              No upcoming matches or tournaments yet. Accept a challenge in Find Match, or register for a tournament.
            </div>}
          {acceptedChallenge && <div className={cn(C, "rounded-2xl p-4 flex items-center gap-3")}>
              <Swords className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">Match vs {acceptedChallenge.team}</div>
                <div className="text-xs" style={{ color: "#6b7a6b" }}>{acceptedChallenge.format} · {acceptedChallenge.date} {acceptedChallenge.time} · 📍 {acceptedChallenge.ground}</div>
              </div>
              <Tag color="amber">Confirmed</Tag>
            </div>}
          {registeredTournaments.map(t => <div key={t.id} className={cn(C, "rounded-2xl p-4 flex items-center gap-3")}>
              <Trophy className="w-4 h-4 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs" style={{ color: "#6b7a6b" }}>Starts {t.startDate} · {t.format} · 📍 {t.venue}</div>
              </div>
              <Tag color="green">Registered</Tag>
            </div>)}
        </div>
      </section>

      {/* Reputation scores */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">Reputation Scores</h3>
        <div className="rounded-2xl px-4" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <ReputationRow label="Match Completion" stars={5} />
          <ReputationRow label="Sportsmanship" stars={4} />
          <ReputationRow label="No-show Score" status="Excellent" />
          <div className="flex items-center justify-between py-3">
            <span className="text-sm" style={{ color: "#c8ccc8" }}>Payment History</span>
            <span className="text-sm font-semibold text-green-400">All cleared</span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Notifications</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>3 new</span>
        </div>
        <div className="space-y-3">
          {[
          { icon: <Swords className="w-4 h-4 text-amber-400" />, iconBg: "rgba(245,158,11,0.12)", iconBorder: "rgba(245,158,11,0.2)", title: "Challenge Request", desc: "Thunder Bolts CC has challenged your team to a T20 match on Sunday 4PM at Cross Maidan.", time: "2 min ago", actions: true },
          { icon: <Trophy className="w-4 h-4 text-green-400" />, iconBg: "rgba(34,197,94,0.12)", iconBorder: "rgba(34,197,94,0.2)", title: "Tournament Invite", desc: "You've been invited to join the Bandra T20 Cup — Season 4. Registration closes in 2 days.", time: "1 hr ago", actions: true },
          { icon: <CheckCheck className="w-4 h-4 text-blue-400" />, iconBg: "rgba(59,130,246,0.12)", iconBorder: "rgba(59,130,246,0.2)", title: "Match Result Confirmed", desc: "Your match vs Green Eagles on June 28 has been confirmed as Win (187/4 vs 164/8).", time: "Yesterday", actions: false },
          { icon: <AlertCircle className="w-4 h-4 text-red-400" />, iconBg: "rgba(239,68,68,0.12)", iconBorder: "rgba(239,68,68,0.2)", title: "Umpire Cancellation", desc: "Rahul Desai cancelled for your July 5 match. Please rebook an umpire before the deadline.", time: "2 hrs ago", actions: false }
        ].map(n => <div key={n.title} className="rounded-2xl p-4" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: n.iconBg, border: `1px solid ${n.iconBorder}` }}>{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{n.title}</span>
                    <span className="text-xs whitespace-nowrap flex items-center gap-1 shrink-0" style={{ color: "#4a5a4a" }}><Clock className="w-3 h-3" />{n.time}</span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#6b7a6b" }}>{n.desc}</p>
                  {n.actions && <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-1.5 rounded-lg bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors">Accept</button>
                      <GhostButton className="flex-1 text-center">Decline</GhostButton>
                    </div>}
                </div>
              </div>
            </div>)}
        </div>
      </section>

      {/* Squad */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Squad (11)</h3>
          <button className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"><Plus className="w-3.5 h-3.5" /> Add Player</button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          {[
          { name: "Rahul Kapoor", role: "Captain · Batsman", avg: "42.1", sr: "138.2", wkts: null, grad: "linear-gradient(135deg,#16a34a,#14532d)" },
          { name: "Arjun Sharma", role: "Bowler (Fast)", avg: null, sr: null, wkts: "38", grad: "linear-gradient(135deg,#1d4ed8,#1e3a8a)" },
          { name: "Priya Mehta", role: "All-rounder", avg: "28.4", sr: "122.0", wkts: null, grad: "linear-gradient(135deg,#7c3aed,#5b21b6)" },
          { name: "Dev Patel", role: "WK · Batsman", avg: "35.6", sr: "145.1", wkts: null, grad: "linear-gradient(135deg,#d97706,#92400e)" },
          { name: "Suresh Nair", role: "Spinner", avg: null, sr: null, wkts: "29", grad: "linear-gradient(135deg,#db2777,#9d174d)" }
        ].map((p, i, arr) => <div key={p.name} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? "1px solid #2a2a2a" : "none" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: p.grad }}>{p.name.split(" ").map(w => w[0]).join("")}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="text-xs" style={{ color: "#6b7a6b" }}>{p.role}</div>
              </div>
              <div className="text-right">
                {p.avg && <div className="text-xs font-mono" style={{ color: "#c8ccc8" }}>Avg {p.avg}</div>}
                {p.wkts && <div className="text-xs font-mono text-red-400">{p.wkts} wkts</div>}
                {p.sr && <div className="text-xs font-mono" style={{ color: "#4a5a4a" }}>SR {p.sr}</div>}
              </div>
            </div>)}
        </div>
      </section>
    </div>;
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  useForceDark();
  const [activeTab, setActiveTab] = useState("Home");
  const [acceptedChallenge, setAcceptedChallenge] = useState(null);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingModal, setBookingModal] = useState(null); // { type, item }

  const [auth, setAuth] = useState({ token: null, user: null });
  const [backendStatus, setBackendStatus] = useState("connecting"); // connecting | online | offline
  const [grounds, setGrounds] = useState(GROUNDS.map(g => ({ ...g }))); // fallback until API loads
  const [umpires, setUmpires] = useState(UMPIRES.map(u => ({ ...u })));
  const [tournaments, setTournaments] = useState([FEATURED_TOURNAMENT, ...LEAGUES]);

  const registeredTournaments = tournaments.filter(t => registeredIds.includes(t.id));

  const refreshBookings = async token => {
    try {
      const res = await apiRequest("/bookings/mine", { token });
      setBookings(res.bookings.map(transformBooking));
    } catch {
      // non-fatal — keep whatever bookings we already have in memory
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { token } = await ensureDemoAuth();
        const [groundsRes, umpiresRes, tournamentsRes] = await Promise.all([
          apiRequest("/grounds"),
          apiRequest("/umpires"),
          apiRequest("/tournaments")
        ]);
        if (cancelled) return;
        setAuth({ token, user: DEMO_USER });
        setGrounds(groundsRes.grounds.map(transformGround));
        setUmpires(umpiresRes.umpires.map(transformUmpire));
        setTournaments(tournamentsRes.tournaments.map(transformTournament));
        setBackendStatus("online");
        refreshBookings(token);
      } catch (err) {
        if (!cancelled) {
          console.warn("Backend unavailable, using demo data:", err.message);
          setBackendStatus("offline");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAccept = challenge => setAcceptedChallenge(challenge);
  const handleCancel = () => setAcceptedChallenge(null);
  const handleRegister = id => setRegisteredIds(prev => prev.includes(id) ? prev : [...prev, id]);
  const handleBookingConfirm = () => { if (auth.token) refreshBookings(auth.token); };

  const content = {
    "Home": <HomeTab setActiveTab={setActiveTab} grounds={grounds} tournaments={tournaments} />,
    "Find Match": <FindMatchTab acceptedChallenge={acceptedChallenge} onAccept={handleAccept} onCancel={handleCancel} />,
    "Grounds": <GroundsTab grounds={grounds} onBook={g => setBookingModal({ type: "ground", item: g })} />,
    "Umpires": <UmpiresTab umpires={umpires} onBook={u => setBookingModal({ type: "umpire", item: u })} />,
    "Live Score": <LiveScoreTab />,
    "Tournaments": <TournamentsTab tournaments={tournaments} registeredIds={registeredIds} onRegister={handleRegister} />,
    "My Team": <MyTeamTab acceptedChallenge={acceptedChallenge} registeredTournaments={registeredTournaments} bookings={bookings} />
  };

  return <div style={{ minHeight: "100vh", backgroundColor: "#0d0f0d", fontFamily: "Inter, sans-serif" }}>
      <Navbar active={activeTab} setActive={setActiveTab} />
      {backendStatus === "offline" && <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="rounded-xl px-3 py-2 text-xs text-amber-400 flex items-center gap-2" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Backend not reachable at localhost:8000 — showing demo data. Bookings won't save until the server is running.
          </div>
        </div>}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {content[activeTab]}
      </main>
      {bookingModal && <BookingModal type={bookingModal.type} item={bookingModal.item} token={auth.token} onClose={() => setBookingModal(null)} onConfirm={handleBookingConfirm} />}
    </div>;
}
