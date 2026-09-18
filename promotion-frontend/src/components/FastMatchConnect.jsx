import React, { useState } from 'react';
import { 
  Zap, 
  Users, 
  MapPin, 
  Award, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Send, 
  Radio, 
  Trophy,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { SAMPLE_TURFS, CERTIFIED_UMPIRES } from '../data/promoData';

export default function FastMatchConnect({ onOpenLiveScore }) {
  const [selectedOpponent, setSelectedOpponent] = useState('Royals Strikers');
  const [format, setFormat] = useState('T10');
  const [selectedGround, setSelectedGround] = useState(SAMPLE_TURFS[0].name);
  const [addUmpire, setAddUmpire] = useState(true);
  
  // Simulation states: 'idle' | 'broadcasting' | 'accepted' | 'confirmed'
  const [simState, setSimState] = useState('idle');
  const [countdown, setCountdown] = useState(3);

  const opponents = [
    { name: 'Royals Strikers', captain: 'Arjun V.', rating: 4.8, matches: 29, responseTime: '< 30s' },
    { name: 'Night Hawks XI', captain: 'Dinesh K.', rating: 4.7, matches: 44, responseTime: '< 45s' },
    { name: 'Blasters Cricket Club', captain: 'Sameer R.', rating: 4.9, matches: 52, responseTime: '< 20s' }
  ];

  const handleSimulateConnection = () => {
    setSimState('broadcasting');
    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSimState('confirmed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleReset = () => {
    setSimState('idle');
  };

  return (
    <section 
      id="connect" 
      className="section-wrapper"
      style={{
        position: 'relative'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill" style={{ marginBottom: '14px' }}>
            <Zap size={14} />
            INTERACTIVE APP PREVIEW &bull; CORE MOTIVE
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            Connect 2 Teams in <span className="neon-gradient-text">Under 60 Seconds</span>
          </h2>
          <p className="section-subtitle">
            Experience our instant match challenge flow below. Real match challenges, floodlit turf bookings, 
            and certified umpires are booked and managed directly inside the <strong>MatchConnect App</strong>.
          </p>
        </div>

        {/* Interactive Matchmaking Workspace */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '28px',
            alignItems: 'start'
          }}
          className="connect-main-grid"
        >
          {/* Left Column: Match Setup Controls */}
          <div 
            className="glass-panel"
            style={{
              padding: '32px',
              border: '1px solid rgba(34, 197, 94, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={22} color="#22c55e" />
                <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Configure Your Match Challenge</h3>
              </div>
              <span className="badge-pill" style={{ fontSize: '0.72rem' }}>
                <span className="live-dot"></span> LIVE OPPONENTS READY
              </span>
            </div>

            {/* 1. Pick Opponent Team */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. SELECT OPPONENT SQUAD TO CHALLENGE
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {opponents.map((opp) => {
                  const isSelected = selectedOpponent === opp.name;
                  return (
                    <div
                      key={opp.name}
                      onClick={() => simState === 'idle' && setSelectedOpponent(opp.name)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: simState === 'idle' ? 'pointer' : 'default',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div 
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isSelected ? 'linear-gradient(135deg, #22c55e, #15803d)' : 'rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: isSelected ? '#051408' : '#fff',
                            fontSize: '0.85rem'
                          }}
                        >
                          {opp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>
                            {opp.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Capt. {opp.captain} &bull; ★ {opp.rating} ({opp.matches} matches)
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600 }}>
                        Avg Response: {opp.responseTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Match Format */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. MATCH FORMAT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }} className="match-format-grid">
                {[
                  { id: 'T10', label: 'Turf T10', sub: '10 Overs / 8v8' },
                  { id: 'Box', label: 'Box Cricket', sub: '6 Overs / 6v6' },
                  { id: 'T20', label: 'T20 Full Match', sub: '20 Overs / 11v11' }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => simState === 'idle' && setFormat(fmt.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      background: format === fmt.id ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: format === fmt.id ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.06)',
                      color: format === fmt.id ? '#38bdf8' : 'var(--text-secondary)',
                      cursor: simState === 'idle' ? 'pointer' : 'default',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: format === fmt.id ? '#fff' : 'inherit' }}>
                      {fmt.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {fmt.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Choose Ground & Add Umpire */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '26px' }} className="ground-umpire-grid">
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  3. BOOK FLOODLIT GROUND
                </label>
                <select
                  value={selectedGround}
                  onChange={(e) => setSelectedGround(e.target.value)}
                  disabled={simState !== 'idle'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(12, 18, 14, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {SAMPLE_TURFS.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} (₹{t.pricePerHour}/hr)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  4. ASSIGN CERTIFIED UMPIRE
                </label>
                <div 
                  onClick={() => simState === 'idle' && setAddUmpire(!addUmpire)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: addUmpire ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: addUmpire ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: simState === 'idle' ? 'pointer' : 'default'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: addUmpire ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 600 }}>
                    {addUmpire ? '⚖️ Official Umpire Added' : 'No Umpire (Friendly)'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>
                    {addUmpire ? '₹800 Split' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Launch Challenge Trigger */}
            {simState === 'idle' ? (
              <button
                onClick={handleSimulateConnection}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '1.05rem',
                  boxShadow: '0 0 30px rgba(34, 197, 94, 0.45)'
                }}
              >
                <Send size={18} />
                Test Challenge Flow &bull; See How Teams Connect in App
              </button>
            ) : simState === 'broadcasting' ? (
              <div 
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid #06b6d4',
                  borderRadius: '14px',
                  padding: '16px',
                  textAlign: 'center',
                  color: '#38bdf8',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <span className="live-dot" style={{ backgroundColor: '#06b6d4', boxShadow: '0 0 10px #06b6d4' }}></span>
                Broadcasting Challenge to Capt. of {selectedOpponent}... ({countdown}s)
              </div>
            ) : (
              <button
                onClick={handleReset}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '14px' }}
              >
                <RotateCcw size={16} />
                Challenge Another Team (Reset Simulation)
              </button>
            )}
          </div>

          {/* Right Column: Live Telemetry & Confirmed Match Pass */}
          <div 
            className="glass-panel"
            style={{
              padding: '32px',
              border: simState === 'confirmed' ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.1)',
              background: simState === 'confirmed' ? 'rgba(12, 22, 15, 0.95)' : 'rgba(15, 20, 16, 0.75)',
              boxShadow: simState === 'confirmed' ? '0 0 45px rgba(34, 197, 94, 0.3)' : 'none',
              transition: 'all 0.4s ease'
            }}
          >
            {simState === 'confirmed' ? (
              <div>
                {/* Match Confirmed Badge */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div 
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '2px solid #22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto'
                    }}
                  >
                    <CheckCircle2 size={36} color="#22c55e" />
                  </div>
                  <span className="badge-pill" style={{ fontSize: '0.78rem' }}>
                    MATCH LOCKED &bull; CONNECTED IN 38 SECONDS
                  </span>
                  <h3 style={{ fontSize: '1.4rem', color: '#fff', marginTop: '8px' }}>
                    Thunderbolts CC vs {selectedOpponent}
                  </h3>
                </div>

                {/* Confirmed Match Details Pass */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Format:</span>
                    <strong style={{ color: '#fff' }}>{format} Overs Match</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ground Locked:</span>
                    <strong style={{ color: '#38bdf8' }}>{selectedGround}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Official Umpire:</span>
                    <strong style={{ color: '#fbbf24' }}>
                      {addUmpire ? 'Sanjeev Sharma (Panel A)' : 'Not assigned'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Per-Player Split Cost:</span>
                    <strong style={{ color: '#4ade80' }}>₹160 / player (Paid via UPI)</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '14px 16px', borderRadius: '10px', fontSize: '0.82rem', color: '#86efac', marginBottom: '20px' }}>
                  🎉 <strong>Interactive Preview Complete!</strong> That is how fast the MatchConnect App pairs your squad with opponents and assigns grounds &amp; umpires.
                </div>

                <a
                  href="http://localhost:5173"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '15px', textAlign: 'center', marginBottom: '10px', fontSize: '0.98rem' }}
                >
                  <Zap size={18} />
                  Launch MatchConnect App to Play for Real &rarr;
                </a>

                <a
                  href="#sandbox"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '10px', textAlign: 'center', fontSize: '0.85rem' }}
                >
                  <Sparkles size={14} />
                  Try Live Telemetry Scorer Below
                </a>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div 
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px auto'
                  }}
                >
                  <Radio size={32} color="#22c55e" />
                </div>
                <h4 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
                  Interactive App Simulator
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto 24px auto' }}>
                  Click "Test Challenge Flow" on the left to see how the MatchConnect App connects 2 teams, locks the pitch, and assigns certified umpires.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div>⚡ <strong>Note:</strong> This is a product demonstration advertisement.</div>
                  <div>🏏 <strong>Real Matches:</strong> Created &amp; confirmed inside the MatchConnect App.</div>
                  <div>🏟️ <strong>Real Turfs:</strong> Booked with instant split payments in the app.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .connect-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .ground-umpire-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .match-format-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
          }
          .match-format-grid button {
            padding: 8px 4px !important;
          }
          .match-format-grid button div:first-child {
            font-size: 0.8rem !important;
          }
          .match-format-grid button div:last-child {
            font-size: 0.65rem !important;
          }
        }
        @media (max-width: 420px) {
          .match-format-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
