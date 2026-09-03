import { useEffect, useState, useCallback, useRef } from "react";

/* ============================================================================
   BACKEND CONTRACT (matches matchController.js / liveScoreRoutes.js)
   ----------------------------------------------------------------------------
   GET  /api/matches
   POST /api/matches                      { team1_name, team2_name, venue, overs_limit } -> { match_id }
   GET  /api/matches/:id/squads           -> { team1: {name, players}, team2: {name, players} }
   POST /api/matches/:id/squads           { team1_players: string[], team2_players: string[] } -> squads
   POST /api/matches/:id/toss             { toss_winner_team: "team1"|"team2", toss_decision: "bat"|"bowl" } -> live state
   GET  /api/matches/:id/live             -> { match, current_innings, batting, bowling, recent_balls }
   POST /api/matches/:id/start-innings    { innings_number, batting_team, striker_id, non_striker_id, bowler_id }
   POST /api/matches/:id/balls            { runs, extra_type, extra_runs, is_wicket, wicket_type,
                                             dismissed_player_id, fielder_id, striker_id, non_striker_id, bowler_id }
   POST /api/matches/:id/balls/undo
   POST /api/matches/:id/select-bowler    { bowler_id }
   POST /api/matches/:id/new-batsman      { player_id }
   POST /api/matches/:id/complete         { result }
   GET  /api/matches/:id/scoreboard
   ============================================================================ */

const rawLiveScoreUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");
const API_BASE = rawLiveScoreUrl.endsWith("/api") ? rawLiveScoreUrl : `${rawLiveScoreUrl}/api`;

async function api(path, options) {
  const cleanPath = path.startsWith("/api/")
    ? path.slice(4)
    : path.startsWith("api/")
    ? path.slice(3)
    : path.startsWith("/")
    ? path
    : `/${path}`;

  const res = await fetch(`${API_BASE}${cleanPath}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    if (isJson) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `${options?.method || "GET"} ${path} failed (${res.status})`);
    }
    const text = await res.text().catch(() => "");
    throw new Error(
      `${options?.method || "GET"} ${path} failed (${res.status}). ` +
      `Expected JSON but got "${contentType || "unknown content-type"}"`
    );
  }

  if (res.status === 204) return null;

  if (!isJson) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${options?.method || "GET"} ${path} returned a non-JSON 200 response.`
    );
  }

  return res.json();
}

// Ball classification — labels every delivery for the "This Over" strip & Commentary.
function classifyBall(b) {
  if (b.is_wicket) return { val: "W", type: "wicket" };

  const extraRuns = Number(b.extra_runs || 0);

  if (b.extra_type === "noball") {
    return { val: extraRuns > 0 ? `NB+${extraRuns}` : "NB", type: "noball" };
  }
  if (b.extra_type === "wide") {
    return { val: extraRuns > 0 ? `WD+${extraRuns}` : "WD", type: "wide" };
  }
  if (b.extra_type === "bye") {
    return { val: extraRuns > 0 ? `B+${extraRuns}` : "B", type: "extra" };
  }
  if (b.extra_type === "legbye") {
    return { val: extraRuns > 0 ? `LB+${extraRuns}` : "LB", type: "extra" };
  }
  if (Number(b.runs) === 6) return { val: "6", type: "six" };
  if (Number(b.runs) === 4) return { val: "4", type: "boundary" };
  if (Number(b.runs) === 0 && !b.extra_type) return { val: "0", type: "dot" };
  return { val: String(b.runs), type: "single" };
}

function parseOversToBalls(oversValue) {
  const num = Number(oversValue) || 0;
  const wholeOvers = Math.trunc(num);
  const ballPart = Math.round((num - wholeOvers) * 10);
  return wholeOvers * 6 + ballPart;
}

function ballsToOversDisplay(totalBalls) {
  const overs = Math.floor(totalBalls / 6);
  const rem = totalBalls % 6;
  return `${overs}.${rem}`;
}

function ballsToTrueDecimalOvers(totalBalls) {
  return totalBalls / 6;
}

function formatOvers(oversValue) {
  const totalBalls = parseOversToBalls(oversValue);
  return {
    display: ballsToOversDisplay(totalBalls),
    trueDecimal: ballsToTrueDecimalOvers(totalBalls),
    totalBalls,
  };
}

function correctBuggyBowlerOvers(rawOversBowled) {
  const raw = Number(rawOversBowled) || 0;
  const balls = Math.round(raw * 4);
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return {
    display: `${overs}.${rem}`,
    trueDecimal: balls / 6,
    balls,
  };
}

function teamInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

function computeExtrasBreakdown(innings) {
  if (!innings) return null;
  if (innings.extras && typeof innings.extras === "object") {
    const { wides = 0, noballs = 0, byes = 0, legbyes = 0, penalty = 0 } = innings.extras;
    const total = innings.extras.total ?? (wides + noballs + byes + legbyes + penalty);
    return { wides, noballs, byes, legbyes, penalty, total };
  }
  if (typeof innings.extras === "number") {
    return { total: innings.extras };
  }
  if (innings.total_runs != null && Array.isArray(innings.batting)) {
    const battedRuns = innings.batting.reduce((sum, b) => sum + (Number(b.runs) || 0), 0);
    return { total: Math.max(0, innings.total_runs - battedRuns) };
  }
  return null;
}

// Google & Cricbuzz Professional Theme Tokens
const FONT_DISPLAY = "'Inter', 'Outfit', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Roboto Mono', ui-monospace, SFMono-Regular, monospace";

const COLOR = {
  bg: "#0b0f17",
  surface: "#131a26",
  surfaceRaised: "#1c2536",
  heroGradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  border: "#232f45",
  borderStrong: "#334155",
  ink: "#f8fafc",
  inkDim: "#94a3b8",
  inkFaint: "#64748b",
  accent: "#10b981", // Cricbuzz Green
  accentGlow: "rgba(16, 185, 129, 0.2)",
  blue: "#38bdf8",   // Google Blue
  purple: "#a855f7", // 6 Boundary Purple
  red: "#ef4444",    // Wicket Red
  amber: "#f59e0b",  // Extra/Warning Amber
};

const BALL_COLORS = {
  wicket: { bg: "#ef4444", fg: "#ffffff", label: "W" },
  six: { bg: "#8b5cf6", fg: "#ffffff", label: "6" },
  boundary: { bg: "#10b981", fg: "#ffffff", label: "4" },
  noball: { bg: "#f59e0b", fg: "#000000", label: "NB" },
  wide: { bg: "#f59e0b", fg: "#000000", label: "WD" },
  extra: { bg: "rgba(245,158,11,0.2)", fg: "#f59e0b", label: "EX" },
  dot: { bg: "#1e293b", fg: "#64748b", label: "•" },
  single: { bg: "#334155", fg: "#f8fafc", label: "1" },
};

const WICKET_TYPES = ["bowled", "caught", "lbw", "run_out", "stumped", "hit_wicket", "other"];
const NEEDS_FIELDER = new Set(["caught", "run_out", "stumped"]);

const cardStyle = {
  backgroundColor: COLOR.surface,
  border: `1px solid ${COLOR.border}`,
  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.3)",
};

const BTN_TRANSITION = "transition-all duration-150 ease-out active:scale-[0.97]";

