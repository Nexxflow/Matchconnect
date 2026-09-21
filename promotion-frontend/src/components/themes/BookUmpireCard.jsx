import React from 'react';
import { 
  Scale, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  Smartphone, 
  Check, 
  UserCheck
} from 'lucide-react';

export default function BookUmpireCard() {
  return (
    <div 
      className="glass-panel theme-card"
      id="book-umpire"
      style={{
        padding: '36px',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.08)',
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
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      {/* HEADER TAG */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', position: 'relative', zIndex: 1 }}>
        <span className="badge-pill badge-pill-gold">
          <Scale size={14} /> THEME 02 &bull; BOOK AN UMPIRE
        </span>
        <span style={{ fontSize: '0.82rem', color: '#fde047', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={14} /> MatchConnect App Feature
        </span>
      </div>

      {/* PROMINENT MAIN MOTIVE HERO BOX */}
      <div 
        className="theme-hero-box"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(26, 20, 10, 0.9) 100%)',
          borderLeft: '5px solid #f59e0b',
          borderRadius: '0 16px 16px 0',
          padding: '24px 28px',
          marginBottom: '28px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          <Sparkles size={15} /> The Main Motive
        </div>

        <h3 style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', marginBottom: '12px', color: '#fff', lineHeight: 1.25 }}>
          A Neutral Umpire for Your Match. <br />
          <span className="gold-gradient-text">Fewer Fights, Fairer Games.</span>
        </h3>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '920px', margin: 0 }}>
          Nothing ruins weekend cricket faster than team-umpired matches where close LBWs, nicked catches and waist-high full tosses turn into fights. 
          With MatchConnect you can book a neutral umpire with a clear match fee, so both teams can focus on playing.
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
            <AlertTriangle size={16} /> The Chaos of Self-Umpired Matches
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Biased Friend Decisions:</strong> Fielding teams refuse to give their captain out on plumb LBWs.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>No-Ball Fights:</strong> Constant shouting over subjective calls on fast full-toss deliveries.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Walk-Offs &amp; Abandoned Games:</strong> Heated arguments can end a good match early and leave bad blood.</span>
            </li>
          </ul>
        </div>

        {/* The MatchConnect Experience */}
        <div 
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>
            <ShieldCheck size={16} /> The MatchConnect Experience
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Independent Umpires:</strong> Book a neutral official who is not connected to either team.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Clear Match Fees:</strong> The fee per match is visible before you book, so no awkward haggling.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Fair Play On The Field:</strong> Both teams respect an independent call, so the match stays competitive.</span>
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
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <UserCheck size={18} color="#fbbf24" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Umpire Profiles</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Browse umpire profiles with experience and fee per match before you choose.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Zap size={18} color="#22d3ee" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Simple Booking</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Choose an umpire for your date and match directly from the app.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <ShieldCheck size={18} color="#4ade80" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Neutral By Design</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Umpires are independent of both teams, so calls are not influenced by friendships.
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
          ⚖️ Book a neutral umpire for your next match.
        </span>
        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
          Web app live &bull; Android app coming soon
        </span>
      </div>
    </div>
  );
}