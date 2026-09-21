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
  Mail
} from 'lucide-react';
import {
  WEB_APP_URL,
  PLAY_STORE_URL,
  SUPPORT_EMAIL,
  PRIVACY_URL,
  TERMS_URL,
  WAITLIST_FORM_URL,
  LAUNCH_REGION,
  CITIES
} from '../data/promoData';

export default function UpdatedFooter({ onConnectTeams }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const hasPlayStore = Boolean(PLAY_STORE_URL);

  // Backend illa, so waitlist form URL irundha adhu, illana email app open aagum
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
          className="glass-panel"
          style={{
            padding: '48px 36px',
            textAlign: 'center',
            marginBottom: '70px',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            boxShadow: '0 0 50px rgba(34, 197, 94, 0.2)',
            background: 'linear-gradient(180deg, rgba(18, 26, 20, 0.95) 0%, rgba(8, 12, 9, 0.95) 100%)'
          }}
        >
          <div className="badge-pill" style={{ marginBottom: '16px' }}>
            <Zap size={14} />
            {hasPlayStore ? 'AVAILABLE ON GOOGLE PLAY' : 'ANDROID APP COMING SOON'}
          </div>

          <h2 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', marginBottom: '16px', lineHeight: 1.15 }}>
            Grassroots Cricket, Re-imagined. <br />
            <span className="neon-gradient-text">
              {hasPlayStore ? 'Download the MatchConnect App' : 'Use MatchConnect on the Web Today'}
            </span>
          </h2>

          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', margin: '0 auto 32px auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Find opponents, book grounds and umpires, host tournaments, and score matches live. 
            All in one cricket app built for local players.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <a 
              href={hasPlayStore ? PLAY_STORE_URL : WEB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '15px 34px', fontSize: '1rem', gap: '10px' }}
            >
              <Smartphone size={18} />
              {hasPlayStore ? 'Get it on Google Play' : 'Open Web App'}
            </a>

            {!hasPlayStore && (
              <a 
                href="#notify"
                className="btn btn-secondary"
                style={{ padding: '15px 28px', fontSize: '1rem', gap: '8px' }}
              >
                <Bell size={18} />
                Notify Me at Launch
              </a>
            )}
          </div>

          {/* Feature highlights */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              maxWidth: '850px',
              margin: '0 auto'
            }}
          >
            {HIGHLIGHTS.map((h) => (
              <div key={h.value}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: h.color }}>{h.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER LINKS & SITEMAP GRID */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.2fr 1.4fr',
            gap: '40px',
            marginBottom: '60px'
          }}
          className="footer-links-grid"
        >
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #22c55e, #15803d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
                }}
              >
                <Zap size={20} color="#051408" strokeWidth={2.8} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Match<span style={{ color: '#22c55e' }}>Connect</span>
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '280px', marginBottom: '16px' }}>
              A cricket app for local teams. Find opponents, book grounds and umpires, host tournaments, and score matches live.
            </p>
            <div style={{ fontSize: '0.78rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <ShieldCheck size={14} /> Built for fair play
            </div>
            <a 
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Mail size={14} color="#22c55e" /> {SUPPORT_EMAIL}
            </a>
          </div>

          {/* 5 Core Themes */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              The 5 Core Themes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <a href="#find-match" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>🏏 Find a Match</a>
              <a href="#book-umpire" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>⚖️ Book Umpires</a>
              <a href="#book-ground" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>🏟️ Book Grounds</a>
              <a href="#tournaments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>🏆 Tournaments</a>
              <a href="#live-score" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>⚡ Live Scoring</a>
              <a href="#feedback" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 600, marginTop: '4px' }}>💬 Share Feedback</a>
              <a href="#faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>❓ FAQs</a>
            </div>
          </div>

          {/* Launch updates */}
          <div id="notify">
            <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Get Launch Updates
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Leave your email and we will let you know when the Android app goes live on Google Play.
            </p>
            {subscribed ? (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: '10px', color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
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
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Made with</span>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <span>for cricket lovers</span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .footer-links-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 28px !important;
          }
        }
        @media (max-width: 580px) {
          .footer-links-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
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