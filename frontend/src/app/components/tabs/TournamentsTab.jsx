import React, { useState, useEffect } from "react";
import { Award, MapPin, CalendarDays, Users, DollarSign, Phone, Trophy, X, Pencil, Trash2, CheckCircle, Info, Plus } from "lucide-react";
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
// drift out of sync again. Note: the backend field is `created_by`, NOT
// `creator_user_id` (that field doesn't exist in the API response).
// ---------------------------------------------------------------------------
function isOrganizerOf(t, { myTeamId, currentUser } = {}) {
  const userTeamName = currentUser?.team_name?.trim()?.toLowerCase();
  return !!(
    (myTeamId && t.creator_team_id === myTeamId) ||
    (currentUser?.id && t.created_by === currentUser.id) ||
    (userTeamName && t.creator_team_name?.trim()?.toLowerCase() === userTeamName)
  );
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

function TournamentDetailsModal({ t, onClose, isMine, isOrganizer, roleLabel, registered, onRegister, onEdit, onDelete, token }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const maxTeams = t.max_teams ?? 0;
  const teamCount = t.team_count ?? 0;
  const spotsLeft = t.spots_left ?? Math.max(maxTeams - teamCount, 0);
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
            <span className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1.5"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle className="w-3.5 h-3.5" /> Registered
            </span>
          ) : (
            <button
              onClick={() => {
                onRegister(t.id);
                onClose();
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
    </div>
  );
}

function TournamentCard({ t, isMine, isOrganizer, roleLabel, registered, onRegister, onView, onEdit, onDelete, token }) {
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
      </div>

      <div className="flex gap-2">
        {isMine ? (
          <div className="flex-1 flex gap-1.5">
            <span
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> {roleLabel}
            </span>
            {(roleLabel === "Organizing" || isOrganizer) && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit?.(t)}
                  title="Edit Tournament"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors text-white bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 flex items-center gap-1.5"
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
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
          </div>
        ) : registered ? (
          <span
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-green-400 flex items-center justify-center gap-1"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Registered
          </span>
        ) : (
          <button
            onClick={() => onRegister(t.id)}
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

export default function TournamentsTab({ registeredIds = [], onRegister, tournaments, token, currentUser, myTeamId, onTournamentCreated, onTournamentUpdated, onTournamentDeleted }) {
  const [viewingId, setViewingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  const allTournaments = tournaments || [];

  // Single check used everywhere: organizer = created the tournament (by team
  // match, user id match via `created_by`, or team-name fallback).
  const organizerCheck = (t) => isOrganizerOf(t, { myTeamId, currentUser });
  const isMine = (t) => organizerCheck(t) || registeredIds.includes(t.id);

  const myCreatedTournament = allTournaments.find(organizerCheck);

  const myTournaments = allTournaments.filter(isMine);
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

        {myCreatedTournament ? (
          <button
            disabled
            title="Your team has already created an active tournament. Delete it first to create a new one."
            className="px-4 py-2.5 rounded-xl text-sm font-bold opacity-60 cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: "#1e241e", color: "#6b7a6b", border: "1px solid #2a2a2a" }}
          >
            <Plus className="w-4 h-4" /> Create Tournament
          </button>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-5 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Tournament
          </button>
        )}
      </div>

      {/* Notice if team already created a tournament */}
      {myCreatedTournament && (
        <div className="rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-3" style={{ backgroundColor: "#161b16", border: "1px solid rgba(34,197,94,0.2)", color: "#8ea08b" }}>
          <span>Your team (<strong>{myCreatedTournament.creator_team_name || "Organizing Team"}</strong>) has an active tournament: <strong>{myCreatedTournament.name}</strong>. Delete it if you wish to create a new one.</span>
          <button
            onClick={() => setEditingTournament(myCreatedTournament)}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors shrink-0"
          >
            Edit Tournament
          </button>
        </div>
      )}

      {/* Your Tournaments Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Your Tournaments</h3>
          {myTournaments.length > 0 && (
            <span className="text-xs" style={{ color: "#6b7a6b" }}>
              {myTournaments.length} active
            </span>
          )}
        </div>
        {myTournaments.length === 0 ? (
          <div className={cn(C, "rounded-2xl p-6 text-center text-sm")} style={{ color: "#4a5a4a" }}>
            You haven't organized or registered for any tournament yet.
          </div>
        ) : (
          <div className="space-y-3">
            {myTournaments.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                isMine
                isOrganizer={organizerCheck(t)}
                roleLabel={organizerCheck(t) ? "Organizing" : "Registered"}
                registered={registeredIds.includes(t.id)}
                onRegister={onRegister}
                onView={() => setViewingId(t.id)}
                onEdit={(item) => setEditingTournament(item)}
                onDelete={(id) => onTournamentDeleted?.(id)}
                token={token}
              />
            ))}
          </div>
        )}
      </section>

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
          roleLabel={organizerCheck(viewingTournament) ? "Organizing" : "Registered"}
          registered={registeredIds.includes(viewingTournament.id)}
          onRegister={onRegister}
          onEdit={(item) => setEditingTournament(item)}
          onDelete={(id) => onTournamentDeleted?.(id)}
          token={token}
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