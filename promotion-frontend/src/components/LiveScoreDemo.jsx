import React, { useState } from 'react';
import { 
  Radio, 
  Sparkles, 
  RotateCcw, 
  Flame, 
  Trophy, 
  TrendingUp, 
  Award, 
  Zap 
} from 'lucide-react';

// Lightweight self-contained celebratory confetti burst
function fireCelebratoryConfetti() {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#22c55e', '#4ade80', '#06b6d4', '#f59e0b', '#ec4899', '#a855f7', '#fbbf24'];
  const particles = Array.from({ length: 60 }, () => ({
    x: canvas.width * (0.3 + Math.random() * 0.4),
    y: canvas.height * 0.65,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 14 - 8,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 15,
    alpha: 1
  }));

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.rotation += p.rotSpeed;
      p.alpha -= 0.015;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    frame++;
    if (alive && frame < 120) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(animate);
}


export default function LiveScoreDemo() {
  const [runs, setRuns] = useState(142);
  const [wickets, setWickets] = useState(3);
  const [balls, setBalls] = useState(2); // 2 balls into 15th over -> 14.2
  const [oversCompleted, setOversCompleted] = useState(14);
  const [recentBalls, setRecentBalls] = useState(['1', '0', '4', '6']);
  const [commentary, setCommentary] = useState('Vikram steps out and smashes it over mid-wicket for a massive SIX!');
  const [lastShot, setLastShot] = useState('6');

  // Interactive Scoring Engine
  const handleScoreBall = (type) => {
    let ballLabel = type;
    let runsAdded = 0;
    let wicketAdded = 0;
    let comment = '';

    if (type === '0') {
      comment = 'Good length delivery outside off, defensive tap back to the bowler.';
    } else if (type === '1') {
      runsAdded = 1;
      comment = 'Quick single pushed into the covers. Good aggressive running between wickets!';
    } else if (type === '2') {
      runsAdded = 2;
      comment = 'Flicked into the deep backward square leg gap. Squad hustles back for two!';
    } else if (type === '4') {
      runsAdded = 4;
      comment = 'CRACK! Beautiful cover drive piercing the infield all the way for FOUR!';
    } else if (type === '6') {
      runsAdded = 6;
      comment = 'BOOM! Clean strike into the floodlights! That is outta here for a MAXIMUM!';
      // Fire celebratory confetti!
      fireCelebratoryConfetti();
    } else if (type === 'W') {
      wicketAdded = 1;
      ballLabel = 'W';
      comment = 'OUT! Castle knocked back! High pace yorker demolishes the middle stump!';
    }

    setRuns((r) => r + runsAdded);
    setWickets((w) => Math.min(10, w + wicketAdded));
    setLastShot(type);
    setCommentary(comment);

    // Over ball management
    if (balls === 5) {
      setBalls(0);
      setOversCompleted((o) => o + 1);
      setRecentBalls([...recentBalls.slice(-5), ballLabel, '|']);
    } else {
      setBalls((b) => b + 1);
      setRecentBalls([...recentBalls.slice(-5), ballLabel]);
    }
  };

  const handleReset = () => {
    setRuns(142);
    setWickets(3);
    setBalls(2);
    setOversCompleted(14);
    setRecentBalls(['1', '0', '4', '6']);
    setCommentary('Live match scoring restarted. Tap any scoring button below to test!');
    setLastShot('6');
  };

  const currentOverString = `${oversCompleted}.${balls}`;
  const totalOvers = 20;
  const currentTotalBalls = oversCompleted * 6 + balls;
  const runRate = currentTotalBalls > 0 ? ((runs / currentTotalBalls) * 6).toFixed(2) : '0.00';
  const projectedScore = Math.round(Number(runRate) * totalOvers);

  return (
    <section 
      id="sandbox" 
      className="section-wrapper"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(7, 10, 8, 0) 0%, rgba(16, 22, 18, 0.75) 50%, rgba(7, 10, 8, 0) 100%)'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill badge-pill-gold" style={{ marginBottom: '14px' }}>
            <Flame size={14} />
            INTERACTIVE CRICKET SCORING SANDBOX
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            Try The Live Match <span className="gold-gradient-text">Scoring Telemetry</span>
          </h2>
          <p className="section-subtitle">
            Tap the ball outcome buttons below to see how MatchConnect delivers instant live scoring, 
            run rate calculations, and dynamic stadium reactions in real time.
          </p>
        </div>

        {/* Interactive Scoreboard Container */}
        <div 
          className="glass-panel"
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            padding: '36px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 45px rgba(245, 158, 11, 0.15)',
            position: 'relative'
          }}
        >
          {/* Top Telemetry Header */}
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '18px',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="live-dot" style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }}></span>
              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>THUNDERBOLTS CC vs ROYALS STRIKERS</strong>
              <span className="badge-pill-gold badge-pill" style={{ fontSize: '0.68rem' }}>
                1ST INNINGS
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={12} /> Reset Demo
              </button>
            </div>
          </div>

          {/* Main Score Centerpiece */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '24px',
              padding: '28px 0',
              alignItems: 'center'
            }}
            className="scoreboard-grid"
          >
            {/* Left: Giant Score & Run Rate */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <div 
                  className="mono" 
                  style={{
                    fontSize: 'clamp(3.4rem, 6.5vw, 5.2rem)',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#fff',
                    textShadow: '0 0 30px rgba(255,255,255,0.2)'
                  }}
                >
                  {runs} <span style={{ color: '#f59e0b' }}>/ {wickets}</span>
                </div>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                  ({currentOverString} / {totalOvers} ov)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Current RR: </span>
                  <strong style={{ color: '#4ade80' }}>{runRate}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Projected: </span>
                  <strong style={{ color: '#38bdf8' }}>{projectedScore}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Extras: </span>
                  <strong style={{ color: '#fff' }}>8 (w 5, nb 3)</strong>
                </div>
              </div>
            </div>

            {/* Right: Current Batsmen & Bowler Card */}
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '14px',
                padding: '16px 20px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px', color: '#fff', fontWeight: 600 }}>
                <span>🏏 Vikram Sethi *</span>
                <span className="mono" style={{ color: '#4ade80' }}>58* (24b) &bull; 241.6 SR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '14px', color: 'var(--text-secondary)' }}>
                <span>🏏 Arjun Nair</span>
                <span className="mono">34 (20b) &bull; 170.0 SR</span>
              </div>
              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#fbbf24' }}>
                <span>🎯 Bowler: Dinesh R.</span>
                <span className="mono">2.2 ov &bull; 1/24</span>
              </div>
            </div>
          </div>

          {/* This Over Recent Balls */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              THIS OVER SEQUENCE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {recentBalls.map((b, i) => {
                if (b === '|') {
                  return <div key={i} style={{ width: '2px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />;
                }
                const isSix = b === '6';
                const isFour = b === '4';
                const isWicket = b === 'W';
                return (
                  <div
                    key={i}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: isSix ? '#22c55e' : isFour ? '#3b82f6' : isWicket ? '#ef4444' : 'rgba(255,255,255,0.08)',
                      color: isSix || isFour || isWicket ? '#051408' : '#fff',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.95rem',
                      boxShadow: isSix ? '0 0 15px rgba(34,197,94,0.6)' : isFour ? '0 0 15px rgba(59,130,246,0.6)' : 'none',
                      animation: i === recentBalls.length - 1 ? 'popIn 0.3s ease' : 'none'
                    }}
                  >
                    {b}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Live Commentary Strip */}
          <div 
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '12px',
              padding: '14px 18px',
              fontSize: '0.88rem',
              color: '#fef08a',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Sparkles size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <strong>Live Telemetry Commentary:</strong> {commentary}
            </div>
          </div>

          {/* INTERACTIVE CONTROLLER BUTTONS */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TAP ANY BUTTON TO SCORE A BALL:
            </div>

            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '12px'
              }}
              className="scorer-buttons-grid"
            >
              {[
                { type: '0', label: 'Dot (0)', color: 'rgba(255,255,255,0.05)', textColor: '#9ca3af' },
                { type: '1', label: '+1 Single', color: 'rgba(255,255,255,0.08)', textColor: '#fff' },
                { type: '2', label: '+2 Double', color: 'rgba(255,255,255,0.12)', textColor: '#fff' },
                { type: '4', label: 'FOUR (4)', color: 'rgba(59, 130, 246, 0.25)', textColor: '#60a5fa', glow: 'rgba(59,130,246,0.4)' },
                { type: '6', label: 'SIX (6) 🚀', color: 'rgba(34, 197, 94, 0.3)', textColor: '#4ade80', glow: 'rgba(34,197,94,0.5)' },
                { type: 'W', label: 'WICKET 💥', color: 'rgba(239, 68, 68, 0.25)', textColor: '#f87171', glow: 'rgba(239,68,68,0.4)' }
              ].map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => handleScoreBall(btn.type)}
                  style={{
                    padding: '16px 8px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: btn.color,
                    color: btn.textColor,
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: btn.glow ? `0 0 15px ${btn.glow}` : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Link to MatchConnect App */}
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                ⚡ <em>This is an interactive advertising preview. Full live match scoring, player strike rates, wagon wheels, and WhatsApp viewer links are scored inside the <strong>MatchConnect App</strong>.</em>
              </div>
              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ padding: '14px 32px', fontSize: '1rem', textDecoration: 'none' }}
              >
                <Radio size={18} />
                Open MatchConnect App to Score Your Match &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 768px) {
          .scoreboard-grid {
            grid-template-columns: 1fr !important;
          }
          .scorer-buttons-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .scorer-buttons-grid {
            gap: 6px !important;
          }
          .scorer-buttons-grid button {
            padding: 12px 4px !important;
            font-size: 0.82rem !important;
            border-radius: 10px !important;
          }
        }
      `}</style>
    </section>
  );
}
