import React, { useState, useEffect } from "react";
import { X, Star, Users, CheckCircle, XCircle, AlertCircle, Send, Award, Phone, Calendar, MapPin, MessageSquare, ThumbsUp, Shield } from "lucide-react";
import { apiRequest } from "../api";
import { GhostButton } from "../utils/helpers.jsx";

function formatPhoneDisplay(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length !== 10) return String(phone);
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function StarRating({ rating = 0, size = "w-4 h-4", max = 5 }) {
  const full = Math.floor(rating);
  const frac = rating - full;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        let fill = "#3a3a3a";
        if (i < full) {
          fill = "#eab308"; // full gold star
        } else if (i === full && frac >= 0.3) {
          fill = "#ca8a04"; // near-full / partial
        }
        return (
          <Star
            key={i}
            className={`${size} shrink-0`}
            style={{
              color: i < Math.ceil(rating) ? "#eab308" : "#3a3a3a",
              fill: i < Math.ceil(rating) ? fill : "transparent"
            }}
          />
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
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName]);

  const handleSubmitReview = async e => {
    e.preventDefault();
    if (!token) {
      setReviewError("Please log in to submit a review.");
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

  const isOwnTeam =
    user?.team_name &&
    user.team_name.trim().toLowerCase() === String(teamName || "").trim().toLowerCase();

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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-white">{ratingVal.toFixed(1)}</span>
                    <div className="space-y-0.5">
                      <StarRating rating={ratingVal} size="w-4 h-4" />
                      <div className="text-[11px] font-medium text-neutral-400">
                        Overall Team Rating
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"
                      style={{ backgroundColor: "rgba(34,197,94,0.18)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
                    >
                      <CheckCircle className="w-3 h-3" />
                      +{stats.challenges_accepted} Accepted Challenges
                    </span>
                    {stats.challenges_cancelled > 0 ? (
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"
                        style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        <XCircle className="w-3 h-3" />
                        -{stats.challenges_cancelled} Cancelled Matches
                      </span>
                    ) : (
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"
                        style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}
                      >
                        <Shield className="w-3 h-3" />
                        0 Cancellations (100% Reliable)
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 sm:text-right text-xs"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="text-neutral-300 font-semibold mb-1 flex items-center sm:justify-end gap-1.5">
                    <Award className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Reliability Score</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-relaxed max-w-[200px]">
                    Rating increases when challenges are accepted and drops when matches are cancelled.
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
                {/* 1. How many they posted */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all hover:border-neutral-700"
                  style={{ backgroundColor: "#171a17", border: "1px solid #282d28" }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-sky-500/10 text-sky-400">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats.challenges_posted}</div>
                  <div className="text-xs font-bold text-neutral-300 mt-0.5">Challenges Posted</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Posts created by this team</div>
                </div>

                {/* 2. How many booked their post challenges */}
                <div
                  className="rounded-2xl p-3.5 text-center transition-all hover:border-neutral-700"
                  style={{ backgroundColor: "#171a17", border: "1px solid #282d28" }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats.challenges_booked}</div>
                  <div className="text-xs font-bold text-neutral-300 mt-0.5">Booked by Others</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Opponents accepted their post</div>
                </div>

                {/* 3. How they accepted their challenges */}
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
              </div>
            </div>

            {/* Feedback & Reviews Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-bold text-white">
                    Feedback & Reviews ({reviews.length})
                  </h3>
                </div>

                {isOwnTeam ? (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                    Your Team Profile
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

              {/* Review submission form */}
              {showReviewForm && (
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
                  <p className="mt-1 text-neutral-500">Be the first team to leave a feedback review!</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {reviews.map(r => (
                    <div
                      key={r.id}
                      className="rounded-2xl p-3.5 transition-colors"
                      style={{ backgroundColor: "#161816", border: "1px solid #242724" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: "#242d24", border: "1px solid #334433" }}
                          >
                            {(r.reviewer_name || "P")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white leading-tight">
                              {r.reviewer_name || "Cricket Player"}
                              {r.reviewer_team_name && (
                                <span className="font-normal text-neutral-400 text-[11px] ml-1.5">
                                  ({r.reviewer_team_name})
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

                        <StarRating rating={r.rating} size="w-3.5 h-3.5" />
                      </div>

                      <p className="text-xs text-neutral-300 mt-2.5 pl-9 leading-relaxed">
                        "{r.review_text}"
                      </p>
                    </div>
                  ))}
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
