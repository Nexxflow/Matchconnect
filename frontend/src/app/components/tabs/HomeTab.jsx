import React, { useState, useEffect } from "react";
import { MapPin, Star, Calendar, Clock } from "lucide-react";
import { C, cn, Tag, GhostButton } from "../../utils/helpers.jsx";
import { GROUNDS, ALL_CHALLENGES } from "../../utils/constants";

// Colorful accent palettes (visual only — no data changes)
const STAT_THEMES = [
  { grad: "linear-gradient(135deg,#22c55e 0%,#15803d 100%)", glow: "rgba(34,197,94,0.35)", ring: "#4ade80", tint: "rgba(34,197,94,0.10)" },
  { grad: "linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)", glow: "rgba(59,130,246,0.35)", ring: "#60a5fa", tint: "rgba(59,130,246,0.10)" },
  { grad: "linear-gradient(135deg,#f97316 0%,#ea580c 100%)", glow: "rgba(249,115,22,0.35)", ring: "#fb923c", tint: "rgba(249,115,22,0.10)" },
  { grad: "linear-gradient(135deg,#a855f7 0%,#7e22ce 100%)", glow: "rgba(168,85,247,0.35)", ring: "#c084fc", tint: "rgba(168,85,247,0.10)" }
];

const GROUND_THEMES = [
  { grad: "linear-gradient(135deg,#22c55e 0%,#14b8a6 100%)", soft: "rgba(34,197,94,0.16)" },
  { grad: "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)", soft: "rgba(59,130,246,0.16)" },
  { grad: "linear-gradient(135deg,#f97316 0%,#ec4899 100%)", soft: "rgba(249,115,22,0.16)" },
  { grad: "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)", soft: "rgba(168,85,247,0.16)" }
];

