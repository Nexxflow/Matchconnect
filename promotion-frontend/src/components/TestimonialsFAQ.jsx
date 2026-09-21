import React, { useState } from 'react';
import { 
  Star, 
  ChevronDown, 
  HelpCircle, 
  ShieldCheck, 
  Sparkles,
  MessageSquare,
  Send
} from 'lucide-react';
import { TESTIMONIALS, FAQS, FEEDBACK_ENDPOINT, SUPPORT_EMAIL } from '../data/promoData';

const INITIAL_FORM = {
  name: '',
  role: 'Team Captain',
  teamOrCity: '',
  category: 'Connecting Teams Faster',
  rating: 5,
  message: ''
};

export default function TestimonialsFAQ() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sentVia, setSentVia] = useState('email'); // 'api' | 'email'
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) return;

    setError('');
    const payload = {
      name: formData.name.trim(),
      role: formData.role,
      teamOrCity: formData.teamOrCity.trim(),
      topic: formData.category,
      rating: formData.rating,
      message: formData.message.trim()
    };

    // 1) Endpoint set pannirundha (Formspree / Google Apps Script) adhukku POST
    if (FEEDBACK_ENDPOINT) {
      try {
        setSending(true);
        const res = await fetch(FEEDBACK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Request failed');
        setSentVia('api');
        setSubmitted(true);
      } catch (err) {
        setError('Could not send your feedback right now. Please try again in a moment.');
      } finally {
        setSending(false);
      }
      return;
    }

    // 2) Endpoint illana user oda email app open aagum
    const subject = encodeURIComponent(`MatchConnect Feedback: ${payload.topic}`);
    const body = encodeURIComponent(
      `Name: ${payload.name}\nRole: ${payload.role}\nTeam / Venue / City: ${payload.teamOrCity || '-'}\nTopic: ${payload.topic}\nRating: ${payload.rating}/5\n\n${payload.message}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSentVia('email');
    setSubmitted(true);
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? -1 : index);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#fff',
    fontSize: '0.88rem',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    textTransform: 'uppercase'
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
              Are you a team captain, cricketer, ground owner, or umpire? 
              Share your experience or feature requests and help us build a better app for local cricket.
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
            {/* Left Column: Feedback Form */}
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
                    {sentVia === 'api' ? 'Thank You For Your Feedback!' : 'Almost There!'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 24px auto' }}>
                    {sentVia === 'api'
                      ? 'Your feedback has been sent to the MatchConnect team. We read every message and use it to improve the app.'
                      : 'Your email app has opened with your feedback filled in. Just press Send to deliver it to the MatchConnect team.'}
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData(INITIAL_FORM);
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

                  {/* Name & Team Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }} className="feedback-form-row">
                    <div>
                      <label style={labelStyle}>Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Sethi"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Team / Venue / City</label>
                      <input
                        type="text"
                        placeholder="e.g. Thunderbolts CC / Chennai"
                        value={formData.teamOrCity}
                        onChange={(e) => setFormData({ ...formData, teamOrCity: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* User Role Selector */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Select Your Role</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }} className="feedback-roles-grid">
                      {[
                        'Team Captain',
                        'Cricket Player',
                        'Turf Owner',
                        'Umpire',
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

                  {/* Feedback Category & Rating */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }} className="feedback-meta-row">
                    <div>
                      <label style={labelStyle}>Feedback Topic</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        style={{
                          ...inputStyle,
                          background: 'rgba(12, 18, 14, 0.9)',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Connecting Teams Faster">⚡ Connecting Teams Faster</option>
                        <option value="Ground Booking">🏟️ Ground Booking</option>
                        <option value="Umpires">⚖️ Umpires</option>
                        <option value="Tournaments">🏆 Tournaments</option>
                        <option value="Live Scoring">📊 Live Scoring</option>
                        <option value="Feature Suggestion">💡 Feature Suggestion</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Your Rating ({formData.rating}/5)</label>
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
                    <label style={labelStyle}>Your Review / Suggestions *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Tell us what you liked about MatchConnect or how we can make weekend matches even better for your squad..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  {error && (
                    <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', fontSize: '0.85rem' }}>
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sending}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      boxShadow: '0 0 25px rgba(34, 197, 94, 0.35)',
                      opacity: sending ? 0.7 : 1
                    }}
                  >
                    <Send size={16} />
                    {sending ? 'Sending...' : 'Submit Feedback'}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Community reviews (real reviews mattum) */}
            <div>
              {TESTIMONIALS.length === 0 ? (
                <div
                  className="glass-card"
                  style={{
                    padding: '28px 24px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '14px' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} color="rgba(255, 255, 255, 0.25)" />
                    ))}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '8px' }}>
                    Be Among the First to Review
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    MatchConnect is just getting started. Try the app, tell us what you think, and help shape 
                    how local cricket teams connect, book grounds and play.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {TESTIMONIALS.map((item, idx) => (
                    <div
                      key={idx}
                      className="glass-card"
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        {[...Array(item.rating || 5)].map((_, i) => (
                          <Star key={i} size={13} fill="#fbbf24" color="#fbbf24" />
                        ))}
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '10px' }}>
                        "{item.text}"
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <strong style={{ color: '#fff' }}>{item.name}</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              Everything You Need to Know About <span className="cyan-gradient-text">Teams, Grounds &amp; Tournaments</span>
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
        @media (max-width: 360px) {
          .feedback-roles-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}