import React, { useState, useEffect } from "react";
import { Award, MapPin, CalendarDays, Users, DollarSign, Phone, Trophy, X, Pencil, Trash2, CheckCircle, Info, Plus, Swords, FileText, Download, UploadCloud, AlertCircle } from "lucide-react";
import { apiRequest } from "../../api";
import CreateTournamentForm from "../CreateTournamentForm";
import { C, cn, Tag, GhostButton } from "../../utils/helpers.jsx";

const STATUS_META = {
  registering: { label: "Registering", color: "green" },
  ongoing: { label: "Ongoing", color: "amber" },
  completed: { label: "Completed", color: "blue" },
  cancelled: { label: "Cancelled", color: "red" },
};
function statusMeta(status) {
  return STATUS_META[status] || { label: status || "Unknown", color: "blue" };
}
function formatMoney(n) {
  if (n === null || n === undefined || n === "") return "-";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

// ---------------------------------------------------------------------------
// Single source of truth for "is this user the organizer of this tournament".
// Both the card and the modal use this so their Edit/Delete gating can never
// drift out of sync. Note: strictly checks `created_by` matching `currentUser.id`
// so only the creating user can edit/delete, not their teammates.
// ---------------------------------------------------------------------------
function isOrganizerOf(t, { currentUser } = {}) {
  if (!currentUser?.id || !t?.created_by) return false;
  return String(t.created_by) === String(currentUser.id);
}

function TeamsRemainingBadge({ spotsLeft, maxTeams }) {
  return (
    <Tag color={spotsLeft === 0 ? "red" : "amber"}>
      {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`} · {maxTeams ?? 0} teams
    </Tag>
  );
}

function PrizesSummary({ prizes, theme = "dark" }) {
  if (!Array.isArray(prizes) || prizes.length === 0) return null;
  const isLight = theme === "light";
  return (
    <div className="flex flex-wrap gap-2">
      {prizes.map((p) => (
        <div
          key={p.position}
          className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
          style={isLight ? {
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#78350f"
          } : { backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#c8ccc8" }}
        >
          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className={cn("font-bold", isLight ? "text-amber-950" : "text-white")}>#{p.position}</span>
          <span className={isLight ? "font-semibold text-amber-900" : ""}>{formatMoney(p.money)}</span>
          {p.trophy && <span className="text-amber-600 font-medium">+ trophy</span>}
        </div>
      ))}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: isLight ? "#16a34a" : "#6b7a6b" }} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>
          {label}
        </div>
        <div className={cn("text-sm truncate", isLight ? "text-slate-900 font-medium" : "text-white")}>{value}</div>
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
    ? "w-full p-2.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
    : "w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none";

  const labelStyle = { color: isLight ? "#475569" : "#a0aba0" };

  useEffect(() => {
    if (!isOpen) return;
    if (match) {
      setTeam1Name(match.team1_name || "");
      setTeam2Name(match.team2_name || "");
      setTeam1Select(match.team1_name || "");
      setTeam2Select(match.team2_name || "");
      setStatus(match.status || "completed");
      setResult(match.result || "");
      setMom(match.mom || match.man_of_the_match || "");
      setScoreboardUrl(match.scoreboard_url || null);
      setScoreboardName(match.scoreboard_name || "");
      setVenue(match.venue || tournament?.venue || "");
      setRound(match.round || "League Match");
      setMatchDate(match.match_date ? new Date(match.match_date).toISOString().slice(0, 16) : "");
      setOversLimit(match.overs_limit || 20);
    } else {
      const defaultT1 = confirmedTeams[0]?.name || "";
      const defaultT2 = confirmedTeams[1]?.name || "";
      setTeam1Name(defaultT1);
      setTeam1Select(defaultT1);
      setTeam2Name(defaultT2);
      setTeam2Select(defaultT2);
      setStatus("completed");
      setResult("");
      setMom("");
      setScoreboardUrl(null);
      setScoreboardName("");
      setVenue(tournament?.venue || "");
      setRound("League Match");
      setMatchDate("");
      setOversLimit(20);
    }
    setError("");
  }, [isOpen, match, tournament, confirmedTeams]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("File size exceeds 20MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScoreboardUrl(reader.result);
      setScoreboardName(file.name);
    };
    reader.onerror = () => {
      setError("Failed to read document. Please try another file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setScoreboardUrl(null);
    setScoreboardName("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!team1Name.trim()) {
      setError("Please specify Team 1");
      return;
    }
    if (!team2Name.trim()) {
      setError("Please specify Team 2");
      return;
    }
    if (team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase()) {
      setError("Team 1 and Team 2 must be different teams.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        team1_name: team1Name.trim(),
        team2_name: team2Name.trim(),
        status,
        result: result.trim(),
        mom: mom.trim(),
        scoreboard_url: scoreboardUrl,
        scoreboard_name: scoreboardName,
        venue: venue.trim(),
        round: round.trim(),
        match_date: matchDate ? new Date(matchDate).toISOString() : null,
        overs_limit: Number(oversLimit) || 20,
      };

      const url = match
        ? `/tournaments/${tournament.id}/matches/${match.id}`
        : `/tournaments/${tournament.id}/matches`;

      const res = await apiRequest(url, {
        method: match ? "PUT" : "POST",
        token,
        body: payload,
      });

      onSaved?.(res.match);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save tournament match");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4"
        style={isLight ? {
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        } : {
          backgroundColor: "#0d0f0d",
          border: "1px solid #2a2a2a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("flex items-center justify-between pb-3 border-b", isLight ? "border-slate-100" : "border-[#1f221f]")}>
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-emerald-500" />
            <h3 className={cn("text-lg font-bold", isLight ? "text-slate-900" : "text-white")}>
              {match ? "Edit Tournament Match" : "Add Tournament Match"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
              isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-[#6b7a6b] hover:text-white hover:bg-[#1c1f1c]"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className={cn("p-3 rounded-xl text-xs flex items-center gap-2 border", isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-500/10 border-red-500/30 text-red-400")}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Teams Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Team 1 *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={team1Select}
                    onChange={(e) => {
                      setTeam1Select(e.target.value);
                      if (e.target.value !== "__custom__") setTeam1Name(e.target.value);
                    }}
                    className={fieldClass}
                  >
                    <option value="">-- Select Team 1 --</option>
                    {confirmedTeams.map((ct) => (
                      <option key={ct.id || ct.name} value={ct.name}>
                        {ct.name}
                      </option>
                    ))}
                    <option value="__custom__">+ Other / Custom Team</option>
                  </select>
                  {team1Select === "__custom__" && (
                    <input
                      type="text"
                      placeholder="Enter custom Team 1 name"
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
                  placeholder="e.g. Royal Strikers"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  className={fieldClass}
                  required
                />
              )}
            </div>

            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Team 2 *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={team2Select}
                    onChange={(e) => {
                      setTeam2Select(e.target.value);
                      if (e.target.value !== "__custom__") setTeam2Name(e.target.value);
                    }}
                    className={fieldClass}
                  >
                    <option value="">-- Select Team 2 --</option>
                    {confirmedTeams.map((ct) => (
                      <option key={ct.id || ct.name} value={ct.name}>
                        {ct.name}
                      </option>
                    ))}
                    <option value="__custom__">+ Other / Custom Team</option>
                  </select>
                  {team2Select === "__custom__" && (
                    <input
                      type="text"
                      placeholder="Enter custom Team 2 name"
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
                  placeholder="e.g. Mumbai Warriors"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  className={fieldClass}
                  required
                />
              )}
            </div>
          </div>

          {/* Status & Round */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Match Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={fieldClass}
              >
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live In-Progress</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Round / Stage</label>
              <input
                type="text"
                placeholder="e.g. League, Semi-Final, Final"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Match Result */}
          <div>
            <label className="block mb-1 font-semibold" style={labelStyle}>Match Result</label>
            <input
              type="text"
              placeholder="e.g. Team 1 won by 24 runs, or Match Tied"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className={fieldClass}
            />
          </div>

          {/* Man of the Match (MOM) */}
          <div>
            <label className="block mb-1 font-semibold" style={labelStyle}>Man of the Match (MOM)</label>
            <input
              type="text"
              placeholder="e.g. Virat Sharma (74* off 42 & 2/16)"
              value={mom}
              onChange={(e) => setMom(e.target.value)}
              className={fieldClass}
            />
          </div>

          {/* Scoreboard Document Upload */}
          <div className="space-y-1.5">
            <label className="block font-semibold" style={labelStyle}>Upload Scoreboard Document</label>
            <div className={cn("p-3.5 rounded-xl border border-dashed transition-colors", isLight ? "bg-slate-50 border-slate-300 hover:border-emerald-500" : "bg-[#131613] border-[#333] hover:border-emerald-500/50")}>
              {scoreboardUrl ? (
                <div className={cn("flex items-center justify-between gap-2 p-2 rounded-lg border", isLight ? "bg-emerald-50 border-emerald-200" : "bg-[#1a1e1a] border-emerald-500/30")}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className={cn("text-xs truncate font-medium", isLight ? "text-slate-900" : "text-white")}>
                      {scoreboardName || "Scoreboard Document"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    title="Remove document"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer py-2 text-center">
                  <UploadCloud className="w-6 h-6 text-emerald-500 mb-1" />
                  <span className={cn("font-medium", isLight ? "text-slate-800" : "text-white")}>Click or browse to upload Scoreboard</span>
                  <span className={cn("text-[10px] mt-0.5", isLight ? "text-slate-500" : "text-[#6b7a6b]")}>
                    Supports PDF, PNG, JPG, JPEG, WEBP, DOCX (Max 20MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Venue & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Venue</label>
              <input
                type="text"
                placeholder="Ground name or pitch"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold" style={labelStyle}>Match Date & Time</label>
              <input
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={cn("flex items-center gap-3 pt-3 border-t", isLight ? "border-slate-100" : "border-[#1f221f]")}>
            <button
              type="button"
              onClick={onClose}
              className={cn("flex-1 py-2.5 rounded-xl font-semibold transition-colors", isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8]")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                isLight ? "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm" : "bg-emerald-500 hover:bg-emerald-400 text-black"
              )}
            >
              {saving ? "Saving..." : match ? "Update Match" : "Add Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TournamentDetailsModal({
  t,
  onClose,
  isMine,
  isOrganizer,
  roleLabel,
  registered,
  onRegister,
  onUnregister,
  onEdit,
  onDelete,
  token,
  currentUser,
  myTeamId,
  teammates,
  canManageMatches = false,
  onTournamentUpdated,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const canManage = Boolean(token) || canManageMatches || isOrganizer || details?.can_manage || !t.created_by || false;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
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
          if (Array.isArray(data.tournament.matches)) {
            setMatches(data.tournament.matches);
          }
        }
      } catch (err) {
        console.error("Failed to load tournament details:", err);
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t?.id]);

  const handleMatchSaved = (savedMatch) => {
    if (!savedMatch) return;
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === savedMatch.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedMatch;
        return next;
      }
      return [...prev, savedMatch];
    });

    // Notify parent to refresh tournament list counts if available
    onTournamentUpdated?.({
      ...t,
      matches_count: (t.matches_count || 0) + (selectedMatch ? 0 : 1),
      completed_count: (t.completed_count || 0) + (savedMatch.status === "completed" ? 1 : 0),
    });
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm("Are you sure you want to delete this tournament match?")) return;
    try {
      await apiRequest(`/tournaments/${t.id}/matches/${matchId}`, {
        method: "DELETE",
        token,
      });
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      onTournamentUpdated?.({
        ...t,
        matches_count: Math.max((t.matches_count || 1) - 1, 0),
      });
    } catch (err) {
      alert(err.message || "Failed to delete tournament match");
    }
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
          win.document.write(`
            <title>${m.scoreboard_name || "Scoreboard"}</title>
            <body style="margin:0; background:#0b0d0b; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; font-family:sans-serif; color:#eee;">
              <h3 style="margin-bottom:12px; font-size:16px;">${m.team1_name} vs ${m.team2_name} - Scoreboard</h3>
              <img src="${url}" style="max-width:92vw; max-height:85vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.7); border:1px solid #333;" alt="Scoreboard"/>
            </body>
          `);
        }
      } else {
        handleDownloadScoreboard(m);
      }
    } else {
      window.open(url, "_blank");
    }
  };

  const handleDownloadScoreboard = (m) => {
    if (!m.scoreboard_url) return;
    const a = document.createElement("a");
    a.href = m.scoreboard_url;
    a.download = m.scoreboard_name || `${m.team1_name}_vs_${m.team2_name}_scoreboard`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const confirmedTeams = details?.teams || [];
  const maxTeams = t.max_teams ?? 0;
  const teamCount = details?.team_count ?? (t.team_count ?? 0);
  const spotsLeft = Math.max(maxTeams - teamCount, 0);
  const full = spotsLeft === 0;
  const canRegister = t.status === "registering" && !full && !registered && !isMine;
  const meta = statusMeta(t.status);

  const dotColor = {
    green: "#22c55e",
    amber: "#f59e0b",
    blue: "#3b82f6",
    red: "#ef4444",
  }[meta.color];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
        style={isLight ? {
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        } : {
          backgroundColor: "#0d0f0d",
          border: "1px solid #2a2a2a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 px-6 pt-5 pb-4 flex items-start justify-between gap-3"
          style={isLight ? { backgroundColor: "#ffffff", borderBottom: "1px solid #f1f5f9" } : { backgroundColor: "#0d0f0d", borderBottom: "1px solid #1c1f1c" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${dotColor}1a`, color: dotColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                {meta.label}
              </span>
              {t.format && <Tag color="blue">{t.format} Format</Tag>}
              {isMine && <Tag color="green">{roleLabel}</Tag>}
            </div>
            <h2 className={cn("text-xl font-bold leading-snug truncate", isLight ? "text-slate-900" : "text-white")}>{t.name}</h2>
            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
              <Trophy className="w-3 h-3" /> {t.creator_team_name || "Unknown organizer"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: isLight ? "#64748b" : "#6b7a6b" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? "#f1f5f9" : "#1c1f1c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl p-4"
            style={isLight ? { backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" } : { backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid #1c1f1c" }}
          >
            <DetailRow icon={MapPin} label="Venue" value={t.venue || "TBD"} theme={theme} />
            <DetailRow icon={CalendarDays} label="Starts" value={t.startDate || "TBD"} theme={theme} />
            <DetailRow icon={Users} label="Teams" value={`${teamCount} / ${maxTeams} confirmed`} theme={theme} />
            <DetailRow icon={DollarSign} label="Entry fee" value={formatMoney(t.entry_fee)} theme={theme} />
            <DetailRow icon={Phone} label="Contact" value={t.phone || "-"} theme={theme} />
            <DetailRow icon={Phone} label="Co-contact" value={t.co_phone || "-"} theme={theme} />
          </div>

          {/* Confirmed Teams Button & List */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowTeams(!showTeams)}
              className={cn(
                "w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors border",
                isLight ? "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm" : "bg-[#161816] hover:bg-[#1f221f] text-white border-[#2a2a2a]"
              )}
            >
              <span className="flex items-center gap-2">
                <Users className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
                Confirmed Teams ({teamCount})
              </span>
              <span className={cn("text-[10px] font-bold", isLight ? "text-emerald-700" : "text-green-400")}>
                {showTeams ? "Hide Teams ▲" : "View Teams ▼"}
              </span>
            </button>

            {showTeams && (
              <div className={cn("rounded-xl p-3 border space-y-2 max-h-48 overflow-y-auto", isLight ? "border-slate-200 bg-slate-50/60" : "border-[#2a2a2a] bg-[#111311]")}>
                {loadingDetails ? (
                  <div className="text-xs text-center py-3" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                    Loading confirmed teams...
                  </div>
                ) : confirmedTeams.length === 0 ? (
                  <div className="text-xs text-center py-3" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                    No teams confirmed yet
                  </div>
                ) : (
                  confirmedTeams.map((team, idx) => (
                    <div
                      key={team.id || idx}
                      className={cn("flex items-center justify-between py-2 px-3 rounded-lg border", isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#161816] border-[#1e201e]")}
                    >
                      <span className={cn("text-xs font-bold flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
                        <span className="text-[10px] font-mono w-4" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{idx + 1}.</span>
                        {team.name}
                      </span>
                      <Tag color="green">Confirmed</Tag>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Tournament Match Details Button & Accordion */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowMatches(!showMatches)}
              className={cn(
                "w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors border",
                isLight ? "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm" : "bg-[#161816] hover:bg-[#1f221f] text-white border-[#2a2a2a]"
              )}
            >
              <span className="flex items-center gap-2">
                <Swords className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-emerald-400")} />
                Tournament Match Details ({matches.length})
              </span>
              <span className={cn("text-[10px] font-bold", isLight ? "text-emerald-700" : "text-emerald-400")}>
                {showMatches ? "Hide Match Details ▲" : "View Match Details ▼"}
              </span>
            </button>

            {showMatches && (
              <div className={cn("rounded-xl p-3.5 border space-y-3 max-h-96 overflow-y-auto", isLight ? "border-slate-200 bg-slate-50/60" : "border-[#2a2a2a] bg-[#111311]")}>
                {/* Match Summary Badges */}
                <div className="grid grid-cols-3 gap-2">
                  <div className={cn("flex flex-col items-center justify-center p-2.5 rounded-lg border", isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#161816] border-[#252825]")}>
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-slate-500" : "text-[#6b7a6b]")}>Total Matches</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-slate-900" : "text-white")}>{matches.length}</span>
                  </div>
                  <div className={cn("flex flex-col items-center justify-center p-2.5 rounded-lg border", isLight ? "bg-emerald-50 border-emerald-200 shadow-xs" : "bg-[#142314] border-green-500/30")}>
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-emerald-700" : "text-green-400")}>Completed</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-emerald-700" : "text-green-400")}>
                      {matches.filter((m) => m.status && m.status.toLowerCase() === "completed").length}
                    </span>
                  </div>
                  <div className={cn("flex flex-col items-center justify-center p-2.5 rounded-lg border", isLight ? "bg-amber-50 border-amber-200 shadow-xs" : "bg-[#241f12] border-amber-500/30")}>
                    <span className={cn("text-[10px] uppercase font-bold", isLight ? "text-amber-800" : "text-amber-400")}>Scheduled / Live</span>
                    <span className={cn("text-base font-extrabold", isLight ? "text-amber-800" : "text-amber-400")}>
                      {matches.filter((m) => !m.status || m.status.toLowerCase() !== "completed").length}
                    </span>
                  </div>
                </div>

                {/* Add Match & Scorecard Upload Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!token) {
                      alert("Please log in to record tournament matches and upload scorecards.");
                      return;
                    }
                    setSelectedMatch(null);
                    setShowMatchModal(true);
                  }}
                  className={cn(
                    "w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                    isLight
                      ? "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm"
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 shadow-lg shadow-emerald-950/40"
                  )}
                >
                  <Plus className="w-4 h-4" /> Add Match, Scorecard & Results
                </button>

                {/* Matches List */}
                {matches.length === 0 ? (
                  <div className={cn("text-xs text-center py-6 px-4 rounded-xl border border-dashed space-y-2.5", isLight ? "bg-white border-slate-300 text-slate-600 shadow-xs" : "border-[#262a26] bg-[#0e100e] text-[#809080]")}>
                    <Swords className={cn("w-6 h-6 mx-auto", isLight ? "text-emerald-600" : "text-emerald-500/50")} />
                    <div>
                      <p className={cn("font-bold text-sm", isLight ? "text-slate-900" : "text-white")}>No matches recorded for this tournament yet.</p>
                      <p className={cn("text-[11px] mt-0.5", isLight ? "text-slate-500" : "text-[#6b7a6b]")}>
                        Record Team 1 vs Team 2, upload match scorecards (PDF/Image), set Man of the Match, and record winners!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!token) {
                          alert("Please log in to record tournament matches and upload scorecards.");
                          return;
                        }
                        setSelectedMatch(null);
                        setShowMatchModal(true);
                      }}
                      className={cn(
                        "mt-1 px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5",
                        isLight ? "bg-[#16a34a] text-white hover:bg-[#15803d] shadow-sm" : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Match & Scorecard
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {matches.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className={cn("p-3.5 rounded-xl border space-y-2.5 transition-colors", isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#161816] border-[#222522]")}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={cn("font-bold flex items-center gap-1.5", isLight ? "text-emerald-700" : "text-emerald-400")}>
                            <span className={isLight ? "text-slate-400 font-mono" : "text-[#6b7a6b] font-mono"}>#{idx + 1}</span>
                            {m.round || "Match"}
                          </span>
                          <Tag
                            color={
                              m.status === "completed"
                                ? "green"
                                : m.status === "live"
                                ? "amber"
                                : "blue"
                            }
                          >
                            {m.status ? m.status.toUpperCase() : "SCHEDULED"}
                          </Tag>
                        </div>

                        <div className={cn("flex items-center justify-between text-xs font-bold px-1", isLight ? "text-slate-900" : "text-white")}>
                          <span className="truncate max-w-[42%]">{m.team1_name || "Team 1"}</span>
                          <span className={cn("text-[10px] font-normal", isLight ? "text-slate-400" : "text-[#6b7a6b]")}>VS</span>
                          <span className="truncate max-w-[42%] text-right">{m.team2_name || "Team 2"}</span>
                        </div>

                        {m.result && (
                          <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border", isLight ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "text-emerald-300 bg-emerald-500/10 border-emerald-500/20")}>
                            <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{m.result}</span>
                          </div>
                        )}

                        {m.mom && (
                          <div className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border", isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "text-amber-300 bg-amber-500/10 border-amber-500/20")}>
                            <Award className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate font-medium">
                              MOM: <span className={cn("font-bold", isLight ? "text-amber-950" : "text-white")}>{m.mom}</span>
                            </span>
                          </div>
                        )}

                        {m.scoreboard_url && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleViewScoreboard(m)}
                              className={cn(
                                "flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-colors truncate",
                                isLight ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 shadow-xs" : "bg-[#202520] hover:bg-[#283028] text-emerald-400 border-emerald-500/25"
                              )}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Scoreboard ({m.scoreboard_name || "Document"})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadScoreboard(m)}
                              title="Download Scoreboard"
                              className={cn(
                                "p-1.5 rounded-lg text-[11px] border transition-colors shrink-0",
                                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-xs" : "bg-[#202520] hover:bg-[#283028] text-[#c8ccc8] border-[#333]"
                              )}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {canManage && (
                          <div className={cn("flex items-center justify-end gap-1.5 pt-2 border-t", isLight ? "border-slate-100" : "border-[#1f221f]")}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMatch(m);
                                setShowMatchModal(true);
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-colors",
                                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-[#222] hover:bg-[#2e2e2e] text-white border-[#333]"
                              )}
                            >
                              <Pencil className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMatch(m.id)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-colors",
                                isLight ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200" : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                              )}
                            >
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
                <Award className="w-4 h-4 text-amber-500" /> Prizes
              </div>
              <PrizesSummary prizes={t.prizes} theme={theme} />
            </div>
          )}

          {t.description && (
            <div className="space-y-2">
              <div className={cn("text-sm font-bold flex items-center gap-1.5", isLight ? "text-slate-900" : "text-white")}>
                <Info className="w-4 h-4 text-emerald-600 dark:text-[#6b7a6b]" /> Description
              </div>
              <p className={cn("text-sm leading-relaxed", isLight ? "text-slate-600" : "text-[#c8ccc8]")}>
                {t.description}
              </p>
            </div>
          )}
        </div>

        <div
          className={cn("sticky bottom-0 px-6 py-4 flex gap-3", isLight ? "bg-white border-t border-slate-100" : "bg-[#0d0f0d] border-t border-[#1c1f1c]")}
        >
          <GhostButton onClick={onClose} className="flex-1 text-center">
            Close
          </GhostButton>

          {(roleLabel === "Organizing" || isOrganizer) && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit?.(t);
                }}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors border",
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-xs" : "bg-[#1c1f1c] hover:bg-[#252825] text-white border-[#2a2a2a]"
                )}
              >
                <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Edit
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to delete this tournament?")) return;
                  try {
                    await apiRequest(`/tournaments/${t.id}`, { method: "DELETE", token });
                    onDelete?.(t.id);
                    onClose();
                  } catch (err) {
                    alert(err.message || "Failed to delete tournament");
                  }
                }}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors border",
                  isLight ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 shadow-xs" : "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                )}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}

          {isMine ? (
            <span
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border",
                isLight ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs" : "text-green-400 bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.2)]"
              )}
            >
              <CheckCircle className="w-3.5 h-3.5" /> {roleLabel}
            </span>
          ) : registered ? (
            <div className="flex-1 flex gap-1.5">
              <span
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border",
                  isLight ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs" : "text-green-400 bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.2)]"
                )}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Registered
              </span>
              {onUnregister && (
                <button
                  type="button"
                  onClick={() => {
                    onUnregister(t.id);
                    onClose();
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold transition-colors border",
                    isLight ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200" : "text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                  )}
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to register your team for "${t.name}"?`)) {
                  onRegister(t.id);
                  onClose();
                }
              }}
              disabled={!canRegister}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50",
                isLight
                  ? "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm"
                  : "text-green-400 hover:opacity-80 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]"
              )}
            >
              {full ? "Full" : t.status !== "registering" ? meta.label : "Register"}
            </button>
          )}
        </div>
      </div>

      <TournamentMatchModal
        isOpen={showMatchModal}
        onClose={() => {
          setShowMatchModal(false);
          setSelectedMatch(null);
        }}
        tournament={t}
        match={selectedMatch}
        confirmedTeams={confirmedTeams}
        token={token}
        onSaved={handleMatchSaved}
        theme={theme}
      />
    </div>
  );
}

function TournamentCard({ t, isMine, isOrganizer, roleLabel, registered, onRegister, onUnregister, onView, onEdit, onDelete, token, theme = "dark" }) {
  const isLight = theme === "light";
  const spotsLeft = t.spots_left ?? Math.max((t.max_teams || 0) - (t.team_count || 0), 0);
  const full = spotsLeft === 0;
  const canRegister = t.status === "registering" && !full && !registered && !isMine;

  return (
    <div
      className={cn(
        C,
        "rounded-2xl p-4.5 transition-all duration-200",
        isLight
          ? "hover:border-slate-300 hover:shadow-md"
          : "hover:border-[#3a3a3a]"
      )}
      style={
        isLight
          ? (isMine
              ? {
                  border: "1.5px solid #a7f3d0",
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
                  boxShadow: "0 4px 12px -2px rgba(22, 163, 74, 0.08)"
                }
              : {
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.05)"
                }
            )
          : (isMine
              ? {
                  border: "1px solid rgba(34,197,94,0.35)",
                  background: "linear-gradient(135deg, rgba(22,101,52,0.12), rgba(13,15,13,0.4))",
                }
              : undefined
            )
      }
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-base font-bold truncate", isLight ? "text-slate-900" : "text-white")}>{t.name}</span>
            {isMine && <Tag color="green">{roleLabel}</Tag>}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1.5 font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> {t.creator_team_name || "Unknown organizer"}
          </div>
        </div>
        <Tag color={statusMeta(t.status).color}>{statusMeta(t.status).label}</Tag>
      </div>

      <div className="flex items-center gap-3 text-xs mb-3.5 font-medium" style={{ color: isLight ? "#475569" : "#c8ccc8" }}>
        <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {t.startDate || "TBA"}</span>
        <span style={{ color: isLight ? "#cbd5e1" : "#3a3a3a" }}>·</span>
        <span className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> {t.venue || "TBD"}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3.5">
        {t.format && <Tag color="blue">{t.format} Format</Tag>}
        <TeamsRemainingBadge spotsLeft={spotsLeft} maxTeams={t.max_teams} />
        {t.matches_count !== undefined && t.matches_count > 0 && (
          <Tag color="green">
            🏏 {t.matches_count} match{t.matches_count === 1 ? "" : "es"} ({t.completed_count || 0} completed)
          </Tag>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {isMine ? (
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-[200px]">
            <span
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 min-w-[120px] border",
                isLight
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                  : "text-green-400 bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.2)]"
              )}
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {roleLabel}
            </span>
            {(roleLabel === "Organizing" || isOrganizer) && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit?.(t)}
                  title="Edit Tournament"
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border",
                    isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-xs"
                      : "text-white bg-green-500/10 border-green-500/20 hover:bg-green-500/20"
                  )}
                >
                  <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Are you sure you want to delete this tournament?")) return;
                    try {
                      await apiRequest(`/tournaments/${t.id}`, { method: "DELETE", token });
                      onDelete?.(t.id);
                    } catch (err) {
                      alert(err.message || "Could not delete tournament");
                    }
                  }}
                  title="Delete Tournament"
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border",
                    isLight
                      ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 shadow-xs"
                      : "text-red-400 hover:text-red-300 bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
          </div>
        ) : registered ? (
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-[200px]">
            <span
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 min-w-[120px] border",
                isLight
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                  : "text-green-400 bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.2)]"
              )}
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Registered
            </span>
            {onUnregister && (
              <button
                type="button"
                onClick={() => onUnregister(t.id)}
                title="Cancel Registration"
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold transition-colors border",
                  isLight
                    ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 shadow-xs"
                    : "text-red-400 hover:text-red-300 bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                )}
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to register your team for "${t.name}"?`)) {
                onRegister(t.id);
              }
            }}
            disabled={!canRegister}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50",
              isLight
                ? "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm"
                : "text-green-400 hover:opacity-80 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]"
            )}
          >
            {full ? "Full" : t.status !== "registering" ? statusMeta(t.status).label : "Register"}
          </button>
        )}
        <GhostButton
          onClick={onView}
          className={cn("flex-1 text-center font-bold", isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200" : "")}
        >
          View Tournament
        </GhostButton>
      </div>
    </div>
  );
}

export default function TournamentsTab({
  registeredIds = [],
  onRegister,
  onUnregister,
  tournaments,
  token,
  currentUser,
  myTeamId,
  teammates,
  onTournamentCreated,
  onTournamentUpdated,
  onTournamentDeleted,
  autoOpenCreate = false,
  onAutoOpenHandled,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [viewingId, setViewingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  useEffect(() => {
    if (autoOpenCreate) {
      setShowCreateForm(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenCreate, onAutoOpenHandled]);

  const allTournaments = tournaments || [];

  // Gather all squad member IDs (current user + teammates)
  const squadMemberIds = new Set(
    [currentUser?.id, ...(teammates?.ids || [])]
      .filter(Boolean)
      .map(id => String(id))
  );

  // Single check used everywhere: organizer = user who directly created the tournament (`created_by === currentUser.id`).
  const organizerCheck = (t) => isOrganizerOf(t, { currentUser });
  // Check if tournament was published by any member of our squad
  const isSquadPublished = (t) => t.created_by && squadMemberIds.has(String(t.created_by));
  const isMine = (t) => organizerCheck(t) || registeredIds.includes(t.id) || isSquadPublished(t);

  const myTournaments = allTournaments.filter(isMine);
  // All Tournaments section should only show tournaments published by other teams (not our squad) and not already mine
  const otherTournaments = allTournaments.filter((t) => !isMine(t));
  const viewingTournament = allTournaments.find((t) => t.id === viewingId) || null;

  const handleCreated = (tournament) => {
    setShowCreateForm(false);
    onTournamentCreated?.(tournament);
  };

  return (
    <div className="space-y-8">
      {/* Top Header with Title and Create Tournament Button */}
      <div className={cn("flex items-center justify-between flex-wrap gap-3 pb-3 border-b", isLight ? "border-slate-200" : "border-[#2a2a2a]")}>
        <div>
          <h2 className={cn("text-2xl font-bold tracking-tight", isLight ? "text-slate-900" : "text-white")}>Tournaments</h2>
          <p className="text-sm mt-0.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Organize or register for local cricket tournaments</p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className={cn(
            "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0",
            isLight
              ? "bg-[#16a34a] text-white hover:bg-[#15803d] shadow-sm"
              : "bg-green-500 text-black hover:bg-green-400"
          )}
        >
          <Plus className="w-4 h-4" /> Create Tournament
        </button>
      </div>

      {/* Your Tournaments Section */}
      {myTournaments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn("text-base font-bold", isLight ? "text-slate-900" : "text-white")}>Your Tournaments</h3>
            <span className="text-xs font-semibold" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
              {myTournaments.length} active
            </span>
          </div>
          <div className="space-y-3">
            {myTournaments.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                isMine
                isOrganizer={organizerCheck(t)}
                roleLabel={organizerCheck(t) ? "Organizing" : (registeredIds.includes(t.id) ? "Registered" : "Squad Tournament")}
                registered={registeredIds.includes(t.id)}
                onRegister={onRegister}
                onUnregister={onUnregister}
                onView={() => setViewingId(t.id)}
                onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)}
                token={token}
                theme={theme}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Tournaments Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn("text-base font-bold", isLight ? "text-slate-900" : "text-white")}>All Tournaments</h3>
          <span className="text-xs font-semibold" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            {otherTournaments.length} available
          </span>
        </div>
        {otherTournaments.length === 0 ? (
          <div className={cn(C, "rounded-2xl p-6 text-center text-sm border", isLight ? "bg-white border-slate-200 text-slate-500 shadow-xs" : "")} style={{ color: isLight ? undefined : "#4a5a4a" }}>
            No other tournaments available right now.
          </div>
        ) : (
          <div className="space-y-3">
            {otherTournaments.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                isMine={false}
                isOrganizer={organizerCheck(t)}
                roleLabel={organizerCheck(t) ? "Organizing" : undefined}
                registered={registeredIds.includes(t.id)}
                onRegister={onRegister}
                onUnregister={onUnregister}
                onView={() => setViewingId(t.id)}
                onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)}
                token={token}
                theme={theme}
              />
            ))}
          </div>
        )}
      </section>

      {viewingTournament && (
        <TournamentDetailsModal
          t={viewingTournament}
          onClose={() => setViewingId(null)}
          isMine={isMine(viewingTournament)}
          isOrganizer={organizerCheck(viewingTournament)}
          roleLabel={organizerCheck(viewingTournament) ? "Organizing" : (registeredIds.includes(viewingTournament.id) ? "Registered" : "Squad Tournament")}
          registered={registeredIds.includes(viewingTournament.id)}
          onRegister={onRegister}
          onUnregister={onUnregister}
          onEdit={(item) => setEditingTournament(item)}
          onDelete={(id) => onTournamentDeleted?.(id)}
          token={token}
          currentUser={currentUser}
          myTeamId={myTeamId}
          teammates={teammates}
          canManageMatches={
            Boolean(token) ||
            organizerCheck(viewingTournament) ||
            isSquadPublished(viewingTournament) ||
            !viewingTournament.created_by ||
            (viewingTournament.creator_team_id &&
              myTeamId &&
              String(viewingTournament.creator_team_id) === String(myTeamId))
          }
          onTournamentUpdated={onTournamentUpdated}
          theme={theme}
        />
      )}

      {showCreateForm && (
        <CreateTournamentForm
          token={token}
          user={currentUser}
          tournaments={allTournaments}
          onClose={() => setShowCreateForm(false)}
          onCreated={handleCreated}
          theme={theme}
        />
      )}

      {editingTournament && (
        <CreateTournamentForm
          token={token}
          user={currentUser}
          tournaments={allTournaments}
          initialTournament={editingTournament}
          onClose={() => setEditingTournament(null)}
          theme={theme}
          onUpdated={(updated) => {
            onTournamentUpdated?.(updated);
            setEditingTournament(null);
          }}
          onDeleted={(id) => {
            onTournamentDeleted?.(id);
            setEditingTournament(null);
          }}
        />
      )}
    </div>
  );
}