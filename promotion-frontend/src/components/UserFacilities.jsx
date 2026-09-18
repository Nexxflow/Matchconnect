import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  Award, 
  Trophy, 
  ShieldCheck, 
  CheckCircle, 
  ArrowRight, 
  Zap,
  Sparkles
} from 'lucide-react';
import { USER_FACILITIES } from '../data/promoData';

export default function UserFacilities() {
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const activeRole = USER_FACILITIES[activeRoleIndex];

  return (
    <section 
      id="facilities" 
      className="section-wrapper"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(7, 10, 8, 0.4) 0%, rgba(14, 20, 16, 0.8) 50%, rgba(7, 10, 8, 0.4) 100%)'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill badge-pill-cyan" style={{ marginBottom: '14px' }}>
            <Sparkles size={14} />
            DEDICATED USER FACILITIES
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            Tailored Facilities for <span className="cyan-gradient-text">Every Cricket Role</span>
          </h2>
          <p className="section-subtitle">
            MatchConnect is not just another app — it is a complete ecosystem built for captains, players, 
            turf venue owners, certified umpires, and tournament organizers.
          </p>

          {/* Role Navigation Pills */}
          <div 
            className="facilities-pills-bar"
            style={{
              display: 'inline-flex',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '6px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: '20px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            {USER_FACILITIES.map((role, idx) => {
              const isActive = idx === activeRoleIndex;
              return (
                <button
                  key={role.role}
                  onClick={() => setActiveRoleIndex(idx)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isActive ? role.accent : 'transparent',
                    color: isActive ? '#070a08' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? `0 0 15px ${role.accent}60` : 'none'
                  }}
                >
                  {role.role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Facilities Showcase Panel */}
        <div 
          className="glass-panel"
          style={{
            padding: '40px',
            border: `1px solid ${activeRole.accent}40`,
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${activeRole.accent}15`,
            position: 'relative'
          }}
        >
          {/* Header of Active Role */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '14px' }} className="facilities-header">
            <div>
              <span 
                className="badge-pill" 
                style={{ 
                  background: `${activeRole.accent}20`, 
                  borderColor: `${activeRole.accent}50`, 
                  color: activeRole.accent,
                  fontSize: '0.75rem',
                  marginBottom: '10px'
                }}
              >
                {activeRole.badge}
              </span>
              <h3 style={{ fontSize: 'clamp(1.4rem, 2.4vw, 2rem)', color: '#fff' }}>
                {activeRole.headline}
              </h3>
            </div>

            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{
                background: activeRole.accent,
                color: '#070a08',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Open {activeRole.role.split('&')[0].trim()} in App &rarr;
            </a>
          </div>

          {/* 5 Core Facilities Grid */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '16px'
            }}
          >
            {activeRole.facilities.map((fac, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = activeRole.accent;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div 
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: `${activeRole.accent}25`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CheckCircle size={16} color={activeRole.accent} />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', color: '#fff' }}>
                    {fac.title}
                  </h4>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {fac.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .facilities-pills-bar {
            border-radius: 14px !important;
            padding: 6px !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .facilities-pills-bar button {
            flex: 1 1 calc(50% - 10px) !important;
            padding: 8px 10px !important;
            font-size: 0.78rem !important;
            text-align: center !important;
            border-radius: 10px !important;
          }
          .facilities-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .facilities-header a {
            width: 100% !important;
            text-align: center !important;
          }
        }
        @media (max-width: 400px) {
          .facilities-pills-bar button {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </section>
  );
}
