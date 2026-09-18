import React, { useState } from 'react';
import { 
  Users, 
  Zap, 
  MapPin, 
  Award, 
  ChevronRight, 
  Check, 
  TrendingUp, 
  CreditCard, 
  ShieldCheck,
  Trophy
} from 'lucide-react';
import { HOW_IT_WORKS_STEPS } from '../data/promoData';

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section 
      id="how" 
      className="section-wrapper"
      style={{
        position: 'relative'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill badge-pill-cyan" style={{ marginBottom: '14px' }}>
            <TrendingUp size={14} />
            HOW MATCHCONNECT WORKS
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            From Challenge to Match Day in <span className="cyan-gradient-text">4 Seamless Steps</span>
          </h2>
          <p className="section-subtitle">
            MatchConnect brings opponents, grounds, certified umpires, and live scoring together into one frictionless journey.
          </p>
        </div>

        {/* Interactive Step Explorer Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: '36px',
            alignItems: 'center'
          }}
          className="how-main-grid"
        >
          {/* Left Column: Step Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {HOW_IT_WORKS_STEPS.map((st, idx) => {
              const isActive = idx === activeStep;
              return (
                <div
                  key={st.step}
                  onClick={() => setActiveStep(idx)}
                  className="glass-card"
                  style={{
                    padding: '22px 24px',
                    cursor: 'pointer',
                    borderRadius: '16px',
                    background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'rgba(20, 28, 22, 0.5)',
                    borderColor: isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: isActive ? '0 0 25px rgba(6, 182, 212, 0.25)' : 'none',
                    transform: isActive ? 'translateX(8px)' : 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span 
                        className="mono" 
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: isActive ? '#38bdf8' : 'var(--text-muted)'
                        }}
                      >
                        {st.step}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', color: isActive ? '#fff' : 'var(--text-primary)' }}>
                        {st.title}
                      </h3>
                    </div>
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: isActive ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: isActive ? '#38bdf8' : 'var(--text-muted)'
                      }}
                    >
                      {st.highlight}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {st.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Visual Mockup */}
          <div 
            className="glass-panel"
            style={{
              padding: '36px',
              minHeight: '440px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              background: 'rgba(10, 16, 14, 0.9)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(6, 182, 212, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {/* Step 1: Challenge Opponent */}
            {activeStep === 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} color="#22c55e" />
                    <strong style={{ color: '#fff' }}>Opponent Squad Paired in 38s</strong>
                  </div>
                  <span className="badge-pill" style={{ fontSize: '0.72rem' }}>
                    CHALLENGE ACCEPTED
                  </span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Opponent:</span>
                    <strong style={{ color: '#fff' }}>Royals Strikers CC (Capt. Arjun V.)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Overs Format:</span>
                    <strong style={{ color: '#38bdf8' }}>Turf T10 (8 Overs / Tennis Ball)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Squad Readiness:</span>
                    <strong style={{ color: '#4ade80' }}>11/11 Confirmed on Both Sides</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ⚡ Instant WhatsApp notification sent to both captains.
                </div>
              </div>
            )}

            {/* Step 2: Lock Ground */}
            {activeStep === 1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} color="#06b6d4" />
                    <strong style={{ color: '#fff' }}>Apex Floodlit Arena &bull; Slot Confirmed</strong>
                  </div>
                  <span className="badge-pill-cyan badge-pill" style={{ fontSize: '0.72rem' }}>
                    1000 LUX FLOODLIGHTS
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Pitch Fee (AstroTurf)</span>
                    <span className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>₹2,400 Total</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#4ade80' }}>
                    <span>All 16 Players Paid via Split UPI</span>
                    <span>₹150 / head</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#22c55e" />
                  <span>Ground PIN and dugout access released automatically upon confirmation.</span>
                </div>
              </div>
            )}

            {/* Step 3: Assign Umpire */}
            {activeStep === 2 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} color="#f59e0b" />
                    <strong style={{ color: '#fff' }}>Certified Match Umpire Dispatched</strong>
                  </div>
                  <span className="badge-pill-gold badge-pill" style={{ fontSize: '0.72rem' }}>
                    STATE PANEL A
                  </span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem' }}>Sanjeev Sharma</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Official Cricket Association Certified &bull; 240 Matches
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Officiating Fee:</span>
                    <strong style={{ color: '#fbbf24' }}>₹800 Split Evenly (₹40/player)</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                  ⚖️ Impartial DRS decision telemetry, legal delivery tracking, and formal score signoff.
                </div>
              </div>
            )}

            {/* Step 4: Pro Live Scoring & Telecast */}
            {activeStep === 3 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} color="#ec4899" />
                    <strong style={{ color: '#fff' }}>Ball-by-Ball Live Scoring &amp; Wagon Wheels</strong>
                  </div>
                  <span className="badge-pill" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.3)', fontSize: '0.72rem' }}>
                    LIVE TELECAST
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOP BATSMAN</div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginTop: '2px' }}>Vikram S.</div>
                    <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80', marginTop: '2px' }}>58* (24b)</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>SR: 241.6 &bull; 6x4, 4x6</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MATCH MVP BADGE</div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginTop: '2px' }}>Player of the Match</div>
                    <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ec4899', marginTop: '2px' }}>+120 Elo Pts</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Regional Rank #4</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#f472b6' }}>
                  📈 Instant WhatsApp spectator link sent: Friends follow every single ball live!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .how-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
