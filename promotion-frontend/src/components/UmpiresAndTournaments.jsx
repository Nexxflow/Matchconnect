import React, { useState } from 'react';
import { 
  Award, 
  Trophy, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Star, 
  Users, 
  DollarSign,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CERTIFIED_UMPIRES, ACTIVE_TOURNAMENTS } from '../data/promoData';

export default function UmpiresAndTournaments() {
  const [activeTab, setActiveTab] = useState('umpires'); // 'umpires' | 'tournaments'
  const [bookedUmpireId, setBookedUmpireId] = useState(null);
  const [registeredTourId, setRegisteredTourId] = useState(null);

  const handleBookUmpire = (id) => {
    setBookedUmpireId(id);
    setTimeout(() => {
      setBookedUmpireId(null);
    }, 3000);
  };

  const handleRegisterTour = (id) => {
    setRegisteredTourId(id);
    setTimeout(() => {
      setRegisteredTourId(null);
    }, 3000);
  };

  return (
    <section 
      id="tournaments" 
      className="section-wrapper"
      style={{
        position: 'relative'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill badge-pill-gold" style={{ marginBottom: '14px' }}>
            <Trophy size={14} />
            PRO OFFICIALS &amp; COMPETITIONS
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            Book Certified Umpires &amp; <span className="gold-gradient-text">Join Tournaments</span>
          </h2>
          <p className="section-subtitle">
            Take your weekend cricket to professional standards. Hire certified match umpires for impartial officiating 
            and enter high-stakes regional cricket cups with verified prize money escrow.
          </p>

          {/* Switcher Tab */}
          <div 
            className="tournaments-tabs-wrap"
            style={{
              display: 'inline-flex',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: '20px'
            }}
          >
            <button
              onClick={() => setActiveTab('umpires')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === 'umpires' ? '#f59e0b' : 'transparent',
                color: activeTab === 'umpires' ? '#070a08' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ⚖️ Certified Umpires Panel
            </button>
            <button
              onClick={() => setActiveTab('tournaments')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === 'tournaments' ? '#a855f7' : 'transparent',
                color: activeTab === 'tournaments' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🏆 Active Tournaments &amp; Cups
            </button>
          </div>
        </div>

        {/* TAB 1: CERTIFIED UMPIRES DIRECTORY */}
        {activeTab === 'umpires' && (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px'
            }}
            className="tournaments-cards-grid"
          >
            {CERTIFIED_UMPIRES.map((ump) => {
              const isBooked = bookedUmpireId === ump.id;
              return (
                <div
                  key={ump.id}
                  className="glass-card"
                  style={{
                    padding: '28px',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(245, 158, 11, 0.25)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span className="badge-pill-gold badge-pill" style={{ fontSize: '0.7rem' }}>
                        <ShieldCheck size={12} /> {ump.certification}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700 }}>
                        <Star size={14} fill="#fbbf24" />
                        <span>{ump.rating}</span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '4px' }}>
                      {ump.name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      {ump.role} &bull; <strong style={{ color: '#fff' }}>{ump.experience} Experience</strong>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Officiated</div>
                        <strong style={{ color: '#fff' }}>{ump.matchesOfficiated} Matches</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Availability</div>
                        <strong style={{ color: '#4ade80' }}>{ump.status}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Match Fee</div>
                      <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>
                        ₹{ump.feePerMatch} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ match</span>
                      </div>
                    </div>

                    <a
                      href="http://localhost:5173"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{
                        padding: '10px 18px',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#070a08',
                        textDecoration: 'none'
                      }}
                    >
                      Book in App &rarr;
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: ACTIVE TOURNAMENTS SHOWCASE */}
        {activeTab === 'tournaments' && (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px'
            }}
            className="tournaments-cards-grid"
          >
            {ACTIVE_TOURNAMENTS.map((tour) => {
              const isRegistered = registeredTourId === tour.id;
              return (
                <div
                  key={tour.id}
                  className="glass-card"
                  style={{
                    padding: '28px',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(168, 85, 247, 0.3)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span className="badge-pill" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', borderColor: 'rgba(168,85,247,0.3)', fontSize: '0.7rem' }}>
                        <Trophy size={12} /> {tour.status}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>
                        {tour.teamsRegistered}/{tour.maxTeams} Teams
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '6px' }}>
                      {tour.name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                      🏏 {tour.format} &bull; 📍 {tour.location}
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px 16px', borderRadius: '12px', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRIZE POOL ESCROW</span>
                        <span className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>
                          {tour.prizePool}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#86efac' }}>
                        1st: {tour.firstPrize}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Team Entry</div>
                      <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                        {tour.entryFee}
                      </div>
                    </div>

                    <a
                      href="http://localhost:5173"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        padding: '10px 18px',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                        color: '#fff',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      Join in App &rarr;
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 960px) {
          .tournaments-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .tournaments-tabs-wrap {
            display: flex !important;
            width: 100% !important;
            flex-direction: column !important;
            border-radius: 14px !important;
          }
          .tournaments-tabs-wrap button {
            width: 100% !important;
            border-radius: 10px !important;
            padding: 10px 14px !important;
          }
        }
        @media (max-width: 480px) {
          .tournaments-cards-grid .btn {
            width: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
