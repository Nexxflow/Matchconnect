import React from 'react';
import { 
  Users, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  MessageSquareOff, 
  SlidersHorizontal, 
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
          <span className="neon-gradient-text">Find Your Next Opponent, Fast.</span>
        </h3>

        <p style={{ fontSize: '1.02rem', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '920px', margin: 0 }}>
          No more spamming 50+ WhatsApp groups pleading for an opponent or haggling over match details. 
          Post your match challenge, let nearby teams see it, and confirm the format, overs and slot right inside the app.
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
              <span><strong>Endless WhatsApp Messages:</strong> Spending days begging for an opponent across scattered groups.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Mismatched Games:</strong> Strong teams crush casual weekend squads and nobody enjoys the match.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Last-Minute Confusion:</strong> Details get lost in chats and plans fall apart on match day.</span>
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
              <span><strong>Post &amp; Discover:</strong> Set your format &amp; slot. Nearby teams see your challenge and can accept in the app.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Right-Level Opponents:</strong> Filter by overs format and ball type to find a fair, competitive match.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Everything In One Place:</strong> Captains confirm the match, chat, and book the ground without leaving the app.</span>
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
            <SlidersHorizontal size={18} color="#4ade80" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Match Filters</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Choose overs format, ball type and distance so you play teams that fit your level and your schedule.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <ShieldCheck size={18} color="#22d3ee" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Clear Match Details</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Overs, ball type and timings are agreed inside the app before match day, so there are fewer arguments on the pitch.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <MapPin size={18} color="#fbbf24" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Ground Booking Built In</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Found an opponent? Pick a ground near you and book the slot from the same app.
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
          ⚡ Post a challenge once and let nearby teams come to you.
        </span>
        <span style={{ color: '#4ade80', fontWeight: 600 }}>
          Web app live &bull; Android app coming soon
        </span>
      </div>
    </div>
  );
}