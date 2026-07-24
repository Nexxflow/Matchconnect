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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function api(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${options?.method || "GET"} ${path} failed (${res.status}) ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ============================================================================
// Ball classification — labels every delivery for the "This Over" strip.
// Extras now carry their additional-run count (B+2, LB+1, NB+1, WD+3, etc.)
// instead of collapsing into a plain number.
// ============================================================================
function classifyBall(b) {
  if (b.is_wicket) return { val: "W", type: "wicket" };

  const extraRuns = Number(b.extra_runs || 0);

  if (b.extra_type === "noball") {
    return { val: extraRuns > 0 ? `NB+${extraRuns}` : "NB", type: "noball" };
  }
  if (b.extra_type === "wide") {
    return { val: extraRuns > 0 ? `WD+${extraRuns}` : "WD", type: "noball" };
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

// ============================================================================
// Overs math — cricket notation is NOT decimal. "1.5" means 1 completed over
// + 5 balls, not the number 1.5. Any economy-rate or overs-remaining math that
// naively divides by the raw "X.Y" value is wrong (1.8333 true overs, not 1.5).
//
// These helpers normalize whatever the backend sends into a real ball count,
// then re-derive both the display string and the true decimal value from
// that ball count — which also self-corrects an invalid fractional part
// (e.g. a raw "2.6" — 6 balls in the "current" over — rolls into "3.0"
// automatically, since 2 overs + 6 balls IS 3 overs).
//
// IMPORTANT CAVEAT: if the backend is incrementing the ball count for wides
// or no-balls (illegal deliveries that should NOT advance the over), the
// resulting ball count arrives already wrong — no client-side formatting
// can recover the correct over count in that case. That bug, if present,
// lives in the ball-recording logic on the server, not here.
// ============================================================================
function parseOversToBalls(oversValue) {
  const num = Number(oversValue) || 0;
  const wholeOvers = Math.trunc(num);
  // Treat the fractional part as balls (tenths), not true decimal fractions of an over.
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

// ----------------------------------------------------------------------------
// Targeted patch for a specific observed bug in per-bowler overs_bowled:
// 1 over bowled was displaying as "1.5", 2 overs as "3.0". That's an exact
// 1.5x inflation (1 x 1.5 = 1.5, 2 x 1.5 = 3.0), which is the signature of the
// backend computing overs as (legal balls / 4) instead of the correct
// (legal balls / 6). This function undoes exactly that: it recovers the true
// ball count by multiplying the raw value back by 4, then re-derives correct
// cricket notation and true decimal overs from that ball count.
//
// This is a frontend workaround for a backend calculation bug. If/when the
// backend is fixed to send correct overs (or a raw ball count), remove this
// function and go back to plain formatOvers() — otherwise a backend fix will
// get double-corrected here and go wrong in the opposite direction.
// ----------------------------------------------------------------------------
function correctBuggyBowlerOvers(rawOversBowled) {
  const raw = Number(rawOversBowled) || 0;
  const balls = Math.round(raw * 4); // undo the incorrect "/4" the backend applied
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

// ============================================================================
// Extras — the backend may (or may not) send a structured breakdown. We use
// it when present, and otherwise fall back to a value that's always
// derivable on the client: total extras = innings total runs minus the sum
// of what the individual batters scored off the bat.
// ============================================================================
function computeExtrasBreakdown(innings) {
  if (!innings) return null;

  if (innings.extras && typeof innings.extras === "object") {
    const { wides = 0, noballs = 0, byes = 0, legbyes = 0, penalty = 0 } = innings.extras;
    const total = innings.extras.total ?? wides + noballs + byes + legbyes + penalty;
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

// ============================================================================
// Fall of wickets — expects the backend to expose an ordered list (either as
// `fall_of_wickets` or `fow`) with the score/over/batter at each dismissal.
// If the backend doesn't send this yet, we show a clear "not available"
// state instead of guessing at numbers we can't actually derive client-side.
// ============================================================================
function getFallOfWickets(innings) {
  if (!innings) return null;
  if (Array.isArray(innings.fall_of_wickets)) return innings.fall_of_wickets;
  if (Array.isArray(innings.fow)) return innings.fow;
  return null;
}

function fowEntryLabel(entry, index) {
  const wicketNo = entry.wicket_number ?? entry.wicket ?? index + 1;
  const score = entry.score ?? entry.team_score ?? entry.runs;
  const rawOver = entry.over ?? entry.overs ?? entry.at_over;
  const overDisplay = rawOver != null ? formatOvers(rawOver).display : null;
  const playerName = entry.player_name ?? entry.batsman_name ?? entry.name ?? "Unknown";
  return { wicketNo, score, overDisplay, playerName };
}

// ============================================================================
// Design tokens
// A scoreboard-under-floodlights palette: deep pitch-green blacks, a
// phosphor-green primary (the "lights on" color), and the classic scoring
// signal colors (six/blue-four/wicket-red/extra-amber) kept legible at a glance.
// ============================================================================
const FONT_DISPLAY = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const COLOR = {
  bg: "#080b09",
  surface: "#0f1510",
  surfaceRaised: "#131a13",
  hero: "#081c10",
  border: "#1e2a1e",
  borderStrong: "#2c3d2a",
  ink: "#eef2ea",
  inkDim: "#8ea08b",
  inkFaint: "#4a5a48",
  accent: "#3ddc84",
  accentInk: "#04170b",
  accentSoft: "rgba(61,220,132,0.12)",
  blue: "#2f9bf0",
  red: "#e6483a",
  amber: "#f5a623",
};

const BALL_COLORS = {
  wicket: { bg: COLOR.red, fg: "#fff" },
  six: { bg: COLOR.accent, fg: COLOR.accentInk },
  boundary: { bg: COLOR.blue, fg: "#fff" },
  noball: { bg: COLOR.amber, fg: "#241a02" },
  extra: { bg: "rgba(245,166,35,0.16)", fg: COLOR.amber },
  dot: { bg: "#161d15", fg: "#546753" },
  single: { bg: "#1a221a", fg: COLOR.ink },
};

const WICKET_TYPES = ["bowled", "caught", "lbw", "run_out", "stumped", "hit_wicket", "other"];
const NEEDS_FIELDER = new Set(["caught", "run_out", "stumped"]);

const card = { backgroundColor: COLOR.surface, border: `1px solid ${COLOR.border}` };
const label11 = { color: COLOR.inkDim, fontFamily: FONT_DISPLAY };
const inputStyle = {
  backgroundColor: COLOR.surface,
  border: `1px solid ${COLOR.border}`,
  color: COLOR.ink,
  fontFamily: FONT_DISPLAY,
};
const primaryBtn = {
  backgroundColor: COLOR.accent,
  color: COLOR.accentInk,
  fontFamily: FONT_DISPLAY,
  boxShadow: "0 8px 20px -10px rgba(61,220,132,0.65)",
};
const heading = { fontFamily: FONT_DISPLAY, color: COLOR.ink, letterSpacing: "-0.01em" };
const mono = { fontFamily: FONT_MONO };

const BTN_TRANSITION = "transition-all duration-150 ease-out active:scale-[0.96]";

// ============================================================================
// Top-level app
// ============================================================================
export default function ScoringApp() {
  // home | new | squads | toss | score | scoreboard
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
      className="max-w-xl mx-auto space-y-6 px-1"
      style={{ backgroundColor: COLOR.bg, color: COLOR.ink }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes lst-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .lst-rise { animation: lst-rise .28s ease-out both; }

        @keyframes lst-pop { from { opacity: 0; transform: scale(.7); } to { opacity: 1; transform: scale(1); } }
        .lst-pop { animation: lst-pop .22s cubic-bezier(.34,1.56,.64,1) both; }

        .lst-hover-lift:hover { filter: brightness(1.08); }
        .lst-hover-lift:active { filter: brightness(0.95); }

        @keyframes lst-live-dot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .lst-live-dot { animation: lst-live-dot 1.1s ease-in-out infinite; }

        @keyframes lst-score-flash {
          0% { transform: scale(1); }
          30% { transform: scale(1.08); color: #3ddc84; }
          100% { transform: scale(1); }
        }
        .lst-score-flash { animation: lst-score-flash .5s ease-out; }

        @keyframes lst-toast-in {
          0% { opacity: 0; transform: translate(-50%, 6px) scale(.85); }
          15% { opacity: 1; transform: translate(-50%, 0) scale(1.03); }
          25% { transform: translate(-50%, 0) scale(1); }
          80% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -4px) scale(.97); }
        }
        .lst-toast { animation: lst-toast-in 1.35s cubic-bezier(.22,1,.36,1) both; }

        @keyframes lst-glow-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(61,220,132,0.16); }
          50% { box-shadow: 0 0 0 6px rgba(61,220,132,0.05); }
        }
        .lst-glow-pulse { animation: lst-glow-pulse 2.4s ease-in-out infinite; }

        @keyframes lst-dot-fill { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .lst-dot-fill { animation: lst-dot-fill .2s ease-out both; }

        ::selection { background: rgba(61,220,132,0.3); }
      `}</style>

      {view !== "home" && (
        <button
          onClick={goHome}
          className={`text-xs font-semibold flex items-center gap-1.5 ${BTN_TRANSITION} hover:opacity-80`}
          style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}
        >
          <span style={{ fontFamily: FONT_MONO }}>←</span> All matches
        </button>
      )}

      {view === "home" && (
        <MatchHome
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
          onCreated={(id) => {
            setActiveMatchId(id);
            setView("squads");
          }}
          onCancel={goHome}
        />
      )}

      {view === "squads" && activeMatchId && (
        <SquadForm matchId={activeMatchId} onDone={() => setView("toss")} onCancel={goHome} />
      )}

      {view === "toss" && activeMatchId && (
        <TossForm matchId={activeMatchId} onDone={() => setView("score")} onCancel={goHome} />
      )}

      {view === "score" && activeMatchId && (
        <ScorerConsole matchId={activeMatchId} onMatchComplete={() => setView("scoreboard")} />
      )}

      {view === "scoreboard" && activeMatchId && <FinalScoreboard matchId={activeMatchId} />}
    </div>
  );
}

// ============================================================================
// Shared: step progress indicator for the setup wizard (Team Info → Squad → Toss)
// ============================================================================
function SetupProgress({ step }) {
  const steps = ["Team Info", "Squads", "Toss"];
  return (
    <div className="flex items-center gap-2 mb-1">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5 flex-1">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${BTN_TRANSITION}`}
                style={{
                  backgroundColor: done ? COLOR.accent : active ? COLOR.accentSoft : COLOR.surfaceRaised,
                  color: done ? COLOR.accentInk : active ? COLOR.accent : COLOR.inkFaint,
                  border: active ? `1px solid ${COLOR.accent}` : "1px solid transparent",
                  fontFamily: FONT_MONO,
                }}
              >
                {done ? "✓" : n}
              </span>
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: active ? COLOR.ink : COLOR.inkFaint, fontFamily: FONT_DISPLAY }}
              >
                {label}
              </span>
            </div>
            {n < steps.length && (
              <div className="h-px flex-1" style={{ backgroundColor: done ? COLOR.accent : COLOR.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Home
// ============================================================================
function MatchHome({ onScoreNew, onResume, onViewScoreboard }) {
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={heading}>Cricket Scorer</h2>
          <p className="text-xs mt-0.5" style={{ color: COLOR.inkFaint }}>Score a match, ball by ball</p>
        </div>
        <button
          onClick={onScoreNew}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold shrink-0 lst-hover-lift ${BTN_TRANSITION}`}
          style={primaryBtn}
        >
          + Score a Match
        </button>
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded-xl" style={{ ...card, color: COLOR.red }}>
          Couldn't load matches: {error}
        </div>
      )}

      {matches === null && !error && (
        <div className="flex items-center gap-2 text-sm px-4 py-6" style={{ color: COLOR.inkDim }}>
          <span
            className="w-3 h-3 rounded-full border-2 animate-spin"
            style={{ borderColor: COLOR.border, borderTopColor: COLOR.accent }}
          />
          Loading matches…
        </div>
      )}

      {matches !== null && matches.length === 0 && !error && (
        <div className="text-center px-4 py-12 rounded-2xl" style={card}>
          <div className="text-3xl mb-2" style={{ color: COLOR.borderStrong }} aria-hidden>◐</div>
          <div className="text-sm font-semibold mb-1" style={{ color: COLOR.ink, fontFamily: FONT_DISPLAY }}>
            No matches scored yet
          </div>
          <div className="text-xs mb-5" style={{ color: COLOR.inkFaint }}>
            Start scoring your first match and it'll show up here.
          </div>
          <button
            onClick={onScoreNew}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold lst-hover-lift ${BTN_TRANSITION}`}
            style={primaryBtn}
          >
            + Score a Match
          </button>
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest" style={label11}>In Progress</div>
          {inProgress.map((m, i) => {
            const { display: oversDisplay } = formatOvers(m.current_innings_summary?.overs_completed ?? 0);
            return (
              <div
                key={m.id}
                className="lst-rise rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
                style={{ ...card, animationDelay: `${i * 40}ms` }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {m.status !== "not_started" && (
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full lst-live-dot" style={{ backgroundColor: COLOR.red }} />
                        <span className="text-[9px] font-bold tracking-widest" style={{ color: COLOR.red, fontFamily: FONT_DISPLAY }}>LIVE</span>
                      </span>
                    )}
                    <span className="text-sm font-semibold truncate" style={{ color: COLOR.ink }}>
                      {m.team1_name} vs {m.team2_name}
                    </span>
                  </div>
                  <div className="text-xs" style={{ ...mono, color: COLOR.inkFaint }}>
                    {m.venue ? `${m.venue} · ` : ""}
                    {m.status === "not_started"
                      ? "Setup incomplete"
                      : `${m.current_innings_summary?.total_runs ?? 0}/${m.current_innings_summary?.wickets ?? 0} in ${oversDisplay} ov`}
                  </div>
                </div>
                <button
                  onClick={() => onResume(m.id, m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 lst-hover-lift ${BTN_TRANSITION}`}
                  style={{
                    backgroundColor: COLOR.accentSoft,
                    color: COLOR.accent,
                    border: "1px solid rgba(61,220,132,0.35)",
                    fontFamily: FONT_DISPLAY,
                  }}
                >
                  {m.status === "not_started" ? "Continue Setup" : "Resume Scoring"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest" style={label11}>Completed</div>
          {completed.map((m) => (
            <button
              key={m.id}
              onClick={() => onViewScoreboard(m.id)}
              className={`w-full text-left rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 lst-hover-lift ${BTN_TRANSITION}`}
              style={card}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate mb-0.5" style={{ color: COLOR.ink }}>
                  {m.team1_name} vs {m.team2_name}
                </div>
                <div className="text-xs truncate" style={{ color: COLOR.inkFaint }}>{m.result || "Match completed"}</div>
              </div>
              <span className="text-xs shrink-0" style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}>
                View scoreboard →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 1: Team Info
// ============================================================================
function NewMatchForm({ onCreated, onCancel }) {
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [venue, setVenue] = useState("");
  const [oversLimit, setOversLimit] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = team1Name.trim() && team2Name.trim() && oversLimit > 0 && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const json = await api("/api/matches", {
        method: "POST",
        body: JSON.stringify({
          team1_name: team1Name.trim(),
          team2_name: team2Name.trim(),
          venue: venue.trim() || null,
          overs_limit: Number(oversLimit),
        }),
      });
      onCreated(json.match_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 lst-rise">
      <div>
        <h2 className="text-xl font-bold mb-3" style={heading}>New Match</h2>
        <SetupProgress step={1} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={label11}>Team 1</label>
          <input
            value={team1Name}
            onChange={(e) => setTeam1Name(e.target.value)}
            placeholder="e.g. Titans"
            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 ${BTN_TRANSITION}`}
            style={{ ...inputStyle, "--tw-ring-color": COLOR.accent }}
            onFocus={(e) => (e.target.style.borderColor = COLOR.accent)}
            onBlur={(e) => (e.target.style.borderColor = COLOR.border)}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={label11}>Team 2</label>
          <input
            value={team2Name}
            onChange={(e) => setTeam2Name(e.target.value)}
            placeholder="e.g. Strikers"
            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none ${BTN_TRANSITION}`}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = COLOR.accent)}
            onBlur={(e) => (e.target.style.borderColor = COLOR.border)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={label11}>Venue</label>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Optional"
            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none ${BTN_TRANSITION}`}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = COLOR.accent)}
            onBlur={(e) => (e.target.style.borderColor = COLOR.border)}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={label11}>Overs</label>
          <input
            type="number"
            min={1}
            value={oversLimit}
            onChange={(e) => setOversLimit(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none ${BTN_TRANSITION}`}
            style={{ ...inputStyle, ...mono }}
            onFocus={(e) => (e.target.style.borderColor = COLOR.accent)}
            onBlur={(e) => (e.target.style.borderColor = COLOR.border)}
          />
        </div>
      </div>

      {error && <div className="text-xs" style={{ color: COLOR.red }}>{error}</div>}

      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
          style={primaryBtn}
        >
          {submitting ? "Creating…" : "Next: Add Squads →"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`text-xs font-semibold hover:opacity-80 ${BTN_TRANSITION}`}
          style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Step 2: Squads — numbered player slots (Player 1, Player 2...) instead of
// a free-text paste box. Cricket squads need a minimum of 11 to field a team
// and conventionally allow up to 15 on the full squad list, so this enforces
// that range directly in the UI rather than relying on the user to count.
// ============================================================================
const SQUAD_MIN_PLAYERS = 11;
const SQUAD_MAX_PLAYERS = 15;

function SquadForm({ matchId, onDone, onCancel }) {
  const [names, setNames] = useState(null);
  const [team1Players, setTeam1Players] = useState(() => Array(SQUAD_MIN_PLAYERS).fill(""));
  const [team2Players, setTeam2Players] = useState(() => Array(SQUAD_MIN_PLAYERS).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api(`/api/matches/${matchId}/squads`)
      .then((json) => { if (!cancelled) setNames({ team1_name: json.team1.name, team2_name: json.team2.name }); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [matchId]);

  function updateSlot(setter, index, value) {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addSlot(setter) {
    setter((prev) => (prev.length >= SQUAD_MAX_PLAYERS ? prev : [...prev, ""]));
  }

  function removeSlot(setter, index) {
    setter((prev) => {
      if (prev.length <= SQUAD_MIN_PLAYERS) return prev; // never drop below the minimum required slots
      return prev.filter((_, i) => i !== index);
    });
  }

  const t1Filled = team1Players.map((s) => s.trim()).filter(Boolean);
  const t2Filled = team2Players.map((s) => s.trim()).filter(Boolean);
  // Fully optional — 11 rows are shown as a full-side reference, but the
  // person can move on with as many (or as few) named players as they've
  // typed in so far. The backend doesn't require a minimum either.
  const SQUAD_SUBMIT_MIN = 0;
  const t1Valid = true;
  const t2Valid = true;
  const canSubmit = !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/matches/${matchId}/squads`, {
        method: "POST",
        body: JSON.stringify({ team1_players: t1Filled, team2_players: t2Filled }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !names) {
    return <div className="text-sm px-4 py-6" style={{ color: COLOR.red }}>Couldn't load match: {error}</div>;
  }
  if (!names) {
    return <div className="text-sm px-4 py-6" style={{ color: COLOR.inkDim }}>Loading match…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 lst-rise">
      <div>
        <h2 className="text-xl font-bold mb-3" style={heading}>Squads</h2>
        <SetupProgress step={2} />
      </div>
      <p className="text-xs" style={{ color: COLOR.inkFaint }}>
        Enter each player by name — {SQUAD_MIN_PLAYERS} rows are shown for a full side, but naming them all is optional. Add as many as you have right now, up to {SQUAD_MAX_PLAYERS} total, and continue whenever you're ready.
      </p>

      <SquadPlayerList
        teamLabel={`${names.team1_name} squad`}
        players={team1Players}
        filledCount={t1Filled.length}
        isValid={t1Valid}
        onChange={(i, v) => updateSlot(setTeam1Players, i, v)}
        onAdd={() => addSlot(setTeam1Players)}
        onRemove={(i) => removeSlot(setTeam1Players, i)}
      />

      <SquadPlayerList
        teamLabel={`${names.team2_name} squad`}
        players={team2Players}
        filledCount={t2Filled.length}
        isValid={t2Valid}
        onChange={(i, v) => updateSlot(setTeam2Players, i, v)}
        onAdd={() => addSlot(setTeam2Players)}
        onRemove={(i) => removeSlot(setTeam2Players, i)}
      />

      {error && <div className="text-xs" style={{ color: COLOR.red }}>{error}</div>}

      <div className="flex items-center gap-4 pt-1 flex-wrap">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
          style={primaryBtn}
        >
          {submitting ? "Saving…" : "Next: Toss →"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`text-xs font-semibold hover:opacity-80 ${BTN_TRANSITION}`}
          style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}
        >
          Cancel
        </button>
        {!canSubmit && !submitting && (
          <span className="text-[11px]" style={{ color: COLOR.amber }}>
            Each team needs at least {SQUAD_SUBMIT_MIN} named players to continue.
          </span>
        )}
      </div>
    </form>
  );
}

// Numbered "Player 1 / Player 2 / ..." entry list for one team, with a live
// count against the required minimum and a hard ceiling on squad size.
function SquadPlayerList({ teamLabel, players, filledCount, isValid, onChange, onAdd, onRemove }) {
  const atMax = players.length >= SQUAD_MAX_PLAYERS;
  const canRemoveRows = players.length > SQUAD_MIN_PLAYERS;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={card}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest" style={label11}>{teamLabel}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(107,122,107,0.18)", color: COLOR.inkFaint }}
          >
            Optional
          </span>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{
            ...mono,
            backgroundColor: isValid ? COLOR.accentSoft : "rgba(245,166,35,0.14)",
            color: isValid ? COLOR.accent : COLOR.amber,
            border: `1px solid ${isValid ? "rgba(61,220,132,0.35)" : "rgba(245,166,35,0.35)"}`,
          }}
        >
          {filledCount}/{SQUAD_MIN_PLAYERS} filled · {players.length}/{SQUAD_MAX_PLAYERS} max
        </span>
      </div>

      <div className="space-y-2">
        {players.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{
                backgroundColor: value.trim() ? COLOR.accentSoft : COLOR.surfaceRaised,
                color: value.trim() ? COLOR.accent : COLOR.inkFaint,
                fontFamily: FONT_MONO,
              }}
            >
              {i + 1}
            </span>
            <input
              value={value}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder={`Player ${i + 1} name`}
              className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none ${BTN_TRANSITION}`}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = COLOR.accent)}
              onBlur={(e) => (e.target.style.borderColor = COLOR.border)}
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              disabled={!canRemoveRows}
              title={canRemoveRows ? "Remove this slot" : `Minimum ${SQUAD_MIN_PLAYERS} slots required`}
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-80 ${BTN_TRANSITION}`}
              style={{ color: COLOR.inkFaint }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={atMax}
        className={`text-xs font-bold disabled:opacity-30 hover:opacity-80 ${BTN_TRANSITION}`}
        style={{ color: COLOR.accent, fontFamily: FONT_DISPLAY }}
      >
        {atMax ? `Squad full (${SQUAD_MAX_PLAYERS} max)` : "+ Add player"}
      </button>
    </div>
  );
}

// ============================================================================
// Step 3: Toss
// ============================================================================
function TossForm({ matchId, onDone, onCancel }) {
  const [names, setNames] = useState(null);
  const [winner, setWinner] = useState(null);
  const [decision, setDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api(`/api/matches/${matchId}/squads`)
      .then((json) => { if (!cancelled) setNames({ team1_name: json.team1.name, team2_name: json.team2.name }); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [matchId]);

  const canSubmit = winner && decision && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/matches/${matchId}/toss`, {
        method: "POST",
        body: JSON.stringify({ toss_winner_team: winner, toss_decision: decision }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !names) {
    return <div className="text-sm px-4 py-6" style={{ color: COLOR.red }}>Couldn't load match: {error}</div>;
  }
  if (!names) {
    return <div className="text-sm px-4 py-6" style={{ color: COLOR.inkDim }}>Loading match…</div>;
  }

  return (
    <div className="space-y-5 lst-rise">
      <div>
        <h2 className="text-xl font-bold mb-3" style={heading}>Toss</h2>
        <SetupProgress step={3} />
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={label11}>Who won the toss?</div>
        <div className="grid grid-cols-2 gap-3">
          {[["team1", names.team1_name], ["team2", names.team2_name]].map(([key, name]) => (
            <button
              key={key}
              onClick={() => setWinner(key)}
              className={`py-3 rounded-xl text-sm font-bold ${BTN_TRANSITION}`}
              style={{
                backgroundColor: winner === key ? COLOR.accent : COLOR.surface,
                color: winner === key ? COLOR.accentInk : COLOR.ink,
                border: winner === key ? `1px solid ${COLOR.accent}` : `1px solid ${COLOR.border}`,
                fontFamily: FONT_DISPLAY,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={label11}>
          {winner ? `${winner === "team1" ? names.team1_name : names.team2_name} chose to…` : "They chose to…"}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[["bat", "Bat first"], ["bowl", "Bowl first"]].map(([key, lbl]) => (
            <button
              key={key}
              disabled={!winner}
              onClick={() => setDecision(key)}
              className={`py-3 rounded-xl text-sm font-bold disabled:opacity-40 ${BTN_TRANSITION}`}
              style={{
                backgroundColor: decision === key ? COLOR.blue : COLOR.surface,
                color: decision === key ? "#fff" : COLOR.ink,
                border: decision === key ? `1px solid ${COLOR.blue}` : `1px solid ${COLOR.border}`,
                fontFamily: FONT_DISPLAY,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {winner && decision && (
        <div
          className="lst-pop rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: COLOR.hero, border: "1px solid rgba(61,220,132,0.18)", color: "#9fb3a0" }}
        >
          {(winner === "team1" ? names.team1_name : names.team2_name)} won the toss and chose to {decision === "bat" ? "bat" : "bowl"} first.
        </div>
      )}

      {error && <div className="text-xs" style={{ color: COLOR.red }}>{error}</div>}

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
          style={primaryBtn}
        >
          {submitting ? "Saving…" : "Start Match →"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`text-xs font-semibold hover:opacity-80 ${BTN_TRANSITION}`}
          style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Scorer console
// ============================================================================
function ScorerConsole({ matchId, onMatchComplete }) {
  const [squads, setSquads] = useState(null);
  const [live, setLive] = useState(null);
  const [prompts, setPrompts] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [extraPicker, setExtraPicker] = useState(null);
  const [wicketPanelOpen, setWicketPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [scorecard, setScorecard] = useState(null);
  const prevTotalsRef = useRef(null);
  const toastTimerRef = useRef(null);

  const loadScorecard = useCallback(async () => {
    try {
      const sc = await api(`/api/matches/${matchId}/scoreboard`);
      setScorecard(sc);
    } catch {
      // ignore — scorecard is a bonus view, not required for scoring
    }
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
  }, [matchId]);

  useEffect(() => {
    if (!live?.current_innings) return;
    const key = `${live.current_innings.total_runs}-${live.current_innings.wickets}`;
    const isFirstRead = prevTotalsRef.current === null;
    const changed = !isFirstRead && prevTotalsRef.current !== key;
    prevTotalsRef.current = key;
    if (changed) {
      setScoreFlash(true);
      const t = setTimeout(() => setScoreFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [live?.current_innings?.total_runs, live?.current_innings?.wickets]);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  async function runAction(path, body) {
    setBusy(true);
    setError(null);
    try {
      const json = await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      setLive(json);
      setPrompts(json.prompts || null);
      loadScorecard();
      return json;
    } catch (err) {
      setError(err.message);
      // Re-throw so callers (like OpeningSelectors' handleSubmit) know the
      // action actually failed instead of silently treating it as a
      // success — this was causing "nothing happens on first click, works
      // on second" since the first failed attempt never surfaced an error.
      throw err;
    } finally {
      setBusy(false);
    }
  }

  function recordBall({ runs = 0, extra_type = null, extra_runs = 0, is_wicket = false, wicket_type = null, dismissed_player_id = null, fielder_id = null }) {
    const striker_id = live?.batting?.find((b) => b.is_on_strike)?.player_id;
    const non_striker_id = live?.batting?.find((b) => !b.is_on_strike)?.player_id;
    const bowler_id = live?.bowling?.find((b) => b.is_current)?.player_id;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    let toastMsg = null;
    if (is_wicket) toastMsg = { text: "WICKET!", color: COLOR.red };
    else if (Number(runs) === 6) toastMsg = { text: "SIX!", color: COLOR.accent };
    else if (Number(runs) === 4) toastMsg = { text: "FOUR!", color: COLOR.blue };
    if (toastMsg) {
      setToast(toastMsg);
      toastTimerRef.current = setTimeout(() => setToast(null), 1300);
    }

    runAction(`/api/matches/${matchId}/balls`, {
      runs, extra_type, extra_runs, is_wicket, wicket_type, dismissed_player_id, fielder_id,
      striker_id, non_striker_id, bowler_id,
    }).catch(() => {}); // error already surfaced via the `error` state above
    setExtraPicker(null);
    setWicketPanelOpen(false);
  }

  async function completeMatch() {
    const result = window.prompt("Result summary (e.g. \"Titans won by 20 runs\"):");
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
    // Reuse an existing player with this exact name instead of creating a
    // duplicate — protects every screen (Opening Players, new batsman,
    // new bowler) that calls this, not just one of them.
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
    // createPlayers appends, so the just-added player is the last one back.
    return teamObj.players[teamObj.players.length - 1]?.id || null;
  }

  if (error) return <div className="text-sm px-4 py-6" style={{ color: COLOR.red }}>Error: {error}</div>;
  if (!squads || !live) return <div className="text-sm px-4 py-6" style={{ color: COLOR.inkDim }}>Loading match…</div>;

  if (!live.current_innings) {
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
    const battingIsTeam1 = live.match.batting_team === live.match.team1_name;
    const battingSquad = battingIsTeam1 ? squads.team1 : squads.team2;
    const battingKey = battingIsTeam1 ? "team1_players" : "team2_players";
    const onCrease = new Set(live.batting.map((b) => b.player_id));
    const available = battingSquad.players.filter((p) => !onCrease.has(p.id));
    return (
      <PlayerPicker
        title="Who's the new batsman?"
        players={available}
        onPick={(id) => runAction(`/api/matches/${matchId}/new-batsman`, { player_id: id }).catch(() => {})}
        onAddNew={(name) => addPlayer(battingKey, name)}
        busy={busy}
      />
    );
  }

  if (prompts?.needs_new_bowler) {
    const bowlingIsTeam1 = live.match.bowling_team === live.match.team1_name;
    const bowlingSquad = bowlingIsTeam1 ? squads.team1 : squads.team2;
    const bowlingKey = bowlingIsTeam1 ? "team1_players" : "team2_players";
    const lastBowlerId = live.bowling.find((b) => b.is_current)?.player_id;
    const available = bowlingSquad.players.filter((p) => p.id !== lastBowlerId);
    return (
      <PlayerPicker
        title="Who's bowling this over?"
        players={available}
        onPick={(id) => runAction(`/api/matches/${matchId}/select-bowler`, { bowler_id: id }).catch(() => {})}
        onAddNew={(name) => addPlayer(bowlingKey, name)}
        busy={busy}
      />
    );
  }

  const hasStriker = live.batting.some((b) => b.is_on_strike);
  const hasTwoBatsmen = live.batting.length >= 2;
  const hasBowler = live.bowling.some((b) => b.is_current);
  if (!hasStriker || !hasTwoBatsmen || !hasBowler) {
    return (
      <OpeningSelectors
        squads={squads}
        match={live.match}
        recovery
        onStart={(payload) => runAction(`/api/matches/${matchId}/set-players`, payload)}
        onAddPlayer={addPlayer}
        busy={busy}
      />
    );
  }

  const { match, current_innings, batting, bowling, recent_balls } = live;

  // Innings-level overs — same cricket-notation fix applied here.
  const inningsOvers = formatOvers(current_innings.overs_completed || 0);
  const crr = inningsOvers.trueDecimal > 0
    ? (current_innings.total_runs / inningsOvers.trueDecimal).toFixed(2)
    : "0.00";

  const scorecardInnings = scorecard?.innings?.length
    ? (scorecard.innings.find((i) => i.innings_number === current_innings.innings_number) || scorecard.innings[scorecard.innings.length - 1])
    : null;
  const fullBattingCard = scorecardInnings?.batting?.length ? scorecardInnings.batting : batting;
  const fullBowlingCard = scorecardInnings?.bowling?.length ? scorecardInnings.bowling : bowling;

  // Fall of wickets for the current innings (backend-provided if available).
  const fallOfWickets = getFallOfWickets(current_innings) ?? getFallOfWickets(scorecardInnings);

  // Partnership between the two batters at the crease, including extras
  // conceded since the last wicket fell (total runs minus the score at the
  // last fall of wicket, minus what the two batters scored off the bat).
  const lastWicketScore = fallOfWickets && fallOfWickets.length > 0
    ? Number(fowEntryLabel(fallOfWickets[fallOfWickets.length - 1], fallOfWickets.length - 1).score) || 0
    : 0;
  const partnership = batting.length === 2
    ? (() => {
        const battedRuns = batting[0].runs + batting[1].runs;
        const balls = batting[0].balls_faced + batting[1].balls_faced;
        const extrasDuring = fallOfWickets
          ? Math.max(0, current_innings.total_runs - lastWicketScore - battedRuns)
          : null;
        return { runs: battedRuns, balls, extras: extrasDuring };
      })()
    : null;

  // Yet-to-bat: squad members for the batting team who haven't come to the
  // crease yet (i.e. aren't already listed anywhere on the batting card).
  const currentBattingSquad = match.batting_team === match.team1_name ? squads.team1 : squads.team2;
  const battedIds = new Set(fullBattingCard.map((b) => b.player_id));
  const yetToBat = (currentBattingSquad?.players || []).filter((p) => !battedIds.has(p.id));

  const inningsExtras = computeExtrasBreakdown(current_innings) ?? computeExtrasBreakdown(scorecardInnings);

  const currentBowler = bowling.find((b) => b.is_current);
  const legalBallsThisOver = recent_balls.filter(
    (b) => !b.is_wicket ? true : true // wickets still count as a ball unless run-out off a wide, kept simple here
  );

  return (
    <div className="space-y-5">
      {/* Jumbotron score hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-5 py-4 lst-glow-pulse"
        style={{ backgroundColor: COLOR.hero, border: "1px solid rgba(61,220,132,0.18)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${COLOR.accent} 1px, transparent 1px)`,
            backgroundSize: "10px 10px",
          }}
        />

        {toast && (
          <div
            key={`${toast.text}-${Date.now()}`}
            className="lst-toast absolute left-1/2 top-1.5 z-10 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
            style={{ backgroundColor: toast.color, color: toast.color === COLOR.accent ? COLOR.accentInk : "#fff", fontFamily: FONT_DISPLAY }}
          >
            {toast.text}
          </div>
        )}

        <div className="relative flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1 shrink-0" title="Live">
              <span className="w-1.5 h-1.5 rounded-full lst-live-dot" style={{ backgroundColor: COLOR.red }} />
              <span className="text-[10px] font-bold tracking-widest" style={{ color: COLOR.red, fontFamily: FONT_DISPLAY }}>LIVE</span>
            </span>
            <span className="text-xs font-bold truncate" style={{ color: COLOR.inkDim, fontFamily: FONT_DISPLAY }}>
              {match.team1_name} vs {match.team2_name}
            </span>
          </div>
          <span className="text-xs shrink-0" style={{ ...mono, color: COLOR.inkFaint }}>
            Ov {inningsOvers.display} / {match.overs_limit}
          </span>
        </div>
        <div className="relative flex items-end gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ backgroundColor: COLOR.accentSoft, color: COLOR.accent, border: "1px solid rgba(61,220,132,0.4)", fontFamily: FONT_DISPLAY }}
            title={match.batting_team}
          >
            {teamInitials(match.batting_team)}
          </div>
          <div
            className={`text-4xl font-bold tabular-nums ${scoreFlash ? "lst-score-flash" : ""}`}
            style={{ ...mono, color: COLOR.ink, transformOrigin: "left center" }}
          >
            {current_innings.total_runs}
            <span className="text-lg font-bold" style={{ color: COLOR.inkFaint }}>/{current_innings.wickets}</span>
            <span className="text-xs ml-3" style={{ color: COLOR.accent }}>CRR {crr}</span>
          </div>
        </div>
        {partnership && (
          <div className="relative text-xs mt-1" style={{ ...mono, color: COLOR.inkFaint }}>
            Partnership: {partnership.runs} ({partnership.balls})
            {partnership.extras != null && partnership.extras > 0 && (
              <span> + {partnership.extras} extra{partnership.extras === 1 ? "" : "s"}</span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={card}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-widest" style={label11}>This Over</div>
          <div className="flex items-center gap-2">
            {currentBowler && (
              <span className="text-[10px]" style={{ ...mono, color: COLOR.inkFaint }}>
                {currentBowler.name}
              </span>
            )}
            <div className="flex items-center gap-1" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className={i < recent_balls.length ? "lst-dot-fill" : ""}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: i < recent_balls.length ? COLOR.accent : COLOR.border,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* NOTE: balls are rendered in the exact order the backend returns them
            in `recent_balls`. A previous client-side "fix" that re-sorted this
            array by a guessed field (id / timestamp) caused the collapse you
            saw — sorting by the wrong field is worse than not sorting at all.
            If the order is still off, the sequencing bug is on the server:
            `GET /api/matches/:id/live` should return recent_balls oldest→newest. */}
        <div className="flex items-center gap-2 flex-wrap">
          {recent_balls.map((raw, i) => {
            const b = classifyBall(raw);
            const c = BALL_COLORS[b.type];
            return (
              <div
                key={raw.id ?? i}
                className="lst-pop w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold px-0.5"
                style={{ backgroundColor: c.bg, color: c.fg, ...mono }}
                title={b.val}
              >
                {b.val}
              </div>
            );
          })}
          {recent_balls.length === 0 && (
            <span className="text-xs" style={{ color: COLOR.inkFaint }}>No balls bowled yet this over.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {batting.map((b) => {
          const sr = b.balls_faced > 0 ? ((b.runs / b.balls_faced) * 100).toFixed(1) : "0.0";
          return (
            <div
              key={b.player_id}
              className="rounded-xl px-3 py-2.5"
              style={{
                ...card,
                border: b.is_on_strike ? `1px solid rgba(61,220,132,0.4)` : card.border,
                backgroundColor: b.is_on_strike ? COLOR.surfaceRaised : COLOR.surface,
              }}
            >
              <div className="font-semibold flex items-center gap-1.5" style={{ color: b.is_on_strike ? COLOR.accent : COLOR.ink }}>
                {b.is_on_strike && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR.accent }} />
                )}
                {b.name}
              </div>
              <div className="text-xs flex items-center gap-1.5" style={{ ...mono, color: COLOR.inkFaint }}>
                <span>{b.runs} ({b.balls_faced})</span>
                <span style={{ color: COLOR.inkFaint, opacity: 0.6 }}>·</span>
                <span>SR {sr}</span>
              </div>
            </div>
          );
        })}
        {bowling.filter((b) => b.is_current).map((b) => {
          const bOvers = correctBuggyBowlerOvers(b.overs_bowled);
          const er = bOvers.trueDecimal > 0 ? (b.runs_conceded / bOvers.trueDecimal).toFixed(2) : "0.00";
          return (
            <div key={b.player_id} className="rounded-xl px-3 py-2.5 col-span-2" style={card}>
              <div className="font-semibold flex items-center gap-1.5" style={{ color: COLOR.blue }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR.blue }} />
                {b.name}
              </div>
              <div className="text-xs" style={{ ...mono, color: COLOR.inkFaint }}>
                {bOvers.display} ov · {b.wickets} wkts · {b.runs_conceded} runs · ER {er}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={card}>
        <div className="text-xs font-bold uppercase tracking-widest" style={label11}>Ball Outcome</div>

        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <button
              key={r}
              disabled={busy}
              onClick={() => recordBall({ runs: r })}
              className={`aspect-square rounded-xl font-bold text-sm disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
              style={{
                backgroundColor: r === 4 ? COLOR.blue : r === 6 ? COLOR.accent : COLOR.surfaceRaised,
                color: r === 4 ? "#fff" : r === 6 ? COLOR.accentInk : COLOR.ink,
                ...mono,
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {["wide", "noball", "bye", "legbye"].map((t) => (
            <button
              key={t}
              disabled={busy}
              onClick={() => setExtraPicker(t)}
              className={`py-2 rounded-xl text-xs font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
              style={{
                backgroundColor: "rgba(245,166,35,0.12)",
                color: COLOR.amber,
                border: "1px solid rgba(245,166,35,0.35)",
                fontFamily: FONT_DISPLAY,
              }}
            >
              {t === "noball" ? "No Ball" : t === "legbye" ? "Leg Bye" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={() => setWicketPanelOpen(true)}
            className={`py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
            style={{ backgroundColor: COLOR.red, color: "#fff", fontFamily: FONT_DISPLAY }}
          >
            Wicket
          </button>
          <button
            disabled={busy}
            onClick={() => runAction(`/api/matches/${matchId}/balls/undo`).catch(() => {})}
            className={`py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
            style={{ backgroundColor: COLOR.surfaceRaised, color: COLOR.ink, fontFamily: FONT_DISPLAY }}
          >
            Undo Last Ball
          </button>
        </div>

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

        {error && <div className="text-xs" style={{ color: COLOR.red }}>{error}</div>}
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-widest px-1" style={label11}>Scorecard so far</div>
        <BattingTable
          batters={fullBattingCard}
          title={`${match.batting_team} — batting`}
          accentColor={COLOR.accent}
          extras={inningsExtras}
          yetToBat={yetToBat}
        />
        <FallOfWicketsCard wickets={fallOfWickets} title={`${match.batting_team} — fall of wickets`} />
        <BowlingTable bowlers={fullBowlingCard} title={`${match.bowling_team} — bowling`} accentColor={COLOR.blue} />
      </div>

      <button
        onClick={completeMatch}
        disabled={busy}
        className={`w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
        style={{
          backgroundColor: prompts?.match_complete ? COLOR.accent : COLOR.surfaceRaised,
          color: prompts?.match_complete ? COLOR.accentInk : COLOR.inkDim,
          fontFamily: FONT_DISPLAY,
          boxShadow: prompts?.match_complete ? primaryBtn.boxShadow : "none",
        }}
      >
        {prompts?.match_complete ? "Finish & Save Match ✓" : "Complete Match Early"}
      </button>
    </div>
  );
}

function ExtraRunsPicker({ extraType, onCancel, onConfirm }) {
  const lbl =
    extraType === "noball"
      ? "No Ball"
      : extraType === "legbye"
      ? "Leg Bye"
      : extraType.charAt(0).toUpperCase() + extraType.slice(1);

  const hasBaseRun = extraType === "wide" || extraType === "noball";
  const baseRun = hasBaseRun ? 1 : 0;

  return (
    <div
      className="lst-rise rounded-xl p-3 space-y-2"
      style={{
        backgroundColor: COLOR.hero,
        border: "1px solid rgba(245,166,35,0.25)",
      }}
    >
      <div className="text-xs font-semibold" style={{ color: COLOR.amber, fontFamily: FONT_DISPLAY }}>
        {lbl} — Additional Runs?
      </div>

      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((additional) => {
          const total = baseRun + additional;
          return (
            <button
              key={additional}
              onClick={() => onConfirm(total)}
              className={`py-2 rounded-lg text-xs font-bold lst-hover-lift ${BTN_TRANSITION}`}
              style={{ backgroundColor: COLOR.surfaceRaised, color: COLOR.ink, ...mono }}
              title={hasBaseRun ? `${lbl} (1) + ${additional} run(s) = ${total} total` : `${additional} run(s)`}
            >
              {hasBaseRun ? `${lbl}+${additional}` : `+${additional}`}
            </button>
          );
        })}
      </div>

      {hasBaseRun && (
        <div className="text-[11px]" style={{ color: COLOR.inkFaint }}>
          Example: <strong>{lbl}+0 = 1 run</strong>, <strong>{lbl}+2 = 3 runs</strong>
        </div>
      )}

      <button
        onClick={onCancel}
        className={`text-xs hover:opacity-80 ${BTN_TRANSITION}`}
        style={{ color: COLOR.inkFaint }}
      >
        Cancel
      </button>
    </div>
  );
}

function WicketPanel({ batting, fieldingSquad, onCancel, onConfirm }) {
  const [wicketType, setWicketType] = useState(null);
  const [dismissedId, setDismissedId] = useState(batting.find((b) => b.is_on_strike)?.player_id ?? null);
  const [fielderId, setFielderId] = useState(null);

  const needsFielder = wicketType && NEEDS_FIELDER.has(wicketType);
  const canConfirm = wicketType && dismissedId && (!needsFielder || fielderId);

  return (
    <div className="lst-rise rounded-xl p-3 space-y-3" style={{ backgroundColor: COLOR.hero, border: "1px solid rgba(230,72,58,0.3)" }}>
      <div className="text-xs font-semibold" style={{ color: COLOR.red, fontFamily: FONT_DISPLAY }}>How was the batsman out?</div>
      <div className="grid grid-cols-3 gap-2">
        {WICKET_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setWicketType(t)}
            className={`py-1.5 rounded-lg text-[11px] font-bold capitalize ${BTN_TRANSITION}`}
            style={{ backgroundColor: wicketType === t ? COLOR.red : COLOR.surfaceRaised, color: wicketType === t ? "#fff" : COLOR.ink }}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      <div>
        <div className="text-[11px] mb-1" style={{ color: COLOR.inkFaint }}>Batsman out</div>
        <div className="flex gap-2">
          {batting.map((b) => (
            <button
              key={b.player_id}
              onClick={() => setDismissedId(b.player_id)}
              className={`px-2 py-1 rounded-lg text-xs font-semibold ${BTN_TRANSITION}`}
              style={{ backgroundColor: dismissedId === b.player_id ? COLOR.red : COLOR.surfaceRaised, color: dismissedId === b.player_id ? "#fff" : COLOR.ink }}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {needsFielder && (
        <div className="lst-rise">
          <div className="text-[11px] mb-1" style={{ color: COLOR.inkFaint }}>Fielder</div>
          <div className="flex gap-2 flex-wrap">
            {fieldingSquad.players.map((p) => (
              <button
                key={p.id}
                onClick={() => setFielderId(p.id)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold ${BTN_TRANSITION}`}
                style={{ backgroundColor: fielderId === p.id ? COLOR.blue : COLOR.surfaceRaised, color: fielderId === p.id ? "#fff" : COLOR.ink }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 items-center pt-1">
        <button
          disabled={!canConfirm}
          onClick={() => onConfirm({ wicket_type: wicketType, dismissed_player_id: dismissedId, fielder_id: fielderId })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
          style={{ backgroundColor: COLOR.red, color: "#fff", fontFamily: FONT_DISPLAY }}
        >
          Confirm Wicket
        </button>
        <button onClick={onCancel} className={`text-xs hover:opacity-80 ${BTN_TRANSITION}`} style={{ color: COLOR.inkFaint }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function OpeningSelectors({ squads, match, onStart, onAddPlayer, busy, recovery = false }) {
  const battingIsTeam1 = match?.batting_team === match?.team1_name;
  const battingTeam = battingIsTeam1 ? squads.team1 : squads.team2;
  const bowlingTeam = battingIsTeam1 ? squads.team2 : squads.team1;
  const battingKey = battingIsTeam1 ? "team1_players" : "team2_players";
  const bowlingKey = battingIsTeam1 ? "team2_players" : "team1_players";

  const [striker, setStriker] = useState(null);
  const [strikerName, setStrikerName] = useState("");
  const [nonStriker, setNonStriker] = useState(null);
  const [nonStrikerName, setNonStrikerName] = useState("");
  const [bowler, setBowler] = useState(null);
  const [bowlerName, setBowlerName] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  // A role is "ready" once either an existing player chip was picked, or a
  // fresh name has been typed for it — the actual player gets created (if
  // needed) only when Start Innings is pressed, in one combined step.
  const strikerReady = striker || strikerName.trim();
  const nonStrikerReady = nonStriker || nonStrikerName.trim();
  const bowlerReady = bowler || bowlerName.trim();
  const canStart = strikerReady && nonStrikerReady && bowlerReady && (striker || strikerName.trim()) !== (nonStriker || nonStrikerName.trim());

  // Submission only happens when the button is pressed — no auto-start.

  async function resolveId(existingId, name, teamKey) {
    if (existingId) {
      console.log(`[OpeningSelectors] using existing selected id for ${teamKey}:`, existingId);
      return existingId;
    }
    const trimmed = name.trim();
    if (!trimmed) return null;
    // Before creating a new player, check whether someone with this exact
    // name already exists in that squad — typing a name that matches an
    // existing player (instead of tapping their chip) should reuse them,
    // not create a duplicate with separate stats.
    const squadList = teamKey === battingKey ? battingTeam?.players : bowlingTeam?.players;
    const existing = (squadList || []).find(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      console.log(`[OpeningSelectors] reused existing player "${trimmed}" (${teamKey}):`, existing.id);
      return existing.id;
    }
    console.log(`[OpeningSelectors] creating new player "${trimmed}" for ${teamKey}...`);
    const newId = await onAddPlayer(teamKey, trimmed);
    console.log(`[OpeningSelectors] created "${trimmed}" ->`, newId);
    return newId;
  }

  async function handleSubmit() {
    console.log("[OpeningSelectors] handleSubmit fired", { striker, strikerName, nonStriker, nonStrikerName, bowler, bowlerName, recovery });
    setStartError(null);
    setStarting(true);
    try {
      const [strikerId, nonStrikerId, bowlerId] = await Promise.all([
        resolveId(striker, strikerName, battingKey),
        resolveId(nonStriker, nonStrikerName, battingKey),
        resolveId(bowler, bowlerName, bowlingKey),
      ]);
      console.log("[OpeningSelectors] resolved ids:", { strikerId, nonStrikerId, bowlerId });
      if (!strikerId || !nonStrikerId || !bowlerId) {
        throw new Error("Couldn't set up all three players — try again.");
      }
      if (recovery) {
        console.log("[OpeningSelectors] calling onStart (recovery/set-players)...");
        await onStart({ striker_id: strikerId, non_striker_id: nonStrikerId, bowler_id: bowlerId });
      } else {
        console.log("[OpeningSelectors] calling onStart (start-innings)...");
        await onStart({ innings_number: 1, batting_team: match.batting_team, striker_id: strikerId, non_striker_id: nonStrikerId, bowler_id: bowlerId });
      }
      console.log("[OpeningSelectors] onStart finished successfully.");
    } catch (err) {
      console.error("[OpeningSelectors] handleSubmit failed:", err);
      setStartError(err.message || "Couldn't start the innings");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4 lst-rise">
      <div>
        <h3 className="text-lg font-bold" style={heading}>{recovery ? "Fix Current Players" : "Opening Players"}</h3>
        <p className="text-xs mt-1" style={{ color: recovery ? COLOR.amber : COLOR.inkFaint }}>
          {recovery
            ? "The scoring screen lost track of who's batting/bowling — reselect them to continue."
            : `${match?.batting_team} bats first · ${match?.bowling_team} bowls first`}
        </p>
      </div>

      <PlayerRow
        title={`${battingTeam?.name || "Batting"} — striker`}
        players={battingTeam?.players || []}
        selected={striker}
        onSelect={(id) => { setStriker(id); setStrikerName(""); }}
        name={strikerName}
        onNameChange={(v) => { setStrikerName(v); setStriker(null); }}
      />
      <PlayerRow
        title={`${battingTeam?.name || "Batting"} — non-striker`}
        players={(battingTeam?.players || []).filter((p) => p.id !== striker)}
        selected={nonStriker}
        onSelect={(id) => { setNonStriker(id); setNonStrikerName(""); }}
        name={nonStrikerName}
        onNameChange={(v) => { setNonStrikerName(v); setNonStriker(null); }}
      />
      <PlayerRow
        title={`${bowlingTeam?.name || "Bowling"} — bowler`}
        players={bowlingTeam?.players || []}
        selected={bowler}
        onSelect={(id) => { setBowler(id); setBowlerName(""); }}
        name={bowlerName}
        onNameChange={(v) => { setBowlerName(v); setBowler(null); }}
      />

      {startError && <div className="text-xs" style={{ color: COLOR.red }}>{startError}</div>}

      <button
        disabled={!canStart || busy || starting}
        onClick={handleSubmit}
        className={`w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
        style={primaryBtn}
      >
        {starting ? "Starting…" : recovery ? "Save & Continue Scoring" : "Start Innings"}
      </button>
    </div>
  );
}

function PlayerRow({ title, players, selected, onSelect, name, onNameChange }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={label11}>{title}</div>

      <input
        type="text"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Type this player's name..."
        className="w-full px-3 py-2 mb-2 rounded-lg text-xs outline-none"
        style={{
          backgroundColor: COLOR.surfaceRaised,
          color: COLOR.ink,
          border: `1px solid ${name.trim() ? COLOR.accent : COLOR.border}`,
        }}
      />

      <div className="flex gap-2 flex-wrap">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${BTN_TRANSITION}`}
            style={{ backgroundColor: selected === p.id ? COLOR.accent : COLOR.surfaceRaised, color: selected === p.id ? COLOR.accentInk : COLOR.ink }}
          >
            {p.name}
          </button>
        ))}
        {players.length === 0 && !name.trim() && <span className="text-xs" style={{ color: COLOR.inkFaint }}>No players yet — type a name above</span>}
      </div>
    </div>
  );
}

function PlayerPicker({ title, players, onPick, onAddNew, busy }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  async function handleAddNew() {
    const trimmed = newName.trim();
    if (!trimmed || !onAddNew) return;
    setAdding(true);
    setAddError(null);
    try {
      const newId = await onAddNew(trimmed);
      if (newId) onPick(newId);
      setNewName("");
    } catch (err) {
      setAddError(err.message || "Couldn't add player");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3 lst-rise">
      <h3 className="text-lg font-bold" style={heading}>{title}</h3>

      {onAddNew && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddNew(); } }}
            placeholder="Type this player's name..."
            disabled={adding || busy}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
            style={{ backgroundColor: COLOR.surfaceRaised, color: COLOR.ink, border: `1px solid ${COLOR.border}` }}
          />
          <button
            type="button"
            onClick={handleAddNew}
            disabled={adding || busy || !newName.trim()}
            className={`px-3 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
            style={primaryBtn}
          >
            {adding ? "Adding…" : "Add & select"}
          </button>
        </div>
      )}
      {addError && <div className="text-xs" style={{ color: COLOR.red }}>{addError}</div>}

      <div className="flex gap-2 flex-wrap">
        {players.map((p) => (
          <button
            key={p.id}
            disabled={busy}
            onClick={() => onPick(p.id)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 lst-hover-lift ${BTN_TRANSITION}`}
            style={{ backgroundColor: COLOR.surfaceRaised, color: COLOR.ink }}
          >
            {p.name}
          </button>
        ))}
        {players.length === 0 && <span className="text-xs" style={{ color: COLOR.inkFaint }}>No players available</span>}
      </div>
    </div>
  );
}

// ============================================================================
// Shared scorecard tables
// ============================================================================
function BattingTable({ batters, title, accentColor, extras, yetToBat }) {
  if (!batters || batters.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden" style={card}>
      {title && (
        <div
          className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
          style={{ color: accentColor || COLOR.accent, fontFamily: FONT_DISPLAY, borderBottom: `1px solid ${COLOR.border}` }}
        >
          {title}
        </div>
      )}
      <div
        className="px-4 py-2 grid grid-cols-5 text-[10px] font-bold uppercase tracking-wide"
        style={{ color: COLOR.inkFaint, borderBottom: `1px solid ${COLOR.border}`, fontFamily: FONT_DISPLAY }}
      >
        <span className="col-span-2">Batter</span><span className="text-center">R</span><span className="text-center">B</span><span className="text-center">SR</span>
      </div>
      {batters.map((b, i, arr) => {
        const sr = b.balls_faced > 0 ? ((b.runs / b.balls_faced) * 100).toFixed(1) : "0.0";
        const isLastRow = i === arr.length - 1;
        const hasFooter = Boolean((extras && extras.total > 0) || (yetToBat && yetToBat.length > 0));
        return (
          <div
            key={b.player_id}
            className="px-4 py-2.5 grid grid-cols-5 items-center"
            style={{ borderBottom: !isLastRow || hasFooter ? `1px solid ${COLOR.border}` : "none" }}
          >
            <span className="col-span-2 text-sm flex items-center gap-1.5 min-w-0" style={{ color: b.is_on_strike ? COLOR.accent : COLOR.ink }}>
              {b.is_on_strike && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR.accent }} />}
              <span className="truncate">
                {b.name}
                {b.dismissal ? <span className="block text-[10px]" style={{ color: COLOR.inkFaint }}>{b.dismissal}</span> : null}
              </span>
            </span>
            <span className="text-center text-sm font-bold" style={{ ...mono, color: COLOR.ink }}>{b.runs}</span>
            <span className="text-center text-sm" style={{ ...mono, color: COLOR.inkFaint }}>{b.balls_faced}</span>
            <span className="text-center text-xs" style={{ ...mono, color: COLOR.inkFaint }}>{sr}</span>
          </div>
        );
      })}

      {extras && extras.total > 0 && (
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ borderBottom: yetToBat && yetToBat.length > 0 ? `1px solid ${COLOR.border}` : "none" }}
        >
          <span className="text-sm" style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}>Extras</span>
          <span className="text-sm font-bold" style={{ ...mono, color: COLOR.amber }}>
            {extras.total}
            {(extras.byes || extras.legbyes || extras.wides || extras.noballs || extras.penalty) ? (
              <span className="text-xs font-normal ml-1.5" style={{ color: COLOR.inkFaint }}>
                (
                {[
                  extras.byes ? `b ${extras.byes}` : null,
                  extras.legbyes ? `lb ${extras.legbyes}` : null,
                  extras.wides ? `wd ${extras.wides}` : null,
                  extras.noballs ? `nb ${extras.noballs}` : null,
                  extras.penalty ? `pen ${extras.penalty}` : null,
                ].filter(Boolean).join(", ")}
                )
              </span>
            ) : null}
          </span>
        </div>
      )}

      {yetToBat && yetToBat.length > 0 && (
        <div className="px-4 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}>
            Yet to Bat 
          </div>
          <div className="flex flex-wrap gap-1.5">
            {yetToBat.map((p) => (
              <span
                key={p.id}
                className="px-2 py-1 rounded-md text-xs"
                style={{ backgroundColor: COLOR.surfaceRaised, color: COLOR.inkDim, ...mono }}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Fall-of-wickets strip: "1-12 (Player, 0.3 ov)" style entries in dismissal order.
function FallOfWicketsCard({ wickets, title }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={card}>
      {title && (
        <div
          className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
          style={{ color: COLOR.inkDim, fontFamily: FONT_DISPLAY, borderBottom: `1px solid ${COLOR.border}` }}
        >
          {title}
        </div>
      )}
      <div className="px-4 py-3">
        {wickets === null && (
          <span className="text-xs" style={{ color: COLOR.inkFaint }}>Fall of wickets data not available yet.</span>
        )}
        {wickets && wickets.length === 0 && (
          <span className="text-xs" style={{ color: COLOR.inkFaint }}>No wickets have fallen yet.</span>
        )}
        {wickets && wickets.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {wickets.map((raw, i) => {
              const { wicketNo, score, overDisplay, playerName } = fowEntryLabel(raw, i);
              return (
                <span key={i} className="text-xs" style={{ ...mono, color: COLOR.inkFaint }}>
                  <span style={{ color: COLOR.red, fontWeight: 700 }}>{wicketNo}</span>
                  -{score}{" "}
                  <span style={{ color: COLOR.ink }}>({playerName}{overDisplay != null ? `, ${overDisplay} ov` : ""})</span>
                  {i < wickets.length - 1 ? <span style={{ color: COLOR.inkFaint, opacity: 0.5 }}>{"  ·"}</span> : null}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BowlingTable({ bowlers, title, accentColor }) {
  if (!bowlers || bowlers.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden" style={card}>
      {title && (
        <div
          className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
          style={{ color: accentColor || COLOR.blue, fontFamily: FONT_DISPLAY, borderBottom: `1px solid ${COLOR.border}` }}
        >
          {title}
        </div>
      )}
      <div
        className="px-4 py-2 grid grid-cols-5 text-[10px] font-bold uppercase tracking-wide"
        style={{ color: COLOR.inkFaint, borderBottom: `1px solid ${COLOR.border}`, fontFamily: FONT_DISPLAY }}
      >
        <span className="col-span-2">Bowler</span><span className="text-center">O</span><span className="text-center">W</span><span className="text-center">ER</span>
      </div>
      {bowlers.map((b, i, arr) => {
        // Corrects the observed balls/4-instead-of-balls/6 bug (1 over showing
        // as "1.5", 2 overs as "3.0") — see correctBuggyBowlerOvers() above.
        const { display, trueDecimal } = correctBuggyBowlerOvers(b.overs_bowled);
        const er = trueDecimal > 0 ? (b.runs_conceded / trueDecimal).toFixed(2) : "0.00";
        return (
          <div
            key={b.player_id}
            className="px-4 py-2.5 grid grid-cols-5 items-center"
            style={{ borderBottom: i < arr.length - 1 ? `1px solid ${COLOR.border}` : "none" }}
          >
            <span className="col-span-2 text-sm flex items-center gap-1.5 min-w-0" style={{ color: b.is_current ? COLOR.blue : COLOR.ink }}>
              {b.is_current && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR.blue }} />}
              <span className="truncate">{b.name}</span>
            </span>
            <span className="text-center text-sm" style={{ ...mono, color: COLOR.inkFaint }}>{display}</span>
            <span className="text-center text-sm font-bold" style={{ ...mono, color: COLOR.red }}>{b.wickets}</span>
            <span className="text-center text-xs" style={{ ...mono, color: COLOR.inkFaint }}>{er}</span>
          </div>
        );
      })}
    </div>
  );
}

function FinalScoreboard({ matchId }) {
  const [data, setData] = useState(null);
  const [squads, setSquads] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api(`/api/matches/${matchId}/scoreboard`),
      api(`/api/matches/${matchId}/squads`).catch(() => null), // yet-to-bat is a bonus, don't block the scoreboard on it
    ])
      .then(([sc, sq]) => {
        if (cancelled) return;
        setData(sc);
        setSquads(sq);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [matchId]);

  if (error) return <div className="text-sm px-4 py-6" style={{ color: COLOR.red }}>Couldn't load scoreboard: {error}</div>;
  if (!data) return <div className="text-sm px-4 py-6" style={{ color: COLOR.inkDim }}>Loading scoreboard…</div>;

  return (
    <div className="space-y-5 lst-rise">
      <div className="rounded-2xl px-5 py-5 text-center" style={{ backgroundColor: COLOR.hero, border: "1px solid rgba(61,220,132,0.18)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: COLOR.inkFaint, fontFamily: FONT_DISPLAY }}>
          {data.match.team1_name} vs {data.match.team2_name}
        </div>
        <div className="text-lg font-bold" style={{ color: COLOR.accent, fontFamily: FONT_DISPLAY }}>{data.result}</div>
      </div>

      {data.innings.map((inn) => {
        const { display: inningsOversDisplay } = formatOvers(inn.overs);

        const battingSquad = squads
          ? (squads.team1?.name === inn.batting_team_name ? squads.team1 : squads.team2)
          : null;
        const battedIds = new Set((inn.batting || []).map((b) => b.player_id));
        const yetToBat = battingSquad ? battingSquad.players.filter((p) => !battedIds.has(p.id)) : [];

        const extras = computeExtrasBreakdown(inn);
        const fallOfWickets = getFallOfWickets(inn);

        return (
          <div key={inn.innings_number} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: COLOR.ink }}>{inn.batting_team_name} innings</span>
              <span className="text-sm" style={{ ...mono, color: COLOR.inkFaint }}>{inn.total_runs}/{inn.wickets} ({inningsOversDisplay} ov)</span>
            </div>
            <BattingTable batters={inn.batting} extras={extras} yetToBat={yetToBat} />
            <FallOfWicketsCard wickets={fallOfWickets} title="Fall of wickets" />
            <BowlingTable bowlers={inn.bowling} />
          </div>
        );
      })}
    </div>
  );
}