import React, { useState } from 'react';
import { 
  Star, 
  ChevronDown, 
  HelpCircle, 
  Quote, 
  ShieldCheck, 
  Sparkles,
  MessageSquare,
  Send
} from 'lucide-react';
import { TESTIMONIALS, FAQS } from '../data/promoData';

export default function TestimonialsFAQ() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Feedback State
  const [feedbackList, setFeedbackList] = useState([
    {
      id: 1,
      name: 'Rohit Kulkarni',
      role: 'Team Captain (Koramangala Knights)',
      rating: 5,
      category: 'Connecting Teams Faster',
      message: 'MatchConnect completely eliminated the weekly Saturday headache of hunting for teams. We locked our turf, split ₹180 per guy in 2 minutes, and had a thriller match scored with full wagon wheels.',
      time: 'Just now'
    },
    {
      id: 2,
      name: 'Suhas Deshmukh',
      role: 'Turf Owner (Apex Arena Turf)',
      rating: 5,
      category: 'Turf Ground Booking',
      message: 'Our empty weekday evening slots are 92% booked now because of MatchConnect matchmaking. Players show up on time and payments are 100% upfront.',
      time: 'Yesterday'
    },
    {
      id: 3,
      name: 'Amanpreet Singh',
      role: 'Tournament Organizer (Delhi NCR)',
      rating: 5,
      category: 'Tournaments & Leagues',
      message: 'Hosted a 16-team tournament using MatchConnect. Automatic Net Run Rate calculation and live point tables made our weekend league run like a mini-IPL.',
      time: '3 days ago'
    }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Team Captain',
    teamOrCity: '',
    category: 'Connecting Teams Faster',
    rating: 5,
    message: ''
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) return;

    const newFeedback = {
      id: Date.now(),
      name: formData.name.trim(),
      role: `${formData.role}${formData.teamOrCity ? ` (${formData.teamOrCity.trim()})` : ''}`,
      rating: formData.rating,
      category: formData.category,
      message: formData.message.trim(),
      time: 'Just now'
    };

    setFeedbackList([newFeedback, ...feedbackList]);
    setSubmitted(true);
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? -1 : index);
  };

  return (
    <section 
      id="feedback" 
      className="section-wrapper"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(7, 10, 8, 0.4) 0%, rgba(14, 20, 15, 0.85) 50%, rgba(7, 10, 8, 0.4) 100%)'
      }}
    >
      <div className="container">
        {/* Interactive User Feedback Form Section */}
        <div style={{ marginBottom: '90px' }}>
          <div className="section-header">
            <div className="badge-pill" style={{ marginBottom: '14px' }}>
              <MessageSquare size={14} />
              USER VOICES &amp; FEEDBACK
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
              Share Your Feedback on <span className="neon-gradient-text">MatchConnect</span>
            </h2>
            <p className="section-subtitle">
              Are you a team captain, cricketer, turf owner, or certified umpire? 
              Share your experience, feature requests, or review with the MatchConnect community.
            </p>
          </div>

          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '32px',
              alignItems: 'start'
            }}
            className="feedback-main-grid"
          >
            {/* Left Column: Interactive Feedback Form */}
            <div 
              className="glass-panel feedback-form-panel"
              style={{
                padding: '36px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(34, 197, 94, 0.1)'
              }}
            >
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div 
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '2px solid #22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 18px auto'
                    }}
                  >
                    <ShieldCheck size={36} color="#22c55e" />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '8px' }}>
                    Thank You For Your Feedback!
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 24px auto' }}>
                    Your review has been recorded and posted to the community feed. We continuously improve the MatchConnect App based on your feedback.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        role: 'Team Captain',
                        teamOrCity: '',
                        category: 'Connecting Teams Faster',
                        rating: 5,
                        message: ''
                      });
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                  >
                    Submit Another Feedback
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Sparkles size={18} color="#22c55e" />
                    <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Submit User Feedback</h3>
                  </div>

                  {/* Name & Role Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }} className="feedback-form-row">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Sethi"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.88rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Team / Venue / City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Thunderbolts CC / Bengaluru"
                        value={formData.teamOrCity}
                        onChange={(e) => setFormData({ ...formData, teamOrCity: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.88rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* User Role Selector */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Select Your Role
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }} className="feedback-roles-grid">
                      {[
                        'Team Captain',
                        'Cricket Player',
                        'Turf Owner',
                        'Certified Umpire',
                        'Tournament Host',
                        'Spectator / Fan'
                      ].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: r })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: formData.role === r ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: formData.role === r ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: formData.role === r ? '#4ade80' : 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.18s ease'
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Category & Interactive Rating */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }} className="feedback-meta-row">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Feedback Topic
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: 'rgba(12, 18, 14, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.85rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Connecting Teams Faster">⚡ Connecting Teams Faster</option>
                        <option value="Turf Ground Booking">🏟️ Turf Ground Booking</option>
                        <option value="Certified Umpires">⚖️ Certified Umpires Quality</option>
                        <option value="Tournaments & Leagues">🏆 Tournaments &amp; Leagues</option>
                        <option value="Ball-by-Ball Live Scoring">📊 Ball-by-Ball Live Scoring</option>
                        <option value="Feature Suggestion">💡 Feature Suggestion</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Your Rating ({formData.rating}/5)
                      </label>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px'
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormData({ ...formData, rating: star })}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Star 
                              size={20} 
                              fill={(hoverRating || formData.rating) >= star ? '#fbbf24' : 'transparent'} 
                              color={(hoverRating || formData.rating) >= star ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Your Review / Suggestions *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Tell us what you loved about MatchConnect or how we can make weekend matches even better for your squad..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.88rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      boxShadow: '0 0 25px rgba(34, 197, 94, 0.35)'
                    }}
                  >
                    <Send size={16} />
                    Submit Feedback &amp; Review
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Live Community Feedback Stream */}
            <div>
              <div 
                className="community-rating-header"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '18px 22px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>COMMUNITY RATING</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <span className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>4.92</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>TOTAL REVIEWS</div>
                  <strong style={{ fontSize: '1.2rem', color: '#4ade80' }}>1,280+ Verified</strong>
                </div>
              </div>

              {/* Feed of User Feedback */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {feedbackList.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card"
                    style={{
                      padding: '18px 20px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      animation: item.id === 1 ? 'popIn 0.3s ease' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} size={13} fill="#fbbf24" color="#fbbf24" />
                        ))}
                        <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, marginLeft: '4px' }}>
                          Verified User
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {item.time}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '10px' }}>
                      "{item.message}"
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <strong style={{ color: '#fff' }}>{item.name}</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div className="section-header" style={{ marginBottom: '40px' }}>
            <div className="badge-pill badge-pill-cyan" style={{ marginBottom: '14px' }}>
              <HelpCircle size={14} />
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)' }}>
              Everything You Need to Know About <span className="cyan-gradient-text">Teams, Turfs &amp; Tournaments</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="glass-card"
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    borderColor: isOpen ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="faq-accordion-btn"
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      gap: '16px'
                    }}
                  >
                    <span style={{ fontSize: '1.02rem', fontWeight: 600, color: isOpen ? '#4ade80' : '#fff' }}>
                      {faq.q}
                    </span>
                    <ChevronDown 
                      size={20} 
                      color={isOpen ? '#4ade80' : 'var(--text-muted)'} 
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                        flexShrink: 0
                      }}
                    />
                  </button>

                  {isOpen && (
                    <div 
                      className="faq-accordion-body"
                      style={{
                        padding: '0 24px 20px 24px',
                        fontSize: '0.92rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        paddingTop: '16px'
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .feedback-main-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
        @media (max-width: 640px) {
          .feedback-form-panel {
            padding: 20px 14px !important;
          }
          .feedback-form-row {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .feedback-roles-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }
          .feedback-meta-row {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .faq-accordion-btn {
            padding: 16px 14px !important;
            font-size: 0.95rem !important;
          }
          .faq-accordion-body {
            padding: 0 14px 16px 14px !important;
            font-size: 0.88rem !important;
          }
        }
        @media (max-width: 480px) {
          .community-rating-header {
            padding: 14px !important;
          }
        }
        @media (max-width: 360px) {
          .feedback-roles-grid {
            grid-template-columns: 1fr !important;
          }
          .community-rating-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .community-rating-header > div:last-child {
            text-align: left !important;
          }
        }
      `}</style>
    </section>
  );
}
