import React, { useState, useEffect } from "react";
import { Award, MapPin, CalendarDays, Clock, ArrowLeftRight, Users, DollarSign, Phone, Trophy, X, Pencil, Trash2, CheckCircle, Info, Plus, Swords, FileText, Download, UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest, getStoredToken } from "../../api";
import CreateTournamentForm from "../CreateTournamentForm";
import { C, cn, Tag, GhostButton } from "../../utils/helpers.jsx";
import CalendarField from "../CalendarField.jsx";

const STATUS_META = {
  registering: { label: "Registering", color: "green", gradient: "from-emerald-400 to-green-500" },
  ongoing:     { label: "Ongoing",     color: "amber", gradient: "from-amber-400 to-orange-500" },
  completed:   { label: "Completed",   color: "blue",  gradient: "from-sky-400 to-blue-500" },
  cancelled:   { label: "Cancelled",   color: "red",   gradient: "from-rose-400 to-red-500" },
};
function statusMeta(status) {
  return STATUS_META[status] || { label: status || "Unknown", color: "blue", gradient: "from-slate-400 to-slate-500" };
}
function formatMoney(n) {
  if (n === null || n === undefined || n === "") return "-";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export function formatMatchDate(dateVal, timeVal = null) {
  if (!dateVal && !timeVal) return "";
  let dateStr = "";
  if (dateVal) {
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) dateStr = String(dateVal).split("T")[0];
      else {
        dateStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      dateStr = String(dateVal).split("T")[0];
    }
  }
  if (timeVal && dateStr) return `${dateStr} at ${timeVal}`;
  if (timeVal) return timeVal;
  return dateStr;
}

function isOrganizerOf(t, { currentUser } = {}) {
  if (!currentUser?.id || !t?.created_by) return false;
  return String(t.created_by) === String(currentUser.id);
}

// ─── Colorful accent bar used across cards ───────────────────────────────
function ColorBar({ gradient = "from-emerald-400 via-green-500 to-teal-500" }) {
  return <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r rounded-t-2xl", gradient)} />;
}

