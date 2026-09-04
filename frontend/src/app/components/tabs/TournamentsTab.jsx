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

function PrizesSummary({ prizes }) {
  if (!Array.isArray(prizes) || prizes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {prizes.map((p) => (
        <div
          key={p.position}
          className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
          style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#c8ccc8" }}
        >
          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium text-white">#{p.position}</span>
          <span>{formatMoney(p.money)}</span>
          {p.trophy && <span className="text-amber-400">+ trophy</span>}
        </div>
      ))}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#6b7a6b" }} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide" style={{ color: "#4a5a4a" }}>
          {label}
        </div>
        <div className="text-sm text-white truncate">{value}</div>
      </div>
    </div>
  );
}

function TournamentMatchModal({ isOpen, onClose, tournament, match, confirmedTeams = [], token, onSaved }) {
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
      setMatchDate(new Date().toISOString().slice(0, 16));
      setOversLimit(20);
    }
    setError("");
  }, [isOpen, match, tournament, confirmedTeams]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Document size must be under 20MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setScoreboardUrl(ev.target.result);
      setScoreboardName(file.name);
      setError("");
    };
    reader.onerror = () => {
      setError("Failed to read document");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setScoreboardUrl(null);
    setScoreboardName("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const finalTeam1 = (team1Select === "__custom__" ? team1Name : team1Select || team1Name).trim();
    const finalTeam2 = (team2Select === "__custom__" ? team2Name : team2Select || team2Name).trim();

    if (!finalTeam1 || !finalTeam2) {
      setError("Please specify both Team 1 and Team 2");
      return;
    }
    if (finalTeam1.toLowerCase() === finalTeam2.toLowerCase()) {
      setError("Team 1 and Team 2 cannot be the same team");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        team1_name: finalTeam1,
        team2_name: finalTeam2,
        status,
        result: result.trim() || null,
        mom: mom.trim() || null,
        scoreboard_url: scoreboardUrl,
        scoreboard_name: scoreboardName || null,
        venue: venue.trim() || null,
        round: round.trim() || null,
        match_date: matchDate ? new Date(matchDate).toISOString() : null,
        overs_limit: Number(oversLimit) || 20,
      };

      let res;
      if (match?.id) {
        res = await apiRequest(`/tournaments/${tournament.id}/matches/${match.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
      } else {
        res = await apiRequest(`/tournaments/${tournament.id}/matches`, {
          method: "POST",
          token,
          body: payload,
        });
      }

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
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4"
        style={{
          backgroundColor: "#0d0f0d",
          border: "1px solid #2a2a2a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#1f221f]">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">
              {match ? "Edit Tournament Match" : "Add Tournament Match"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#6b7a6b] hover:text-white hover:bg-[#1c1f1c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Teams Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#a0aba0] mb-1 font-semibold">Team 1 *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={team1Select}
                    onChange={(e) => {
                      setTeam1Select(e.target.value);
                      if (e.target.value !== "__custom__") setTeam1Name(e.target.value);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
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
                      className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
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
                  className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-[#a0aba0] mb-1 font-semibold">Team 2 *</label>
              {confirmedTeams.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={team2Select}
                    onChange={(e) => {
                      setTeam2Select(e.target.value);
                      if (e.target.value !== "__custom__") setTeam2Name(e.target.value);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
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
                      className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
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
                  className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
                  required
                />
              )}
            </div>
          </div>

          {/* Status & Round */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#a0aba0] mb-1 font-semibold">Match Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
              >
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live In-Progress</option>
              </select>
            </div>
            <div>
              <label className="block text-[#a0aba0] mb-1 font-semibold">Round / Stage</label>
              <input
                type="text"
                placeholder="e.g. League, Semi-Final, Final"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Match Result */}
          <div>
            <label className="block text-[#a0aba0] mb-1 font-semibold">Match Result</label>
            <input
              type="text"
              placeholder="e.g. Team 1 won by 24 runs, or Match Tied"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Man of the Match (MOM) */}
          <div>
            <label className="block text-[#a0aba0] mb-1 font-semibold">Man of the Match (MOM)</label>
            <input
              type="text"
              placeholder="e.g. Virat Sharma (74* off 42 & 2/16)"
              value={mom}
              onChange={(e) => setMom(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Scoreboard Document Upload */}
          <div className="space-y-1.5">
            <label className="block text-[#a0aba0] font-semibold">Upload Scoreboard Document</label>
            <div className="p-3.5 rounded-xl bg-[#131613] border border-dashed border-[#333] hover:border-emerald-500/50 transition-colors">
              {scoreboardUrl ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#1a1e1a] border border-emerald-500/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white text-xs truncate font-medium">
                      {scoreboardName || "Scoreboard Document"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 rounded text-[#6b7a6b] hover:text-red-400 transition-colors shrink-0"
                    title="Remove document"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer py-2 text-center">
                  <UploadCloud className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-white font-medium">Click or browse to upload Scoreboard</span>
                  <span className="text-[10px] text-[#6b7a6b] mt-0.5">
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
              <label className="block text-[#a0aba0] mb-1 font-semibold">Venue</label>
              <input
                type="text"
                placeholder="Ground name or pitch"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#a0aba0] mb-1 font-semibold">Match Date & Time</label>
              <input
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#161816] text-white border border-[#2a2a2a] focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#1f221f]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
}) {
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
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
        style={{
          backgroundColor: "#0d0f0d",
          border: "1px solid #2a2a2a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 px-6 pt-5 pb-4 flex items-start justify-between gap-3"
          style={{ backgroundColor: "#0d0f0d", borderBottom: "1px solid #1c1f1c" }}
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
            <h2 className="text-xl font-bold text-white leading-snug truncate">{t.name}</h2>
            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "#6b7a6b" }}>
              <Trophy className="w-3 h-3" /> {t.creator_team_name || "Unknown organizer"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "#6b7a6b" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1c1f1c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid #1c1f1c" }}
          >
            <DetailRow icon={MapPin} label="Venue" value={t.venue || "TBD"} />
            <DetailRow icon={CalendarDays} label="Starts" value={t.startDate || "TBD"} />
            <DetailRow icon={Users} label="Teams" value={`${teamCount} / ${maxTeams} confirmed`} />
            <DetailRow icon={DollarSign} label="Entry fee" value={formatMoney(t.entry_fee)} />
            <DetailRow icon={Phone} label="Contact" value={t.phone || "-"} />
            <DetailRow icon={Phone} label="Co-contact" value={t.co_phone || "-"} />
          </div>

          {/* Confirmed Teams Button & List */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowTeams(!showTeams)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors bg-[#161816] hover:bg-[#1f221f] text-white border border-[#2a2a2a]"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                Confirmed Teams ({teamCount})
              </span>
              <span className="text-[10px] text-green-400 font-medium">
                {showTeams ? "Hide Teams ▲" : "View Teams ▼"}
              </span>
            </button>

            {showTeams && (
              <div className="rounded-xl p-3 border border-[#2a2a2a] bg-[#111311] space-y-2 max-h-48 overflow-y-auto">
                {loadingDetails ? (
                  <div className="text-xs text-center py-3" style={{ color: "#6b7a6b" }}>
                    Loading confirmed teams...
                  </div>
                ) : confirmedTeams.length === 0 ? (
                  <div className="text-xs text-center py-3" style={{ color: "#6b7a6b" }}>
                    No teams confirmed yet
                  </div>
                ) : (
                  confirmedTeams.map((team, idx) => (
                    <div
                      key={team.id || idx}
                      className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#161816] border border-[#1e201e]"
                    >
                      <span className="text-xs font-medium text-white flex items-center gap-2">
                        <span className="text-[10px] font-mono w-4 text-[#6b7a6b]">{idx + 1}.</span>
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
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors bg-[#161816] hover:bg-[#1f221f] text-white border border-[#2a2a2a]"
            >
              <span className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-emerald-400" />
                Tournament Match Details ({matches.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">
                {showMatches ? "Hide Match Details ▲" : "View Match Details ▼"}
              </span>
            </button>

            {showMatches && (
              <div className="rounded-xl p-3 border border-[#2a2a2a] bg-[#111311] space-y-3 max-h-96 overflow-y-auto">
                {/* Match Summary Badges */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#161816] border border-[#252825]">
                    <span className="text-[10px] uppercase font-bold text-[#6b7a6b]">Total Matches</span>
                    <span className="text-base font-extrabold text-white">{matches.length}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#142314] border border-green-500/30">
                    <span className="text-[10px] uppercase font-bold text-green-400">Completed</span>
                    <span className="text-base font-extrabold text-green-400">
                      {matches.filter((m) => m.status && m.status.toLowerCase() === "completed").length}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#241f12] border border-amber-500/30">
                    <span className="text-[10px] uppercase font-bold text-amber-400">Scheduled / Live</span>
                    <span className="text-base font-extrabold text-amber-400">
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
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Plus className="w-4 h-4" /> Add Match, Scorecard & Results
                </button>

                {/* Matches List */}
                {matches.length === 0 ? (
                  <div className="text-xs text-center py-6 px-4 rounded-xl border border-dashed border-[#262a26] bg-[#0e100e] space-y-2.5 text-[#809080]">
                    <Swords className="w-6 h-6 mx-auto text-emerald-500/50" />
                    <div>
                      <p className="font-semibold text-white">No matches recorded for this tournament yet.</p>
                      <p className="text-[11px] text-[#6b7a6b] mt-0.5">
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
                      className="mt-1 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Match & Scorecard
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {matches.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="p-3 rounded-xl bg-[#161816] border border-[#222522] space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                            <span className="text-[#6b7a6b] font-mono">#{idx + 1}</span>
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

                        <div className="flex items-center justify-between text-xs font-bold text-white px-1">
                          <span className="truncate max-w-[42%]">{m.team1_name || "Team 1"}</span>
                          <span className="text-[10px] font-normal text-[#6b7a6b]">VS</span>
                          <span className="truncate max-w-[42%] text-right">{m.team2_name || "Team 2"}</span>
                        </div>

                        {m.result && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{m.result}</span>
                          </div>
                        )}

                        {m.mom && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            <Award className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">
                              MOM: <span className="text-white font-medium">{m.mom}</span>
                            </span>
                          </div>
                        )}

                        {m.scoreboard_url && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleViewScoreboard(m)}
                              className="flex-1 py-1 px-2 rounded-lg text-[11px] font-medium bg-[#202520] hover:bg-[#283028] text-emerald-400 border border-emerald-500/25 flex items-center justify-center gap-1.5 transition-colors truncate"
                            >
                              <FileText className="w-3 h-3 shrink-0" />
                              <span className="truncate">Scoreboard ({m.scoreboard_name || "Document"})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadScoreboard(m)}
                              title="Download Scoreboard"
                              className="p-1 rounded-lg text-[11px] bg-[#202520] hover:bg-[#283028] text-[#c8ccc8] border border-[#333] transition-colors shrink-0"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {canManage && (
                          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-[#1f221f]">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMatch(m);
                                setShowMatchModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#222] hover:bg-[#2e2e2e] text-white border border-[#333] flex items-center gap-1 transition-colors"
                            >
                              <Pencil className="w-3 h-3 text-emerald-400" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMatch(m.id)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-1 transition-colors"
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
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Prizes
              </div>
              <PrizesSummary prizes={t.prizes} />
            </div>
          )}

          {t.description && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" style={{ color: "#6b7a6b" }} /> Description
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#c8ccc8" }}>
                {t.description}
              </p>
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 px-6 py-4 flex gap-3"
          style={{ backgroundColor: "#0d0f0d", borderTop: "1px solid #1c1f1c" }}
        >
          <GhostButton onClick={onClose} className="flex-1 text-center">
            Close
          </GhostButton>

          {/* Fixed: previously gated on `isMine && t.creator_team_name`, which is true
              for anyone merely registered (not just the organizer). Now uses the same
              isOrganizer check as the card, so only the actual organizer sees these. */}
          {(roleLabel === "Organizing" || isOrganizer) && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit?.(t);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors bg-[#1c1f1c] hover:bg-[#252825] text-white border border-[#2a2a2a]"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
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
                className="px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}

          {isMine ? (
            <span className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1.5"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle className="w-3.5 h-3.5" /> {roleLabel}
            </span>
          ) : registered ? (
            <div className="flex-1 flex gap-1.5">
              <span className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle className="w-3.5 h-3.5" /> Registered
              </span>
              {onUnregister && (
                <button
                  type="button"
                  onClick={() => {
                    onUnregister(t.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
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
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors text-green-400 hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
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
      />
    </div>
  );
}

function TournamentCard({ t, isMine, isOrganizer, roleLabel, registered, onRegister, onUnregister, onView, onEdit, onDelete, token }) {
  const spotsLeft = t.spots_left ?? Math.max((t.max_teams || 0) - (t.team_count || 0), 0);
  const full = spotsLeft === 0;
  const canRegister = t.status === "registering" && !full && !registered && !isMine;

  return (
    <div
      className={cn(C, "rounded-2xl p-4 transition-all duration-200 hover:border-[#3a3a3a]")}
      style={
        isMine
          ? {
              border: "1px solid rgba(34,197,94,0.35)",
              background: "linear-gradient(135deg, rgba(22,101,52,0.12), rgba(13,15,13,0.4))",
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">{t.name}</span>
            {isMine && <Tag color="green">{roleLabel}</Tag>}
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#6b7a6b" }}>
            <Trophy className="w-3 h-3" /> {t.creator_team_name || "Unknown organizer"}
          </div>
        </div>
        <Tag color={statusMeta(t.status).color}>{statusMeta(t.status).label}</Tag>
      </div>

      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "#c8ccc8" }}>
        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {t.startDate || "TBA"}</span>
        <span style={{ color: "#3a3a3a" }}>·</span>
        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {t.venue || "TBD"}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
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
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1 min-w-[120px]"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {roleLabel}
            </span>
            {(roleLabel === "Organizing" || isOrganizer) && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit?.(t)}
                  title="Edit Tournament"
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-white bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
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
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
          </div>
        ) : registered ? (
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-[200px]">
            <span
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1 min-w-[120px]"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Registered
            </span>
            {onUnregister && (
              <button
                type="button"
                onClick={() => onUnregister(t.id)}
                title="Cancel Registration"
                className="px-3 py-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
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
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors text-green-400 hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            {full ? "Full" : t.status !== "registering" ? statusMeta(t.status).label : "Register"}
          </button>
        )}
        <GhostButton onClick={onView} className="flex-1 text-center">
          View Tournament
        </GhostButton>
      </div>
    </div>
  );
}

export default function TournamentsTab({ registeredIds = [], onRegister, onUnregister, tournaments, token, currentUser, myTeamId, teammates, onTournamentCreated, onTournamentUpdated, onTournamentDeleted }) {
  const [viewingId, setViewingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

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
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#2a2a2a]">
        <div>
          <h2 className="text-xl font-bold text-white">Tournaments</h2>
          <p className="text-sm mt-0.5" style={{ color: "#6b7a6b" }}>Organize or register for local cricket tournaments</p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="px-5 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Tournament
        </button>
      </div>



      {/* Your Tournaments Section - only shown if user has published/organized or registered for a tournament */}
      {myTournaments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white">Your Tournaments</h3>
            <span className="text-xs" style={{ color: "#6b7a6b" }}>
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
              />
            ))}
          </div>
        </section>
      )}

      {/* All Tournaments Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">All Tournaments</h3>
          <span className="text-xs" style={{ color: "#6b7a6b" }}>
            {otherTournaments.length} available
          </span>
        </div>
        {otherTournaments.length === 0 ? (
          <div className={cn(C, "rounded-2xl p-6 text-center text-sm")} style={{ color: "#4a5a4a" }}>
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
        />
      )}

      {showCreateForm && (
        <CreateTournamentForm
          token={token}
          user={currentUser}
          tournaments={allTournaments}
          onClose={() => setShowCreateForm(false)}
          onCreated={handleCreated}
        />
      )}

      {editingTournament && (
        <CreateTournamentForm
          token={token}
          user={currentUser}
          tournaments={allTournaments}
          initialTournament={editingTournament}
          onClose={() => setEditingTournament(null)}
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