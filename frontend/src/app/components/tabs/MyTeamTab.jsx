import React, { useState, useEffect } from "react";
import { CalendarCheck, Users, Calendar, Megaphone, MapPin, Swords, Phone, XCircle, Trophy, Star, MessageSquare, RotateCw } from "lucide-react";
import { apiRequest } from "../../api";
import { C, cn, Tag, normalizePhone } from "../../utils/helpers.jsx";
import TeamDetailsModal from "../TeamDetailsModal.jsx";

function SquadSection({ members = [], loading, error, currentUserId, effectiveTeam, theme = "dark" }) {
  const isLight = theme === "light";
  if (loading) return <div className="text-sm text-center py-8" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>Loading squad...</div>;
  if (error) return <div className="text-sm text-center py-8" style={{ color: isLight ? "#dc2626" : "#4a5a4a" }}>{error}</div>;

  if (!effectiveTeam) {
    return (
      <div
        className="rounded-2xl p-8 text-center border border-dashed transition-all"
        style={{
          borderColor: isLight ? "#cbd5e1" : "#2a2a2a",
          backgroundColor: isLight ? "#ffffff" : "#131413",
          boxShadow: isLight ? "0 2px 8px -2px rgba(0,0,0,0.05)" : undefined,
        }}
      >
        <div className="text-4xl mb-3 opacity-60">🧑‍🤝‍🧑</div>
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
          <Users className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
          <h3 className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>
            Squad Members ({members.length})
          </h3>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden border divide-y transition-all"
        style={{
          borderColor: isLight ? "#e2e8f0" : "#2a2a2a",
          backgroundColor: isLight ? "#ffffff" : "#161616",
          boxShadow: isLight ? "0 2px 8px -2px rgba(0,0,0,0.05)" : undefined,
        }}
      >
        {members.length === 0 ? (
          <div className="p-4 text-center text-xs font-medium" style={{ color: isLight ? "#64748b" : "#737373" }}>
            No teammates registered yet with team "{effectiveTeam.team_name}".
          </div>
        ) : (
          members.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#161616",
                borderBottom: isLight ? "1px solid #f1f5f9" : undefined,
              }}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isLight ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-green-500/15 text-green-400"
                )}
              >
                {m.name?.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-bold truncate flex items-center gap-1.5", isLight ? "text-slate-900" : "text-white")}>
                  {m.name}
                  {m.id === currentUserId && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={isLight
                        ? { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }
                        : { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }
                      }
                    >
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

    // Auto-sync team reviews live every 12s so new reviews appear automatically
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

  // Track unopen / unread messages only (never the total posted count)
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
        // Legacy fallback: if user previously saw reviews via legacy seen count
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
    // Preserve current unread IDs for the modal so it can show which reviews have the red dot
    setModalUnreadReviewIds(new Set(unopenedReviewIds));

    // Mark all current reviews as read in localStorage
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

  // Filter tournaments published strictly by users present in squad (current user + squad teammates)
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
          className={cn("rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all", isLight ? "bg-white shadow-sm" : "")}
          style={{
            background: isLight ? "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)" : "linear-gradient(135deg, rgba(34, 197, 94, 0.14) 0%, #141714 100%)",
            border: isLight ? "1px solid #a7f3d0" : "1px solid rgba(34, 197, 94, 0.35)",
            boxShadow: isLight ? "0 10px 25px -5px rgba(22, 163, 74, 0.12)" : "0 8px 24px rgba(0,0,0,0.35)"
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg,#166534,#14532d)", border: "1px solid #22c55e" }}
            >
              {effectiveTeam.team_name ? effectiveTeam.team_name.split(" ").map(w => w[0]).slice(0, 2).join("") : "TM"}
            </div>

            <div className="min-w-0">
              <div className={cn("text-xl font-black tracking-wide truncate drop-shadow-sm flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
                <span>{effectiveTeam.team_name}</span>
                {teamStats?.rating != null && (
                  <span className={cn("flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0", isLight ? "bg-amber-100 text-amber-800 border border-amber-300" : "text-amber-400 bg-amber-400/10 border border-amber-400/20")}>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{Number(teamStats.rating).toFixed(1)}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => effectiveTeam?.team_name && loadTeamStats(effectiveTeam.team_name)}
                  disabled={refreshingStats}
                  className={cn("p-1 rounded-lg transition-colors cursor-pointer", isLight ? "hover:bg-slate-100 text-slate-400 hover:text-emerald-600" : "hover:bg-neutral-800 text-neutral-400 hover:text-green-400")}
                  title="Refresh team stats and reviews"
                >
                  <RotateCw className={cn("w-3 h-3", refreshingStats && cn("animate-spin", isLight ? "text-emerald-600" : "text-green-400"))} />
                </button>
              </div>

              <div className={cn("text-xs mt-0.5 font-medium flex items-center gap-2 flex-wrap", isLight ? "text-slate-600" : "text-neutral-300")}>
                {effectiveTeam.village_name && <span>📍 {effectiveTeam.village_name}</span>}
                {effectiveTeam.team_year && <span>· 🗓️ Formed {effectiveTeam.team_year}</span>}
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", isLight ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-green-500/20 text-green-400 border border-green-500/30")}>
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
                <span className={cn("text-[11px] flex items-center gap-1.5 flex-wrap", isLight ? "text-slate-600" : "text-neutral-300")}>
                  <span>· {reviewsCount} feedback review{reviewsCount !== 1 ? "s" : ""}</span>
                  {unopenedCount > 0 ? (
                    <button
                      type="button"
                      onClick={handleOpenViewTeam}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-1.5 hover:bg-red-500/30 transition-all cursor-pointer shadow-sm"
                      title={`${unopenedCount} unopened review message${unopenedCount !== 1 ? "s" : ""}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <MessageSquare className="w-3 h-3 text-red-500" />
                      <span>Review ({unopenedCount})</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-500 text-white animate-pulse">
                        NEW
                      </span>
                    </button>
                  ) : reviewsCount > 0 ? (
                    <button
                      type="button"
                      onClick={handleOpenViewTeam}
                      className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer", isLight ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200" : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30")}
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

          {/* Self View Team Button */}
          <button
            type="button"
            onClick={handleOpenViewTeam}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: isLight ? "#16a34a" : "#22c55e",
              color: isLight ? "#ffffff" : "#051305",
              boxShadow: isLight ? "0 4px 14px rgba(22, 163, 74, 0.35)" : "0 4px 14px rgba(34, 197, 94, 0.35)",
            }}
            title="View your team performance, rating & feedback reviews"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Team</span>
            {unopenedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-600 text-white border border-red-400/50 flex items-center gap-1 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                {unopenedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 2. Self Team Details Modal (reviews only show in View Team modal) */}
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
          { key: "bookings", label: "My Bookings", icon: CalendarCheck },
          { key: "squad", label: "Squad", icon: Users },
          { key: "schedule", label: "Schedule", icon: Calendar }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeSection === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveSection(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
              style={isActive
                ? {
                    backgroundColor: isLight ? "#16a34a" : "#22c55e",
                    color: isLight ? "#ffffff" : "#000",
                    boxShadow: isLight ? "0 2px 10px rgba(22,163,74,0.35)" : "0 2px 10px rgba(34,197,94,0.35)"
                  }
                : {
                    backgroundColor: isLight ? "#ffffff" : "#151715",
                    color: isLight ? "#475569" : "#c8ccc8",
                    border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`
                  }}
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
            <CalendarCheck className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
            <h3 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>My Bookings</h3>
          </div>
          <div className="space-y-2">
            {bookings.map(b => (
              <div
                key={b.id}
                className={cn(
                  C,
                  "rounded-xl p-3 flex items-center justify-between gap-3 border transition-all",
                  isLight ? "bg-white border-slate-200 shadow-sm" : ""
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: isLight ? "rgba(22,163,74,0.12)" : "rgba(34,197,94,0.1)",
                      border: isLight ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(34,197,94,0.2)"
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
                <div className={cn("text-sm font-mono font-bold shrink-0", isLight ? "text-emerald-700" : "text-green-400")}>₹{b.amount}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "bookings" && bookings.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center border border-dashed"
          style={{ borderColor: isLight ? "#cbd5e1" : "#2a2a2a", backgroundColor: isLight ? "#ffffff" : "#131413" }}
        >
          <div className="text-4xl mb-3 opacity-60">🎟️</div>
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
              <Calendar className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
              <h3 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>Schedule</h3>
            </div>
            {scheduleCount > 0 && (
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isLight ? "#f1f5f9" : "#1a1a1a",
                  border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                  color: isLight ? "#475569" : "#6b7a6b"
                }}
              >
                {scheduleCount} upcoming
              </span>
            )}
          </div>

          {postedChallenges.length === 0 && acceptedChallengesFinal.length === 0 && registeredTournaments.length === 0 && (
            <div
              className="rounded-2xl p-8 text-center border border-dashed"
              style={{ borderColor: isLight ? "#cbd5e1" : "#2a2a2a", backgroundColor: isLight ? "#ffffff" : "#131413" }}
            >
              <div className="text-4xl mb-3 opacity-60">🗓️</div>
              <div className={cn("text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>Nothing on the calendar yet</div>
              <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                Post or accept a challenge in Find Match, or register your team for a tournament, to see it here.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Card 1: Posted Challenges */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(56,189,248,0.22)",
                boxShadow: isLight ? "0 2px 8px -2px rgba(0,0,0,0.05)" : undefined
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#f1f5f9" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "#f8fafc" : "transparent"
                }}
              >
                <Megaphone className={cn("w-3.5 h-3.5", isLight ? "text-sky-600" : "text-sky-400")} />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: isLight ? "#475569" : "#8fa08f" }}>
                  Posted Challenges
                </h4>
                {postedChallenges.length > 0 && (
                  <span
                    className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isLight ? "#f1f5f9" : "#1a1a1a",
                      border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                      color: isLight ? "#475569" : "#6b7a6b"
                    }}
                  >
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
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(245,158,11,0.25)",
                boxShadow: isLight ? "0 2px 8px -2px rgba(0,0,0,0.05)" : undefined
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#f1f5f9" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "#f8fafc" : "transparent"
                }}
              >
                <Swords className={cn("w-3.5 h-3.5", isLight ? "text-amber-600" : "text-amber-400")} />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: isLight ? "#475569" : "#8fa08f" }}>
                  Accepted Challenges
                </h4>
                {acceptedChallengesFinal.length > 0 && (
                  <span
                    className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isLight ? "#f1f5f9" : "#1a1a1a",
                      border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                      color: isLight ? "#475569" : "#6b7a6b"
                    }}
                  >
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
                            className={cn("rounded-xl p-2.5 flex items-center gap-2 transition-colors", isLight ? "hover:bg-slate-50" : "hover:bg-white/5")}
                            style={{ backgroundColor: isLight ? "#f8fafc" : "#1a1a1a", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }}
                          >
                            <Phone className={cn("w-3.5 h-3.5 shrink-0", isLight ? "text-emerald-600" : "text-green-400")} />
                            <div className="min-w-0">
                              <div className="text-xs truncate" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{ac.team_name}</div>
                              <div className={cn("text-xs font-mono", isLight ? "text-slate-900 font-bold" : "text-white")}>{ac.contact_no}</div>
                            </div>
                          </a>
                          <a
                            href={`tel:${ac.accepted_by_contact_no}`}
                            className={cn("rounded-xl p-2.5 flex items-center gap-2 transition-colors", isLight ? "hover:bg-slate-50" : "hover:bg-white/5")}
                            style={{ backgroundColor: isLight ? "#f8fafc" : "#1a1a1a", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }}
                          >
                            <Phone className={cn("w-3.5 h-3.5 shrink-0", isLight ? "text-emerald-600" : "text-green-400")} />
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
                              "flex-1 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center shadow-sm cursor-pointer",
                              isLight ? "bg-[#16a34a] hover:bg-[#15803d] text-white" : "bg-green-500 text-black hover:bg-green-400"
                            )}
                          >
                            💬 Chat
                          </button>
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={() => onCancelChallenge(ac.id)}
                            className={cn(
                              "flex-1 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer",
                              isLight ? "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200" : "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
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
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(34,197,94,0.25)",
                boxShadow: isLight ? "0 2px 8px -2px rgba(0,0,0,0.05)" : undefined
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#f1f5f9" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "#f8fafc" : "transparent"
                }}
              >
                <Trophy className={cn("w-3.5 h-3.5", isLight ? "text-emerald-600" : "text-green-400")} />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: isLight ? "#475569" : "#8fa08f" }}>
                  Our Team Published Tournaments
                </h4>
                {ourPublishedTournaments.length > 0 && (
                  <span
                    className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isLight ? "#f1f5f9" : "#1a1a1a",
                      border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                      color: isLight ? "#475569" : "#6b7a6b"
                    }}
                  >
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
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isLight ? "rgba(22,163,74,0.12)" : "rgba(34,197,94,0.1)",
                            border: isLight ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(34,197,94,0.2)"
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
                      <Tag color="green">Organizing</Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 4: Registered Tournaments */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? "#ffffff" : "#151715",
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(59,130,246,0.25)",
                boxShadow: isLight ? "0 2px 8px -2px rgba(0,0,0,0.05)" : undefined
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${isLight ? "#f1f5f9" : "#1e1e1e"}`,
                  backgroundColor: isLight ? "#f8fafc" : "transparent"
                }}
              >
                <Trophy className={cn("w-3.5 h-3.5", isLight ? "text-blue-600" : "text-blue-400")} />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: isLight ? "#475569" : "#8fa08f" }}>
                  Registered Tournaments
                </h4>
                {registeredTournaments.length > 0 && (
                  <span
                    className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isLight ? "#f1f5f9" : "#1a1a1a",
                      border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                      color: isLight ? "#475569" : "#6b7a6b"
                    }}
                  >
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
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isLight ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.1)",
                            border: isLight ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(59,130,246,0.2)"
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
                        <Tag color="blue">Registered</Tag>
                        {onUnregisterTournament && (
                          <button
                            type="button"
                            onClick={() => onUnregisterTournament(t.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                              isLight ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100" : "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
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