// "2026-09-21T18:30:00.000Z" -> "22 Sept 2026" (IST). Plain text is returned as-is.
function formatMatchDate(value) {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

// "19:00" -> "7:00 PM". Already-formatted values ("7:00 PM") are returned as-is.
function formatMatchTime(value) {
  if (!value) return "";
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return String(value);
  let h = parseInt(m[1], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm}`;
}

export default function HomeTab({ setActiveTab, grounds = GROUNDS, challenges = ALL_CHALLENGES, tournaments = [], allChallenges = [], onCreateChallenge, onCreateTournament, theme = "dark" }) {
  const isLight = theme === "light";
  const matchesPlayedCount = allChallenges.filter(c => c.status === "accepted").length;
  const activeTeamsCount = new Set(
    allChallenges.flatMap(c => [c.team_name, c.accepted_by_team_name].filter(Boolean))
  ).size;

  // Location: default to Tamil Nadu (this app's regional focus). If the
  // browser grants geolocation permission, resolve the real city/state via
  // reverse geocoding and use that instead. Any failure (denied, timeout,
  // network error) silently keeps the Tamil Nadu fallback — never falls
  // back to the old hardcoded "Mumbai, Maharashtra".
  const [locationLabel, setLocationLabel] = useState("Tamil Nadu");

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || "";
          const state = addr.state || "Tamil Nadu";
          setLocationLabel(city ? `${city}, ${state}` : state);
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          // keep Tamil Nadu fallback
        }
      },
      () => {
        // permission denied / unavailable — keep Tamil Nadu fallback
      },
      { timeout: 8000 }
    );
  }, []);

  // Hero quick actions — all 4 in one row. Each button gets an equal share of the
  // width (grid-cols-4), so nothing scrolls or gets cut. Below lg the emoji sits
  // above a wrapping label (never truncated); from lg up it is a single-line pill.
  const heroActions = [
    {
      key: "find",
      emoji: "🏏",
      label: "Find a Match",
      onClick: () => setActiveTab("Find Match"),
      background: theme === "light"
        ? "linear-gradient(135deg,#ffffff 0%,#f0fdf4 100%)"
        : "linear-gradient(135deg,#22c55e 0%,#15803d 100%)",
      border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(134,239,172,0.55)",
      shadow: "0 6px 18px -6px rgba(34,197,94,0.55)",
      color: theme === "light" ? "#15803d" : "#ffffff"
    },
    {
      key: "ground",
      emoji: "🏟",
      label: "Book a Ground",
      onClick: () => setActiveTab("Grounds"),
      background: theme === "light"
        ? "linear-gradient(135deg,#ffffff 0%,#eff6ff 100%)"
        : "linear-gradient(135deg,#3b82f6 0%,#1e40af 100%)",
      border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(147,197,253,0.5)",
      shadow: "0 6px 18px -6px rgba(59,130,246,0.55)",
      color: theme === "light" ? "#1d4ed8" : "#ffffff"
    },
    {
      key: "challenge",
      emoji: "⚡",
      label: "Create Challenge",
      onClick: onCreateChallenge,
      background: "linear-gradient(135deg,#f59e0b 0%,#f97316 55%,#ec4899 100%)",
      border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(253,186,116,0.5)",
      shadow: "0 6px 18px -6px rgba(249,115,22,0.6)",
      color: "#ffffff"
    },
    {
      key: "tournament",
      emoji: "🏆",
      label: "Create Tournament",
      onClick: onCreateTournament || (() => setActiveTab("Tournaments")),
      background: "linear-gradient(135deg,#a855f7 0%,#7e22ce 55%,#4c1d95 100%)",
      border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(216,180,254,0.5)",
      shadow: "0 6px 18px -6px rgba(168,85,247,0.6)",
      color: "#ffffff"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 md:p-8 transition-all"
        style={{
          background: theme === "light"
            ? "linear-gradient(135deg, #15803d 0%, #16a34a 35%, #22c55e 70%, #4ade80 100%)"
            : "linear-gradient(135deg, #052e16 0%, #14532d 30%, #166534 60%, #0d2a16 100%)",
          border: theme === "light" ? "1px solid #86efac" : "1px solid rgba(34,197,94,0.35)",
          boxShadow: theme === "light"
            ? "0 12px 34px -6px rgba(22, 163, 74, 0.35), 0 4px 12px -2px rgba(22, 163, 74, 0.18)"
            : "0 8px 36px rgba(0,0,0,0.45), 0 0 60px -20px rgba(34,197,94,0.35)"
        }}
      >
        {/* Colorful glow blobs */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 78% 25%, rgba(255,255,255,0.28) 0%, transparent 55%), radial-gradient(circle at 12% 90%, rgba(74,222,128,0.35) 0%, transparent 55%), radial-gradient(circle at 95% 85%, rgba(56,189,248,0.30) 0%, transparent 50%)" }} />
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 backdrop-blur-sm shadow-sm"
            style={{
              backgroundColor: theme === "light" ? "rgba(255,255,255,0.25)" : "rgba(13,15,13,0.5)",
              border: theme === "light" ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(74,222,128,0.45)"
            }}
          >
            <MapPin className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-semibold">{locationLabel}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-1 tracking-tight" style={{ color: "#ffffff" }}>Find your next</h1>
          <h1
            className="text-2xl md:text-3xl font-black mb-5 tracking-tight"
            style={{
              color: theme === "light" ? "#fefce8" : "#4ade80",
              textShadow: theme === "light"
                ? "0 2px 12px rgba(0,0,0,0.25)"
                : "0 2px 14px rgba(74,222,128,0.55)"
            }}
          >
            cricket match
          </h1>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 md:gap-3 w-full">
            {heroActions.map(a => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                title={a.label}
                className="w-full min-w-0 flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-1.5 px-1.5 sm:px-2 lg:px-4 py-2 sm:py-2.5 rounded-2xl lg:rounded-full font-bold hover:opacity-95 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
                style={{ background: a.background, border: a.border, boxShadow: a.shadow }}
              >
                <span className="text-lg lg:text-sm leading-none">{a.emoji}</span>
                <span
                  className="text-[10px] sm:text-xs lg:text-sm leading-tight text-center lg:whitespace-nowrap"
                  style={{ color: a.color, fontWeight: 700 }}
                >
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6 text-6xl sm:text-7xl opacity-25 select-none pointer-events-none drop-shadow-lg">🏏</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          { label: "Matches Played", value: String(matchesPlayedCount), color: "#22c55e", icon: "🏏", sub: "Confirmed matches" },
          { label: "Active Teams", value: String(activeTeamsCount), color: "#3b82f6", icon: "👥", sub: "On MatchConnect" },
          { label: "Active Grounds", value: String(grounds.length), color: "#f97316", icon: "🏟", sub: "Bookable now" },
          { label: "Active Tournaments", value: String(tournaments.length), color: "#a855f7", icon: "🏆", sub: "Open or ongoing" }
        ].map((s, i) => {
          const t = STAT_THEMES[i % STAT_THEMES.length];
          return (
            <div
              key={s.label}
              className={cn(C, "rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all hover:-translate-y-0.5 flex flex-col")}
              style={{
                background: theme === "light"
                  ? `linear-gradient(150deg, #ffffff 0%, ${t.tint} 100%)`
                  : `linear-gradient(150deg, #12160f 0%, ${t.tint} 100%)`,
                border: `1px solid ${t.ring}55`,
                boxShadow: `0 6px 20px -8px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
              }}
            >
              {/* corner glow */}
              <div
                className="absolute -right-8 -top-8 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: t.grad, opacity: 0.2, filter: "blur(18px)" }}
              />

              {/* Big number on top */}
              <div className="relative flex-1 flex items-center justify-center py-2 sm:py-3">
                <span
                  className="text-5xl sm:text-6xl font-black leading-none tracking-tighter tabular-nums"
                  style={{
                    background: t.grad,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: `drop-shadow(0 4px 14px ${t.glow})`
                  }}
                >
                  {s.value}
                </span>
              </div>

              {/* Label at the bottom */}
              <div
                className="relative mt-3 pt-3 border-t text-center"
                style={{ borderColor: `${t.ring}33` }}
              >
                <div className="text-sm sm:text-base font-bold leading-tight" style={{ color: theme === "light" ? "#1f2937" : "#e5ece5" }}>
                  {s.label}
                </div>
                <div className="text-[11px] sm:text-xs mt-1 font-medium" style={{ color: theme === "light" ? "#64748b" : "#7d8a7d" }}>
                  {s.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgent match requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: isLight ? "#000000" : "#ffffff" }}>
            <span className="w-1.5 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
            Urgent Match Requests
          </h2>
          <button onClick={() => setActiveTab("Find Match")} className="text-xs text-green-500 hover:text-green-600 font-medium cursor-pointer">View all →</button>
        </div>
        <div className="space-y-3">
          {[...challenges]
            .sort((a, b) => (b.urgent === a.urgent ? 0 : b.urgent ? 1 : -1))
            .slice(0, 3)
            .map((req, idx) => {
              const accent = GROUND_THEMES[idx % GROUND_THEMES.length];
              const muted = isLight ? "#64748b" : "#8fa38f";
              const initials = String(req.team || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div
                  key={req.id}
                  className={cn(C, "rounded-2xl p-4 sm:p-5 pt-5 sm:pt-6 relative overflow-hidden")}
                  style={{
                    border: `1px solid ${accent.soft.replace("0.16", "0.45")}`,
                    boxShadow: "0 6px 22px -12px rgba(0,0,0,0.6)"
                  }}
                >
                  {/* top accent line (sits inside the rounded corners) */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: req.urgent ? "linear-gradient(90deg,#f59e0b,#ef4444)" : accent.grad }}
                  />

                  {/* Team  —  VS  —  Opponent needed */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: accent.grad, boxShadow: `0 4px 14px -4px ${accent.soft.replace("0.16", "0.8")}` }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-bold truncate" style={{ color: isLight ? "#000000" : "#ffffff" }}>{req.team}</div>
                        {(req.rating > 0 || req.reviewsCount > 0) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-bold text-amber-400">{Number(req.rating || 0).toFixed(1)}</span>
                            {req.reviewsCount > 0 && (
                              <span className="text-[11px]" style={{ color: muted }}>({req.reviewsCount} review{req.reviewsCount !== 1 ? "s" : ""})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#22c55e 0%,#0ea5e9 100%)",
                        border: "2px solid rgba(255,255,255,0.25)",
                        boxShadow: "0 4px 16px -4px rgba(34,197,94,0.7)"
                      }}
                    >
                      <span className="text-white font-black text-xs">VS</span>
                    </div>

                    <div
                      className="rounded-xl px-2 py-2.5 sm:py-3 text-center min-w-0"
                      style={{
                        background: isLight
                          ? "linear-gradient(135deg,#fef3c7 0%,#fce7f3 100%)"
                          : "linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(236,72,153,0.12) 100%)",
                        border: `2px dashed ${isLight ? "#fbbf24" : "rgba(251,191,36,0.45)"}`
                      }}
                    >
                      <div className="text-xs sm:text-sm font-semibold" style={{ color: isLight ? "#92400e" : "#fbbf24" }}>Opponent needed</div>
                      <div className="text-[11px] mt-0.5" style={{ color: isLight ? "#78350f" : "#fcd34d" }}>Open to challenge</div>
                    </div>
                  </div>

                  {/* Match info */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4 text-sm" style={{ color: isLight ? "#0f172a" : "#e5e7eb" }}>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-green-500" />
                      {formatMatchDate(req.date)}
                    </span>
                    {req.time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-green-500" />
                        {formatMatchTime(req.time)}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="truncate">{req.ground || "Ground TBD"}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {req.urgent && <Tag color="amber">⚡ Urgent</Tag>}
                    <Tag color="blue">{req.format}</Tag>
                  </div>

                  {/* Latest review — full width, lines up with everything above */}
                  {req.latestReview && (
                    <div
                      className="mt-3 p-3 rounded-xl text-xs"
                      style={{
                        background: isLight ? "#f8fafc" : "#101410",
                        border: `1px solid ${isLight ? "#e2e8f0" : "#222922"}`
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold truncate flex items-center gap-1" style={{ color: isLight ? "#000000" : "#e2e8f0" }}>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          {Number(req.latestReview.rating || 5.0).toFixed(1)} by {req.latestReview.reviewer_name}
                          {req.latestReview.reviewer_team_name ? ` (${req.latestReview.reviewer_team_name})` : ""}
                        </span>
                        <span className="shrink-0 text-[10px]" style={{ color: muted }}>
                          {req.latestReview.created_at
                            ? new Date(req.latestReview.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                                timeZone: "Asia/Kolkata"
                              })
                            : "Recent"}
                        </span>
                      </div>
                      <p className="italic line-clamp-2 pl-2 border-l-2 border-green-500/60" style={{ color: isLight ? "#334155" : "#d4d4d4" }}>
                        "{req.latestReview.review_text}"
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() => setActiveTab("Find Match")}
                      className="py-2.5 rounded-xl text-sm font-bold transition-all text-center cursor-pointer text-white hover:opacity-95"
                      style={{
                        background: isLight
                          ? "linear-gradient(135deg,#16a34a 0%,#15803d 100%)"
                          : "linear-gradient(135deg,#22c55e 0%,#0d9488 100%)",
                        boxShadow: "0 4px 16px -4px rgba(34,197,94,0.65)"
                      }}
                    >
                      Accept Challenge
                    </button>
                    <GhostButton onClick={() => setActiveTab("Find Match")} className="text-center py-2.5 text-sm">View Details</GhostButton>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Nearby grounds */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: theme === "light" ? "#000000" : "#ffffff" }}>
            <span className="w-1.5 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#22c55e,#3b82f6)" }} />
            Nearby Grounds
          </h2>
          <button onClick={() => setActiveTab("Grounds")} className="text-xs text-green-600 dark:text-green-500 hover:underline font-semibold">View all →</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {grounds.map((g, i) => {
            const gt = GROUND_THEMES[i % GROUND_THEMES.length];
            const rating = Number(g.rating) || 0;
            const venue = g.area || g.address || "Location TBD";
            const price = g.price || (g.price_per_hour ? `₹${g.price_per_hour}/hr` : "");
            return (
              <div
                key={g.id ?? g.name}
                className={cn(C, "rounded-2xl overflow-hidden transition-colors")}
                style={{
                  border: `1px solid ${gt.soft.replace("0.16", "0.5")}`,
                  boxShadow: `0 8px 22px -14px ${gt.soft.replace("0.16", "0.9")}`
                }}
              >
                {/* Header: ground name as the title, venue underneath */}
                <div
                  className="relative px-4 py-4 flex items-center gap-3 border-b"
                  style={{
                    background: isLight
                      ? `linear-gradient(135deg, ${gt.soft.replace("0.16", "0.28")} 0%, #ffffff 100%)`
                      : `linear-gradient(135deg, ${gt.soft.replace("0.16", "0.35")} 0%, rgba(13,15,13,0.6) 100%)`,
                    borderColor: isLight ? "#e2e8f0" : "#2a2a2a"
                  }}
                >
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: gt.grad }} />
                  <div
                    className="relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: gt.grad, boxShadow: `0 6px 16px -6px ${gt.soft.replace("0.16", "0.9")}` }}
                  >
                    🏟
                  </div>
                  <div className="relative min-w-0">
                    <div className="text-lg font-bold leading-tight truncate" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                      {g.name}
                    </div>
                    <div className="flex items-center gap-1 mt-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: isLight ? "#475569" : "#cbd5e1" }} />
                      <span className="text-sm truncate" style={{ color: isLight ? "#475569" : "#cbd5e1" }}>{venue}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: gt.grad }} />
                </div>

                {/* Body: rating + price */}
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-semibold" style={{ color: isLight ? "#0f172a" : "#e5e7eb" }}>
                      {rating > 0 ? rating.toFixed(1) : "New"}
                    </span>
                  </div>
                  {price && (
                    <div
                      className="font-bold text-base"
                      style={{
                        background: gt.grad,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text"
                      }}
                    >
                      {price}
                    </div>
                  )}
                </div>

                {(g.amenities || []).length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {g.amenities.map(a => (
                      <span
                        key={a.label}
                        className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{
                          backgroundColor: isLight ? "#f1f5f9" : "#222",
                          color: isLight ? "#334155" : "#8fa38f",
                          border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`
                        }}
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}