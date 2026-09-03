import React, { useState, useEffect } from "react";
import { Plus, X, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "../../api";
import { C, cn, normalizePhone } from "../../utils/helpers.jsx";

function UmpireForm({ user, token, onCreated, onUpdated, onDeleted, initialUmpire = null, onClose }) {
  const editing = !!initialUmpire;

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

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

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
      <button onClick={() => setOpen(true)} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5" style={{ border: "1px dashed #2a2a2a", color: "#22c55e" }}>
        <Plus className="w-4 h-4" /> Register as Umpire / Scorer
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn(C, "rounded-2xl p-4 space-y-3")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{editing ? "Edit Umpire / Scorer" : "Register as Umpire / Scorer"}</span>
        <button type="button" onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
          <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Full name</label>
          <input value={user?.name || form.name} readOnly onChange={e => update("name", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Rahul Desai" />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Mobile number</label>
          <input
            value={user?.phone || ""}
            readOnly
            className="w-full rounded-xl px-3 py-2 text-sm font-mono cursor-not-allowed"
            style={{ backgroundColor: "#151515", border: "1px solid #2a2a2a", color: "#6b7a6b" }}
          />
          <p className="text-xs mt-1" style={{ color: "#4a5a4a" }}>From your account. Update it in Edit Profile if it's wrong.</p>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Role</label>
          <div className="relative">
            <select value={form.role} onChange={e => update("role", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white appearance-none pr-7 focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
              {["Umpire", "Scorer", "Umpire + Scorer"].map(r => <option key={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6b7a6b" }} />
          </div>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Experience (years)</label>
          <input type="number" min="0" value={form.experience} onChange={e => update("experience", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="5" />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "#6b7a6b" }}>Fee per match (₹)</label>
          <input type="number" min="1" value={form.fee_per_match} onChange={e => update("fee_per_match", e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="800" />
        </div>
      </div>

      {error && <div className="text-xs text-red-400 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

      <div className="flex gap-2">
        {editing && (
          <button type="button" onClick={handleDelete} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors" style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
            Delete Umpire
          </button>
        )}
        <button type="submit" disabled={submitting || !normalizedPhone} className="flex-1 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors" style={(submitting || !normalizedPhone) ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
          {submitting ? (editing ? "Saving..." : "Registering...") : (editing ? "Save Changes" : "Register")}
        </button>
      </div>
    </form>
  );
}

export default function UmpiresTab({ umpires, onBook, token, user, onCreated, onUpdated, onDeleted }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [editingUmpire, setEditingUmpire] = useState(null);

  const userPhoneNorm = normalizePhone(user?.phone);
  const myUmpire = umpires.find(
    (u) => (u.user_id && user?.id && String(u.user_id) === String(user.id)) || (userPhoneNorm && normalizePhone(u.mobile) === userPhoneNorm)
  );

  const roleColor = (role) => {
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
          <h2 className="text-2xl font-bold text-white">
            Umpires & Scorers
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Book experienced umpires and scorers for your cricket matches.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-[#171717] border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-green-400">
            {umpires.length}
          </div>
          <div className="text-xs text-gray-500">
            Available
          </div>
        </div>
      </div>

      {myUmpire ? (
        <div className="w-full p-4 rounded-2xl flex items-center justify-between gap-3" style={{ backgroundColor: "#151715", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-400 font-bold border border-green-500/20 shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                You are registered as {myUmpire.role || "Umpire"}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                {myUmpire.name} • 📞 {myUmpire.mobile} • ₹{myUmpire.price || myUmpire.fee_per_match || 0}/match
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingUmpire(myUmpire)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#252525] hover:bg-[#333] text-white flex items-center gap-1.5 transition-colors border border-[#333] shrink-0"
          >
            <Pencil className="w-3.5 h-3.5 text-green-400" /> Edit Registration
          </button>
        </div>
      ) : (
        <UmpireForm user={user} token={token} onCreated={onCreated} />
      )}

      {umpires.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center border border-dashed border-[#333]"
          style={{ background: "#151515" }}
        >
          <div className="text-5xl mb-3">🧑‍⚖️</div>

          <h3 className="text-white font-semibold text-lg">
            No Umpires Registered
          </h3>

          <p className="text-gray-500 mt-2">
            Register yourself as an umpire or scorer.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="flex-1 min-w-[160px] rounded-xl px-3 py-2 text-sm text-white bg-[#171717] border border-[#2a2a2a] focus:outline-none focus:border-green-500"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm text-white bg-[#171717] border border-[#2a2a2a] focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm text-white bg-[#171717] border border-[#2a2a2a] focus:outline-none"
            >
              <option value="default">Sort: default</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center border border-dashed border-[#333]"
              style={{ background: "#151515" }}
            >
              <p className="text-gray-500">No umpires match your filters.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
              {filtered.map((u) => {
                const role = u.role || "Umpire";
                const rc = roleColor(role);
                return (
                  <div
                    key={u.id ?? u.name}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-[#161616] hover:bg-[#1c1c1c] transition-colors"
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
                          <span className="text-sm font-semibold text-white truncate">{u.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${rc.bg} ${rc.text}`}>
                            {role}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                              u.avail ? "bg-green-900/60 text-green-300 border border-green-700/50" : "bg-red-900/60 text-red-300 border border-red-700/50"
                            }`}
                          >
                            {u.avail ? "Available" : "Busy"}
                          </span>
                        </div>
                        <div className="sm:hidden text-xs text-gray-400 mt-1 flex items-center gap-3">
                          <span>📞 {u.mobile}</span>
                          <span>🏏 {u.exp}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:block text-xs text-gray-400 font-mono w-28 shrink-0">
                      📞 {u.mobile}
                    </div>

                    <div className="hidden sm:block text-xs text-gray-400 w-20 shrink-0">
                      🏏 {u.exp}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#222] sm:border-0">
                      <div className="text-green-400 font-bold text-sm sm:w-20 text-left sm:text-right shrink-0">
                        {u.price}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingUmpire(u)}
                          title="Edit Umpire"
                          className="p-2 rounded-xl text-xs font-bold transition-colors text-gray-300 hover:text-white bg-[#252525] hover:bg-[#333]"
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
                          className="p-2 rounded-xl text-xs font-bold transition-colors text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={!u.avail}
                          onClick={() => u.avail && onBook(u)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            u.avail ? "bg-green-500 text-black hover:bg-green-400" : "bg-[#252525] text-gray-600 cursor-not-allowed"
                          }`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }} onClick={() => setEditingUmpire(null)}>
          <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <UmpireForm
              user={user}
              token={token}
              initialUmpire={editingUmpire}
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
        <h3 className="text-lg font-bold text-white mb-3">📋 New Rules</h3>
        <div className="rounded-2xl overflow-hidden border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
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
            <div key={i} className="px-4 py-3 bg-[#161616]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{r.title}</span>
                <span className="text-[10px] text-gray-500 shrink-0">{r.date}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mt-2">Sample updates — real rule feed coming soon.</p>
      </div>
    </div>
  );
}
