import React from "react";
import { MapPin, Star } from "lucide-react";
import { C, cn, Tag, GhostButton } from "../../utils/helpers.jsx";
import { GROUNDS, ALL_CHALLENGES } from "../../utils/constants";

export default function HomeTab({ setActiveTab, grounds = GROUNDS, challenges = ALL_CHALLENGES, tournaments = [], allChallenges = [], onCreateChallenge }) {
  const matchesPlayedCount = allChallenges.filter(c => c.status === "accepted").length;
  const activeTeamsCount = new Set(
    allChallenges.flatMap(c => [c.team_name, c.accepted_by_team_name].filter(Boolean))
  ).size;

  return (
    <div className="space-y-8">
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
        ].map(s => (
          <div key={s.label} className={cn(C, "rounded-2xl p-4")}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{s.label}</div>
            <div className="text-xs mt-1" style={{ color: "#4a5a4a" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Urgent match requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Urgent Match Requests</h2>
          <button onClick={() => setActiveTab("Find Match")} className="text-xs text-green-400 hover:text-green-300">View all →</button>
        </div>
        <div className="space-y-3">
          {[...challenges]
            .sort((a, b) => (b.urgent === a.urgent ? 0 : b.urgent ? 1 : -1))
            .slice(0, 3)
            .map(req => (
              <div key={req.id} className={cn(C, "rounded-2xl p-4")}>
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
              </div>
            ))}
        </div>
      </section>

      {/* Nearby grounds */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Nearby Grounds</h2>
          <button onClick={() => setActiveTab("Grounds")} className="text-xs text-green-400 hover:text-green-300">View all →</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {grounds.map(g => (
            <div key={g.name} className={cn(C, "rounded-2xl overflow-hidden")}>
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
