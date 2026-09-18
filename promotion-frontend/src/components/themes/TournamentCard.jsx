import React from 'react';
import { 
  Trophy, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Smartphone, 
  Check, 
  Award, 
  TrendingUp, 
  Calendar, 
  Medal 
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
          <Trophy size={14} /> THEME 04 &bull; TOURNAMENTS &amp; LEAGUES
        </span>
        <span style={{ fontSize: '0.82rem', color: '#d8b4fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={14} /> MatchConnect App Feature
        </span>
      </div>

      {/* PROMINENT MAIN MOTIVE HERO BOX */}
      <div 
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

        <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '12px', color: '#fff', lineHeight: 1.25 }}>
          Run Amateur Cups Like the IPL. <br />
          <span style={{ color: '#c084fc' }}>Zero Spreadsheets, Instant NRR &amp; Live Brackets.</span>
        </h3>

        <p style={{ fontSize: '1.02rem', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '920px', margin: 0 }}>
          Organizing an amateur cricket cup usually turns into a full-time nightmare: manual Excel sheets, confusing Net Run Rate math, heated arguments over qualification tie-breakers, and delayed scores. MatchConnect automates knockout brackets, round-robin points tables, automated NRR calculation, and digital trophy showcases.
        </p>
      </div>

      {/* SIDE-BY-SIDE PROBLEM VS SOLUTION COMPARISON */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
              <span><strong>Excel &amp; WhatsApp Nightmares:</strong> Organizers spending midnight hours manually calculating decimal run rates.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Tie-Breaker Disputes:</strong> Teams arguing over complex qualification formulas and net run rate round-offs.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Delayed Fixtures:</strong> Squads waiting hours at the pavilion not knowing who or when they play next.</span>
            </li>
          </ul>
        </div>

        {/* The MatchConnect Standard */}
        <div 
          style={{
            background: 'rgba(168, 85, 247, 0.06)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>
            <ShieldCheck size={16} /> The MatchConnect Tournament Standard
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Automated Live Knockout Brackets:</strong> Winning teams advance in real-time as match results finalize.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Instant Net Run Rate (NRR):</strong> Standings tables update with sub-second accuracy after every boundary.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Digital Orange &amp; Purple Caps:</strong> Automated real-time leaderboards for top tournament run scorers and wicket takers.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 3 CORE MOTIVE PILLARS */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Trophy size={18} color="#c084fc" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>1-Click League Creation</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Knockout, double-elimination, or multi-pool corporate cups configured with automated schedules in 60 seconds.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <TrendingUp size={18} color="#22d3ee" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Zero-Argument Tie Breaks</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Official BCCI standard tie-breaking rules applied transparently to eliminate qualification squabbles.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Medal size={18} color="#4ade80" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Career Milestone Sync</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Every tournament 50, century, and 5-wicket haul syncs to permanent player resumes with verified tournament medals.
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
          🏆 <strong>1,450+ grassroots cups</strong> hosted &bull; 100% automated bracket progression and Net Run Rate sync.
        </span>
        <span style={{ color: '#c084fc', fontWeight: 600 }}>
          Available on MatchConnect iOS &amp; Android
        </span>
      </div>
    </div>
  );
}
