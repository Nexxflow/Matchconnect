import React, { useState, useEffect } from "react";
import { Plus, X, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "../../api";
import { C, cn, normalizePhone } from "../../utils/helpers.jsx";

function UmpireForm({ user, token, onCreated, onUpdated, onDeleted, initialUmpire = null, onClose, theme = "dark" }) {
  const editing = !!initialUmpire;
  const isLight = theme === "light";

  const buildForm = (ump, u) => ({
    name: ump?.name || u?.name || "",
    role: ump?.role || "Umpire",
    experience: ump?.experience !== undefined && ump?.experience !== null ? String(ump.experience) : "",
    fee_per_match: ump?.fee_per_match !== undefined && ump?.fee_per_match !== null
      ? String(ump.fee_per_match)
      : (ump?.price ? String(ump.price).replace(/[^0-9.]/g, "") : "")
  });

  const [open, setOpen] = useState(editing);
  const [form, setForm] = useState(() => buildForm(initialUmpire, user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const normalizedPhone = normalizePhone(user?.phone);

  useEffect(() => {
    setForm(prev => {
      const fresh = buildForm(initialUmpire, user);
      const prevDefaultName = initialUmpire?.name || user?.name || "";
      const nameWasUntouched = prev.name === prevDefaultName || prev.name === "";
      return {
        ...prev,
        name: nameWasUntouched ? fresh.name : prev.name,
        role: initialUmpire ? fresh.role : prev.role,
        experience: initialUmpire ? fresh.experience : prev.experience,
        fee_per_match: initialUmpire ? fresh.fee_per_match : prev.fee_per_match
      };
    });
    if (editing) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUmpire?.id, user?.name]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const isOwner = (ump) => {
    if (!ump) return false;
    if (ump.created_by && user?.id && String(ump.created_by) === String(user.id)) return true;
    if (ump.user_id && user?.id && String(ump.user_id) === String(user.id)) return true;
    if (normalizedPhone && normalizePhone(ump.mobile) === normalizedPhone) return true;
    return false;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    if (editing && !isOwner(initialUmpire)) {
      return setError("Only the user who posted this umpire can edit it.");
    }

    if (!form.name.trim()) return setError("Name is required.");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return setError("Your account doesn't have a valid phone number on file. Please update your profile first.");
    }
    if (!form.fee_per_match || Number(form.fee_per_match) <= 0) return setError("Fee per match must be greater than 0.");
    if (form.experience !== "" && Number(form.experience) < 0) return setError("Experience can't be negative.");
    if (!token) return setError("You need to be logged in.");

    setSubmitting(true);
    try {
      const res = await apiRequest(editing ? `/umpires/${initialUmpire.id}` : "/umpires", {
        method: editing ? "PUT" : "POST",
        token,
        body: {
          name: form.name.trim(),
          mobile: normalizedPhone,
          role: form.role,
          experience: Number(form.experience || 0),
          fee_per_match: Number(form.fee_per_match)
        }
      });
      if (editing) {
        onUpdated?.(res.umpire);
        onClose?.();
      } else {
        onCreated(res.umpire);
        setForm(buildForm(null, user));
        setOpen(false);
      }
    } catch (err) {
      setError(err.message || "Could not save — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !initialUmpire?.id || !token) return;
    if (!isOwner(initialUmpire)) {
      return setError("Only the user who posted this umpire can delete it.");
    }
    if (!window.confirm("Are you sure you want to delete this umpire?")) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/umpires/${initialUmpire.id}`, { method: "DELETE", token });
      onDeleted?.(initialUmpire.id);
      onClose?.();
    } catch (err) {
      setError(err.message || "Could not delete umpire.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open && !editing) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
          isLight ? "hover:bg-emerald-50 text-emerald-700 shadow-sm" : "hover:bg-white/5 text-green-400"
        )}
        style={{
          border: isLight ? "1.5px dashed #86efac" : "1px dashed #2a2a2a",
          backgroundColor: isLight ? "#f0fdf4" : "transparent"
        }}
      >
        <Plus className="w-4 h-4" /> Register as Umpire / Scorer
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(C, "rounded-2xl p-5 space-y-4")}
      style={isLight ? {
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)"
      } : undefined}
    >
      <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-[#222]">
        <span className={cn("text-base font-bold", isLight ? "text-slate-900" : "text-white")}>
          {editing ? "Edit Umpire / Scorer" : "Register as Umpire / Scorer"}
        </span>
        <button
          type="button"
          onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: isLight ? "#f1f5f9" : "#222" }}
        >
          <X className={cn("w-4 h-4", isLight ? "text-slate-600" : "text-[#c8ccc8]")} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1 block" style={{ color: isLight ? "#475569" : "#6b7a6b" }}>Full name</label>
          <input
            value={user?.name || form.name}
            readOnly
            onChange={e => update("name", e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-all"
            style={isLight ? { backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a" } : { backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
            placeholder="Rahul Desai"
          />
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: isLight ? "#475569" : "#6b7a6b" }}>Mobile number</label>
          <input
            value={user?.phone || ""}
            readOnly
            className="w-full rounded-xl px-3.5 py-2.5 text-sm font-mono cursor-not-allowed"
            style={isLight ? { backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b" } : { backgroundColor: "#151515", border: "1px solid #2a2a2a", color: "#6b7a6b" }}
          />
          <p className="text-[11px] mt-1" style={{ color: isLight ? "#64748b" : "#4a5a4a" }}>From your account profile.</p>
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: isLight ? "#475569" : "#6b7a6b" }}>Role</label>
          <div className="relative">
            <select
              value={form.role}
              onChange={e => update("role", e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium appearance-none pr-8 focus:outline-none transition-all"
              style={isLight ? { backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a" } : { backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
            >
              {["Umpire", "Scorer", "Umpire + Scorer"].map(r => <option key={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: isLight ? "#64748b" : "#6b7a6b" }} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: isLight ? "#475569" : "#6b7a6b" }}>Experience (years)</label>
          <input
            type="number"
            min="0"
            value={form.experience}
            onChange={e => update("experience", e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
            style={isLight ? { backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a" } : { backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
            placeholder="5"
          />
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: isLight ? "#475569" : "#6b7a6b" }}>Fee per match (₹)</label>
          <input
            type="number"
            min="1"
            value={form.fee_per_match}
            onChange={e => update("fee_per_match", e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
            style={isLight ? { backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a" } : { backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
            placeholder="800"
          />
        </div>
      </div>

      {error && (
        <div className={cn("text-xs rounded-xl p-3 font-medium", isLight ? "bg-red-50 text-red-700 border border-red-200" : "text-red-400 bg-red-500/10 border border-red-500/20")}>
          {error}
        </div>
      )}

      <div className="flex gap-2.5 pt-1">
        {editing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className={cn(
              "flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors",
              isLight ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200" : "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20"
            )}
            style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
          >
            Delete Umpire
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !normalizedPhone}
          className={cn(
            "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all",
            isLight
              ? "bg-[#16a34a] text-white hover:bg-[#15803d] shadow-sm"
              : "bg-green-500 text-black hover:bg-green-400"
          )}
          style={(submitting || !normalizedPhone) ? { opacity: 0.6, cursor: "not-allowed" } : {}}
        >
          {submitting ? (editing ? "Saving..." : "Registering...") : (editing ? "Save Changes" : "Register")}
        </button>
      </div>
    </form>
  );
}

export default function UmpiresTab({ umpires, onBook, token, user, onCreated, onUpdated, onDeleted, theme = "dark" }) {
  const isLight = theme === "light";
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [editingUmpire, setEditingUmpire] = useState(null);

  const userPhoneNorm = normalizePhone(user?.phone);
  const isOwner = (u) => {
    if (!u) return false;
    if (u.created_by && user?.id && String(u.created_by) === String(user.id)) return true;
    if (u.user_id && user?.id && String(u.user_id) === String(user.id)) return true;
    if (userPhoneNorm && normalizePhone(u.mobile) === userPhoneNorm) return true;
    return false;
  };

  const myUmpire = umpires.find(isOwner);

  const roleColor = (role) => {
    if (isLight) {
      if (role === "Scorer") return { bg: "bg-blue-50 border border-blue-200", text: "text-blue-700" };
      if (role === "Umpire + Scorer") return { bg: "bg-amber-50 border border-amber-200", text: "text-amber-800" };
      return { bg: "bg-emerald-50 border border-emerald-200", text: "text-emerald-700" };
    }
    if (role === "Scorer") return { bg: "bg-blue-900", text: "text-blue-300" };
    if (role === "Umpire + Scorer") return { bg: "bg-yellow-900", text: "text-yellow-300" };
    return { bg: "bg-emerald-900", text: "text-emerald-300" };
  };

  const roles = ["All", ...Array.from(new Set(umpires.map((u) => u.role || "Umpire"))).sort()];

  const priceNum = (u) => Number(String(u.price).replace(/[^0-9.]/g, "")) || 0;
  const expNum = (u) => Number(String(u.exp).replace(/[^0-9.]/g, "")) || 0;

  const filtered = umpires
    .filter((u) => (roleFilter === "All" ? true : (u.role || "Umpire") === roleFilter))
    .filter((u) => (query.trim() ? u.name?.toLowerCase().includes(query.trim().toLowerCase()) : true))
    .sort((a, b) => {
      if (sortBy === "price_low") return priceNum(a) - priceNum(b);
      if (sortBy === "price_high") return priceNum(b) - priceNum(a);
      if (sortBy === "exp_high") return expNum(b) - expNum(a);
      if (sortBy === "exp_low") return expNum(a) - expNum(b);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-2xl font-bold tracking-tight", isLight ? "text-slate-900" : "text-white")}>
            Umpires & Scorers
          </h2>
          <p className={cn("text-sm mt-1", isLight ? "text-slate-600" : "text-gray-400")}>
            Book experienced umpires and scorers for your cricket matches.
          </p>
        </div>

        <div
          className={cn(
            "px-4 py-2 rounded-xl transition-all",
            isLight
              ? "bg-white border border-slate-200 shadow-sm"
              : "bg-[#171717] border border-[#2a2a2a]"
          )}
        >
          <div className={cn("text-2xl font-extrabold", isLight ? "text-emerald-600" : "text-green-400")}>
            {umpires.length}
          </div>
          <div className={cn("text-xs font-medium", isLight ? "text-slate-500" : "text-gray-500")}>
            Available
          </div>
        </div>
      </div>

      {myUmpire ? (
        <div
          className="w-full p-4 rounded-2xl flex items-center justify-between gap-3 transition-all"
          style={
            isLight
              ? {
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  boxShadow: "0 4px 12px -2px rgba(22, 163, 74, 0.08)"
                }
              : { backgroundColor: "#151715", border: "1px solid rgba(34,197,94,0.3)" }
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0",
                isLight
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                  : "bg-green-500/10 text-green-400 border border-green-500/20"
              )}
            >
              ✓
            </div>
            <div className="min-w-0">
              <div className={cn("text-sm font-bold flex items-center gap-2 truncate", isLight ? "text-slate-900" : "text-white")}>
                You are registered as {myUmpire.role || "Umpire"}
              </div>
              <div className={cn("text-xs mt-0.5 font-mono truncate", isLight ? "text-slate-600" : "text-gray-400")}>
                {myUmpire.name} • 📞 {myUmpire.mobile} • ₹{myUmpire.price || myUmpire.fee_per_match || 0}/match
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingUmpire(myUmpire)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0",
              isLight
                ? "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm"
                : "bg-[#252525] hover:bg-[#333] text-white border border-[#333]"
            )}
          >
            <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-green-400" /> Edit Registration
          </button>
        </div>
      ) : (
        <UmpireForm user={user} token={token} onCreated={onCreated} theme={theme} />
      )}

      {umpires.length === 0 ? (
        <div
          className={cn(
            "rounded-2xl p-10 text-center border border-dashed",
            isLight ? "bg-white border-slate-300 shadow-sm" : "border-[#333] bg-[#151515]"
          )}
        >
          <div className="text-5xl mb-3">🧑‍⚖️</div>
          <h3 className={cn("font-semibold text-lg", isLight ? "text-slate-900" : "text-white")}>
            No Umpires Registered
          </h3>
          <p className={cn("text-sm mt-2", isLight ? "text-slate-500" : "text-gray-500")}>
            Register yourself as an umpire or scorer.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className={cn(
                "flex-1 min-w-[160px] rounded-xl px-3.5 py-2 text-sm focus:outline-none transition-all",
                isLight
                  ? "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 shadow-sm"
                  : "bg-[#171717] border border-[#2a2a2a] text-white focus:border-green-500"
              )}
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={cn(
                "rounded-xl px-3 py-2 text-sm focus:outline-none transition-all",
                isLight
                  ? "bg-white border border-slate-200 text-slate-900 shadow-sm"
                  : "bg-[#171717] border border-[#2a2a2a] text-white"
              )}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={cn(
                "rounded-xl px-3 py-2 text-sm focus:outline-none transition-all",
                isLight
                  ? "bg-white border border-slate-200 text-slate-900 shadow-sm"
                  : "bg-[#171717] border border-[#2a2a2a] text-white"
              )}
            >
              <option value="default">Sort: default</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div
              className={cn(
                "rounded-2xl p-8 text-center border border-dashed",
                isLight ? "bg-white border-slate-300 text-slate-500 shadow-sm" : "border-[#333] bg-[#151515] text-gray-500"
              )}
            >
              <p>No umpires match your filters.</p>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-2xl overflow-hidden border divide-y transition-all",
                isLight
                  ? "bg-white border-slate-200 divide-slate-100 shadow-sm"
                  : "border-[#2a2a2a] divide-[#2a2a2a]"
              )}
            >
              {filtered.map((u) => {
                const role = u.role || "Umpire";
                const rc = roleColor(role);
                return (
                  <div
                    key={u.id ?? u.name}
                    className={cn(
                      "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3.5 transition-colors",
                      isLight ? "bg-white hover:bg-slate-50/80" : "bg-[#161616] hover:bg-[#1c1c1c]"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                      <div
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0 shadow"
                        style={{ background: u.grad }}
                      >
                        {u.name?.split(" ").map((x) => x[0]).join("")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-sm font-bold truncate", isLight ? "text-slate-900" : "text-white")}>{u.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${rc.bg} ${rc.text}`}>
                            {role}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 border",
                              u.avail
                                ? (isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-green-900/60 text-green-300 border-green-700/50")
                                : (isLight ? "bg-red-50 text-red-700 border-red-200" : "bg-red-900/60 text-red-300 border-red-700/50")
                            )}
                          >
                            {u.avail ? "Available" : "Busy"}
                          </span>
                        </div>
                        <div className={cn("sm:hidden text-xs mt-1 flex items-center gap-3", isLight ? "text-slate-500" : "text-gray-400")}>
                          <span>📞 {u.mobile}</span>
                          <span>🏏 {u.exp}</span>
                        </div>
                      </div>
                    </div>

                    <div className={cn("hidden sm:block text-xs font-mono w-28 shrink-0", isLight ? "text-slate-600" : "text-gray-400")}>
                      📞 {u.mobile}
                    </div>

                    <div className={cn("hidden sm:block text-xs w-20 shrink-0 font-medium", isLight ? "text-slate-600" : "text-gray-400")}>
                      🏏 {u.exp}
                    </div>

                    <div className={cn(
                      "flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 sm:border-0",
                      isLight ? "border-t border-slate-100" : "border-t border-[#222]"
                    )}>
                      <div className={cn("font-bold text-sm sm:w-20 text-left sm:text-right shrink-0", isLight ? "text-emerald-700" : "text-green-400")}>
                        {u.price}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner(u) && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingUmpire(u)}
                              title="Edit Umpire"
                              className={cn(
                                "p-2 rounded-xl text-xs font-bold transition-colors",
                                isLight
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm"
                                  : "text-gray-300 hover:text-white bg-[#252525] hover:bg-[#333]"
                              )}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`Delete ${u.name}?`)) return;
                                try {
                                  await apiRequest(`/umpires/${u.id}`, { method: "DELETE", token });
                                  onDeleted?.(u.id);
                                } catch (err) {
                                  alert(err.message || "Could not delete umpire.");
                                }
                              }}
                              title="Delete Umpire"
                              className={cn(
                                "p-2 rounded-xl text-xs font-bold transition-colors",
                                isLight
                                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-sm"
                                  : "text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                              )}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          disabled={!u.avail}
                          onClick={() => u.avail && onBook(u)}
                          className={cn(
                            "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                            isLight
                              ? (u.avail ? "bg-[#16a34a] text-white hover:bg-[#15803d] shadow-sm" : "bg-slate-100 text-slate-400 cursor-not-allowed")
                              : (u.avail ? "bg-green-500 text-black hover:bg-green-400" : "bg-[#252525] text-gray-600 cursor-not-allowed")
                          )}
                        >
                          {u.avail ? "Book" : "Busy"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {editingUmpire && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: isLight ? "rgba(15, 23, 42, 0.6)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditingUmpire(null)}
        >
          <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <UmpireForm
              user={user}
              token={token}
              initialUmpire={editingUmpire}
              theme={theme}
              onUpdated={updated => {
                onUpdated?.(updated);
                setEditingUmpire(null);
              }}
              onDeleted={id => {
                onDeleted?.(id);
                setEditingUmpire(null);
              }}
              onClose={() => setEditingUmpire(null)}
            />
          </div>
        </div>
      )}

      <div className="pt-2">
        <h3 className={cn("text-lg font-bold mb-3", isLight ? "text-slate-900" : "text-white")}>
          📋 Cricket Updates & Rules
        </h3>
        <div
          className={cn(
            "rounded-2xl overflow-hidden border divide-y transition-all",
            isLight
              ? "bg-white border-slate-200 divide-slate-100 shadow-sm"
              : "border-[#2a2a2a] divide-[#2a2a2a]"
          )}
        >
          {[
            {
              title: "New DRS review limit for T20 leagues",
              desc: "Teams now get 2 unsuccessful reviews per innings instead of 1, effective this season.",
              date: "Jul 2026"
            },
            {
              title: "Front-foot no-ball tech mandatory",
              desc: "Local tournaments must use the automated no-ball detection line where available.",
              date: "Jun 2026"
            },
            {
              title: "Concussion substitute rule updated",
              desc: "A like-for-like concussion substitute can now be used without match referee pre-approval.",
              date: "Jun 2026"
            }
          ].map((r, i) => (
            <div
              key={i}
              className={cn("px-4 py-3.5 transition-colors", isLight ? "bg-white hover:bg-slate-50/80" : "bg-[#161616]")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-sm font-bold", isLight ? "text-slate-900" : "text-white")}>{r.title}</span>
                <span className={cn("text-[11px] font-semibold shrink-0", isLight ? "text-slate-500" : "text-gray-500")}>{r.date}</span>
              </div>
              <p className={cn("text-xs mt-1", isLight ? "text-slate-600" : "text-gray-400")}>{r.desc}</p>
            </div>
          ))}
        </div>
        <p className={cn("text-[11px] mt-2", isLight ? "text-slate-500" : "text-gray-600")}>
          Sample updates — real rule feed coming soon.
        </p>
      </div>
    </div>
  );
}
