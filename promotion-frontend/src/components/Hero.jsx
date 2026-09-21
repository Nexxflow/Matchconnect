import React from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  Zap,
  Users
} from 'lucide-react';

export default function Hero({ onExploreConnect }) {
  return (
    <section 
      className="hero-section"
      style={{
        position: 'relative',
        paddingTop: '150px',
        paddingBottom: '80px',
        overflow: 'hidden'
      }}
    >
      {/* Background Stadium Glow & Light Beams */}
      <div className="stadium-glow-backdrop">
        <div className="light-cone-left"></div>
        <div className="light-cone-right"></div>
        <div 
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            maxWidth: '100vw',
            height: '450px',
            background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.16) 0%, rgba(6, 182, 212, 0.08) 40%, transparent 75%)',
            filter: 'blur(70px)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Top Promotional Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div 
            className="badge-pill hero-badge"
            style={{
              padding: '8px 18px',
              fontSize: '0.85rem',
              gap: '8px',
              background: 'rgba(34, 197, 94, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
              maxWidth: '100%',
              flexWrap: 'wrap',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <span className="live-dot"></span>
            <span>CRICKET OPERATING SYSTEM</span>
            <span className="hero-badge-divider" style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>Connect Matches 10x Faster</span>
          </div>
        </div>

        {/* Main Headline */}
        <div style={{ textAlign: 'center', maxWidth: '1020px', margin: '0 auto 24px auto' }}>
          <h1 
            style={{
              fontSize: 'clamp(1.85rem, 5.8vw, 4.4rem)',
              lineHeight: 1.15,
              marginBottom: '16px',
              letterSpacing: '-0.03em'
            }}
          >
            Connect Cricket Matches <span className="neon-gradient-text">10x Faster.</span> <br />
            Book Grounds, Umpires &amp; <span className="gold-gradient-text">Tournaments in the App.</span>
          </h1>
          <p 
            style={{
              fontSize: 'clamp(0.95rem, 1.6vw, 1.25rem)',
              color: 'var(--text-secondary)',
              maxWidth: '820px',
              margin: '0 auto',
              lineHeight: 1.6
            }}
          >
            Stop spending days begging for teams in chaotic WhatsApp groups. The <strong>MatchConnect App</strong> connects 
            two cricket teams in under 60 seconds, locks floodlit turfs, assigns certified panel umpires, and manages tournament leagues.
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div 
          className="hero-cta-buttons"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}
        >
          <a 
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              padding: '15px 32px',
              fontSize: '1rem',
              boxShadow: '0 0 35px rgba(34, 197, 94, 0.45)',
              minHeight: '48px'
            }}
          >
            <Zap size={20} />
            Open MatchConnect App
            <ChevronRight size={18} />
          </a>

          <button 
            onClick={onExploreConnect}
            className="btn btn-secondary"
            style={{
              padding: '15px 26px',
              fontSize: '1rem',
              borderColor: 'rgba(34, 197, 94, 0.4)',
              background: 'rgba(34, 197, 94, 0.12)',
              color: '#4ade80',
              minHeight: '48px'
            }}
          >
            <Sparkles size={18} />
            Explore 5 Themes &amp; Cards
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-section {
            padding-top: 104px !important;
            padding-bottom: 50px !important;
          }
        }
        @media (max-width: 540px) {
          .hero-section {
            padding-top: 86px !important;
            padding-bottom: 36px !important;
          }
          .hero-cta-buttons .btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }
        @media (max-width: 380px) {
          .hero-badge {
            font-size: 0.72rem !important;
            padding: 6px 10px !important;
          }
          .hero-badge-divider {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
