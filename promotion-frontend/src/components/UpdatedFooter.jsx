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
  CreditCard
} from 'lucide-react';

export default function UpdatedFooter({ onConnectTeams }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 4000);
    }
  };

  const CITIES = ['Bangalore', 'Mumbai', 'Delhi-NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];

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
            AVAILABLE ON IOS &amp; ANDROID
          </div>

          <h2 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', marginBottom: '16px', lineHeight: 1.15 }}>
            Experience Grassroots Cricket Re-imagined. <br />
            <span className="neon-gradient-text">Download the MatchConnect App</span>
          </h2>

          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', margin: '0 auto 32px auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Every weekend match you ever play: matched in 30 seconds with equal opponents, played on verified floodlit turfs, 
            officiated by neutral certified umpires, and streamed live with AI reels.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button 
              onClick={() => setShowQrModal(true)}
              className="btn btn-primary"
              style={{ padding: '15px 34px', fontSize: '1rem', gap: '10px' }}
            >
              <Smartphone size={18} />
              Get App on iOS &amp; Android
            </button>

            <button 
              onClick={() => setShowQrModal(true)}
              className="btn btn-secondary"
              style={{ padding: '15px 28px', fontSize: '1rem', gap: '8px' }}
            >
              <QrCode size={18} />
              Scan QR Code
            </button>
          </div>

          {/* Real-time Ecosystem Metrics */}
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
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>14,800+</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matches Paired</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>480+</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Turfs</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>350+</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Certified Umpires</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc' }}>99.4%</div>
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
                padding: '36px',
                maxWidth: '400px',
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
              The comprehensive amateur cricket operating system. Connecting teams 10x faster, ensuring neutral certified officiating, guaranteed ground slots, automated tournaments, and live scoring.
            </p>
            <div style={{ fontSize: '0.78rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} /> 100% Neutral Fair Play Guarantee
            </div>
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
              <a href="#tournaments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>🏆 Tournament Engine</a>
              <a href="#live-score" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>⚡ Live Scoring Arena</a>
              <a href="#feedback" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 600, marginTop: '4px' }}>💬 Share Feedback</a>
              <a href="#faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>❓ FAQs</a>
            </div>
          </div>

          {/* Match Alert Newsletter */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Match Alerts in Your City
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Receive instant alerts whenever a cricket squad in your neighborhood is looking for an opponent or tournament slot.
            </p>
            {subscribed ? (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: '10px', color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} /> Subscribed to local match alerts!
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
                >
                  <Send size={15} />
                </button>
              </form>
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
