import React, { useState, useEffect } from "react";
import { Award, MapPin, CalendarDays, Users, DollarSign, Phone, Trophy, X, Pencil, Trash2, CheckCircle, Info, Plus, Swords, FileText, Download, UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "../../api";
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
        "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm",
        isFull
          ? "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200 dark:from-rose-500/15 dark:to-red-500/15 dark:text-rose-300 dark:border-rose-500/30"
          : isLow
          ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200 dark:from-amber-500/15 dark:to-orange-500/15 dark:text-amber-300 dark:border-amber-500/30"
          : "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200 dark:from-emerald-500/15 dark:to-green-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", isFull ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500")} />
      {isFull ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`} · {maxTeams ?? 0} teams
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!team1Name?.trim()) return setError("Please specify Team 1");
    if (!team2Name?.trim()) return setError("Please specify Team 2");
    if (team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase()) return setError("Team 1 and Team 2 must be different teams.");
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
      const res = await apiRequest(url, { method: match ? "PUT" : "POST", token, body: payload });
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Team 1 *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select value={team1Select} onChange={(e) => { const val = e.target.value; setTeam1Select(val); if (val !== "__custom__") setTeam1Name(val); }} className={fieldClass}>
                    <option value="">-- Select Team 1 --</option>
                    {confirmedTeams.map((ct) => (<option key={ct.id || ct.name} value={ct.name}>{ct.name}</option>))}
                    {match?.team1_name && !confirmedTeams.some((ct) => ct.name === match.team1_name) && (<option value={match.team1_name}>{match.team1_name}</option>)}
                    <option value="__custom__">+ Other / Custom Team</option>
                  </select>
                  {team1Select === "__custom__" && (<input type="text" placeholder="Enter custom Team 1 name" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} className={fieldClass} required />)}
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
                    <option value="__custom__">+ Other / Custom Team</option>
                  </select>
                  {team2Select === "__custom__" && (<input type="text" placeholder="Enter custom Team 2 name" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} className={fieldClass} required />)}
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

function TournamentDetailsModal({ t, onClose, isMine, isOrganizer, roleLabel, registered, onRegister, onUnregister, onEdit, onDelete, token, currentUser, myTeamId, teammates, canManageMatches = false, onTournamentUpdated, theme = "dark" }) {
  const isLight = theme === "light";
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(false);
  const [showDeleteTournamentConfirm, setShowDeleteTournamentConfirm] = useState(false);
  const [deletingTournament, setDeletingTournament] = useState(false);

  const canManage = Boolean(token) || canManageMatches || isOrganizer || details?.can_manage || !t.created_by || false;

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

          <div className="space-y-3">
            <button type="button" onClick={() => setShowTeams(!showTeams)}
              className={cn("w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border shadow-sm",
                isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-900 border-emerald-200" : "bg-gradient-to-r from-emerald-500/10 to-green-500/10 hover:from-emerald-500/15 hover:to-green-500/15 text-white border-emerald-500/25")}>
              <span className="flex items-center gap-2">
                <Users className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-emerald-400")} />
                Confirmed Teams ({teamCount})
              </span>
              <span className={cn("text-[10px] font-bold", isLight ? "text-emerald-700" : "text-emerald-400")}>
                {showTeams ? "Hide Teams ▲" : "View Teams ▼"}
              </span>
            </button>
            {showTeams && (
              <div className={cn("rounded-xl p-3 border space-y-2 max-h-48 overflow-y-auto",
                isLight ? "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white" : "border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-[#111311]")}>
                {loadingDetails ? (
                  <div className="text-xs text-center py-3" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Loading confirmed teams...</div>
                ) : confirmedTeams.length === 0 ? (
                  <div className="text-xs text-center py-3" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No teams confirmed yet</div>
                ) : (
                  confirmedTeams.map((team, idx) => (
                    <div key={team.id || idx} className={cn("flex items-center justify-between py-2 px-3 rounded-lg border",
                      isLight ? "bg-white border-emerald-100 shadow-xs" : "bg-[#161816] border-emerald-500/15")}>
                      <span className={cn("text-xs font-bold flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
                        <span className={cn("text-[10px] font-mono w-4 px-1.5 py-0.5 rounded-md", isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400")}>{idx + 1}</span>
                        {team.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-xs">Confirmed</span>
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
                <div className="grid grid-cols-3 gap-2">
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
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-amber-800" : "text-amber-400")}>Scheduled / Live</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-amber-800" : "text-amber-400")}>
                      {matches.filter((m) => !m.status || m.status.toLowerCase() !== "completed").length}
                    </span>
                  </div>
                </div>

                <button type="button"
                  onClick={() => { if (!token) { alert("Please log in to record tournament matches and upload scorecards."); return; } setSelectedMatch(null); setShowMatchModal(true); }}
                  className={cn("w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                    isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25")}>
                  <Plus className="w-4 h-4" /> Add Match, Scorecard & Results
                </button>

                {matches.length === 0 ? (
                  <div className={cn("text-xs text-center py-6 px-4 rounded-xl border border-dashed space-y-2.5",
                    isLight ? "bg-gradient-to-br from-sky-50 to-white border-sky-200 text-slate-600" : "border-sky-500/20 bg-gradient-to-br from-sky-950/20 to-[#0e100e] text-[#809080]")}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
                      <Swords className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={cn("font-bold text-sm", isLight ? "text-slate-900" : "text-white")}>No matches recorded for this tournament yet.</p>
                      <p className={cn("text-[11px] mt-0.5", isLight ? "text-slate-500" : "text-[#6b7a6b]")}>Record Team 1 vs Team 2, upload match scorecards (PDF/Image), set Man of the Match, and record winners!</p>
                    </div>
                    <button type="button"
                      onClick={() => { if (!token) { alert("Please log in to record tournament matches and upload scorecards."); return; } setSelectedMatch(null); setShowMatchModal(true); }}
                      className={cn("mt-1 px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-lg",
                        isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                                : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25")}>
                      <Plus className="w-3.5 h-3.5" /> Add First Match & Scorecard
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {matches.map((m, idx) => (
                      <div key={m.id || idx}
                        className={cn("p-3.5 rounded-xl border space-y-2.5 transition-all relative overflow-hidden",
                          isLight ? "bg-white border-slate-200 shadow-sm hover:shadow-md" : "bg-[#161816] border-[#222522] hover:border-emerald-500/30")}>
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
                          m.status === "completed" ? "from-emerald-400 to-green-500" : m.status === "live" ? "from-amber-400 to-orange-500" : "from-sky-400 to-blue-500")} />
                        <div className="flex items-center justify-between text-[11px] pl-2">
                          <span className={cn("font-bold flex items-center gap-1.5", isLight ? "text-emerald-700" : "text-emerald-400")}>
                            <span className={cn("px-1.5 py-0.5 rounded font-mono", isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400")}>#{idx + 1}</span>
                            {m.round || "Match"}
                          </span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm bg-gradient-to-r",
                            m.status === "completed" ? "from-emerald-400 to-green-500" : m.status === "live" ? "from-amber-400 to-orange-500" : "from-sky-400 to-blue-500")}>
                            {m.status ? m.status.toUpperCase() : "SCHEDULED"}
                          </span>
                        </div>

                        <div className={cn("flex items-center justify-between text-xs font-bold px-1 pl-2", isLight ? "text-slate-900" : "text-white")}>
                          <span className="truncate max-w-[42%]">{m.team1_name || "Team 1"}</span>
                          <span className={cn("text-[10px] font-normal px-2 py-0.5 rounded-full", isLight ? "bg-slate-100 text-slate-500" : "bg-[#252825] text-[#6b7a6b]")}>VS</span>
                          <span className="truncate max-w-[42%] text-right">{m.team2_name || "Team 2"}</span>
                        </div>

                        {m.result && (
                          <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border pl-2",
                            isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800" : "text-emerald-300 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20")}>
                            <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{m.result}</span>
                          </div>
                        )}

                        {m.mom && (
                          <div className={cn("flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border pl-2",
                            isLight ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-900" : "text-amber-300 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20")}>
                            <Award className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate font-medium">MOM: <span className={cn("font-bold", isLight ? "text-amber-950" : "text-white")}>{m.mom}</span></span>
                          </div>
                        )}

                        {m.scoreboard_url && (
                          <div className="flex items-center gap-1.5 pt-1 pl-2">
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
                    ))}
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

          {(roleLabel === "Organizing" || isOrganizer) && (
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

          {isMine ? (
            <span className={cn("flex-1 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border shadow-sm",
              isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700" : "text-green-400 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/25")}>
              <CheckCircle className="w-3.5 h-3.5" /> {roleLabel}
            </span>
          ) : registered ? (
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
          ) : (
            <button
              onClick={() => { if (window.confirm(`Are you sure you want to register your team for "${t.name}"?`)) { onRegister(t.id); onClose(); } }}
              disabled={!canRegister}
              className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg",
                isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25")}>
              {full ? "Full" : t.status !== "registering" ? meta.label : "Register"}
            </button>
          )}
        </div>
      </div>

      <TournamentMatchModal isOpen={showMatchModal}
        onClose={() => { setShowMatchModal(false); setSelectedMatch(null); }}
        tournament={t} match={selectedMatch} confirmedTeams={confirmedTeams}
        token={token} onSaved={handleMatchSaved} theme={theme} />

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
      </div>

      <div className="flex flex-wrap gap-2">
        {isMine ? (
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-[200px]">
            <span className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 min-w-[120px] border shadow-sm",
              isLight ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700" : "text-green-400 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/25")}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {roleLabel}
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
          </div>
        ) : registered ? (
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
        ) : (
          <button onClick={() => { if (window.confirm(`Are you sure you want to register your team for "${t.name}"?`)) onRegister(t.id); }}
            disabled={!canRegister}
            className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg",
              isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/25"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25")}>
            {full ? "Full" : t.status !== "registering" ? meta.label : "Register"}
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

export default function TournamentsTab({ registeredIds = [], onRegister, onUnregister, tournaments, token, currentUser, myTeamId, teammates, onTournamentCreated, onTournamentUpdated, onTournamentDeleted, autoOpenCreate = false, onAutoOpenHandled, theme = "dark" }) {
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
  const isMine = (t) => organizerCheck(t) || registeredIds.includes(t.id) || isSquadPublished(t);

  const myTournaments = allTournaments.filter(isMine);
  const otherTournaments = allTournaments.filter((t) => !isMine(t));
  const viewingTournament = allTournaments.find((t) => t.id === viewingId) || null;

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
                roleLabel={organizerCheck(t) ? "Organizing" : (registeredIds.includes(t.id) ? "Registered" : "Squad Tournament")}
                registered={registeredIds.includes(t.id)} onRegister={onRegister} onUnregister={onUnregister}
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
                roleLabel={organizerCheck(t) ? "Organizing" : undefined}
                registered={registeredIds.includes(t.id)} onRegister={onRegister} onUnregister={onUnregister}
                onView={() => setViewingId(t.id)} onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)} token={token} theme={theme} />
            ))}
          </div>
        )}
      </section>

      {viewingTournament && (
        <TournamentDetailsModal t={viewingTournament} onClose={() => setViewingId(null)}
          isMine={isMine(viewingTournament)} isOrganizer={organizerCheck(viewingTournament)}
          roleLabel={organizerCheck(viewingTournament) ? "Organizing" : (registeredIds.includes(viewingTournament.id) ? "Registered" : "Squad Tournament")}
          registered={registeredIds.includes(viewingTournament.id)} onRegister={onRegister} onUnregister={onUnregister}
          onEdit={(item) => setEditingTournament(item)} onDelete={(id) => onTournamentDeleted?.(id)}
          token={token} currentUser={currentUser} myTeamId={myTeamId} teammates={teammates}
          canManageMatches={Boolean(token) || organizerCheck(viewingTournament) || isSquadPublished(viewingTournament) || !viewingTournament.created_by || (viewingTournament.creator_team_id && myTeamId && String(viewingTournament.creator_team_id) === String(myTeamId))}
          onTournamentUpdated={onTournamentUpdated} theme={theme} />
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