import React, { useState } from 'react';
import { 
  Zap, 
  Send, 
  CheckCircle, 
  MapPin, 
  Heart, 
  ShieldCheck, 
  QrCode, 
  Smartphone, 
  ArrowRight,
  Video,
  UserCheck,
  CreditCard,
  Sparkles,
  Bell,
  Check,
  Users,
  Radio,
  Clock,
  Calendar,
  Flame,
  Swords,
  Phone,
  Mail,
  MessageSquare,
  Headphones
} from 'lucide-react';

export default function UpdatedFooter({ onConnectTeams }) {
  const [contactTab, setContactTab] = useState('direct'); // 'direct' | 'message'
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactType, setContactType] = useState('Matchday Support');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const CITIES = ['Bangalore', 'Mumbai', 'Delhi-NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (contactPhone.trim()) {
      setContactSent(true);
      setTimeout(() => {
        setContactName('');
        setContactPhone('');
        setContactMsg('');
        setContactSent(false);
      }, 5000);
    }
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
        {/* GIANT PROMOTIONAL LAUNCH BANNER */}
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
            AVAILABLE ON IOS &amp; ANDROID
          </div>

          <h2 style={{ fontSize: 'clamp(1.75rem, 4.2vw, 3.4rem)', marginBottom: '14px', lineHeight: 1.18 }}>
            Experience Grassroots Cricket Re-imagined. <br />
            <span className="neon-gradient-text">Download the MatchConnect App</span>
          </h2>

          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', margin: '0 auto 28px auto', fontSize: '1rem', lineHeight: 1.6 }}>
            Every weekend match you ever play: matched in 30 seconds with equal opponents, played on verified floodlit turfs, 
            officiated by neutral certified umpires, and streamed live with AI reels.
          </p>

          <div className="footer-cta-buttons" style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button 
              onClick={() => setShowQrModal(true)}
              className="btn btn-primary"
              style={{ padding: '14px 30px', fontSize: '0.98rem', gap: '10px', minHeight: '48px' }}
            >
              <Smartphone size={18} />
              Get App on iOS &amp; Android
            </button>

            <button 
              onClick={() => setShowQrModal(true)}
              className="btn btn-secondary"
              style={{ padding: '14px 26px', fontSize: '0.98rem', gap: '8px', minHeight: '48px' }}
            >
              <QrCode size={18} />
              Scan QR Code
            </button>
          </div>

          {/* Real-time Ecosystem Metrics */}
          <div className="footer-metrics-grid">
            <div>
              <div style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)', fontWeight: 800, color: '#4ade80' }}>14,800+</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matches Paired</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)', fontWeight: 800, color: '#38bdf8' }}>480+</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Turfs</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)', fontWeight: 800, color: '#fbbf24' }}>350+</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Certified Umpires</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)', fontWeight: 800, color: '#c084fc' }}>99.4%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fair Play Rating</div>
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQrModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
            onClick={() => setShowQrModal(false)}
          >
            <div 
              style={{
                background: '#0d1410',
                border: '1px solid #22c55e',
                borderRadius: '20px',
                padding: '28px 18px',
                width: '100%',
                maxWidth: '380px',
                textAlign: 'center',
                boxShadow: '0 0 50px rgba(34, 197, 94, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{ padding: '16px', background: '#fff', borderRadius: '16px' }}>
                  <QrCode size={160} color="#000" />
                </div>
              </div>
              <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '8px' }}>Scan with Phone Camera</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Installs the MatchConnect Progressive Web App instantly on your iPhone or Android.
              </p>
              <button 
                onClick={() => setShowQrModal(false)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Close Window
              </button>
            </div>
          </div>
        )}

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
          {/* Column 1: Brand Info & Captain's Manifesto */}
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
              Built by weekend cricketers who got tired of 11 PM WhatsApp arguments, last-minute ghosting, and biased friend-umpired decisions. MatchConnect pairs squads in 30 seconds with verified opponents, neutral umpires, and confirmed floodlit turf slots.
            </p>

            {/* 3 Relatable Trust Guarantees */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86efac' }}>
                <ShieldCheck size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                <span><strong>Zero Ghosting Guarantee:</strong> Deposit-locked squad bookings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fde047' }}>
                <ShieldCheck size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span><strong>100% Neutral Officiating:</strong> BCCI &amp; State panel umpires</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#67e8f9' }}>
                <ShieldCheck size={16} color="#06b6d4" style={{ flexShrink: 0 }} />
                <span><strong>Confirmed Pitch Custody:</strong> No cash double-bookings</span>
              </div>
            </div>
          </div>

          {/* Column 2: The 5 Core Solutions (Relatable Action Cards) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={15} color="#4ade80" />
              <h4 style={{ fontSize: '0.85rem', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                The 5 Core Solutions
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="#find-match" className="footer-theme-link">
                <div className="link-title">
                  <span>🏏</span> Find an Opponent
                </div>
                <div className="link-desc">
                  Pair equal-ELO squads in 30s &bull; Zero WhatsApp spam
                </div>
              </a>

              <a href="#book-umpire" className="footer-theme-link">
                <div className="link-title">
                  <span>⚖️</span> Certified Panel Umpires
                </div>
                <div className="link-desc">
                  Neutral board umpires &bull; Zero biased calls or walk-offs
                </div>
              </a>

              <a href="#book-ground" className="footer-theme-link">
                <div className="link-title">
                  <span>🏟️</span> Verified Turf &amp; Grounds
                </div>
                <div className="link-desc">
                  Live digital slot locks &bull; 800+ lux floodlit arenas
                </div>
              </a>

              <a href="#tournaments" className="footer-theme-link">
                <div className="link-title">
                  <span>🏆</span> Tournament Engine
                </div>
                <div className="link-desc">
                  Auto IPL-style brackets, standings &amp; live Net Run Rate
                </div>
              </a>

              <a href="#live-score" className="footer-theme-link">
                <div className="link-title">
                  <span>⚡</span> Broadcast Live Score
                </div>
                <div className="link-desc">
                  Ball-by-ball TV telemetry &amp; 1-tap WhatsApp streaming
                </div>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px', fontSize: '0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <a href="#feedback" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 600 }}>
                  💬 Share Captain Review
                </a>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>&bull;</span>
                <a href="#faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  ❓ FAQs &amp; Rules
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: Our Contact Details & Captain Support Desk */}
          <div 
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
            {/* Header: Title + Online Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="live-dot"></span>
                <h4 style={{ fontSize: '0.85rem', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
                  Our Contact Details
                </h4>
              </div>
              
              <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                🟢 24/7 Matchday Desk
              </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Need urgent matchday help, turf listings, umpire bookings, or corporate tournament setups? Connect directly with our cricket operations desk.
            </p>

            {/* Quick 1-Tap Action Buttons (WhatsApp & Call) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '8px' }}>
              <a
                href="https://wa.me/919876543210?text=Hi%20MatchConnect%20Team%2C%20I%20need%20assistance%20with%20a%20match%20fixture%20or%20booking"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#25D366',
                  color: '#041d0b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(37, 211, 102, 0.3)',
                  transition: 'transform 0.15s ease'
                }}
                className="contact-quick-btn"
              >
                <MessageSquare size={14} /> WhatsApp Us
              </a>

              <a
                href="tel:+919876543210"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#4ade80',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
                className="contact-quick-btn"
              >
                <Phone size={14} /> Call Helpline
              </a>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <button
                type="button"
                onClick={() => setContactTab('direct')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: contactTab === 'direct' ? 'rgba(34, 197, 94, 0.22)' : 'transparent',
                  color: contactTab === 'direct' ? '#4ade80' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Phone size={12} /> Contact Channels
              </button>

              <button
                type="button"
                onClick={() => setContactTab('message')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: contactTab === 'message' ? 'rgba(34, 197, 94, 0.22)' : 'transparent',
                  color: contactTab === 'message' ? '#4ade80' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={12} /> Request Callback
              </button>
            </div>

            {/* TAB 1: Direct Contact Channels */}
            {contactTab === 'direct' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Channel 1: Helpline */}
                <div 
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    <Phone size={12} /> Captain &amp; Matchday Helpline
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <a href="tel:+919876543210" style={{ color: '#fff', textDecoration: 'none' }}>
                      +91 98765 43210
                    </a>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>&bull;</span>
                    <a href="tel:+918049128800" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.8rem' }}>
                      +91 (080) 4912 8800
                    </a>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                    Hours: Mon – Sun &bull; 6:00 AM – 11:30 PM IST (Fastest support on matchdays)
                  </div>
                </div>

                {/* Channel 2: Emails */}
                <div 
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    <Mail size={12} /> Official Inboxes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Support &amp; Disputes:</span>
                      <a href="mailto:support@matchconnect.com" style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}>
                        support@matchconnect.com
                      </a>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Turfs &amp; Umpires:</span>
                      <a href="mailto:partnerships@matchconnect.com" style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}>
                        partnerships@matchconnect.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Channel 3: Registered Office */}
                <div 
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    <MapPin size={12} /> Registered Head Office
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                    MatchConnect Sports Technologies Pvt. Ltd.
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px', lineHeight: 1.45 }}>
                    #42, 3rd Floor, 100ft Road, Indiranagar, Bangalore, Karnataka 560038, India
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#9ca3af', paddingTop: '2px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} color="#22c55e" /> Average response: &lt; 5 mins
                  </span>
                  <button
                    type="button"
                    onClick={() => setContactTab('message')}
                    style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Request 5-Min Callback ➔
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Quick Message / Callback Form */}
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
                      Inquiry Received!
                    </div>
                    <p style={{ color: '#d1d5db', fontSize: '0.78rem', margin: '0 0 12px', lineHeight: 1.5 }}>
                      Our cricket operations coordinator will reach out to <strong>{contactPhone}</strong> via WhatsApp/Call within 10 minutes.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSent(false);
                        setContactTab('direct');
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
                      Back to Contact Details
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 600 }}>
                          Your Name
                        </label>
                        <input
                          type="text"
                          placeholder="Captain Name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            color: '#fff',
                            fontSize: '0.76rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 600 }}>
                          Phone or WhatsApp *
                        </label>
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          required
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            color: '#fff',
                            fontSize: '0.76rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Inquiry Topic
                      </label>
                      <select
                        value={contactType}
                        onChange={(e) => setContactType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          background: 'rgba(12, 18, 14, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          fontSize: '0.76rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Matchday Support" style={{ background: '#0e1410', color: '#fff' }}>⚡ Matchday Dispute / Emergency Help</option>
                        <option value="List Ground" style={{ background: '#0e1410', color: '#fff' }}>🏟️ List Turf / Ground Partnership</option>
                        <option value="Umpire Onboarding" style={{ background: '#0e1410', color: '#fff' }}>⚖️ Umpire &amp; Scorer Onboarding</option>
                        <option value="Corporate League" style={{ background: '#0e1410', color: '#fff' }}>🏆 Corporate Tournament Booking</option>
                        <option value="General Query" style={{ background: '#0e1410', color: '#fff' }}>💬 General Inquiry &amp; Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Brief Note (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Tell us about your squad, ground, or match query..."
                        value={contactMsg}
                        onChange={(e) => setContactMsg(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          color: '#fff',
                          fontSize: '0.76rem',
                          outline: 'none',
                          resize: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '9px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, justifyContent: 'center', gap: '6px' }}
                    >
                      <Send size={13} /> Send Inquiry &amp; Request Callback
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coverage Cities Bar */}
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
            <strong style={{ color: 'var(--text-secondary)' }}>Live City Networks:</strong>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {CITIES.map(city => (
              <span key={city} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.04)', color: '#fff' }}>
                {city}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Copyright & Credit Row */}
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
            &copy; {new Date().getFullYear()} MatchConnect Cricket Systems. Built exclusively for recreational players.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Built for passionate cricket captains, turf owners &amp; players with</span>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
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