function TeamsRemainingBadge({ spotsLeft, maxTeams }) {
  const isFull = spotsLeft === 0;
  const isLow = spotsLeft > 0 && spotsLeft <= 3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm",
        isFull
          ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-300 dark:from-emerald-500/15 dark:to-teal-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
          : isLow
          ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200 dark:from-amber-500/15 dark:to-orange-500/15 dark:text-amber-300 dark:border-amber-500/30"
          : "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200 dark:from-emerald-500/15 dark:to-green-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", isFull ? "bg-emerald-500" : isLow ? "bg-amber-500" : "bg-emerald-500")} />
      {isFull ? `Fully Confirmed · All ${maxTeams ?? 0} Teams` : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left · ${maxTeams ?? 0} teams`}
    </span>
  );
}

function PrizesSummary({ prizes, theme = "dark" }) {
  if (!Array.isArray(prizes) || prizes.length === 0) return null;
  const isLight = theme === "light";
  return (
    <div className="flex flex-wrap gap-2">
      {prizes.map((p, i) => (
        <div
          key={p.position}
          className={cn(
            "flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 border shadow-sm",
            isLight
              ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200 text-amber-900"
              : "bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border-amber-500/25 text-amber-100"
          )}
        >
          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 drop-shadow" />
          <span className={cn("font-extrabold", isLight ? "text-amber-900" : "text-white")}>#{p.position}</span>
          <span className={cn("font-semibold", isLight ? "text-amber-800" : "text-amber-200")}>{formatMoney(p.money)}</span>
          {p.trophy && <span className="text-amber-600 font-bold">+ 🏆</span>}
        </div>
      ))}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          isLight ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/15 text-emerald-400"
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide font-bold" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>
          {label}
        </div>
        <div className={cn("text-sm truncate font-medium", isLight ? "text-slate-900" : "text-white")}>{value}</div>
      </div>
    </div>
  );
}

function StartTournamentMatchModal({
  isOpen,
  onClose,
  tournament,
  confirmedTeams = [],
  matchesCount = 0,
  token,
  onMatchStarted,
  onMatchScheduled,
  theme = "dark"
}) {
  const isLight = theme === "light";
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [team1Select, setTeam1Select] = useState("");
  const [team2Select, setTeam2Select] = useState("");
  const [venue, setVenue] = useState("");
  const [round, setRound] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [oversLimit, setOversLimit] = useState(20);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const fieldClass = isLight
    ? "w-full p-2.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:outline-none transition-all"
    : "w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all";

  const labelStyle = { color: isLight ? "#475569" : "#a0aba0" };

  useEffect(() => {
    if (!isOpen) return;
    const defaultT1 = confirmedTeams[0]?.name || "";
    const defaultT2 = confirmedTeams[1]?.name || "";
    setTeam1Name(defaultT1);
    setTeam1Select(defaultT1);
    setTeam2Name(defaultT2);
    setTeam2Select(defaultT2);
    setVenue(tournament?.venue || "");
    const matchNum = matchesCount + 1;
    const defaultRound = matchNum === 1 ? "Match 1 (Opener)" : `Match ${matchNum}`;
    setRound(defaultRound);
    setOversLimit(20);
    setMatchDate(tournament?.start_date ? String(tournament.start_date).slice(0, 10) : "");
    setError("");
  }, [isOpen, tournament, confirmedTeams, matchesCount]);

  if (!isOpen) return null;

  const isFullyConfirmed = Boolean(
    (tournament?.max_teams && confirmedTeams.length >= tournament.max_teams) ||
    tournament?.spots_left === 0
  );

  const handleAction = async (actionType = "start") => {
    if (!team1Name?.trim()) return setError("Please select or enter Team 1");
    if (!team2Name?.trim()) return setError("Please select or enter Team 2");
    if (team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase()) {
      return setError("Team 1 and Team 2 must be different teams.");
    }
    if (isFullyConfirmed && confirmedTeams.length > 0) {
      const isT1Confirmed = confirmedTeams.some((ct) => ct.name.trim().toLowerCase() === team1Name.trim().toLowerCase());
      const isT2Confirmed = confirmedTeams.some((ct) => ct.name.trim().toLowerCase() === team2Name.trim().toLowerCase());
      if (!isT1Confirmed || !isT2Confirmed) {
        return setError(`Tournament is fully confirmed (${tournament.max_teams}/${tournament.max_teams} teams). Matches can only be played between confirmed teams. No new teams can be approved.`);
      }
    }
    setStarting(true);
    setError("");
    try {
      const isScheduling = actionType === "schedule";
      const payload = {
        team1_name: team1Name.trim(),
        team2_name: team2Name.trim(),
        venue: venue?.trim() || tournament?.venue || "",
        overs_limit: Number(oversLimit) || 20,
        tournament_id: tournament.id,
        round: round?.trim() || `Match ${matchesCount + 1}`,
        match_date: matchDate ? new Date(matchDate).toISOString() : null,
        status: isScheduling ? "scheduled" : "not_started",
      };
      const tok = token || getStoredToken();
      const res = await apiRequest("/matches", {
        method: "POST",
        token: tok,
        body: payload,
      });
      const newMatch = res.match || {
        id: res.match_id,
        team1_name: payload.team1_name,
        team2_name: payload.team2_name,
        venue: payload.venue,
        overs_limit: payload.overs_limit,
        tournament_id: tournament.id,
        round: payload.round,
        match_date: payload.match_date,
        status: payload.status,
      };
      if (isScheduling) {
        onMatchScheduled?.(newMatch);
      } else {
        onMatchStarted?.(newMatch);
      }
    } catch (err) {
      setError(err.message || "Failed to process tournament match");
      setStarting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4 relative"
        style={isLight
          ? { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(16,185,129,0.08)" }
          : { backgroundColor: "#0d0f0d", border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ColorBar gradient="from-emerald-400 via-teal-500 to-cyan-500" />
        <div className={cn("flex items-center justify-between pb-3 border-b", isLight ? "border-slate-100" : "border-[#1f221f]")}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={cn("text-lg font-bold leading-tight", isLight ? "text-slate-900" : "text-white")}>
                {matchesCount === 0 ? "Start Match 1 (Live e-Scoring)" : `Start Match #${matchesCount + 1} (Live e-Scoring)`}
              </h3>
              <p className="text-[11px]" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                Tournament: {tournament?.name}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-colors",
              isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-[#6b7a6b] hover:text-white hover:bg-[#1c1f1c]")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className={cn("p-3 rounded-xl text-xs flex items-center gap-2 border",
            isLight ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700" : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-400")}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleAction("start"); }} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl border text-[11px] space-y-1"
            style={{
              backgroundColor: isLight ? "#f0fdf4" : "rgba(34,197,94,0.06)",
              borderColor: isLight ? "#bbf7d0" : "rgba(34,197,94,0.2)",
              color: isLight ? "#166534" : "#4ade80"
            }}>
            <div className="font-bold flex items-center gap-1.5">
              <span>⚡</span> Real-time Electronic Scoreboard
            </div>
            <p className="opacity-90">
              Launching this match will connect it to this tournament and open the Live Score console. All balls, boundaries, wickets, and POTM will automatically update under this tournament.
            </p>
          </div>

          {isFullyConfirmed && (
            <div className={cn("p-2.5 rounded-xl border text-[11px] flex items-center gap-2",
              isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300")}>
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Tournament is fully confirmed ({tournament?.max_teams}/{tournament?.max_teams} teams). Matches can only be selected from confirmed teams.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Team 1 (Confirmed) *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={team1Select}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeam1Select(val);
                      if (val !== "__custom__") setTeam1Name(val);
                    }}
                    className={fieldClass}
                    required
                  >
                    <option value="">-- Select Team 1 --</option>
                    {confirmedTeams.map((ct) => (
                      <option key={ct.id || ct.name} value={ct.name}>
                        {ct.name}
                      </option>
                    ))}
                    {!isFullyConfirmed && <option value="__custom__">+ Other / Custom Team</option>}
                  </select>
                  {team1Select === "__custom__" && !isFullyConfirmed && (
                    <input
                      type="text"
                      placeholder="Enter Team 1 name"
                      value={team1Name}
                      onChange={(e) => setTeam1Name(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Enter Team 1 name"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  className={fieldClass}
                  required
                />
              )}
            </div>

            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Team 2 (Confirmed) *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={team2Select}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeam2Select(val);
                      if (val !== "__custom__") setTeam2Name(val);
                    }}
                    className={fieldClass}
                    required
                  >
                    <option value="">-- Select Team 2 --</option>
                    {confirmedTeams.map((ct) => (
                      <option key={ct.id || ct.name} value={ct.name}>
                        {ct.name}
                      </option>
                    ))}
                    {!isFullyConfirmed && <option value="__custom__">+ Other / Custom Team</option>}
                  </select>
                  {team2Select === "__custom__" && !isFullyConfirmed && (
                    <input
                      type="text"
                      placeholder="Enter Team 2 name"
                      value={team2Name}
                      onChange={(e) => setTeam2Name(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Enter Team 2 name"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  className={fieldClass}
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Stage / Round</label>
              <input
                type="text"
                placeholder="e.g. Match 1, Quarter Final, Final"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Overs Limit</label>
              <select
                value={oversLimit}
                onChange={(e) => setOversLimit(Number(e.target.value))}
                className={fieldClass}
              >
                {[5, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((ov) => (
                  <option key={ov} value={ov}>{ov} Overs</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Match Date (e.g. Sep 28)</label>
              <CalendarField
                value={matchDate ? matchDate.slice(0, 10) : ""}
                onChange={(v) => setMatchDate(v)}
                theme={theme}
                placeholder="Select date"
                clearable={true}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Venue / Ground</label>
              <input
                type="text"
                placeholder="e.g. Central Cricket Ground"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className={cn("pt-3 border-t space-y-2.5", isLight ? "border-slate-100" : "border-[#1f221f]")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleAction("start")}
                disabled={starting}
                className={cn("py-2.5 px-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg",
                  isLight
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                    : "bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 hover:from-emerald-300 hover:to-teal-300 text-black shadow-emerald-500/30")}
              >
                {starting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><span>⚡</span> Start Match & Score Now</>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleAction("schedule")}
                disabled={starting}
                className={cn("py-2.5 px-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 border shadow-sm",
                  isLight
                    ? "bg-white hover:bg-slate-50 text-sky-800 border-sky-300 hover:border-sky-400"
                    : "bg-[#181d24] hover:bg-[#202730] text-sky-300 border-sky-500/30 hover:border-sky-500/50")}
              >
                <CalendarDays className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Schedule for Later</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={starting}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  isLight ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100" : "text-[#7a8a7a] hover:text-white hover:bg-[#1a1c1a]")}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScheduleTournamentMatchModal({
  isOpen,
  onClose,
  tournament,
  confirmedTeams = [],
  matchesCount = 0,
  token,
  onMatchScheduled,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [team1Select, setTeam1Select] = useState("");
  const [team2Select, setTeam2Select] = useState("");
  const [venue, setVenue] = useState("");
  const [round, setRound] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("09:30 AM");
  const [timeSlot, setTimeSlot] = useState("morning");
  const [oversLimit, setOversLimit] = useState(20);
  const [notes, setNotes] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState("");

  const fieldClass = isLight
    ? "w-full p-2.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:bg-white focus:outline-none transition-all text-xs"
    : "w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all text-xs";

  const labelStyle = { color: isLight ? "#475569" : "#a0aba0" };

  useEffect(() => {
    if (!isOpen) return;
    const defaultT1 = confirmedTeams[0]?.name || "";
    const defaultT2 = confirmedTeams[1]?.name || "";
    setTeam1Name(defaultT1);
    setTeam1Select(defaultT1);
    setTeam2Name(defaultT2);
    setTeam2Select(defaultT2);
    setVenue(tournament?.venue || "");
    const matchNum = matchesCount + 1;
    const defaultRound = matchNum === 1 ? "Match 1 (Opener)" : `Match ${matchNum}`;
    setRound(defaultRound);
    setOversLimit(20);
    let initialDate = "";
    if (tournament?.start_date) {
      initialDate = String(tournament.start_date).slice(0, 10);
    } else {
      const tomorrow = new Date(Date.now() + 86400000);
      initialDate = tomorrow.toISOString().slice(0, 10);
    }
    setMatchDate(initialDate);
    setMatchTime("09:30 AM");
    setTimeSlot("morning");
    setNotes("");
    setError("");
  }, [isOpen, tournament, confirmedTeams, matchesCount]);

  if (!isOpen) return null;

  const handleSwapTeams = () => {
    const tempName = team1Name;
    const tempSelect = team1Select;
    setTeam1Name(team2Name);
    setTeam1Select(team2Select);
    setTeam2Name(tempName);
    setTeam2Select(tempSelect);
  };

  const handleDateShortcut = (type) => {
    const d = new Date();
    if (type === "today") {
      setMatchDate(d.toISOString().slice(0, 10));
    } else if (type === "tomorrow") {
      d.setDate(d.getDate() + 1);
      setMatchDate(d.toISOString().slice(0, 10));
    } else if (type === "saturday") {
      const day = d.getDay();
      const diff = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      setMatchDate(d.toISOString().slice(0, 10));
    } else if (type === "sunday") {
      const day = d.getDay();
      const diff = (7 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      setMatchDate(d.toISOString().slice(0, 10));
    }
  };

  const handleSlotShortcut = (slot, defaultTime) => {
    setTimeSlot(slot);
    setMatchTime(defaultTime);
  };

  const isFullyConfirmed = Boolean(
    (tournament?.max_teams && confirmedTeams.length >= tournament.max_teams) ||
    tournament?.spots_left === 0
  );

  const handleScheduleSubmit = async (e) => {
    e?.preventDefault();
    if (!team1Name?.trim()) return setError("Please select or enter Team 1");
    if (!team2Name?.trim()) return setError("Please select or enter Team 2");
    if (team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase()) {
      return setError("Team 1 and Team 2 must be different teams.");
    }
    if (!matchDate) {
      return setError("Please select the scheduled match date.");
    }
    if (isFullyConfirmed && confirmedTeams.length > 0) {
      const isT1Confirmed = confirmedTeams.some((ct) => ct.name.trim().toLowerCase() === team1Name.trim().toLowerCase());
      const isT2Confirmed = confirmedTeams.some((ct) => ct.name.trim().toLowerCase() === team2Name.trim().toLowerCase());
      if (!isT1Confirmed || !isT2Confirmed) {
        return setError(`Tournament is fully confirmed (${tournament.max_teams}/${tournament.max_teams} teams). Fixtures can only be scheduled between confirmed teams. No new teams can be approved.`);
      }
    }

    setScheduling(true);
    setError("");
    try {
      const payload = {
        team1_name: team1Name.trim(),
        team2_name: team2Name.trim(),
        venue: venue?.trim() || tournament?.venue || "",
        overs_limit: Number(oversLimit) || 20,
        tournament_id: tournament.id,
        round: round?.trim() || `Match ${matchesCount + 1}`,
        match_date: matchDate ? new Date(matchDate).toISOString() : null,
        match_time: matchTime?.trim() || null,
        status: "scheduled",
      };
      const tok = token || getStoredToken();
      const res = await apiRequest("/matches", {
        method: "POST",
        token: tok,
        body: payload,
      });

      const newMatch = res.match || {
        id: res.match_id,
        team1_name: payload.team1_name,
        team2_name: payload.team2_name,
        venue: payload.venue,
        overs_limit: payload.overs_limit,
        tournament_id: tournament.id,
        round: payload.round,
        match_date: payload.match_date,
        match_time: payload.match_time,
        status: "scheduled",
      };

      onMatchScheduled?.(newMatch);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to schedule tournament match");
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4 relative"
        style={isLight
          ? { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(14,165,233,0.1)" }
          : { backgroundColor: "#0d0f0d", border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(14,165,233,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ColorBar gradient="from-sky-400 via-blue-500 to-indigo-500" />
        <div className={cn("flex items-center justify-between pb-3 border-b", isLight ? "border-slate-100" : "border-[#1f221f]")}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={cn("text-lg font-bold leading-tight", isLight ? "text-slate-900" : "text-white")}>
                Schedule Tournament Match
              </h3>
              <p className="text-[11px]" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                Tournament: {tournament?.name}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-colors",
              isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-[#6b7a6b] hover:text-white hover:bg-[#1c1f1c]")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className={cn("p-3 rounded-xl text-xs flex items-center gap-2 border",
            isLight ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700" : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-400")}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl border text-[11px] space-y-1"
            style={{
              backgroundColor: isLight ? "#f0f9ff" : "rgba(14,165,233,0.06)",
              borderColor: isLight ? "#bae6fd" : "rgba(14,165,233,0.2)",
              color: isLight ? "#0369a1" : "#38bdf8"
            }}>
            <div className="font-bold flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Plan Future Fixture
            </div>
            <p className="opacity-90">
              Schedule upcoming matches for future days. Once scheduled, the match appears under tournament fixtures, and on match day you can start live ball-by-ball e-scoring with a single click.
            </p>
          </div>

          {isFullyConfirmed && (
            <div className={cn("p-2.5 rounded-xl border text-[11px] flex items-center gap-2",
              isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300")}>
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Tournament is fully confirmed ({tournament?.max_teams}/{tournament?.max_teams} teams). Fixtures are restricted to confirmed teams only.</span>
            </div>
          )}

          {/* TEAMS SELECTION WITH SWAP BUTTON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs" style={labelStyle}>Match Teams *</span>
              <button
                type="button"
                onClick={handleSwapTeams}
                className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-colors",
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-[#1c1f1c] hover:bg-[#252825] text-slate-300 border-[#2a2a2a]")}
              >
                <ArrowLeftRight className="w-3 h-3 text-sky-400" /> Swap Sides
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 font-semibold text-[11px]" style={labelStyle}>Team 1 (Confirmed) *</label>
                {confirmedTeams.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={team1Select}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTeam1Select(val);
                        if (val !== "__custom__") setTeam1Name(val);
                      }}
                      className={fieldClass}
                      required
                    >
                      <option value="">-- Select Team 1 --</option>
                      {confirmedTeams.map((ct) => (
                        <option key={ct.id || ct.name} value={ct.name}>
                          {ct.name}
                        </option>
                      ))}
                      {!isFullyConfirmed && <option value="__custom__">+ Other / Custom Team</option>}
                    </select>
                    {team1Select === "__custom__" && !isFullyConfirmed && (
                      <input
                        type="text"
                        placeholder="Enter Team 1 name"
                        value={team1Name}
                        onChange={(e) => setTeam1Name(e.target.value)}
                        className={fieldClass}
                        required
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Team 1 name"
                    value={team1Name}
                    onChange={(e) => setTeam1Name(e.target.value)}
                    className={fieldClass}
                    required
                  />
                )}
              </div>

              <div>
                <label className="block mb-1 font-semibold text-[11px]" style={labelStyle}>Team 2 (Confirmed) *</label>
                {confirmedTeams.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={team2Select}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTeam2Select(val);
                        if (val !== "__custom__") setTeam2Name(val);
                      }}
                      className={fieldClass}
                      required
                    >
                      <option value="">-- Select Team 2 --</option>
                      {confirmedTeams.map((ct) => (
                        <option key={ct.id || ct.name} value={ct.name}>
                          {ct.name}
                        </option>
                      ))}
                      {!isFullyConfirmed && <option value="__custom__">+ Other / Custom Team</option>}
                    </select>
                    {team2Select === "__custom__" && !isFullyConfirmed && (
                      <input
                        type="text"
                        placeholder="Enter Team 2 name"
                        value={team2Name}
                        onChange={(e) => setTeam2Name(e.target.value)}
                        className={fieldClass}
                        required
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Team 2 name"
                    value={team2Name}
                    onChange={(e) => setTeam2Name(e.target.value)}
                    className={fieldClass}
                    required
                  />
                )}
              </div>
            </div>
          </div>

          {/* MATCH DATE & QUICK CHIPS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs" style={labelStyle}>Scheduled Date (Future Day) *</label>
              <div className="flex items-center gap-1">
                {[
                  { label: "Today", type: "today" },
                  { label: "Tomorrow", type: "tomorrow" },
                  { label: "Sat", type: "saturday" },
                  { label: "Sun", type: "sunday" },
                ].map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => handleDateShortcut(s.type)}
                    className={cn("px-2 py-0.5 rounded text-[10px] font-bold border transition-colors",
                      isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-[#1c1f1c] hover:bg-[#252825] text-slate-300 border-[#2a2a2a]")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <CalendarField
              value={matchDate ? matchDate.slice(0, 10) : ""}
              onChange={(v) => setMatchDate(v)}
              theme={theme}
              placeholder="Select future match date (e.g. Sep 28)"
              clearable={false}
            />
          </div>

          {/* TIMING & TIME SLOTS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs" style={labelStyle}>Match Timing / Time Slot</label>
              <span className="text-[10px] text-slate-400 font-medium">Click preset or enter custom</span>
            </div>

            {/* Quick slot chips */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { slot: "morning", label: "🌅 Morning", time: "09:30 AM" },
                { slot: "afternoon", label: "☀️ Afternoon", time: "02:00 PM" },
                { slot: "evening", label: "🌆 Evening", time: "06:00 PM" },
              ].map((s) => {
                const isSelected = timeSlot === s.slot;
                return (
                  <button
                    key={s.slot}
                    type="button"
                    onClick={() => handleSlotShortcut(s.slot, s.time)}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-center border font-bold text-[11px] transition-all",
                      isSelected
                        ? (isLight ? "bg-sky-100 border-sky-300 text-sky-900 shadow-sm" : "bg-sky-950/40 border-sky-500/50 text-sky-300 shadow-sm shadow-sky-500/20")
                        : (isLight ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700" : "bg-[#161816] hover:bg-[#1f231f] border-[#2a2a2a] text-[#a0aba0]")
                    )}
                  >
                    <div>{s.label}</div>
                    <div className="text-[9px] font-normal opacity-80">{s.time}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-sky-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. 09:30 AM or 02:00 PM"
                  value={matchTime}
                  onChange={(e) => {
                    setMatchTime(e.target.value);
                    setTimeSlot("custom");
                  }}
                  className={cn(fieldClass, "pl-8 font-medium")}
                />
              </div>
            </div>
          </div>

          {/* STAGE & OVERS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-[11px]" style={labelStyle}>Stage / Round</label>
              <input
                type="text"
                placeholder="e.g. Match 1, League Match, Final"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-[11px]" style={labelStyle}>Overs Limit</label>
              <select
                value={oversLimit}
                onChange={(e) => setOversLimit(Number(e.target.value))}
                className={fieldClass}
              >
                {[5, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((ov) => (
                  <option key={ov} value={ov}>{ov} Overs</option>
                ))}
              </select>
            </div>
          </div>

          {/* VENUE */}
          <div>
            <label className="block mb-1 font-semibold text-[11px]" style={labelStyle}>Venue / Ground</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-emerald-500 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. Central Cricket Ground"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className={cn(fieldClass, "pl-8")}
              />
            </div>
          </div>

          <div className={cn("pt-3 border-t flex items-center gap-2.5", isLight ? "border-slate-100" : "border-[#1f221f]")}>
            <button
              type="button"
              onClick={onClose}
              disabled={scheduling}
              className={cn("flex-1 py-2.5 rounded-xl font-bold transition-colors",
                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8]")}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={scheduling}
              className={cn("flex-1 py-2.5 rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white shadow-lg",
                isLight
                  ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-sky-500/25"
                  : "bg-gradient-to-r from-sky-400 via-blue-500 to-teal-400 hover:from-sky-300 hover:to-teal-300 text-black shadow-sky-500/30")}
            >
              {scheduling ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
              ) : (
                <>
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  <span>Confirm & Schedule Match</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TournamentMatchModal({ isOpen, onClose, tournament, match, confirmedTeams = [], token, onSaved, theme = "dark" }) {
  const isLight = theme === "light";
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [team1Select, setTeam1Select] = useState("");
  const [team2Select, setTeam2Select] = useState("");
  const [status, setStatus] = useState("completed");
  const [result, setResult] = useState("");
  const [mom, setMom] = useState("");
  const [scoreboardUrl, setScoreboardUrl] = useState(null);
  const [scoreboardName, setScoreboardName] = useState("");
  const [venue, setVenue] = useState("");
  const [round, setRound] = useState("League Match");
  const [matchDate, setMatchDate] = useState("");
  const [oversLimit, setOversLimit] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fieldClass = isLight
    ? "w-full p-2.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:outline-none transition-all"
    : "w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all";

  const labelStyle = { color: isLight ? "#475569" : "#a0aba0" };

  useEffect(() => {
    if (!isOpen) return;
    if (match) {
      const t1 = match.team1_name || "";
      const t2 = match.team2_name || "";
      const t1InConfirmed = confirmedTeams.some((ct) => ct.name === t1);
      const t2InConfirmed = confirmedTeams.some((ct) => ct.name === t2);
      setTeam1Name(t1); setTeam2Name(t2);
      setTeam1Select(t1InConfirmed ? t1 : (t1 ? "__custom__" : ""));
      setTeam2Select(t2InConfirmed ? t2 : (t2 ? "__custom__" : ""));
      const normStatus = (match.status || "completed").toLowerCase();
      setStatus(["completed", "scheduled", "live"].includes(normStatus) ? normStatus : "completed");
      setResult(match.result || "");
      setMom(match.mom || match.man_of_the_match || "");
      setScoreboardUrl(match.scoreboard_url || null);
      setScoreboardName(match.scoreboard_name || "");
      setVenue(match.venue || tournament?.venue || "");
      setRound(match.round || "League Match");
      let dateVal = "";
      if (match.match_date) {
        if (typeof match.match_date === "string") dateVal = match.match_date.split("T")[0];
        else {
          try { const d = new Date(match.match_date); if (!isNaN(d.getTime())) dateVal = d.toISOString().split("T")[0]; } catch { dateVal = ""; }
        }
      }
      setMatchDate(dateVal);
      setOversLimit(match.overs_limit || 20);
    } else {
      const defaultT1 = confirmedTeams[0]?.name || "";
      const defaultT2 = confirmedTeams[1]?.name || "";
      setTeam1Name(defaultT1); setTeam1Select(defaultT1);
      setTeam2Name(defaultT2); setTeam2Select(defaultT2);
      setStatus("completed"); setResult(""); setMom("");
      setScoreboardUrl(null); setScoreboardName("");
      setVenue(tournament?.venue || ""); setRound("League Match");
      setMatchDate(""); setOversLimit(20);
    }
    setError("");
  }, [isOpen, match, tournament, confirmedTeams]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError("File size exceeds 20MB limit."); return; }
    const reader = new FileReader();
    reader.onload = () => { setScoreboardUrl(reader.result); setScoreboardName(file.name); };
    reader.onerror = () => setError("Failed to read document. Please try another file.");
    reader.readAsDataURL(file);
  };
  const handleRemoveFile = () => { setScoreboardUrl(null); setScoreboardName(""); };

  const isFullyConfirmed = Boolean(
    (tournament?.max_teams && confirmedTeams.length >= tournament.max_teams) ||
    tournament?.spots_left === 0
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!team1Name?.trim()) return setError("Please specify Team 1");
    if (!team2Name?.trim()) return setError("Please specify Team 2");
    if (team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase()) return setError("Team 1 and Team 2 must be different teams.");
    if (isFullyConfirmed && confirmedTeams.length > 0) {
      const isT1Confirmed = confirmedTeams.some((ct) => ct.name.trim().toLowerCase() === team1Name.trim().toLowerCase());
      const isT2Confirmed = confirmedTeams.some((ct) => ct.name.trim().toLowerCase() === team2Name.trim().toLowerCase());
      if (!isT1Confirmed || !isT2Confirmed) {
        return setError(`Tournament is fully confirmed (${tournament.max_teams}/${tournament.max_teams} teams). Matches can only be played between confirmed teams. No new teams can be approved.`);
      }
    }
    setSaving(true); setError("");
    try {
      const payload = {
        team1_name: team1Name.trim(), team2_name: team2Name.trim(),
        status: status || "completed", result: result?.trim() || "",
        mom: mom?.trim() || "", scoreboard_url: scoreboardUrl || null,
        scoreboard_name: scoreboardName || "", venue: venue?.trim() || "",
        round: round?.trim() || "League Match",
        match_date: matchDate ? new Date(matchDate).toISOString() : null,
        overs_limit: Number(oversLimit) || 20,
      };
      const url = match ? `/tournaments/${tournament.id}/matches/${match.id}` : `/tournaments/${tournament.id}/matches`;
      const tok = token || getStoredToken();
      const res = await apiRequest(url, { method: match ? "PUT" : "POST", token: tok, body: payload });
      onSaved?.(res.match);
      onClose();
    } catch (err) { setError(err.message || "Failed to save tournament match"); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4 relative"
        style={isLight
          ? { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(16,185,129,0.08)" }
          : { backgroundColor: "#0d0f0d", border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ColorBar gradient="from-emerald-400 via-teal-500 to-cyan-500" />
        <div className={cn("flex items-center justify-between pb-3 border-b", isLight ? "border-slate-100" : "border-[#1f221f]")}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <h3 className={cn("text-lg font-bold", isLight ? "text-slate-900" : "text-white")}>
              {match ? "Edit Tournament Match" : "Add Tournament Match"}
            </h3>
          </div>
          <button type="button" onClick={onClose}
            className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-colors",
              isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-[#6b7a6b] hover:text-white hover:bg-[#1c1f1c]")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className={cn("p-3 rounded-xl text-xs flex items-center gap-2 border",
            isLight ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700" : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-400")}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {isFullyConfirmed && (
            <div className={cn("p-2.5 rounded-xl border text-[11px] flex items-center gap-2",
              isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300")}>
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Tournament is fully confirmed ({tournament?.max_teams}/{tournament?.max_teams} teams). Matches are restricted to confirmed teams only.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Team 1 *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select value={team1Select} onChange={(e) => { const val = e.target.value; setTeam1Select(val); if (val !== "__custom__") setTeam1Name(val); }} className={fieldClass}>
                    <option value="">-- Select Team 1 --</option>
                    {confirmedTeams.map((ct) => (<option key={ct.id || ct.name} value={ct.name}>{ct.name}</option>))}
                    {match?.team1_name && !confirmedTeams.some((ct) => ct.name === match.team1_name) && (<option value={match.team1_name}>{match.team1_name}</option>)}
                    {!isFullyConfirmed && <option value="__custom__">+ Other / Custom Team</option>}
                  </select>
                  {team1Select === "__custom__" && !isFullyConfirmed && (<input type="text" placeholder="Enter custom Team 1 name" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} className={fieldClass} required />)}
                </div>
              ) : (
                <input type="text" placeholder="e.g. Royal Strikers" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} className={fieldClass} required />
              )}
            </div>
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Team 2 *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select value={team2Select} onChange={(e) => { const val = e.target.value; setTeam2Select(val); if (val !== "__custom__") setTeam2Name(val); }} className={fieldClass}>
                    <option value="">-- Select Team 2 --</option>
                    {confirmedTeams.map((ct) => (<option key={ct.id || ct.name} value={ct.name}>{ct.name}</option>))}
                    {match?.team2_name && !confirmedTeams.some((ct) => ct.name === match.team2_name) && (<option value={match.team2_name}>{match.team2_name}</option>)}
                    {!isFullyConfirmed && <option value="__custom__">+ Other / Custom Team</option>}
                  </select>
                  {team2Select === "__custom__" && !isFullyConfirmed && (<input type="text" placeholder="Enter custom Team 2 name" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} className={fieldClass} required />)}
                </div>
              ) : (
                <input type="text" placeholder="e.g. Mumbai Warriors" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} className={fieldClass} required />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Match Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live In-Progress</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Round / Stage</label>
              <input type="text" placeholder="e.g. League, Semi-Final, Final" value={round} onChange={(e) => setRound(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Overs</label>
              <input type="number" min="1" max="100" placeholder="20" value={oversLimit} onChange={(e) => setOversLimit(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold" style={labelStyle}>Match Result</label>
            <input type="text" placeholder="e.g. Team 1 won by 24 runs, or Match Tied" value={result} onChange={(e) => setResult(e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label className="block mb-1 font-semibold" style={labelStyle}>Man of the Match (MOM)</label>
            <input type="text" placeholder="e.g. Virat Sharma (74* off 42 & 2/16)" value={mom} onChange={(e) => setMom(e.target.value)} className={fieldClass} />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold" style={labelStyle}>Upload Scoreboard Document</label>
            <div className={cn("p-3.5 rounded-xl border border-dashed transition-colors",
              isLight ? "bg-gradient-to-br from-slate-50 to-emerald-50/40 border-slate-300 hover:border-emerald-500" : "bg-gradient-to-br from-[#131613] to-emerald-950/20 border-[#333] hover:border-emerald-500/50")}>
              {scoreboardUrl ? (
                <div className={cn("flex items-center justify-between gap-2 p-2 rounded-lg border",
                  isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200" : "bg-gradient-to-r from-[#1a1e1a] to-emerald-950/30 border-emerald-500/30")}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className={cn("text-xs truncate font-medium", isLight ? "text-slate-900" : "text-white")}>{scoreboardName || "Scoreboard Document"}</span>
                  </div>
                  <button type="button" onClick={handleRemoveFile} className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors shrink-0" title="Remove document">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer py-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/25">
                    <UploadCloud className="w-5 h-5 text-white" />
                  </div>
                  <span className={cn("font-medium", isLight ? "text-slate-800" : "text-white")}>Click or browse to upload Scoreboard</span>
                  <span className={cn("text-[10px] mt-0.5", isLight ? "text-slate-500" : "text-[#6b7a6b]")}>Supports PDF, PNG, JPG, JPEG, WEBP, DOCX (Max 20MB)</span>
                  <input type="file" accept=".pdf,image/*,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Venue</label>
              <input type="text" placeholder="Ground name or pitch" value={venue} onChange={(e) => setVenue(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Match Date</label>
              <CalendarField value={matchDate ? matchDate.slice(0, 10) : ""} onChange={(v) => setMatchDate(v)} theme={theme} placeholder="Select match date" clearable={true} />
            </div>
          </div>

          <div className={cn("flex items-center gap-3 pt-3 border-t", isLight ? "border-slate-100" : "border-[#1f221f]")}>
            <button type="button" onClick={onClose}
              className={cn("flex-1 py-2.5 rounded-xl font-semibold transition-colors",
                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8]")}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className={cn("flex-1 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white shadow-lg",
                isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/25" : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25")}>
              {saving ? "Saving..." : match ? "Update Match" : "Add Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TournamentDetailsModal({ t, onClose, isMine, isOrganizer, roleLabel, registered, onRegister, onUnregister, onEdit, onDelete, token, currentUser, myTeamId, teammates, canManageMatches = false, onTournamentUpdated, onNavigateToLiveScore, theme = "dark" }) {
  const isLight = theme === "light";
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showStartMatchModal, setShowStartMatchModal] = useState(false);
  const [showScheduleMatchModal, setShowScheduleMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(false);
  const [showDeleteTournamentConfirm, setShowDeleteTournamentConfirm] = useState(false);
  const [deletingTournament, setDeletingTournament] = useState(false);

  // Custom team management state (for tournament creator)
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newVillageName, setNewVillageName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [addTeamError, setAddTeamError] = useState("");
  const [removingTeamId, setRemovingTeamId] = useState(null);

  // STRICT: Only the user who created this tournament can manage matches, upload scoreboards, schedule, or add teams
  const isCreatedUser = Boolean(
    currentUser?.id && (
      (t.created_by && String(t.created_by) === String(currentUser.id)) ||
      (!t.created_by && (isOrganizer || isMine))
    )
  );
  const canManage = details?.can_manage !== undefined ? details.can_manage : isCreatedUser;

  const handleAddCustomTeam = async (e) => {
    if (e) e.preventDefault();
    if (!newTeamName.trim()) {
      setAddTeamError("Please enter a team name");
      return;
    }
    const tok = token || getStoredToken();
    if (!tok) {
      setAddTeamError("Please log in to add a team");
      return;
    }
    setAddingTeam(true);
    setAddTeamError("");
    try {
      const res = await apiRequest(`/tournaments/${t.id}/teams`, {
        method: "POST",
        token: tok,
        body: {
          team_name: newTeamName.trim(),
          village_name: newVillageName.trim() || undefined,
        },
      });
      if (res?.teams) {
        setDetails((prev) => ({
          ...(prev || t),
          teams: res.teams,
          team_count: res.team_count,
          spots_left: res.spots_left,
          status: res.tournament_status || prev?.status || t.status,
        }));
      }
      setNewTeamName("");
      setNewVillageName("");
      setShowAddTeam(false);
      try {
        const fresh = await apiRequest(`/tournaments/${t.id}`);
        if (fresh?.tournament) {
          setDetails(fresh.tournament);
          if (Array.isArray(fresh.tournament.matches)) setMatches(fresh.tournament.matches);
          onTournamentUpdated?.(fresh.tournament);
        }
      } catch {}
    } catch (err) {
      setAddTeamError(err.message || "Failed to add confirmed team");
    } finally {
      setAddingTeam(false);
    }
  };

  const handleRemoveCustomTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to remove "${teamName}" from confirmed teams?`)) return;
    const tok = token || getStoredToken();
    if (!tok) return;
    setRemovingTeamId(teamId);
    try {
      const res = await apiRequest(`/tournaments/${t.id}/teams/${teamId}`, {
        method: "DELETE",
        token: tok,
      });
      if (res?.teams) {
        setDetails((prev) => ({
          ...(prev || t),
          teams: res.teams,
          team_count: res.team_count,
          spots_left: res.spots_left,
          status: res.tournament_status || prev?.status || t.status,
        }));
      }
      try {
        const fresh = await apiRequest(`/tournaments/${t.id}`);
        if (fresh?.tournament) {
          setDetails(fresh.tournament);
          onTournamentUpdated?.(fresh.tournament);
        }
      } catch {}
    } catch (err) {
      alert(err.message || "Failed to remove team");
    } finally {
      setRemovingTeamId(null);
    }
  };

  const pendingRequests = details?.pending_requests || [];
  const myRegStatus = details?.my_registration_status || t?.my_registration_status;
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const handleAcceptRequest = async (reg) => {
    const tok = token || getStoredToken();
    if (!tok) {
      alert("Please log in to accept requests.");
      return;
    }
    setProcessingRequestId(reg.registration_id);
    try {
      const res = await apiRequest(`/tournaments/${t.id}/registrations/${reg.registration_id}/accept`, {
        method: "POST",
        token: tok,
      });
      if (res) {
        setDetails((prev) => ({
          ...(prev || t),
          teams: res.confirmed_teams || prev?.teams || [],
          pending_requests: res.pending_requests || [],
          team_count: res.team_count,
          spots_left: res.spots_left,
        }));
        try {
          const fresh = await apiRequest(`/tournaments/${t.id}`);
          if (fresh?.tournament) {
            setDetails(fresh.tournament);
            if (Array.isArray(fresh.tournament.matches)) setMatches(fresh.tournament.matches);
            onTournamentUpdated?.(fresh.tournament);
          }
        } catch {}
      }
    } catch (err) {
      alert(err.message || "Failed to accept registration request");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (reg) => {
    if (!window.confirm(`Decline registration request for "${reg.team_name || reg.name}"?`)) return;
    const tok = token || getStoredToken();
    if (!tok) return;
    setProcessingRequestId(reg.registration_id);
    try {
      const res = await apiRequest(`/tournaments/${t.id}/registrations/${reg.registration_id}/reject`, {
        method: "POST",
        token: tok,
      });
      if (res) {
        setDetails((prev) => ({
          ...(prev || t),
          pending_requests: res.pending_requests || [],
        }));
        try {
          const fresh = await apiRequest(`/tournaments/${t.id}`);
          if (fresh?.tournament) {
            setDetails(fresh.tournament);
            onTournamentUpdated?.(fresh.tournament);
          }
        } catch {}
      }
    } catch (err) {
      alert(err.message || "Failed to decline registration request");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleMatchStarted = async (newMatch) => {
    if (!newMatch) return;
    setShowStartMatchModal(false);
    setShowScheduleMatchModal(false);
    setMatches((prev) => [...prev, newMatch]);
    try {
      const data = await apiRequest(`/tournaments/${t.id}`);
      if (data?.tournament) {
        setDetails(data.tournament);
        if (Array.isArray(data.tournament.matches)) setMatches(data.tournament.matches);
        onTournamentUpdated?.(data.tournament);
      }
    } catch {}
    onClose();
    if (onNavigateToLiveScore && newMatch.id) {
      onNavigateToLiveScore(newMatch.id, "squads", t);
    }
  };

  const handleMatchScheduled = async (newMatch) => {
    if (!newMatch) return;
    setShowStartMatchModal(false);
    setShowScheduleMatchModal(false);
    setMatches((prev) => [...prev, newMatch]);
    try {
      const data = await apiRequest(`/tournaments/${t.id}`);
      if (data?.tournament) {
        setDetails(data.tournament);
        if (Array.isArray(data.tournament.matches)) setMatches(data.tournament.matches);
        onTournamentUpdated?.(data.tournament);
      }
    } catch {}
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  useEffect(() => {
    if (!t?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingDetails(true);
      try {
        const data = await apiRequest(`/tournaments/${t.id}`);
        if (!cancelled && data?.tournament) {
          setDetails(data.tournament);
          if (Array.isArray(data.tournament.matches)) setMatches(data.tournament.matches);
        }
      } catch (err) { console.error("Failed to load tournament details:", err); }
      finally { if (!cancelled) setLoadingDetails(false); }
    })();
    return () => { cancelled = true; };
  }, [t?.id]);

  const handleMatchSaved = async (savedMatch) => {
    if (!savedMatch) return;
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === savedMatch.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = savedMatch; return next; }
      return [...prev, savedMatch];
    });
    try {
      const data = await apiRequest(`/tournaments/${t.id}`);
      if (data?.tournament) {
        setDetails(data.tournament);
        if (Array.isArray(data.tournament.matches)) setMatches(data.tournament.matches);
        onTournamentUpdated?.(data.tournament);
        return;
      }
    } catch (err) { console.error("Failed to re-fetch tournament after match saved:", err); }
    onTournamentUpdated?.({ ...t, matches_count: (t.matches_count || 0) + (selectedMatch ? 0 : 1), completed_count: (t.completed_count || 0) + (savedMatch.status === "completed" ? 1 : 0) });
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDelete?.id) return;
    setDeletingMatch(true);
    try {
      await apiRequest(`/tournaments/${t.id}/matches/${matchToDelete.id}`, { method: "DELETE", token });
      setMatches((prev) => prev.filter((m) => m.id !== matchToDelete.id));
      setMatchToDelete(null);
      try {
        const data = await apiRequest(`/tournaments/${t.id}`);
        if (data?.tournament) { setDetails(data.tournament); onTournamentUpdated?.(data.tournament); return; }
      } catch {}
      onTournamentUpdated?.({ ...t, matches_count: Math.max((t.matches_count || 1) - 1, 0) });
    } catch (err) { alert(err.message || "Failed to delete tournament match"); }
    finally { setDeletingMatch(false); }
  };

  const confirmDeleteTournamentAction = async () => {
    setDeletingTournament(true);
    try {
      await apiRequest(`/tournaments/${t.id}`, { method: "DELETE", token });
      onDelete?.(t.id); setShowDeleteTournamentConfirm(false); onClose();
    } catch (err) { alert(err.message || "Failed to delete tournament"); }
    finally { setDeletingTournament(false); }
  };

  const handleViewScoreboard = (m) => {
    if (!m.scoreboard_url) return;
    const url = m.scoreboard_url;
    if (url.startsWith("data:")) {
      const win = window.open();
      if (win) {
        if (url.startsWith("data:application/pdf")) {
          win.document.write(`<title>${m.scoreboard_name || "Scoreboard PDF"}</title><iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100vh;" allowfullscreen></iframe>`);
        } else {
          win.document.write(`<title>${m.scoreboard_name || "Scoreboard"}</title><body style="margin:0; background:#0b0d0b; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; font-family:sans-serif; color:#eee;"><h3 style="margin-bottom:12px; font-size:16px;">${m.team1_name} vs ${m.team2_name} - Scoreboard</h3><img src="${url}" style="max-width:92vw; max-height:85vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.7); border:1px solid #333;" alt="Scoreboard"/></body>`);
        }
      } else handleDownloadScoreboard(m);
    } else window.open(url, "_blank");
  };

  const handleDownloadScoreboard = (m) => {
    if (!m.scoreboard_url) return;
    const a = document.createElement("a");
    a.href = m.scoreboard_url;
    a.download = m.scoreboard_name || `${m.team1_name}_vs_${m.team2_name}_scoreboard`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const confirmedTeams = details?.teams || [];
  const maxTeams = t.max_teams ?? 0;
  const teamCount = details?.team_count ?? (t.team_count ?? 0);
  const spotsLeft = Math.max(maxTeams - teamCount, 0);
  const full = spotsLeft === 0;
  const canRegister = t.status === "registering" && !full && !registered && !isMine;
  const meta = statusMeta(t.status);

  const dotColor = { green: "#22c55e", amber: "#f59e0b", blue: "#3b82f6", red: "#ef4444" }[meta.color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl relative"
        style={isLight
          ? { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(16,185,129,0.08)" }
          : { backgroundColor: "#0d0f0d", border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.08)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className={cn("sticky top-0 z-10 px-6 pt-5 pb-4 flex items-start justify-between gap-3 rounded-t-2xl",
          isLight ? "bg-gradient-to-br from-white via-emerald-50/30 to-white border-b border-slate-100" : "bg-gradient-to-br from-[#0d0f0d] via-emerald-950/15 to-[#0d0f0d] border-b border-[#1c1f1c]")}>
          <ColorBar gradient={meta.gradient} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r text-white shadow-sm", meta.gradient)}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                {meta.label}
              </span>
              {t.format && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sm">
                  {t.format} Format
                </span>
              )}
              {isMine && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-sm">
                  {roleLabel}
                </span>
              )}
            </div>
            <h2 className={cn("text-xl font-bold leading-snug truncate bg-gradient-to-r bg-clip-text text-transparent",
              isLight ? "from-slate-900 to-slate-700" : "from-white to-slate-300")}>{t.name}</h2>
            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
              <Trophy className="w-3 h-3 text-amber-500" /> {t.creator_team_name || "Unknown organizer"}
            </div>
          </div>
          <button onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: isLight ? "#64748b" : "#6b7a6b" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? "#f1f5f9" : "#1c1f1c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl p-4"
            style={isLight
              ? { background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)", border: "1px solid #d1fae5" }
              : { background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.02) 100%)", border: "1px solid #1c1f1c" }}>
            <DetailRow icon={MapPin} label="Venue" value={t.venue || "TBD"} theme={theme} />
            <DetailRow icon={CalendarDays} label="Starts" value={t.startDate || "TBD"} theme={theme} />
            <DetailRow icon={Users} label="Teams" value={`${teamCount} / ${maxTeams} confirmed`} theme={theme} />
            <DetailRow icon={DollarSign} label="Entry fee" value={formatMoney(t.entry_fee)} theme={theme} />
            <DetailRow icon={Phone} label="Contact" value={t.phone || "-"} theme={theme} />
            <DetailRow icon={Phone} label="Co-contact" value={t.co_phone || "-"} theme={theme} />
          </div>

          {/* INCOMING TEAM REGISTRATION REQUESTS (Visible ONLY to Tournament Creator) */}
          {canManage && (pendingRequests.length > 0 || (loadingDetails && Number(t.pending_requests_count || 0) > 0)) && (
            <div className={cn(
              "rounded-2xl p-4 border space-y-3 relative overflow-hidden shadow-md animate-[fadeIn_.2s_ease-out]",
              isLight
                ? "bg-gradient-to-br from-amber-50/95 via-orange-50/60 to-yellow-50/70 border-amber-300 shadow-amber-500/10"
                : "bg-gradient-to-br from-amber-950/40 via-[#181612] to-[#121412] border-amber-500/40 shadow-amber-950/30"
            )}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className={cn("text-xs font-black uppercase tracking-wide", isLight ? "text-amber-950" : "text-amber-300")}>
                    Incoming Team Requests ({pendingRequests.length || t.pending_requests_count || 0})
                  </span>
                </div>
                <span className={cn("text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-xs",
                  isLight ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-amber-500/20 text-amber-300 border-amber-500/35")}>
                  Needs Your Approval
                </span>
              </div>
              <p className={cn("text-[11px] leading-relaxed", isLight ? "text-amber-900/80" : "text-amber-200/70")}>
                The following teams have requested to register for your tournament. Review details and accept to confirm their spot.
              </p>
              {loadingDetails && pendingRequests.length === 0 ? (
                <div className="flex items-center justify-center p-4 gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading team requests...
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                {pendingRequests.map((reqItem) => (
                  <div
                    key={reqItem.registration_id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all gap-2",
                      isLight
                        ? "bg-white/95 border-amber-200 shadow-xs hover:border-amber-300"
                        : "bg-[#181a17] border-amber-500/20 hover:border-amber-500/40"
                    )}
                  >
                    <div className="min-w-0 pr-1">
                      <div className={cn("text-xs font-black truncate flex items-center gap-1.5", isLight ? "text-slate-900" : "text-white")}>
                        <span>{reqItem.team_name || reqItem.name}</span>
                        {reqItem.village_name && (
                          <span className={cn("text-[10px] font-medium", isLight ? "text-slate-500" : "text-slate-400")}>
                            ({reqItem.village_name})
                          </span>
                        )}
                      </div>
                      <div className={cn("text-[10px] flex items-center gap-2 mt-0.5 flex-wrap font-medium", isLight ? "text-slate-600" : "text-slate-400")}>
                        {reqItem.registered_by_name && (
                          <span>By <strong>{reqItem.registered_by_name}</strong></span>
                        )}
                        {reqItem.registered_by_phone && (
                          <span>· 📞 {reqItem.registered_by_phone}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={processingRequestId === reqItem.registration_id || full}
                        onClick={() => handleAcceptRequest(reqItem)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-sm disabled:opacity-50",
                          isLight
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 text-white"
                            : "bg-gradient-to-r from-emerald-400 to-green-400 hover:from-emerald-300 text-black"
                        )}
                        title={full ? "Tournament is full" : "Accept and add to Confirmed Teams"}
                      >
                        {processingRequestId === reqItem.registration_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        disabled={processingRequestId === reqItem.registration_id}
                        onClick={() => handleRejectRequest(reqItem)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 disabled:opacity-50",
                          isLight
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25"
                        )}
                        title="Decline request"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setShowTeams(!showTeams)}
                className={cn("flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border shadow-sm",
                  isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-900 border-emerald-200" : "bg-gradient-to-r from-emerald-500/10 to-green-500/10 hover:from-emerald-500/15 hover:to-green-500/15 text-white border-emerald-500/25")}>
                <span className="flex items-center gap-2">
                  <Users className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-emerald-400")} />
                  Confirmed Teams ({teamCount})
                </span>
                <span className={cn("text-[10px] font-bold", isLight ? "text-emerald-700" : "text-emerald-400")}>
                  {showTeams ? "Hide Teams ▲" : "View Teams ▼"}
                </span>
              </button>

              {canManage && !full && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTeams(true);
                    setShowAddTeam((prev) => !prev);
                    setAddTeamError("");
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shrink-0",
                    isLight
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20"
                      : "bg-gradient-to-r from-emerald-400 to-green-400 hover:from-emerald-300 hover:to-green-300 text-black shadow-emerald-500/25"
                  )}
                  title="Add confirmed team directly"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Team</span>
                </button>
              )}
            </div>

            {showTeams && (
              <div className={cn("rounded-xl p-3 border space-y-2 max-h-64 overflow-y-auto",
                isLight ? "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white" : "border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-[#111311]")}>
                {full && (
                  <div className={cn("p-2.5 rounded-lg text-xs flex items-center justify-between border font-bold mb-1",
                    isLight ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300")}>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      All {maxTeams} Teams Fully Confirmed
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30">
                      No New Teams Allowed
                    </span>
                  </div>
                )}

                {/* Inline Add Team Form for Created User */}
                {canManage && showAddTeam && !full && (
                  <div className={cn("p-3 rounded-xl border mb-2.5 space-y-2.5 animate-[fadeIn_.15s_ease-out]",
                    isLight ? "bg-emerald-50/80 border-emerald-300" : "bg-[#181d18] border-emerald-500/35")}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={cn("flex items-center gap-1.5", isLight ? "text-emerald-900" : "text-emerald-300")}>
                        <Plus className="w-3.5 h-3.5 text-emerald-500" /> Add Confirmed Team (Custom)
                      </span>
                      <button
                        type="button"
                        onClick={() => { setShowAddTeam(false); setNewTeamName(""); setAddTeamError(""); }}
                        className={cn("text-[10px] px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#252825]", isLight ? "text-slate-500" : "text-slate-400")}
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleAddCustomTeam} className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Team Name (e.g. Royal Strikers)*"
                          value={newTeamName}
                          onChange={(e) => { setNewTeamName(e.target.value); setAddTeamError(""); }}
                          disabled={addingTeam}
                          autoFocus
                          className={cn("w-full px-3 py-1.5 rounded-lg text-xs border outline-none font-medium transition-all",
                            isLight
                              ? "bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              : "bg-[#121412] border-[#2c322c] text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400")}
                        />
                        <input
                          type="text"
                          placeholder="Village / Location (optional)"
                          value={newVillageName}
                          onChange={(e) => setNewVillageName(e.target.value)}
                          disabled={addingTeam}
                          className={cn("w-full px-3 py-1.5 rounded-lg text-xs border outline-none font-medium transition-all",
                            isLight
                              ? "bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              : "bg-[#121412] border-[#2c322c] text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400")}
                        />
                      </div>

                      {addTeamError && (
                        <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {addTeamError}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowAddTeam(false); setNewTeamName(""); setAddTeamError(""); }}
                          disabled={addingTeam}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold",
                            isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#252825] hover:bg-[#303430] text-slate-300")}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addingTeam || !newTeamName.trim()}
                          className={cn("px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50",
                            isLight
                              ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 text-white"
                              : "bg-gradient-to-r from-emerald-400 to-green-400 hover:from-emerald-300 text-black font-extrabold")}
                        >
                          {addingTeam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {addingTeam ? "Adding..." : "Add to Confirmed"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {loadingDetails ? (
                  <div className="text-xs text-center py-3" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Loading confirmed teams...</div>
                ) : confirmedTeams.length === 0 ? (
                  <div className="text-xs text-center py-3" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                    No teams confirmed yet {canManage && "— click '+ Add Team' above to add custom teams"}
                  </div>
                ) : (
                  confirmedTeams.map((team, idx) => (
                    <div key={team.id || idx} className={cn("flex items-center justify-between py-2 px-3 rounded-lg border",
                      isLight ? "bg-white border-emerald-100 shadow-xs" : "bg-[#161816] border-emerald-500/15")}>
                      <span className={cn("text-xs font-bold flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
                        <span className={cn("text-[10px] font-mono w-4 px-1.5 py-0.5 rounded-md text-center", isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400")}>{idx + 1}</span>
                        <span>{team.name}</span>
                        {team.village_name && (
                          <span className={cn("text-[10px] font-normal", isLight ? "text-slate-500" : "text-[#7a887a]")}>({team.village_name})</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-xs">Confirmed</span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomTeam(team.id, team.name)}
                            disabled={removingTeamId === team.id}
                            title="Remove confirmed team"
                            className={cn("p-1 rounded transition-colors text-slate-400 hover:text-red-500 hover:bg-red-500/10")}
                          >
                            {removingTeamId === team.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button type="button" onClick={() => setShowMatches(!showMatches)}
              className={cn("w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border shadow-sm",
                isLight ? "bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 text-sky-900 border-sky-200" : "bg-gradient-to-r from-sky-500/10 to-blue-500/10 hover:from-sky-500/15 hover:to-blue-500/15 text-white border-sky-500/25")}>
              <span className="flex items-center gap-2">
                <Swords className={cn("w-4 h-4", isLight ? "text-sky-600" : "text-sky-400")} />
                Tournament Match Details ({matches.length})
              </span>
              <span className={cn("text-[10px] font-bold", isLight ? "text-sky-700" : "text-sky-400")}>
                {showMatches ? "Hide Match Details ▲" : "View Match Details ▼"}
              </span>
            </button>
            {showMatches && (
              <div className={cn("rounded-xl p-3.5 border space-y-3 max-h-96 overflow-y-auto",
                isLight ? "border-sky-200 bg-gradient-to-br from-sky-50/60 to-white" : "border-sky-500/20 bg-gradient-to-br from-sky-950/20 to-[#111311]")}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className={cn("flex flex-col items-center justify-center p-2.5 rounded-xl border shadow-sm",
                    isLight ? "bg-gradient-to-br from-slate-50 to-white border-slate-200" : "bg-gradient-to-br from-[#161816] to-[#0e100e] border-[#252825]")}>
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-slate-500" : "text-[#6b7a6b]")}>Total Matches</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-slate-900" : "text-white")}>{matches.length}</span>
                  </div>
                  <div className={cn("flex flex-col items-center justify-center p-2.5 rounded-xl border shadow-sm",
                    isLight ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" : "bg-gradient-to-br from-emerald-950/40 to-green-950/30 border-emerald-500/30")}>
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-emerald-700" : "text-emerald-400")}>Completed</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-emerald-700" : "text-emerald-400")}>
                      {matches.filter((m) => m.status && m.status.toLowerCase() === "completed").length}
                    </span>
                  </div>
                  <div className={cn("flex flex-col items-center justify-center p-2.5 rounded-xl border shadow-sm",
                    isLight ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200" : "bg-gradient-to-br from-amber-950/40 to-orange-950/30 border-amber-500/30")}>
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-amber-800" : "text-amber-400")}>Ongoing</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-amber-800" : "text-amber-400")}>
                      {matches.filter((m) => m.status?.toLowerCase() !== "completed" && (Number(m.balls_bowled_count || 0) > 0 || Number(m.current_innings_summary?.overs_completed || 0) > 0 || Number(m.current_innings_summary?.total_runs || 0) > 0 || Number(m.current_innings_summary?.wickets || 0) > 0)).length}
                    </span>
                  </div>
                  <div className={cn("flex flex-col items-center justify-center p-2.5 rounded-xl border shadow-sm",
                    isLight ? "bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200" : "bg-gradient-to-br from-sky-950/40 to-blue-950/30 border-sky-500/30")}>
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-sky-800" : "text-sky-400")}>Scheduled</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-sky-800" : "text-sky-400")}>
                      {matches.filter((m) => m.status?.toLowerCase() !== "completed" && !(Number(m.balls_bowled_count || 0) > 0 || Number(m.current_innings_summary?.overs_completed || 0) > 0 || Number(m.current_innings_summary?.total_runs || 0) > 0 || Number(m.current_innings_summary?.wickets || 0) > 0)).length}
                    </span>
                  </div>
                </div>

                {canManage && matches.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* OPTION 1: START MATCH (e-SCORING) */}
                    <button
                      type="button"
                      onClick={() => {
                        const tok = token || getStoredToken();
                        if (!tok) {
                          alert("Please log in to start tournament match scoring.");
                          return;
                        }
                        setShowStartMatchModal(true);
                      }}
                      className={cn(
                        "p-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2.5 shadow-lg",
                        isLight
                          ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                          : "bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 hover:from-emerald-300 hover:to-teal-300 text-black shadow-emerald-500/30"
                      )}
                    >
                      <span className="text-lg">⚡</span>
                      <div className="text-left leading-tight">
                        <div className="text-xs font-black tracking-wide">
                          START NEXT MATCH
                        </div>
                        <div className="text-[10px] font-semibold opacity-90">
                          Live e-Scoring Console
                        </div>
                      </div>
                    </button>

                    {/* OPTION 2: SCHEDULE FUTURE MATCH */}
                    <button
                      type="button"
                      onClick={() => {
                        const tok = token || getStoredToken();
                        if (!tok) {
                          alert("Please log in to schedule tournament matches.");
                          return;
                        }
                        setShowScheduleMatchModal(true);
                      }}
                      className={cn(
                        "p-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2.5 border shadow-sm group",
                        isLight
                          ? "bg-gradient-to-br from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 text-sky-900 border-sky-200 shadow-sky-500/10"
                          : "bg-gradient-to-br from-sky-950/40 to-blue-950/30 hover:from-sky-900/50 hover:to-blue-900/40 text-sky-300 border-sky-500/30 shadow-sky-500/20"
                      )}
                      title="Schedule upcoming fixtures for future dates and slots"
                    >
                      <CalendarDays className="w-5 h-5 text-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="text-left leading-tight">
                        <div className={cn("text-xs font-black tracking-wide", isLight ? "text-slate-900" : "text-white")}>
                          SCHEDULE MATCH
                        </div>
                        <div className={cn("text-[10px] font-semibold", isLight ? "text-sky-700" : "text-sky-400")}>
                          Plan Future Fixture
                        </div>
                      </div>
                    </button>

                    {/* OPTION 3: SCOREBOARD UPLOAD OPTION */}
                    <button
                      type="button"
                      onClick={() => {
                        const tok = token || getStoredToken();
                        if (!tok) {
                          alert("Please log in to record tournament matches and upload scorecards.");
                          return;
                        }
                        setSelectedMatch(null);
                        setShowMatchModal(true);
                      }}
                      className={cn(
                        "p-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2.5 border shadow-sm",
                        isLight
                          ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-300"
                          : "bg-[#181a18] hover:bg-[#202520] text-emerald-400 border-emerald-500/30"
                      )}
                      title="Upload static scoreboard file (PDF/Image) or enter manual result"
                    >
                      <UploadCloud className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="text-left leading-tight">
                        <div className={cn("text-xs font-black tracking-wide", isLight ? "text-slate-900" : "text-white")}>
                          SCOREBOARD UPLOAD
                        </div>
                        <div className={cn("text-[10px] font-semibold", isLight ? "text-slate-500" : "text-slate-400")}>
                          Upload PDF / Image File
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {matches.length === 0 ? (
                  <div className={cn("text-xs text-center py-6 px-4 rounded-xl border border-dashed space-y-2.5",
                    isLight ? "bg-gradient-to-br from-sky-50 to-white border-sky-200 text-slate-600" : "border-sky-500/20 bg-gradient-to-br from-sky-950/20 to-[#0e100e] text-[#809080]")}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
                      <Swords className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={cn("font-bold text-sm", isLight ? "text-slate-900" : "text-white")}>No matches recorded for this tournament yet.</p>
                      <p className={cn("text-[11px] mt-0.5", isLight ? "text-slate-500" : "text-[#6b7a6b]")}>
                        Choose <strong>Start Match</strong> for real-time electronic ball-by-ball scoring, <strong>Schedule Match</strong> to plan future dates, or <strong>Scoreboard Upload</strong> to upload an external file.
                      </p>
                    </div>
                    {canManage && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 max-w-xl mx-auto w-full">
                        <button
                          type="button"
                          onClick={() => {
                            const tok = token || getStoredToken();
                            if (!tok) {
                              alert("Please log in to start tournament match scoring.");
                              return;
                            }
                            setShowStartMatchModal(true);
                          }}
                          className={cn("px-3 py-2.5 rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 shadow-lg",
                            isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                                    : "bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black shadow-emerald-500/25")}
                        >
                          <span>⚡</span> START MATCH
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tok = token || getStoredToken();
                            if (!tok) {
                              alert("Please log in to schedule tournament matches.");
                              return;
                            }
                            setShowScheduleMatchModal(true);
                          }}
                          className={cn("px-3 py-2.5 rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 border shadow-sm",
                            isLight ? "bg-white hover:bg-sky-50 text-sky-800 border-sky-300 shadow-sky-500/10"
                                    : "bg-[#181d24] hover:bg-[#202834] text-sky-300 border-sky-500/40 shadow-sky-500/20")}
                        >
                          <CalendarDays className="w-4 h-4 text-sky-400" /> SCHEDULE MATCH
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tok = token || getStoredToken();
                            if (!tok) {
                              alert("Please log in to upload tournament scorecards.");
                              return;
                            }
                            setSelectedMatch(null);
                            setShowMatchModal(true);
                          }}
                          className={cn("px-3 py-2.5 rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 border shadow-sm",
                            isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                    : "bg-[#202520] hover:bg-[#283028] text-white border-[#333]")}
                        >
                          <UploadCloud className="w-4 h-4 text-emerald-400" /> SCOREBOARD UPLOAD
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {matches.map((m, idx) => {
                      const isMatchScorer = isCreatedUser;
                      const normStatus = (m.status || "scheduled").toLowerCase();
                      const isCompleted = normStatus === "completed";
                      const hasBallsBowled = Boolean(
                        (m.balls_bowled_count && Number(m.balls_bowled_count) > 0) ||
                        (m.current_innings_summary && (
                          Number(m.current_innings_summary.overs_completed || 0) > 0 ||
                          Number(m.current_innings_summary.total_runs || 0) > 0 ||
                          Number(m.current_innings_summary.wickets || 0) > 0
                        ))
                      );
                      const isOngoing = !isCompleted && hasBallsBowled;
                      const isScheduled = !isCompleted && !isOngoing;

                      return (
                        <div key={m.id || idx}
                          className={cn("p-3.5 rounded-xl border space-y-2.5 transition-all relative overflow-hidden",
                            isLight ? "bg-white border-slate-200 shadow-sm hover:shadow-md" : "bg-[#161816] border-[#222522] hover:border-emerald-500/30")}>
                          <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
                            isCompleted ? "from-emerald-400 to-green-500" : isOngoing ? "from-amber-400 to-orange-500" : "from-sky-400 to-blue-500")} />
                          <div className="flex items-center justify-between text-[11px] pl-2">
                            <span className={cn("font-bold flex items-center gap-1.5", isLight ? "text-emerald-700" : "text-emerald-400")}>
                              <span className={cn("px-1.5 py-0.5 rounded font-mono", isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400")}>#{idx + 1}</span>
                              {m.round || "Match"}
                            </span>
                            <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-sm bg-gradient-to-r flex items-center gap-1",
                              isCompleted ? "from-emerald-400 to-green-500" : isOngoing ? "from-amber-400 to-orange-500 animate-pulse" : "from-sky-400 to-blue-500")}>
                              {isCompleted ? "COMPLETED" : isOngoing ? "⚡ ONGOING" : "📅 SCHEDULED"}
                            </span>
                          </div>

                          <div className={cn("p-2.5 rounded-xl border flex flex-col gap-1.5",
                            isLight ? "bg-slate-50/70 border-slate-200" : "bg-[#141614] border-[#222522]")}>
                            <div className={cn("flex items-center justify-between text-xs font-bold px-1", isLight ? "text-slate-900" : "text-white")}>
                              <span className="truncate max-w-[42%] text-[13px]">{m.team1_name || "Team 1"}</span>
                              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", isLight ? "bg-white text-slate-500 border border-slate-200" : "bg-[#252825] text-[#809080]")}>VS</span>
                              <span className="truncate max-w-[42%] text-right text-[13px]">{m.team2_name || "Team 2"}</span>
                            </div>

                            <div className={cn("text-[11px] flex items-center justify-between pt-1 border-t px-1 flex-wrap gap-1",
                              isLight ? "border-slate-200 text-slate-600" : "border-[#202520] text-[#8fa08f]")}>
                              <span className="flex items-center gap-1.5 font-medium">
                                <CalendarDays className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                {m.match_date || m.match_time ? (
                                  <span>Match on <strong className={isLight ? "text-slate-900" : "text-white"}>{formatMatchDate(m.match_date, m.match_time)}</strong></span>
                                ) : (
                                  <span className="italic">Scheduled (Date TBA)</span>
                                )}
                              </span>
                              {m.venue && (
                                <span className="flex items-center gap-1 truncate max-w-[48%]">
                                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span className="truncate">{m.venue}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {m.current_innings_summary && isOngoing && (
                            <div className={cn("text-[11px] px-2.5 py-1 rounded-lg font-mono flex items-center justify-between border pl-2",
                              isLight ? "bg-amber-50/60 border-amber-200 text-amber-900" : "bg-[#181a18] border-amber-500/20 text-emerald-400")}>
                              <span className="font-semibold text-[10px] uppercase font-sans text-amber-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Score:
                              </span>
                              <span className="font-bold">
                                {m.current_innings_summary.total_runs}/{m.current_innings_summary.wickets} ({m.current_innings_summary.overs_completed || 0} ov)
                              </span>
                            </div>
                          )}

                          {m.result && (
                            <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border pl-2",
                              isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800" : "text-emerald-300 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20")}>
                              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{m.result}</span>
                            </div>
                          )}

                          {(m.mom || m.potm_name) && (
                            <div className={cn("flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border pl-2",
                              isLight ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-900" : "text-amber-300 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20")}>
                              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate font-medium">MOM: <span className={cn("font-bold", isLight ? "text-amber-950" : "text-white")}>{m.mom || m.potm_name}</span>{m.potm_stats ? ` (${m.potm_stats})` : ""}</span>
                            </div>
                          )}

                          {/* ACTION BUTTONS: e-Scoring / View / Resume */}
                          <div className="pt-1 pl-2 space-y-1.5">
                            {isCompleted && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onNavigateToLiveScore?.(m.id, "scoreboard", t);
                                  }}
                                  className={cn("flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-colors shadow-sm",
                                    isLight
                                      ? "bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 border-amber-200"
                                      : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border-amber-500/30")}
                                >
                                  <span>🏏</span>
                                  <span>View Live Scorecard</span>
                                </button>
                                {m.scoreboard_url && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleViewScoreboard(m)}
                                      className={cn("py-1.5 px-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition-colors",
                                        isLight
                                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                          : "bg-[#202520] hover:bg-[#283028] text-emerald-400 border-emerald-500/25")}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Doc</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadScoreboard(m)}
                                      title="Download Scoreboard"
                                      className={cn("p-1.5 rounded-lg text-[11px] border transition-colors shrink-0",
                                        isLight
                                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                          : "bg-[#202520] hover:bg-[#283028] text-[#c8ccc8] border-[#333]")}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {isOngoing && (
                              <div>
                                {isMatchScorer ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onNavigateToLiveScore?.(m.id, "score", t);
                                    }}
                                    className={cn("w-full py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md",
                                      isLight
                                        ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                                        : "bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 hover:from-emerald-300 hover:to-teal-300 text-black")}
                                  >
                                    <span>⚡</span>
                                    <span>Resume Scoring</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onNavigateToLiveScore?.(m.id, "score", t);
                                    }}
                                    className={cn("w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all shadow-sm",
                                      isLight
                                        ? "bg-gradient-to-r from-sky-50 to-blue-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                                        : "bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25")}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Watch Live Score</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {isScheduled && (
                              <div className="space-y-1.5">
                                {isMatchScorer ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onNavigateToLiveScore?.(m.id, m.needs_squads ? "squads" : "toss", t);
                                      }}
                                      className={cn(
                                        "flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-98",
                                        isLight
                                          ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                                          : "bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 hover:from-emerald-300 hover:to-teal-300 text-black shadow-emerald-500/30"
                                      )}
                                    >
                                      <span className="text-sm">⚡</span>
                                      <span>Start Live Score (Toss & Scoring)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onNavigateToLiveScore?.(m.id, "squads", t);
                                      }}
                                      title="Set or view Playing XI Squads"
                                      className={cn(
                                        "py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-colors shrink-0",
                                        isLight
                                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                          : "bg-[#202520] hover:bg-[#283028] text-emerald-400 border-emerald-500/25"
                                      )}
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Squads</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg border text-xs"
                                    style={{
                                      backgroundColor: isLight ? "#f0f9ff" : "rgba(56,189,248,0.08)",
                                      borderColor: isLight ? "#bae6fd" : "rgba(56,189,248,0.2)",
                                      color: isLight ? "#0369a1" : "#38bdf8"
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <span>📅</span>
                                      <span>Scheduled Match · Scoring starts on match day</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onNavigateToLiveScore?.(m.id, "squads", t);
                                      }}
                                      className={cn("px-2 py-1 rounded text-[11px] font-bold border transition-colors",
                                        isLight ? "bg-white text-sky-700 border-sky-200 hover:bg-sky-50" : "bg-[#161c24] text-sky-300 border-sky-500/30 hover:bg-[#202834]")}
                                    >
                                      View Squads
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {m.scoreboard_url && !isCompleted && (
                              <div className="flex items-center gap-1.5 pt-1">
                                <button type="button" onClick={() => handleViewScoreboard(m)}
                                  className={cn("flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-colors truncate",
                                    isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-800 border-emerald-200" : "bg-gradient-to-r from-emerald-500/10 to-green-500/10 hover:from-emerald-500/20 hover:to-green-500/20 text-emerald-400 border-emerald-500/25")}>
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Scoreboard ({m.scoreboard_name || "Document"})</span>
                                </button>
                                <button type="button" onClick={() => handleDownloadScoreboard(m)} title="Download Scoreboard"
                                  className={cn("p-1.5 rounded-lg text-[11px] border transition-colors shrink-0",
                                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-[#202520] hover:bg-[#283028] text-[#c8ccc8] border-[#333]")}>
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                        {canManage && (
                          <div className={cn("flex items-center justify-end gap-1.5 pt-2 border-t pl-2", isLight ? "border-slate-100" : "border-[#1f221f]")}>
                            <button type="button" onClick={() => { setSelectedMatch(m); setShowMatchModal(true); }}
                              className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-colors",
                                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-[#222] hover:bg-[#2e2e2e] text-white border-[#333]")}>
                              <Pencil className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Edit
                            </button>
                            <button type="button" onClick={() => setMatchToDelete(m)}
                              className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-colors",
                                isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20")}>
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            )}
          </div>

          {Array.isArray(t.prizes) && t.prizes.length > 0 && (
            <div className="space-y-2">
              <div className={cn("text-sm font-bold flex items-center gap-1.5", isLight ? "text-slate-900" : "text-white")}>
                <Award className="w-4 h-4 text-amber-500 drop-shadow" /> Prizes
              </div>
              <PrizesSummary prizes={t.prizes} theme={theme} />
            </div>
          )}

          {t.description && (
            <div className="space-y-2">
              <div className={cn("text-sm font-bold flex items-center gap-1.5", isLight ? "text-slate-900" : "text-white")}>
                <Info className="w-4 h-4 text-emerald-600 dark:text-[#6b7a6b]" /> Description
              </div>
              <p className={cn("text-sm leading-relaxed", isLight ? "text-slate-600" : "text-[#c8ccc8]")}>{t.description}</p>
            </div>
          )}
        </div>

        <div className={cn("sticky bottom-0 px-6 py-4 flex gap-3 rounded-b-2xl",
          isLight ? "bg-gradient-to-t from-white via-white to-emerald-50/20 border-t border-slate-100" : "bg-gradient-to-t from-[#0d0f0d] via-[#0d0f0d] to-emerald-950/10 border-t border-[#1c1f1c]")}>
          <GhostButton onClick={onClose} className="flex-1 text-center">Close</GhostButton>

          {isCreatedUser && (
            <div className="flex gap-2">
              <button type="button" onClick={() => { onClose(); onEdit?.(t); }}
                className={cn("px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors border shadow-sm",
                  isLight ? "bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-800 border-slate-200" : "bg-[#1c1f1c] hover:bg-[#252825] text-white border-[#2a2a2a]")}>
                <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Edit
              </button>
              <button type="button" onClick={() => setShowDeleteTournamentConfirm(true)}
                className={cn("px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors border shadow-sm",
                  isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20")}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}

          {(isOrganizer || roleLabel === "Organizing") ? (
            <span className={cn("flex-1 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border shadow-sm",
              isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700" : "text-green-400 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/25")}>
              <CheckCircle className="w-3.5 h-3.5" /> Organizing
            </span>
          ) : (myRegStatus === "pending" || roleLabel === "Request Pending") ? (
            <div className="flex-1 flex gap-1.5">
              <span className={cn("flex-1 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border shadow-sm",
                isLight ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-amber-500/15 border-amber-500/30 text-amber-300")}>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Request Pending Approval
              </span>
              {onUnregister && (
                <button type="button" onClick={() => { onUnregister(t.id); onClose(); }}
                  className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm",
                    isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20")}>
                  Cancel Request
                </button>
              )}
            </div>
          ) : (registered || myRegStatus === "confirmed" || roleLabel === "Registered") ? (
            <div className="flex-1 flex gap-1.5">
              <span className={cn("flex-1 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border shadow-sm",
                isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700" : "text-green-400 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/25")}>
                <CheckCircle className="w-3.5 h-3.5" /> Registered
              </span>
              {onUnregister && (
                <button type="button" onClick={() => { onUnregister(t.id); onClose(); }}
                  className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm",
                    isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20")}>
                  Cancel
                </button>
              )}
            </div>
          ) : isMine ? (
            <span className={cn("flex-1 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border shadow-sm",
              isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700" : "text-green-400 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/25")}>
              <CheckCircle className="w-3.5 h-3.5" /> {roleLabel}
            </span>
          ) : (
            <button
              onClick={() => { if (window.confirm(`Send registration request for "${t.name}"? The tournament creator will review and accept your request.`)) { onRegister(t.id); onClose(); } }}
              disabled={!canRegister}
              className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg",
                full ? "opacity-60 cursor-not-allowed border border-slate-300 dark:border-[#333]" : "",
                isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25")}>
              {full ? `Full (All ${maxTeams} Teams Confirmed)` : t.status !== "registering" ? meta.label : "Request to Register"}
            </button>
          )}
        </div>
      </div>

      <TournamentMatchModal isOpen={showMatchModal}
        onClose={() => { setShowMatchModal(false); setSelectedMatch(null); }}
        tournament={t} match={selectedMatch} confirmedTeams={confirmedTeams}
        token={token} onSaved={handleMatchSaved} theme={theme} />

      <StartTournamentMatchModal
        isOpen={showStartMatchModal}
        onClose={() => setShowStartMatchModal(false)}
        tournament={t}
        confirmedTeams={confirmedTeams}
        matchesCount={matches.length}
        token={token}
        onMatchStarted={handleMatchStarted}
        onMatchScheduled={handleMatchScheduled}
        theme={theme}
      />

      <ScheduleTournamentMatchModal
        isOpen={showScheduleMatchModal}
        onClose={() => setShowScheduleMatchModal(false)}
        tournament={t}
        confirmedTeams={confirmedTeams}
        matchesCount={matches.length}
        token={token}
        onMatchScheduled={handleMatchScheduled}
        theme={theme}
      />

      {matchToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => !deletingMatch && setMatchToDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 relative"
            style={isLight
              ? { backgroundColor: "#ffffff", border: "1px solid #fee2e2", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }
              : { backgroundColor: "#0d0f0d", border: "1px solid #3a1a1a", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}>
            <ColorBar gradient="from-rose-400 via-red-500 to-orange-500" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-lg shadow-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>Delete Match?</h4>
                <p className={cn("text-xs mt-1 leading-relaxed", isLight ? "text-slate-600" : "text-slate-400")}>
                  Are you sure you want to delete <span className={cn("font-bold", isLight ? "text-slate-900" : "text-white")}>{matchToDelete.team1_name || "Team 1"} vs {matchToDelete.team2_name || "Team 2"}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className={cn("flex items-center gap-2.5 pt-2 border-t", isLight ? "border-slate-100" : "border-[#1f221f]")}>
              <button type="button" disabled={deletingMatch} onClick={() => setMatchToDelete(null)}
                className={cn("flex-1 py-2 rounded-xl text-xs font-semibold transition-colors",
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8]")}>
                Cancel
              </button>
              <button type="button" disabled={deletingMatch} onClick={confirmDeleteMatch}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25 disabled:opacity-50">
                {deletingMatch && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deletingMatch ? "Deleting..." : "Delete Match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteTournamentConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => !deletingTournament && setShowDeleteTournamentConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 relative"
            style={isLight
              ? { backgroundColor: "#ffffff", border: "1px solid #fee2e2", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }
              : { backgroundColor: "#0d0f0d", border: "1px solid #3a1a1a", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}>
            <ColorBar gradient="from-rose-400 via-red-500 to-orange-500" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-lg shadow-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>Delete Tournament?</h4>
                <p className={cn("text-xs mt-1 leading-relaxed", isLight ? "text-slate-600" : "text-slate-400")}>
                  Are you sure you want to delete <span className={cn("font-bold", isLight ? "text-slate-900" : "text-white")}>{t.name}</span>? This will permanently delete all its matches and registrations.
                </p>
              </div>
            </div>
            <div className={cn("flex items-center gap-2.5 pt-2 border-t", isLight ? "border-slate-100" : "border-[#1f221f]")}>
              <button type="button" disabled={deletingTournament} onClick={() => setShowDeleteTournamentConfirm(false)}
                className={cn("flex-1 py-2 rounded-xl text-xs font-semibold transition-colors",
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8]")}>
                Cancel
              </button>
              <button type="button" disabled={deletingTournament} onClick={confirmDeleteTournamentAction}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25 disabled:opacity-50">
                {deletingTournament && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deletingTournament ? "Deleting..." : "Delete Tournament"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t, isMine, isOrganizer, roleLabel, registered, onRegister, onUnregister, onView, onEdit, onDelete, token, theme = "dark" }) {
  const isLight = theme === "light";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const spotsLeft = t.spots_left ?? Math.max((t.max_teams || 0) - (t.team_count || 0), 0);
  const full = spotsLeft === 0;
  const canRegister = t.status === "registering" && !full && !registered && !isMine;
  const meta = statusMeta(t.status);

  return (
    <div
      className={cn(
        C,
        "rounded-2xl p-4.5 transition-all duration-200 relative overflow-hidden",
        isLight ? "hover:border-emerald-300 hover:shadow-lg" : "hover:border-[#3a3a3a] hover:shadow-lg hover:shadow-emerald-950/30"
      )}
      style={
        isLight
          ? (isMine
              ? { border: "1.5px solid #a7f3d0", background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%, #ecfdf5 100%)", boxShadow: "0 4px 20px -4px rgba(22, 163, 74, 0.15)" }
              : { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px -4px rgba(0, 0, 0, 0.08)" })
          : (isMine
              ? { border: "1px solid rgba(34,197,94,0.35)", background: "linear-gradient(135deg, rgba(22,101,52,0.15), rgba(13,15,13,0.5) 60%, rgba(6,78,59,0.1))" }
              : undefined)
      }
    >
      <ColorBar gradient={meta.gradient} />
      <div className="flex items-start justify-between gap-2 mb-3 pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-base font-bold truncate bg-gradient-to-r bg-clip-text text-transparent",
              isLight ? "from-slate-900 to-slate-700" : "from-white to-slate-300")}>{t.name}</span>
            {isMine && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-sm">
                {roleLabel}
              </span>
            )}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1.5 font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> {t.creator_team_name || "Unknown organizer"}
          </div>
        </div>
        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-gradient-to-r shrink-0", meta.gradient)}>
          {meta.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs mb-3.5 font-medium" style={{ color: isLight ? "#475569" : "#c8ccc8" }}>
        <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {t.startDate || "TBA"}</span>
        <span style={{ color: isLight ? "#cbd5e1" : "#3a3a3a" }}>·</span>
        <span className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> {t.venue || "TBD"}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3.5">
        {t.format && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sm">
            {t.format} Format
          </span>
        )}
        <TeamsRemainingBadge spotsLeft={spotsLeft} maxTeams={t.max_teams} />
        {t.matches_count !== undefined && t.matches_count > 0 && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 text-white shadow-sm">
            🏏 {t.matches_count} match{t.matches_count === 1 ? "" : "es"} ({t.completed_count || 0} completed)
          </span>
        )}
        {(isOrganizer || (isMine && roleLabel === "Organizing")) && Number(t.pending_requests_count || 0) > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md flex items-center gap-1.5 animate-pulse cursor-pointer hover:scale-102 transition-all"
            title="Click to view and review incoming team registration requests"
          >
            <span>🔔</span>
            <span>{t.pending_requests_count} Team Request{Number(t.pending_requests_count) > 1 ? "s" : ""}</span>
          </button>
        )}
      </div>

      {/* PROMINENT INCOMING REQUESTS BANNER ON TOURNAMENT CARD FOR CREATOR */}
      {(isOrganizer || (isMine && roleLabel === "Organizing")) && Number(t.pending_requests_count || 0) > 0 && (
        <div
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className={cn(
            "mb-3.5 p-3 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all hover:scale-[1.01] shadow-sm group",
            isLight
              ? "bg-gradient-to-r from-amber-50 via-orange-50/70 to-yellow-50 border-amber-300 text-amber-950 hover:border-amber-400"
              : "bg-gradient-to-r from-amber-950/40 via-orange-950/25 to-[#1c1812] border-amber-500/40 text-amber-200 hover:border-amber-500/60"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div className="min-w-0">
              <div className="text-xs font-black truncate flex items-center gap-1.5">
                <span>🔔 {t.pending_requests_count} Team Registration Request{Number(t.pending_requests_count) > 1 ? "s" : ""}</span>
              </div>
              <p className={cn("text-[11px] truncate font-medium", isLight ? "text-amber-900/80" : "text-amber-300/80")}>
                Awaiting your approval to confirm spots in this tournament
              </p>
            </div>
          </div>
          <span className={cn(
            "text-[11px] font-black px-3 py-1.5 rounded-lg shrink-0 text-white shadow-xs transition-transform group-hover:scale-105",
            isLight ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700" : "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold hover:from-amber-400 hover:to-orange-400"
          )}>
            Review & Accept →
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isMine ? (
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-[200px]">
            <span className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 min-w-[120px] border shadow-sm",
              roleLabel === "Request Pending"
                ? (isLight ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-amber-500/15 border-amber-500/30 text-amber-300")
                : (isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700" : "text-green-400 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/25"))}>
              {roleLabel === "Request Pending" ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              {roleLabel}
            </span>
            {(roleLabel === "Organizing" || isOrganizer) && (
              <>
                <button type="button" onClick={() => onEdit?.(t)} title="Edit Tournament"
                  className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border shadow-sm",
                    isLight ? "bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 border-slate-200" : "text-white bg-green-500/10 border-green-500/20 hover:bg-green-500/20")}>
                  <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Edit
                </button>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} title="Delete Tournament"
                  className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border shadow-sm",
                    isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "text-red-400 hover:text-red-300 bg-red-500/10 border-red-500/20 hover:bg-red-500/20")}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
            {roleLabel === "Request Pending" && onUnregister && (
              <button type="button" onClick={() => onUnregister(t.id)} title="Cancel Registration Request"
                className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm",
                  isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "text-red-400 hover:text-red-300 bg-red-500/10 border-red-500/20 hover:bg-red-500/20")}>
                Cancel
              </button>
            )}
          </div>
        ) : (registered || t.my_registration_status === "confirmed") ? (
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-[200px]">
            <span className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 min-w-[120px] border shadow-sm",
              isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700" : "text-green-400 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/25")}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Registered
            </span>
            {onUnregister && (
              <button type="button" onClick={() => onUnregister(t.id)} title="Cancel Registration"
                className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm",
                  isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "text-red-400 hover:text-red-300 bg-red-500/10 border-red-500/20 hover:bg-red-500/20")}>
                Cancel
              </button>
            )}
          </div>
        ) : t.my_registration_status === "pending" ? (
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-[200px]">
            <span className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 min-w-[120px] border shadow-sm",
              isLight ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-amber-500/15 border-amber-500/30 text-amber-300")}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Request Pending
            </span>
            {onUnregister && (
              <button type="button" onClick={() => onUnregister(t.id)} title="Cancel Registration Request"
                className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm",
                  isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "text-red-400 hover:text-red-300 bg-red-500/10 border-red-500/20 hover:bg-red-500/20")}>
                Cancel
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => { if (window.confirm(`Send registration request for "${t.name}"? The tournament creator will review and accept your request.`)) onRegister(t.id); }}
            disabled={!canRegister}
            className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg",
              full ? "opacity-60 cursor-not-allowed border border-slate-300 dark:border-[#333]" : "",
              isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25")}>
            {full ? `Full (${t.max_teams || 0}/${t.max_teams || 0} Confirmed)` : t.status !== "registering" ? meta.label : "Request to Register"}
          </button>
        )}
        <GhostButton onClick={onView}
          className={cn("flex-1 text-center font-bold", isLight ? "bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-800 border-slate-200" : "")}>
          View Tournament
        </GhostButton>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 relative"
            style={isLight
              ? { backgroundColor: "#ffffff", border: "1px solid #fee2e2", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }
              : { backgroundColor: "#0d0f0d", border: "1px solid #3a1a1a", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}>
            <ColorBar gradient="from-rose-400 via-red-500 to-orange-500" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-lg shadow-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>Delete Tournament?</h4>
                <p className={cn("text-xs mt-1 leading-relaxed", isLight ? "text-slate-600" : "text-slate-400")}>
                  Are you sure you want to delete <span className={cn("font-bold", isLight ? "text-slate-900" : "text-white")}>{t.name}</span>? All matches and team registrations under this tournament will be permanently removed.
                </p>
              </div>
            </div>
            <div className={cn("flex items-center gap-2.5 pt-2 border-t", isLight ? "border-slate-100" : "border-[#1f221f]")}>
              <button type="button" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}
                className={cn("flex-1 py-2 rounded-xl text-xs font-semibold transition-colors",
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8]")}>
                Cancel
              </button>
              <button type="button" disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try { await apiRequest(`/tournaments/${t.id}`, { method: "DELETE", token }); setShowDeleteConfirm(false); onDelete?.(t.id); }
                  catch (err) { alert(err.message || "Could not delete tournament"); }
                  finally { setDeleting(false); }
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25 disabled:opacity-50">
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? "Deleting..." : "Delete Tournament"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TournamentsTab({ registeredIds = [], onRegister, onUnregister, tournaments, token, currentUser, myTeamId, teammates, onTournamentCreated, onTournamentUpdated, onTournamentDeleted, autoOpenCreate = false, onAutoOpenHandled, onNavigateToLiveScore, theme = "dark" }) {
  const isLight = theme === "light";
  const [viewingId, setViewingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  useEffect(() => {
    if (autoOpenCreate) { setShowCreateForm(true); onAutoOpenHandled?.(); }
  }, [autoOpenCreate, onAutoOpenHandled]);

  const allTournaments = tournaments || [];
  const squadMemberIds = new Set([currentUser?.id, ...(teammates?.ids || [])].filter(Boolean).map(id => String(id)));
  const organizerCheck = (t) => isOrganizerOf(t, { currentUser });
  const isSquadPublished = (t) => t.created_by && squadMemberIds.has(String(t.created_by));
  const isMine = (t) =>
    organizerCheck(t) ||
    registeredIds.includes(t.id) ||
    isSquadPublished(t) ||
    t.my_registration_status === "confirmed" ||
    t.my_registration_status === "pending";

  const getRoleLabel = (t) => {
    if (organizerCheck(t)) return "Organizing";
    if (t.my_registration_status === "pending") return "Request Pending";
    if (registeredIds.includes(t.id) || t.my_registration_status === "confirmed") return "Registered";
    if (isSquadPublished(t)) return "Squad Tournament";
    return undefined;
  };

  const myTournaments = allTournaments.filter(isMine);
  const otherTournaments = allTournaments.filter((t) => !isMine(t));
  const viewingTournament = allTournaments.find((t) => t.id === viewingId) || null;

  const organizedTournamentsWithPending = allTournaments.filter(
    (t) => organizerCheck(t) && Number(t.pending_requests_count || 0) > 0
  );
  const totalPendingRequests = organizedTournamentsWithPending.reduce(
    (sum, t) => sum + Number(t.pending_requests_count || 0),
    0
  );

  useEffect(() => {
    const handleSync = async () => {
      const tok = token || getStoredToken();
      if (!tok) return;
      try {
        const res = await apiRequest("/tournaments", { token: tok });
        if (res?.tournaments) {
          res.tournaments.forEach((tour) => onTournamentUpdated?.(tour));
        }
      } catch {}
    };
    const onFocus = () => handleSync();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(handleSync, 15000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [token, onTournamentUpdated]);

  const handleCreated = (tournament) => { setShowCreateForm(false); onTournamentCreated?.(tournament); };

  return (
    <div className="space-y-8">
      <div className={cn("flex items-center justify-between flex-wrap gap-3 pb-4 border-b relative",
        isLight ? "border-slate-200" : "border-[#2a2a2a]")}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Trophy className="w-5 h-5 text-white drop-shadow" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold tracking-tight bg-gradient-to-r bg-clip-text text-transparent",
              isLight ? "from-emerald-700 via-green-600 to-teal-600" : "from-emerald-300 via-green-300 to-teal-300")}>Tournaments</h2>
            <p className="text-sm mt-0.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Organize or register for local cricket tournaments</p>
          </div>
        </div>

        <button onClick={() => setShowCreateForm(true)}
          className={cn("px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 shadow-lg",
            isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/30"
                    : "bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black shadow-emerald-500/30")}>
          <Plus className="w-4 h-4" /> Create Tournament
        </button>
      </div>

      {/* TOP NOTIFICATION BANNER FOR INCOMING REQUESTS ACROSS ORGANIZED TOURNAMENTS */}
      {totalPendingRequests > 0 && (
        <div
          className={cn(
            "p-4 rounded-2xl border shadow-lg relative overflow-hidden animate-[fadeIn_.25s_ease-out]",
            isLight
              ? "bg-gradient-to-r from-amber-50 via-orange-50/80 to-yellow-50/90 border-amber-300 shadow-amber-500/10"
              : "bg-gradient-to-r from-amber-950/60 via-[#1f1911] to-[#14120e] border-amber-500/40 shadow-amber-950/40"
          )}
        >
          <ColorBar gradient="from-amber-400 via-orange-500 to-yellow-500" />
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/30 text-lg">
                🔔
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={cn("text-sm font-black tracking-tight", isLight ? "text-amber-950" : "text-amber-200")}>
                    Incoming Team Registration Requests ({totalPendingRequests})
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-xs animate-pulse">
                    Action Required
                  </span>
                </div>
                <p className={cn("text-xs mt-1 leading-relaxed", isLight ? "text-amber-900/80" : "text-amber-300/80")}>
                  Teams have submitted requests to join your tournament(s). They are not confirmed until you accept them.
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {organizedTournamentsWithPending.map((tour) => (
                    <button
                      key={tour.id}
                      type="button"
                      onClick={() => setViewingId(tour.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs border hover:scale-[1.02]",
                        isLight
                          ? "bg-white hover:bg-amber-100/80 text-amber-950 border-amber-300"
                          : "bg-[#252019] hover:bg-[#322a20] text-amber-100 border-amber-500/30"
                      )}
                    >
                      <span className="font-extrabold">🏆 {tour.name}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black text-[10px]">
                        {tour.pending_requests_count} pending request{Number(tour.pending_requests_count) > 1 ? "s" : ""}
                      </span>
                      <span className="text-amber-500 font-bold">Review →</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {myTournaments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn("text-base font-bold flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
              <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-green-500" />
              Your Tournaments
            </h3>
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
              isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/15 text-emerald-400")}>
              {myTournaments.length} active
            </span>
          </div>
          <div className="space-y-3">
            {myTournaments.map((t) => (
              <TournamentCard key={t.id} t={t} isMine isOrganizer={organizerCheck(t)}
                roleLabel={getRoleLabel(t) || "Registered"}
                registered={registeredIds.includes(t.id) || t.my_registration_status === "confirmed"} onRegister={onRegister} onUnregister={onUnregister}
                onView={() => setViewingId(t.id)} onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)} token={token} theme={theme} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn("text-base font-bold flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-400 to-blue-500" />
            All Tournaments
          </h3>
          <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
            isLight ? "bg-sky-100 text-sky-700" : "bg-sky-500/15 text-sky-400")}>
            {otherTournaments.length} available
          </span>
        </div>
        {otherTournaments.length === 0 ? (
          <div className={cn(C, "rounded-2xl p-8 text-center text-sm border relative overflow-hidden",
            isLight ? "bg-gradient-to-br from-slate-50 to-white border-slate-200 text-slate-500" : "bg-gradient-to-br from-[#0e100e] to-[#131613] border-[#1f221f]")}
            style={{ color: isLight ? undefined : "#4a5a4a" }}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-slate-400" />
            </div>
            No other tournaments available right now.
          </div>
        ) : (
          <div className="space-y-3">
            {otherTournaments.map((t) => (
              <TournamentCard key={t.id} t={t} isMine={false} isOrganizer={organizerCheck(t)}
                roleLabel={getRoleLabel(t)}
                registered={registeredIds.includes(t.id) || t.my_registration_status === "confirmed"} onRegister={onRegister} onUnregister={onUnregister}
                onView={() => setViewingId(t.id)} onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)} token={token} theme={theme} />
            ))}
          </div>
        )}
      </section>

      {viewingTournament && (
        <TournamentDetailsModal t={viewingTournament} onClose={() => setViewingId(null)}
          isMine={isMine(viewingTournament)} isOrganizer={organizerCheck(viewingTournament)}
          roleLabel={getRoleLabel(viewingTournament) || (organizerCheck(viewingTournament) ? "Organizing" : undefined)}
          registered={registeredIds.includes(viewingTournament.id) || viewingTournament.my_registration_status === "confirmed"} onRegister={onRegister} onUnregister={onUnregister}
          onEdit={(item) => setEditingTournament(item)} onDelete={(id) => onTournamentDeleted?.(id)}
          token={token} currentUser={currentUser} myTeamId={myTeamId} teammates={teammates}
          canManageMatches={organizerCheck(viewingTournament)}
          onTournamentUpdated={onTournamentUpdated} onNavigateToLiveScore={onNavigateToLiveScore} theme={theme} />
      )}

      {showCreateForm && (
        <CreateTournamentForm token={token} user={currentUser} tournaments={allTournaments}
          onClose={() => setShowCreateForm(false)} onCreated={handleCreated} theme={theme} />
      )}

      {editingTournament && (
        <CreateTournamentForm token={token} user={currentUser} tournaments={allTournaments}
          initialTournament={editingTournament} onClose={() => setEditingTournament(null)} theme={theme}
          onUpdated={(updated) => { onTournamentUpdated?.(updated); setEditingTournament(null); }}
          onDeleted={(id) => { onTournamentDeleted?.(id); setEditingTournament(null); }} />
      )}
    </div>
  );
}