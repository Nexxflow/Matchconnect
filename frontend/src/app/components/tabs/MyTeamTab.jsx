import React, { useState, useEffect } from "react";
import { CalendarCheck, Users, Calendar, Megaphone, MapPin, Swords, Phone, XCircle, Trophy, Star, MessageSquare, RotateCw } from "lucide-react";
import { apiRequest } from "../../api";
import { C, cn, Tag, normalizePhone } from "../../utils/helpers.jsx";
import TeamDetailsModal from "../TeamDetailsModal.jsx";

// ─── Colorful accent bar ─────────────────────────────────────────────────
function ColorBar({ gradient = "from-emerald-400 via-green-500 to-teal-500", className = "" }) {
  return <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", gradient, className)} />;
}

function SquadSection({ members = [], loading, error, currentUserId, effectiveTeam, theme = "dark" }) {
  const isLight = theme === "light";
  if (loading) return (
    <div className="text-sm text-center py-8 flex items-center justify-center gap-2" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>
      <span className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      Loading squad...
    </div>
  );
  if (error) return <div className="text-sm text-center py-8" style={{ color: isLight ? "#dc2626" : "#4a5a4a" }}>{error}</div>;

  if (!effectiveTeam) {
    return (
      <div
        className="rounded-2xl p-8 text-center border border-dashed transition-all relative overflow-hidden"
        style={{
          borderColor: isLight ? "#a7f3d0" : "#2a2a2a",
          backgroundColor: isLight ? "#ffffff" : "#131413",
          background: isLight ? "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)" : "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, #131413 100%)",
          boxShadow: isLight ? "0 2px 8px -2px rgba(22,163,74,0.08)" : undefined,
        }}
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
          <Users className="w-8 h-8 text-white" />
        </div>
        <div className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>No squad yet</div>
        <p className="text-xs mt-1.5 max-w-[26ch] mx-auto font-medium" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
          Add your team name, village and the year formed in Edit Profile — anyone with the same three values is grouped with you automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isLight ? "bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-600" : "bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-400")}>
            <Users className="w-4 h-4" />
          </div>
          <h3 className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>
            Squad Members ({members.length})
          </h3>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden border divide-y transition-all relative"
        style={{
          borderColor: isLight ? "#d1fae5" : "#2a2a2a",
          backgroundColor: isLight ? "#ffffff" : "#161616",
          boxShadow: isLight ? "0 2px 8px -2px rgba(0,0,0,0.05)" : undefined,
        }}
      >
        <ColorBar gradient="from-emerald-400 via-green-500 to-teal-500" />
        {members.length === 0 ? (
          <div className="p-4 text-center text-xs font-medium" style={{ color: isLight ? "#64748b" : "#737373" }}>
            No teammates registered yet with team "{effectiveTeam.team_name}".
          </div>
        ) : (
          members.map((m, idx) => (
            <div
              key={m.id}
              className={cn("flex items-center gap-3 px-4 py-3 transition-colors", isLight ? "hover:bg-emerald-50/40" : "hover:bg-emerald-500/5")}
              style={{
                backgroundColor: isLight ? "#ffffff" : "#161616",
                borderBottom: isLight ? "1px solid #f1f5f9" : undefined,
              }}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm",
                  isLight ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white border border-emerald-300" : "bg-gradient-to-br from-emerald-500 to-teal-500 text-black"
                )}
              >
                {m.name?.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-bold truncate flex items-center gap-1.5", isLight ? "text-slate-900" : "text-white")}>
                  {m.name}
                  {m.id === currentUserId && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-sm">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{m.phone}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MyTeamTab({
  acceptedChallenge,
  registeredTournaments = [],
  tournaments = [],
  myTeam = null,
  bookings,
  onCancelChallenge,
  onUnregisterTournament,
  onDeleteChallenge,
  onCancelBooking,
  cancelling,
  deleting,
  onOpenChat,
  challenges = [],
  teammatePhones = [],
  teammateIds = [],
  user,
  token,
  theme = "dark",
}) {
  const isLight = theme === "light";
  const [activeSection, setActiveSection] = useState("bookings");
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [viewSelfTeam, setViewSelfTeam] = useState(false);
  const [squadLoading, setSquadLoading] = useState(true);
  const [squadError, setSquadError] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel this booking for ${booking.name}?`)) return;
    setCancellingBookingId(booking.id);
    try {
      await apiRequest(`/bookings/${booking.id}`, { method: "DELETE", token });
      onCancelBooking?.(booking);
    } catch (err) {
      alert(err.message || "Failed to cancel booking");
    } finally {
      setCancellingBookingId(null);
    }
  };

  const effectiveTeam = team || (user?.team_name ? {
    team_name: user.team_name,
    village_name: user.village_name || null,
    team_year: user.team_year || null
  } : null);

  const loadTeamStats = async (teamName) => {
    if (!teamName) return;
    try {
      setRefreshingStats(true);
      const details = await apiRequest(`/teams/details?team_name=${encodeURIComponent(teamName)}`, { token });
      setTeamStats(details);
    } catch {
      // non-fatal
    } finally {
      setRefreshingStats(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setSquadLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setSquadLoading(true);
        const data = await apiRequest("/users/teammates", { token });
        if (cancelled) return;
        setTeam(data.team);
        setMembers(data.members || []);
        const targetTeam = data.team?.team_name || user?.team_name;
        if (targetTeam) {
          loadTeamStats(targetTeam);
        }
      } catch (err) {
        if (!cancelled) setSquadError(err.message || "Could not load your squad");
      } finally {
        if (!cancelled) setSquadLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, user?.team_name]);

  useEffect(() => {
    const activeTeamName = effectiveTeam?.team_name;
    if (!activeTeamName) return;

    const onReviewSubmitted = () => {
      loadTeamStats(activeTeamName);
    };
    window.addEventListener("mc:review_submitted", onReviewSubmitted);

    const onFocus = () => {
      loadTeamStats(activeTeamName);
    };
    window.addEventListener("focus", onFocus);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadTeamStats(activeTeamName);
      }
    }, 12000);

    return () => {
      window.removeEventListener("mc:review_submitted", onReviewSubmitted);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [effectiveTeam?.team_name, token]);

  const reviewsCount = teamStats?.reviews_count != null
    ? teamStats.reviews_count
    : (teamStats?.reviews?.length || 0);

  const teamNameKey = effectiveTeam?.team_name
    ? effectiveTeam.team_name.trim().toLowerCase()
    : null;
  const seenStorageKey = teamNameKey ? `mc_seen_reviews_${teamNameKey}` : null;
  const readIdsStorageKey = teamNameKey ? `mc_read_review_ids_${teamNameKey}` : null;

  const [unopenedReviewIds, setUnopenedReviewIds] = useState(new Set());
  const [modalUnreadReviewIds, setModalUnreadReviewIds] = useState(new Set());

  useEffect(() => {
    if (!teamNameKey) {
      setUnopenedReviewIds(new Set());
      return;
    }

    const reviewsList = teamStats?.reviews || [];
    let readIds = new Set();

    try {
      const rawReadIds = localStorage.getItem(readIdsStorageKey);
      if (rawReadIds) {
        const parsed = JSON.parse(rawReadIds);
        if (Array.isArray(parsed)) {
          readIds = new Set(parsed.map(String));
        }
      } else {
        const legacySeen = localStorage.getItem(seenStorageKey);
        if (legacySeen !== null) {
          const count = Number(legacySeen);
          if (count >= reviewsList.length && reviewsList.length > 0) {
            readIds = new Set(reviewsList.map(r => String(r.id)));
            localStorage.setItem(readIdsStorageKey, JSON.stringify(Array.from(readIds)));
          }
        }
      }
    } catch {}

    const unread = new Set();
    reviewsList.forEach(r => {
      const rId = String(r.id);
      if (!readIds.has(rId)) {
        unread.add(rId);
      }
    });

    setUnopenedReviewIds(unread);
  }, [teamStats?.reviews, readIdsStorageKey, seenStorageKey, teamNameKey]);

  const unopenedCount = unopenedReviewIds.size;

  const handleOpenViewTeam = () => {
    setModalUnreadReviewIds(new Set(unopenedReviewIds));

    if (readIdsStorageKey && effectiveTeam?.team_name) {
      const allReviewIds = (teamStats?.reviews || []).map(r => String(r.id));
      try {
        localStorage.setItem(readIdsStorageKey, JSON.stringify(allReviewIds));
        if (seenStorageKey) {
          localStorage.setItem(seenStorageKey, String(reviewsCount || 0));
        }
      } catch {}
      setUnopenedReviewIds(new Set());
    }

    setViewSelfTeam(true);
  };

  const myPhone = normalizePhone(user?.phone);
  const userTeamName = user?.team_name?.trim()?.toLowerCase();
  const myTeamId = myTeam?.id;

  const squadMemberIds = new Set(
    [user?.id, ...(teammateIds || [])]
      .filter(Boolean)
      .map(id => String(id))
  );

  const ourPublishedTournaments = tournaments.filter(t => {
    if (t.created_by && squadMemberIds.has(String(t.created_by))) return true;
    return false;
  });

  const teamPhoneSet = new Set([myPhone, ...teammatePhones].filter(Boolean));
  const teamIdSet = new Set(
    [user?.id, ...teammateIds]
      .filter(id => id !== undefined && id !== null)
      .map(id => Number(id))
  );

  const hasTeamIdentity = teamIdSet.size > 0 || teamPhoneSet.size > 0;

  const isTeamCreator = c => {
    const hasId = c.creator_id !== undefined && c.creator_id !== null;
    const hasPhone = !!c.contact_no;

    if (hasId && hasPhone && teamIdSet.size && teamPhoneSet.size) {
      return teamIdSet.has(Number(c.creator_id)) && teamPhoneSet.has(normalizePhone(c.contact_no));
    }
    if (hasId && teamIdSet.size) {
      return teamIdSet.has(Number(c.creator_id));
    }
    if (hasPhone && teamPhoneSet.size) {
      return teamPhoneSet.has(normalizePhone(c.contact_no));
    }
    return false;
  };

  const isTeamAcceptor = c => {
    const hasId = c.accepted_by_user_id !== undefined && c.accepted_by_user_id !== null;
    const hasPhone = !!c.accepted_by_contact_no;

    if (hasId && teamIdSet.has(Number(c.accepted_by_user_id))) {
      return true;
    }
    if (hasPhone && teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no))) {
      return true;
    }
    return false;
  };

  const postedChallenges = hasTeamIdentity
    ? challenges.filter(c => isTeamCreator(c) && c.status === "open")
    : [];

  const acceptedChallenges = hasTeamIdentity
    ? challenges.filter(c => c.status === "accepted" && (isTeamCreator(c) || isTeamAcceptor(c)))
    : [];

  const acceptedChallengesFinal = acceptedChallenges.length
    ? acceptedChallenges
    : (acceptedChallenge ? [acceptedChallenge] : []);

  const scheduleCount = postedChallenges.length + acceptedChallengesFinal.length + registeredTournaments.length;

  return (
    <div className="space-y-6">
      {/* 1. Team Banner Card ABOVE the Three Tabs */}
      {effectiveTeam && (
        <div
          className={cn("rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all relative overflow-hidden", isLight ? "shadow-sm" : "")}
          style={{
            background: isLight
              ? "linear-gradient(135deg, #ecfdf5 0%, #ffffff 50%, #f0fdfa 100%)"
              : "linear-gradient(135deg, rgba(34, 197, 94, 0.18) 0%, #141714 50%, rgba(20, 184, 166, 0.12) 100%)",
            border: isLight ? "1.5px solid #a7f3d0" : "1px solid rgba(34, 197, 94, 0.4)",
            boxShadow: isLight
              ? "0 10px 25px -5px rgba(22, 163, 74, 0.15), 0 0 0 1px rgba(16,185,129,0.06)"
              : "0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(16,185,129,0.08)"
          }}
        >
          <ColorBar gradient="from-emerald-400 via-green-500 to-teal-500" />
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg relative overflow-hidden"
              style={{
                background: isLight
                  ? "radial-gradient(circle at 30% 25%, #4ade80, #16a34a 55%, #166534 100%)"
                  : "radial-gradient(circle at 30% 25%, #22c55e, #16a34a 55%, #0f5132 100%)",
                border: "1px solid #22c55e",
                boxShadow: "0 6px 18px rgba(34, 197, 94, 0.35)",
              }}
            >
              <span className="absolute top-1 left-1.5 w-3 h-1.5 rounded-full bg-white/40 blur-[2px]" />
              {effectiveTeam.team_name ? effectiveTeam.team_name.split(" ").map(w => w[0]).slice(0, 2).join("") : "TM"}
            </div>

            <div className="min-w-0">
              <div className={cn("text-xl font-black tracking-wide truncate drop-shadow-sm flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
                <span className="bg-gradient-to-r bg-clip-text text-transparent"
                  style={{ backgroundImage: isLight ? "linear-gradient(to right, #065f46, #16a34a)" : "linear-gradient(to right, #ffffff, #a7f3d0)" }}>
                  {effectiveTeam.team_name}
                </span>
                {teamStats?.rating != null && (
                  <span className={cn("flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm",
                    isLight ? "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-300" : "text-amber-300 bg-gradient-to-r from-amber-400/15 to-yellow-400/15 border border-amber-400/25")}>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 drop-shadow" />
                    <span>{Number(teamStats.rating).toFixed(1)}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => effectiveTeam?.team_name && loadTeamStats(effectiveTeam.team_name)}
                  disabled={refreshingStats}
                  className={cn("p-1 rounded-lg transition-colors cursor-pointer", isLight ? "hover:bg-emerald-100 text-emerald-600" : "hover:bg-emerald-500/15 text-emerald-400")}
                  title="Refresh team stats and reviews"
                >
                  <RotateCw className={cn("w-3 h-3", refreshingStats && cn("animate-spin", isLight ? "text-emerald-600" : "text-green-400"))} />
                </button>
              </div>

              <div className={cn("text-xs mt-0.5 font-medium flex items-center gap-2 flex-wrap", isLight ? "text-slate-600" : "text-neutral-300")}>
                {effectiveTeam.village_name && <span>📍 {effectiveTeam.village_name}</span>}
                {effectiveTeam.team_year && <span>· 🗓️ Formed {effectiveTeam.team_year}</span>}
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm bg-gradient-to-r",
                  isLight ? "from-emerald-100 to-green-100 text-emerald-800 border border-emerald-300" : "from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30")}>
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
                <span className={cn("text-[11px] flex items-center gap-1.5 flex-wrap", isLight ? "text-slate-600" : "text-neutral-300")}>
                  <span>· {reviewsCount} feedback review{reviewsCount !== 1 ? "s" : ""}</span>
                  {unopenedCount > 0 ? (
                    <button
                      type="button"
                      onClick={handleOpenViewTeam}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-500 to-red-500 text-white border border-red-400/50 flex items-center gap-1.5 hover:from-rose-600 hover:to-red-600 transition-all cursor-pointer shadow-md shadow-red-500/30"
                      title={`${unopenedCount} unopened review message${unopenedCount !== 1 ? "s" : ""}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                      <MessageSquare className="w-3 h-3 text-white" />
                      <span>Review ({unopenedCount})</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-white/25 text-white animate-pulse">NEW</span>
                    </button>
                  ) : reviewsCount > 0 ? (
                    <button
                      type="button"
                      onClick={handleOpenViewTeam}
                      className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm bg-gradient-to-r",
                        isLight ? "from-emerald-100 to-green-100 text-emerald-800 border border-emerald-300 hover:from-emerald-200 hover:to-green-200" : "from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-green-500/30")}
                      title="View feedback reviews"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Review</span>
                    </button>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenViewTeam}
            className={cn("px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-lg hover:scale-105 active:scale-95 cursor-pointer",
              isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/35"
                      : "bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-emerald-500/35")}
            title="View your team performance, rating & feedback reviews"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Team</span>
            {unopenedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-gradient-to-r from-rose-500 to-red-600 text-white border border-white/30 flex items-center gap-1 shadow-md animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                {unopenedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 2. Self Team Details Modal */}
      {viewSelfTeam && effectiveTeam && (
        <TeamDetailsModal
          teamName={effectiveTeam.team_name}
          user={user}
          token={token}
          unreadReviewIds={modalUnreadReviewIds}
          contactFallback={members.find(m => m.id === user?.id)?.phone || user?.phone}
          postedByFallback={members.find(m => m.id === user?.id)?.name || user?.name}
          theme={theme}
          onClose={() => {
            setViewSelfTeam(false);
            if (effectiveTeam.team_name) {
              loadTeamStats(effectiveTeam.team_name);
            }
          }}
        />
      )}

      {/* 3. The Three Tabs */}
      <div className="flex gap-2">
        {[
          { key: "bookings", label: "My Bookings", icon: CalendarCheck, gradient: "from-sky-400 to-blue-500", glow: "rgba(59,130,246,0.35)" },
          { key: "squad", label: "Squad", icon: Users, gradient: "from-emerald-400 to-green-500", glow: "rgba(34,197,94,0.35)" },
          { key: "schedule", label: "Schedule", icon: Calendar, gradient: "from-violet-400 to-purple-500", glow: "rgba(139,92,246,0.35)" },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeSection === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveSection(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                isActive
                  ? cn("text-white border-transparent bg-gradient-to-r shadow-lg", t.gradient)
                  : isLight
                  ? "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  : "bg-[#151715] text-[#c8ccc8] border-[#2a2a2a] hover:border-[#3a3a3a]"
              )}
              style={isActive ? { boxShadow: `0 4px 14px ${t.glow}` } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeSection === "bookings" && bookings.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isLight ? "bg-gradient-to-br from-sky-100 to-blue-100 text-sky-600" : "bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-400")}>
              <CalendarCheck className="w-4 h-4" />
            </div>
            <h3 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>My Bookings</h3>
          </div>
          <div className="space-y-2">
            {bookings.map(b => (
              <div
                key={b.id}
                className={cn(
                  C,
                  "rounded-xl p-3 flex items-center justify-between gap-3 border transition-all relative overflow-hidden",
                  isLight ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200" : "hover:border-sky-500/30"
                )}
              >
                <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
                  b.type === "ground" ? "from-emerald-400 to-green-500" : "from-amber-400 to-orange-500")} />
                <div className="flex items-center gap-3 min-w-0 pl-1.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: isLight ? "rgba(22,163,74,0.12)" : "rgba(34,197,94,0.12)",
                      border: isLight ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(34,197,94,0.25)"
                    }}
                  >
                    {b.type === "ground" ? (
                      <MapPin className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
                    ) : (
                      <Trophy className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={cn("text-sm font-semibold truncate", isLight ? "text-slate-900" : "text-white")}>{b.name}</div>
                    <div className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{b.date} · {b.time}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className={cn("text-sm font-mono font-bold px-2 py-0.5 rounded-lg",
                    isLight ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-green-400 bg-emerald-500/10 border border-emerald-500/20")}>
                    ₹{b.amount}
                  </div>
                  <button
                    type="button"
                    disabled={cancellingBookingId === b.id}
                    onClick={() => handleCancelBooking(b)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors shadow-sm",
                      isLight
                        ? "bg-gradient-to-r from-red-50 to-rose-50 text-red-600 hover:from-red-100 hover:to-rose-100 border border-red-200"
                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/25"
                    )}
                  >
                    {cancellingBookingId === b.id ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "bookings" && bookings.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center border border-dashed relative overflow-hidden"
          style={{
            borderColor: isLight ? "#bae6fd" : "#2a2a2a",
            background: isLight ? "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)" : "linear-gradient(135deg, rgba(56,189,248,0.06) 0%, #131413 100%)",
          }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/30">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <div className={cn("text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>No bookings yet</div>
          <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
            Book a ground or an umpire and it'll show up here.
          </p>
        </div>
      )}

      {activeSection === "squad" && (
        <SquadSection
          members={members}
          loading={squadLoading}
          error={squadError}
          currentUserId={user?.id}
          effectiveTeam={effectiveTeam}
          theme={theme}
        />
      )}

      {activeSection === "schedule" && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isLight ? "bg-gradient-to-br from-violet-100 to-purple-100 text-violet-600" : "bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-400")}>
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>Schedule</h3>
            </div>
            {scheduleCount > 0 && (
              <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full shadow-sm bg-gradient-to-r",
                isLight ? "from-violet-100 to-purple-100 text-violet-700 border border-violet-200" : "from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-500/30")}>
                {scheduleCount} upcoming
              </span>
            )}
          </div>

          {postedChallenges.length === 0 && acceptedChallengesFinal.length === 0 && registeredTournaments.length === 0 && (
            <div
              className="rounded-2xl p-8 text-center border border-dashed relative overflow-hidden"
              style={{
                borderColor: isLight ? "#ddd6fe" : "#2a2a2a",
                background: isLight ? "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)" : "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, #131413 100%)",
              }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/30">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div className={cn("text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>Nothing on the calendar yet</div>
              <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                Post or accept a challenge in Find Match, or register your team for a tournament, to see it here.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Card 1: Posted Challenges */}
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #bae6fd" : "1px solid rgba(56,189,248,0.3)",
                boxShadow: isLight ? "0 4px 14px -4px rgba(56,189,248,0.15)" : "0 4px 14px rgba(0,0,0,0.25)"
              }}
            >
              <ColorBar gradient="from-sky-400 via-cyan-500 to-blue-500" />
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#e0f2fe" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%)" : "transparent"
                }}
              >
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", isLight ? "bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-sm" : "bg-gradient-to-br from-sky-500/30 to-cyan-500/30 text-sky-300")}>
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wide bg-gradient-to-r bg-clip-text text-transparent",
                  isLight ? "from-sky-700 to-cyan-700" : "from-sky-300 to-cyan-300")}>
                  Posted Challenges
                </h4>
                {postedChallenges.length > 0 && (
                  <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm bg-gradient-to-r",
                    isLight ? "from-sky-400 to-cyan-500 text-white" : "from-sky-500/30 to-cyan-500/30 text-sky-300 border border-sky-500/30")}>
                    {postedChallenges.length}
                  </span>
                )}
              </div>

              {postedChallenges.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No posted challenges yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: isLight ? "#f1f5f9" : "#1e1e1e" }}>
                  {postedChallenges.map(pc => (
                    <div key={pc.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className={cn("text-sm font-semibold truncate", isLight ? "text-slate-900" : "text-white")}>{pc.team_name}</div>
                          <div className="text-xs mt-0.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                            {pc.match_date} · {pc.time_slot}
                          </div>
                        </div>
                        <Tag color="sky">{pc.status === "on_hold" ? "On Hold" : "Awaiting Opponent"}</Tag>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <Tag color="blue">{pc.format}</Tag>
                        <span className="text-xs flex items-center gap-1" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                          <MapPin className="w-3 h-3" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }} />
                          {pc.ground_name || "Ground TBD"}
                        </span>
                      </div>

                      {pc.note && (
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: isLight ? "#475569" : "#8fa08f" }}>{pc.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 2: Accepted Challenges */}
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #fcd34d" : "1px solid rgba(245,158,11,0.35)",
                boxShadow: isLight ? "0 4px 14px -4px rgba(245,158,11,0.15)" : "0 4px 14px rgba(0,0,0,0.25)"
              }}
            >
              <ColorBar gradient="from-amber-400 via-orange-500 to-rose-500" />
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#fef3c7" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "linear-gradient(90deg, #fffbeb 0%, #ffffff 100%)" : "transparent"
                }}
              >
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", isLight ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm" : "bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-amber-300")}>
                  <Swords className="w-3.5 h-3.5" />
                </div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wide bg-gradient-to-r bg-clip-text text-transparent",
                  isLight ? "from-amber-700 to-orange-700" : "from-amber-300 to-orange-300")}>
                  Accepted Challenges
                </h4>
                {acceptedChallengesFinal.length > 0 && (
                  <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm bg-gradient-to-r",
                    isLight ? "from-amber-400 to-orange-500 text-white" : "from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/30")}>
                    {acceptedChallengesFinal.length}
                  </span>
                )}
              </div>

              {acceptedChallengesFinal.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No accepted challenges yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: isLight ? "#f1f5f9" : "#1e1e1e" }}>
                  {acceptedChallengesFinal.map(ac => {
                    const iAmCreator = isTeamCreator(ac);
                    const opponentName = iAmCreator ? ac.accepted_by_team_name : ac.team_name;
                    return (
                      <div key={ac.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className={cn("text-sm font-semibold truncate", isLight ? "text-slate-900" : "text-white")}>vs {opponentName}</div>
                            <div className="text-xs mt-0.5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                              {ac.match_date} · {ac.time_slot}
                            </div>
                          </div>
                          <Tag color="amber">Confirmed</Tag>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Tag color="blue">{ac.format}</Tag>
                          <span className="text-xs flex items-center gap-1" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                            <MapPin className="w-3 h-3" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }} />
                            {ac.ground_name || "Ground TBD"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          <a
                            href={`tel:${ac.contact_no}`}
                            className={cn("rounded-xl p-2.5 flex items-center gap-2 transition-colors border",
                              isLight ? "bg-gradient-to-r from-emerald-50/70 to-green-50/70 border-emerald-200 hover:from-emerald-100 hover:to-green-100" : "bg-gradient-to-r from-emerald-500/8 to-green-500/8 border-emerald-500/20 hover:from-emerald-500/15 hover:to-green-500/15")}
                          >
                            <Phone className={cn("w-3.5 h-3.5 shrink-0", isLight ? "text-emerald-600" : "text-green-400")} />
                            <div className="min-w-0">
                              <div className="text-xs truncate" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{ac.team_name}</div>
                              <div className={cn("text-xs font-mono", isLight ? "text-slate-900 font-bold" : "text-white")}>{ac.contact_no}</div>
                            </div>
                          </a>
                          <a
                            href={`tel:${ac.accepted_by_contact_no}`}
                            className={cn("rounded-xl p-2.5 flex items-center gap-2 transition-colors border",
                              isLight ? "bg-gradient-to-r from-sky-50/70 to-blue-50/70 border-sky-200 hover:from-sky-100 hover:to-blue-100" : "bg-gradient-to-r from-sky-500/8 to-blue-500/8 border-sky-500/20 hover:from-sky-500/15 hover:to-blue-500/15")}
                          >
                            <Phone className={cn("w-3.5 h-3.5 shrink-0", isLight ? "text-sky-600" : "text-sky-400")} />
                            <div className="min-w-0">
                              <div className="text-xs truncate" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{ac.accepted_by_team_name}</div>
                              <div className={cn("text-xs font-mono", isLight ? "text-slate-900 font-bold" : "text-white")}>{ac.accepted_by_contact_no}</div>
                            </div>
                          </a>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenChat(ac)}
                            className={cn(
                              "flex-1 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center shadow-lg cursor-pointer",
                              isLight ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/30" : "bg-gradient-to-r from-emerald-400 to-teal-500 text-black hover:from-emerald-300 hover:to-teal-400 shadow-emerald-500/30"
                            )}
                          >
                            💬 Chat
                          </button>
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={() => onCancelChallenge(ac.id)}
                            className={cn(
                              "flex-1 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer shadow-sm border",
                              isLight ? "bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 border-red-200" : "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
                            )}
                            style={cancelling ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                          >
                            <XCircle className="w-3.5 h-3.5" /> {cancelling ? "Cancelling..." : "Cancel Match"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Card 3: Our Team Published Tournaments */}
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #a7f3d0" : "1px solid rgba(34,197,94,0.35)",
                boxShadow: isLight ? "0 4px 14px -4px rgba(34,197,94,0.15)" : "0 4px 14px rgba(0,0,0,0.25)"
              }}
            >
              <ColorBar gradient="from-emerald-400 via-green-500 to-teal-500" />
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#d1fae5" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%)" : "transparent"
                }}
              >
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", isLight ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm" : "bg-gradient-to-br from-emerald-500/30 to-green-500/30 text-emerald-300")}>
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wide bg-gradient-to-r bg-clip-text text-transparent",
                  isLight ? "from-emerald-700 to-green-700" : "from-emerald-300 to-green-300")}>
                  Our Team Published Tournaments
                </h4>
                {ourPublishedTournaments.length > 0 && (
                  <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm bg-gradient-to-r",
                    isLight ? "from-emerald-400 to-green-500 text-white" : "from-emerald-500/30 to-green-500/30 text-emerald-300 border border-emerald-500/30")}>
                    {ourPublishedTournaments.length}
                  </span>
                )}
              </div>

              {ourPublishedTournaments.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No active tournament published by your team yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: isLight ? "#f1f5f9" : "#1e1e1e" }}>
                  {ourPublishedTournaments.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{
                            backgroundColor: isLight ? "rgba(22,163,74,0.12)" : "rgba(34,197,94,0.12)",
                            border: isLight ? "1px solid rgba(22,163,74,0.3)" : "1px solid rgba(34,197,94,0.3)"
                          }}
                        >
                          <Trophy className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
                        </div>
                        <div className="min-w-0">
                          <div className={cn("text-sm font-semibold truncate", isLight ? "text-slate-900" : "text-white")}>{t.name}</div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                            Starts {t.startDate || "TBA"} · {t.format} · 📍 {t.venue || "TBD"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-gradient-to-r from-emerald-400 to-green-500 shrink-0">
                        Organizing
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 4: Registered Tournaments */}
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #bfdbfe" : "1px solid rgba(59,130,246,0.35)",
                boxShadow: isLight ? "0 4px 14px -4px rgba(59,130,246,0.15)" : "0 4px 14px rgba(0,0,0,0.25)"
              }}
            >
              <ColorBar gradient="from-sky-400 via-blue-500 to-indigo-500" />
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#dbeafe" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "linear-gradient(90deg, #eff6ff 0%, #ffffff 100%)" : "transparent"
                }}
              >
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", isLight ? "bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-sm" : "bg-gradient-to-br from-sky-500/30 to-blue-500/30 text-sky-300")}>
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wide bg-gradient-to-r bg-clip-text text-transparent",
                  isLight ? "from-sky-700 to-blue-700" : "from-sky-300 to-blue-300")}>
                  Registered Tournaments
                </h4>
                {registeredTournaments.length > 0 && (
                  <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm bg-gradient-to-r",
                    isLight ? "from-sky-400 to-blue-500 text-white" : "from-sky-500/30 to-blue-500/30 text-sky-300 border border-sky-500/30")}>
                    {registeredTournaments.length}
                  </span>
                )}
              </div>

              {registeredTournaments.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>No tournament registrations yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: isLight ? "#f1f5f9" : "#1e1e1e" }}>
                  {registeredTournaments.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{
                            backgroundColor: isLight ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.12)",
                            border: isLight ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(59,130,246,0.3)"
                          }}
                        >
                          <Trophy className={cn("w-4 h-4", isLight ? "text-blue-600" : "text-blue-400")} />
                        </div>
                        <div className="min-w-0">
                          <div className={cn("text-sm font-semibold truncate", isLight ? "text-slate-900" : "text-white")}>{t.name}</div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                            Starts {t.startDate || "TBA"} · {t.format} · 📍 {t.venue || "TBD"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm bg-gradient-to-r from-sky-400 to-blue-500">
                          Registered
                        </span>
                        {onUnregisterTournament && (
                          <button
                            type="button"
                            onClick={() => onUnregisterTournament(t.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm border",
                              isLight ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-600 hover:from-red-100 hover:to-rose-100" : "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
                            )}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}