import React, { useState, useEffect } from "react";
import { Plus, X, ChevronDown, Pencil, Trash2, Filter, Search, RotateCcw, Users, ArrowUpDown, Phone, Award, Shield, FileText, Sparkles } from "lucide-react";
import { apiRequest } from "../../api";
import { C, cn, normalizePhone, formatPhoneDisplay } from "../../utils/helpers.jsx";
import CalendarField, { formatDateDisplay } from "../CalendarField.jsx";

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

  const renderTriggerButton = () => (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
      )}
      style={{
        background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
        color: "#ffffff",
        boxShadow: isLight
          ? "0 4px 14px -3px rgba(16,185,129,0.45)"
          : "0 6px 20px -6px rgba(34,197,94,0.7)"
      }}
    >
      <Plus className="w-4 h-4" /> Register as Umpire / Scorer
    </button>
  );

  const formElement = (
    <form
      onSubmit={handleSubmit}
      className={cn(C, "rounded-2xl p-5 space-y-4 relative overflow-hidden")}
      style={
        isLight
          ? {
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)"
            }
          : {
              backgroundColor: "#141414",
              border: "1px solid #2a2a2a",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }
      }
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7,#f97316,#ec4899)" }} />
      <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#222" }}>
        <span
          className={cn("text-base font-bold flex items-center gap-2")}
          style={{
            background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: isLight ? "#16a34a" : "#22c55e", WebkitTextFillColor: "initial" }} />
          {editing ? "Edit Umpire / Scorer" : "Register as Umpire / Scorer"}
        </span>
        <button
          type="button"
          onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
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
        <div
          className="text-xs rounded-xl p-3 font-medium"
          style={{
            backgroundColor: isLight ? "#fef2f2" : "rgba(239,68,68,0.1)",
            border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.2)"}`,
            color: isLight ? "#dc2626" : "#f87171"
          }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-2.5 pt-1">
        {editing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(220,38,38,0.15) 100%)",
              border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.35)"}`,
              color: isLight ? "#dc2626" : "#f87171",
              ...(submitting ? { opacity: 0.6, cursor: "not-allowed", transform: "none" } : {})
            }}
          >
            Delete Umpire
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !normalizedPhone}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
            color: "#ffffff",
            boxShadow: isLight
              ? "0 4px 14px -3px rgba(16,185,129,0.45)"
              : "0 6px 20px -6px rgba(34,197,94,0.7)",
            ...((submitting || !normalizedPhone) ? { opacity: 0.6, cursor: "not-allowed", transform: "none" } : {})
          }}
        >
          {submitting ? (editing ? "Saving..." : "Registering...") : (editing ? "Save Changes" : "Register as Umpire / Scorer")}
        </button>
      </div>
    </form>
  );

  if (editing) {
    return formElement;
  }

  return (
    <>
      {renderTriggerButton()}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => { setOpen(false); setError(null); }}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}
          >
            {formElement}
          </div>
        </div>
      )}
    </>
  );
}

