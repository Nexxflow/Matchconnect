import React, { useState, useEffect } from "react";
import { X, Star, Users, CheckCircle, XCircle, AlertCircle, Send, Award, Phone, Calendar, MapPin, MessageSquare, ThumbsUp, Shield, Trash2 } from "lucide-react";
import { apiRequest } from "../api";
import { GhostButton } from "../utils/helpers.jsx";

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
}) {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review form state
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTextInput, setReviewTextInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

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

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete your feedback review?")) return;
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
    } catch (err) {
      alert(err.message || "Failed to delete review");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleSubmitReview = async e => {
    e.preventDefault();
    if (!token) {
      setReviewError("Please log in to submit a review.");
      return;
    }
    if (isOwnTeam) {
      setReviewError("You cannot review your own team. Only opponent teams can leave feedback.");
      return;
    }
    if (!reviewTextInput.trim()) {
      setReviewError("Please enter a review description.");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      const res = await apiRequest("/teams/reviews", {
        method: "POST",
        token,
        body: {
          team_name: teamName,
          rating: ratingInput,
          review_text: reviewTextInput.trim()
        }
      });

      setReviewSuccess("Review submitted successfully!");
      setReviewTextInput("");
      setShowReviewForm(false);
      // Refresh team data to update dynamic ratings and reviews list
      await fetchTeamDetails();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mc:review_submitted", { detail: { team_name: teamName } }));
      }
    } catch (err) {
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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 relative animate-in fade-in zoom-in-95 duration-150 custom-scrollbar"
        style={{
          backgroundColor: "#121412",
          border: "1px solid #2a2a2a",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: "#222" }}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg,#166534,#14532d)", border: "1px solid #22c55e" }}
            >
              {teamName ? teamName.split(" ").map(w => w[0]).slice(0, 2).join("") : "TC"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white truncate">{teamName}</h2>
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
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0"
            style={{ backgroundColor: "#1e211e", border: "1px solid #2a2a2a" }}
          >
            <X className="w-4 h-4 text-neutral-400 hover:text-white" />
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
                background: "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(20,83,45,0.06) 100%)",
                border: "1px solid rgba(34,197,94,0.25)"
              }}
            >
              <div className="flex items-center gap-3.5">
                <span className="text-3xl sm:text-4xl font-black text-white">{ratingVal.toFixed(1)}</span>
                <div className="space-y-1">
                  <StarRating rating={ratingVal} size="w-5 h-5" />
                  <div className="text-xs font-medium text-neutral-400">
                    {reviewsCount > 0
                      ? `User Feedback Rating (${reviewsCount} review${reviewsCount === 1 ? "" : "s"})`
                      : "User Feedback Rating (New Team)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Match Challenge Statistics - 3 Requested Highlights */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-green-400" />
                <span>Match Challenge Activity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Matches they accepted from other teams */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all hover:border-neutral-700"
                  style={{ backgroundColor: "#171a17", border: "1px solid #282d28" }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-purple-500/10 text-purple-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats.challenges_accepted}</div>
                  <div className="text-xs font-bold text-neutral-300 mt-0.5">Accepted by Them</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Accepted other team challenges</div>
                </div>

                {/* 2. How many opponents accepted their challenges */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all hover:border-neutral-700"
                  style={{ backgroundColor: "#171a17", border: "1px solid #282d28" }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats.challenges_booked}</div>
                  <div className="text-xs font-bold text-neutral-300 mt-0.5">Accepted by Others</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Opponents accepted their challenges</div>
                </div>

                {/* 3. How many they cancelled of the accepted challenges */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all hover:border-neutral-700"
                  style={{ backgroundColor: "#171a17", border: "1px solid #282d28" }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-rose-500/10 text-rose-400">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats.challenges_cancelled}</div>
                  <div className="text-xs font-bold text-neutral-300 mt-0.5">Cancelled by Them</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Accepted challenges they cancelled</div>
                </div>
              </div>
            </div>

            {/* Feedback & Reviews Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Feedback & Reviews ({reviews.length})</span>
                    {unreadReviewIds && unreadReviewIds.size > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {unreadReviewIds.size} unread
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {isOwnTeam ? (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/60">
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
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-all flex items-center gap-1.5"
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
                  style={{ backgroundColor: "#181a18", border: "1px solid rgba(34,197,94,0.3)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-white">Rate this team:</div>
                    <StarPicker value={ratingInput} onChange={setRatingInput} disabled={submittingReview} />
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={reviewTextInput}
                      onChange={e => setReviewTextInput(e.target.value)}
                      placeholder="Write your feedback about this team (e.g. sportsmanship, punctuality, fair play)..."
                      className="w-full rounded-xl p-3 text-xs text-white focus:outline-none focus:border-green-500 transition-colors placeholder-neutral-500 resize-none"
                      style={{ backgroundColor: "#101210", border: "1px solid #2a2a2a" }}
                      disabled={submittingReview}
                    />
                  </div>

                  {reviewError && (
                    <div className="text-xs text-red-400 flex items-center gap-1.5">
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
                      className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </form>
              )}

              {reviewSuccess && (
                <div className="p-3 mb-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{reviewSuccess}</span>
                </div>
              )}

              {/* Reviews list */}
              {reviews.length === 0 ? (
                <div
                  className="rounded-2xl p-6 text-center text-xs"
                  style={{ backgroundColor: "#151715", border: "1px dashed #2a2a2a", color: "#6b7a6b" }}
                >
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50 text-neutral-500" />
                  <p className="font-semibold text-neutral-300">No reviews yet for {teamName}</p>
                  <p className="mt-1 text-neutral-500">
                    {isOwnTeam
                      ? "Feedback reviews and ratings from opponents in Find Match will appear here."
                      : "Be the first team to leave a feedback review!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {reviews.map(r => {
                    const isUnread = Boolean(
                      unreadReviewIds && (unreadReviewIds.has(String(r.id)) || unreadReviewIds.has(Number(r.id)))
                    );
                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl p-3.5 transition-colors relative"
                        style={{
                          backgroundColor: isUnread ? "rgba(239, 68, 68, 0.08)" : "#161816",
                          border: isUnread ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid #242724"
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs relative shrink-0"
                              style={{ backgroundColor: "#242d24", border: "1px solid #334433" }}
                            >
                              {(r.reviewer_name || "P")[0].toUpperCase()}
                              {isUnread && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#161816] animate-pulse" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5 flex-wrap">
                                <span>{r.reviewer_name || "Cricket Player"}</span>
                                {r.reviewer_team_name && (
                                  <span className="font-normal text-neutral-400 text-[11px]">
                                    ({r.reviewer_team_name})
                                  </span>
                                )}
                                {isUnread && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-red-500/20 border border-red-500/40 text-[9px] font-bold text-red-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Unread msg
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-500 mt-0.5">
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
                            {user?.id && Number(r.reviewer_user_id) === Number(user.id) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(r.id)}
                                disabled={deletingReviewId === r.id}
                                title="Delete your review"
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-neutral-300 mt-2.5 pl-9 leading-relaxed">
                          "{r.review_text}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Close Button */}
            <div className="pt-2">
              <GhostButton onClick={onClose} className="w-full text-center py-2.5">
                Close
              </GhostButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
