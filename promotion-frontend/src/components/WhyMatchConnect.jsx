import React, { useState } from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  MapPin, 
  Award, 
  Trophy,
  ArrowRight
} from 'lucide-react';
import { WHY_MATCHCONNECT } from '../data/promoData';

export default function WhyMatchConnect() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <section 
      id="why" 
      className="section-wrapper"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(7, 10, 8, 0.4) 0%, rgba(12, 17, 13, 0.9) 50%, rgba(7, 10, 8, 0.4) 100%)'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill" style={{ marginBottom: '14px' }}>
            <Sparkles size={14} />
            WHY MATCHCONNECT
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            The Weekend Cricket Problems <span className="neon-gradient-text">We Solved Forever</span>
          </h2>
          <p className="section-subtitle">
            MatchConnect was engineered with one single motive: remove every headache of organizing recreational cricket 
            so teams can just show up and play.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px'
          }}
          className="why-cards-grid"
        >
          {WHY_MATCHCONNECT.map((item, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '32px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(34, 197, 94, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div 
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {item.icon === 'Zap' && <Zap size={22} color="#22c55e" />}
                    {item.icon === 'MapPin' && <MapPin size={22} color="#06b6d4" />}
                    {item.icon === 'Award' && <Award size={22} color="#f59e0b" />}
                    {item.icon === 'Trophy' && <Trophy size={22} color="#a855f7" />}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>
                    {item.title}
                  </h3>
                </div>

                {/* Problem Box */}
                <div 
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#f87171', fontWeight: 700, marginBottom: '4px' }}>
                    <XCircle size={14} /> THE TRADITIONAL HEADACHE
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.problem}
                  </div>
                </div>

                {/* Solution Box */}
                <div 
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    borderRadius: '12px',
                    padding: '14px 16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, marginBottom: '4px' }}>
                    <CheckCircle2 size={14} /> THE MATCHCONNECT ADVANTAGE
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#f0fdf4', lineHeight: 1.5 }}>
                    {item.solution}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight Metrics Strip */}
        <div 
          className="glass-panel why-metrics-grid"
          style={{
            marginTop: '40px',
            padding: '24px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            textAlign: 'center'
          }}
        >
          <div>
            <div className="mono neon-gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
              10x Faster
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Team Match Confirmation
            </div>
          </div>

          <div>
            <div className="mono cyan-gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
              450+ Turfs
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Instant Slot Lock &amp; Split Pay
            </div>
          </div>

          <div>
            <div className="mono gold-gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
              320+ Umpires
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Impartial State/District Officials
            </div>
          </div>

          <div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#a855f7' }}>
              100% Free Live Telecast
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              WhatsApp Live Viewer Link
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .why-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .why-metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 480px) {
          .why-metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            padding: 16px 12px !important;
          }
          .why-metrics-grid .mono {
            font-size: 1.5rem !important;
          }
          .why-metrics-grid div > div:last-child {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </section>
  );
}
