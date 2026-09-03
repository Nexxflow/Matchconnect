import React, { useState, useEffect } from "react";
import { CalendarCheck, Users, Calendar, Megaphone, MapPin, Swords, Phone, XCircle, Trophy } from "lucide-react";
import { apiRequest } from "../../api";
import { C, cn, Tag, normalizePhone } from "../../utils/helpers.jsx";

function SquadSection({ token, currentUserId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("You need to be logged in to view your squad.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest("/users/teammates", { token });
        if (cancelled) return;
        setTeam(data.team);
        setMembers(data.members || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your squad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>Loading squad...</div>;
  if (error) return <div className="text-sm text-center py-8" style={{ color: "#4a5a4a" }}>{error}</div>;

  if (!team) {
    return (
      <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
        <div className="text-4xl mb-3 opacity-60">🧑‍🤝‍🧑</div>
        <div className="text-sm font-semibold text-white">No squad yet</div>
        <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: "#6b7a6b" }}>
          Add your team name, village and the year formed in Edit Profile — anyone with the same three values is grouped with you automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}>
        <div className="text-sm font-semibold text-white">{team.team_name}</div>
        <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{team.village_name} · Formed {team.team_year}</div>
        <div className="text-xs mt-1" style={{ color: "#4a5a4a" }}>{members.length} member{members.length !== 1 ? "s" : ""}</div>
      </div>
      <div className="rounded-2xl overflow-hidden border divide-y" style={{ borderColor: "#2a2a2a" }}>
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#161616" }}>
            <div className="w-9 h-9 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-xs font-bold shrink-0">
              {m.name?.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-white truncate flex items-center gap-1.5">
                {m.name}
                {m.id === currentUserId && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}>You</span>
                )}
              </div>
              <div className="text-xs font-mono" style={{ color: "#6b7a6b" }}>{m.phone}</div>
            </div>
          </div>
        ))}
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
}) {
  const [activeSection, setActiveSection] = useState("bookings");
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

    if (hasId && hasPhone && teamIdSet.size && teamPhoneSet.size) {
      return teamIdSet.has(Number(c.accepted_by_user_id)) && teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no));
    }
    if (hasId && teamIdSet.size) {
      return teamIdSet.has(Number(c.accepted_by_user_id));
    }
    if (hasPhone && teamPhoneSet.size) {
      return teamPhoneSet.has(normalizePhone(c.accepted_by_contact_no));
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
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-all"
              style={isActive
                ? { backgroundColor: "#22c55e", color: "#000", boxShadow: "0 2px 10px rgba(34,197,94,0.35)" }
                : { backgroundColor: "#151715", color: "#c8ccc8", border: "1px solid #2a2a2a" }}
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
            <CalendarCheck className="w-4 h-4 text-green-400" />
            <h3 className="text-base font-semibold text-white">My Bookings</h3>
          </div>
          <div className="space-y-2">
            {bookings.map(b => (
              <div key={b.id} className={cn(C, "rounded-xl p-3 flex items-center justify-between gap-3")}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    {b.type === "ground" ? <MapPin className="w-4 h-4 text-green-400" /> : <Trophy className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{b.name}</div>
                    <div className="text-xs" style={{ color: "#6b7a6b" }}>{b.date} · {b.time}</div>
                  </div>
                </div>
                <div className="text-sm font-mono text-green-400 shrink-0">₹{b.amount}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "bookings" && bookings.length === 0 && (
        <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
          <div className="text-4xl mb-3 opacity-60">🎟️</div>
          <div className="text-sm font-semibold text-white">No bookings yet</div>
          <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: "#6b7a6b" }}>
            Book a ground or an umpire and it'll show up here.
          </p>
        </div>
      )}

      {activeSection === "squad" && <SquadSection token={token} currentUserId={user?.id} />}

      {activeSection === "schedule" && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-400" />
              <h3 className="text-base font-semibold text-white">Schedule</h3>
            </div>
            {scheduleCount > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                {scheduleCount} upcoming
              </span>
            )}
          </div>

          {postedChallenges.length === 0 && acceptedChallengesFinal.length === 0 && registeredTournaments.length === 0 && (
            <div className="rounded-2xl p-8 text-center border border-dashed" style={{ borderColor: "#2a2a2a", backgroundColor: "#131413" }}>
              <div className="text-4xl mb-3 opacity-60">🗓️</div>
              <div className="text-sm font-semibold text-white">Nothing on the calendar yet</div>
              <p className="text-xs mt-1.5 max-w-[26ch] mx-auto" style={{ color: "#6b7a6b" }}>
                Post or accept a challenge in Find Match, or register your team for a tournament, to see it here.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#151715", border: "1px solid rgba(56,189,248,0.22)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <Megaphone className="w-3.5 h-3.5 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8fa08f" }}>Posted Challenges</h4>
                {postedChallenges.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                    {postedChallenges.length}
                  </span>
                )}
              </div>

              {postedChallenges.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: "#6b7a6b" }}>No posted challenges yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
                  {postedChallenges.map(pc => (
                    <div key={pc.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{pc.team_name}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>
                            {pc.match_date} · {pc.time_slot}
                          </div>
                        </div>
                        <Tag color="sky">{pc.status === "on_hold" ? "On Hold" : "Awaiting Opponent"}</Tag>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <Tag color="blue">{pc.format}</Tag>
                        <span className="text-xs flex items-center gap-1" style={{ color: "#6b7a6b" }}>
                          <MapPin className="w-3 h-3" style={{ color: "#4a5a4a" }} />
                          {pc.ground_name || "Ground TBD"}
                        </span>
                      </div>

                      {pc.note && (
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: "#8fa08f" }}>{pc.note}</p>
                      )}

                      {/* <button
                        disabled={deleting}
                        onClick={() => onDeleteChallenge?.(pc.id)}
                        className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                        style={deleting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                      >
                        <XCircle className="w-3.5 h-3.5" /> {deleting ? "Withdrawing..." : "Withdraw Challenge"}
                      </button> */}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#151715", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8fa08f" }}>Accepted Challenges</h4>
                {acceptedChallengesFinal.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                    {acceptedChallengesFinal.length}
                  </span>
                )}
              </div>

              {acceptedChallengesFinal.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: "#6b7a6b" }}>No accepted challenges yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
                  {acceptedChallengesFinal.map(ac => {
                    const iAmCreator = isTeamCreator(ac);
                    const opponentName = iAmCreator ? ac.accepted_by_team_name : ac.team_name;
                    return (
                      <div key={ac.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">vs {opponentName}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>
                              {ac.match_date} · {ac.time_slot}
                            </div>
                          </div>
                          <Tag color="amber">Confirmed</Tag>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Tag color="blue">{ac.format}</Tag>
                          <span className="text-xs flex items-center gap-1" style={{ color: "#6b7a6b" }}>
                            <MapPin className="w-3 h-3" style={{ color: "#4a5a4a" }} />
                            {ac.ground_name || "Ground TBD"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          <a href={`tel:${ac.contact_no}`} className="rounded-xl p-2.5 flex items-center gap-2 transition-colors hover:bg-white/5" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                            <Phone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs truncate" style={{ color: "#6b7a6b" }}>{ac.team_name}</div>
                              <div className="text-xs font-mono text-white">{ac.contact_no}</div>
                            </div>
                          </a>
                          <a href={`tel:${ac.accepted_by_contact_no}`} className="rounded-xl p-2.5 flex items-center gap-2 transition-colors hover:bg-white/5" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                            <Phone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs truncate" style={{ color: "#6b7a6b" }}>{ac.accepted_by_team_name}</div>
                              <div className="text-xs font-mono text-white">{ac.accepted_by_contact_no}</div>
                            </div>
                          </a>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button onClick={() => onOpenChat(ac)} className="flex-1 py-2.5 sm:py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-1.5 text-center">
                            💬 Chat
                          </button>
                          <button disabled={cancelling} onClick={() => onCancelChallenge(ac.id)} className="flex-1 py-2.5 sm:py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 text-center" style={cancelling ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
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
            {/* Card 1: Our Team Published Tournaments */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#151715", border: "1px solid rgba(34,197,94,0.25)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <Trophy className="w-3.5 h-3.5 text-green-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8fa08f" }}>
                  Our Team Published Tournaments
                </h4>
                {ourPublishedTournaments.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                    {ourPublishedTournaments.length}
                  </span>
                )}
              </div>

              {ourPublishedTournaments.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: "#6b7a6b" }}>No active tournament published by your team yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
                  {ourPublishedTournaments.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                          <Trophy className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: "#6b7a6b" }}>
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

            {/* Card 2: Registered Tournaments */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#151715", border: "1px solid rgba(59,130,246,0.25)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <Trophy className="w-3.5 h-3.5 text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8fa08f" }}>
                  Registered Tournaments
                </h4>
                {registeredTournaments.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#6b7a6b" }}>
                    {registeredTournaments.length}
                  </span>
                )}
              </div>

              {registeredTournaments.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: "#6b7a6b" }}>No tournament registrations yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
                  {registeredTournaments.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                          <Trophy className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: "#6b7a6b" }}>
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
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors"
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
