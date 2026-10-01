import { useState, useEffect } from "react";
import { X, Trophy, Users, Phone, DollarSign, FileText, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { apiRequest } from "../api"; // same helper App.jsx already uses
import CalendarField from "./CalendarField.jsx";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const inputClass =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[#111] border border-[#2a2a2a] text-white " +
  "placeholder:text-[#4a5a4a] focus:outline-none focus:border-green-500/60 transition-colors";

const labelClass = "text-xs font-medium text-[#c8ccc8] mb-1.5 block";

function GhostButton({ children, onClick, disabled, className = "", type = "button", theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn("py-2 rounded-xl text-xs font-semibold transition-colors", className)}
      style={{
        border: isLight ? "1px solid #cbd5e1" : "1px solid #2a2a2a",
        color: disabled ? (isLight ? "#94a3b8" : "#3a3a3a") : (isLight ? "#000000" : "#c8ccc8"),
        backgroundColor: isLight ? "#f8fafc" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = isLight ? "#f1f5f9" : "#222")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isLight ? "#f8fafc" : "transparent")}
    >
      {children}
    </button>
  );
}

function Section({ icon: Icon, title, children, theme = "dark" }) {
  const isLight = theme === "light";
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 text-sm font-bold", isLight ? "text-black" : "text-white")}>
        <Icon className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * CreateTournamentForm
 *
 * Props:
 *  - token: auth token (same one App.jsx keeps in `auth.token`)
 *  - user: the logged-in user object (auth.user) — used for defaults (team_name, phone)
 *  - tournaments: the full list of tournaments already loaded by TournamentsTab,
 *      used only to check "does my team already have one active tournament?"
 *      before letting the user submit. The backend enforces this rule too —
 *      this is just a fast, no-extra-request client-side check.
 *  - onClose(): called when the modal should close without saving
 *  - onCreated(tournament): called with the raw tournament row from the API on success
 *
 * Usage (inside App.jsx):
 *   "Tournaments": <TournamentsTab
 *     tournaments={tournaments}
 *     registeredIds={registeredIds}
 *     onRegister={handleRegister}
 *     token={auth.token}
 *     currentUser={auth.user}
 *     onTournamentCreated={handleTournamentCreated}
 *   />
 */
export default function CreateTournamentForm({ token, user, tournaments = [], initialTournament = null, onClose, onCreated, onUpdated, onDeleted, theme = "dark" }) {
  const isLight = theme === "light";
  const inputClass = isLight
    ? "w-full rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 focus:bg-white transition-all"
    : "w-full rounded-xl px-3.5 py-2.5 text-sm bg-[#0d130e] border border-[#233027] text-white placeholder:text-[#4a5a4a] focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/60 transition-all";
  const labelClass = isLight
    ? "text-xs font-bold text-slate-800 mb-1.5 block"
    : "text-xs font-semibold text-[#c8ccc8] mb-1.5 block";
  const [myTeam, setMyTeam] = useState(null); // { id, name } | null, fetched from GET /teams/mine
  const [loadingTeam, setLoadingTeam] = useState(true);

  const activeTeam = myTeam || (user?.team_name ? { id: user.team_id, name: user.team_name } : null) || (initialTournament?.creator_team_name ? { id: initialTournament.creator_team_id, name: initialTournament.creator_team_name } : null);

  const getInitialCreatorIncluded = (tour) => {
    if (!tour) return true;
    if (tour.creator_included !== undefined && tour.creator_included !== null) {
      return Boolean(tour.creator_included);
    }
    if (Array.isArray(tour.teams) && tour.creator_team_id) {
      return tour.teams.some((tm) => String(tm.id) === String(tour.creator_team_id));
    }
    return true;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("/teams/mine", { token });
        if (!cancelled) setMyTeam(res.team || null);
      } catch {
        if (!cancelled) setMyTeam(null);
      } finally {
        if (!cancelled) setLoadingTeam(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);


  const [form, setForm] = useState({
    name: initialTournament?.name || "",
    maxTeams: initialTournament?.max_teams || 8,
    includeOwnTeam: getInitialCreatorIncluded(initialTournament),
    phone: initialTournament?.phone || user?.phone || "",
    coPhone: initialTournament?.co_phone || "",
    entryFee: initialTournament?.entry_fee ?? "",
    description: initialTournament?.description || "",
    venue: initialTournament?.venue || "",
    startDate: initialTournament?.start_date ? initialTournament.start_date.split("T")[0] : "",
  });

  const parsedPrizes = (() => {
    if (Array.isArray(initialTournament?.prizes)) return initialTournament.prizes;
    if (typeof initialTournament?.prizes === "string") {
      try {
        return JSON.parse(initialTournament.prizes || "[]");
      } catch {
        return [];
      }
    }
    return [];
  })();

  const [prizeCount, setPrizeCount] = useState(parsedPrizes.length > 0 ? parsedPrizes.length : 1);
  const [prizes, setPrizes] = useState([
    { position: 1, money: parsedPrizes[0]?.money ?? "", trophy: parsedPrizes[0]?.trophy ?? true },
    { position: 2, money: parsedPrizes[1]?.money ?? "", trophy: parsedPrizes[1]?.trophy ?? false },
    { position: 3, money: parsedPrizes[2]?.money ?? "", trophy: parsedPrizes[2]?.trophy ?? false },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialTournament) {
      setForm({
        name: initialTournament.name || "",
        maxTeams: initialTournament.max_teams || 8,
        includeOwnTeam: getInitialCreatorIncluded(initialTournament),
        phone: initialTournament.phone || user?.phone || "",
        coPhone: initialTournament.co_phone || "",
        entryFee: initialTournament.entry_fee ?? "",
        description: initialTournament.description || "",
        venue: initialTournament.venue || "",
        startDate: initialTournament.start_date ? String(initialTournament.start_date).split("T")[0] : "",
      });

      const pArr = (() => {
        if (Array.isArray(initialTournament.prizes)) return initialTournament.prizes;
        if (typeof initialTournament.prizes === "string") {
          try {
            return JSON.parse(initialTournament.prizes || "[]");
          } catch {
            return [];
          }
        }
        return [];
      })();

      if (pArr.length > 0) {
        setPrizeCount(pArr.length);
        setPrizes([
          { position: 1, money: pArr[0]?.money ?? "", trophy: pArr[0]?.trophy ?? true },
          { position: 2, money: pArr[1]?.money ?? "", trophy: pArr[1]?.trophy ?? false },
          { position: 3, money: pArr[2]?.money ?? "", trophy: pArr[2]?.trophy ?? false },
        ]);
      }
    }
  }, [initialTournament, user]);

  useEffect(() => {
    if (!loadingTeam && !activeTeam && !initialTournament) {
      setForm((f) => ({ ...f, includeOwnTeam: false }));
    }
    if (user?.phone && !form.phone && !initialTournament?.phone) {
      setForm((f) => ({ ...f, phone: user.phone }));
    }
  }, [loadingTeam, activeTeam, initialTournament, user]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updatePrize = (idx, field, value) =>
    setPrizes((p) => p.map((prize, i) => (i === idx ? { ...prize, [field]: value } : prize)));

  const validate = () => {
    const nameVal = user?.name?.trim() || "";
    const phoneVal = form.phone?.trim() || user?.phone?.trim() || "";
    const teamVal = user?.team_name?.trim() || activeTeam?.name?.trim() || "";

    const missingProfile = [];
    if (!nameVal) missingProfile.push("Name");
    if (!phoneVal) missingProfile.push("Phone number");
    if (!teamVal && form.includeOwnTeam) missingProfile.push("Team name");

    if (missingProfile.length > 0) {
      const msg = `Please update your required profile details (${missingProfile.join(", ")}) in the Profile page first.`;
      alert(msg);
      return msg;
    }
    if (!form.name?.trim()) return "Tournament name is required";
    const maxTeams = parseInt(form.maxTeams, 10);
    if (!Number.isInteger(maxTeams) || maxTeams < 2) return "Number of teams must be at least 2";
    if (form.includeOwnTeam && !activeTeam && !user?.team_name?.trim() && !initialTournament) return "You don't have a team registered — turn off 'include my team', or register a team first";
    for (let i = 0; i < prizeCount; i++) {
      if (prizes[i].money === "" || Number(prizes[i].money) < 0) {
        return `Enter a prize amount for position ${i + 1}`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!token) {
      setError("You need to be logged in.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        venue: form.venue?.trim() || null,
        start_date: form.startDate || null,
        phone: form.phone?.trim() || null,
        co_phone: form.coPhone?.trim() || null,
        entry_fee: Number(form.entryFee) || 0,
        description: form.description?.trim() || null,
        max_teams: Number(form.maxTeams) || 8,
        prizes: prizes.slice(0, prizeCount).map((p) => ({
          position: p.position,
          money: Number(p.money) || 0,
          trophy: !!p.trophy,
        })),
        include_own_team: !!form.includeOwnTeam,
        creator_included: !!form.includeOwnTeam,
      };

      if (initialTournament) {
        const res = await apiRequest(`/tournaments/${initialTournament.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        onUpdated?.(res.tournament || res);
      } else {
        const res = await apiRequest("/tournaments", {
          method: "POST",
          token,
          body: payload,
        });
        onCreated?.(res.tournament || res);
      }
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to save tournament");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!initialTournament?.id) return;
    setDeleting(true);
    setError(null);
    try {
      await apiRequest(`/tournaments/${initialTournament.id}`, {
        method: "DELETE",
        token,
      });
      setShowDeleteConfirm(false);
      onDeleted?.(initialTournament.id);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to delete tournament");
    } finally {
      setDeleting(false);
    }
  };

  const maxTeamsNum = parseInt(form.maxTeams, 10) || 0;
  const remainingPreview = form.includeOwnTeam ? Math.max(maxTeamsNum - 1, 0) : maxTeamsNum;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl relative shadow-2xl animate-in zoom-in-95 duration-200 border p-5 sm:p-6 space-y-5"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#0d120e",
          borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl z-10 pointer-events-none" />

        {/* Unified ModalHeader */}
        <div className="flex items-start justify-between gap-3 pb-3.5 mb-2 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
              style={{
                backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.12)",
                borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.28)",
                color: isLight ? "#16a34a" : "#4ade80"
              }}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  {initialTournament ? "Edit Tournament" : "Create a Tournament"}
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                  style={{
                    backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.15)",
                    borderColor: isLight ? "#bbf7d0" : "rgba(34,197,94,0.3)",
                    color: isLight ? "#15803d" : "#4ade80"
                  }}
                >
                  {initialTournament ? "Organizer" : "New Tournament"}
                </span>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
                {initialTournament ? "Update your tournament details, schedule or prizes" : "Set up your tournament bracket, rules & prize pool"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-200 hover:rotate-90 hover:scale-105 active:scale-95 shrink-0"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "rgba(255,255,255,0.06)",
              borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
              color: isLight ? "#64748b" : "#9aa59c"
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <fieldset disabled={submitting}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Trophy} title="Tournament details" theme={theme}>
            <div>
              <label className={labelClass}>Tournament name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Summer Premier League 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Venue (optional)</label>
                <input
                  className={inputClass}
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                  placeholder="Ground / city"
                />
              </div>
              <div>
                <label className={labelClass}>Start date (optional)</label>
                <CalendarField
                  value={form.startDate}
                  onChange={(v) => update("startDate", v)}
                  theme={theme}
                  placeholder="Select start date"
                  clearable={true}
                />
              </div>
            </div>
          </Section>

          <Section icon={Users} title="Teams" theme={theme}>
            <div>
              <label className={labelClass}>Your team</label>
              {loadingTeam && !activeTeam ? (
                <div className={cn(inputClass, "text-slate-400")}>Loading your team...</div>
              ) : activeTeam ? (
                <div className={cn(inputClass, "flex items-center justify-between font-bold")}>
                  <span>{activeTeam.name}</span>
                  <span className={cn("text-[10px] font-normal", isLight ? "text-slate-500" : "text-[#4a5a4a]")}>from your account</span>
                </div>
              ) : (
                <div className={cn("text-xs rounded-xl px-3.5 py-2.5 border font-medium", isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]")}>
                  You don't have a team registered yet. You can still create the tournament as organizer-only (turn off "include my team" below), or register a team first.
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Number of teams in this tournament</label>
              <input
                type="number"
                min={2}
                className={inputClass}
                value={form.maxTeams}
                onChange={(e) => update("maxTeams", e.target.value)}
              />
            </div>
            <div
              className={cn("rounded-2xl p-3.5 flex items-center justify-between border transition-all", isLight ? "bg-slate-50 border-slate-200" : "bg-[#111812] border-[#1d2a21]")}
            >
              <div>
                <div className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>Include your own team?</div>
                <div className={cn("text-xs mt-0.5", isLight ? "text-slate-500" : "text-[#9aa59c]")}>
                  {!activeTeam
                    ? "No team on your account — this stays off"
                    : form.includeOwnTeam
                    ? `Your team takes one slot — ${remainingPreview} spot(s) left for others`
                    : `Your team is organizing only — ${remainingPreview} spot(s) open for others`}
                </div>
              </div>
              <button
                type="button"
                disabled={!activeTeam}
                onClick={() => update("includeOwnTeam", !form.includeOwnTeam)}
                className="shrink-0 w-12 h-6 rounded-full relative transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: form.includeOwnTeam && activeTeam ? "#16a34a" : (isLight ? "#cbd5e1" : "#2a2a2a") }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                  style={{ left: form.includeOwnTeam && activeTeam ? 26 : 2 }}
                />
              </button>
            </div>
          </Section>

          <Section icon={Phone} title="Contact" theme={theme}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Phone number</label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Primary contact"
                />
              </div>
              <div>
                <label className={labelClass}>Co-phone number</label>
                <input
                  className={inputClass}
                  value={form.coPhone}
                  onChange={(e) => update("coPhone", e.target.value)}
                  placeholder="Secondary contact"
                />
              </div>
            </div>
          </Section>

          <Section icon={DollarSign} title="Entry fee & prizes" theme={theme}>
            <div>
              <label className={labelClass}>Entry fee per team (₹)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.entryFee}
                onChange={(e) => update("entryFee", e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className={labelClass}>Number of prizes</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPrizeCount(n)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                      prizeCount === n
                        ? (isLight ? "bg-[#16a34a] text-white border-[#16a34a] shadow-xs" : "bg-[#22c55e] text-black border-[#22c55e]")
                        : (isLight ? "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100" : "bg-[#111812] text-[#c8ccc8] border-[#1d2a21]")
                    )}
                  >
                    {n} {n === 1 ? "prize" : "prizes"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {prizes.slice(0, prizeCount).map((prize, idx) => (
                <div
                  key={prize.position}
                  className={cn("rounded-2xl p-3 flex items-center gap-3 border", isLight ? "bg-slate-50 border-slate-200" : "bg-[#111812] border-[#1d2a21]")}
                >
                  <span className="text-xs font-bold text-amber-500 w-16 shrink-0 flex items-center gap-1">
                    <span>{prize.position === 1 ? "🥇" : prize.position === 2 ? "🥈" : "🥉"}</span>
                    <span>#{prize.position} place</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={cn(inputClass, "flex-1")}
                    value={prize.money}
                    onChange={(e) => updatePrize(idx, "money", e.target.value)}
                    placeholder="Prize money (₹)"
                  />
                  <label className={cn("flex items-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer select-none", isLight ? "text-slate-700" : "text-[#c8ccc8]")}>
                    <input
                      type="checkbox"
                      checked={prize.trophy}
                      onChange={(e) => updatePrize(idx, "trophy", e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    Trophy
                  </label>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={FileText} title="Description" theme={theme}>
            <textarea
              className={cn(inputClass, "min-h-[85px] resize-none")}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Rules, match overs, ball type, eligibility, and reporting timings..."
            />
          </Section>

          {error && (
            <div
              className={cn("text-xs rounded-xl p-3 border font-medium", isLight ? "bg-red-50 text-red-700 border-red-200" : "text-red-400 bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)]")}
            >
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {initialTournament && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={submitting || deleting}
                className={cn(
                  "py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 border hover:scale-[1.01] active:scale-[0.99]",
                  isLight
                    ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 shadow-xs"
                    : "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                )}
              >
                <Trash2 className="w-4 h-4" /> Delete Tournament
              </button>
            )}
            <GhostButton onClick={onClose} className="flex-1 text-center font-bold" theme={theme}>
              Cancel
            </GhostButton>
            <button
              type="submit"
              disabled={submitting || deleting}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                color: "#ffffff",
                boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
              }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{initialTournament ? "Saving..." : "Publishing..."}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  <span>{initialTournament ? "Save Changes" : "Publish Tournament"}</span>
                </span>
              )}
            </button>
          </div>
        </form>
        </fieldset>
      </div>

      {/* Delete Tournament Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.6)" : "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-5 space-y-4 relative border shadow-2xl overflow-hidden"
            style={isLight ? {
              backgroundColor: "#ffffff",
              borderColor: "#fee2e2",
            } : {
              backgroundColor: "#0d0f0d",
              borderColor: "#3a1a1a",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />
            <div className="flex items-start gap-3 pt-1">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className={cn("text-base font-bold", isLight ? "text-slate-900" : "text-white")}>
                  Delete Tournament?
                </h4>
                <p className={cn("text-xs mt-1 leading-relaxed", isLight ? "text-slate-600" : "text-slate-400")}>
                  Are you sure you want to delete <span className={cn("font-bold", isLight ? "text-slate-900" : "text-white")}>{initialTournament?.name || "this tournament"}</span>? All matches and team registrations will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-[#1f221f]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-[#1c1f1c] hover:bg-[#252825] text-[#c8ccc8]"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
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