export default function UmpiresTab({ umpires, onBook, token, user, onCreated, onUpdated, onDeleted, theme = "dark" }) {
  const isLight = theme === "light";
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
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

  const activeFilters = [];
  if (query.trim()) {
    activeFilters.push({
      id: "search",
      label: `"${query.trim()}"`,
      clear: () => setQuery("")
    });
  }
  if (dateFilter) {
    activeFilters.push({
      id: "date",
      label: `📅 ${formatDateDisplay(dateFilter)}`,
      clear: () => setDateFilter(null)
    });
  }
  if (roleFilter !== "All") {
    activeFilters.push({
      id: "role",
      label: `🧑‍⚖️ ${roleFilter}`,
      clear: () => setRoleFilter("All")
    });
  }
  if (sortBy !== "default") {
    const sortLabels = {
      price_low: "Price: Low to High",
      price_high: "Price: High to Low",
      exp_high: "Experience: High to Low",
      exp_low: "Experience: Low to High",
      name: "Name: A to Z"
    };
    activeFilters.push({
      id: "sort",
      label: `↕️ ${sortLabels[sortBy] || sortBy}`,
      clear: () => setSortBy("default")
    });
  }

  const clearAllFilters = () => {
    setQuery("");
    setDateFilter(null);
    setRoleFilter("All");
    setSortBy("default");
  };

  return (
    <div className="space-y-6">
      {/* Top Header section with Title on left and Register button on right top corner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pb-0.5">
        <div>
          <h2
            className={cn("text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2")}
            style={{
              background: isLight
                ? "linear-gradient(135deg,#0f172a 0%,#15803d 50%,#3b82f6 100%)"
                : "linear-gradient(135deg,#ffffff 0%,#4ade80 50%,#60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            <span>🧑‍⚖️</span>
            Umpires & Scorers
          </h2>
          <p className={cn("text-xs sm:text-sm mt-1", isLight ? "text-slate-600" : "text-gray-400")}>
            Book experienced umpires and scorers for your cricket matches
          </p>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          {!myUmpire ? (
            <UmpireForm user={user} token={token} onCreated={onCreated} theme={theme} />
          ) : (
            <button
              type="button"
              onClick={() => setEditingUmpire(myUmpire)}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
              )}
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                color: "#ffffff",
                boxShadow: isLight
                  ? "0 4px 14px -3px rgba(16,185,129,0.45)"
                  : "0 6px 20px -6px rgba(34,197,94,0.7)"
              }}
            >
              <Pencil className="w-4 h-4" /> Edit Registration
            </button>
          )}
        </div>
      </div>

      {myUmpire && (
        <div
          className="w-full p-4 rounded-2xl flex items-center justify-between gap-3 transition-all relative overflow-hidden"
          style={
            isLight
              ? {
                  background: "linear-gradient(135deg,#ecfdf5 0%,#f0f9ff 100%)",
                  border: "1px solid #a7f3d0",
                  boxShadow: "0 4px 14px -2px rgba(22, 163, 74, 0.12)"
                }
              : {
                  background: "linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(59,130,246,0.08) 100%)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  boxShadow: "0 8px 24px -6px rgba(34,197,94,0.25)"
                }
          }
        >
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 shadow-md"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)",
                color: "#ffffff"
              }}
            >
              ✓
            </div>
            <div className="min-w-0">
              <div
                className={cn("text-sm font-bold flex items-center gap-2 truncate")}
                style={{
                  background: isLight
                    ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
                    : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
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
              "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
            )}
            style={{
              backgroundColor: isLight ? "#ffffff" : "#252525",
              color: isLight ? "#0f172a" : "#ffffff",
              border: `1px solid ${isLight ? "#e2e8f0" : "#333"}`,
              boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            <Pencil className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#4ade80" }} /> Edit Registration
          </button>
        </div>
      )}

      {umpires.length === 0 ? (
        <div
          className={cn(
            "rounded-2xl p-10 text-center border border-dashed relative overflow-hidden"
          )}
          style={{
            backgroundColor: isLight ? "#ffffff" : "#151515",
            borderColor: isLight ? "#cbd5e1" : "#333"
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
          <div
            className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl shadow-md"
            style={{ background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)" }}
          >
            🧑‍⚖️
          </div>
          <h3 className={cn("font-bold text-lg", isLight ? "text-slate-900" : "text-white")}>
            No Umpires Registered
          </h3>
          <p className={cn("text-sm mt-2", isLight ? "text-slate-500" : "text-gray-500")}>
            Register yourself as an umpire or scorer.
          </p>
        </div>
      ) : (
        <>
          {/* FILTER OFFICIALS BAR */}
          <div className="space-y-2.5">
            {/* Header: Title, match count, and reset button */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isLight ? "#334155" : "#a6b5a6" }}>
                  Filter Officials
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: "linear-gradient(135deg,#22c55e 0%,#10b981 100%)",
                    color: "#ffffff",
                    boxShadow: isLight ? "0 2px 6px -1px rgba(16,185,129,0.4)" : "0 2px 8px -2px rgba(34,197,94,0.6)"
                  }}
                >
                  {filtered.length} official{filtered.length === 1 ? "" : "s"}
                </span>
              </div>

              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer hover:scale-105"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            {/* UNIFIED MERGED FILTER BAR */}
            <div
              className={cn(
                "rounded-2xl transition-all duration-200 border",
                "flex flex-col md:flex-row md:items-center",
                isLight
                  ? "bg-white border-slate-200 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10"
                  : "bg-[#111411] border-[#252c25] shadow-lg focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10"
              )}
            >
              {/* 1. Search Section */}
              <div className="flex-1 flex items-center px-3.5 py-2.5 min-w-0">
                <Search
                  className="w-4 h-4 shrink-0 mr-2.5 transition-colors"
                  style={{ color: query ? (isLight ? "#16a34a" : "#22c55e") : (isLight ? "#94a3b8" : "#6b7a6b") }}
                />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by umpire or scorer name..."
                  className="w-full text-xs font-medium bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-[#556055]"
                  style={{ color: isLight ? "#0f172a" : "#ffffff" }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 ml-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: isLight ? "#64748b" : "#9ca3af" }} />
                  </button>
                )}
              </div>

              {/* Divider between Search and Filters */}
              <div className="hidden md:block w-[1px] h-7 bg-slate-200 dark:bg-[#252d25] shrink-0" />
              <div className="block md:hidden h-[1px] w-full bg-slate-100 dark:bg-[#1b221b]" />

              {/* 2. Dropdowns Section: Date, Role, Sort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#252d25] shrink-0">
                {/* Date */}
                <div className="px-3.5 py-2 sm:py-2.5 flex items-center min-w-[145px]">
                  <CalendarField
                    value={dateFilter}
                    onChange={setDateFilter}
                    theme={theme}
                    placeholder="Any Date"
                    clearable={true}
                    iconPosition="left"
                    className="w-full"
                    buttonStyle={{
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      padding: "0",
                      fontSize: "0.75rem",
                      fontWeight: dateFilter ? "600" : "500",
                    }}
                  />
                </div>

                {/* Role */}
                <div className="relative px-3.5 py-2.5 flex items-center min-w-[130px]">
                  <Users
                    className="w-3.5 h-3.5 shrink-0 mr-2"
                    style={{ color: roleFilter !== "All" ? (isLight ? "#16a34a" : "#4ade80") : (isLight ? "#64748b" : "#6b7a6b") }}
                  />
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-none appearance-none pr-5 cursor-pointer font-medium truncate"
                    style={{
                      color: roleFilter !== "All" ? (isLight ? "#0f172a" : "#ffffff") : (isLight ? "#64748b" : "#8a968a"),
                      fontWeight: roleFilter !== "All" ? "600" : "500"
                    }}
                  >
                    {roles.map(r => (
                      <option key={r} value={r} className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>
                        {r === "All" ? "All Roles" : r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: isLight ? "#64748b" : "#8a968a" }} />
                </div>

                {/* Sort */}
                <div className="relative px-3.5 py-2.5 flex items-center min-w-[135px]">
                  <ArrowUpDown
                    className="w-3.5 h-3.5 shrink-0 mr-2"
                    style={{ color: sortBy !== "default" ? (isLight ? "#16a34a" : "#4ade80") : (isLight ? "#64748b" : "#6b7a6b") }}
                  />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-none appearance-none pr-5 cursor-pointer font-medium truncate"
                    style={{
                      color: sortBy !== "default" ? (isLight ? "#0f172a" : "#ffffff") : (isLight ? "#64748b" : "#8a968a"),
                      fontWeight: sortBy !== "default" ? "600" : "500"
                    }}
                  >
                    <option value="default" className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>Default Sort</option>
                    <option value="price_low" className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>Price: Low to High</option>
                    <option value="price_high" className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>Price: High to Low</option>
                    <option value="exp_high" className={isLight ? "bg-white text-slate-800" : "bg-[#161a16] text-[#c8ccc8]"}>Experience: High to Low</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" style={{ color: isLight ? "#64748b" : "#8a968a" }} />
                </div>
              </div>
            </div>

            {/* 3. Active filter tags pill chips */}
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 px-1 animate-[fadeIn_.15s_ease-out]">
                <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
                  Active:
                </span>
                {activeFilters.map(af => (
                  <span
                    key={af.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all group"
                    style={{
                      backgroundColor: isLight ? "#f0fdf4" : "rgba(34,197,94,0.12)",
                      border: `1px solid ${isLight ? "#bbf7d0" : "rgba(34,197,94,0.3)"}`,
                      color: isLight ? "#15803d" : "#4ade80"
                    }}
                  >
                    <span>{af.label}</span>
                    <button
                      type="button"
                      onClick={af.clear}
                      className="hover:opacity-70 transition-opacity p-0.5 rounded-full cursor-pointer"
                      title="Remove this filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div
              className={cn(C, "rounded-2xl p-8 text-center relative overflow-hidden")}
              style={{
                backgroundColor: isLight ? "#ffffff" : undefined,
                border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)" }}
              >
                🧑‍⚖️
              </div>
              <div className="text-sm font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                No umpires or scorers match your filters
              </div>
              <p className="text-xs mt-1" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                Try adjusting your search query, date availability, role, or sorting.
              </p>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-3.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                    color: "#ffffff",
                    boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((u) => {
                const role = u.role || "Umpire";
                const rc = roleColor(role);
                const bookedDates = u.bookedDates || u.booked_dates || [];
                const isBookedForDate = dateFilter && bookedDates.includes(dateFilter);
                const isAvailable = u.avail && !isBookedForDate;
                const formattedPhone = formatPhoneDisplay(u.mobile);

                const roleGradient =
                  role === "Scorer"
                    ? "linear-gradient(135deg,#3b82f6 0%,#0ea5e9 100%)"
                    : role === "Umpire + Scorer"
                    ? "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)"
                    : "linear-gradient(135deg,#22c55e 0%,#10b981 100%)";

                return (
                  <div
                    key={u.id ?? u.name}
                    className={cn(
                      "rounded-2xl p-4 sm:p-4.5 transition-all duration-200 group relative overflow-hidden hover:shadow-xl"
                    )}
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#131613",
                      border: `1px solid ${isLight ? "#e2e8f0" : "#222922"}`,
                      boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : undefined
                    }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: roleGradient }} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Avatar + Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Gradient Avatar */}
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md transition-transform group-hover:scale-105 group-hover:rotate-3"
                          style={{
                            background: roleGradient,
                            boxShadow: "0 4px 14px -2px rgba(0, 0, 0, 0.3)"
                          }}
                        >
                          {u.name?.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}
                        </div>

                        {/* Name, Role, Availability */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={cn("text-base font-bold truncate", isLight ? "text-slate-900" : "text-white")}>
                              {u.name}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0 ${rc.bg} ${rc.text}`}>
                              {role === "Umpire" && <Shield className="w-3 h-3" />}
                              {role === "Scorer" && <FileText className="w-3 h-3" />}
                              {role === "Umpire + Scorer" && <Award className="w-3 h-3" />}
                              <span>{role}</span>
                            </span>
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 inline-flex items-center gap-1.5"
                              )}
                              style={
                                isAvailable
                                  ? {
                                      background: "linear-gradient(135deg,rgba(34,197,94,0.15) 0%,rgba(6,182,212,0.12) 100%)",
                                      color: isLight ? "#15803d" : "#4ade80",
                                      border: `1px solid ${isLight ? "#a7f3d0" : "rgba(34,197,94,0.35)"}`
                                    }
                                  : isBookedForDate
                                  ? {
                                      background: "linear-gradient(135deg,rgba(239,68,68,0.15) 0%,rgba(236,72,153,0.12) 100%)",
                                      color: isLight ? "#dc2626" : "#f87171",
                                      border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.35)"}`
                                    }
                                  : {
                                      backgroundColor: isLight ? "#f1f5f9" : "rgba(115,115,115,0.15)",
                                      color: isLight ? "#64748b" : "#a3a3a3",
                                      border: `1px solid ${isLight ? "#e2e8f0" : "rgba(115,115,115,0.3)"}`
                                    }
                              }
                            >
                              {isAvailable ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Available</span>
                                </>
                              ) : isBookedForDate ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  <span>Booked ({formatDateDisplay(dateFilter)})</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                                  <span>Busy</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Quick Info Tags (Phone & Experience) */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono font-medium"
                              style={{
                                backgroundColor: isLight ? "#f8fafc" : "#1a1f1a",
                                border: `1px solid ${isLight ? "#e2e8f0" : "#283228"}`,
                                color: isLight ? "#475569" : "#a6b5a6"
                              }}
                            >
                              <Phone className="w-3 h-3" style={{ color: isLight ? "#16a34a" : "#22c55e" }} />
                              <span>{formattedPhone}</span>
                            </span>

                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium"
                              style={{
                                background: "linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(236,72,153,0.08) 100%)",
                                border: `1px solid ${isLight ? "#fde68a" : "rgba(245,158,11,0.3)"}`,
                                color: isLight ? "#b45309" : "#fbbf24"
                              }}
                            >
                              <Award className="w-3 h-3" style={{ color: isLight ? "#d97706" : "#fbbf24" }} />
                              <span>{u.exp || `${u.experience || 0} yrs`} experience</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Fee + Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-[#222922] shrink-0">
                        {/* Fee per match */}
                        <div className="text-left sm:text-right pr-1 sm:pr-2">
                          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                            Match Fee
                          </div>
                          <div
                            className="text-lg font-black font-mono"
                            style={{
                              background: isLight
                                ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
                                : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text"
                            }}
                          >
                            {u.price}
                          </div>
                        </div>

                        {/* Owner edit/delete buttons */}
                        {isOwner(u) && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingUmpire(u)}
                              title="Edit Registration"
                              className={cn(
                                "p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.08] active:scale-[0.92] shadow-xs"
                              )}
                              style={{
                                backgroundColor: isLight ? "#f1f5f9" : "#1e241e",
                                color: isLight ? "#475569" : "#c8d0c8",
                                border: `1px solid ${isLight ? "#e2e8f0" : "#2a342a"}`
                              }}
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
                              title="Delete Official"
                              className={cn(
                                "p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.08] active:scale-[0.92] shadow-xs"
                              )}
                              style={{
                                background: "linear-gradient(135deg,rgba(239,68,68,0.12) 0%,rgba(220,38,38,0.12) 100%)",
                                color: isLight ? "#dc2626" : "#f87171",
                                border: `1px solid ${isLight ? "#fecaca" : "rgba(239,68,68,0.3)"}`
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Book Official Button */}
                        <button
                          disabled={!isAvailable}
                          onClick={() => isAvailable && onBook(u, dateFilter)}
                          className={cn(
                            "px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                          )}
                          style={
                            isAvailable
                              ? {
                                  background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                                  color: "#ffffff",
                                  boxShadow: isLight
                                    ? "0 4px 14px -3px rgba(16,185,129,0.45)"
                                    : "0 6px 20px -6px rgba(34,197,94,0.7)"
                                }
                              : {
                                  backgroundColor: isLight ? "#f1f5f9" : "#1a1f1a",
                                  color: isLight ? "#94a3b8" : "#6b726b",
                                  cursor: "not-allowed",
                                  transform: "none",
                                  border: `1px solid ${isLight ? "#e2e8f0" : "#263026"}`
                                }
                          }
                        >
                          {isAvailable ? "Book Official" : "Unavailable"}
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
    </div>
  );
}