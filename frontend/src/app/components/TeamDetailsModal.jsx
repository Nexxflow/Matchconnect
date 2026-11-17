import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Star, Users, CheckCircle, XCircle, AlertCircle, Send, Award, Phone, Calendar, Clock, MapPin, MessageSquare, ThumbsUp, Shield, Trash2, Loader2, ChevronLeft, CornerDownRight } from "lucide-react";
import { apiRequest } from "../api";
import { GhostButton, cn } from "../utils/helpers.jsx";
import { showToast } from "../utils/toast.jsx";

function formatPhoneDisplay(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length !== 10) return String(phone);
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function StarRating({ rating = 0, size = "w-4 h-4", max = 5 }) {
  const numRating = Number(rating) || 0;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        let fillPercent = 0;
        if (numRating >= i + 1) {
          fillPercent = 100;
        } else if (numRating > i) {
          fillPercent = Math.min(100, Math.max(0, Math.round((numRating - i) * 100)));
        }

        return (
          <div key={i} className="relative inline-flex items-center justify-center shrink-0">
            {/* Background empty star */}
            <Star
              className={`${size} shrink-0 text-neutral-600`}
              style={{ fill: "#262626" }}
            />
            {/* Foreground filled golden star with percentage clip */}
            {fillPercent > 0 && (
              <Star
                className={`${size} shrink-0 absolute top-0 left-0 text-amber-400 pointer-events-none`}
                style={{
                  fill: "#f59e0b",
                  clipPath: `inset(0 ${100 - fillPercent}% 0 0)`,
                  WebkitClipPath: `inset(0 ${100 - fillPercent}% 0 0)`
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StarPicker({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent!"];

  return (
    <div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(star => {
          const active = star <= (hovered || value);
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="p-1 rounded-lg transition-transform hover:scale-125 focus:outline-none"
            >
              <Star
                className="w-6 h-6 transition-colors"
                style={{
                  color: active ? "#eab308" : "#4a4a4a",
                  fill: active ? "#eab308" : "transparent"
                }}
              />
            </button>
          );
        })}
        <span className="text-xs font-semibold ml-2" style={{ color: "#eab308" }}>
          {labels[hovered || value] || ""}
        </span>
      </div>
    </div>
  );
}

export default function TeamDetailsModal({
  teamName,
  onClose,
  token,
  user,
  unreadReviewIds = null,
  contactFallback = null,
  postedByFallback = null,
  theme = "dark",
  onBack = null,
  backLabel = null
}) {
  const isLight = theme === "light";
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keyboard accessibility & background scroll lock
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (onBack) onBack();
        else onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onBack]);

  // Review form state
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTextInput, setReviewTextInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Review reply state
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [deletingReplyId, setDeletingReplyId] = useState(null);
  const [replyError, setReplyError] = useState(null);

  const isOwnTeam = Boolean(
    (user?.team_name && user.team_name.trim().toLowerCase() === String(teamName || "").trim().toLowerCase()) ||
    (teamData?.team?.created_by && user?.id && Number(teamData.team.created_by) === Number(user.id)) ||
    (teamData?.team?.name && user?.team_name && teamData.team.name.trim().toLowerCase() === user.team_name.trim().toLowerCase())
  );

  const fetchTeamDetails = async () => {
    if (!teamName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/teams/details?team_name=${encodeURIComponent(teamName)}`, { token });
      setTeamData(res);
    } catch (err) {
      console.error("Could not fetch team details:", err);
      setError(err.message || "Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamDetails();

    const onReviewUpdated = (e) => {
      const incomingTeam = e.detail?.team_name;
      if (!incomingTeam || incomingTeam.trim().toLowerCase() === String(teamName || "").trim().toLowerCase()) {
        fetchTeamDetails();
      }
    };
    const onActivityUpdated = () => {
      fetchTeamDetails();
    };
    window.addEventListener("mc:review_submitted", onReviewUpdated);
    window.addEventListener("mc:challenge_accepted", onActivityUpdated);
    window.addEventListener("mc:challenge_cancelled", onActivityUpdated);
    return () => {
      window.removeEventListener("mc:review_submitted", onReviewUpdated);
      window.removeEventListener("mc:challenge_accepted", onActivityUpdated);
      window.removeEventListener("mc:challenge_cancelled", onActivityUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName]);

  const handleDeleteReview = async (reviewId, isAuthor) => {
    const confirmMsg = isAuthor
      ? "Are you sure you want to delete your feedback review?"
      : "Are you sure you want to delete this review as Admin?";
    if (!window.confirm(confirmMsg)) return;
    setDeletingReviewId(reviewId);
    try {
      await apiRequest(`/teams/reviews/${reviewId}`, {
        method: "DELETE",
        token
      });
      await fetchTeamDetails();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mc:review_submitted", { detail: { team_name: teamName } }));
      }
      showToast.delete("Feedback review deleted successfully.");
    } catch (err) {
      showToast.error(err, "Failed to delete review");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleAddReply = async (reviewId) => {
    const text = (replyInputs[reviewId] || "").trim();
    if (!text) return;
    if (!token) {
      showToast.warning("Please log in to reply.");
      setReplyError("Please log in to reply.");
      return;
    }
    setSubmittingReplyId(reviewId);
    setReplyError(null);
    try {
      await apiRequest(`/teams/reviews/${reviewId}/replies`, {
        method: "POST",
        token,
        body: { reply_text: text }
      });
      setReplyInputs(prev => ({ ...prev, [reviewId]: "" }));
      setReplyingReviewId(null);
      await fetchTeamDetails();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mc:review_submitted", { detail: { team_name: teamName } }));
      }
      showToast.success("Reply posted successfully!");
    } catch (err) {
      showToast.error(err, "Failed to post reply");
      setReplyError(err.message || "Failed to post reply");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDeleteReply = async (reviewId, replyId, isAuthor) => {
    const confirmMsg = isAuthor
      ? "Are you sure you want to delete your reply?"
      : "Are you sure you want to delete this reply as Admin?";
    if (!window.confirm(confirmMsg)) return;
    setDeletingReplyId(replyId);
    try {
      await apiRequest(`/teams/reviews/${reviewId}/replies/${replyId}`, {
        method: "DELETE",
        token
      });
      await fetchTeamDetails();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mc:review_submitted", { detail: { team_name: teamName } }));
      }
      showToast.delete("Reply deleted successfully.");
    } catch (err) {
      showToast.error(err, "Failed to delete reply");
    } finally {
      setDeletingReplyId(null);
    }
  };

  const handleSubmitReview = async e => {
    e.preventDefault();
    if (!token) {
      showToast.warning("Please log in to submit a review.");
      setReviewError("Please log in to submit a review.");
      return;
    }
    if (isOwnTeam) {
      showToast.warning("You cannot review your own team. Only opponent teams can leave feedback.");
      setReviewError("You cannot review your own team. Only opponent teams can leave feedback.");
      return;
    }
    if (!reviewTextInput.trim()) {
      showToast.warning("Please enter your feedback comments.");
      setReviewError("Please enter your feedback comments.");
      return;
    }
    if (ratingInput < 1 || ratingInput > 5) {
      showToast.warning("Please choose a rating between 1 and 5 stars.");
      setReviewError("Please choose a rating between 1 and 5 stars.");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      await apiRequest(`/teams/reviews`, {
        method: "POST",
        token,
        body: {
          team_name: teamName,
          rating: ratingInput,
          review_text: reviewTextInput.trim()
        }
      });

      showToast.success("Review submitted successfully!");
      setReviewSuccess("Review submitted successfully!");
      setReviewTextInput("");
      setShowReviewForm(false);
      // Refresh team data to update dynamic ratings and reviews list
      await fetchTeamDetails();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mc:review_submitted", { detail: { team_name: teamName } }));
      }
    } catch (err) {
      showToast.error(err, "Could not submit review.");
      setReviewError(err.message || "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const phoneToDisplay =
    teamData?.team?.contact_no || contactFallback || null;
  const captainToDisplay =
    teamData?.team?.captain_name || postedByFallback || "Team Contact";

  const stats = teamData?.stats || {
    challenges_posted: 0,
    challenges_booked: 0,
    challenges_accepted: 0,
    challenges_cancelled: 0
  };

  const ratingVal = teamData?.rating != null ? teamData.rating : 5.0;
  const reviews = teamData?.reviews || [];
  const reviewsCount = teamData?.reviews_count != null ? teamData.reviews_count : reviews.length;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onBack || onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 border custom-scrollbar"
        style={{
          backgroundColor: theme === "light" ? "#ffffff" : "#0d120e",
          borderColor: theme === "light" ? "#e2e8f0" : "rgba(255,255,255,0.12)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl z-10 pointer-events-none" />

        {/* Back navigation pill if opened from Challenge Details */}
        {onBack && (
          <div className="mb-3">
            <button
              type="button"
              onClick={onBack}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs hover:scale-[1.02] active:scale-[0.98]",
                isLight
                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
              )}
              title={backLabel || "Back to Challenge Details"}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{backLabel || "Back to Challenge Details"}</span>
            </button>
          </div>
        )}

        {/* Header with Close */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: theme === "light" ? "#f1f5f9" : "#222" }}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg,#166534,#14532d)", border: "1px solid #22c55e" }}
            >
              {teamName ? teamName.split(" ").map(w => w[0]).slice(0, 2).join("") : "TC"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold truncate" style={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}>{teamName}</h2>
                {isOwnTeam && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                    Your Team
                  </span>
                )}
                {teamData?.team?.verified && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Captain / Posted by:</span>
                <span className="font-semibold text-green-400">{captainToDisplay}</span>
                {teamData?.team?.village_name && (
                  <span className="text-neutral-500">· 📍 {teamData.team.village_name}</span>
                )}
              </p>
              {phoneToDisplay && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                  <Phone className="w-3.5 h-3.5 text-green-400" />
                  <a
                    href={`tel:${phoneToDisplay}`}
                    className="font-semibold text-green-400 hover:underline"
                  >
                    {formatPhoneDisplay(phoneToDisplay)}
                  </a>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            style={{
              backgroundColor: isLight ? "#f1f5f9" : "#1e211e",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`
            }}
          >
            <X className={cn("w-4 h-4", isLight ? "text-slate-600 hover:text-slate-900" : "text-neutral-400 hover:text-white")} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-neutral-400">
            <div className="inline-block w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2" />
            <div>Loading team profile & stats...</div>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-400">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-80" />
            <div>{error}</div>
            <button
              onClick={fetchTeamDetails}
              className="mt-3 px-3 py-1.5 rounded-xl bg-neutral-800 text-xs text-white hover:bg-neutral-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-5 mt-4">
            {/* Dynamic Reliability & Ratings Card */}
            <div
              className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
              style={{
                background: isLight ? "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)" : "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(20,83,45,0.06) 100%)",
                border: isLight ? "1px solid #bbf7d0" : "1px solid rgba(34,197,94,0.25)"
              }}
            >
              <div className="flex items-center gap-3.5">
                <span className={cn("text-3xl sm:text-4xl font-black", isLight ? "text-slate-900" : "text-white")}>{ratingVal.toFixed(1)}</span>
                <div className="space-y-1">
                  <StarRating rating={ratingVal} size="w-5 h-5" />
                  <div className={cn("text-xs font-medium", isLight ? "text-slate-600" : "text-neutral-400")}>
                    {reviewsCount > 0
                      ? `User Feedback Rating (${reviewsCount} review${reviewsCount === 1 ? "" : "s"})`
                      : "User Feedback Rating (New Team)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Match Challenge Statistics */}
            <div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5", isLight ? "text-slate-600" : "text-neutral-400")}>
                <Users className={cn("w-3.5 h-3.5", isLight ? "text-emerald-600" : "text-green-400")} />
                <span>Match Challenge Activity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Matches they accepted from other teams */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#171a17",
                    border: `1px solid ${isLight ? "#e2e8f0" : "#282d28"}`,
                    boxShadow: isLight ? "0 2px 6px -1px rgba(0,0,0,0.05)" : undefined
                  }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-purple-500/10 text-purple-500">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className={cn("text-2xl font-extrabold", isLight ? "text-slate-900" : "text-white")}>{stats.challenges_accepted}</div>
                  <div className={cn("text-xs font-bold mt-0.5", isLight ? "text-slate-700" : "text-neutral-300")}>Accepted by Them</div>
                  <div className={cn("text-[10px] mt-1", isLight ? "text-slate-500" : "text-neutral-500")}>Accepted other team challenges</div>
                </div>

                {/* 2. How many opponents accepted their challenges */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#171a17",
                    border: `1px solid ${isLight ? "#e2e8f0" : "#282d28"}`,
                    boxShadow: isLight ? "0 2px 6px -1px rgba(0,0,0,0.05)" : undefined
                  }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-emerald-500/10 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className={cn("text-2xl font-extrabold", isLight ? "text-slate-900" : "text-white")}>{stats.challenges_booked}</div>
                  <div className={cn("text-xs font-bold mt-0.5", isLight ? "text-slate-700" : "text-neutral-300")}>Accepted by Others</div>
                  <div className={cn("text-[10px] mt-1", isLight ? "text-slate-500" : "text-neutral-500")}>Opponents accepted their challenges</div>
                </div>

                {/* 3. How many they cancelled of the accepted challenges */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#171a17",
                    border: `1px solid ${isLight ? "#e2e8f0" : "#282d28"}`,
                    boxShadow: isLight ? "0 2px 6px -1px rgba(0,0,0,0.05)" : undefined
                  }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-rose-500/10 text-rose-500">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div className={cn("text-2xl font-extrabold", isLight ? "text-slate-900" : "text-white")}>{stats.challenges_cancelled}</div>
                  <div className={cn("text-xs font-bold mt-0.5", isLight ? "text-slate-700" : "text-neutral-300")}>Cancelled by Them</div>
                  <div className={cn("text-[10px] mt-1", isLight ? "text-slate-500" : "text-neutral-500")}>Accepted challenges they cancelled</div>
                </div>
              </div>
            </div>

            {/* Feedback & Reviews Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className={cn("w-4 h-4", isLight ? "text-emerald-600" : "text-green-400")} />
                  <h3 className={cn("text-sm font-bold flex items-center gap-2", isLight ? "text-slate-900" : "text-white")}>
                    <span>Feedback & Reviews ({reviews.length})</span>
                    {unreadReviewIds && unreadReviewIds.size > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {unreadReviewIds.size} unread
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {isOwnTeam ? (
                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", isLight ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-neutral-800 text-neutral-400 border border-neutral-700/60")}>
                      Opponents only can review
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewForm(prev => !prev);
                        setReviewError(null);
                        setReviewSuccess(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                        isLight
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100"
                          : "text-green-400 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20"
                      )}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{showReviewForm ? "Cancel Review" : "Add Review"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Review submission form */}
              {showReviewForm && !isOwnTeam && (
                <form
                  onSubmit={handleSubmitReview}
                  className="rounded-2xl p-4 mb-4 space-y-3 animate-in fade-in duration-200"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#181a18",
                    border: `1px solid ${isLight ? "#86efac" : "rgba(34,197,94,0.3)"}`,
                    boxShadow: isLight ? "0 4px 12px rgba(0,0,0,0.05)" : undefined
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("text-xs font-semibold", isLight ? "text-slate-900" : "text-white")}>Rate this team:</div>
                    <StarPicker value={ratingInput} onChange={setRatingInput} disabled={submittingReview} />
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={reviewTextInput}
                      onChange={e => setReviewTextInput(e.target.value)}
                      placeholder="Write your feedback about this team (e.g. sportsmanship, punctuality, fair play)..."
                      className={cn(
                        "w-full rounded-xl p-3 text-xs focus:outline-none transition-all resize-none border font-medium",
                        isLight
                          ? "bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
                          : "bg-[#101210] text-white placeholder-neutral-500 border-[#2a2a2a] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
                      )}
                      disabled={submittingReview}
                    />
                  </div>

                  {reviewError && (
                    <div className="text-xs text-red-500 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <GhostButton
                      type="button"
                      disabled={submittingReview}
                      onClick={() => setShowReviewForm(false)}
                      className="text-xs py-1.5 px-3"
                    >
                      Cancel
                    </GhostButton>
                    <button
                      type="submit"
                      disabled={submittingReview || !reviewTextInput.trim()}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                        isLight
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 text-white shadow-emerald-500/20"
                          : "bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 hover:from-emerald-300 text-black font-extrabold shadow-emerald-500/25"
                      )}
                    >
                      {submittingReview ? (
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

              {reviewSuccess && (
                <div className={cn("p-3 mb-3 rounded-xl text-xs flex items-center gap-2", isLight ? "bg-emerald-50 border border-emerald-300 text-emerald-800" : "bg-green-500/10 border border-green-500/30 text-green-400")}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{reviewSuccess}</span>
                </div>
              )}

              {/* Reviews list */}
              {reviews.length === 0 ? (
                <div
                  className="rounded-2xl p-6 text-center text-xs"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#151715",
                    border: `1px dashed ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
                    color: isLight ? "#64748b" : "#6b7a6b"
                  }}
                >
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50 text-neutral-400" />
                  <p className={cn("font-semibold", isLight ? "text-slate-800" : "text-neutral-300")}>No reviews yet for {teamName}</p>
                  <p className={cn("mt-1", isLight ? "text-slate-500" : "text-neutral-500")}>
                    {isOwnTeam
                      ? "Feedback reviews and ratings from opponents in Find Match will appear here."
                      : "Be the first team to leave a feedback review!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {reviews.map(r => {
                    const isUnread = Boolean(
                      unreadReviewIds && (unreadReviewIds.has(String(r.id)) || unreadReviewIds.has(Number(r.id)))
                    );
                    const isReviewAuthor = Boolean(user?.id && Number(r.reviewer_user_id) === Number(user.id));
                    const canDeleteReview = Boolean(user?.id && (user?.is_admin || isReviewAuthor));
                    const canReply = Boolean(user?.id && (isOwnTeam || user?.is_admin));
                    const replies = Array.isArray(r.replies) ? r.replies : [];
                    const isReplying = replyingReviewId === r.id;

                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl p-3.5 transition-colors relative"
                        style={{
                          backgroundColor: isUnread
                            ? (isLight ? "rgba(239, 68, 68, 0.06)" : "rgba(239, 68, 68, 0.08)")
                            : (isLight ? "#f8fafc" : "#161816"),
                          border: isUnread ? "1px solid rgba(239, 68, 68, 0.4)" : `1px solid ${isLight ? "#e2e8f0" : "#242724"}`
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs relative shrink-0"
                              style={{
                                backgroundColor: isLight ? "#e2e8f0" : "#242d24",
                                border: `1px solid ${isLight ? "#cbd5e1" : "#334433"}`,
                                color: isLight ? "#0f172a" : "#ffffff"
                              }}
                            >
                              {(r.reviewer_name || "P")[0].toUpperCase()}
                              {isUnread && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                              )}
                            </div>
                            <div>
                              <div className={cn("text-xs font-bold leading-tight flex items-center gap-1.5 flex-wrap", isLight ? "text-slate-900" : "text-white")}>
                                <span>{r.reviewer_name || "Cricket Player"}</span>
                                {r.reviewer_team_name && (
                                  <span className={cn("font-normal text-[11px]", isLight ? "text-slate-500" : "text-neutral-400")}>
                                    ({r.reviewer_team_name})
                                  </span>
                                )}
                                {isUnread && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-red-500/20 border border-red-500/40 text-[9px] font-bold text-red-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Unread msg
                                  </span>
                                )}
                              </div>
                              <div className={cn("text-[10px] mt-0.5", isLight ? "text-slate-500" : "text-neutral-500")}>
                                {r.created_at
                                  ? new Date(r.created_at).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                      timeZone: "Asia/Kolkata"
                                    })
                                  : "Recent"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <StarRating rating={r.rating} size="w-3.5 h-3.5" />
                            {canDeleteReview && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(r.id, isReviewAuthor)}
                                disabled={deletingReviewId === r.id}
                                title={isReviewAuthor ? "Delete your review" : "Delete review (Admin)"}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                              >
                                {deletingReviewId === r.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <p className={cn("text-xs mt-2.5 pl-9 leading-relaxed", isLight ? "text-slate-700 font-medium" : "text-neutral-300")}>
                          "{r.review_text}"
                        </p>

                        {/* Replies & Team response area */}
                        <div className="mt-3 pl-9 space-y-2">
                          {/* List of existing replies */}
                          {replies.length > 0 && (
                            <div className="space-y-2 pt-1 border-t border-dashed" style={{ borderColor: isLight ? "#e2e8f0" : "#282a28" }}>
                              {replies.map(rep => {
                                const isReplyAuthor = Boolean(user?.id && Number(rep.user_id) === Number(user.id));
                                const canDeleteReply = Boolean(user?.id && (user?.is_admin || isReplyAuthor));
                                return (
                                  <div
                                    key={rep.id}
                                    className={cn(
                                      "rounded-xl p-2.5 text-xs border relative transition-all",
                                      isLight
                                        ? "bg-emerald-50/70 border-emerald-200 text-slate-800"
                                        : "bg-emerald-950/25 border-emerald-800/40 text-neutral-200"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-emerald-500 text-[11px] flex items-center gap-1">
                                          <CornerDownRight className="w-3 h-3 text-emerald-500 inline shrink-0" />
                                          {rep.user_name || "Team Member"}
                                        </span>
                                        <span className={cn(
                                          "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md border",
                                          isLight
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                        )}>
                                          {rep.user_team_name ? `${rep.user_team_name} (Team)` : "Team Member"}
                                        </span>
                                        <span className={cn("text-[10px]", isLight ? "text-slate-500" : "text-neutral-500")}>
                                          {rep.created_at
                                            ? new Date(rep.created_at).toLocaleString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                hour: "numeric",
                                                minute: "2-digit",
                                                hour12: true,
                                                timeZone: "Asia/Kolkata"
                                              })
                                            : "Just now"}
                                        </span>
                                      </div>

                                      {canDeleteReply && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteReply(r.id, rep.id, isReplyAuthor)}
                                          disabled={deletingReplyId === rep.id}
                                          title={isReplyAuthor ? "Delete your reply" : "Delete reply (Admin)"}
                                          className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                                        >
                                          {deletingReplyId === rep.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                                          ) : (
                                            <Trash2 className="w-3 h-3" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                    <p className={cn("text-xs leading-relaxed pl-4 font-normal", isLight ? "text-slate-700" : "text-neutral-300")}>
                                      {rep.reply_text}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reply Toggle for Team Members or Admin */}
                          {canReply && (
                            <div className="pt-1 flex items-center justify-start">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingReviewId(isReplying ? null : r.id);
                                  setReplyError(null);
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer border",
                                  isReplying
                                    ? "bg-emerald-500 text-black border-emerald-500 font-bold"
                                    : isLight
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                                )}
                              >
                                <CornerDownRight className="w-3.5 h-3.5" />
                                <span>{isReplying ? "Cancel Reply" : "Reply as Team"}</span>
                              </button>
                            </div>
                          )}

                          {/* Inline Reply Form */}
                          {isReplying && canReply && (
                            <div className={cn(
                              "p-3 rounded-xl border mt-2 animate-in fade-in zoom-in-95 duration-150 space-y-2",
                              isLight ? "bg-slate-50 border-slate-200" : "bg-[#181a18] border-neutral-800"
                            )}>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-500">
                                <span className="flex items-center gap-1">
                                  <CornerDownRight className="w-3 h-3" />
                                  Replying on behalf of {teamName}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  {user?.is_admin ? "Posting as Admin / Team Representative" : "Team Member"}
                                </span>
                              </div>

                              <textarea
                                rows={2}
                                value={replyInputs[r.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReplyInputs(prev => ({ ...prev, [r.id]: val }));
                                }}
                                placeholder="Write your team's response to this review..."
                                disabled={submittingReplyId === r.id}
                                className={cn(
                                  "w-full px-3 py-2 text-xs rounded-lg border outline-hidden transition-all resize-none",
                                  isLight
                                    ? "bg-white text-slate-800 border-slate-300 focus:border-emerald-500"
                                    : "bg-black/60 text-white border-neutral-700 focus:border-emerald-500"
                                )}
                              />

                              {replyError && replyingReviewId === r.id && (
                                <p className="text-[11px] text-red-500 font-semibold">{replyError}</p>
                              )}

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingReviewId(null);
                                    setReplyError(null);
                                  }}
                                  disabled={submittingReplyId === r.id}
                                  className={cn(
                                    "px-2.5 py-1 text-xs rounded-lg border font-medium cursor-pointer transition-colors",
                                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
                                  )}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddReply(r.id)}
                                  disabled={submittingReplyId === r.id || !(replyInputs[r.id] || "").trim()}
                                  className="px-3 py-1 text-xs rounded-lg font-bold bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                  {submittingReplyId === r.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Posting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3 h-3" />
                                      <span>Send Reply</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-sm",
                    isLight
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700"
                      : "bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-400"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{backLabel || "Back to Challenge Details"}</span>
                </button>
              )}
              <GhostButton onClick={onClose} className={cn("text-center py-2.5", onBack ? "flex-1" : "w-full")}>
                Close
              </GhostButton>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
