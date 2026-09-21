import React from 'react';
import { 
  Trophy, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  Smartphone, 
  Check, 
  Award
} from 'lucide-react';

export default function TournamentCard() {
  return (
    <div 
      className="glass-panel theme-card"
      id="tournaments"
      style={{
        padding: '36px',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(168, 85, 247, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Ambience Glow */}
      <div 
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.16) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      {/* HEADER TAG */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', position: 'relative', zIndex: 1 }}>
        <span className="badge-pill badge-pill-purple">
          <Trophy size={14} /> THEME 04 &bull; TOURNAMENTS
        </span>
        <span style={{ fontSize: '0.82rem', color: '#d8b4fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={14} /> MatchConnect App Feature
        </span>
      </div>

      {/* PROMINENT MAIN MOTIVE HERO BOX */}
      <div 
        className="theme-hero-box"
        style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(22, 12, 30, 0.9) 100%)',
          borderLeft: '5px solid #a855f7',
          borderRadius: '0 16px 16px 0',
          padding: '24px 28px',
          marginBottom: '28px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          <Sparkles size={15} /> The Main Motive
        </div>

        <h3 style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', marginBottom: '12px', color: '#fff', lineHeight: 1.25 }}>
          Host Your Cup Without the Chaos. <br />
          <span style={{ color: '#c084fc' }}>Create, Register &amp; Keep Every Team Informed.</span>
        </h3>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '920px', margin: 0 }}>
          Organizing an amateur cricket cup usually turns into a full-time headache: scattered WhatsApp messages, manual sheets, and teams asking the same questions again and again. 
          MatchConnect gives organizers one place to create the tournament, set entry fees and prizes, and let teams register online.
        </p>
      </div>

      {/* SIDE-BY-SIDE PROBLEM VS SOLUTION COMPARISON */}
      <div 
        className="card-comparison-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '16px',
          marginBottom: '28px',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* The Old Struggle */}
        <div 
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>
            <AlertTriangle size={16} /> The Chaos of Manual Cup Management
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Excel &amp; WhatsApp Nightmares:</strong> Organizers spending hours managing team lists and details by hand.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Confusion Over Details:</strong> Teams unsure about fees, prizes, dates and rules until the last minute.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Delayed Updates:</strong> Squads waiting around not knowing who or when they play next.</span>
            </li>
          </ul>
        </div>

        {/* The MatchConnect Experience */}
        <div 
          style={{
            background: 'rgba(168, 85, 247, 0.06)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>
            <ShieldCheck size={16} /> The MatchConnect Experience
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Create in Minutes:</strong> Set the format, venue, dates, entry fee and prizes for your tournament.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Online Team Registration:</strong> Teams register from the app and organizers see who has joined.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Everything In One Place:</strong> Details, registrations and live scoring in one app instead of scattered chats.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 3 CORE MOTIVE PILLARS */}
      <div 
        className="card-pillars-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '16px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Trophy size={18} color="#c084fc" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Easy Tournament Setup</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Set up your cup with format, venue, dates, entry fee and prizes in a few taps.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Award size={18} color="#22d3ee" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Clear Details Upfront</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Entry fee and prizes are listed upfront, so every team knows exactly what they are playing for.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Zap size={18} color="#4ade80" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Live Scoring for Matches</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Score tournament matches ball by ball so teams and fans can follow along.
          </p>
        </div>
      </div>

      {/* BOTTOM SUMMARY PILL BAR */}
      <div 
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <span>
          🏆 Create a tournament once and let teams register online.
        </span>
        <span style={{ color: '#c084fc', fontWeight: 600 }}>
          Web app live &bull; Android app coming soon
        </span>
      </div>
    </div>
  );
}