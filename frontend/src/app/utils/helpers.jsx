import React, { useEffect } from "react";
import { Star, Droplets } from "lucide-react";
import { AMENITY_ICON, TAG_COLOR, UMPIRE_GRADIENTS } from "./constants";

export const C = "mc-card";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Tag({ color, children }) {
  const map = {
    green: "bg-green-500/15 text-green-400 border-green-500/20",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    red: "bg-red-500/15 text-red-400 border-red-500/20",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    sky: "bg-sky-500/15 text-sky-400 border-sky-500/20"
  };
  return <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", map[color])}>{children}</span>;
}

export function StarRow({ count, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={cn("w-3.5 h-3.5", i < count ? "text-amber-400 fill-amber-400" : "text-[#333]")} />
      ))}
    </div>
  );
}

export function GhostButton({ children, onClick, disabled, className = "" }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn("py-2 rounded-xl text-xs font-medium transition-colors", className)}
      style={{
        border: "1px solid #2a2a2a",
        color: disabled ? "#3a3a3a" : "#c8ccc8",
        backgroundColor: "transparent",
        cursor: disabled ? "not-allowed" : "pointer"
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.backgroundColor = "#222")}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
    >
      {children}
    </button>
  );
}

export function normalizePhone(p) {
  const digits = String(p || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function formatPhoneDisplay(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length !== 10) return String(phone);
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function formatGroundPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `₹${numeric}/hr`;
  if (typeof value === "string") return value.startsWith("₹") ? value : `₹${value}`;
  return String(value);
}

export function transformGround(g) {
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

export function transformUmpire(u, i = 0) {
  return {
    ...u,
    exp: `${u.experience} yrs`,
    price: `₹${Number(u.fee_per_match)}/match`,
    avail: u.available,
    grad: UMPIRE_GRADIENTS[i % UMPIRE_GRADIENTS.length]
  };
}

export function transformBooking(b) {
  return {
    id: b.id,
    type: b.booking_type,
    name: b.item_name || b.ground_name || b.umpire_name || "Booking",
    date: b.booking_date ? formatDateIST(b.booking_date) : "",
    time: b.time_slot || "",
    amount: b.amount || b.total_price || 0
  };
}

export function transformTournament(t) {
  if (!t) return null;
  let prizes = t.prizes;
  if (typeof prizes === "string") {
    try { prizes = JSON.parse(prizes); } catch { prizes = []; }
  }
  const maxTeams = t.max_teams ?? 0;
  const teamCount = t.team_count ?? 0;

  return {
    ...t,
    startDate: t.start_date ?? t.startDate ?? null,
    prizes: Array.isArray(prizes) ? prizes : [],
    max_teams: maxTeams,
    team_count: teamCount,
    spots_left: t.spots_left ?? Math.max(maxTeams - teamCount, 0),
  };
}

export function buildGroundMapsEmbedUrl(ground) {
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

export function buildGroundMapsLink(ground) {
  const query = ground?.area || ground?.address || ground?.name || "";
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

export function useForceDark() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = "#0d0f0d";
    document.body.style.backgroundColor = "#0d0f0d";
    document.body.style.color = "#f0f2f0";
  }, []);
}

export function getNext7Days() {
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

export function formatDateIST(dateStr) {
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
