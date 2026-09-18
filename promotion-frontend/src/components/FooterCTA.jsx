import React, { useState } from 'react';
import { 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Send, 
  CheckCircle, 
  Radio, 
  MapPin, 
  Heart,
  Award,
  Trophy
} from 'lucide-react';

export default function FooterCTA({ onConnectTeams }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

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

  return (
    <footer 
      style={{
        position: 'relative',
        background: '#040705',
        borderTop: '1px solid rgba(34, 197, 94, 0.2)',
        paddingTop: '80px',
        paddingBottom: '40px',
        overflow: 'hidden'
      }}
    >
      {/* Background Glow */}
      <div 
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '350px',
          background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Giant Conversion Banner */}
        <div 
          className="glass-panel footer-cta-banner"
          style={{
            padding: '48px 36px',
            textAlign: 'center',
            marginBottom: '70px',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            boxShadow: '0 0 50px rgba(34, 197, 94, 0.2)'
          }}
        >
          <div className="badge-pill" style={{ marginBottom: '16px' }}>
            <Zap size={14} />
            READY TO CONNECT &amp; PLAY?
          </div>
          <h2 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', marginBottom: '16px', lineHeight: 1.15 }}>
            Connect Your Next Cricket Match in <span className="neon-gradient-text">Under 60 Seconds</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto 32px auto', fontSize: '1.1rem' }}>
            Stop wasting hours chasing players, grounds, and umpires. Connect two cricket teams instantly, 
            split turf fees automatically, and broadcast your match live to the world.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '16px 36px', fontSize: '1.05rem', textDecoration: 'none' }}
            >
              <Zap size={18} />
              Launch MatchConnect App to Play &rarr;
            </a>

            <button 
              onClick={onConnectTeams}
              className="btn btn-secondary"
              style={{ padding: '16px 32px', fontSize: '1.05rem' }}
            >
              Test Match Simulator
            </button>
          </div>

          <div style={{ marginTop: '18px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            ⚡ <em>Note: This is an advertisement showcase. All real matches, ground slots, and certified umpires are booked inside the MatchConnect App.</em>
          </div>
        </div>

        {/* Footer Navigation & Brand Row */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr',
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
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '280px' }}>
              The comprehensive recreational and turf cricket operating system. Connecting teams faster, booking grounds &amp; certified umpires, and powering tournament leagues.
            </p>
          </div>

          {/* Core Features */}
          <div>
            <h4 style={{ fontSize: '0.92rem', color: '#fff', marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Core Features
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <a href="#connect" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Fast Team Matchmaking</a>
              <a href="#cinema" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Video Showcase</a>
              <a href="#facilities" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>User Facilities</a>
              <a href="#grounds" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Book Floodlit Turfs</a>
              <a href="#tournaments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Umpires &amp; Tournaments</a>
              <a href="#sandbox" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Live Match Telecast</a>
            </div>
          </div>

          {/* Ecosystem Apps */}
          <div>
            <h4 style={{ fontSize: '0.92rem', color: '#fff', marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Ecosystem
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <a href="http://localhost:5173" target="_blank" rel="noreferrer" style={{ color: '#4ade80', textDecoration: 'none' }}>
                Player &amp; Team App &rarr;
              </a>
              <a href="http://localhost:5174" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>
                Turf Admin Console &rarr;
              </a>
              <a href="#tournaments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Umpire Officiating Hub</a>
              <a href="#tournaments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tournament Engine</a>
            </div>
          </div>

          {/* Match Alert Newsletter */}
          <div>
            <h4 style={{ fontSize: '0.92rem', color: '#fff', marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Match Alerts in Your Area
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Receive instant alerts whenever a cricket team in your neighborhood is looking for an opponent or tournament slot.
            </p>
            {subscribed ? (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: '10px', color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} /> Subscribed to neighborhood alerts!
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

        {/* Bottom Micro Row */}
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
            &copy; {new Date().getFullYear()} MatchConnect Cricket Systems. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Built for passionate cricket captains, players &amp; turf owners with</span>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-links-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 24px !important;
          }
        }
        @media (max-width: 580px) {
          .footer-cta-banner {
            padding: 30px 16px !important;
            margin-bottom: 40px !important;
          }
          .footer-cta-banner h2 {
            font-size: 1.8rem !important;
          }
          .footer-cta-banner p {
            font-size: 0.95rem !important;
          }
          .footer-cta-banner .btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .footer-links-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
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
