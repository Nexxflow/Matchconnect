import { useEffect, useState, useCallback, useRef } from "react";
import { API_BASE as SHARED_API_BASE, getStoredToken } from "../api";

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

const API_BASE = SHARED_API_BASE;

let globalLiveScoreToken = null;
export function setLiveScoreToken(token) {
  globalLiveScoreToken = token;
}

export function getMyCreatedMatchIds() {
  try {
    return JSON.parse(localStorage.getItem("mc_my_matches") || "[]").map(String);
  } catch {
    return [];
  }
}

export function saveCreatedMatchId(matchId) {
  if (!matchId) return;
  try {
    const ids = getMyCreatedMatchIds();
    if (!ids.includes(String(matchId))) {
      ids.push(String(matchId));
      localStorage.setItem("mc_my_matches", JSON.stringify(ids));
    }
  } catch {}
}

export function isMatchCreator(match, user) {
  if (!match) return false;
  const currentUserId = user?.id ? String(user.id) : null;
  // 1. Explicit flag from server
  if (match.is_creator === true) return true;
  // 2. Matches where created_by in DB matches user's ID
  if (currentUserId && match.created_by && String(match.created_by) === currentUserId) {
    return true;
  }
  // 3. Tournament matches where tournament creator matches user's ID
  if (currentUserId && match.tournament_creator_id && String(match.tournament_creator_id) === currentUserId) {
    return true;
  }
  if (currentUserId && match.tournament?.created_by && String(match.tournament.created_by) === currentUserId) {
    return true;
  }
  // 4. Matches stored in local storage for this browser/user session
  const localCreated = getMyCreatedMatchIds();
  if (localCreated.includes(String(match.id))) {
    return true;
  }
  return false;
}

