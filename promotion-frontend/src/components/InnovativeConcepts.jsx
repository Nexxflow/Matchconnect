import React, { useState } from 'react';
import { 
  Sparkles, 
  Video, 
  Play, 
  UserCheck, 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  Star, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Share2,
  DollarSign,
  AlertCircle,
  Radio,
  Sliders,
  Send,
  Smartphone
} from 'lucide-react';

export default function InnovativeConcepts() {
  // CONCEPT 1: AI Auto-Reel Studio State
  const [selectedClip, setSelectedClip] = useState('six'); // 'six' | 'yorker' | 'winner'
  const [reelExported, setReelExported] = useState(false);

  const REEL_CLIPS = {
    six: {
      title: 'Rohit S. 88m Maximum over Long-On',
      over: 'Over 18.4 &bull; 108 KPH Delivery',
      soundtrack: 'Crowd Roar + Bass Drop Commentary',
      duration: '0:15s',
      views: '12.4k Views'
    },
    yorker: {
      title: 'Jasprit B. Toe-Crushing Yorker Wicket',
      over: 'Over 14.2 &bull; 136 KPH Yorker',
      soundtrack: 'Stump Mic Crash + Stadium Horn',
      duration: '0:12s',
      views: '19.8k Views'
    },
    winner: {
      title: 'Winning Boundary on Last Ball of Chase',
      over: 'Over 19.6 &bull; 2 Runs Needed',
      soundtrack: 'Victory Celebration + Dugout Rush',
      duration: '0:18s',
      views: '24.1k Views'
    }
  };

  const handleExportReel = () => {
    setReelExported(true);
    setTimeout(() => setReelExported(false), 3500);
  };

  // CONCEPT 2: SOS Ringer Scout State
  const [sosRole, setSosRole] = useState('bowler'); // 'bowler' | 'batter' | 'keeper'
  const [sosPinging, setSosPinging] = useState(false);
  const [summonedRinger, setSummonedRinger] = useState(null);

  const RINGERS = [
    {
      id: 'r1',
      name: 'Aditya "The Finisher" Rao',
      role: 'Pace Bowling All-Rounder',
      distance: '2.4 km away',
      eta: '9 mins to ground',
      rating: 94,
      matches: 68,
      avatar: 'AR'
    },
    {
      id: 'r2',
      name: 'Tanmay Saxena',
      role: 'Top-Order Aggressive Bat',
      distance: '3.1 km away',
      eta: '12 mins to ground',
      rating: 91,
      matches: 52,
      avatar: 'TS'
    },
    {
      id: 'r3',
      name: 'Farhan Zaidi',
      role: 'Right-Arm Express Fast Bowler',
      distance: '1.8 km away',
      eta: '7 mins to ground',
      rating: 93,
      matches: 75,
      avatar: 'FZ'
    }
  ];

  const handleTriggerSos = () => {
    setSosPinging(true);
    setSummonedRinger(null);
    setTimeout(() => {
      setSosPinging(false);
      setSummonedRinger(RINGERS[0]);
    }, 1200);
  };

  // CONCEPT 3: Split-Pot Escrow State
  const [totalCost, setTotalCost] = useState(4400);
  const [playerCount, setPlayerCount] = useState(22);
  const perHeadCost = Math.round(totalCost / playerCount);

  const SQUAD_PAYMENTS = [
    { name: 'Rohit (Capt)', status: 'Paid', method: 'GPay', time: 'Instant' },
    { name: 'Arjun V.', status: 'Paid', method: 'PhonePe', time: '2m ago' },
    { name: 'Vikram P.', status: 'Paid', method: 'Paytm', time: '4m ago' },
    { name: 'Karan M.', status: 'Paid', method: 'UPI', time: '5m ago' },
    { name: 'Sameer K.', status: 'Paid', method: 'GPay', time: '7m ago' },
    { name: 'Syed F.', status: 'Pending', method: 'SMS Sent', time: 'Holds Slot' }
  ];

  return (
    <section 
      id="innovations" 
      className="section-wrapper"
      style={{
        position: 'relative',
        paddingTop: '60px',
        paddingBottom: '90px'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span className="badge-pill" style={{ padding: '6px 16px' }}>
              <Sparkles size={14} />
              MATCHCONNECT LABS &bull; 3 NEXT-GEN CONCEPTS
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2.2rem, 4.2vw, 3.4rem)', lineHeight: 1.15, marginBottom: '16px' }}>
            Next-Gen Cricket Concepts <br />
            <span className="gold-gradient-text">Only on MatchConnect</span>
          </h2>

          <p className="section-subtitle" style={{ maxWidth: '780px', margin: '0 auto', fontSize: '1.05rem' }}>
            Beyond the fundamentals, we re-imagined the grassroots cricket experience from the ground up. 
            Explore these 3 breakthrough features built into the MatchConnect platform.
          </p>
        </div>

        {/* 3 Innovative Cards Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          
          {/* CONCEPT 1: AI Auto-Reel Studio */}
          <div 
            className="glass-panel theme-card"
            style={{
              padding: '36px',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(236, 72, 153, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Glow */}
            <div 
              style={{
                position: 'absolute',
                top: '-70px',
                right: '-70px',
                width: '260px',
                height: '260px',
                background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
                filter: 'blur(50px)',
                pointerEvents: 'none'
              }}
            />

            {/* Motive Block */}
            <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <span className="badge-pill badge-pill-pink">
                  <Video size={14} /> CONCEPT 01 &bull; AI HIGHLIGHT REELS STUDIO
                </span>
                <span style={{ fontSize: '0.8rem', color: '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={14} /> 9:16 Instagram &amp; Status Auto-Generator
                </span>
              </div>

              <div 
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(24, 12, 20, 0.8) 100%)',
                  borderLeft: '4px solid #ec4899',
                  borderRadius: '0 12px 12px 0',
                  padding: '16px 20px',
                  marginBottom: '16px'
                }}
              >
                <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '6px' }}>
                  The Main Motive: <span style={{ color: '#f472b6' }}>Never Miss Your Boundary or Wicket Reel. Auto-Cut in 10 Seconds.</span>
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  Recreational players pull off magical cover drives and hat-tricks every weekend, but no one is filming them with professional editing. Point a smartphone on a tripod at the pitch: MatchConnect AI automatically detects boundaries, wickets, and celebrations, cutting them into vertical 9:16 reels with broadcast sound and live stats watermarks.
                </p>
              </div>
            </div>

            {/* Interactive Showcase */}
            <div 
              style={{
                background: 'rgba(18, 12, 18, 0.85)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                position: 'relative',
                zIndex: 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                  Select Match Highlight to Auto-Render:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedClip('six')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedClip === 'six' ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedClip === 'six' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedClip === 'six' ? '#f472b6' : 'var(--text-secondary)'
                    }}
                  >
                    88m Sixer
                  </button>
                  <button
                    onClick={() => setSelectedClip('yorker')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedClip === 'yorker' ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedClip === 'yorker' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedClip === 'yorker' ? '#f472b6' : 'var(--text-secondary)'
                    }}
                  >
                    136kph Yorker Wicket
                  </button>
                  <button
                    onClick={() => setSelectedClip('winner')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedClip === 'winner' ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedClip === 'winner' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedClip === 'winner' ? '#f472b6' : 'var(--text-secondary)'
                    }}
                  >
                    Last Ball Finish
                  </button>
                </div>
              </div>

              {/* Reel Simulated Mockup */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'center' }}>
                <div 
                  style={{
                    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 10, 20, 0.95) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                    padding: '20px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.72rem', background: '#ec4899', color: '#000', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      AI AUTO-EDITED &bull; 9:16 REEL
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#f472b6' }}>{REEL_CLIPS[selectedClip].duration}</span>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', color: '#fff', margin: '0 0 4px 0' }}>
                    {REEL_CLIPS[selectedClip].title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                    {REEL_CLIPS[selectedClip].over}
                  </p>

                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '14px', fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Radio size={14} color="#ec4899" />
                    <span>Audio Sync: <strong>{REEL_CLIPS[selectedClip].soundtrack}</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Trending in Bangalore Grassroots</span>
                    <strong style={{ color: '#86efac' }}>{REEL_CLIPS[selectedClip].views}</strong>
                  </div>
                </div>

                <div>
                  <h5 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '8px' }}>
                    Zero Video Editing Knowledge Required
                  </h5>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                    The MatchConnect app automatically synchronizes match events from the live score ticker with the camera video stream, trimming the exact 8 seconds before and 7 seconds after each boundary.
                  </p>

                  {reelExported ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86efac', fontSize: '0.85rem', fontWeight: 600, padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
                      <CheckCircle2 size={16} /> Reel exported! Ready to share directly to Instagram &amp; WhatsApp Status.
                    </div>
                  ) : (
                    <button
                      onClick={handleExportReel}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Share2 size={14} /> Simulate 1-Tap Reel Export
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CONCEPT 2: SOS 11th Player (Ringer Scout Radar) */}
          <div 
            className="glass-panel theme-card"
            style={{
              padding: '36px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(34, 197, 94, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Glow */}
            <div 
              style={{
                position: 'absolute',
                top: '-70px',
                right: '-70px',
                width: '260px',
                height: '260px',
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
                filter: 'blur(50px)',
                pointerEvents: 'none'
              }}
            />

            {/* Motive Block */}
            <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <span className="badge-pill badge-pill-green">
                  <UserCheck size={14} /> CONCEPT 02 &bull; SOS 11TH PLAYER RINGER SCOUT
                </span>
                <span style={{ fontSize: '0.8rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} /> 3-Minute Emergency Replacement
                </span>
              </div>

              <div 
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(10, 24, 16, 0.8) 100%)',
                  borderLeft: '4px solid #22c55e',
                  borderRadius: '0 12px 12px 0',
                  padding: '16px 20px',
                  marginBottom: '16px'
                }}
              >
                <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '6px' }}>
                  The Main Motive: <span className="neon-gradient-text">1 Player Dropped Out Last-Minute? Summon a Verified Sub in Minutes.</span>
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  It is 30 minutes before toss, and your key bowler texts that he cannot make it. Playing with 10 players destroys the match. MatchConnect broadcasts an emergency GPS alert to verified nearby cricketers within 5km who have their kit bag ready and want a weekend game.
                </p>
              </div>
            </div>

            {/* Interactive Showcase */}
            <div 
              style={{
                background: 'rgba(10, 18, 14, 0.85)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                position: 'relative',
                zIndex: 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                  What role does your squad need immediately?
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Fast Bowler', 'Top-Order Bat', 'Wicketkeeper'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSosRole(r.toLowerCase())}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: sosRole === r.toLowerCase() ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: sosRole === r.toLowerCase() ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: sosRole === r.toLowerCase() ? '#22c55e' : 'var(--text-secondary)'
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulator Area */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'center' }}>
                <div>
                  <button
                    onClick={handleTriggerSos}
                    disabled={sosPinging}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      fontSize: '0.88rem',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}
                  >
                    <Zap size={16} />
                    {sosPinging ? 'Broadcasting 5km Radar Alert...' : 'Broadcast SOS Emergency Alert'}
                  </button>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                    Alerts 34 nearby players currently marked &ldquo;Available for Emergency Match&rdquo; in Bangalore.
                  </p>
                </div>

                <div 
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '16px'
                  }}
                >
                  {summonedRinger ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          RINGER RESPONDED &bull; ACCEPTED
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 700 }}>
                          {summonedRinger.eta}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.05rem', color: '#fff', margin: '0 0 2px 0' }}>{summonedRinger.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                        {summonedRinger.role} &bull; Distance: {summonedRinger.distance}
                      </p>
                      <div style={{ fontSize: '0.78rem', color: '#a7f3d0', background: 'rgba(34, 197, 94, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                        ✓ Kit packed &bull; Verified 94 ELO &bull; Direct WhatsApp / Phone call unlocked
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px 0' }}>
                      <UserCheck size={28} style={{ margin: '0 auto 6px auto', opacity: 0.5 }} />
                      <div style={{ fontSize: '0.85rem' }}>Tap &ldquo;Broadcast SOS Emergency Alert&rdquo; to test instant ringer pickup.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CONCEPT 3: Split-Pot Escrow (Zero-Default Squad Vault) */}
          <div 
            className="glass-panel theme-card"
            style={{
              padding: '36px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(6, 182, 212, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Glow */}
            <div 
              style={{
                position: 'absolute',
                top: '-70px',
                right: '-70px',
                width: '260px',
                height: '260px',
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
                filter: 'blur(50px)',
                pointerEvents: 'none'
              }}
            />

            {/* Motive Block */}
            <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <span className="badge-pill badge-pill-cyan">
                  <CreditCard size={14} /> CONCEPT 03 &bull; SPLIT-POT ZERO-DEFAULT SQUAD VAULT
                </span>
                <span style={{ fontSize: '0.8rem', color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> No More Captains Paying Out of Pocket
                </span>
              </div>

              <div 
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(10, 20, 26, 0.8) 100%)',
                  borderLeft: '4px solid #06b6d4',
                  borderRadius: '0 12px 12px 0',
                  padding: '16px 20px',
                  marginBottom: '16px'
                }}
              >
                <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '6px' }}>
                  The Main Motive: <span style={{ color: '#22d3ee' }}>Captains Never Chase UPI Transfers Again. 100% Equal Split in Escrow.</span>
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  Ground rentals, leather balls, and umpire fees cost thousands of rupees. In 90% of amateur squads, the captain pays upfront and spends weeks sending awkward WhatsApp reminders to get reimbursed. MatchConnect auto-calculates each player&rsquo;s exact share, collects it via 1-click UPI, and holds it in escrow until match start.
                </p>
              </div>
            </div>

            {/* Interactive Showcase */}
            <div 
              style={{
                background: 'rgba(10, 18, 22, 0.85)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '22px',
                position: 'relative',
                zIndex: 1
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
                {/* Cost Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Match Budget (Ground + Umpire + Balls):</span>
                    <strong style={{ color: '#22d3ee', fontSize: '1.1rem' }}>₹{totalCost.toLocaleString()}</strong>
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="8000"
                    step="200"
                    value={totalCost}
                    onChange={(e) => setTotalCost(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer', marginBottom: '16px' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Squad Players Splitting Cost:</span>
                    <strong style={{ color: '#fff', fontSize: '1rem' }}>{playerCount} Players</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {[11, 14, 22].map((num) => (
                      <button
                        key={num}
                        onClick={() => setPlayerCount(num)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: playerCount === num ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.1)',
                          background: playerCount === num ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: playerCount === num ? '#22d3ee' : 'var(--text-secondary)'
                        }}
                      >
                        {num === 22 ? 'Both Teams (22)' : `${num} Players`}
                      </button>
                    ))}
                  </div>

                  <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Auto-Calculated Share Per Player
                    </span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#22d3ee', margin: '2px 0' }}>
                      ₹{perHeadCost} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ player</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#86efac' }}>
                      ✓ 100% Zero Out-of-Pocket Risk for Captains
                    </span>
                  </div>
                </div>

                {/* Real-Time Teammate Payment Vault HUD */}
                <div 
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#22d3ee', fontWeight: 700, textTransform: 'uppercase' }}>
                      Squad Escrow Collection Status
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600 }}>
                      5 / 6 Confirmed
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {SQUAD_PAYMENTS.map((p, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          fontSize: '0.82rem'
                        }}
                      >
                        <span style={{ color: '#fff', fontWeight: 500 }}>{p.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.method}</span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '9999px', background: p.status === 'Paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: p.status === 'Paid' ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
