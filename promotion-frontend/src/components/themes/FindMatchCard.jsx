import React from 'react';
import { 
  Users, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  MessageSquareOff, 
  TrendingUp, 
  MapPin, 
  Smartphone,
  Check
} from 'lucide-react';

export default function FindMatchCard() {
  return (
    <div 
      className="glass-panel theme-card"
      id="find-match"
      style={{
        padding: '36px',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(34, 197, 94, 0.08)',
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
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.16) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      {/* HEADER TAG */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', position: 'relative', zIndex: 1 }}>
        <span className="badge-pill badge-pill-green">
          <Users size={14} /> THEME 01 &bull; FIND A MATCH
        </span>
        <span style={{ fontSize: '0.82rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={14} /> MatchConnect App Feature
        </span>
      </div>

      {/* PROMINENT MAIN MOTIVE HERO BOX */}
      <div 
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.14) 0%, rgba(10, 24, 16, 0.9) 100%)',
          borderLeft: '5px solid #22c55e',
          borderRadius: '0 16px 16px 0',
          padding: '24px 28px',
          marginBottom: '28px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          <Sparkles size={15} /> The Main Motive
        </div>

        <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '12px', color: '#fff', lineHeight: 1.25 }}>
          Stop WhatsApp Group Chaos. <br />
          <span className="neon-gradient-text">Match with Equal-Skill Teams in 30 Seconds.</span>
        </h3>

        <p style={{ fontSize: '1.02rem', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '920px', margin: 0 }}>
          No more spamming 50+ WhatsApp groups pleading for an opponent, haggling over match balls, or enduring one-sided blowouts. MatchConnect pairs your squad with verified teams having similar skill ratings (ELO), guaranteed punctuality, and mutual rules.
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
        {/* The Old WhatsApp Struggle */}
        <div 
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>
            <MessageSquareOff size={16} /> The Chaos of Traditional Cricket
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>50+ WhatsApp Messages:</strong> Spending 3 days begging for an opponent in fragmented city groups.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Mismatched Blowouts:</strong> Academy-level semi-pros crush casual weekend teams 220 to 40.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Last-Minute No-Shows:</strong> Opponent cancels on Saturday at 7 AM, ruining your paid ground slot.</span>
            </li>
          </ul>
        </div>

        {/* The MatchConnect Solution */}
        <div 
          style={{
            background: 'rgba(34, 197, 94, 0.06)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>
            <Zap size={16} /> The MatchConnect Experience
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Instant 30s Radar:</strong> Set format &amp; slot. The algorithm pairs you with an active verified opponent immediately.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Ranked ELO Parity:</strong> Both teams enter with a 50-50 winning probability for nail-biting finishes.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Guaranteed Punctuality:</strong> Both captains lock a commitment deposit. 0% ghosting rate guaranteed.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 3 CORE PILLARS OF FAIR MATCHMAKING */}
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
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <TrendingUp size={18} color="#4ade80" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Ranked ELO Skill Parity</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Dynamic skill ratings calculated ball-by-ball. Both teams enter with balanced win probabilities for genuine contest.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <ShieldCheck size={18} color="#22d3ee" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Digital Match Contract</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Over limits, ball specifications, and powerplay rules are pre-locked digitally prior to toss. Zero disputes on the pitch.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <MapPin size={18} color="#fbbf24" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Auto-Synced Grounds</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Matches are tied to verified real-time ground slots in your city radius so neither squad is ever left without a pitch.
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
          ⚡ Average pairing time: <strong>32 seconds</strong> across 1,420+ active teams in Bangalore, Mumbai &amp; Delhi-NCR.
        </span>
        <span style={{ color: '#4ade80', fontWeight: 600 }}>
          Available on MatchConnect iOS &amp; Android
        </span>
      </div>
    </div>
  );
}
