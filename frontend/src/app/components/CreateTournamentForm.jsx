import { useState, useEffect } from "react";
import { X, Trophy, Users, Phone, DollarSign, FileText, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { apiRequest } from "../api"; // same helper App.jsx already uses

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const inputClass =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[#111] border border-[#2a2a2a] text-white " +
  "placeholder:text-[#4a5a4a] focus:outline-none focus:border-green-500/60 transition-colors";

const labelClass = "text-xs font-medium text-[#c8ccc8] mb-1.5 block";

function GhostButton({ children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn("py-2 rounded-xl text-xs font-medium transition-colors", className)}
      style={{
        border: "1px solid #2a2a2a",
        color: disabled ? "#3a3a3a" : "#c8ccc8",
        backgroundColor: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = "#222")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {children}
    </button>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="w-4 h-4 text-green-400" />
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
export default function CreateTournamentForm({ token, user, tournaments = [], initialTournament = null, onClose, onCreated, onUpdated, onDeleted }) {
  const [myTeam, setMyTeam] = useState(null); // { id, name } | null, fetched from GET /teams/mine
  const [loadingTeam, setLoadingTeam] = useState(true);

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
    includeOwnTeam: initialTournament ? !!initialTournament.creator_included : true,
    phone: initialTournament?.phone || user?.phone || "",
    coPhone: initialTournament?.co_phone || "",
    entryFee: initialTournament?.entry_fee ?? "",
    description: initialTournament?.description || "",
    venue: initialTournament?.venue || "",
    startDate: initialTournament?.start_date ? initialTournament.start_date.split("T")[0] : "",
  });

  const parsedPrizes = Array.isArray(initialTournament?.prizes)
    ? initialTournament.prizes
    : typeof initialTournament?.prizes === "string"
    ? JSON.parse(initialTournament.prizes || "[]")
    : [];

  const [prizeCount, setPrizeCount] = useState(parsedPrizes.length > 0 ? parsedPrizes.length : 1);
  const [prizes, setPrizes] = useState([
    { position: 1, money: parsedPrizes[0]?.money ?? "", trophy: parsedPrizes[0]?.trophy ?? true },
    { position: 2, money: parsedPrizes[1]?.money ?? "", trophy: parsedPrizes[1]?.trophy ?? false },
    { position: 3, money: parsedPrizes[2]?.money ?? "", trophy: parsedPrizes[2]?.trophy ?? false },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loadingTeam && !myTeam && !user?.team_name?.trim() && !initialTournament) {
      setForm((f) => ({ ...f, includeOwnTeam: false }));
    }
    if (user?.phone && !form.phone) {
      setForm((f) => ({ ...f, phone: user.phone }));
    }
  }, [loadingTeam, myTeam, initialTournament, user]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updatePrize = (idx, field, value) =>
    setPrizes((p) => p.map((prize, i) => (i === idx ? { ...prize, [field]: value } : prize)));

  const validate = () => {
    const nameVal = user?.name?.trim() || "";
    const phoneVal = form.phone?.trim() || user?.phone?.trim() || "";
    const teamVal = user?.team_name?.trim() || myTeam?.team_name?.trim() || "";

    const missingProfile = [];
    if (!nameVal) missingProfile.push("Name");
    if (!phoneVal) missingProfile.push("Phone number");
    if (!teamVal && form.includeOwnTeam) missingProfile.push("Team name");

    if (missingProfile.length > 0) {
      const msg = `Please update your required profile details (${missingProfile.join(", ")}) in the Profile page first.`;
      alert(msg);
      return msg;
    }
    if (!form.name.trim()) return "Tournament name is required";
    const maxTeams = parseInt(form.maxTeams, 10);
    if (!Number.isInteger(maxTeams) || maxTeams < 2) return "Number of teams must be at least 2";
    if (form.includeOwnTeam && !myTeam && !user?.team_name?.trim() && !initialTournament) return "You don't have a team registered — turn off 'include my team', or register a team first";
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
        venue: form.venue || null,
        start_date: form.startDate || null,
        include_own_team: form.includeOwnTeam,
        max_teams: parseInt(form.maxTeams, 10),
        phone: form.phone || null,
        co_phone: form.coPhone || null,
        entry_fee: form.entryFee === "" ? 0 : Number(form.entryFee),
        description: form.description || null,
        prizes: prizes.slice(0, prizeCount).map((p) => ({
          position: p.position,
          money: Number(p.money),
          trophy: !!p.trophy,
        })),
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
    } catch (err) {
      setError(err.message || "Failed to save tournament");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTournament?.id || !token) return;
    if (!window.confirm("Are you sure you want to delete this tournament?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/tournaments/${initialTournament.id}`, { method: "DELETE", token });
      onDeleted?.(initialTournament.id);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to delete tournament");
    } finally {
      setSubmitting(false);
    }
  };

  const maxTeamsNum = parseInt(form.maxTeams, 10) || 0;
  const remainingPreview = form.includeOwnTeam ? Math.max(maxTeamsNum - 1, 0) : maxTeamsNum;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-6"
        style={{ backgroundColor: "#0d0f0d", border: "1px solid #2a2a2a" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{initialTournament ? "Edit Tournament" : "Create a Tournament"}</h2>
          <button onClick={onClose} className="text-[#6b7a6b] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <fieldset disabled={submitting}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Section icon={Trophy} title="Tournament details">
            <div>
              <label className={labelClass}>Tournament name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Summer Cup 2026"
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
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section icon={Users} title="Teams">
            <div>
              <label className={labelClass}>Your team</label>
              {loadingTeam ? (
                <div className={cn(inputClass, "text-[#4a5a4a]")}>Loading your team...</div>
              ) : myTeam ? (
                <div className={cn(inputClass, "flex items-center justify-between")}>
                  <span>{myTeam.name}</span>
                  <span className="text-[10px] text-[#4a5a4a]">from your account</span>
                </div>
              ) : (
                <div className="text-xs rounded-xl px-3 py-2.5" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
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
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
            >
              <div>
                <div className="text-sm text-white font-medium">Include your own team?</div>
                <div className="text-xs text-[#6b7a6b] mt-0.5">
                  {!myTeam
                    ? "No team on your account — this stays off"
                    : form.includeOwnTeam
                    ? `Your team takes one slot — ${remainingPreview} spot(s) left for others`
                    : `Your team is organizing only — ${remainingPreview} spot(s) open for others`}
                </div>
              </div>
              <button
                type="button"
                disabled={!myTeam}
                onClick={() => update("includeOwnTeam", !form.includeOwnTeam)}
                className="shrink-0 w-11 h-6 rounded-full relative transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: form.includeOwnTeam && myTeam ? "#22c55e" : "#2a2a2a" }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: form.includeOwnTeam && myTeam ? 22 : 2 }}
                />
              </button>
            </div>
          </Section>

          <Section icon={Phone} title="Contact">
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

          <Section icon={DollarSign} title="Entry fee & prizes">
            <div>
              <label className={labelClass}>Entry fee per team</label>
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
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: prizeCount === n ? "#22c55e" : "#111",
                      color: prizeCount === n ? "#000" : "#c8ccc8",
                      border: prizeCount === n ? "1px solid #22c55e" : "1px solid #2a2a2a",
                    }}
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
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}
                >
                  <span className="text-xs font-bold text-amber-400 w-14 shrink-0">
                    #{prize.position} place
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={cn(inputClass, "flex-1")}
                    value={prize.money}
                    onChange={(e) => updatePrize(idx, "money", e.target.value)}
                    placeholder="Prize money"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[#c8ccc8] shrink-0">
                    <input
                      type="checkbox"
                      checked={prize.trophy}
                      onChange={(e) => updatePrize(idx, "trophy", e.target.checked)}
                      className="accent-green-500"
                    />
                    Trophy
                  </label>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={FileText} title="Description">
            <textarea
              className={cn(inputClass, "min-h-[80px] resize-none")}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Rules, eligibility, anything teams should know..."
            />
          </Section>

          {error && (
            <div
              className="text-xs text-red-400 rounded-xl p-3"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {initialTournament && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="py-2.5 px-5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete Tournament
              </button>
            )}
            <GhostButton onClick={onClose} className="flex-1 text-center">
              Cancel
            </GhostButton>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? (initialTournament ? "Saving..." : "Publishing...") : (initialTournament ? "Save Changes" : "Publish Tournament")}
            </button>
          </div>
        </form>
        </fieldset>
      </div>
    </div>
  );
}