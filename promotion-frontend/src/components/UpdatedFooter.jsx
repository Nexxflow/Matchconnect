import React, { useState } from 'react';
import { 
  Zap, 
  Send, 
  CheckCircle, 
  MapPin, 
  Heart, 
  ShieldCheck, 
  Smartphone, 
  Bell,
  Sparkles,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import {
  WEB_APP_URL,
  PLAY_STORE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP,
  PRIVACY_URL,
  TERMS_URL,
  WAITLIST_FORM_URL,
  LAUNCH_REGION,
  CITIES
} from '../data/promoData';

export default function UpdatedFooter({ onConnectTeams }) {
  const [contactTab, setContactTab] = useState('message'); // 'message' | 'updates'

  // Send Message form
  const [contactName, setContactName] = useState('');
  const [contactReach, setContactReach] = useState('');
  const [contactType, setContactType] = useState('Matchday Help');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Launch updates form
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const hasPlayStore = Boolean(PLAY_STORE_URL);

  // Backend illa, so user oda email app open aagi mail ready aagum
  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactReach.trim()) return;

    const subject = encodeURIComponent(`MatchConnect enquiry: ${contactType}`);
    const body = encodeURIComponent(
      `Name: ${contactName.trim() || '-'}\nPhone / Email: ${contactReach.trim()}\nTopic: ${contactType}\n\n${contactMsg.trim() || '-'}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setContactSent(true);
  };

  // Waitlist form URL irundha adhu, illana email app open aagum
  const handleSubscribe = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;

    if (WAITLIST_FORM_URL) {
      window.open(WAITLIST_FORM_URL, '_blank', 'noopener,noreferrer');
    } else {
      const subject = encodeURIComponent('MatchConnect launch updates');
      const body = encodeURIComponent(`Please add me to the MatchConnect launch updates list.\n\nMy email: ${value}`);
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    }

    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
      setSubscribed(false);
    }, 6000);
  };

  const HIGHLIGHTS = [
    { value: 'Teams', label: 'Find opponents', color: '#4ade80' },
    { value: 'Grounds', label: 'Book slots online', color: '#38bdf8' },
    { value: 'Umpires', label: 'Neutral officials', color: '#fbbf24' },
    { value: 'Live Score', label: 'Ball by ball', color: '#c084fc' }
  ];

  const fieldStyle = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    color: '#fff',
    fontSize: '0.76rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const fieldLabelStyle = {
    display: 'block',
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    marginBottom: '3px',
    textTransform: 'uppercase',
    fontWeight: 600
  };

  const tabStyle = (active) => ({
    padding: '6px 10px',
    borderRadius: '8px',
    border: 'none',
    background: active ? 'rgba(34, 197, 94, 0.22)' : 'transparent',
    color: active ? '#4ade80' : 'var(--text-secondary)',
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.15s ease'
  });

  const quickBtnBase = {
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '9px 12px',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 700,
    textDecoration: 'none'
  };

  return (
    <footer 
      id="footer"
      style={{
        position: 'relative',
        background: '#040705',
        borderTop: '1px solid rgba(34, 197, 94, 0.2)',
        paddingTop: '80px',
        paddingBottom: '40px',
        overflow: 'hidden'
      }}
    >
      {/* Stadium Glow in Background */}
      <div 
        style={{
          position: 'absolute',
          top: '-160px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.14) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none'
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* PROMOTIONAL LAUNCH BANNER */}
        <div 
          className="glass-panel footer-launch-banner"
          style={{
            padding: '44px 32px',
            textAlign: 'center',
            marginBottom: '60px',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            boxShadow: '0 0 50px rgba(34, 197, 94, 0.2)',
            background: 'linear-gradient(180deg, rgba(18, 26, 20, 0.95) 0%, rgba(8, 12, 9, 0.95) 100%)'
          }}
        >
          <div className="badge-pill" style={{ marginBottom: '14px' }}>
            <Zap size={14} />
            {hasPlayStore ? 'AVAILABLE ON GOOGLE PLAY' : 'ANDROID APP COMING SOON'}
          </div>

          <h2 style={{ fontSize: 'clamp(1.75rem, 4.2vw, 3.4rem)', marginBottom: '14px', lineHeight: 1.18 }}>
            Grassroots Cricket, Re-imagined. <br />
            <span className="neon-gradient-text">
              {hasPlayStore ? 'Download the MatchConnect App' : 'Use MatchConnect on the Web Today'}
            </span>
          </h2>

          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', margin: '0 auto 28px auto', fontSize: '1rem', lineHeight: 1.6 }}>
            Find opponents, book grounds and umpires, host tournaments, and score matches live. 
            All in one cricket app built for local players.
          </p>

          <div className="footer-cta-buttons" style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <a 
              href={hasPlayStore ? PLAY_STORE_URL : WEB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '14px 30px', fontSize: '0.98rem', gap: '10px', minHeight: '48px' }}
            >
              <Smartphone size={18} />
              {hasPlayStore ? 'Get it on Google Play' : 'Open Web App'}
            </a>

            {!hasPlayStore && (
              <a 
                href="#notify"
                onClick={() => setContactTab('updates')}
                className="btn btn-secondary"
                style={{ padding: '14px 26px', fontSize: '0.98rem', gap: '8px', minHeight: '48px' }}
              >
                <Bell size={18} />
                Notify Me at Launch
              </a>
            )}
          </div>

          {/* Feature highlights */}
          <div 
            className="footer-metrics-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '16px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              maxWidth: '850px',
              margin: '0 auto'
            }}
          >
            {HIGHLIGHTS.map((h) => (
              <div key={h.value}>
                <div style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)', fontWeight: 800, color: h.color }}>{h.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER LINKS & SITEMAP GRID */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1.25fr 1.35fr 1.4fr',
            gap: '36px',
            marginBottom: '50px'
          }}
          className="footer-links-grid"
        >
          {/* Column 1: Brand Info */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div 
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #22c55e, #15803d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)',
                  flexShrink: 0
                }}
              >
                <Zap size={22} color="#051408" strokeWidth={2.8} />
              </div>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                  Match<span style={{ color: '#22c55e' }}>Connect</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Grassroots Cricket Network
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: 1.65, marginBottom: '16px' }}>
              Built for weekend cricketers who are tired of late-night WhatsApp arguments and last-minute confusion. 
              MatchConnect helps teams find opponents, book grounds, hire neutral umpires and keep every match organised in one app.
            </p>

            {/* 3 relatable points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86efac' }}>
                <ShieldCheck size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                <span><strong>Clear Match Details:</strong> Format and slot agreed in-app</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fde047' }}>
                <ShieldCheck size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span><strong>Neutral Officiating:</strong> Book an umpire for a fair game</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#67e8f9' }}>
                <ShieldCheck size={16} color="#06b6d4" style={{ flexShrink: 0 }} />
                <span><strong>Visible Ground Slots:</strong> See availability before you book</span>
              </div>
            </div>
          </div>

          {/* Column 2: The 5 Core Solutions */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={15} color="#4ade80" />
              <h4 style={{ fontSize: '0.85rem', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                The 5 Core Solutions
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="#find-match" className="footer-theme-link">
                <div className="link-title"><span>🏏</span> Find an Opponent</div>
                <div className="link-desc">Post a challenge &bull; No more WhatsApp spam</div>
              </a>

              <a href="#book-umpire" className="footer-theme-link">
                <div className="link-title"><span>⚖️</span> Book Umpires</div>
                <div className="link-desc">Neutral officials &bull; Clear match fees</div>
              </a>

              <a href="#book-ground" className="footer-theme-link">
                <div className="link-title"><span>🏟️</span> Book Grounds</div>
                <div className="link-desc">See live slots &bull; Book online</div>
              </a>

              <a href="#tournaments" className="footer-theme-link">
                <div className="link-title"><span>🏆</span> Tournaments</div>
                <div className="link-desc">Create tournaments &bull; Online team registration</div>
              </a>

              <a href="#live-score" className="footer-theme-link">
                <div className="link-title"><span>⚡</span> Live Scoring</div>
                <div className="link-desc">Ball-by-ball scoring &bull; Let fans follow along</div>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px', fontSize: '0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <a href="#feedback" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 600 }}>
                  💬 Share Feedback
                </a>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>&bull;</span>
                <a href="#faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  ❓ FAQs
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: Contact Us card */}
          <div 
            id="notify"
            style={{
              background: 'rgba(12, 20, 15, 0.85)',
              border: '1px solid rgba(34, 197, 94, 0.28)',
              borderRadius: '16px',
              padding: '22px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-dot"></span>
              <h4 style={{ fontSize: '0.85rem', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
                Contact Us
              </h4>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Questions about a match, ground listing, umpire onboarding or tournament setup? Write to us.
            </p>

            {/* Quick action buttons (WhatsApp & Call only if number set in promoData.js) */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="contact-quick-btn"
                style={{
                  ...quickBtnBase,
                  background: 'rgba(34, 197, 94, 0.14)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#4ade80'
                }}
              >
                <Mail size={14} /> Email Us
              </a>

              {SUPPORT_WHATSAPP && (
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi MatchConnect, I need help with a match or booking.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-quick-btn"
                  style={{ ...quickBtnBase, background: '#25D366', color: '#041d0b', boxShadow: '0 2px 10px rgba(37, 211, 102, 0.3)' }}
                >
                  <MessageSquare size={14} /> WhatsApp
                </a>
              )}

              {SUPPORT_PHONE && (
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="contact-quick-btn"
                  style={{
                    ...quickBtnBase,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#fff'
                  }}
                >
                  <Phone size={14} /> Call
                </a>
              )}
            </div>

            <a 
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ fontSize: '0.8rem', color: '#93c5fd', textDecoration: 'none', fontWeight: 600, wordBreak: 'break-all' }}
            >
              {SUPPORT_EMAIL}
            </a>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <button type="button" onClick={() => setContactTab('message')} style={tabStyle(contactTab === 'message')}>
                <Send size={12} /> Send Message
              </button>
              <button type="button" onClick={() => setContactTab('updates')} style={tabStyle(contactTab === 'updates')}>
                <Bell size={12} /> Launch Updates
              </button>
            </div>

            {/* TAB 1: Send Message */}
            {contactTab === 'message' && (
              <div>
                {contactSent ? (
                  <div 
                    style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid #22c55e',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center'
                    }}
                  >
                    <CheckCircle size={30} color="#4ade80" style={{ margin: '0 auto 8px' }} />
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem', marginBottom: '4px' }}>
                      Almost there!
                    </div>
                    <p style={{ color: '#d1d5db', fontSize: '0.78rem', margin: '0 0 12px', lineHeight: 1.5 }}>
                      Your email app opened with your message filled in. Just press <strong>Send</strong> to deliver it to the MatchConnect team.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSent(false);
                        setContactName('');
                        setContactReach('');
                        setContactMsg('');
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: '#22c55e',
                        border: 'none',
                        color: '#000',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Write Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={fieldLabelStyle}>Your Name</label>
                        <input
                          type="text"
                          placeholder="Captain Name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          style={fieldStyle}
                        />
                      </div>
                      <div>
                        <label style={fieldLabelStyle}>Phone or Email *</label>
                        <input
                          type="text"
                          placeholder="How can we reach you?"
                          required
                          value={contactReach}
                          onChange={(e) => setContactReach(e.target.value)}
                          style={fieldStyle}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Topic</label>
                      <select
                        value={contactType}
                        onChange={(e) => setContactType(e.target.value)}
                        style={{ ...fieldStyle, background: 'rgba(12, 18, 14, 0.9)', cursor: 'pointer' }}
                      >
                        <option value="Matchday Help" style={{ background: '#0e1410', color: '#fff' }}>⚡ Matchday Help</option>
                        <option value="List My Ground" style={{ background: '#0e1410', color: '#fff' }}>🏟️ List My Ground</option>
                        <option value="Umpire Onboarding" style={{ background: '#0e1410', color: '#fff' }}>⚖️ Umpire Onboarding</option>
                        <option value="Tournament Enquiry" style={{ background: '#0e1410', color: '#fff' }}>🏆 Tournament Enquiry</option>
                        <option value="General Enquiry" style={{ background: '#0e1410', color: '#fff' }}>💬 General Enquiry &amp; Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Brief Note (Optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Tell us about your team, ground, or question..."
                        value={contactMsg}
                        onChange={(e) => setContactMsg(e.target.value)}
                        style={{ ...fieldStyle, resize: 'none', fontFamily: 'inherit' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '9px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, justifyContent: 'center', gap: '6px' }}
                    >
                      <Send size={13} /> Send Message
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: Launch Updates */}
            {contactTab === 'updates' && (
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.5 }}>
                  Leave your email and we will let you know when the Android app goes live on Google Play.
                </p>
                {subscribed ? (
                  <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: '10px', color: '#4ade80', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} /> Almost done! Complete the email or form that just opened.
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="newsletter-form" style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      placeholder="captain@cricketteam.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ ...fieldStyle, flex: 1, padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '10px 16px', borderRadius: '10px' }}
                      aria-label="Notify me"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#9ca3af' }}>
              <MapPin size={12} color="#22c55e" /> {LAUNCH_REGION}, India
            </div>
          </div>
        </div>

        {/* Launch Region Bar */}
        <div 
          style={{
            padding: '16px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="#22c55e" />
            <strong style={{ color: 'var(--text-secondary)' }}>Starting in {LAUNCH_REGION}:</strong>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {CITIES.map(city => (
              <span key={city} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.04)', color: '#fff' }}>
                {city}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Copyright, Legal & Credit Row */}
        <div 
          className="footer-bottom-row"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} MatchConnect. Built for recreational cricket players.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={PRIVACY_URL} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href={TERMS_URL} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms &amp; Conditions</a>
            <a href="/delete-account.html" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Delete Account</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Made with</span>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <span>for cricket lovers</span>
          </div>
        </div>
      </div>

      <style>{`
        .footer-theme-link {
          display: block;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .footer-theme-link:hover {
          background: rgba(34, 197, 94, 0.08);
          border-color: rgba(34, 197, 94, 0.3);
          transform: translateX(4px);
        }
        .footer-theme-link .link-title {
          color: #f3f4f6;
          font-size: 0.86rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .footer-theme-link:hover .link-title {
          color: #4ade80;
        }
        .footer-theme-link .link-desc {
          color: #9ca3af;
          font-size: 0.72rem;
          margin-top: 2px;
          line-height: 1.4;
        }
        .contact-quick-btn {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .contact-quick-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.12);
        }
        @media (max-width: 1024px) {
          .footer-links-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 28px !important;
          }
        }
        @media (max-width: 640px) {
          .footer-launch-banner {
            padding: 28px 14px !important;
            margin-bottom: 40px !important;
          }
          .footer-cta-buttons .btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .footer-links-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
        }
        @media (max-width: 580px) {
          .newsletter-form {
            flex-direction: column !important;
          }
          .newsletter-form .btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .footer-bottom-row {
            flex-direction: column !important;
            text-align: center !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </footer>
  );
}