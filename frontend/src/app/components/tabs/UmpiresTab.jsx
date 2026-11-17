import React, { useState, useEffect, useRef } from "react";
import { Plus, X, ChevronDown, Pencil, Trash2, Filter, Search, RotateCcw, Users, ArrowUpDown, Phone, Award, Shield, FileText, Sparkles, Loader2, Eye, Camera, User, Star, MessageSquare, Lock, Send, CheckCircle2 } from "lucide-react";
import { apiRequest } from "../../api";
import { C, cn, normalizePhone, formatPhoneDisplay } from "../../utils/helpers.jsx";
import CalendarField, { formatDateDisplay } from "../CalendarField.jsx";
import { showToast } from "../../utils/toast.jsx";

function UmpireForm({ user, token, onCreated, onUpdated, onDeleted, initialUmpire = null, onClose, theme = "dark" }) {
  const editing = !!initialUmpire;
  const isLight = theme === "light";
  const fileInputRef = useRef(null);

  const buildForm = (ump, u) => ({
    name: ump?.name || u?.name || "",
    role: ump?.role || "Umpire",
    experience: ump?.experience !== undefined && ump?.experience !== null ? String(ump.experience) : "",
    fee_per_match: ump?.fee_per_match !== undefined && ump?.fee_per_match !== null
      ? String(ump.fee_per_match)
      : (ump?.price ? String(ump.price).replace(/[^0-9.]/g, "") : ""),
    profile_picture_url: ump?.profile_picture_url || ""
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

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => update("profile_picture_url", ev.target.result);
    reader.readAsDataURL(file);
  };

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
          fee_per_match: Number(form.fee_per_match),
          profile_picture_url: form.profile_picture_url || null
        }
      });
      if (editing) {
        showToast.success("Official profile updated successfully!");
        onUpdated?.(res.umpire);
        onClose?.();
      } else {
        showToast.success("Match Official registered successfully!");
        onCreated(res.umpire);
        setForm(buildForm(null, user));
        setOpen(false);
      }
    } catch (err) {
      showToast.error(err, "Could not save — please try again.");
      setError(err.message || "Could not save — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !initialUmpire?.id || !token) return;
    if (!isOwner(initialUmpire)) {
      showToast.warning("Only the user who posted this umpire can delete it.");
      return setError("Only the user who posted this umpire can delete it.");
    }
    if (!window.confirm("Are you sure you want to delete this umpire?")) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/umpires/${initialUmpire.id}`, { method: "DELETE", token });
      showToast.delete("Umpire deleted successfully.");
      onDeleted?.(initialUmpire.id);
      onClose?.();
    } catch (err) {
      showToast.error(err, "Could not delete umpire.");
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
      className={cn(C, "rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 relative overflow-hidden border shadow-2xl")}
      style={
        isLight
          ? {
              backgroundColor: "#ffffff",
              borderColor: "#e2e8f0"
            }
          : {
              backgroundColor: "#0d120e",
              borderColor: "rgba(255,255,255,0.12)"
            }
      }
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl z-10 pointer-events-none" />

      {/* Unified Header */}
      <div className="flex items-start justify-between gap-3 pb-3.5 mb-1 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
            style={{
              backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.12)",
              borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.28)",
              color: isLight ? "#16a34a" : "#4ade80"
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {editing ? "Edit Umpire / Scorer" : "Register as Official"}
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                style={{
                  backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.15)",
                  borderColor: isLight ? "#bbf7d0" : "rgba(34,197,94,0.3)",
                  color: isLight ? "#15803d" : "#4ade80"
                }}
              >
                {editing ? "Official" : "Join Roster"}
              </span>
            </div>
            <p className="text-xs truncate mt-0.5" style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
              {editing ? "Update your match fee, experience, or role" : "Offer match officiating and scoring services to local teams"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }}
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

      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2">
          <label className="text-xs font-bold mb-1.5 block" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>Full name</label>
          <input
            value={user?.name || form.name}
            readOnly
            onChange={e => update("name", e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition-all border opacity-90 cursor-not-allowed"
            style={isLight ? { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" } : { backgroundColor: "#0d130e", borderColor: "#233027", color: "#fff" }}
            placeholder="Rahul Desai"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-bold mb-1.5 block" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>Mobile number</label>
          <input
            value={user?.phone || ""}
            readOnly
            className="w-full rounded-xl px-3.5 py-2.5 text-sm font-mono cursor-not-allowed opacity-90 border"
            style={isLight ? { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0", color: "#64748b" } : { backgroundColor: "#141714", borderColor: "#233027", color: "#8c998c" }}
          />
          <p className="text-[11px] mt-1" style={{ color: isLight ? "#64748b" : "#5f6b62" }}>From your account profile.</p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-bold mb-1.5 block" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>Experience (years)</label>
          <input
            type="number"
            min="0"
            value={form.experience}
            onChange={e => update("experience", e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all border"
            style={isLight ? { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" } : { backgroundColor: "#0d130e", borderColor: "#233027", color: "#fff" }}
            placeholder="5"
          />
          <p className="text-[11px] mt-1" style={{ color: isLight ? "#64748b" : "#5f6b62" }}>Total years officiating.</p>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-bold mb-1.5 block" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>Select Your Officiating Role</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "Umpire", emoji: "🧑‍⚖️", label: "Umpire" },
              { key: "Scorer", emoji: "📝", label: "Scorer" },
              { key: "Umpire + Scorer", emoji: "⚡", label: "Both Roles" }
            ].map(r => {
              const isSelected = form.role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => update("role", r.key)}
                  className={cn(
                    "p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1",
                    isSelected
                      ? isLight
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs text-emerald-800"
                        : "bg-emerald-950/40 border-emerald-500/70 ring-2 ring-emerald-500/30 shadow-xs text-emerald-300"
                      : isLight
                        ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        : "bg-[#0d130e] border-[#233027] text-neutral-300 hover:border-[#2a3c2e]"
                  )}
                >
                  <span className="text-lg">{r.emoji}</span>
                  <span className="text-xs font-bold">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Photo Upload */}
        <div className="col-span-2">
          <label className="text-xs font-bold mb-1.5 block" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
            Profile Photo <span className="font-normal text-[11px]" style={{ color: isLight ? "#64748b" : "#5f6b62" }}>(optional)</span>
          </label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-md border"
              style={{
                background: form.profile_picture_url ? "transparent" : "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.3)"
              }}
            >
              {form.profile_picture_url ? (
                <img src={form.profile_picture_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-white opacity-70" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-[1.02] cursor-pointer"
                style={isLight
                  ? { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" }
                  : { backgroundColor: "#0d130e", borderColor: "#233027", color: "#fff" }
                }
              >
                <Camera className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#4ade80" }} />
                {form.profile_picture_url ? "Change Photo" : "Upload Photo"}
              </button>
              {form.profile_picture_url && (
                <button
                  type="button"
                  onClick={() => { update("profile_picture_url", ""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer hover:opacity-80"
                  style={{ color: isLight ? "#dc2626" : "#f87171" }}
                >
                  <X className="w-3 h-3" /> Remove photo
                </button>
              )}
              <p className="text-[11px]" style={{ color: isLight ? "#64748b" : "#5f6b62" }}>Max 2 MB · JPG, PNG, WEBP</p>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-bold mb-1.5 block" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>Fee per match (₹)</label>
          <input
            type="number"
            min="1"
            value={form.fee_per_match}
            onChange={e => update("fee_per_match", e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all border"
            style={isLight ? { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" } : { backgroundColor: "#0d130e", borderColor: "#233027", color: "#fff" }}
            placeholder="800"
          />
          <p className="text-[11px] mt-1" style={{ color: isLight ? "#64748b" : "#5f6b62" }}>Standard fee charged to organizing teams per match.</p>
        </div>
      </div>

      {error && (
        <div
          className="text-xs rounded-xl p-3 font-medium border"
          style={{
            backgroundColor: isLight ? "#fef2f2" : "rgba(239,68,68,0.1)",
            borderColor: isLight ? "#fecaca" : "rgba(239,68,68,0.25)",
            color: isLight ? "#dc2626" : "#f87171"
          }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
        {editing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border hover:scale-[1.01] active:scale-[0.99] flex-1"
            style={{
              backgroundColor: isLight ? "#fff1f2" : "rgba(239,68,68,0.1)",
              borderColor: isLight ? "#fecdd3" : "rgba(239,68,68,0.3)",
              color: isLight ? "#e11d48" : "#fb7185",
              ...(submitting ? { opacity: 0.6, cursor: "not-allowed", transform: "none" } : {})
            }}
          >
            Delete Umpire
          </button>
        )}
        <button
          type="button"
          onClick={() => { if (editing) onClose?.(); else { setOpen(false); setError(null); } }}
          className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border"
          style={{
            backgroundColor: isLight ? "#f8fafc" : "transparent",
            borderColor: isLight ? "#cbd5e1" : "#1d2a21",
            color: isLight ? "#334155" : "#c8ccc8"
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !normalizedPhone}
          className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
            color: "#ffffff",
            boxShadow: isLight
              ? "0 4px 14px -3px rgba(16,185,129,0.45)"
              : "0 6px 20px -6px rgba(34,197,94,0.7)",
            ...((submitting || !normalizedPhone) ? { opacity: 0.6, cursor: "not-allowed", transform: "none" } : {})
          }}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{editing ? "Saving..." : "Registering..."}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>{editing ? "Save Changes" : "Register as Official"}</span>
            </span>
          )}
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
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => { setOpen(false); setError(null); }}
        >
          <div
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {formElement}
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================================
   UMPIRE DETAILS & REVIEWS MODAL
   ============================================================================ */
function UmpireDetailsModal({
  umpire,
  isLight,
  user,
  token,
  dateFilter,
  onClose,
  onBook,
  onEdit,
  onUpdated,
  roleColor,
  isOwner
}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [hasBooked, setHasBooked] = useState(false);
  const [isOwnerState, setIsOwnerState] = useState(false);
  const [averageRating, setAverageRating] = useState(Number(umpire?.rating) || 0);
  const [reviewsCount, setReviewsCount] = useState(Number(umpire?.reviews_count) || 0);

  // Review submission state
  const [starRating, setStarRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const role = umpire.role || "Umpire";
  const rc = roleColor(role);
  const bookedDates = umpire.bookedDates || umpire.booked_dates || [];
  const isBookedForDate = dateFilter && bookedDates.includes(dateFilter);
  const isAvailable = umpire.avail && !isBookedForDate;
  const formattedPhone = formatPhoneDisplay(umpire.mobile);
  const roleGradient =
    role === "Scorer"
      ? "linear-gradient(135deg,#3b82f6 0%,#0ea5e9 100%)"
      : role === "Umpire + Scorer"
      ? "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)"
      : "linear-gradient(135deg,#22c55e 0%,#10b981 100%)";

  useEffect(() => {
    let mounted = true;
    async function loadReviews() {
      try {
        setLoading(true);
        const res = await apiRequest(`/umpires/${umpire.id}/reviews`, { token });
        if (mounted && res) {
          setReviews(res.reviews || []);
          setCanReview(!!res.can_review);
          setHasBooked(!!res.has_booked);
          setIsOwnerState(!!res.is_owner);
          setAverageRating(Number(res.rating) || 0);
          setReviewsCount(Number(res.reviews_count) || 0);
        }
      } catch (err) {
        console.error("Failed to load umpire reviews:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (umpire?.id) {
      loadReviews();
    }
    return () => { mounted = false; };
  }, [umpire?.id, token]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!token) {
      showToast.warning("Please log in to submit a review.");
      return;
    }
    if (!reviewText.trim()) {
      showToast.warning("Please write your review feedback.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest(`/umpires/${umpire.id}/reviews`, {
        method: "POST",
        token,
        body: { rating: starRating, review_text: reviewText.trim() }
      });
      showToast.success("Official review submitted successfully!");
      setReviewText("");
      setStarRating(5);
      if (res?.review) {
        const updatedList = [res.review, ...reviews];
        setReviews(updatedList);
        const newCount = updatedList.length;
        const newAvg = Number((updatedList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / newCount).toFixed(1));
        setAverageRating(newAvg);
        setReviewsCount(newCount);
        onUpdated?.({ ...umpire, rating: newAvg, reviews_count: newCount });
      }
    } catch (err) {
      showToast.error(err, "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      setDeletingId(reviewId);
      await apiRequest(`/umpires/${umpire.id}/reviews/${reviewId}`, {
        method: "DELETE",
        token
      });
      showToast.delete("Official review deleted successfully.");
      const updatedList = reviews.filter(r => r.id !== reviewId);
      setReviews(updatedList);
      const newCount = updatedList.length;
      const newAvg = newCount > 0
        ? Number((updatedList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / newCount).toFixed(1))
        : 0;
      setAverageRating(newAvg);
      setReviewsCount(newCount);
      onUpdated?.({ ...umpire, rating: newAvg, reviews_count: newCount });
    } catch (err) {
      showToast.error(err, "Could not delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const isAdmin = user?.is_admin === true || (user?.phone && String(user.phone).includes("6382757532"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 relative border shadow-2xl animate-in zoom-in-95 duration-200"
        )}
        style={
          isLight
            ? { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
            : { backgroundColor: "#0f1310", borderColor: "rgba(255,255,255,0.12)" }
        }
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent gradient bar */}
        <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: roleGradient }} />

        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: roleGradient, color: "#fff" }}
            >
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
              Official Details & Reviews
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-200 hover:rotate-90 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "rgba(255,255,255,0.06)",
              borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
              color: isLight ? "#64748b" : "#9aa59c"
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Center Content */}
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          {/* Photo or Avatar */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl overflow-hidden mb-3 border-2"
            style={{
              background: umpire.profile_picture_url ? "transparent" : roleGradient,
              borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.4)",
              boxShadow: "0 8px 24px -4px rgba(0,0,0,0.4)"
            }}
          >
            {umpire.profile_picture_url ? (
              <img src={umpire.profile_picture_url} alt={umpire.name} className="w-full h-full object-cover" />
            ) : (
              umpire.name?.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()
            )}
          </div>

          {/* Name */}
          <h4 className="text-xl font-black tracking-tight mb-1" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
            {umpire.name}
          </h4>

          {/* Badges: Role, Availability, and Reviews Rating Status */}
          <div className="flex items-center gap-2 flex-wrap justify-center mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${rc.bg} ${rc.text}`}>
              {role === "Umpire" && <Shield className="w-3.5 h-3.5" />}
              {role === "Scorer" && <FileText className="w-3.5 h-3.5" />}
              {role === "Umpire + Scorer" && <Award className="w-3.5 h-3.5" />}
              <span>{role}</span>
            </span>

            <span
              className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
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
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Available</span>
                </>
              ) : isBookedForDate ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Booked on {formatDateDisplay(dateFilter)}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-neutral-500" />
                  <span>Busy</span>
                </>
              )}
            </span>

            {/* ⭐ Review Rating Status Pill */}
            <span
              className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
              style={{
                background: "linear-gradient(135deg,rgba(245,158,11,0.15) 0%,rgba(217,119,6,0.12) 100%)",
                border: `1px solid ${isLight ? "#fde68a" : "rgba(245,158,11,0.35)"}`,
                color: isLight ? "#b45309" : "#fbbf24"
              }}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>
                {averageRating > 0 ? `${averageRating} / 5.0` : "No rating"} ({reviewsCount} {reviewsCount === 1 ? "review" : "reviews"})
              </span>
            </span>
          </div>
        </div>

        {/* Grid of basic info */}
        <div
          className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl mb-4"
          style={{
            backgroundColor: isLight ? "#f8fafc" : "#141914",
            border: `1px solid ${isLight ? "#e2e8f0" : "#222c22"}`
          }}
        >
          {/* Match Fee */}
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: isLight ? "#ffffff" : "#1a211a" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
              Match Fee
            </div>
            <div
              className="text-base font-black font-mono"
              style={{
                background: isLight
                  ? "linear-gradient(135deg,#15803d 0%,#0284c7 100%)"
                  : "linear-gradient(135deg,#4ade80 0%,#38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              {umpire.price || `₹${umpire.fee_per_match || 0}/match`}
            </div>
          </div>

          {/* Experience */}
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: isLight ? "#ffffff" : "#1a211a" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
              Experience
            </div>
            <div className="text-base font-black flex items-center gap-1.5" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{umpire.exp || `${umpire.experience || 0} yrs`}</span>
            </div>
          </div>

          {/* Contact Phone */}
          <div className="col-span-2 p-2.5 rounded-xl flex items-center justify-between" style={{ backgroundColor: isLight ? "#ffffff" : "#1a211a" }}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                Phone / Mobile
              </div>
              <div className="text-sm font-bold font-mono flex items-center gap-1.5" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{formattedPhone}</span>
              </div>
            </div>
            {umpire.mobile && (
              <a
                href={`tel:${umpire.mobile}`}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg,#22c55e 0%,#10b981 100%)" }}
              >
                Call Now
              </a>
            )}
          </div>
        </div>

        {/* ─── REVIEW SECTION & STATUS ON THE CARD ─── */}
        <div
          className="rounded-2xl p-4 border space-y-3.5 mb-4"
          style={{
            backgroundColor: isLight ? "#f8fafc" : "#141914",
            borderColor: isLight ? "#e2e8f0" : "#222c22"
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "#222c22" }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                Player Reviews ({reviewsCount})
              </h4>
            </div>
            {averageRating > 0 && (
              <span className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: "#f59e0b" }}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{averageRating} / 5.0</span>
              </span>
            )}
          </div>

          {/* Review Eligibility Banner or Form */}
          {!token ? (
            <div className="rounded-xl p-3 border flex items-center gap-2.5 text-xs" style={{ backgroundColor: isLight ? "#ffffff" : "#1a211a", borderColor: isLight ? "#e2e8f0" : "#283428", color: isLight ? "#64748b" : "#8a968a" }}>
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Log in to check if you can review this official.</span>
            </div>
          ) : isOwnerState ? (
            <div className="rounded-xl p-3 border flex items-center gap-2.5 text-xs" style={{ backgroundColor: isLight ? "#ffffff" : "#1a211a", borderColor: isLight ? "#e2e8f0" : "#283428", color: isLight ? "#64748b" : "#8a968a" }}>
              <span>🛡️</span>
              <span>This is your official profile. Officials cannot leave reviews on their own profile.</span>
            </div>
          ) : !hasBooked ? (
            <div className="rounded-xl p-3 border flex items-start sm:items-center justify-between gap-3 text-xs" style={{ backgroundColor: isLight ? "#ffffff" : "#1a211a", borderColor: isLight ? "#e2e8f0" : "#283428" }}>
              <div className="flex items-center gap-2" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Only teams/players who have <strong>booked this official</strong> can leave a review.</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Verified Bookers Only
              </span>
            </div>
          ) : (
            /* Verified Booker Review Form */
            <form onSubmit={handleSubmitReview} className="rounded-xl p-3 border space-y-2.5" style={{ backgroundColor: isLight ? "#ffffff" : "#1a211a", borderColor: "rgba(34,197,94,0.3)" }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Leave Official Review
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStarRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={cn(
                          "w-4 h-4 transition-colors",
                          (hoverRating ? s <= hoverRating : s <= starRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-500"
                        )}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold ml-1 font-mono" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                    {hoverRating || starRating}.0
                  </span>
                </div>
              </div>

              <textarea
                rows={2}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="How was the officiating, decision accuracy, match flow, and punctuality?..."
                className="w-full rounded-xl p-2.5 text-xs font-medium focus:outline-none border transition-all resize-none"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "#0d130e",
                  borderColor: isLight ? "#cbd5e1" : "#233027",
                  color: isLight ? "#0f172a" : "#ffffff"
                }}
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !reviewText.trim()}
                  className="py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all text-white shadow-md disabled:opacity-50 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)" }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center text-xs flex items-center justify-center gap-2" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>Loading reviews...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-4 text-center" style={{ color: isLight ? "#64748b" : "#8a968a" }}>
                <p className="text-xs font-semibold">No reviews yet for this official.</p>
                <p className="text-[11px] mt-0.5" style={{ color: isLight ? "#94a3b8" : "#5f6b62" }}>
                  Players who have booked this official can share their rating & feedback!
                </p>
              </div>
            ) : (
              reviews.map((r) => {
                const isAuthor = user?.id && Number(r.user_id) === Number(user.id);
                const canDelete = isAuthor || isAdmin;

                return (
                  <div
                    key={r.id}
                    className="rounded-xl p-3 border space-y-1.5 relative transition-all"
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#182018",
                      borderColor: isLight ? "#e2e8f0" : "#243224"
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 overflow-hidden"
                          style={{ background: roleGradient }}
                        >
                          {r.user_avatar ? (
                            <img src={r.user_avatar} alt={r.user_name} className="w-full h-full object-cover" />
                          ) : (
                            (r.user_name || "P").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                            <span>{r.user_name || "MatchConnect Player"}</span>
                            {r.user_team_name && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                                {r.user_team_name}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono" style={{ color: isLight ? "#94a3b8" : "#5f6b62" }}>
                            {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                "w-3 h-3",
                                s <= Math.round(Number(r.rating) || 0)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-neutral-500"
                              )}
                            />
                          ))}
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(r.id)}
                            disabled={deletingId === r.id}
                            title="Delete review"
                            className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: isLight ? "#334155" : "#c8ccc8" }}>
                      {r.review_text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex gap-2.5 pt-1">
          {isOwner && (
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                "py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border hover:scale-[1.02] active:scale-[0.98]"
              )}
              style={{
                backgroundColor: isLight ? "#f1f5f9" : "#1e241e",
                color: isLight ? "#475569" : "#c8d0c8",
                borderColor: isLight ? "#e2e8f0" : "#2a342a"
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer border hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "transparent",
              borderColor: isLight ? "#cbd5e1" : "#1d2a21",
              color: isLight ? "#334155" : "#c8ccc8"
            }}
          >
            Close
          </button>

          {isAvailable && (
            <button
              type="button"
              onClick={() => onBook(umpire, dateFilter)}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-white hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                boxShadow: isLight
                  ? "0 4px 14px -3px rgba(16,185,129,0.45)"
                  : "0 6px 20px -6px rgba(34,197,94,0.7)"
              }}
            >
              <span>Book Official</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UmpiresTab({ umpires, onBook, token, user, onCreated, onUpdated, onDeleted, theme = "dark" }) {
  const isLight = theme === "light";
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [editingUmpire, setEditingUmpire] = useState(null);
  const [viewingUmpire, setViewingUmpire] = useState(null);

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
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 shadow-md overflow-hidden"
              style={{
                background: myUmpire.profile_picture_url ? "transparent" : "linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)",
                color: "#ffffff"
              }}
            >
              {myUmpire.profile_picture_url ? (
                <img src={myUmpire.profile_picture_url} alt={myUmpire.name} className="w-full h-full object-cover" />
              ) : (
                "✓"
              )}
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
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setViewingUmpire(myUmpire)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
              )}
              style={{
                backgroundColor: isLight ? "#ffffff" : "#1a211a",
                color: isLight ? "#0f172a" : "#ffffff",
                border: `1px solid ${isLight ? "#e2e8f0" : "#283428"}`,
                boxShadow: isLight ? "0 1px 3px rgba(15,23,42,0.06)" : "0 2px 8px rgba(0,0,0,0.3)"
              }}
            >
              <Eye className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#4ade80" }} /> View
            </button>
            <button
              type="button"
              onClick={() => setEditingUmpire(myUmpire)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
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
                        {/* Avatar: photo if available, else gradient initials */}
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md transition-transform group-hover:scale-105 group-hover:rotate-3 overflow-hidden"
                          style={{
                            background: u.profile_picture_url ? "transparent" : roleGradient,
                            boxShadow: "0 4px 14px -2px rgba(0, 0, 0, 0.3)"
                          }}
                        >
                          {u.profile_picture_url ? (
                            <img src={u.profile_picture_url} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name?.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()
                          )}
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

                            {Number(u.rating) > 0 && (
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium cursor-pointer transition-transform hover:scale-105"
                                style={{
                                  background: "linear-gradient(135deg,rgba(245,158,11,0.15) 0%,rgba(217,119,6,0.12) 100%)",
                                  border: `1px solid ${isLight ? "#fde68a" : "rgba(245,158,11,0.35)"}`,
                                  color: isLight ? "#b45309" : "#fbbf24"
                                }}
                                onClick={() => setViewingUmpire(u)}
                                title="View rating & reviews"
                              >
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{u.rating} {u.reviews_count ? `(${u.reviews_count})` : ""}</span>
                              </span>
                            )}
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
                                  showToast.delete("Umpire deleted successfully.");
                                  onDeleted?.(u.id);
                                } catch (err) {
                                  showToast.error(err, "Could not delete umpire.");
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

                        {/* View Details Button */}
                        <button
                          type="button"
                          onClick={() => setViewingUmpire(u)}
                          className={cn(
                            "px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-[0.97] border"
                          )}
                          style={{
                            backgroundColor: isLight ? "#f8fafc" : "#1a1f1a",
                            color: isLight ? "#0f172a" : "#e2e8f0",
                            borderColor: isLight ? "#cbd5e1" : "#2a342a"
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" style={{ color: isLight ? "#16a34a" : "#4ade80" }} />
                          <span>Details {u.reviews_count ? `(${u.reviews_count})` : ""}</span>
                        </button>

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

      {/* Centered Official Details & Reviews Modal */}
      {viewingUmpire && (
        <UmpireDetailsModal
          umpire={viewingUmpire}
          isLight={isLight}
          user={user}
          token={token}
          dateFilter={dateFilter}
          onClose={() => setViewingUmpire(null)}
          onBook={(target, df) => {
            setViewingUmpire(null);
            onBook(target, df);
          }}
          onEdit={() => {
            const target = viewingUmpire;
            setViewingUmpire(null);
            setEditingUmpire(target);
          }}
          onUpdated={updated => {
            onUpdated?.(updated);
            setViewingUmpire(updated);
          }}
          roleColor={roleColor}
          isOwner={isOwner(viewingUmpire)}
        />
      )}

      {editingUmpire && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setEditingUmpire(null)}
        >
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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