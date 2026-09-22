import React, { useState, useEffect } from "react";
import { MapPin, Star } from "lucide-react";
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

export default function HomeTab({ setActiveTab, grounds = GROUNDS, challenges = ALL_CHALLENGES, tournaments = [], allChallenges = [], onCreateChallenge, onCreateTournament, theme = "dark" }) {
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
          <div className="flex flex-row items-center flex-nowrap gap-2 sm:gap-2.5 md:gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("Find Match")}
              className="shrink-0 px-3.5 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm hover:opacity-95 hover:scale-[1.03] transition-all text-center justify-center whitespace-nowrap cursor-pointer"
              style={{
                background: theme === "light"
                  ? "linear-gradient(135deg,#ffffff 0%,#f0fdf4 100%)"
                  : "linear-gradient(135deg,#22c55e 0%,#15803d 100%)",
                border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(134,239,172,0.55)",
                boxShadow: "0 6px 18px -4px rgba(34,197,94,0.55)"
              }}
            >
              <span style={{ color: theme === "light" ? "#15803d" : "#ffffff", fontWeight: 700 }}>🏏 Find a Match</span>
            </button>
            <button
              onClick={() => setActiveTab("Grounds")}
              className="shrink-0 px-3.5 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm hover:opacity-95 hover:scale-[1.03] transition-all text-center justify-center whitespace-nowrap cursor-pointer"
              style={{
                background: theme === "light"
                  ? "linear-gradient(135deg,#ffffff 0%,#eff6ff 100%)"
                  : "linear-gradient(135deg,#3b82f6 0%,#1e40af 100%)",
                border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(147,197,253,0.5)",
                boxShadow: "0 6px 18px -4px rgba(59,130,246,0.55)"
              }}
            >
              <span style={{ color: theme === "light" ? "#1d4ed8" : "#ffffff", fontWeight: 700 }}>🏟 Book a Ground</span>
            </button>
            <button
              onClick={onCreateChallenge}
              className="shrink-0 px-3.5 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm hover:opacity-95 hover:scale-[1.03] transition-all text-center justify-center whitespace-nowrap cursor-pointer"
              style={{
                background: "linear-gradient(135deg,#f59e0b 0%,#f97316 55%,#ec4899 100%)",
                border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(253,186,116,0.5)",
                boxShadow: "0 6px 18px -4px rgba(249,115,22,0.6)"
              }}
            >
              <span style={{ color: "#ffffff", fontWeight: 700 }}>⚡ Create Challenge</span>
            </button>
            <button
              onClick={onCreateTournament || (() => setActiveTab("Tournaments"))}
              className="shrink-0 px-3.5 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm hover:opacity-95 hover:scale-[1.03] transition-all text-center justify-center whitespace-nowrap cursor-pointer"
              style={{
                background: "linear-gradient(135deg,#a855f7 0%,#7e22ce 55%,#4c1d95 100%)",
                border: theme === "light" ? "2px solid #ffffff" : "2px solid rgba(216,180,254,0.5)",
                boxShadow: "0 6px 18px -4px rgba(168,85,247,0.6)"
              }}
            >
              <span style={{ color: "#ffffff", fontWeight: 700 }}>🏆 Create Tournament</span>
            </button>
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
              className={cn(C, "rounded-2xl p-3.5 sm:p-4 relative overflow-hidden transition-all hover:scale-[1.02]")}
              style={{
                background: theme === "light"
                  ? `linear-gradient(150deg, #ffffff 0%, ${t.tint} 100%)`
                  : `linear-gradient(150deg, #12160f 0%, ${t.tint} 100%)`,
                border: `1px solid ${t.ring}55`,
                boxShadow: `0 6px 20px -8px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
              }}
            >
              <div
                className="absolute -right-6 -top-6 w-20 h-20 rounded-full pointer-events-none"
                style={{ background: t.grad, opacity: 0.18, filter: "blur(6px)" }}
              />
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl mb-2 shadow-md"
                style={{ background: t.grad, boxShadow: `0 4px 14px -4px ${t.glow}` }}
              >
                {s.icon}
              </div>
              <div
                className="text-xl sm:text-2xl font-black font-mono"
                style={{
                  background: t.grad,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                {s.value}
              </div>
              <div className="text-xs mt-0.5 font-bold" style={{ color: theme === "light" ? "#1f2937" : "#c9d6c9" }}>{s.label}</div>
              <div className="text-[11px] mt-0.5 truncate font-medium" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>{s.sub}</div>
              <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: t.grad, opacity: 0.85 }} />
            </div>
          );
        })}
      </div>

      {/* Urgent match requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: theme === "light" ? "#000000" : "#ffffff" }}>
            <span className="w-1.5 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
            Urgent Match Requests
          </h2>
          <button onClick={() => setActiveTab("Find Match")} className="text-xs text-green-500 hover:text-green-600 font-medium">View all →</button>
        </div>
        <div className="space-y-3">
          {[...challenges]
            .sort((a, b) => (b.urgent === a.urgent ? 0 : b.urgent ? 1 : -1))
            .slice(0, 3)
            .map((req, idx) => {
              const accent = GROUND_THEMES[idx % GROUND_THEMES.length];
              return (
                <div
                  key={req.id}
                  className={cn(C, "rounded-2xl p-4 relative overflow-hidden transition-all hover:scale-[1.005]")}
                  style={{
                    border: `1px solid ${accent.soft.replace("0.16", "0.45")}`,
                    boxShadow: `0 6px 22px -12px rgba(0,0,0,0.6)`
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: req.urgent ? "linear-gradient(180deg,#f59e0b,#ef4444)" : accent.grad }} />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 pl-1.5">
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md"
                          style={{ background: accent.grad, boxShadow: `0 4px 14px -4px ${accent.soft.replace("0.16", "0.8")}` }}
                        >
                          {req.team.split(" ").map(w => w[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate" style={{ color: theme === "light" ? "#000000" : "#ffffff" }}>{req.team}</div>
                          {(req.rating > 0 || req.reviewsCount > 0) && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-bold text-amber-400">{req.rating.toFixed(1)}</span>
                              {req.reviewsCount > 0 && (
                                <span className="text-[10px] text-neutral-400">({req.reviewsCount} review{req.reviewsCount !== 1 ? "s" : ""})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {req.latestReview && (
                        <div
                          className="mt-2 p-2 rounded-xl text-[11px]"
                          style={{
                            background: theme === "light"
                              ? "linear-gradient(135deg,#f8fafc 0%,#f0fdf4 100%)"
                              : "linear-gradient(135deg,#0f120f 0%,#101a12 100%)",
                            border: `1px solid ${theme === "light" ? "#e2e8f0" : "#222922"}`
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] text-neutral-400 mb-0.5">
                            <span className="font-semibold truncate flex items-center gap-1" style={{ color: theme === "light" ? "#000000" : "#e2e8f0" }}>
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                              <span>{Number(req.latestReview.rating || 5.0).toFixed(1)}★</span>
                              <span>by {req.latestReview.reviewer_name}</span>
                              {req.latestReview.reviewer_team_name ? ` (${req.latestReview.reviewer_team_name})` : ""}:
                            </span>
                            <span className="shrink-0 text-[9px]" style={{ color: theme === "light" ? "#000000" : "#737373" }}>
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
                          <p className="italic line-clamp-1 pl-2 border-l-2 border-green-500/60" style={{ color: theme === "light" ? "#000000" : "#d4d4d4" }}>
                            "{req.latestReview.review_text}"
                          </p>
                        </div>
                      )}
                    </div>
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 self-center shadow-lg"
                      style={{
                        background: "linear-gradient(135deg,#22c55e 0%,#0ea5e9 100%)",
                        border: "2px solid rgba(255,255,255,0.25)",
                        boxShadow: "0 4px 16px -4px rgba(34,197,94,0.7)"
                      }}
                    >
                      <span className="text-white font-black text-[10px] sm:text-xs">VS</span>
                    </div>
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div
                        className="rounded-xl p-2.5 sm:p-3 text-center"
                        style={{
                          background: theme === "light"
                            ? "linear-gradient(135deg,#fef3c7 0%,#fce7f3 100%)"
                            : "linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(236,72,153,0.12) 100%)",
                          border: `2px dashed ${theme === "light" ? "#fbbf24" : "rgba(251,191,36,0.45)"}`
                        }}
                      >
                        <div className="text-xs font-medium" style={{ color: theme === "light" ? "#92400e" : "#fbbf24" }}>Opponent needed</div>
                        <div className="text-[11px] mt-0.5 font-semibold" style={{ color: theme === "light" ? "#78350f" : "#fcd34d" }}>11/11 players</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3 pl-1.5">
                    {req.urgent && <Tag color="amber">⚡ Urgent</Tag>}
                    <Tag color="blue">{req.format}</Tag>
                    <Tag color="green">{req.date} {req.time}</Tag>
                  </div>
                  <div className="text-xs mt-2 font-medium pl-1.5" style={{ color: theme === "light" ? "#000000" : "#8fa38f" }}>📍 {req.ground}</div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 pl-1.5">
                    <button
                      onClick={() => setActiveTab("Find Match")}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer text-white hover:opacity-95 hover:scale-[1.02]"
                      style={{
                        background: theme === "light"
                          ? "linear-gradient(135deg,#16a34a 0%,#15803d 100%)"
                          : "linear-gradient(135deg,#22c55e 0%,#0d9488 100%)",
                        color: "#ffffff",
                        boxShadow: "0 4px 16px -4px rgba(34,197,94,0.65)"
                      }}
                    >
                      Accept Challenge
                    </button>
                    <GhostButton onClick={() => setActiveTab("Find Match")} className="flex-1 text-center">View Details</GhostButton>
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
        <div className="grid grid-cols-2 gap-3">
          {grounds.map((g, i) => {
            const gt = GROUND_THEMES[i % GROUND_THEMES.length];
            return (
              <div
                key={g.name}
                className={cn(C, "rounded-2xl overflow-hidden transition-all hover:scale-[1.02]")}
                style={{
                  border: `1px solid ${gt.soft.replace("0.16", "0.5")}`,
                  boxShadow: `0 8px 22px -14px ${gt.soft.replace("0.16", "0.9")}`
                }}
              >
                <div
                  className="h-16 flex items-center justify-center border-b relative overflow-hidden"
                  style={{
                    background: theme === "light"
                      ? `linear-gradient(135deg, ${gt.soft.replace("0.16", "0.28")} 0%, #ffffff 100%)`
                      : `linear-gradient(135deg, ${gt.soft.replace("0.16", "0.35")} 0%, rgba(13,15,13,0.6) 100%)`,
                    borderColor: theme === "light" ? "#e2e8f0" : "#2a2a2a"
                  }}
                >
                  <div className="absolute inset-0 opacity-25" style={{ background: gt.grad }} />
                  <span className="text-3xl relative z-10 drop-shadow-md">🏟</span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: gt.grad }} />
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm leading-tight" style={{ color: theme === "light" ? "#000000" : "#ffffff" }}>{g.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-semibold" style={{ color: theme === "light" ? "#000000" : "#6b7a6b" }}>{g.rating} · {g.area}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {g.amenities.map(a => (
                      <span
                        key={a.label}
                        className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{
                          backgroundColor: theme === "light" ? "#f1f5f9" : "#222",
                          color: theme === "light" ? "#000000" : "#8fa38f",
                          border: `1px solid ${theme === "light" ? "#e2e8f0" : "#2a2a2a"}`
                        }}
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                  <div
                    className="font-bold text-sm mt-2"
                    style={{
                      background: gt.grad,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text"
                    }}
                  >
                    {g.price}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}