export default function ScoringApp({ user }) {
  const [view, setView] = useState("home");
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  const goHome = useCallback(() => {
    setActiveMatchId(null);
    setView("home");
    setHomeRefreshKey((k) => k + 1);
  }, []);

  return (
    <div
      className="max-w-2xl mx-auto space-y-5 px-2 py-3"
      style={{ backgroundColor: COLOR.bg, color: COLOR.ink, fontFamily: FONT_DISPLAY }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Outfit:wght@600;700;800&display=swap');

        @keyframes cb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.92); }
        }
        .cb-live-pulse { animation: cb-pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

        @keyframes cb-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cb-slide-down { animation: cb-slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {view !== "home" && (
        <div className="flex items-center justify-between pb-1">
          <button
            onClick={goHome}
            className={`text-xs font-bold flex items-center gap-2 ${BTN_TRANSITION} hover:text-emerald-400 py-2 px-3.5 rounded-xl shadow`}
            style={{ color: COLOR.ink, backgroundColor: COLOR.surface, border: `1px solid ${COLOR.border}` }}
          >
            <span style={{ fontFamily: FONT_MONO }}>←</span>
            <span>Back to Matches List</span>
          </button>

          <button
            onClick={() => {
              if (view === "scoreboard") setView("score");
              else if (view === "score") setView("toss");
              else if (view === "toss") setView("squads");
              else if (view === "squads") setView("new");
              else if (view === "edit") setView("score");
              else goHome();
            }}
            className={`text-xs font-bold flex items-center gap-1.5 ${BTN_TRANSITION} hover:text-sky-400 py-2 px-3.5 rounded-xl shadow`}
            style={{ color: COLOR.ink, backgroundColor: COLOR.surface, border: `1px solid ${COLOR.border}` }}
          >
            <span style={{ fontFamily: FONT_MONO }}>↩</span>
            <span>Back</span>
          </button>
        </div>
      )}

      {view === "home" && (
        <MatchHome
          user={user}
          key={homeRefreshKey}
          onScoreNew={() => setView("new")}
          onResume={(id, m) => {
            setActiveMatchId(id);
            if (m.status === "not_started") {
              setView(m.needs_squads ? "squads" : "toss");
            } else {
              setView("score");
            }
          }}
          onViewScoreboard={(id) => {
            setActiveMatchId(id);
            setView("scoreboard");
          }}
        />
      )}

      {view === "new" && (
        <NewMatchForm
          user={user}
          matchId={activeMatchId}
          onCreated={(id) => {
            setActiveMatchId(id);
            setView("squads");
          }}
          onCancel={goHome}
        />
      )}

      {view === "squads" && activeMatchId && (
        <SquadForm matchId={activeMatchId} onDone={() => setView("toss")} onBack={() => setView("new")} onCancel={goHome} />
      )}

      {view === "toss" && activeMatchId && (
        <TossForm matchId={activeMatchId} onDone={() => setView("score")} onBack={() => setView("squads")} onCancel={goHome} />
      )}

      {view === "edit" && activeMatchId && (
        <NewMatchForm
          user={user}
          matchId={activeMatchId}
          onUpdated={() => setView("score")}
          onCancel={() => setView("score")}
        />
      )}

      {view === "score" && activeMatchId && (
        <MatchLiveConsole user={user} matchId={activeMatchId} onChangeStage={(stage) => setView(stage)} onMatchComplete={() => setView("scoreboard")} />
      )}

      {view === "scoreboard" && activeMatchId && <FinalScoreboard matchId={activeMatchId} />}
    </div>
  );
}