async function api(path, options) {
  const token = options?.token || globalLiveScoreToken || getStoredToken();
  const cleanPath = path.startsWith("/api/")
    ? path.slice(4)
    : path.startsWith("api/")
    ? path.slice(3)
    : path.startsWith("/")
    ? path
    : `/${path}`;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const res = await fetch(`${API_BASE}${cleanPath}`, {
    ...options,
    headers,
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
  return formatOvers(rawOversBowled);
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

// Google & Cricbuzz Professional Theme Tokens — colorized
const FONT_DISPLAY = "'Inter', 'Outfit', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Roboto Mono', ui-monospace, SFMono-Regular, monospace";

const isLightMode = () =>
  typeof document !== "undefined" &&
  (document.documentElement.classList.contains("light") ||
   document.documentElement.getAttribute("data-theme") === "light");

const COLOR = {
  get bg() {
    return isLightMode()
      ? "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #eff6ff 100%)"
      : "linear-gradient(135deg, #0b0f17 0%, #0f172a 50%, #0b0f17 100%)";
  },
  get surface() {
    return isLightMode() ? "#ffffff" : "#131a26";
  },
  get surfaceRaised() {
    return isLightMode() ? "#f1f5f9" : "#1c2536";
  },
  get heroGradient() {
    return isLightMode()
      ? "linear-gradient(135deg, #ecfdf5 0%, #eff6ff 45%, #f5f3ff 75%, #fef3c7 100%)"
      : "linear-gradient(135deg, #052e16 0%, #0f172a 40%, #1e1b4b 70%, #0f172a 100%)";
  },
  get border() {
    return isLightMode() ? "#e2e8f0" : "#232f45";
  },
  get borderStrong() {
    return isLightMode() ? "#cbd5e1" : "#334155";
  },
  get ink() {
    return isLightMode() ? "#0f172a" : "#f8fafc";
  },
  get inkDim() {
    return isLightMode() ? "#475569" : "#94a3b8";
  },
  get inkFaint() {
    return isLightMode() ? "#64748b" : "#64748b";
  },
  get accent() {
    return "#10b981"; // Cricbuzz Green
  },
  get accentGradient() {
    return "linear-gradient(135deg,#22c55e 0%,#10b981 60%,#06b6d4 100%)";
  },
  get accentGlow() {
    return isLightMode() ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.22)";
  },
  get blue() {
    return isLightMode() ? "#0284c7" : "#38bdf8"; // Google Blue
  },
  get blueGradient() {
    return "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)";
  },
  get purple() {
    return isLightMode() ? "#9333ea" : "#a855f7"; // 6 Boundary Purple
  },
  get purpleGradient() {
    return "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)";
  },
  get red() {
    return isLightMode() ? "#dc2626" : "#ef4444"; // Wicket Red
  },
  get redGradient() {
    return "linear-gradient(135deg,#ef4444 0%,#dc2626 100%)";
  },
  get amber() {
    return isLightMode() ? "#d97706" : "#f59e0b"; // Extra/Warning Amber
  },
  get amberGradient() {
    return "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)";
  },
  get sky() {
    return isLightMode() ? "#0284c7" : "#38bdf8";
  },
};

const BALL_COLORS = {
  get wicket() { return { bg: "#ef4444", fg: "#ffffff", label: "W", grad: "linear-gradient(135deg,#ef4444,#dc2626)" }; },
  get six() { return { bg: "#8b5cf6", fg: "#ffffff", label: "6", grad: "linear-gradient(135deg,#a855f7,#ec4899)" }; },
  get boundary() { return { bg: "#10b981", fg: "#ffffff", label: "4", grad: "linear-gradient(135deg,#22c55e,#10b981)" }; },
  get noball() { return { bg: "#f59e0b", fg: "#000000", label: "NB", grad: "linear-gradient(135deg,#f59e0b,#f97316)" }; },
  get wide() { return { bg: "#f59e0b", fg: "#000000", label: "WD", grad: "linear-gradient(135deg,#f59e0b,#ec4899)" }; },
  get extra() { return { bg: "rgba(245,158,11,0.2)", fg: "#f59e0b", label: "EX", grad: "linear-gradient(135deg,rgba(245,158,11,0.3),rgba(236,72,153,0.2))" }; },
  get dot() {
    return isLightMode()
      ? { bg: "#e2e8f0", fg: "#475569", label: "•", grad: "linear-gradient(135deg,#e2e8f0,#cbd5e1)" }
      : { bg: "#1e293b", fg: "#64748b", label: "•", grad: "linear-gradient(135deg,#1e293b,#334155)" };
  },
  get single() {
    return isLightMode()
      ? { bg: "#f1f5f9", fg: "#0f172a", label: "1", grad: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }
      : { bg: "#334155", fg: "#f8fafc", label: "1", grad: "linear-gradient(135deg,#334155,#475569)" };
  },
};

const WICKET_TYPES = ["bowled", "caught", "lbw", "run_out", "stumped", "hit_wicket", "other"];
const NEEDS_FIELDER = new Set(["caught", "run_out", "stumped"]);

const cardStyle = {
  get backgroundColor() {
    return COLOR.surface;
  },
  get border() {
    return `1px solid ${COLOR.border}`;
  },
  get boxShadow() {
    return isLightMode()
      ? "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)"
      : "0 4px 20px -2px rgba(0, 0, 0, 0.3)";
  },
};

const BTN_TRANSITION = "transition-all duration-150 ease-out active:scale-[0.97]";

export default function ScoringApp({
  user,
  token,
  theme = "dark",
  initialMatchId = null,
  initialView = null,
  tournament = null,
  onBackToTournament = null,
}) {
  useEffect(() => {
    if (token) setLiveScoreToken(token);
  }, [token]);

  const [view, setView] = useState(initialView || "home");
  const [activeMatchId, setActiveMatchId] = useState(initialMatchId || null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  useEffect(() => {
    if (initialMatchId) {
      setActiveMatchId(initialMatchId);
      setView(initialView || "score");
    }
  }, [initialMatchId, initialView]);

  const goHome = useCallback(() => {
    setActiveMatchId(null);
    setView("home");
    setHomeRefreshKey((k) => k + 1);
  }, []);

  return (
    <div
      key={theme}
      className="max-w-2xl mx-auto space-y-5 px-2 py-3"
      style={{ background: COLOR.bg, color: COLOR.ink, fontFamily: FONT_DISPLAY }}
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

        @keyframes cb-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .cb-gradient-anim { background-size: 200% 200%; animation: cb-gradient-shift 6s ease infinite; }

        @keyframes cb-fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cb-fade-in-up { animation: cb-fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {(view !== "home" || onBackToTournament) && (
        <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {onBackToTournament && (
              <button
                onClick={onBackToTournament}
                className={`text-xs font-bold flex items-center gap-1.5 ${BTN_TRANSITION} py-2 px-3.5 rounded-xl shadow`}
                style={{
                  background: isLightMode() ? "#fef3c7" : "rgba(234,179,8,0.15)",
                  color: isLightMode() ? "#b45309" : "#facc15",
                  border: "1px solid rgba(234,179,8,0.4)"
                }}
              >
                <span>🏆</span>
                <span>Back to {tournament?.name || "Tournament"}</span>
              </button>
            )}
            {view !== "home" && (
              <button
                onClick={goHome}
                className={`text-xs font-bold flex items-center gap-2 ${BTN_TRANSITION} hover:text-emerald-400 py-2 px-3.5 rounded-xl shadow`}
                style={{ color: COLOR.ink, backgroundColor: COLOR.surface, border: `1px solid ${COLOR.border}` }}
              >
                <span style={{ fontFamily: FONT_MONO }}>←</span>
                <span>Matches List</span>
              </button>
            )}
          </div>

          {view !== "home" && (
            <button
              onClick={() => {
                if (view === "scoreboard") setView("score");
                else if (view === "score") setView("toss");
                else if (view === "toss") setView("squads");
                else if (view === "squads") setView("new");
                else if (view === "edit") setView("score");
                else if (onBackToTournament) onBackToTournament();
                else goHome();
              }}
              className={`text-xs font-bold flex items-center gap-1.5 ${BTN_TRANSITION} hover:text-sky-400 py-2 px-3.5 rounded-xl shadow`}
              style={{ color: COLOR.ink, backgroundColor: COLOR.surface, border: `1px solid ${COLOR.border}` }}
            >
              <span style={{ fontFamily: FONT_MONO }}>↩</span>
              <span>Back</span>
            </button>
          )}
        </div>
      )}

      {view === "home" && (
        <MatchHome
          user={user}
          key={homeRefreshKey}
          onScoreNew={() => setView("new")}
          onResume={(id, m) => {
            if (!isMatchCreator(m, user)) {
              alert("Only the creator of this scoreboard can resume it.");
              return;
            }
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
        <MatchLiveConsole user={user} matchId={activeMatchId} onBack={goHome} onChangeStage={(stage) => setView(stage)} onMatchComplete={() => setView("scoreboard")} />
      )}

      {view === "scoreboard" && activeMatchId && <FinalScoreboard user={user} matchId={activeMatchId} onBack={goHome} />}
    </div>
  );
}

function SetupProgress({ step }) {
  const steps = ["Match Setup", "Playing XI", "Toss", "Opening Players"];
  const stepGrads = [
    "linear-gradient(135deg,#22c55e 0%,#10b981 100%)",
    "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)",
    "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)",
    "linear-gradient(135deg,#a855f7 0%,#06b6d4 100%)"
  ];
  return (
    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl relative overflow-hidden" style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}` }}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#f59e0b,#a855f7)" }} />
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        const grad = stepGrads[i];
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                style={{
                  background: done || active ? grad : COLOR.surfaceRaised,
                  color: done || active ? "#ffffff" : COLOR.inkFaint,
                  border: active ? `1.5px solid #ffffff` : done ? "none" : `1px solid ${COLOR.border}`,
                  fontFamily: FONT_MONO,
                  boxShadow: done || active ? "0 3px 10px -3px rgba(0,0,0,0.5)" : "none",
                }}
              >
                {done ? "✓" : n}
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline"
                style={{
                  color: active ? (isLightMode() ? "#0f172a" : "#ffffff") : COLOR.inkFaint,
                }}
              >
                {label}
              </span>
            </div>
            {n < steps.length && (
              <div className="h-0.5 flex-1 rounded-full" style={{ background: done ? stepGrads[i] : COLOR.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompletedMatchCard({ match: m, onViewScoreboard, onDelete }) {
  const [potmData, setPotmData] = useState({
    name: m.potm_name,
    stats: m.potm_stats,
    team: m.potm_team,
    result: m.result,
  });

  useEffect(() => {
    // If potm or descriptive result is missing, auto-fetch scoreboard to compute & save it
    if ((!m.potm_name || !m.result || m.result === "Match completed") && m.status === "completed") {
      api(`/api/matches/${m.id}/scoreboard`)
        .then((res) => {
          if (res?.potm_name || res?.result) {
            setPotmData({
              name: res.potm_name || res.match?.potm_name,
              stats: res.potm_stats || res.match?.potm_stats,
              team: res.potm_team || res.match?.potm_team,
              result: res.result || res.match?.result,
            });
          }
        })
        .catch(() => {});
    }
  }, [m.id, m.potm_name, m.result, m.status]);

  // Compute innings scores & fallback outcome
  const innList = Array.isArray(m.innings_list) ? m.innings_list : [];
  const inn1 = innList.find((i) => i.inning_number === 1);
  const inn2 = innList.find((i) => i.inning_number === 2);

  let t1Score = null;
  let t2Score = null;
  if (inn1) {
    const isT1 = String(inn1.batting_team_id) === String(m.team1_id);
    const { display } = formatOvers(inn1.overs_completed || 0);
    const scoreStr = `${inn1.total_runs}/${inn1.wickets} (${display} ov)`;
    if (isT1) t1Score = scoreStr; else t2Score = scoreStr;
  }
  if (inn2) {
    const isT1 = String(inn2.batting_team_id) === String(m.team1_id);
    const { display } = formatOvers(inn2.overs_completed || 0);
    const scoreStr = `${inn2.total_runs}/${inn2.wickets} (${display} ov)`;
    if (isT1) t1Score = scoreStr; else t2Score = scoreStr;
  }

  // Determine realistic result string
  let displayResult = potmData.result || m.result;
  if (!displayResult || displayResult === "Match completed" || displayResult === "Match finished" || displayResult.toLowerCase().includes("chasing the target")) {
    if (inn1 && inn2) {
      const r1 = Number(inn1.total_runs || 0);
      const r2 = Number(inn2.total_runs || 0);
      const w2 = Number(inn2.wickets || 0);
      const t1Name = String(inn1.batting_team_id) === String(m.team1_id) ? m.team1_name : m.team2_name;
      const t2Name = String(inn2.batting_team_id) === String(m.team1_id) ? m.team1_name : m.team2_name;

      if (r2 > r1) {
        const wkts = Math.max(1, 10 - w2);
        displayResult = `${t2Name} won by ${wkts} wicket${wkts === 1 ? "" : "s"}`;
      } else if (r1 > r2) {
        const diff = r1 - r2;
        displayResult = `${t1Name} won by ${diff} run${diff === 1 ? "" : "s"}`;
      } else {
        displayResult = `Match tied (${r1} runs each)`;
      }
    } else {
      displayResult = "Match completed";
    }
  }

  const potmName = potmData.name || m.potm_name;
  const potmStats = potmData.stats || m.potm_stats;
  const potmTeam = potmData.team || m.potm_team;

  return (
    <div
      onClick={() => onViewScoreboard(m.id, m)}
      className={`w-full text-left p-4 sm:p-5 rounded-2xl space-y-3.5 transition-all cursor-pointer relative overflow-hidden group ${BTN_TRANSITION} hover:-translate-y-0.5 hover:shadow-xl`}
      style={{
        ...cardStyle,
        border: `1px solid ${isLightMode() ? "#a7f3d0" : "rgba(34,197,94,0.35)"}`,
        boxShadow: isLightMode()
          ? "0 4px 16px -6px rgba(22,163,74,0.15)"
          : "0 8px 26px -14px rgba(34,197,94,0.4)"
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899,#a855f7)" }} />
      {/* Top Header: Venue / Format & Completed Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-sm" style={{ background: "linear-gradient(135deg,#22c55e 0%,#10b981 100%)" }}>
            COMPLETED
          </span>
          <span className="text-xs font-mono" style={{ color: COLOR.inkDim }}>{m.venue || `${m.overs_limit || 20} Overs Match`}</span>
        </div>
        <span className="text-xs font-mono" style={{ color: COLOR.inkDim }}>{m.overs_limit} Overs</span>
      </div>

      {/* Teams and Scores Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Team 1 */}
        <div
          className="flex items-center justify-between p-2.5 rounded-xl relative overflow-hidden"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%)"
              : "linear-gradient(135deg,rgba(34,197,94,0.12) 0%,rgba(6,182,212,0.08) 100%)",
            border: `1px solid ${isLightMode() ? "#a7f3d0" : "rgba(34,197,94,0.3)"}`
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg,#22c55e,#10b981)" }} />
          <div className="flex items-center gap-2.5 pl-1">
            <div
              className="w-8 h-8 rounded-full font-extrabold flex items-center justify-center text-xs text-white shadow-md"
              style={{ background: "linear-gradient(135deg,#22c55e,#10b981)" }}
            >
              {teamInitials(m.team1_name)}
            </div>
            <span className="font-bold text-sm" style={{ color: COLOR.ink }}>{m.team1_name}</span>
          </div>
          {t1Score ? (
            <span
              className="font-mono font-bold text-sm"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#15803d,#0284c7)" : "linear-gradient(135deg,#4ade80,#38bdf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >{t1Score}</span>
          ) : (
            <span className="font-mono text-xs" style={{ color: COLOR.inkFaint }}>-</span>
          )}
        </div>

        {/* Team 2 */}
        <div
          className="flex items-center justify-between p-2.5 rounded-xl relative overflow-hidden"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)"
              : "linear-gradient(135deg,rgba(59,130,246,0.12) 0%,rgba(168,85,247,0.08) 100%)",
            border: `1px solid ${isLightMode() ? "#bfdbfe" : "rgba(59,130,246,0.3)"}`
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg,#3b82f6,#a855f7)" }} />
          <div className="flex items-center gap-2.5 pl-1">
            <div
              className="w-8 h-8 rounded-full font-extrabold flex items-center justify-center text-xs text-white shadow-md"
              style={{ background: "linear-gradient(135deg,#3b82f6,#a855f7)" }}
            >
              {teamInitials(m.team2_name)}
            </div>
            <span className="font-bold text-sm" style={{ color: COLOR.ink }}>{m.team2_name}</span>
          </div>
          {t2Score ? (
            <span
              className="font-mono font-bold text-sm"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#1d4ed8,#7e22ce)" : "linear-gradient(135deg,#60a5fa,#c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >{t2Score}</span>
          ) : (
            <span className="font-mono text-xs" style={{ color: COLOR.inkFaint }}>-</span>
          )}
        </div>
      </div>

      {/* Realistic Result Banner */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl relative overflow-hidden"
        style={{
          background: isLightMode()
            ? "linear-gradient(135deg,#fef3c7 0%,#ecfdf5 100%)"
            : "linear-gradient(135deg,rgba(245,158,11,0.15) 0%,rgba(34,197,94,0.12) 100%)",
          border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.35)"}`
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg,#f59e0b,#22c55e)" }} />
        <span className="text-base pl-1.5">🏆</span>
        <span
          className="text-xs sm:text-sm font-extrabold tracking-wide"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#b45309 0%,#15803d 100%)"
              : "linear-gradient(135deg,#fbbf24 0%,#4ade80 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          {displayResult}
        </span>
      </div>

      {/* Man of the Match / Player of the Match Showcase */}
      {potmName && (
        <div
          className="p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 relative overflow-hidden"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#fef3c7 0%,#fef9c3 50%,#fff7ed 100%)"
              : "linear-gradient(135deg,rgba(245,158,11,0.18) 0%,rgba(236,72,153,0.08) 100%)",
            border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.4)"}`
          }}
        >
          <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
          <div className="flex items-center gap-2.5 pl-1.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}
            >
              🏅
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: COLOR.amber }}>
                Man of the Match
              </div>
              <div className="text-xs sm:text-sm font-extrabold flex items-center gap-2" style={{ color: COLOR.ink }}>
                <span>{potmName}</span>
                {potmTeam && (
                  <span
                    className="text-[10px] font-normal px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: isLightMode() ? "#ffffff" : "rgba(15,23,42,0.6)",
                      color: COLOR.inkDim,
                      border: `1px solid ${COLOR.border}`
                    }}
                  >
                    {potmTeam}
                  </span>
                )}
              </div>
            </div>
          </div>
          {potmStats && (
            <div
              className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md shrink-0"
              style={{
                background: isLightMode() ? "#ffffff" : "rgba(15,23,42,0.7)",
                color: COLOR.amber,
                border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.3)"}`
              }}
            >
              {potmStats}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="pt-2 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${COLOR.border}` }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(m);
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${BTN_TRANSITION} hover:scale-105`}
          style={{
            background: "linear-gradient(135deg,rgba(239,68,68,0.12) 0%,rgba(220,38,38,0.12) 100%)",
            color: COLOR.red,
            border: `1px solid ${isLightMode() ? "#fecaca" : "rgba(239,68,68,0.35)"}`
          }}
        >
          🗑️ Delete
        </button>
        <span
          className="text-xs font-bold flex items-center gap-1"
          style={{
            background: COLOR.blueGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Full Scorecard ➔
        </span>
      </div>
    </div>
  );
}

function MatchHome({ user, onScoreNew, onResume, onViewScoreboard }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMatches = async () => {
      try {
        const json = await api("/api/matches");
        if (!cancelled) setMatches(json);
      } catch (err) {
        if (!cancelled && matches === null) setError(err.message);
      }
    };
    fetchMatches();
    // Background polling every 6s for real-time live scoreboard cards
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchMatches();
      }
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const myMatches = matches?.filter((m) => isMatchCreator(m, user)) || [];
  const inProgress = myMatches.filter((m) => m.status !== "completed");
  const completed = myMatches.filter((m) => m.status === "completed");

  const CARD_THEMES = [
    { grad: "linear-gradient(135deg,#22c55e 0%,#14b8a6 100%)", soft: "rgba(34,197,94,0.18)", ring: "rgba(34,197,94,0.45)", glow: "rgba(34,197,94,0.35)" },
    { grad: "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)", soft: "rgba(59,130,246,0.18)", ring: "rgba(59,130,246,0.45)", glow: "rgba(59,130,246,0.35)" },
    { grad: "linear-gradient(135deg,#f97316 0%,#ec4899 100%)", soft: "rgba(249,115,22,0.18)", ring: "rgba(249,115,22,0.45)", glow: "rgba(249,115,22,0.35)" },
    { grad: "linear-gradient(135deg,#a855f7 0%,#06b6d4 100%)", soft: "rgba(168,85,247,0.18)", ring: "rgba(168,85,247,0.45)", glow: "rgba(168,85,247,0.35)" }
  ];

  return (
    <div className="space-y-6">
      {/* Cricbuzz Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl relative overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316,#ec4899)" }} />
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,#22c55e 0%,transparent 70%)", opacity: 0.15 }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 cb-live-pulse" />
            <span
              className="text-xs font-extrabold uppercase tracking-widest"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              MatchConnect Live Engine
            </span>
          </div>
          <h2
            className="text-lg sm:text-xl font-black"
            style={{
              background: isLightMode()
                ? "linear-gradient(135deg,#0f172a 0%,#15803d 50%,#3b82f6 100%)"
                : "linear-gradient(135deg,#ffffff 0%,#4ade80 50%,#60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Google & Cricbuzz Scoreboard
          </h2>
        </div>
        <button
          onClick={onScoreNew}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg text-center relative z-10 ${BTN_TRANSITION} hover:scale-[1.03]`}
          style={{ background: COLOR.accentGradient, color: "#ffffff", boxShadow: "0 6px 20px -6px rgba(34,197,94,0.7)" }}
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

      {matches !== null && myMatches.length === 0 && !error && (
        <div className="text-center p-8 rounded-2xl relative overflow-hidden" style={{ border: `2px dashed ${COLOR.border}` }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
          <div className="text-4xl mb-2">🏏</div>
          <div
            className="text-sm font-black mb-1"
            style={{
              background: "linear-gradient(135deg,#22c55e 0%,#0d9488 60%,#3b82f6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            No Scoreboards Created Yet
          </div>
          <p className="text-xs mb-4 max-w-sm mx-auto" style={{ color: COLOR.inkDim }}>
            Only the creator of a match scoreboard can view and resume scoring. Create a match scoreboard to start scoring.
          </p>
          <button
            onClick={onScoreNew}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white ${BTN_TRANSITION} hover:scale-[1.03]`}
            style={{ background: COLOR.accentGradient, boxShadow: "0 6px 20px -6px rgba(34,197,94,0.7)" }}
          >
            Create Match
          </button>
        </div>
      )}

      {/* Live & In Progress Section (Only Creator Can See and Resume) */}
      {inProgress.length > 0 && (
        <div className="space-y-3">
          <div
            className="text-xs font-extrabold uppercase tracking-widest px-1 flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            <span className="w-1 h-3 rounded-full" style={{ background: "linear-gradient(180deg,#22c55e,#3b82f6)" }} />
            Live & Ongoing
          </div>
          {inProgress.map((m, idx) => {
            const { display: oversDisplay } = formatOvers(m.current_innings_summary?.overs_completed ?? 0);
            const ct = CARD_THEMES[idx % CARD_THEMES.length];
            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl space-y-3 relative overflow-hidden transition-all hover:scale-[1.005]"
                style={{
                  ...cardStyle,
                  border: `1px solid ${ct.ring}`,
                  boxShadow: `0 8px 26px -16px ${ct.glow}`
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: ct.grad }} />
                <div className="pl-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {m.status !== "not_started" ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-white shadow-sm" style={{ background: COLOR.redGradient }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white cb-live-pulse" /> LIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm" style={{ background: COLOR.blueGradient }}>
                          UPCOMING
                        </span>
                      )}
                      <span className="text-xs font-mono" style={{ color: COLOR.inkDim }}>{m.venue || "T20 Match"}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: COLOR.inkDim }}>{m.overs_limit} Overs</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full font-extrabold flex items-center justify-center text-xs text-white shadow-md"
                        style={{ background: ct.grad, boxShadow: `0 4px 12px -4px ${ct.glow}` }}
                      >
                        {teamInitials(m.team1_name)}
                      </div>
                      <span className="font-bold text-sm" style={{ color: COLOR.ink }}>{m.team1_name}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-lg font-black font-mono"
                        style={{
                          background: ct.grad,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text"
                        }}
                      >
                        {m.status === "not_started" ? "-" : `${m.current_innings_summary?.total_runs ?? 0}/${m.current_innings_summary?.wickets ?? 0}`}
                      </span>
                      {m.status !== "not_started" && (
                        <span className="text-xs block font-mono" style={{ color: COLOR.inkDim }}>({oversDisplay} ov)</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5" style={{ borderTop: `1px solid ${COLOR.border}` }}>
                    <span className="text-xs truncate max-w-full sm:max-w-[200px]" style={{ color: COLOR.inkDim }}>
                      vs {m.team2_name}
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${BTN_TRANSITION} hover:scale-105`}
                        style={{
                          background: "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.15) 100%)",
                          color: COLOR.red,
                          border: `1px solid ${isLightMode() ? "#fecaca" : "rgba(239,68,68,0.35)"}`
                        }}
                      >
                        🗑️ Delete
                      </button>
                      <button
                        onClick={() => onResume(m.id, m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white ${BTN_TRANSITION} hover:scale-105`}
                        style={{ background: COLOR.accentGradient, boxShadow: "0 4px 14px -6px rgba(34,197,94,0.7)" }}
                      >
                        {m.status === "not_started" ? "Setup XI & Toss" : "Resume Scoring ✍️"}
                      </button>
                    </div>
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
          <div
            className="text-xs font-extrabold uppercase tracking-widest px-1 flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            <span className="w-1 h-3 rounded-full" style={{ background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
            Completed Matches
          </div>
          {completed.map((m) => (
            <CompletedMatchCard
              key={m.id}
              match={m}
              onViewScoreboard={onViewScoreboard}
              onDelete={async (matchToDelete) => {
                if (!window.confirm(`Are you sure you want to delete completed match "${matchToDelete.team1_name} vs ${matchToDelete.team2_name}"?`)) return;
                try {
                  await api(`/api/matches/${matchToDelete.id}`, { method: "DELETE" });
                  setMatches((prev) => prev.filter((item) => item.id !== matchToDelete.id));
                } catch (err) {
                  alert(err.message || "Failed to delete match");
                }
              }}
            />
          ))}
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
            created_by: user?.id || undefined,
          }),
        });
        saveCreatedMatchId(res.match_id);
        onCreated(res.match_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 p-5 rounded-2xl relative overflow-hidden" style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316)" }} />
      <SetupProgress step={1} />
      <h3
        className="text-lg font-black"
        style={{
          background: isLightMode()
            ? "linear-gradient(135deg,#15803d 0%,#0d9488 50%,#3b82f6 100%)"
            : "linear-gradient(135deg,#4ade80 0%,#22d3ee 50%,#60a5fa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}
      >
        {matchId ? "Edit Match Details & Overs" : "Create New Cricket Match"}
      </h3>

      {error && <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: COLOR.accent }}>Team 1 (Batting first / Home)</label>
            <input
              type="text"
              value={team1Name}
              onChange={(e) => setTeam1Name(e.target.value)}
              placeholder="e.g. Royal Challengers"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#f0fdf4 100%)" : "linear-gradient(135deg,#111 0%,#101a12 100%)",
                border: `1px solid ${isLightMode() ? "#a7f3d0" : "rgba(34,197,94,0.3)"}`,
                color: COLOR.ink
              }}
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: COLOR.blue }}>Team 2 (Opponent)</label>
            <input
              type="text"
              value={team2Name}
              onChange={(e) => setTeam2Name(e.target.value)}
              placeholder="e.g. Super Kings"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#eff6ff 100%)" : "linear-gradient(135deg,#111 0%,#0f1420 100%)",
                border: `1px solid ${isLightMode() ? "#bfdbfe" : "rgba(59,130,246,0.3)"}`,
                color: COLOR.ink
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: COLOR.purple }}>Venue / Ground</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Eden Gardens"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#f5f3ff 100%)" : "linear-gradient(135deg,#111 0%,#140f1a 100%)",
                border: `1px solid ${isLightMode() ? "#ddd6fe" : "rgba(168,85,247,0.3)"}`,
                color: COLOR.ink
              }}
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: COLOR.amber }}>Overs Per Innings</label>
            <input
              type="number"
              min="1"
              max="50"
              value={oversLimit}
              onChange={(e) => setOversLimit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none transition-all"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#fffbeb 100%)" : "linear-gradient(135deg,#111 0%,#1a1408 100%)",
                border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.3)"}`,
                color: COLOR.ink
              }}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 ${BTN_TRANSITION} hover:scale-[1.01]`}
            style={{ background: COLOR.accentGradient, boxShadow: "0 6px 20px -6px rgba(34,197,94,0.7)" }}
          >
            {submitting ? "Saving..." : matchId ? "Save Match Updates ✓" : "Next: Playing XI →"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-bold text-xs"
            style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim }}
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
    <div className="space-y-4 p-5 rounded-2xl relative overflow-hidden" style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316)" }} />
      <SetupProgress step={2} />
      <h3
        className="text-lg font-black flex items-center justify-between"
        style={{
          background: isLightMode()
            ? "linear-gradient(135deg,#15803d 0%,#0d9488 50%,#3b82f6 100%)"
            : "linear-gradient(135deg,#4ade80 0%,#22d3ee 50%,#60a5fa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}
      >
        <span>Playing XI Squads</span>
      </h3>

      <p className="text-xs" style={{ color: COLOR.inkDim }}>Enter or edit player names (one per line) for each team.</p>

      {successMsg && (
        <div className="text-xs p-3 rounded-xl font-extrabold text-white shadow-md" style={{ background: COLOR.accentGradient, boxShadow: "0 6px 20px -6px rgba(34,197,94,0.7)" }}>
          {successMsg}
        </div>
      )}

      {error && <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: COLOR.accent }}>{team1Title} Roster</label>
            <textarea
              rows="6"
              value={t1Players}
              onChange={(e) => setT1Players(e.target.value)}
              placeholder="Virat Kohli&#10;Rohit Sharma&#10;KL Rahul"
              className="w-full p-3 rounded-xl text-xs outline-none font-mono transition-all"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#f0fdf4 100%)" : "linear-gradient(135deg,#111 0%,#101a12 100%)",
                border: `1px solid ${isLightMode() ? "#a7f3d0" : "rgba(34,197,94,0.3)"}`,
                color: COLOR.ink
              }}
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: COLOR.blue }}>{team2Title} Roster</label>
            <textarea
              rows="6"
              value={t2Players}
              onChange={(e) => setT2Players(e.target.value)}
              placeholder="Steve Smith&#10;David Warner&#10;Pat Cummins"
              className="w-full p-3 rounded-xl text-xs outline-none font-mono transition-all"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#eff6ff 100%)" : "linear-gradient(135deg,#111 0%,#0f1420 100%)",
                border: `1px solid ${isLightMode() ? "#bfdbfe" : "rgba(59,130,246,0.3)"}`,
                color: COLOR.ink
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs"
              style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim }}
            >
              ← Back to Details
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${BTN_TRANSITION} hover:scale-[1.01]`}
            style={{ background: COLOR.accentGradient, boxShadow: "0 6px 20px -6px rgba(34,197,94,0.7)" }}
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
    <div className="space-y-4 p-5 rounded-2xl relative overflow-hidden" style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316)" }} />
      <SetupProgress step={3} />
      <h3
        className="text-lg font-black"
        style={{
          background: isLightMode()
            ? "linear-gradient(135deg,#15803d 0%,#0d9488 50%,#3b82f6 100%)"
            : "linear-gradient(135deg,#4ade80 0%,#22d3ee 50%,#60a5fa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}
      >
        Toss Decision
      </h3>

      {error && <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold block mb-2" style={{ color: COLOR.inkDim }}>Who won the toss?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTossWinner("team1")}
              className={`p-3 rounded-xl text-xs font-bold ${BTN_TRANSITION} hover:scale-[1.02]`}
              style={{
                background: tossWinner === "team1" ? COLOR.accentGradient : COLOR.surfaceRaised,
                color: tossWinner === "team1" ? "#ffffff" : COLOR.ink,
                border: tossWinner === "team1" ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                boxShadow: tossWinner === "team1" ? "0 6px 18px -6px rgba(34,197,94,0.7)" : "none",
              }}
            >
              {team1Name}
            </button>
            <button
              type="button"
              onClick={() => setTossWinner("team2")}
              className={`p-3 rounded-xl text-xs font-bold ${BTN_TRANSITION} hover:scale-[1.02]`}
              style={{
                background: tossWinner === "team2" ? COLOR.accentGradient : COLOR.surfaceRaised,
                color: tossWinner === "team2" ? "#ffffff" : COLOR.ink,
                border: tossWinner === "team2" ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                boxShadow: tossWinner === "team2" ? "0 6px 18px -6px rgba(34,197,94,0.7)" : "none",
              }}
            >
              {team2Name}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold block mb-2" style={{ color: COLOR.inkDim }}>Elected to?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision("bat")}
              className={`p-3 rounded-xl text-xs font-bold ${BTN_TRANSITION} hover:scale-[1.02]`}
              style={{
                background: decision === "bat" ? COLOR.blueGradient : COLOR.surfaceRaised,
                color: decision === "bat" ? "#ffffff" : COLOR.ink,
                border: decision === "bat" ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                boxShadow: decision === "bat" ? "0 6px 18px -6px rgba(59,130,246,0.7)" : "none",
              }}
            >
              Bat First 🏏
            </button>
            <button
              type="button"
              onClick={() => setDecision("bowl")}
              className={`p-3 rounded-xl text-xs font-bold ${BTN_TRANSITION} hover:scale-[1.02]`}
              style={{
                background: decision === "bowl" ? COLOR.blueGradient : COLOR.surfaceRaised,
                color: decision === "bowl" ? "#ffffff" : COLOR.ink,
                border: decision === "bowl" ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                boxShadow: decision === "bowl" ? "0 6px 18px -6px rgba(59,130,246,0.7)" : "none",
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
              className="px-3.5 py-3 rounded-xl font-bold text-xs"
              style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim }}
            >
              ← Edit Squads
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-1 py-3 rounded-xl font-extrabold text-sm text-white ${BTN_TRANSITION} hover:scale-[1.01]`}
            style={{ background: COLOR.accentGradient, boxShadow: "0 8px 24px -6px rgba(34,197,94,0.7)" }}
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
function MatchLiveConsole({ user, matchId, onBack, onChangeStage, onMatchComplete }) {
  const [squads, setSquads] = useState(null);
  const [live, setLive] = useState(null);
  const [prompts, setPrompts] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [extraPicker, setExtraPicker] = useState(null);
  const [wicketPanelOpen, setWicketPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [activeTab, setActiveTab] = useState("live"); // live | scorecard | commentary | squads
  const [editingPlayer, setEditingPlayer] = useState(null); // { id, name }
  const [newNameInput, setNewNameInput] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showBowlerPicker, setShowBowlerPicker] = useState(false);
  const toastTimerRef = useRef(null);
  const scoringQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);

  const loadSquads = useCallback(async () => {
    try {
      const sq = await api(`/api/matches/${matchId}/squads`);
      setSquads(sq);
    } catch {}
  }, [matchId]);

  const loadScorecard = useCallback(async () => {
    try {
      const sc = await api(`/api/matches/${matchId}/scoreboard`);
      setScorecard(sc);
    } catch {}
  }, [matchId]);

  async function handleSavePlayerName() {
    if (!editingPlayer || !newNameInput.trim()) return;
    setIsUpdatingName(true);
    try {
      const freshLive = await api(`/api/matches/${matchId}/players/${editingPlayer.id}/update-name`, {
        method: "POST",
        body: JSON.stringify({ name: newNameInput.trim() }),
      });
      setLive(freshLive);
      setToast({ text: `Renamed to ${newNameInput.trim()}!`, color: COLOR.accent });
      setEditingPlayer(null);
      loadScorecard();
      loadSquads();
    } catch (err) {
      setToast({ text: `Failed to update name: ${err.message}`, color: COLOR.red });
    } finally {
      setIsUpdatingName(false);
    }
  }

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

  // Determine if the current user is the match creator/scorer
  const isCreator = isMatchCreator(live?.match, user);

  // Real-time asynchronous polling: ONLY for viewers (creators receive instant state via action responses)
  useEffect(() => {
    if (isCreator) return;
    const timer = setInterval(async () => {
      if (
        !document.hidden &&
        scoringQueueRef.current.length === 0 &&
        !isProcessingQueueRef.current
      ) {
        try {
          const fresh = await api(`/api/matches/${matchId}/live`);
          if (scoringQueueRef.current.length === 0) {
            setLive(fresh);
            if (fresh?.prompts) setPrompts(fresh.prompts);
          }
        } catch {}
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [matchId, isCreator]);

  const processScoringQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;
    setIsSyncing(true);

    try {
      while (scoringQueueRef.current.length > 0) {
        const nextAction = scoringQueueRef.current.shift();
        try {
          const json = await api(nextAction.path, {
            method: "POST",
            body: JSON.stringify(nextAction.body),
          });
          // Reconcile canonical state when queue is cleared
          if (scoringQueueRef.current.length === 0) {
            setLive(json);
            if (json.prompts) setPrompts(json.prompts);
            loadScorecard();
          }
        } catch (err) {
          console.error("Scoring sync error:", err);
          setError(err.message);
          setToast({ text: `Sync error: ${err.message}`, color: COLOR.red });
          // Resync from server on failure
          try {
            const freshLive = await api(`/api/matches/${matchId}/live`);
            setLive(freshLive);
            if (freshLive.prompts) setPrompts(freshLive.prompts);
            loadScorecard();
          } catch {}
          break;
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
      setIsSyncing(false);
    }
  }, [matchId, loadScorecard]);

  async function runAction(path, body) {
    setBusy(true);
    setError(null);
    try {
      const json = await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      setLive(json);
      setPrompts(json.prompts || null);
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

  function recordBall({
    runs = 0,
    extra_type = null,
    extra_runs = 0,
    is_wicket = false,
    wicket_type = null,
    dismissed_player_id = null,
    fielder_id = null,
  }) {
    if (!live || !live.current_innings) return;

    const activeBatters = live.batting?.filter((b) => !b.is_out) || [];
    const striker = activeBatters.find((b) => b.is_on_strike) || activeBatters[0];
    const nonStriker =
      activeBatters.find((b) => !b.is_on_strike && b.player_id !== striker?.player_id) ||
      activeBatters.find((b) => b.player_id !== striker?.player_id);
    const striker_id = striker?.player_id;
    const non_striker_id = nonStriker?.player_id;
    const currentBowler = live.bowling?.find((b) => b.is_current);
    const bowler_id = currentBowler?.player_id;

    if (!striker_id || !non_striker_id || striker_id === non_striker_id) {
      setPrompts((prev) => ({ ...prev, needs_new_batsman: true }));
      return;
    }

    const isOverBoundary = !currentBowler && Number(live.current_innings?.overs_completed || 0) > 0;
    if (!bowler_id || isOverBoundary) {
      setShowBowlerPicker(true);
      setToast({ text: "Please click 'Start Next Over' to select a bowler", color: COLOR.blue });
      return;
    }

    const runsNum = Number(runs || 0);
    const extraR = Number(extra_runs || 0);
    const totalR = runsNum + extraR;
    const isLegal = extra_type !== "wide" && extra_type !== "noball";
    const battingCredit = ["bye", "legbye", "wide"].includes(extra_type) ? 0 : runsNum;
    const countsAsFaced = extra_type !== "wide";

    // Toast alert for boundaries / wickets
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    let toastMsg = null;
    if (is_wicket) toastMsg = { text: "WICKET!", color: COLOR.red };
    else if (runsNum === 6) toastMsg = { text: "SIX!", color: COLOR.purple };
    else if (runsNum === 4) toastMsg = { text: "FOUR!", color: COLOR.accent };

    if (toastMsg) {
      setToast(toastMsg);
      toastTimerRef.current = setTimeout(() => setToast(null), 1400);
    }

    // 1. Calculate new overs
    const currentOversNum = Number(live.current_innings.overs_completed || 0);
    const wholeOvers = Math.floor(currentOversNum);
    const ballsInOver = Math.round((currentOversNum - wholeOvers) * 10);
    const totalLegalBalls = wholeOvers * 6 + ballsInOver + (isLegal ? 1 : 0);
    const newWholeOvers = Math.floor(totalLegalBalls / 6);
    const newRemBalls = totalLegalBalls % 6;
    const newOversCompleted = Number(`${newWholeOvers}.${newRemBalls}`);
    const isOverComplete = isLegal && newRemBalls === 0;

    // 2. Strike rotation: odd runs off bat or odd bye/legbye rotates strike; flips again at over end
    const runsThatRotate = ["bye", "legbye"].includes(extra_type) ? extraR : runsNum;
    let flipStrike = !is_wicket && (runsThatRotate % 2 === 1);
    if (isOverComplete) {
      flipStrike = !flipStrike;
    }

    // 3. Batting stats update
    const outPlayerId = is_wicket ? (dismissed_player_id || striker_id) : null;
    const updatedBatters = (live.batting || []).map((b) => {
      let isOut = b.is_out;
      let dismissal = b.dismissal;
      let r = Number(b.runs || 0);
      let bf = Number(b.balls_faced || 0);
      let f = Number(b.fours || 0);
      let s = Number(b.sixes || 0);
      let onStrike = b.is_on_strike;

      if (b.player_id === striker_id) {
        r += battingCredit;
        if (countsAsFaced) bf += 1;
        if (battingCredit === 4) f += 1;
        if (battingCredit === 6) s += 1;
      }

      if (is_wicket && b.player_id === outPlayerId) {
        isOut = true;
        dismissal = wicket_type || "out";
        onStrike = false;
      } else if (flipStrike && !isOut) {
        if (b.player_id === striker_id || b.player_id === non_striker_id) {
          onStrike = !onStrike;
        }
      }

      return {
        ...b,
        runs: r,
        balls_faced: bf,
        fours: f,
        sixes: s,
        is_out: isOut,
        dismissal,
        is_on_strike: onStrike,
      };
    });

    // 4. Bowling stats update
    const updatedBowlers = (live.bowling || []).map((bw) => {
      if (bw.player_id === bowler_id) {
        const rawBowlerBalls = Math.floor(Number(bw.overs_bowled || 0)) * 6 + Math.round((Number(bw.overs_bowled || 0) % 1) * 10) + (isLegal ? 1 : 0);
        const bWhole = Math.floor(rawBowlerBalls / 6);
        const bRem = rawBowlerBalls % 6;
        return {
          ...bw,
          runs_conceded: Number(bw.runs_conceded || 0) + totalR,
          wickets: Number(bw.wickets || 0) + (is_wicket ? 1 : 0),
          overs_bowled: Number(`${bWhole}.${bRem}`),
          is_current: isOverComplete ? false : true,
        };
      }
      return bw;
    });

    // 5. Recent balls update
    const newBallRecord = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      runs: runsNum,
      extra_type,
      extra_runs: extraR,
      is_wicket: !!is_wicket,
      wicket_type,
    };
    const updatedRecentBalls = [...(live.recent_balls || []), newBallRecord];

    // 6. Innings summary update
    const updatedInnings = {
      ...live.current_innings,
      total_runs: Number(live.current_innings.total_runs || 0) + totalR,
      wickets: Number(live.current_innings.wickets || 0) + (is_wicket ? 1 : 0),
      overs_completed: newOversCompleted,
    };

    // Apply optimistic updates to live state immediately (0ms delay)
    setLive((prev) => ({
      ...prev,
      current_innings: updatedInnings,
      batting: updatedBatters,
      bowling: updatedBowlers,
      recent_balls: updatedRecentBalls,
    }));

    // Concurrently update full scorecard state so scorecard tab has 0ms delay
    setScorecard((prev) => {
      if (!prev || !prev.innings) return prev;
      const inningsIndex = prev.innings.findIndex(
        (i) => i.innings_number === live.current_innings.inning_number
      );
      if (inningsIndex === -1) return prev;
      const updatedInningsList = [...prev.innings];
      updatedInningsList[inningsIndex] = {
        ...updatedInningsList[inningsIndex],
        total_runs: updatedInnings.total_runs,
        wickets: updatedInnings.wickets,
        overs: formatOvers(newOversCompleted).display,
        batting: updatedBatters,
        bowling: updatedBowlers,
      };
      return { ...prev, innings: updatedInningsList };
    });

    setExtraPicker(null);
    setWicketPanelOpen(false);

    if (is_wicket && isOverComplete) {
      const dismissedBatter = live.batting?.find((b) => b.player_id === outPlayerId);
      const isStrikerOut = outPlayerId === striker_id;
      setPrompts({
        needs_new_batsman: true,
        needs_new_bowler: true,
        last_bowler_id: bowler_id,
        replaced_position: isStrikerOut ? "striker" : "non_striker",
        dismissed_name: dismissedBatter?.name || (isStrikerOut ? "Striker" : "Non-Striker"),
        dismissed_player_id: outPlayerId,
      });
    } else if (is_wicket) {
      const dismissedBatter = live.batting?.find((b) => b.player_id === outPlayerId);
      const isStrikerOut = outPlayerId === striker_id;
      setPrompts({
        needs_new_batsman: true,
        replaced_position: isStrikerOut ? "striker" : "non_striker",
        dismissed_name: dismissedBatter?.name || (isStrikerOut ? "Striker" : "Non-Striker"),
        dismissed_player_id: outPlayerId,
      });
    } else if (isOverComplete) {
      setPrompts({
        needs_new_bowler: false,
        is_over_ended: true,
        last_bowler_id: bowler_id,
      });
    }

    // Enqueue background action for asynchronous non-blocking sync
    scoringQueueRef.current.push({
      path: `/api/matches/${matchId}/balls`,
      body: {
        runs: runsNum,
        extra_type,
        extra_runs: extraR,
        is_wicket,
        wicket_type,
        dismissed_player_id: outPlayerId,
        fielder_id,
        striker_id,
        non_striker_id,
        bowler_id,
      },
    });

    processScoringQueue();
  }

  async function handleUndo() {
    if (scoringQueueRef.current.length > 0) {
      setToast({ text: "Completing pending balls...", color: COLOR.amber });
      return;
    }
    setIsSyncing(true);
    setError(null);
    setShowBowlerPicker(false);
    try {
      const json = await api(`/api/matches/${matchId}/balls/undo`, { method: "POST" });
      setLive(json);
      setPrompts(json.prompts || null);
      setShowBowlerPicker(false);
      loadScorecard();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function completeMatch() {
    const result = window.prompt("Match Summary Result (e.g. 'Royal Challengers won by 18 runs'):");
    if (result === null) return;
    setBusy(true);
    try {
      await api(`/api/matches/${matchId}/complete`, { method: "POST", body: JSON.stringify({ result }) });
      const freshLive = await api(`/api/matches/${matchId}/live`);
      setLive(freshLive);
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
    const addedPlayer = teamObj?.players?.find(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    ) || teamObj?.players?.[teamObj.players.length - 1];
    return addedPlayer?.id || null;
  }

  if (error && !showBowlerPicker) {
    const isBowlerConsecutiveError =
      error.toLowerCase().includes("cannot bowl") ||
      error.toLowerCase().includes("consecutive") ||
      error.toLowerCase().includes("different bowler") ||
      error.toLowerCase().includes("bowler");

    return (
      <div className="space-y-4">
        <div
          className="text-xs p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg relative overflow-hidden"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)"
              : "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.1) 100%)",
            border: `1px solid ${isLightMode() ? "#fecaca" : "rgba(239,68,68,0.4)"}`,
            color: COLOR.red
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.redGradient }} />
          <div className="flex items-center gap-2.5">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="space-y-0.5">
              <div className="font-extrabold text-sm" style={{ color: COLOR.red }}>
                {isBowlerConsecutiveError ? "Bowler Selection Warning" : "Error Notice"}
              </div>
              <div className="text-xs font-semibold" style={{ color: COLOR.red }}>
                Error: {error.replace(/^Error:\s*/i, "")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={async () => {
                setError(null);
                if (!live || !squads) {
                  try {
                    const [sq, lv] = await Promise.all([
                      api(`/api/matches/${matchId}/squads`),
                      api(`/api/matches/${matchId}/live`),
                    ]);
                    setSquads(sq);
                    setLive(lv);
                  } catch {}
                }
                setShowBowlerPicker(true);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md flex items-center gap-1.5 ${BTN_TRANSITION} hover:scale-105`}
              style={{ background: COLOR.blueGradient, boxShadow: "0 6px 20px -6px rgba(59,130,246,0.7)" }}
            >
              <span>Choose Bowler ➔</span>
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold ${BTN_TRANSITION}`}
              style={{
                background: COLOR.surfaceRaised,
                color: COLOR.inkDim,
                border: `1px solid ${COLOR.border}`
              }}
            >
              Dismiss
            </button>
          </div>
        </div>

        {(!live || !squads) && (
          <div className="text-center py-4">
            <button
              onClick={() => {
                setError(null);
                if (onBack) onBack();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${BTN_TRANSITION}`}
              style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim }}
            >
              ← Back to Matches
            </button>
          </div>
        )}
      </div>
    );
  }
  if (!squads || !live) return <div className="text-xs p-6" style={{ color: COLOR.inkDim }}>Loading Match Console...</div>;

  if (!isCreator) {
    return (
      <div
        className="p-8 text-center space-y-4 rounded-2xl max-w-md mx-auto my-8 relative overflow-hidden"
        style={{
          background: isLightMode()
            ? "linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)"
            : "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.1) 100%)",
          border: `1px solid ${isLightMode() ? "#fecaca" : "rgba(239,68,68,0.4)"}`
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.redGradient }} />
        <div className="text-4xl">🔒</div>
        <h3 className="text-base font-extrabold" style={{ color: COLOR.red }}>Scoreboard Access Restricted</h3>
        <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: COLOR.inkDim }}>
          Only the creator of this scoreboard can resume and view this live scoreboard. Other users cannot access it.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${BTN_TRANSITION}`}
            style={{ background: COLOR.surfaceRaised, color: COLOR.ink, border: `1px solid ${COLOR.border}` }}
          >
            ← Back to Matches
          </button>
        )}
      </div>
    );
  }

  const { match, current_innings, batting, bowling, recent_balls } = live;

  if (!live.current_innings) {
    if (live.match?.status === "completed") {
      return (
        <div className="p-6 rounded-2xl text-center space-y-4 relative overflow-hidden" style={cardStyle}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899,#a855f7)" }} />
          <div className="text-4xl animate-bounce">🏆</div>
          <div
            className="text-lg font-black"
            style={{
              background: "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Match Completed
          </div>
          <div
            className="inline-block px-4 py-2 rounded-xl font-extrabold text-sm sm:text-base"
            style={{
              background: isLightMode()
                ? "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)"
                : "linear-gradient(135deg,rgba(34,197,94,0.15) 0%,rgba(6,182,212,0.1) 100%)",
              color: COLOR.accent,
              border: `1px solid ${isLightMode() ? "#a7f3d0" : "rgba(34,197,94,0.35)"}`
            }}
          >
            {live.match.result || "Match finished"}
          </div>

          {live.match.potm_name && (
            <div
              className="max-w-md mx-auto p-4 rounded-2xl text-left space-y-2 shadow-lg relative overflow-hidden"
              style={{
                background: isLightMode()
                  ? "linear-gradient(135deg,#fef3c7 0%,#fef9c3 50%,#fff7ed 100%)"
                  : "linear-gradient(135deg,rgba(245,158,11,0.18) 0%,rgba(236,72,153,0.08) 100%)",
                border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.4)"}`
              }}
            >
              <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
              <div className="flex items-center gap-3 pl-1.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}
                >
                  🏅
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: COLOR.amber }}>
                    Man of the Match
                  </div>
                  <div className="text-sm font-extrabold" style={{ color: COLOR.ink }}>
                    {live.match.potm_name}
                    {live.match.potm_team && (
                      <span className="text-xs font-normal ml-2" style={{ color: COLOR.inkDim }}>
                        ({live.match.potm_team})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {live.match.potm_stats && (
                <div
                  className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg"
                  style={{
                    background: isLightMode() ? "#ffffff" : "rgba(15,23,42,0.7)",
                    color: COLOR.amber,
                    border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.3)"}`
                  }}
                >
                  {live.match.potm_stats}
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => {
                if (onMatchComplete) {
                  onMatchComplete();
                } else {
                  setActiveTab("scorecard");
                }
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white ${BTN_TRANSITION} hover:scale-[1.03]`}
              style={{ background: COLOR.accentGradient, boxShadow: "0 6px 20px -6px rgba(34,197,94,0.7)" }}
            >
              View Full Scoreboard ➔
            </button>
          </div>
        </div>
      );
    }
    if (live.first_innings) {
      return (
        <div className="p-6 rounded-2xl space-y-4 relative overflow-hidden" style={cardStyle}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#f59e0b)" }} />
          <div className="text-center space-y-2 pb-4" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
            <span className="text-4xl">🏏</span>
            <h3
              className="text-lg font-black"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              Innings 1 Completed — Innings Break
            </h3>
            <p className="text-xs" style={{ color: COLOR.inkDim }}>
              <strong style={{ color: COLOR.accent }}>{live.first_innings.batting_team}</strong> scored{" "}
              <strong className="text-sm" style={{ color: COLOR.ink }}>{live.first_innings.total_runs}/{live.first_innings.wickets}</strong> in{" "}
              <span className="font-mono" style={{ color: COLOR.ink }}>{live.first_innings.overs_completed}</span> overs
            </p>
            <div className="inline-block px-4 py-1.5 rounded-full text-xs font-black text-white shadow-md" style={{ background: COLOR.amberGradient, boxShadow: "0 6px 18px -6px rgba(245,158,11,0.7)" }}>
              Target for {live.match.batting_team}: {live.first_innings.target} Runs ({live.match.overs_limit} ov)
            </div>
          </div>

          {isCreator ? (
            <div className="space-y-3">
              <p className="text-xs text-center" style={{ color: COLOR.inkDim }}>
                Select opening batters for <strong style={{ color: COLOR.accent }}>{live.match.batting_team}</strong> and opening bowler for <strong style={{ color: COLOR.blue }}>{live.match.bowling_team}</strong> to begin the 2nd innings chase.
              </p>
              <OpeningSelectors
                squads={squads}
                match={live.match}
                inningsNumber={2}
                onStart={(payload) => runAction(`/api/matches/${matchId}/start-innings`, { ...payload, innings_number: 2 })}
                onAddPlayer={addPlayer}
                busy={busy}
              />
            </div>
          ) : (
            <div className="text-center py-4 text-xs" style={{ color: COLOR.inkDim }}>
              Waiting for the match scorer to start the 2nd innings...
            </div>
          )}
        </div>
      );
    }

    if (!isCreator) {
      return (
        <div className="p-6 rounded-2xl text-center space-y-2" style={cardStyle}>
          <div className="text-2xl">⏳</div>
          <div className="text-sm font-bold" style={{ color: COLOR.ink }}>Match Setup Pending</div>
          <p className="text-xs" style={{ color: COLOR.inkDim }}>The match creator has not started the first innings yet.</p>
        </div>
      );
    }
    return (
      <OpeningSelectors
        squads={squads}
        match={live.match}
        inningsNumber={1}
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
          <div className="text-sm font-bold" style={{ color: COLOR.ink }}>Wicket Fallen</div>
          <p className="text-xs" style={{ color: COLOR.inkDim }}>Waiting for the match scorer to select the next batter...</p>
        </div>
      );
    }
    const battingIsTeam1 = live.match.batting_team === live.match.team1_name;
    const battingSquad = battingIsTeam1 ? squads.team1 : squads.team2;
    const battingKey = battingIsTeam1 ? "team1_players" : "team2_players";

    // Remaining partner at the crease who is not out
    const remainingBatter = live.batting?.find((b) => !b.is_out);

    // Determine which position got out (striker or non-striker)
    const isStrikerOut = prompts.replaced_position
      ? prompts.replaced_position === "striker"
      : !remainingBatter?.is_on_strike;
    const positionLabel = isStrikerOut ? "Striker (On Strike)" : "Non-Striker";
    const dismissedName = prompts.dismissed_name || (isStrikerOut ? "Striker" : "Non-Striker");
    const currentBowler = live.bowling?.find((b) => b.is_current) || live.bowling?.[0];

    // Players from squad who haven't batted yet
    const alreadyBatted = new Set(live.batting?.map((b) => b.player_id));
    const available = (battingSquad?.players || []).filter((p) => !alreadyBatted.has(p.id));

    return (
      <div className="space-y-3">
        {/* Context banner showing the exact dismissed player, remaining partner, and bowler */}
        <div
          className="p-4 rounded-xl flex items-center justify-between relative overflow-hidden"
          style={{
            background: isLightMode() ? "#ffffff" : "#131a26",
            border: `1px solid ${isLightMode() ? "#fecaca" : "rgba(239,68,68,0.4)"}`,
            boxShadow: `0 6px 22px -12px ${isLightMode() ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.6)"}`
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: COLOR.redGradient }} />
          <div className="pl-2">
            <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: COLOR.red }}>
              <span>🔴 Wicket Fallen</span>
              <span className="font-bold" style={{ color: COLOR.ink }}>— {dismissedName} ({isStrikerOut ? "Striker" : "Non-Striker"}) is Out</span>
            </div>
            <div className="text-xs mt-1 flex items-center gap-2" style={{ color: COLOR.inkDim }}>
              <span>Partner at Crease: <strong style={{ color: COLOR.accent }}>{remainingBatter?.name || "Partner"}</strong></span>
              {currentBowler && (
                <span className="font-mono text-[11px] pl-2" style={{ borderLeft: `1px solid ${COLOR.border}` }}>
                  Bowler: <strong style={{ color: COLOR.blue }}>{currentBowler.name}</strong>
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white shadow-sm" style={{ background: COLOR.amberGradient }}>
            Replacing {positionLabel}
          </span>
        </div>

        <PlayerPicker
          title={`Select New Batter (Replacing ${positionLabel})`}
          players={available}
          onPick={(id) => {
            runAction(`/api/matches/${matchId}/new-batsman`, {
              player_id: id,
              replaces_position: isStrikerOut ? "striker" : "non_striker",
            }).catch(() => {});
          }}
          onAddNew={(name) => addPlayer(battingKey, name)}
          busy={busy}
        />
      </div>
    );
  }

  const currentBowler = live.bowling?.find((b) => b.is_current);
  const isOverEnded = Boolean(
    !currentBowler &&
    Number(current_innings?.overs_completed || 0) > 0 &&
    !current_innings?.is_completed &&
    live.match?.status !== "completed"
  );

  if (showBowlerPicker) {
    if (!isCreator) {
      return (
        <div className="p-6 rounded-2xl text-center space-y-2" style={cardStyle}>
          <div className="text-2xl">⚾</div>
          <div className="text-sm font-bold" style={{ color: COLOR.ink }}>End of Over</div>
          <p className="text-xs" style={{ color: COLOR.inkDim }}>Waiting for the match scorer to select the next bowler...</p>
        </div>
      );
    }
    const bowlingIsTeam1 = live.match.bowling_team === live.match.team1_name;
    const bowlingSquad = bowlingIsTeam1 ? squads.team1 : squads.team2;
    const bowlingKey = bowlingIsTeam1 ? "team1_players" : "team2_players";
    const lastBowlerId = prompts?.last_bowler_id || live.last_bowler_id;
    const available = (bowlingSquad?.players || []).filter((p) => String(p.id) !== String(lastBowlerId));
    const lastBowler = bowlingSquad?.players?.find((p) => String(p.id) === String(lastBowlerId)) || (lastBowlerId ? { name: live.last_bowler_name || "Previous bowler" } : null);

    return (
      <div className="space-y-3">
        {error && (
          <div
            className="p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-md relative overflow-hidden"
            style={{
              background: isLightMode()
                ? "linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)"
                : "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.1) 100%)",
              border: `1px solid ${isLightMode() ? "#fecaca" : "rgba(239,68,68,0.4)"}`,
              color: COLOR.red
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: COLOR.redGradient }} />
            <div className="flex items-center gap-2 pl-2">
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-[11px] px-2.5 py-1 rounded-lg"
              style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim }}
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        <div
          className="p-3.5 rounded-xl flex items-center justify-between text-xs relative overflow-hidden"
          style={{
            background: isLightMode() ? "#ffffff" : "#131a26",
            border: `1px solid ${isLightMode() ? "#bfdbfe" : "rgba(59,130,246,0.4)"}`,
            boxShadow: `0 6px 22px -12px ${isLightMode() ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.6)"}`
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: COLOR.blueGradient }} />
          <div className="flex items-center gap-2 pl-2">
            <span className="text-base">⚾</span>
            <div style={{ color: COLOR.inkDim }}>
              {lastBowler ? (
                <span><strong style={{ color: COLOR.ink }}>{lastBowler.name}</strong> completed the previous over</span>
              ) : (
                <span>Select bowler for the next over</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastBowler && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-sm" style={{ background: COLOR.amberGradient }}>
                Cannot bowl consecutive overs
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowBowlerPicker(false);
              }}
              className="text-xs px-2.5 py-1 rounded-lg transition"
              style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim, border: `1px solid ${COLOR.border}` }}
            >
              ✕ Back to Scorecard
            </button>
          </div>
        </div>

        <PlayerPicker
          title={`Select Bowler for Over ${Math.floor(Number(current_innings.overs_completed || 0)) + 1}`}
          players={available}
          onPick={async (id) => {
            try {
              await runAction(`/api/matches/${matchId}/select-bowler`, { bowler_id: id });
              setShowBowlerPicker(false);
            } catch (err) {
              setShowBowlerPicker(true);
            }
          }}
          onAddNew={async (name) => {
            const newId = await addPlayer(bowlingKey, name);
            if (newId) {
              try {
                await runAction(`/api/matches/${matchId}/select-bowler`, { bowler_id: newId });
                setShowBowlerPicker(false);
              } catch (err) {
                setShowBowlerPicker(true);
              }
            }
            return newId;
          }}
          busy={busy}
        />
      </div>
    );
  }

  const inningsOvers = formatOvers(current_innings.overs_completed || 0);
  const crr = inningsOvers.trueDecimal > 0
    ? (current_innings.total_runs / inningsOvers.trueDecimal).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-4">
      {/* Google & Cricbuzz Hero Match Header */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden space-y-4"
        style={{ background: COLOR.heroGradient, border: `1px solid ${COLOR.border}`, boxShadow: "0 12px 34px -16px rgba(0,0,0,0.6)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316,#ec4899)" }} />
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(34,197,94,0.35) 0%,transparent 70%)" }} />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(168,85,247,0.3) 0%,transparent 70%)" }} />

        {toast && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider z-20 shadow-lg cb-slide-down text-white"
            style={{ background: toast.color, boxShadow: `0 6px 20px -6px ${toast.color}` }}
          >
            {toast.text}
          </div>
        )}

        <div className="flex items-center justify-between text-xs relative z-10" style={{ color: COLOR.inkDim }}>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 text-white shadow-sm" style={{ background: COLOR.redGradient }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white cb-live-pulse" /> LIVE
            </span>
            <span className="font-semibold" style={{ color: COLOR.ink }}>{match.venue || "Stadium"}</span>
          </div>
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 font-mono text-white shadow-sm" style={{ background: COLOR.amberGradient }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Syncing...
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 font-mono text-white shadow-sm" style={{ background: COLOR.accentGradient }}>
                ⚡ Real-time
              </span>
            )}
            <span className="font-mono" style={{ color: COLOR.inkDim }}>{match.overs_limit} Overs Match</span>
          </div>
        </div>

        {/* Score & Teams */}
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{
                background: COLOR.accentGradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              {match.batting_team} Batting
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className="text-4xl font-black font-mono tracking-tight"
                style={{
                  background: isLightMode()
                    ? "linear-gradient(135deg,#0f172a 0%,#15803d 50%,#3b82f6 100%)"
                    : "linear-gradient(135deg,#ffffff 0%,#4ade80 50%,#60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                {current_innings.total_runs}<span className="text-2xl" style={{ color: COLOR.inkDim, WebkitTextFillColor: COLOR.inkDim }}>/{current_innings.wickets}</span>
              </span>
              <span className="text-sm font-bold font-mono" style={{ color: COLOR.inkDim }}>
                ({inningsOvers.display} / {match.overs_limit} ov)
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs font-mono" style={{ color: COLOR.inkDim }}>
              CRR:{" "}
              <span
                className="font-bold"
                style={{
                  background: COLOR.accentGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                {crr}
              </span>
            </div>
            <div className="text-[11px] truncate max-w-[140px]" style={{ color: COLOR.inkDim }}>
              vs {match.bowling_team}
            </div>
          </div>
        </div>

        {/* 2nd Innings Target & RRR Chase Banner */}
        {live.chase && (
          <div
            className="p-3.5 rounded-xl space-y-1.5 relative overflow-hidden"
            style={{
              background: isLightMode()
                ? "linear-gradient(135deg,#fef3c7 0%,#fef9c3 100%)"
                : "linear-gradient(135deg,rgba(245,158,11,0.18) 0%,rgba(236,72,153,0.1) 100%)",
              border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.5)"}`,
              boxShadow: isLightMode() ? "0 6px 22px -12px rgba(245,158,11,0.4)" : "0 6px 22px -12px rgba(245,158,11,0.7)"
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.amberGradient }} />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold" style={{ color: COLOR.amber }}>
                <span className="text-sm">🎯</span> Target: <span className="font-mono text-sm font-black" style={{ color: COLOR.ink }}>{live.chase.target}</span>
              </div>
              <div className="font-mono text-xs" style={{ color: COLOR.inkDim }}>
                RRR:{" "}
                <span
                  className="font-bold"
                  style={{
                    background: COLOR.amberGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}
                >
                  {live.chase.required_run_rate}
                </span>
              </div>
            </div>
            <div className="text-xs font-semibold flex items-center justify-between" style={{ color: COLOR.ink }}>
              <span>
                {live.chase.runs_needed > 0
                  ? `${match.batting_team} need ${live.chase.runs_needed} runs from ${live.chase.balls_remaining} balls`
                  : `🏆 ${match.batting_team} achieved the target!`}
              </span>
              <span className="text-[10px] font-mono" style={{ color: COLOR.inkDim }}>
                CRR: {crr}
              </span>
            </div>
          </div>
        )}

        {/* Mode Indicator Banner & Quick Setup Editors */}
        <div className="text-[11px] font-semibold pt-1 flex items-center justify-between relative z-10" style={{ color: COLOR.inkDim, borderTop: `1px solid ${COLOR.border}` }}>
          {isCreator ? (
            <div className="flex items-center justify-between w-full gap-2">
              <span
                className="font-bold flex items-center gap-1"
                style={{
                  background: COLOR.accentGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                ✍️ Scorer Console
              </span>
                {onChangeStage && (
                  <button
                    onClick={() => onChangeStage("edit")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${BTN_TRANSITION}`}
                    style={{ background: COLOR.surfaceRaised, color: COLOR.ink, border: `1px solid ${COLOR.border}` }}
                  >
                    ⚙️ Edit Overs
                  </button>
                )}
            </div>
          ) : (
            <span
              className="font-bold flex items-center gap-1"
              style={{
                background: COLOR.blueGradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              👁️ Viewer Mode — Auto Live Updates
            </span>
          )}
        </div>

        {/* Cricbuzz Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 pt-3 overflow-x-auto relative z-10" style={{ borderTop: `1px solid ${COLOR.border}` }}>
          {[
            { id: "live", label: isCreator ? "Overview & Scorer" : "Live Overview" },
            { id: "scorecard", label: "Full Scorecard" },
            { id: "commentary", label: "Ball-by-Ball" },
            { id: "squads", label: "Playing XI" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${BTN_TRANSITION} hover:scale-[1.03]`}
              style={
                activeTab === tab.id
                  ? { background: COLOR.accentGradient, color: "#ffffff", boxShadow: "0 4px 14px -4px rgba(34,197,94,0.7)" }
                  : { background: "transparent", color: COLOR.inkDim }
              }
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
          <div className="p-4 rounded-2xl space-y-2 relative overflow-hidden" style={cardStyle}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
            <div className="flex items-center justify-between text-xs">
              <span
                className="font-extrabold uppercase tracking-wider"
                style={{
                  background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                This Over Timeline
              </span>
              {currentBowler && <span className="font-mono" style={{ color: COLOR.accent }}>Bowler: {currentBowler.name}</span>}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {recent_balls.map((raw, i) => {
                const b = classifyBall(raw);
                const colorDef = BALL_COLORS[b.type] || BALL_COLORS.single;
                return (
                  <div
                    key={raw.id ?? i}
                    className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 font-mono shadow-md"
                    style={{ background: colorDef.grad || colorDef.bg, color: colorDef.fg, boxShadow: `0 4px 12px -4px ${colorDef.bg}` }}
                  >
                    {b.val}
                  </div>
                );
              })}
              {recent_balls.length === 0 && (
                <span className="text-xs italic" style={{ color: COLOR.inkFaint }}>No balls bowled yet in this over.</span>
              )}
            </div>
          </div>

          {/* Active Batsmen & Bowler Cards (Exactly 2 active crease batters: Striker & Non-Striker) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {batting
              .filter((b) => !b.is_out)
              .slice(0, 2)
              .map((b) => {
              const sr = b.balls_faced > 0 ? ((b.runs / b.balls_faced) * 100).toFixed(1) : "0.0";
              return (
                <div
                  key={b.player_id}
                  className="p-3.5 rounded-2xl transition-all relative overflow-hidden"
                  style={{
                    background: b.is_on_strike
                      ? (isLightMode() ? "linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%)" : "linear-gradient(135deg,#0f1a12 0%,#101a12 100%)")
                      : COLOR.surface,
                    border: b.is_on_strike ? `1px solid ${COLOR.accent}` : `1px solid ${COLOR.border}`,
                    boxShadow: b.is_on_strike ? "0 6px 22px -12px rgba(34,197,94,0.7)" : "none"
                  }}
                >
                  {b.is_on_strike && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.accentGradient }} />}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: COLOR.ink }}>
                      {b.is_on_strike && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 cb-live-pulse" />}
                      <span className="truncate">{b.name}</span>
                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlayer({ id: b.player_id, name: b.name });
                            setNewNameInput(b.name);
                          }}
                          title="Rename batsman"
                          className="p-0.5 rounded text-[11px] transition-colors shrink-0"
                          style={{ color: COLOR.inkDim }}
                        >
                          ✎
                        </button>
                      )}
                    </span>
                    {b.is_on_strike ? (
                      <span
                        className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded text-white shadow-sm"
                        style={{ background: COLOR.accentGradient }}
                      >
                        STRIKE
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase" style={{ color: COLOR.inkDim }}>NON-STRIKER</span>
                    )}
                  </div>
                  <div className="text-base font-black font-mono" style={{ color: COLOR.ink }}>
                    {b.runs} <span className="text-xs font-normal" style={{ color: COLOR.inkDim }}>({b.balls_faced}b)</span>
                  </div>
                  <div className="text-[10px] font-mono mt-1" style={{ color: COLOR.inkDim }}>SR: {sr}</div>
                </div>
              );
            })}

            {bowling.filter((b) => b.is_current).map((b) => {
              const bOvers = correctBuggyBowlerOvers(b.overs_bowled);
              const er = bOvers.trueDecimal > 0 ? (b.runs_conceded / bOvers.trueDecimal).toFixed(2) : "0.00";
              return (
                <div
                  key={b.player_id}
                  className="p-3.5 rounded-2xl col-span-2 relative overflow-hidden"
                  style={{
                    background: isLightMode() ? "linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)" : "linear-gradient(135deg,#0f1420 0%,#140f1a 100%)",
                    border: `1px solid ${COLOR.blue}`,
                    boxShadow: "0 6px 22px -12px rgba(59,130,246,0.7)"
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.blueGradient }} />
                  <div className="text-xs font-bold mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        style={{
                          background: COLOR.blueGradient,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text"
                        }}
                      >
                        Current Bowler: {b.name}
                      </span>
                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlayer({ id: b.player_id, name: b.name });
                            setNewNameInput(b.name);
                          }}
                          title="Rename bowler"
                          className="p-0.5 rounded text-[11px] transition-colors"
                          style={{ color: COLOR.inkDim }}
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono" style={{ color: COLOR.inkDim }}>
                    <span>{bOvers.display} Overs</span>
                    <span>{b.wickets} Wkts</span>
                    <span>{b.runs_conceded} Runs</span>
                    <span
                      className="font-bold"
                      style={{
                        background: COLOR.blueGradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text"
                      }}
                    >
                      ER {er}
                    </span>
                  </div>
                </div>
              );
            })}

            {!currentBowler && live.last_bowler_name && (
              <div className="p-3 rounded-2xl col-span-2 flex items-center justify-between text-xs relative overflow-hidden" style={{ background: COLOR.surfaceRaised, border: `1px solid ${COLOR.border}` }}>
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: COLOR.amberGradient }} />
                <span className="pl-2" style={{ color: COLOR.inkDim }}>Previous Bowler: <strong style={{ color: COLOR.ink }}>{live.last_bowler_name}</strong></span>
                <span className="text-[11px] px-2 py-0.5 rounded text-white shadow-sm font-mono" style={{ background: COLOR.amberGradient }}>
                  Cannot bowl consecutive overs
                </span>
              </div>
            )}
          </div>

          {!isCreator && (
            <div
              className="p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs border shadow-sm relative overflow-hidden"
              style={{
                background: isLightMode() ? "#f0fdf4" : "rgba(34,197,94,0.08)",
                borderColor: isLightMode() ? "#bbf7d0" : "rgba(34,197,94,0.25)",
                color: isLightMode() ? "#166534" : "#4ade80"
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">📡</span>
                <div>
                  <div className="font-extrabold uppercase tracking-wide">Live Spectator Mode</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Scores update automatically in real-time. Only the tournament organizer or match creator can enter scores.
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse shrink-0">
                LIVE
              </span>
            </div>
          )}

          {!isCreator && isOverEnded && !currentBowler && (
            <div className="p-3.5 rounded-2xl text-center text-xs relative overflow-hidden" style={{ background: COLOR.surface, border: `1px solid rgba(59,130,246,0.4)` }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.blueGradient }} />
              <span style={{ color: COLOR.inkDim }}>⚾ Over {formatOvers(current_innings.overs_completed).display} Completed. Waiting for next over to begin...</span>
            </div>
          )}

          {/* INTERIOR SCORER CONTROL PANEL (ONLY VISIBLE TO MATCH CREATOR) */}
          {isCreator && (
            <div
              className="p-4 rounded-2xl space-y-3 relative overflow-hidden"
              style={{
                ...cardStyle,
                border: `1px solid ${COLOR.accent}`,
                boxShadow: "0 8px 26px -14px rgba(34,197,94,0.7)"
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.accentGradient }} />
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-extrabold uppercase tracking-widest"
                  style={{
                    background: COLOR.accentGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}
                >
                  Scorer Controls
                </span>
                <button
                  onClick={handleUndo}
                  disabled={isSyncing && scoringQueueRef.current.length > 0}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${BTN_TRANSITION}`}
                  style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim, border: `1px solid ${COLOR.border}` }}
                >
                  ↩ Undo Ball
                </button>
              </div>

              {isOverEnded && !currentBowler ? (
                <div
                  className="p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden"
                  style={{
                    background: isLightMode()
                      ? "linear-gradient(135deg,#eff6ff 0%,#ecfeff 100%)"
                      : "linear-gradient(135deg,#0f1420 0%,#0a1a1a 100%)",
                    border: `1px solid ${COLOR.blue}`,
                    boxShadow: "0 8px 26px -14px rgba(59,130,246,0.7)"
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.blueGradient }} />
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-2xl">⚾</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color: COLOR.ink }}>
                        Over {formatOvers(current_innings.overs_completed).display} Completed
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: COLOR.inkDim }}>
                        {live.last_bowler_name
                          ? `${live.last_bowler_name} bowled the last over.`
                          : "Review previous deliveries or proceed to the next over."}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBowlerPicker(true)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
                    style={{ background: COLOR.blueGradient, boxShadow: "0 8px 24px -6px rgba(59,130,246,0.8)" }}
                  >
                    <span>Start Next Over (Choose Bowler) ➔</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Run Buttons — 0ms Instant Click with Background Sync */}
                  <div className="grid grid-cols-6 gap-2">
                    {[0, 1, 2, 3, 4, 6].map((r) => {
                      const runGrad = r === 6
                        ? COLOR.purpleGradient
                        : r === 4
                        ? COLOR.accentGradient
                        : null;
                      return (
                        <button
                          key={r}
                          onClick={() => recordBall({ runs: r })}
                          className={`py-3 rounded-xl font-black text-sm font-mono shadow-md ${BTN_TRANSITION} hover:scale-[1.05]`}
                          style={{
                            background: runGrad || COLOR.surfaceRaised,
                            color: runGrad ? "#ffffff" : COLOR.ink,
                            boxShadow: runGrad ? `0 6px 18px -6px ${r === 6 ? "rgba(168,85,247,0.7)" : "rgba(34,197,94,0.7)"}` : "none"
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>

                  {/* Extras Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {["wide", "noball", "bye", "legbye"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setExtraPicker(t)}
                        className={`py-2 rounded-xl text-xs font-bold ${BTN_TRANSITION} hover:scale-[1.03]`}
                        style={{
                          background: isLightMode() ? "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)" : "linear-gradient(135deg,rgba(245,158,11,0.15) 0%,rgba(239,68,68,0.12) 100%)",
                          color: COLOR.amber,
                          border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.4)"}`
                        }}
                      >
                        {t === "noball" ? "No Ball" : t === "legbye" ? "Leg Bye" : t.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Wicket Button */}
                  <button
                    onClick={() => setWicketPanelOpen(true)}
                    className={`w-full py-3 rounded-xl font-extrabold text-sm text-white shadow-lg ${BTN_TRANSITION} hover:scale-[1.01]`}
                    style={{ background: COLOR.redGradient, boxShadow: "0 8px 24px -6px rgba(239,68,68,0.8)" }}
                  >
                    OUT / WICKET 🔴
                  </button>
                </>
              )}

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
        <div className="p-4 rounded-2xl space-y-3 relative overflow-hidden" style={cardStyle}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#3b82f6,#a855f7,#ec4899)" }} />
          <div className="flex items-center justify-between">
            <h4
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{
                background: "linear-gradient(135deg,#3b82f6 0%,#a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              Ball-by-Ball Delivery Log ({match.batting_team})
            </h4>
            <span className="text-[10px] font-mono" style={{ color: COLOR.inkFaint }}>Latest to Earliest</span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {(live.commentary_balls && live.commentary_balls.length > 0 ? live.commentary_balls : recent_balls.slice().reverse()).map((b, idx) => {
              const ballClass = classifyBall(b);
              const badge = BALL_COLORS[ballClass.type] || BALL_COLORS.single;
              const overDeliveryText = b.over_number != null ? `${b.over_number - 1}.${b.ball_number} over` : `Ball ${b.ball_number || idx + 1}`;

              let eventDesc = `${b.runs} run${b.runs === 1 ? "" : "s"}`;
              if (b.is_wicket) {
                eventDesc = `WICKET! (${(b.wicket_type || "Out").replace(/_/g, " ").toUpperCase()})`;
              } else if (b.extra_type) {
                eventDesc = `Extra: ${b.extra_type.toUpperCase()} (+${Number(b.extra_runs || 0) + Number(b.runs || 0)} run${(Number(b.extra_runs || 0) + Number(b.runs || 0)) === 1 ? "" : "s"})`;
              } else if (b.runs === 0) {
                eventDesc = "0 run (Dot ball)";
              } else if (b.runs === 4) {
                eventDesc = "4 runs (FOUR!)";
              } else if (b.runs === 6) {
                eventDesc = "6 runs (SIX!)";
              }

              const matchup = b.bowler_name && b.batsman_name
                ? `${b.bowler_name} to ${b.batsman_name}`
                : b.batsman_name ? `Batter: ${b.batsman_name}` : null;

              return (
                <div
                  key={b.id || idx}
                  className="p-3 rounded-xl flex items-start gap-3 text-xs transition-colors relative overflow-hidden"
                  style={{
                    background: isLightMode()
                      ? "linear-gradient(135deg,#f8fafc 0%,#ffffff 100%)"
                      : "linear-gradient(135deg,#131a26 0%,#1a2333 100%)",
                    border: `1px solid ${COLOR.border}`
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: badge.grad || badge.bg }} />
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5 pl-1">
                    <span
                      className="w-8 h-8 rounded-full font-bold flex items-center justify-center font-mono text-xs shadow-md"
                      style={{ background: badge.grad || badge.bg, color: badge.fg, boxShadow: `0 4px 12px -4px ${badge.bg}` }}
                    >
                      {ballClass.val}
                    </span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: COLOR.inkDim }}>
                      {overDeliveryText.replace(" over", " ov")}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="font-bold"
                        style={{
                          color: b.is_wicket
                            ? COLOR.red
                            : b.runs === 4
                            ? COLOR.accent
                            : b.runs === 6
                            ? COLOR.purple
                            : COLOR.ink
                        }}
                      >
                        {overDeliveryText} {eventDesc}
                      </span>
                      {b.extra_type && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded text-white shadow-sm" style={{ background: COLOR.amberGradient }}>
                          {b.extra_type}
                        </span>
                      )}
                    </div>
                    {matchup && (
                      <p className="text-[11px] truncate" style={{ color: COLOR.inkDim }}>
                        {matchup}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {(!live.commentary_balls || live.commentary_balls.length === 0) && recent_balls.length === 0 && (
              <div className="text-xs py-8 text-center" style={{ color: COLOR.inkFaint }}>No deliveries bowled yet in this innings.</div>
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

      {/* Complete Match & End Innings Controls (ONLY VISIBLE TO CREATOR) */}
      {isCreator && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          {current_innings?.inning_number === 1 && (
            <button
              onClick={async () => {
                if (window.confirm("Are you sure you want to end the 1st innings now and set the target for 2nd innings?")) {
                  await runAction(`/api/matches/${matchId}/end-innings`);
                }
              }}
              disabled={busy}
              className={`py-3 px-2 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white shadow-md ${BTN_TRANSITION} hover:scale-[1.02]`}
              style={{ background: COLOR.amberGradient, boxShadow: "0 6px 20px -6px rgba(245,158,11,0.7)" }}
            >
              End 1st Innings ➔
            </button>
          )}
          <button
            onClick={completeMatch}
            disabled={busy}
            className={`${current_innings?.inning_number === 1 ? "" : "col-span-2"} py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white shadow-md ${BTN_TRANSITION} hover:scale-[1.02]`}
            style={{ background: COLOR.purpleGradient, boxShadow: "0 6px 20px -6px rgba(168,85,247,0.7)" }}
          >
            Finish & Complete Match
          </button>
        </div>
      )}

      {/* Edit Player Name Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-fadeIn relative overflow-hidden" style={{ background: COLOR.surface, border: `1px solid ${COLOR.accent}` }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: COLOR.ink }}>
                <span>✏️</span> Edit Player Name
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="text-sm font-bold"
                style={{ color: COLOR.inkDim }}
              >
                ✕
              </button>
            </div>
            <p className="text-xs" style={{ color: COLOR.inkDim }}>
              Update player name in the live scoreboard, scorecard, and database:
            </p>
            <input
              type="text"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              placeholder="Enter player name"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold focus:outline-none transition-all"
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#f0fdf4 100%)" : "linear-gradient(135deg,#111 0%,#101a12 100%)",
                border: `1px solid ${isLightMode() ? "#a7f3d0" : "rgba(34,197,94,0.4)"}`,
                color: COLOR.ink
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSavePlayerName();
              }}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newNameInput.trim() || isUpdatingName}
                onClick={handleSavePlayerName}
                className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-white disabled:opacity-50"
                style={{ background: COLOR.accentGradient, boxShadow: "0 6px 18px -6px rgba(34,197,94,0.7)" }}
              >
                {isUpdatingName ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScorecardView({ scorecard, live, squads }) {
  if (!scorecard && !live) return <div className="text-xs p-4" style={{ color: COLOR.inkDim }}>Loading scorecard...</div>;
  const currentInningsSc = scorecard?.innings?.find((i) => i.innings_number === live?.current_innings?.inning_number) || scorecard?.innings?.[0];
  const batters = live?.batting?.length ? live.batting : (currentInningsSc?.batting || []);
  const bowlers = live?.bowling?.length ? live.bowling : (currentInningsSc?.bowling || []);
  const fow = live?.fall_of_wickets ?? currentInningsSc?.fall_of_wickets ?? [];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl relative overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.accentGradient }} />
        <div
          className="text-xs font-bold mb-2 uppercase"
          style={{
            background: COLOR.accentGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Batting Scorecard
        </div>
        <BattingTable batters={batters} />
      </div>

      <div className="p-4 rounded-2xl relative overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.blueGradient }} />
        <div
          className="text-xs font-bold mb-2 uppercase"
          style={{
            background: COLOR.blueGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Bowling Figures
        </div>
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
      <div className="p-4 rounded-2xl space-y-2 relative overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.redGradient }} />
        <div
          className="text-xs font-extrabold uppercase tracking-wider"
          style={{
            background: COLOR.redGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Fall of Wickets
        </div>
        <div className="text-xs font-mono italic" style={{ color: COLOR.inkFaint }}>No wickets have fallen yet.</div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl space-y-2 relative overflow-hidden" style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.redGradient }} />
      <div
        className="text-xs font-extrabold uppercase tracking-wider"
        style={{
          background: COLOR.redGradient,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}
      >
        Fall of Wickets
      </div>
      <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
        {fow.map((w, idx) => (
          <div
            key={w.wicket_num || idx}
            className="px-3 py-1.5 rounded-xl flex items-center gap-2 relative overflow-hidden"
            style={{ background: COLOR.surfaceRaised, border: `1px solid ${COLOR.border}` }}
          >
            <span className="font-extrabold" style={{ color: COLOR.red }}>{w.wicket_num}-{w.score}</span>
            <span className="font-sans text-xs" style={{ color: COLOR.ink }}>({w.player_name}, {w.overs_display} ov)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SquadsView({ squads, match }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-4 rounded-2xl space-y-2 relative overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.accentGradient }} />
        <h4
          className="text-xs font-extrabold uppercase"
          style={{
            background: COLOR.accentGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          {match?.team1_name || "Team 1"} XI
        </h4>
        <div className="space-y-1">
          {squads?.team1?.players?.map((p, idx) => (
            <div key={p.id || idx} className="text-xs font-medium py-1" style={{ color: COLOR.ink, borderBottom: `1px solid ${COLOR.border}` }}>
              {idx + 1}. {p.name}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl space-y-2 relative overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.blueGradient }} />
        <h4
          className="text-xs font-extrabold uppercase"
          style={{
            background: COLOR.blueGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          {match?.team2_name || "Team 2"} XI
        </h4>
        <div className="space-y-1">
          {squads?.team2?.players?.map((p, idx) => (
            <div key={p.id || idx} className="text-xs font-medium py-1" style={{ color: COLOR.ink, borderBottom: `1px solid ${COLOR.border}` }}>
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
    <div
      className="p-4 rounded-xl space-y-3 relative overflow-hidden"
      style={{
        background: isLightMode()
          ? "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)"
          : "linear-gradient(135deg,#1a1408 0%,#0f1a12 100%)",
        border: `1px solid ${COLOR.amber}`,
        boxShadow: "0 8px 26px -14px rgba(245,158,11,0.7)"
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.amberGradient }} />
      <div
        className="text-xs font-bold"
        style={{
          background: COLOR.amberGradient,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}
      >
        Additional Runs for {lbl}?
      </div>
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((add) => {
          const total = baseRun + add;
          return (
            <button
              key={add}
              onClick={() => onConfirm(total)}
              className={`py-2 rounded-lg text-xs font-mono font-bold text-white ${BTN_TRANSITION} hover:scale-105`}
              style={{ background: COLOR.amberGradient, boxShadow: "0 4px 12px -4px rgba(245,158,11,0.7)" }}
            >
              +{add}
            </button>
          );
        })}
      </div>
      <button onClick={onCancel} className="text-xs underline" style={{ color: COLOR.inkDim }}>Cancel</button>
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
    <div
      className="p-4 rounded-xl space-y-4 shadow-xl relative overflow-hidden"
      style={{
        background: isLightMode() ? "linear-gradient(135deg,#fef2f2 0%,#ffffff 100%)" : "linear-gradient(135deg,#1a0f0f 0%,#0f1a12 100%)",
        border: `1px solid ${COLOR.red}`,
        boxShadow: "0 8px 26px -14px rgba(239,68,68,0.7)"
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLOR.redGradient }} />
      <div className="text-xs font-black uppercase tracking-wider flex items-center justify-between">
        <span
          style={{
            background: COLOR.redGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          🔴 Record Wicket / Dismissal
        </span>
        <span className="text-[10px] font-mono font-normal" style={{ color: COLOR.inkDim }}>Select Wicket Type</span>
      </div>

      {/* 1. Dismissal Type */}
      <div>
        <label className="text-[11px] font-bold block mb-1.5" style={{ color: COLOR.inkDim }}>How was the batter dismissed?</label>
        <div className="grid grid-cols-3 gap-2">
          {WICKET_TYPES.map((t) => {
            const isPicked = wicketType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setWicketType(t)}
                className={`py-2 px-1 rounded-lg text-xs font-bold capitalize transition-all ${BTN_TRANSITION} hover:scale-[1.03]`}
                style={{
                  background: isPicked ? COLOR.redGradient : COLOR.surfaceRaised,
                  color: isPicked ? "#ffffff" : COLOR.ink,
                  border: isPicked ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                  boxShadow: isPicked ? "0 4px 14px -4px rgba(239,68,68,0.7)" : "none",
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
        <label className="text-[11px] font-bold block mb-1.5" style={{ color: COLOR.inkDim }}>Who is out?</label>
        <div className="flex gap-2 flex-wrap">
          {activeBatters.map((b) => {
            const isPicked = dismissedId === b.player_id;
            return (
              <button
                key={b.player_id}
                type="button"
                onClick={() => setDismissedId(b.player_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${BTN_TRANSITION} hover:scale-[1.03]`}
                style={{
                  background: isPicked ? COLOR.redGradient : COLOR.surfaceRaised,
                  color: isPicked ? "#ffffff" : COLOR.ink,
                  border: isPicked ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                  boxShadow: isPicked ? "0 4px 14px -4px rgba(239,68,68,0.7)" : "none",
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
        <div className="pt-2" style={{ borderTop: `1px solid ${COLOR.border}` }}>
          <label
            className="text-[11px] font-bold block mb-1.5"
            style={{
              background: COLOR.amberGradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${BTN_TRANSITION} hover:scale-[1.03]`}
                    style={{
                      background: isPicked ? COLOR.amberGradient : COLOR.surfaceRaised,
                      color: isPicked ? "#ffffff" : COLOR.ink,
                      border: isPicked ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                      boxShadow: isPicked ? "0 4px 12px -4px rgba(245,158,11,0.7)" : "none",
                    }}
                  >
                    {f.name} {isPicked ? "✓" : ""}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] italic" style={{ color: COLOR.inkFaint }}>No fielding squad roster available.</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2" style={{ borderTop: `1px solid ${COLOR.border}` }}>
        <button
          disabled={!canConfirm}
          onClick={() => onConfirm({ wicket_type: wicketType, dismissed_player_id: dismissedId, fielder_id: fielderId })}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white disabled:opacity-40 shadow-lg ${BTN_TRANSITION} hover:scale-[1.02]`}
          style={{ background: COLOR.redGradient, boxShadow: "0 6px 20px -6px rgba(239,68,68,0.7)" }}
        >
          Confirm Wicket
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: COLOR.surfaceRaised, color: COLOR.inkDim }}
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

function OpeningSelectors({ squads, match, onStart, onAddPlayer, busy, inningsNumber = 1 }) {
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
        innings_number: inningsNumber,
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
    <div className="p-5 rounded-2xl space-y-5 animate-fadeIn relative overflow-hidden" style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316)" }} />
      {inningsNumber === 1 && <SetupProgress step={4} />}

      <div className="pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
        <div>
          <h3
            className="text-base font-black flex items-center gap-2"
            style={{
              background: isLightMode()
                ? "linear-gradient(135deg,#15803d 0%,#0d9488 50%,#3b82f6 100%)"
                : "linear-gradient(135deg,#4ade80 0%,#22d3ee 50%,#60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            <span>🏏</span> {inningsNumber === 2 ? "2nd Innings Setup (Chase)" : "Opening Lineup Setup"}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: COLOR.inkDim }}>
            Select opening batters for <span style={{ color: COLOR.accent, fontWeight: 600 }}>{rawBattingTeam?.name}</span> and bowler for <span style={{ color: COLOR.blue, fontWeight: 600 }}>{rawBowlingTeam?.name}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm" style={{ background: inningsNumber === 2 ? COLOR.amberGradient : COLOR.accentGradient }}>
          <span>{inningsNumber === 2 ? "🎯 Chase Mode" : "⚡ Live Ready"}</span>
        </div>
      </div>

      {error && (
        <div
          className="text-xs p-3.5 rounded-xl font-semibold flex items-center gap-2 relative overflow-hidden"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)"
              : "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.15) 100%)",
            border: `1px solid ${COLOR.red}`,
            color: COLOR.red
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: COLOR.redGradient }} />
          <span className="pl-2">⚠️</span>
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
        className={`w-full py-3.5 rounded-xl font-black text-sm text-white shadow-lg disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 ${BTN_TRANSITION} hover:scale-[1.01]`}
        style={{ background: COLOR.accentGradient, boxShadow: "0 8px 24px -6px rgba(34,197,94,0.7)" }}
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
      className="p-4 rounded-xl space-y-3 transition-all relative overflow-hidden"
      style={{
        background: isLightMode()
          ? (badgeColor === "sky"
              ? "linear-gradient(135deg,#eff6ff 0%,#ffffff 100%)"
              : "linear-gradient(135deg,#ecfdf5 0%,#ffffff 100%)")
          : (badgeColor === "sky"
              ? "linear-gradient(135deg,#0f1420 0%,#131a26 100%)"
              : "linear-gradient(135deg,#0f1a12 0%,#131a26 100%)"),
        border: `1px solid ${isSelectedFromSquad || name.trim() ? (badgeColor === "sky" ? COLOR.blue : COLOR.accent) : COLOR.border}`,
        boxShadow: isSelectedFromSquad || name.trim()
          ? `0 6px 22px -12px ${badgeColor === "sky" ? "rgba(59,130,246,0.7)" : "rgba(34,197,94,0.7)"}`
          : "none"
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: badgeColor === "sky" ? COLOR.blueGradient : COLOR.accentGradient }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: COLOR.ink }}>
              <span>{title}</span>
            </div>
            <div className="text-[10px] font-medium" style={{ color: COLOR.inkDim }}>{subtitle}</div>
          </div>
        </div>
        <span
          className="text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider text-white shadow-sm"
          style={{ background: badgeColor === "sky" ? COLOR.blueGradient : COLOR.accentGradient }}
        >
          {badge}
        </span>
      </div>

      {/* Select from squad chip grid */}
      <div>
        <label className="text-[11px] font-bold block mb-1.5" style={{ color: COLOR.inkDim }}>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${BTN_TRANSITION} ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:scale-[1.03]"}`}
                  style={{
                    background: isPicked
                      ? badgeColor === "sky"
                        ? COLOR.blueGradient
                        : COLOR.accentGradient
                      : isDisabled
                      ? (isLightMode() ? "#e2e8f0" : "#1e2536")
                      : COLOR.surfaceRaised,
                    color: isPicked ? "#ffffff" : isDisabled ? COLOR.inkFaint : COLOR.ink,
                    border: isPicked ? "1px solid transparent" : `1px solid ${COLOR.border}`,
                    boxShadow: isPicked ? `0 4px 12px -4px ${badgeColor === "sky" ? "rgba(59,130,246,0.7)" : "rgba(34,197,94,0.7)"}` : "none",
                  }}
                >
                  {p.name} {isPicked ? "✓" : ""}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] italic" style={{ color: COLOR.inkFaint }}>No players found in playing XI. Enter player name below.</p>
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
            className="w-full px-3 py-2 rounded-xl text-xs outline-none transition-all"
            style={{
              background: isLightMode() ? "#f8fafc" : "#0f1420",
              border: `1px solid ${name.trim() ? (badgeColor === "sky" ? COLOR.blue : COLOR.accent) : COLOR.border}`,
              color: COLOR.ink,
              boxShadow: name.trim() ? `0 4px 14px -8px ${badgeColor === "sky" ? "rgba(59,130,246,0.7)" : "rgba(34,197,94,0.7)"}` : "none",
            }}
          />
          {name.trim() && (
            <span
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm"
              style={{ background: badgeColor === "sky" ? COLOR.blueGradient : COLOR.accentGradient }}
            >
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
    <div className="p-5 rounded-2xl space-y-4 relative overflow-hidden" style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#3b82f6,#a855f7,#ec4899)" }} />
      <h3 className="text-base font-extrabold flex items-center justify-between" style={{ color: COLOR.ink }}>
        <span
          style={{
            background: "linear-gradient(135deg,#3b82f6 0%,#a855f7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          {title}
        </span>
        <span className="text-xs font-mono font-normal" style={{ color: COLOR.inkDim }}>({players.length} squad members)</span>
      </h3>

      {pickerError && (
        <div
          className="text-xs p-3 rounded-lg font-bold relative overflow-hidden"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)"
              : "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.15) 100%)",
            border: `1px solid ${COLOR.red}`,
            color: COLOR.red
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: COLOR.redGradient }} />
          <span className="pl-2">{pickerError}</span>
        </div>
      )}

      {/* Select from existing squad */}
      <div>
        <label
          className="text-xs font-bold block mb-2"
          style={{
            background: COLOR.accentGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Select from Squad Roster:
        </label>
        <div className="flex gap-2 flex-wrap">
          {players.map((p) => (
            <button
              key={p.id}
              disabled={busy || adding}
              onClick={() => onPick(p.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold ${BTN_TRANSITION} hover:scale-[1.03]`}
              style={{
                background: isLightMode() ? "linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)" : "linear-gradient(135deg,#1c2536 0%,#252f45 100%)",
                color: COLOR.ink,
                border: `1px solid ${COLOR.border}`
              }}
            >
              {p.name}
            </button>
          ))}
          {players.length === 0 && (
            <span className="text-xs italic" style={{ color: COLOR.inkFaint }}>No available players in squad. Add a new player below.</span>
          )}
        </div>
      </div>

      {/* Add new player mid-match */}
      <form onSubmit={handleAdd} className="pt-3 space-y-2" style={{ borderTop: `1px solid ${COLOR.border}` }}>
        <label
          className="text-xs font-bold block"
          style={{
            background: COLOR.blueGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          ➕ Add New Player to Squad Mid-Match:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Type new player full name..."
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all font-sans"
            style={{
              background: isLightMode() ? "linear-gradient(135deg,#f8fafc 0%,#eff6ff 100%)" : "linear-gradient(135deg,#0f1420 0%,#111 100%)",
              color: COLOR.ink,
              border: `1px solid ${isLightMode() ? "#bfdbfe" : "rgba(59,130,246,0.3)"}`
            }}
          />
          <button
            type="submit"
            disabled={!newName.trim() || busy || adding}
            className={`px-4 py-2 font-bold text-xs rounded-xl text-white disabled:opacity-40 ${BTN_TRANSITION} hover:scale-[1.03]`}
            style={{ background: COLOR.blueGradient, boxShadow: "0 4px 14px -6px rgba(59,130,246,0.7)" }}
          >
            {adding ? "Adding..." : "+ Add & Select"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BattingTable({ batters }) {
  if (!batters || batters.length === 0) return <div className="text-xs" style={{ color: COLOR.inkFaint }}>No batting data.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.inkDim }}>
            <th className="py-2 font-sans">Batter</th>
            <th className="py-2 text-right">R</th>
            <th className="py-2 text-right">B</th>
            <th className="py-2 text-right" style={{ color: COLOR.accent }}>4s</th>
            <th className="py-2 text-right" style={{ color: COLOR.purple }}>6s</th>
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
                style={{ borderBottom: `1px solid ${COLOR.border}`, opacity: b.is_out ? 0.8 : 1 }}
              >
                <td className="py-2 font-sans">
                  <div className="font-semibold flex items-center gap-1" style={{ color: b.is_out ? COLOR.inkDim : COLOR.ink, textDecoration: b.is_out ? "line-through" : "none", textDecorationColor: "rgba(239,68,68,0.7)" }}>
                    {b.name}
                    {b.is_on_strike && !b.is_out && <span style={{ color: COLOR.accent, fontWeight: 800 }}>*</span>}
                  </div>
                  <div
                    className="text-[10px] capitalize font-medium"
                    style={{
                      color: b.is_out ? COLOR.red : COLOR.inkDim,
                      fontWeight: b.is_out ? 600 : 500
                    }}
                  >
                    {dismissalText}
                  </div>
                </td>
                <td
                  className="py-2 text-right font-bold text-sm"
                  style={{
                    color: b.is_out ? COLOR.inkDim : COLOR.accent
                  }}
                >
                  {b.runs}
                </td>
                <td className="py-2 text-right" style={{ color: COLOR.inkDim }}>{b.balls_faced}</td>
                <td className="py-2 text-right font-bold" style={{ color: COLOR.accent }}>{b.fours ?? 0}</td>
                <td className="py-2 text-right font-bold" style={{ color: COLOR.purple }}>{b.sixes ?? 0}</td>
                <td className="py-2 text-right" style={{ color: COLOR.inkDim }}>{sr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BowlingTable({ bowlers }) {
  if (!bowlers || bowlers.length === 0) return <div className="text-xs" style={{ color: COLOR.inkFaint }}>No bowling data.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLOR.border}`, color: COLOR.inkDim }}>
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
              <tr key={b.player_id || b.name} style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                <td className="py-2 font-sans font-semibold" style={{ color: COLOR.blue }}>{b.name}</td>
                <td className="py-2 text-right" style={{ color: COLOR.ink }}>{bOvers.display}</td>
                <td className="py-2 text-right" style={{ color: COLOR.inkDim }}>{b.runs_conceded}</td>
                <td className="py-2 text-right font-bold" style={{ color: COLOR.red }}>{b.wickets}</td>
                <td className="py-2 text-right" style={{ color: COLOR.inkDim }}>{er}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FinalScoreboard({ user, matchId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/api/matches/${matchId}/scoreboard`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [matchId]);

  if (error) return <div className="text-xs p-4 bg-red-500/10 text-red-400 rounded-xl">Error: {error}</div>;
  if (!data) return <div className="text-xs p-6" style={{ color: COLOR.inkDim }}>Loading Final Scorecard...</div>;

  const isCreator = isMatchCreator(data.match, user);

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl text-center space-y-2 relative overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899,#a855f7)" }} />
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(245,158,11,0.35) 0%,transparent 70%)" }} />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(168,85,247,0.3) 0%,transparent 70%)" }} />
        <div className="text-xs font-bold uppercase tracking-wider mb-1 relative z-10" style={{ color: COLOR.inkDim }}>
          {data.match.team1_name} vs {data.match.team2_name}
        </div>
        <div
          className="text-lg sm:text-xl font-black flex items-center justify-center gap-2 relative z-10"
          style={{
            background: "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          <span>🏆</span>
          <span>{data.result || data.match?.result || "Match completed"}</span>
        </div>
      </div>

      {(data.potm_name || data.match?.potm_name) && (
        <div
          className="p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left relative overflow-hidden"
          style={{
            background: isLightMode()
              ? "linear-gradient(135deg,#fef3c7 0%,#fef9c3 50%,#fff7ed 100%)"
              : "linear-gradient(135deg,rgba(245,158,11,0.18) 0%,rgba(236,72,153,0.08) 100%)",
            border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.4)"}`,
            boxShadow: isLightMode() ? "0 6px 22px -12px rgba(245,158,11,0.4)" : "0 6px 22px -12px rgba(245,158,11,0.7)"
          }}
        >
          <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
          <div className="flex items-center gap-3.5 pl-1">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-md"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}
            >
              🏅
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: COLOR.amber }}>
                Player of the Match (Both Innings)
              </div>
              <div className="text-base sm:text-lg font-black" style={{ color: COLOR.ink }}>
                {data.potm_name || data.match?.potm_name}
              </div>
              {(data.potm_team || data.match?.potm_team) && (
                <div className="text-xs font-medium" style={{ color: COLOR.inkDim }}>
                  {data.potm_team || data.match?.potm_team}
                </div>
              )}
            </div>
          </div>
          {(data.potm_stats || data.match?.potm_stats) && (
            <div
              className="px-3.5 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold tracking-wide"
              style={{
                background: isLightMode() ? "#ffffff" : "rgba(15,23,42,0.7)",
                color: COLOR.amber,
                border: `1px solid ${isLightMode() ? "#fde68a" : "rgba(245,158,11,0.3)"}`
              }}
            >
              {data.potm_stats || data.match?.potm_stats}
            </div>
          )}
        </div>
      )}

      {data.innings.map((inn) => {
        const { display: inningsOversDisplay } = formatOvers(inn.overs);
        return (
          <div key={inn.innings_number} className="p-4 rounded-2xl space-y-3 relative overflow-hidden" style={cardStyle}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
              <span
                className="text-sm font-black"
                style={{
                  background: isLightMode()
                    ? "linear-gradient(135deg,#15803d 0%,#3b82f6 100%)"
                    : "linear-gradient(135deg,#4ade80 0%,#60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                {inn.batting_team_name} Innings
              </span>
              <span
                className="text-sm font-mono font-black"
                style={{
                  background: COLOR.accentGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
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