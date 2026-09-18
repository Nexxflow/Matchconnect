import React, { useState } from 'react';
import { 
  MapPin, 
  Star, 
  Clock, 
  ShieldCheck, 
  Sun, 
  Video, 
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { SAMPLE_TURFS } from '../data/promoData';

export default function GroundsSpotlight({ onSelectGround }) {
  const [selectedTurf, setSelectedTurf] = useState(SAMPLE_TURFS[0].id);

  return (
    <section 
      id="grounds" 
      className="section-wrapper"
      style={{
        position: 'relative'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill badge-pill-cyan" style={{ marginBottom: '14px' }}>
            <MapPin size={14} />
            VERIFIED TURFS &amp; FLOODLIT ARENAS
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            Play On Pro Grade <span className="cyan-gradient-text">Floodlit Grounds</span>
          </h2>
          <p className="section-subtitle">
            Every ground on MatchConnect is physically inspected for shock absorption, shadowless LED lux levels, 
            and official cricket boundary dimensions.
          </p>
        </div>

        {/* Grounds Cards Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px'
          }}
          className="grounds-grid"
        >
          {SAMPLE_TURFS.map((turf) => {
            const isSelected = turf.id === selectedTurf;
            return (
              <div
                key={turf.id}
                onClick={() => setSelectedTurf(turf.id)}
                className="glass-card"
                style={{
                  padding: '24px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(16, 28, 22, 0.9)' : 'rgba(15, 20, 16, 0.65)',
                  border: isSelected ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isSelected ? '0 10px 35px rgba(34, 197, 94, 0.25)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Top Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="badge-pill" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                      <span className="live-dot" style={{ width: '5px', height: '5px' }}></span>
                      {turf.slotsAvailableTonight} SLOTS TONIGHT
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 700 }}>
                      <Star size={14} fill="#fbbf24" />
                      <span>{turf.rating}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({turf.reviews})</span>
                    </div>
                  </div>

                  {/* Turf Name & Location */}
                  <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '6px' }}>
                    {turf.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    <MapPin size={14} color="#06b6d4" />
                    <span>{turf.location}</span>
                  </div>

                  {/* Pitch & Lighting Specs */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#86efac', fontWeight: 600, marginBottom: '4px' }}>
                      🌱 {turf.pitch}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      💡 {turf.lights}
                    </div>
                  </div>

                  {/* Amenities Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {turf.amenities.map((am, i) => (
                      <span 
                        key={i}
                        style={{
                          fontSize: '0.72rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {am}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Price & Booking CTA */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pitch Fee</div>
                    <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                      ₹{turf.pricePerHour} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/hr</span>
                    </div>
                  </div>

                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      textDecoration: 'none'
                    }}
                  >
                    Book in App
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .grounds-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .grounds-grid .btn {
            width: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