function SetupProgress({ step }) {
  const steps = ["Match Setup", "Playing XI", "Toss", "Opening Players"];
  return (
    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                style={{
                  backgroundColor: done ? COLOR.accent : active ? COLOR.accentGlow : COLOR.surfaceRaised,
                  color: done ? "#000" : active ? COLOR.accent : COLOR.inkFaint,
                  border: active ? `1.5px solid ${COLOR.accent}` : `1px solid ${COLOR.border}`,
                  fontFamily: FONT_MONO,
                }}
              >
                {done ? "✓" : n}
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline"
                style={{ color: active ? COLOR.ink : COLOR.inkFaint }}
              >
                {label}
              </span>
            </div>
            {n < steps.length && (
              <div className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: done ? COLOR.accent : COLOR.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchHome({ user, onScoreNew, onResume, onViewScoreboard }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api("/api/matches")
      .then((json) => { if (!cancelled) setMatches(json); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const inProgress = matches?.filter((m) => m.status !== "completed") || [];
  const completed = matches?.filter((m) => m.status === "completed") || [];

  return (
    <div className="space-y-6">
      {/* Cricbuzz Header Banner */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl" style={cardStyle}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 cb-live-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">MatchConnect Live Engine</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Google & Cricbuzz Scoreboard</h2>
        </div>
        <button
          onClick={onScoreNew}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg ${BTN_TRANSITION}`}
          style={{ backgroundColor: COLOR.accent, color: "#000" }}
        >
          + New Match
        </button>
      </div>

      {error && (
        <div className="text-xs p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
          Could not load matches: {error}
        </div>
      )}

      {matches === null && !error && (
        <div className="flex items-center justify-center gap-3 p-8 text-xs text-slate-400">
          <span className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          Fetching live scores...
        </div>
      )}

      {matches !== null && matches.length === 0 && !error && (
        <div className="text-center p-8 rounded-2xl border border-dashed border-slate-700">
          <div className="text-4xl mb-2">🏏</div>
          <div className="text-sm font-bold text-slate-200 mb-1">No Active Matches</div>
          <p className="text-xs text-slate-400 mb-4">Start scoring a match to see live updates.</p>
          <button
            onClick={onScoreNew}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${BTN_TRANSITION}`}
            style={{ backgroundColor: COLOR.accent, color: "#000" }}
          >
            Create Match
          </button>
        </div>
      )}

      {/* Live & In Progress Section */}
      {inProgress.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 px-1">Live & Ongoing</div>
          {inProgress.map((m) => {
            const { display: oversDisplay } = formatOvers(m.current_innings_summary?.overs_completed ?? 0);
            const isCreator = !m.created_by || (user?.id && String(m.created_by) === String(user.id));
            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl space-y-3 relative overflow-hidden transition-all hover:border-emerald-500/40"
                style={cardStyle}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.status !== "not_started" ? (
                      <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 cb-live-pulse" /> LIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold">UPCOMING</span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">{m.venue || "T20 Match"}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{m.overs_limit} Overs</span>
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                      {teamInitials(m.team1_name)}
                    </div>
                    <span className="font-bold text-sm text-slate-100">{m.team1_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-slate-100">
                      {m.status === "not_started" ? "-" : `${m.current_innings_summary?.total_runs ?? 0}/${m.current_innings_summary?.wickets ?? 0}`}
                    </span>
                    {m.status !== "not_started" && (
                      <span className="text-xs text-slate-400 block font-mono">({oversDisplay} ov)</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    vs {m.team2_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isCreator && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Are you sure you want to delete "${m.team1_name} vs ${m.team2_name}"? This action cannot be undone.`)) return;
                          try {
                            await api(`/api/matches/${m.id}`, { method: "DELETE" });
                            setMatches((prev) => prev.filter((item) => item.id !== m.id));
                          } catch (err) {
                            alert(err.message || "Failed to delete match");
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 ${BTN_TRANSITION}`}
                      >
                        🗑️ Delete
                      </button>
                    )}
                    {isCreator ? (
                      <button
                        onClick={() => onResume(m.id, m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${BTN_TRANSITION}`}
                      >
                        {m.status === "not_started" ? "Setup XI & Toss" : "Resume Scoring ✍️"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onResume(m.id, m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 ${BTN_TRANSITION}`}
                      >
                        View Live Score 👁️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Section with Result Display & Delete for Creator */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 px-1">Completed Matches</div>
          {completed.map((m) => {
            const isCreator = !m.created_by || (user?.id && String(m.created_by) === String(user.id));
            return (
              <div
                key={m.id}
                onClick={() => onViewScoreboard(m.id)}
                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-slate-800/50 cursor-pointer ${BTN_TRANSITION}`}
                style={cardStyle}
              >
                <div>
                  <div className="font-bold text-sm text-slate-200 mb-1">{m.team1_name} vs {m.team2_name}</div>
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>{m.result || "Match completed"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCreator && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Are you sure you want to delete completed match "${m.team1_name} vs ${m.team2_name}"?`)) return;
                        try {
                          await api(`/api/matches/${m.id}`, { method: "DELETE" });
                          setMatches((prev) => prev.filter((item) => item.id !== m.id));
                        } catch (err) {
                          alert(err.message || "Failed to delete match");
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 ${BTN_TRANSITION}`}
                    >
                      🗑️ Delete
                    </button>
                  )}
                  <span className="text-xs text-sky-400 font-bold underline shrink-0">Full Scorecard →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewMatchForm({ user, matchId, onCreated, onUpdated, onCancel }) {
  const [team1Name, setTeam1Name] = useState(user?.team_name || "");
  const [team2Name, setTeam2Name] = useState("");
  const [venue, setVenue] = useState("");
  const [oversLimit, setOversLimit] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (matchId) {
      Promise.all([
        api(`/api/matches/${matchId}/squads`).catch(() => null),
        api(`/api/matches/${matchId}/live`).catch(() => null),
      ]).then(([sq, lv]) => {
        const t1 = lv?.match?.team1_name || sq?.team1?.name;
        const t2 = lv?.match?.team2_name || sq?.team2?.name;
        const v = lv?.match?.venue;
        const o = lv?.match?.overs_limit;

        if (t1) setTeam1Name(t1);
        if (t2) setTeam2Name(t2);
        if (v !== undefined) setVenue(v || "");
        if (o) setOversLimit(o);
      }).catch(() => {});
    }
  }, [matchId]);

  const canSubmit = team1Name.trim() && team2Name.trim() && oversLimit > 0 && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (matchId) {
        await api(`/api/matches/${matchId}/update`, {
          method: "POST",
          body: JSON.stringify({
            team1_name: team1Name.trim(),
            team2_name: team2Name.trim(),
            venue: venue.trim() || undefined,
            overs_limit: Number(oversLimit),
          }),
        });
        if (onUpdated) onUpdated();
        else if (onCreated) onCreated(matchId);
      } else {
        const res = await api("/api/matches", {
          method: "POST",
          body: JSON.stringify({
            team1_name: team1Name.trim(),
            team2_name: team2Name.trim(),
            venue: venue.trim() || undefined,
            overs_limit: Number(oversLimit),
          }),
        });
        onCreated(res.match_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 p-5 rounded-2xl" style={cardStyle}>
      <SetupProgress step={1} />
      <h3 className="text-lg font-extrabold text-white">
        {matchId ? "Edit Match Details & Overs" : "Create New Cricket Match"}
      </h3>

      {error && <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Team 1 (Batting first / Home)</label>
            <input
              type="text"
              value={team1Name}
              onChange={(e) => setTeam1Name(e.target.value)}
              placeholder="e.g. Royal Challengers"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Team 2 (Opponent)</label>
            <input
              type="text"
              value={team2Name}
              onChange={(e) => setTeam2Name(e.target.value)}
              placeholder="e.g. Super Kings"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Venue / Ground</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Eden Gardens"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Overs Per Innings</label>
            <input
              type="number"
              min="1"
              max="50"
              value={oversLimit}
              onChange={(e) => setOversLimit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-mono outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-black disabled:opacity-40 ${BTN_TRANSITION}`}
          >
            {submitting ? "Saving..." : matchId ? "Save Match Updates ✓" : "Next: Playing XI →"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function findDuplicates(playerList) {
  const seen = new Set();
  const duplicates = new Set();
  for (const name of playerList) {
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      duplicates.add(name);
    } else {
      seen.add(lower);
    }
  }
  return Array.from(duplicates);
}

function SquadForm({ matchId, onDone, onBack, onCancel }) {
  const [t1Players, setT1Players] = useState("");
  const [t2Players, setT2Players] = useState("");
  const [existingSquads, setExistingSquads] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/api/matches/${matchId}/squads`).then((sq) => {
      setExistingSquads(sq);
      if (sq?.team1?.players?.length) {
        setT1Players(sq.team1.players.map((p) => p.name).join("\n"));
      }
      if (sq?.team2?.players?.length) {
        setT2Players(sq.team2.players.map((p) => p.name).join("\n"));
      }
    }).catch(() => {});
  }, [matchId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const p1 = t1Players.split("\n").map((s) => s.trim()).filter(Boolean);
    const p2 = t2Players.split("\n").map((s) => s.trim()).filter(Boolean);

    const dupes1 = findDuplicates(p1);
    const dupes2 = findDuplicates(p2);

    if (dupes1.length > 0 || dupes2.length > 0) {
      const msgs = [];
      if (dupes1.length > 0) msgs.push(`Team 1 duplicate names: "${dupes1.join(", ")}"`);
      if (dupes2.length > 0) msgs.push(`Team 2 duplicate names: "${dupes2.join(", ")}"`);
      setError(`⚠️ Duplicate player names are not allowed! Please remove duplicates: ${msgs.join(" | ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const updatedSq = await api(`/api/matches/${matchId}/squads`, {
        method: "POST",
        body: JSON.stringify({ team1_players: p1, team2_players: p2 }),
      });
      setExistingSquads(updatedSq);
      setSuccessMsg("✓ Playing XI Squads updated & saved to database successfully!");
      setTimeout(() => {
        onDone();
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const team1Title = existingSquads?.team1?.name || "Team 1";
  const team2Title = existingSquads?.team2?.name || "Team 2";

  return (
    <div className="space-y-4 p-5 rounded-2xl" style={cardStyle}>
      <SetupProgress step={2} />
      <h3 className="text-lg font-extrabold text-white flex items-center justify-between">
        <span>Playing XI Squads</span>
      </h3>

      <p className="text-xs text-slate-400">Enter or edit player names (one per line) for each team.</p>

      {successMsg && (
        <div className="text-xs p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold">
          {successMsg}
        </div>
      )}

      {error && <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-emerald-400 block mb-1">{team1Title} Roster</label>
            <textarea
              rows="6"
              value={t1Players}
              onChange={(e) => setT1Players(e.target.value)}
              placeholder="Virat Kohli&#10;Rohit Sharma&#10;KL Rahul"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-sky-400 block mb-1">{team2Title} Roster</label>
            <textarea
              rows="6"
              value={t2Players}
              onChange={(e) => setT2Players(e.target.value)}
              placeholder="Steve Smith&#10;David Warner&#10;Pat Cummins"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 hover:text-white"
            >
              ← Back to Details
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-black ${BTN_TRANSITION}`}
          >
            {submitting ? "Saving Squads..." : "Save Squads & Next: Toss →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TossForm({ matchId, onDone, onBack, onCancel }) {
  const [squads, setSquads] = useState(null);
  const [tossWinner, setTossWinner] = useState("team1");
  const [decision, setDecision] = useState("bat");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api(`/api/matches/${matchId}/squads`),
      api(`/api/matches/${matchId}/live`),
    ]).then(([sq, lv]) => {
      setSquads(sq);
      if (lv?.match?.toss_winner_team) setTossWinner(lv.match.toss_winner_team);
      if (lv?.match?.toss_decision) setDecision(lv.match.toss_decision);
    }).catch(() => {});
  }, [matchId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/matches/${matchId}/toss`, {
        method: "POST",
        body: JSON.stringify({ toss_winner_team: tossWinner, toss_decision: decision }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const team1Name = squads?.team1?.name || "Team 1";
  const team2Name = squads?.team2?.name || "Team 2";

  return (
    <div className="space-y-4 p-5 rounded-2xl" style={cardStyle}>
      <SetupProgress step={3} />
      <h3 className="text-lg font-extrabold text-white">Toss Decision</h3>

      {error && <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2">Who won the toss?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTossWinner("team1")}
              className={`p-3 rounded-xl text-xs font-bold border ${BTN_TRANSITION}`}
              style={{
                backgroundColor: tossWinner === "team1" ? COLOR.accentGlow : COLOR.surfaceRaised,
                color: tossWinner === "team1" ? COLOR.accent : COLOR.ink,
                borderColor: tossWinner === "team1" ? COLOR.accent : COLOR.border,
              }}
            >
              {team1Name}
            </button>
            <button
              type="button"
              onClick={() => setTossWinner("team2")}
              className={`p-3 rounded-xl text-xs font-bold border ${BTN_TRANSITION}`}
              style={{
                backgroundColor: tossWinner === "team2" ? COLOR.accentGlow : COLOR.surfaceRaised,
                color: tossWinner === "team2" ? COLOR.accent : COLOR.ink,
                borderColor: tossWinner === "team2" ? COLOR.accent : COLOR.border,
              }}
            >
              {team2Name}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2">Elected to?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision("bat")}
              className={`p-3 rounded-xl text-xs font-bold border ${BTN_TRANSITION}`}
              style={{
                backgroundColor: decision === "bat" ? "rgba(56, 189, 248, 0.15)" : COLOR.surfaceRaised,
                color: decision === "bat" ? COLOR.blue : COLOR.ink,
                borderColor: decision === "bat" ? COLOR.blue : COLOR.border,
              }}
            >
              Bat First 🏏
            </button>
            <button
              type="button"
              onClick={() => setDecision("bowl")}
              className={`p-3 rounded-xl text-xs font-bold border ${BTN_TRANSITION}`}
              style={{
                backgroundColor: decision === "bowl" ? "rgba(56, 189, 248, 0.15)" : COLOR.surfaceRaised,
                color: decision === "bowl" ? COLOR.blue : COLOR.ink,
                borderColor: decision === "bowl" ? COLOR.blue : COLOR.border,
              }}
            >
              Bowl First ⚾
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-3 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 hover:text-white"
            >
              ← Edit Squads
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-1 py-3 rounded-xl font-extrabold text-sm bg-emerald-500 text-black shadow-lg ${BTN_TRANSITION}`}
          >
            {submitting ? "Saving Toss..." : "Select Opening Lineup ➔"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   GOOGLE & CRICBUZZ MATCH LIVE CONSOLE
   ============================================================================ */
function MatchLiveConsole({ user, matchId, onChangeStage, onMatchComplete }) {
  const [squads, setSquads] = useState(null);
  const [live, setLive] = useState(null);
  const [prompts, setPrompts] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [extraPicker, setExtraPicker] = useState(null);
  const [wicketPanelOpen, setWicketPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [activeTab, setActiveTab] = useState("live"); // live | scorecard | commentary | squads
  const toastTimerRef = useRef(null);

  const loadScorecard = useCallback(async () => {
    try {
      const sc = await api(`/api/matches/${matchId}/scoreboard`);
      setScorecard(sc);
    } catch {}
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sq, lv] = await Promise.all([
          api(`/api/matches/${matchId}/squads`),
          api(`/api/matches/${matchId}/live`),
        ]);
        if (cancelled) return;
        setSquads(sq);
        setLive(lv);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    loadScorecard();
    return () => { cancelled = true; };
  }, [matchId, loadScorecard]);

  async function runAction(path, body) {
    setBusy(true);
    setError(null);
    try {
      const json = await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      setLive(json);
      setPrompts(json.prompts || null);
      // Non-blocking background sync for scorecard & squads so scoring responds instantly (0ms delay)
      setTimeout(() => {
        loadScorecard();
      }, 0);
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  function recordBall({ runs = 0, extra_type = null, extra_runs = 0, is_wicket = false, wicket_type = null, dismissed_player_id = null, fielder_id = null }) {
    const activeBatters = live?.batting?.filter((b) => !b.is_out) || [];
    const striker_id = activeBatters.find((b) => b.is_on_strike)?.player_id || activeBatters[0]?.player_id;
    const non_striker_id = activeBatters.find((b) => !b.is_on_strike)?.player_id || activeBatters[1]?.player_id || activeBatters[0]?.player_id;
    const bowler_id = live?.bowling?.find((b) => b.is_current)?.player_id || live?.bowling?.[0]?.player_id;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    let toastMsg = null;
    if (is_wicket) toastMsg = { text: "WICKET!", color: COLOR.red };
    else if (Number(runs) === 6) toastMsg = { text: "SIX!", color: COLOR.purple };
    else if (Number(runs) === 4) toastMsg = { text: "FOUR!", color: COLOR.accent };

    if (toastMsg) {
      setToast(toastMsg);
      toastTimerRef.current = setTimeout(() => setToast(null), 1400);
    }

    // Optimistic UI update for instant click feedback
    if (live && live.current_innings) {
      const extraR = Number(extra_runs || 0);
      const totalR = Number(runs) + extraR;
      const isLegal = extra_type !== "wide" && extra_type !== "noball";

      setLive((prev) => {
        if (!prev || !prev.current_innings) return prev;
        const currentBatters = prev.batting || [];
        const currentBowlers = prev.bowling || [];

        const updatedBatters = currentBatters.map((b) => {
          if (b.player_id === striker_id) {
            const isWide = extra_type === "wide";
            const addRuns = ["bye", "legbye", "wide"].includes(extra_type) ? 0 : Number(runs);
            return {
              ...b,
              runs: b.runs + addRuns,
              balls_faced: isWide ? b.balls_faced : b.balls_faced + 1,
              fours: addRuns === 4 ? b.fours + 1 : b.fours,
              sixes: addRuns === 6 ? b.sixes + 1 : b.sixes,
            };
          }
          return b;
        });

        return {
          ...prev,
          current_innings: {
            ...prev.current_innings,
            total_runs: prev.current_innings.total_runs + totalR,
            wickets: prev.current_innings.wickets + (is_wicket ? 1 : 0),
          },
          batting: updatedBatters,
        };
      });
    }

    runAction(`/api/matches/${matchId}/balls`, {
      runs, extra_type, extra_runs, is_wicket, wicket_type, dismissed_player_id, fielder_id,
      striker_id, non_striker_id, bowler_id,
    }).catch(() => {});
    setExtraPicker(null);
    setWicketPanelOpen(false);
  }

  async function completeMatch() {
    const result = window.prompt("Match Summary Result (e.g. 'Royal Challengers won by 18 runs'):");
    if (result === null) return;
    setBusy(true);
    try {
      await api(`/api/matches/${matchId}/complete`, { method: "POST", body: JSON.stringify({ result }) });
      onMatchComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addPlayer(teamKey, name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existingTeam = teamKey === "team1_players" ? squads?.team1 : squads?.team2;
    const existing = existingTeam?.players?.find(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.id;
    const result = await api(`/api/matches/${matchId}/squads`, {
      method: "POST",
      body: JSON.stringify({ [teamKey]: [trimmed] }),
    });
    setSquads(result);
    const teamObj = teamKey === "team1_players" ? result.team1 : result.team2;
    return teamObj.players[teamObj.players.length - 1]?.id || null;
  }

  if (error) return <div className="text-xs p-4 bg-red-500/10 text-red-400 rounded-xl">Error: {error}</div>;
  if (!squads || !live) return <div className="text-xs text-slate-400 p-6">Loading Match Console...</div>;

  const { match, current_innings, batting, bowling, recent_balls } = live;

  // Determine if the current logged in user is the owner/creator of this match
  const isCreator = !match?.created_by || (user?.id && String(match?.created_by) === String(user.id));

  if (!live.current_innings) {
    if (!isCreator) {
      return (
        <div className="p-6 rounded-2xl text-center space-y-2" style={cardStyle}>
          <div className="text-2xl">⏳</div>
          <div className="text-sm font-bold text-slate-200">Match Setup Pending</div>
          <p className="text-xs text-slate-400">The match creator has not started the first innings yet.</p>
        </div>
      );
    }
    return (
      <OpeningSelectors
        squads={squads}
        match={live.match}
        onStart={(payload) => runAction(`/api/matches/${matchId}/start-innings`, payload)}
        onAddPlayer={addPlayer}
        busy={busy}
      />
    );
  }

  if (prompts?.needs_new_batsman) {
    if (!isCreator) {
      return (
        <div className="p-6 rounded-2xl text-center space-y-2" style={cardStyle}>
          <div className="text-2xl">🏏</div>
          <div className="text-sm font-bold text-slate-200">Wicket Fallen</div>
          <p className="text-xs text-slate-400">Waiting for the match scorer to select the next batter...</p>
        </div>
      );
    }
    const battingIsTeam1 = live.match.batting_team === live.match.team1_name;
    const battingSquad = battingIsTeam1 ? squads.team1 : squads.team2;
    const battingKey = battingIsTeam1 ? "team1_players" : "team2_players";
    const onCrease = new Set(live.batting.map((b) => b.player_id));
    const available = (battingSquad?.players || []).filter((p) => !onCrease.has(p.id));
    return (
      <PlayerPicker
        title="Select Next Batter"
        players={available}
        onPick={(id) => runAction(`/api/matches/${matchId}/new-batsman`, { player_id: id }).catch(() => {})}
        onAddNew={(name) => addPlayer(battingKey, name)}
        busy={busy}
      />
    );
  }

  if (prompts?.needs_new_bowler) {
    if (!isCreator) {
      return (
        <div className="p-6 rounded-2xl text-center space-y-2" style={cardStyle}>
          <div className="text-2xl">⚾</div>
          <div className="text-sm font-bold text-slate-200">End of Over</div>
          <p className="text-xs text-slate-400">Waiting for the match scorer to select the next bowler...</p>
        </div>
      );
    }
    const bowlingIsTeam1 = live.match.bowling_team === live.match.team1_name;
    const bowlingSquad = bowlingIsTeam1 ? squads.team1 : squads.team2;
    const bowlingKey = bowlingIsTeam1 ? "team1_players" : "team2_players";
    const lastBowlerId = live.bowling.find((b) => b.is_current)?.player_id;
    const available = (bowlingSquad?.players || []).filter((p) => p.id !== lastBowlerId);
    return (
      <PlayerPicker
        title="Select Bowler for Next Over"
        players={available}
        onPick={(id) => runAction(`/api/matches/${matchId}/select-bowler`, { bowler_id: id }).catch(() => {})}
        onAddNew={(name) => addPlayer(bowlingKey, name)}
        busy={busy}
      />
    );
  }

  const inningsOvers = formatOvers(current_innings.overs_completed || 0);
  const crr = inningsOvers.trueDecimal > 0
    ? (current_innings.total_runs / inningsOvers.trueDecimal).toFixed(2)
    : "0.00";

  const currentBowler = bowling.find((b) => b.is_current);

  return (
    <div className="space-y-4">
      {/* Google & Cricbuzz Hero Match Header */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden space-y-4"
        style={{ background: COLOR.heroGradient, border: `1px solid ${COLOR.border}` }}
      >
        {toast && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider z-20 shadow-lg cb-slide-down"
            style={{ backgroundColor: toast.color, color: "#000" }}
          >
            {toast.text}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-extrabold text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 cb-live-pulse" /> LIVE
            </span>
            <span className="font-semibold text-slate-300">{match.venue || "Stadium"}</span>
          </div>
          <span className="font-mono text-slate-400">{match.overs_limit} Overs Match</span>
        </div>

        {/* Score & Teams */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">
              {match.batting_team} Batting
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black font-mono tracking-tight text-white">
                {current_innings.total_runs}<span className="text-2xl text-slate-400">/{current_innings.wickets}</span>
              </span>
              <span className="text-sm font-bold text-slate-400 font-mono">
                ({inningsOvers.display} / {match.overs_limit} ov)
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs font-mono text-slate-300">
              CRR: <span className="font-bold text-emerald-400">{crr}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
              vs {match.bowling_team}
            </div>
          </div>
        </div>

        {/* Mode Indicator Banner & Quick Setup Editors */}
        <div className="text-[11px] font-semibold text-slate-400 pt-1 flex items-center justify-between border-t border-slate-700/40">
          {isCreator ? (
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                ✍️ Scorer Console
              </span>
                {onChangeStage && (
                  <button
                    onClick={() => onChangeStage("edit")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 ${BTN_TRANSITION}`}
                  >
                    ⚙️ Edit Overs
                  </button>
                )}
            </div>
          ) : (
            <span className="text-sky-400 font-bold flex items-center gap-1">
              👁️ Viewer Mode — Auto Live Updates
            </span>
          )}
        </div>

        {/* Cricbuzz Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-700/60 pt-3 overflow-x-auto">
          {[
            { id: "live", label: isCreator ? "Overview & Scorer" : "Live Overview" },
            { id: "scorecard", label: "Full Scorecard" },
            { id: "commentary", label: "Ball-by-Ball" },
            { id: "squads", label: "Playing XI" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${BTN_TRANSITION}`}
              style={{
                backgroundColor: activeTab === tab.id ? COLOR.accent : "transparent",
                color: activeTab === tab.id ? "#000" : COLOR.inkDim,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & SCORER CONSOLE */}
      {activeTab === "live" && (
        <div className="space-y-4">
          {/* This Over Strip (Google Style) */}
          <div className="p-4 rounded-2xl space-y-2" style={cardStyle}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-extrabold uppercase tracking-wider">This Over Timeline</span>
              {currentBowler && <span className="font-mono text-emerald-400">Bowler: {currentBowler.name}</span>}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {recent_balls.map((raw, i) => {
                const b = classifyBall(raw);
                const colorDef = BALL_COLORS[b.type] || BALL_COLORS.single;
                return (
                  <div
                    key={raw.id ?? i}
                    className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 font-mono shadow"
                    style={{ backgroundColor: colorDef.bg, color: colorDef.fg }}
                  >
                    {b.val}
                  </div>
                );
              })}
              {recent_balls.length === 0 && (
                <span className="text-xs text-slate-500 italic">No balls bowled yet in this over.</span>
              )}
            </div>
          </div>

          {/* Active Batsmen & Bowler Cards (Exactly 2 active crease batters: Striker & Non-Striker) */}
          <div className="grid grid-cols-2 gap-3">
            {batting
              .filter((b) => !b.is_out)
              .slice(0, 2)
              .map((b) => {
              const sr = b.balls_faced > 0 ? ((b.runs / b.balls_faced) * 100).toFixed(1) : "0.0";
              return (
                <div
                  key={b.player_id}
                  className="p-3.5 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: b.is_on_strike ? COLOR.surfaceRaised : COLOR.surface,
                    borderColor: b.is_on_strike ? COLOR.accent : COLOR.border,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      {b.is_on_strike && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                      {b.name}
                    </span>
                    {b.is_on_strike ? (
                      <span className="text-[9px] font-black text-emerald-400 uppercase">STRIKE</span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 uppercase">NON-STRIKER</span>
                    )}
                  </div>
                  <div className="text-base font-black font-mono text-slate-100">
                    {b.runs} <span className="text-xs text-slate-400 font-normal">({b.balls_faced}b)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">SR: {sr}</div>
                </div>
              );
            })}

            {bowling.filter((b) => b.is_current).map((b) => {
              const bOvers = correctBuggyBowlerOvers(b.overs_bowled);
              const er = bOvers.trueDecimal > 0 ? (b.runs_conceded / bOvers.trueDecimal).toFixed(2) : "0.00";
              return (
                <div key={b.player_id} className="p-3.5 rounded-2xl border border-sky-500/40 bg-slate-900 col-span-2">
                  <div className="text-xs font-bold text-sky-400 mb-1">Current Bowler: {b.name}</div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>{bOvers.display} Overs</span>
                    <span>{b.wickets} Wkts</span>
                    <span>{b.runs_conceded} Runs</span>
                    <span className="text-sky-400 font-bold">ER {er}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* INTERIOR SCORER CONTROL PANEL (ONLY VISIBLE TO MATCH CREATOR) */}
          {isCreator && (
            <div className="p-4 rounded-2xl space-y-3" style={{ ...cardStyle, borderColor: COLOR.accent }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Scorer Controls</span>
                <button
                  onClick={() => runAction(`/api/matches/${matchId}/balls/undo`).catch(() => {})}
                  disabled={busy}
                  className={`px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 ${BTN_TRANSITION}`}
                >
                  ↩ Undo Ball
                </button>
              </div>

              {/* Run Buttons */}
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <button
                    key={r}
                    disabled={busy}
                    onClick={() => recordBall({ runs: r })}
                    className={`py-3 rounded-xl font-black text-sm font-mono shadow ${BTN_TRANSITION}`}
                    style={{
                      backgroundColor: r === 6 ? COLOR.purple : r === 4 ? COLOR.accent : COLOR.surfaceRaised,
                      color: r === 6 || r === 4 ? "#ffffff" : COLOR.ink,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Extras Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {["wide", "noball", "bye", "legbye"].map((t) => (
                  <button
                    key={t}
                    disabled={busy}
                    onClick={() => setExtraPicker(t)}
                    className={`py-2 rounded-xl text-xs font-bold border border-amber-500/40 text-amber-400 bg-amber-500/10 ${BTN_TRANSITION}`}
                  >
                    {t === "noball" ? "No Ball" : t === "legbye" ? "Leg Bye" : t.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Wicket Button */}
              <button
                disabled={busy}
                onClick={() => setWicketPanelOpen(true)}
                className={`w-full py-3 rounded-xl font-extrabold text-sm bg-red-500 text-white shadow-lg ${BTN_TRANSITION}`}
              >
                OUT / WICKET 🔴
              </button>

              {extraPicker && (
                <ExtraRunsPicker
                  extraType={extraPicker}
                  onCancel={() => setExtraPicker(null)}
                  onConfirm={(extraRuns) => recordBall({ runs: 0, extra_type: extraPicker, extra_runs: extraRuns })}
                />
              )}

              {wicketPanelOpen && (
                <WicketPanel
                  batting={batting}
                  fieldingSquad={match.bowling_team === match.team1_name ? squads.team1 : squads.team2}
                  onCancel={() => setWicketPanelOpen(false)}
                  onConfirm={(payload) => recordBall({ runs: 0, is_wicket: true, ...payload })}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FULL SCORECARD */}
      {activeTab === "scorecard" && (
        <div className="space-y-4">
          <ScorecardView scorecard={scorecard} live={live} squads={squads} />
        </div>
      )}

      {/* TAB 3: BALL-BY-BALL COMMENTARY */}
      {activeTab === "commentary" && (
        <div className="p-4 rounded-2xl space-y-3" style={cardStyle}>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Live Delivery Log</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recent_balls.slice().reverse().map((b, idx) => {
              const ballClass = classifyBall(b);
              const badge = BALL_COLORS[ballClass.type] || BALL_COLORS.single;
              return (
                <div key={b.id || idx} className="p-3 rounded-xl bg-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full font-bold flex items-center justify-center font-mono"
                      style={{ backgroundColor: badge.bg, color: badge.fg }}
                    >
                      {ballClass.val}
                    </span>
                    <span className="text-slate-300 font-mono">
                      {b.extra_type ? `Extra (${b.extra_type})` : b.is_wicket ? `Wicket (${b.wicket_type || "Out"})` : `${b.runs} runs scored`}
                    </span>
                  </div>
                </div>
              );
            })}
            {recent_balls.length === 0 && (
              <div className="text-xs text-slate-500 py-4 text-center">No commentary available for this over.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SQUADS */}
      {activeTab === "squads" && (
        <div className="space-y-4">
          <SquadsView squads={squads} match={match} />
        </div>
      )}

      {/* Complete Match Button (ONLY VISIBLE TO CREATOR) */}
      {isCreator && (
        <button
          onClick={completeMatch}
          disabled={busy}
          className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 ${BTN_TRANSITION}`}
        >
          Finish & Complete Match
        </button>
      )}
    </div>
  );
}

function ScorecardView({ scorecard, live, squads }) {
  if (!scorecard && !live) return <div className="text-xs text-slate-400 p-4">Loading scorecard...</div>;
  const currentInningsSc = scorecard?.innings?.find((i) => i.innings_number === live?.current_innings?.inning_number) || scorecard?.innings?.[0];
  const batters = live?.batting?.length ? live.batting : (currentInningsSc?.batting || []);
  const bowlers = live?.bowling?.length ? live.bowling : (currentInningsSc?.bowling || []);
  const fow = live?.fall_of_wickets ?? currentInningsSc?.fall_of_wickets ?? [];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl" style={cardStyle}>
        <div className="text-xs font-bold text-emerald-400 mb-2 uppercase">Batting Scorecard</div>
        <BattingTable batters={batters} />
      </div>

      <div className="p-4 rounded-2xl" style={cardStyle}>
        <div className="text-xs font-bold text-sky-400 mb-2 uppercase">Bowling Figures</div>
        <BowlingTable bowlers={bowlers} />
      </div>

      {/* Fall of Wickets rendered directly below Bowling Table */}
      <FallOfWicketsCard fow={fow} />
    </div>
  );
}

function FallOfWicketsCard({ fow }) {
  if (!fow || fow.length === 0) {
    return (
      <div className="p-4 rounded-2xl space-y-2" style={cardStyle}>
        <div className="text-xs font-extrabold text-red-400 uppercase tracking-wider">Fall of Wickets</div>
        <div className="text-xs text-slate-500 font-mono italic">No wickets have fallen yet.</div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl space-y-2" style={cardStyle}>
      <div className="text-xs font-extrabold text-red-400 uppercase tracking-wider">Fall of Wickets</div>
      <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
        {fow.map((w, idx) => (
          <div
            key={w.wicket_num || idx}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2"
          >
            <span className="font-extrabold text-red-400">{w.wicket_num}-{w.score}</span>
            <span className="text-slate-300 font-sans text-xs">({w.player_name}, {w.overs_display} ov)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SquadsView({ squads, match }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-4 rounded-2xl space-y-2" style={cardStyle}>
        <h4 className="text-xs font-extrabold text-emerald-400 uppercase">{match?.team1_name || "Team 1"} XI</h4>
        <div className="space-y-1">
          {squads?.team1?.players?.map((p, idx) => (
            <div key={p.id || idx} className="text-xs text-slate-300 font-medium py-1 border-b border-slate-800/60">
              {idx + 1}. {p.name}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl space-y-2" style={cardStyle}>
        <h4 className="text-xs font-extrabold text-sky-400 uppercase">{match?.team2_name || "Team 2"} XI</h4>
        <div className="space-y-1">
          {squads?.team2?.players?.map((p, idx) => (
            <div key={p.id || idx} className="text-xs text-slate-300 font-medium py-1 border-b border-slate-800/60">
              {idx + 1}. {p.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExtraRunsPicker({ extraType, onCancel, onConfirm }) {
  const lbl = extraType.toUpperCase();
  const hasBaseRun = extraType === "wide" || extraType === "noball";
  const baseRun = hasBaseRun ? 1 : 0;

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-3">
      <div className="text-xs font-bold text-amber-400">Additional Runs for {lbl}?</div>
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((add) => {
          const total = baseRun + add;
          return (
            <button
              key={add}
              onClick={() => onConfirm(total)}
              className={`py-2 rounded-lg text-xs font-mono font-bold bg-slate-800 text-white hover:bg-emerald-500 hover:text-black ${BTN_TRANSITION}`}
            >
              +{add}
            </button>
          );
        })}
      </div>
      <button onClick={onCancel} className="text-xs text-slate-400 underline">Cancel</button>
    </div>
  );
}

function WicketPanel({ batting, fieldingSquad, onCancel, onConfirm }) {
  const activeBatters = batting.filter((b) => !b.is_out);
  const [wicketType, setWicketType] = useState("bowled");
  const [dismissedId, setDismissedId] = useState(
    activeBatters.find((b) => b.is_on_strike)?.player_id || activeBatters[0]?.player_id || null
  );
  const [fielderId, setFielderId] = useState(null);

  const needsFielder = wicketType && NEEDS_FIELDER.has(wicketType);
  const canConfirm = wicketType && dismissedId && (!needsFielder || fielderId);
  const fielders = fieldingSquad?.players || [];

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-red-500/40 space-y-4 shadow-xl">
      <div className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center justify-between">
        <span>🔴 Record Wicket / Dismissal</span>
        <span className="text-[10px] text-slate-400 font-mono font-normal">Select Wicket Type</span>
      </div>

      {/* 1. Dismissal Type */}
      <div>
        <label className="text-[11px] font-bold text-slate-300 block mb-1.5">How was the batter dismissed?</label>
        <div className="grid grid-cols-3 gap-2">
          {WICKET_TYPES.map((t) => {
            const isPicked = wicketType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setWicketType(t)}
                className={`py-2 px-1 rounded-lg text-xs font-bold capitalize transition-all ${BTN_TRANSITION}`}
                style={{
                  backgroundColor: isPicked ? COLOR.red : COLOR.surfaceRaised,
                  color: isPicked ? "#fff" : COLOR.ink,
                  border: isPicked ? "none" : `1px solid ${COLOR.border}`,
                }}
              >
                {t.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dismissed Player */}
      <div>
        <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Who is out?</label>
        <div className="flex gap-2 flex-wrap">
          {activeBatters.map((b) => {
            const isPicked = dismissedId === b.player_id;
            return (
              <button
                key={b.player_id}
                type="button"
                onClick={() => setDismissedId(b.player_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${BTN_TRANSITION}`}
                style={{
                  backgroundColor: isPicked ? COLOR.red : COLOR.surfaceRaised,
                  color: isPicked ? "#fff" : COLOR.ink,
                  border: isPicked ? "none" : `1px solid ${COLOR.border}`,
                }}
              >
                {b.name} {b.is_on_strike ? "(Striker)" : "(Non-Striker)"} {isPicked ? "✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Fielder Picker (Caught, Run Out, Stumped) */}
      {needsFielder && (
        <div className="pt-2 border-t border-slate-800">
          <label className="text-[11px] font-bold text-amber-400 block mb-1.5">
            Select Fielder ({wicketType.replace("_", " ")}) *:
          </label>
          {fielders.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap max-h-28 overflow-y-auto">
              {fielders.map((f) => {
                const isPicked = fielderId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFielderId(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${BTN_TRANSITION}`}
                    style={{
                      backgroundColor: isPicked ? COLOR.amber : COLOR.surfaceRaised,
                      color: isPicked ? "#000" : COLOR.ink,
                      border: isPicked ? "none" : `1px solid ${COLOR.border}`,
                    }}
                  >
                    {f.name} {isPicked ? "✓" : ""}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No fielding squad roster available.</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2 border-t border-slate-800">
        <button
          disabled={!canConfirm}
          onClick={() => onConfirm({ wicket_type: wicketType, dismissed_player_id: dismissedId, fielder_id: fielderId })}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-500 text-white disabled:opacity-40 shadow-lg ${BTN_TRANSITION}`}
        >
          Confirm Wicket
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function dedupePlayers(list = []) {
  const seen = new Set();
  return list.filter((p) => {
    const lower = p.name ? p.name.trim().toLowerCase() : "";
    if (!lower || seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function OpeningSelectors({ squads, match, onStart, onAddPlayer, busy }) {
  const battingIsTeam1 = match?.batting_team === match?.team1_name;
  const rawBattingTeam = battingIsTeam1 ? squads.team1 : squads.team2;
  const rawBowlingTeam = battingIsTeam1 ? squads.team2 : squads.team1;

  const battingPlayers = dedupePlayers(rawBattingTeam?.players || []);
  const bowlingPlayers = dedupePlayers(rawBowlingTeam?.players || []);

  const [striker, setStriker] = useState(null);
  const [strikerName, setStrikerName] = useState("");
  const [nonStriker, setNonStriker] = useState(null);
  const [nonStrikerName, setNonStrikerName] = useState("");
  const [bowler, setBowler] = useState(null);
  const [bowlerName, setBowlerName] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const canStart =
    (striker || strikerName.trim()) &&
    (nonStriker || nonStrikerName.trim()) &&
    (bowler || bowlerName.trim());

  async function resolveId(existingId, name, teamKey) {
    if (existingId) return existingId;
    const trimmed = name.trim();
    if (!trimmed) return null;
    return await onAddPlayer(teamKey, trimmed);
  }

  async function handleSubmit() {
    setError(null);
    const finalStrikerName = striker ? battingPlayers.find((p) => p.id === striker)?.name : strikerName.trim();
    const finalNonStrikerName = nonStriker ? battingPlayers.find((p) => p.id === nonStriker)?.name : nonStrikerName.trim();
    const finalBowlerName = bowler ? bowlingPlayers.find((p) => p.id === bowler)?.name : bowlerName.trim();

    if (finalStrikerName && finalNonStrikerName && finalStrikerName.toLowerCase() === finalNonStrikerName.toLowerCase()) {
      setError("Striker and Non-Striker cannot be the same player!");
      return;
    }

    setStarting(true);
    try {
      const [strikerId, nonStrikerId, bowlerId] = await Promise.all([
        resolveId(striker, strikerName, battingIsTeam1 ? "team1_players" : "team2_players"),
        resolveId(nonStriker, nonStrikerName, battingIsTeam1 ? "team1_players" : "team2_players"),
        resolveId(bowler, bowlerName, battingIsTeam1 ? "team2_players" : "team1_players"),
      ]);
      await onStart({
        innings_number: 1,
        batting_team: match.batting_team,
        striker_id: strikerId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
      });
    } catch (err) {
      setError(err.message || "Failed to start innings");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="p-5 rounded-2xl space-y-5 animate-fadeIn" style={cardStyle}>
      <SetupProgress step={4} />

      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>🏏</span> Opening Lineup Setup
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select opening batters for <span className="text-emerald-400 font-semibold">{rawBattingTeam?.name}</span> and bowler for <span className="text-sky-400 font-semibold">{rawBowlingTeam?.name}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
          <span>⚡ Live Ready</span>
        </div>
      </div>

      {error && (
        <div className="text-xs p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Striker */}
        <OpeningPlayerCard
          badge="BATTER 1"
          badgeColor="emerald"
          icon="🏏"
          title="Striker (On Strike)"
          subtitle={`${rawBattingTeam?.name || "Batting Team"}`}
          players={battingPlayers}
          selected={striker}
          onSelect={(id) => {
            setStriker(id);
            setStrikerName("");
            setError(null);
          }}
          name={strikerName}
          onNameChange={(v) => {
            setStrikerName(v);
            setStriker(null);
            setError(null);
          }}
          disabledId={nonStriker}
        />

        {/* Non-Striker */}
        <OpeningPlayerCard
          badge="BATTER 2"
          badgeColor="emerald"
          icon="🏃"
          title="Non-Striker"
          subtitle={`${rawBattingTeam?.name || "Batting Team"}`}
          players={battingPlayers}
          selected={nonStriker}
          onSelect={(id) => {
            setNonStriker(id);
            setNonStrikerName("");
            setError(null);
          }}
          name={nonStrikerName}
          onNameChange={(v) => {
            setNonStrikerName(v);
            setNonStriker(null);
            setError(null);
          }}
          disabledId={striker}
        />

        {/* Opening Bowler */}
        <OpeningPlayerCard
          badge="BOWLER"
          badgeColor="sky"
          icon="⚾"
          title="Opening Bowler"
          subtitle={`${rawBowlingTeam?.name || "Bowling Team"}`}
          players={bowlingPlayers}
          selected={bowler}
          onSelect={(id) => {
            setBowler(id);
            setBowlerName("");
            setError(null);
          }}
          name={bowlerName}
          onNameChange={(v) => {
            setBowlerName(v);
            setBowler(null);
            setError(null);
          }}
        />
      </div>

      <button
        disabled={!canStart || starting || busy}
        onClick={handleSubmit}
        className={`w-full py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 ${BTN_TRANSITION}`}
      >
        {starting ? (
          <>
            <span className="cb-live-pulse">⏳</span>
            <span>Starting Innings...</span>
          </>
        ) : (
          <>
            <span>Start Match Scoring</span>
            <span className="font-mono text-base">➔</span>
          </>
        )}
      </button>
    </div>
  );
}

function OpeningPlayerCard({
  badge,
  badgeColor,
  icon,
  title,
  subtitle,
  players,
  selected,
  onSelect,
  name,
  onNameChange,
  disabledId,
}) {
  const isSelectedFromSquad = !!selected;

  return (
    <div
      className="p-4 rounded-xl space-y-3 transition-all border"
      style={{
        backgroundColor: COLOR.surfaceRaised,
        borderColor: isSelectedFromSquad || name.trim() ? (badgeColor === "sky" ? COLOR.blue : COLOR.accent) : COLOR.border,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>{title}</span>
            </div>
            <div className="text-[10px] font-medium text-slate-400">{subtitle}</div>
          </div>
        </div>
        <span
          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
            badgeColor === "sky" ? "bg-sky-500/15 text-sky-400 border border-sky-500/30" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {badge}
        </span>
      </div>

      {/* Select from squad chip grid */}
      <div>
        <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
          Select from Playing XI:
        </label>
        {players && players.length > 0 ? (
          <div className="flex gap-1.5 flex-wrap">
            {players.map((p) => {
              const isPicked = selected === p.id;
              const isDisabled = disabledId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelect(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${BTN_TRANSITION} ${
                    isDisabled ? "opacity-30 cursor-not-allowed bg-slate-800 text-slate-500" : ""
                  }`}
                  style={{
                    backgroundColor: isPicked
                      ? badgeColor === "sky"
                        ? COLOR.blue
                        : COLOR.accent
                      : "rgba(15, 23, 42, 0.6)",
                    color: isPicked ? "#000" : COLOR.ink,
                    border: isPicked
                      ? "none"
                      : `1px solid ${COLOR.border}`,
                  }}
                >
                  {p.name} {isPicked ? "✓" : ""}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic">No players found in playing XI. Enter player name below.</p>
        )}
      </div>

      {/* Or manual entry */}
      <div className="pt-1">
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="or type player name manually..."
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border text-xs text-white outline-none focus:border-sky-400 placeholder:text-slate-500"
            style={{ borderColor: name.trim() ? (badgeColor === "sky" ? COLOR.blue : COLOR.accent) : COLOR.border }}
          />
          {name.trim() && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Custom Name
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerPicker({ title, players, onPick, onAddNew, busy }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  async function handleAdd(e) {
    e?.preventDefault();
    setPickerError(null);
    const trimmed = newName.trim();
    if (!trimmed || adding) return;

    // Check if player name already exists in current squad list
    const exists = players?.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setPickerError(`⚠️ Player "${trimmed}" is already in the squad roster! Duplicate player names are not allowed.`);
      return;
    }

    setAdding(true);
    try {
      const newId = await onAddNew(trimmed);
      if (newId) onPick(newId);
    } catch (err) {
      setPickerError(err.message);
    } finally {
      setAdding(false);
      setNewName("");
    }
  }

  return (
    <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
      <h3 className="text-base font-extrabold text-white flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs font-mono font-normal text-slate-400">({players.length} squad members)</span>
      </h3>

      {pickerError && (
        <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
          {pickerError}
        </div>
      )}

      {/* Select from existing squad */}
      <div>
        <label className="text-xs font-bold text-emerald-400 block mb-2">Select from Squad Roster:</label>
        <div className="flex gap-2 flex-wrap">
          {players.map((p) => (
            <button
              key={p.id}
              disabled={busy || adding}
              onClick={() => onPick(p.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 ${BTN_TRANSITION}`}
            >
              {p.name}
            </button>
          ))}
          {players.length === 0 && (
            <span className="text-xs text-slate-500 italic">No available players in squad. Add a new player below.</span>
          )}
        </div>
      </div>

      {/* Add new player mid-match */}
      <form onSubmit={handleAdd} className="pt-3 border-t border-slate-800 space-y-2">
        <label className="text-xs font-bold text-sky-400 block">➕ Add New Player to Squad Mid-Match:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Type new player full name..."
            className="flex-1 px-3 py-2 rounded-xl bg-slate-800 text-xs text-white outline-none border border-slate-700 focus:border-sky-500 font-sans"
          />
          <button
            type="submit"
            disabled={!newName.trim() || busy || adding}
            className={`px-4 py-2 bg-sky-500 text-black font-bold text-xs rounded-xl disabled:opacity-40 ${BTN_TRANSITION}`}
          >
            {adding ? "Adding..." : "+ Add & Select"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BattingTable({ batters }) {
  if (!batters || batters.length === 0) return <div className="text-xs text-slate-500">No batting data.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="py-2 font-sans">Batter</th>
            <th className="py-2 text-right">R</th>
            <th className="py-2 text-right">B</th>
            <th className="py-2 text-right text-emerald-400">4s</th>
            <th className="py-2 text-right text-purple-400">6s</th>
            <th className="py-2 text-right">SR</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b) => {
            const sr = b.balls_faced > 0 ? ((b.runs / b.balls_faced) * 100).toFixed(1) : "0.0";
            const dismissalText = b.is_out
              ? b.dismissal
                ? b.dismissal.replace("_", " ")
                : "out"
              : b.is_on_strike
              ? "not out *"
              : "not out";
            return (
              <tr
                key={b.player_id || b.name}
                className={`border-b border-slate-800/40 ${b.is_out ? "text-slate-400 opacity-80" : "text-slate-200"}`}
              >
                <td className="py-2 font-sans">
                  <div className={`font-semibold flex items-center gap-1 ${b.is_out ? "text-slate-300 line-through decoration-red-500/70" : "text-white"}`}>
                    {b.name}
                    {b.is_on_strike && !b.is_out && <span className="text-emerald-400 font-extrabold">*</span>}
                  </div>
                  <div className={`text-[10px] capitalize font-medium ${b.is_out ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                    {dismissalText}
                  </div>
                </td>
                <td className={`py-2 text-right font-bold text-sm ${b.is_out ? "text-slate-300" : "text-emerald-400"}`}>{b.runs}</td>
                <td className="py-2 text-right text-slate-300">{b.balls_faced}</td>
                <td className="py-2 text-right text-emerald-400 font-bold">{b.fours ?? 0}</td>
                <td className="py-2 text-right text-purple-400 font-bold">{b.sixes ?? 0}</td>
                <td className="py-2 text-right text-slate-400">{sr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BowlingTable({ bowlers }) {
  if (!bowlers || bowlers.length === 0) return <div className="text-xs text-slate-500">No bowling data.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="py-2">Bowler</th>
            <th className="py-2 text-right">O</th>
            <th className="py-2 text-right">R</th>
            <th className="py-2 text-right">W</th>
            <th className="py-2 text-right">ER</th>
          </tr>
        </thead>
        <tbody>
          {bowlers.map((b) => {
            const bOvers = correctBuggyBowlerOvers(b.overs_bowled);
            const er = bOvers.trueDecimal > 0 ? (b.runs_conceded / bOvers.trueDecimal).toFixed(2) : "0.00";
            return (
              <tr key={b.player_id || b.name} className="border-b border-slate-800/40 text-slate-200">
                <td className="py-2 font-sans font-semibold text-sky-400">{b.name}</td>
                <td className="py-2 text-right text-slate-300">{bOvers.display}</td>
                <td className="py-2 text-right text-slate-400">{b.runs_conceded}</td>
                <td className="py-2 text-right font-bold text-red-400">{b.wickets}</td>
                <td className="py-2 text-right text-slate-400">{er}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FinalScoreboard({ matchId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/api/matches/${matchId}/scoreboard`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [matchId]);

  if (error) return <div className="text-xs p-4 bg-red-500/10 text-red-400 rounded-xl">Error: {error}</div>;
  if (!data) return <div className="text-xs text-slate-400 p-6">Loading Final Scorecard...</div>;

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl text-center" style={cardStyle}>
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
          {data.match.team1_name} vs {data.match.team2_name}
        </div>
        <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-2">
          <span>🏆</span>
          <span>{data.result}</span>
        </div>
      </div>

      {data.innings.map((inn) => {
        const { display: inningsOversDisplay } = formatOvers(inn.overs);
        return (
          <div key={inn.innings_number} className="p-4 rounded-2xl space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-bold text-white">{inn.batting_team_name} Innings</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {inn.total_runs}/{inn.wickets} ({inningsOversDisplay} ov)
              </span>
            </div>
            <BattingTable batters={inn.batting} />
            <div className="pt-2">
              <BowlingTable bowlers={inn.bowling} />
            </div>
            {/* Fall of Wickets rendered directly below Bowling Table */}
            <FallOfWicketsCard fow={inn.fall_of_wickets} />
          </div>
        );
      })}
    </div>
  );
}