import React from 'react';
import { 
  Radio, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  Smartphone, 
  Check, 
  BarChart3, 
  Globe 
} from 'lucide-react';

export default function LiveScoreCard() {
  return (
    <div 
      className="glass-panel theme-card"
      id="live-score"
      style={{
        padding: '36px',
        border: '1px solid rgba(236, 72, 153, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(236, 72, 153, 0.08)',
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
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.16) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      {/* HEADER TAG */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', position: 'relative', zIndex: 1 }}>
        <span className="badge-pill badge-pill-pink">
          <Radio size={14} /> THEME 05 &bull; LIVE SCORING
        </span>
        <span style={{ fontSize: '0.82rem', color: '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={14} /> MatchConnect App Feature
        </span>
      </div>

      {/* PROMINENT MAIN MOTIVE HERO BOX */}
      <div 
        className="theme-hero-box"
        style={{
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.14) 0%, rgba(28, 12, 20, 0.9) 100%)',
          borderLeft: '5px solid #ec4899',
          borderRadius: '0 16px 16px 0',
          padding: '24px 28px',
          marginBottom: '28px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f472b6', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          <Sparkles size={15} /> The Main Motive
        </div>

        <h3 style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', marginBottom: '12px', color: '#fff', lineHeight: 1.25 }}>
          Ball-by-Ball Live Scoring. <br />
          <span style={{ color: '#f472b6' }}>Let Friends &amp; Family Follow Along.</span>
        </h3>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '920px', margin: 0 }}>
          No more lost paper scorebooks, missed boundaries, or frantic phone calls asking &ldquo;What&rsquo;s the score?&rdquo;. 
          MatchConnect lets you score your match ball by ball on your phone, so squadmates, friends and family can follow along.
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
            <AlertTriangle size={16} /> The Chaos of Traditional Scoring
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Lost &amp; Smudged Paper Books:</strong> Rain-soaked scorebooks, lost pages, or miscounted runs at the pavilion.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Constant Phone Calls:</strong> Non-playing squadmates and family repeatedly calling for updates.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f87171', fontWeight: 800 }}>&times;</span>
              <span><strong>Forgotten Performances:</strong> Match-winning innings and 5-wicket hauls with no digital record.</span>
            </li>
          </ul>
        </div>

        {/* The MatchConnect Experience */}
        <div 
          style={{
            background: 'rgba(236, 72, 153, 0.06)',
            border: '1px solid rgba(236, 72, 153, 0.25)',
            borderRadius: '14px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f472b6', fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>
            <ShieldCheck size={16} /> The MatchConnect Experience
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#ec4899" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Simple Ball-by-Ball Scoring:</strong> Record runs, boundaries, extras and wickets right from your phone.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#ec4899" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Live Scorecard:</strong> The scorecard updates as you score, so everyone follows the same live score.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={16} color="#ec4899" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Everything In One App:</strong> Find the match, book the ground and score it all in MatchConnect.</span>
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
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Zap size={18} color="#f472b6" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Built For The Ground</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Simple screens designed to be used quickly on your phone during a match.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Globe size={18} color="#22d3ee" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Follow Live</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Friends and fans can follow the live score instead of waiting for WhatsApp updates.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <BarChart3 size={18} color="#4ade80" />
          </div>
          <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '6px' }}>Match Scorecards</h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Runs, wickets and results are recorded in a clear scorecard for every match you score.
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
          🔴 Score your next match live and let everyone follow along.
        </span>
        <span style={{ color: '#f472b6', fontWeight: 600 }}>
          Web app live &bull; Android app coming soon
        </span>
      </div>
    </div>
  );
}