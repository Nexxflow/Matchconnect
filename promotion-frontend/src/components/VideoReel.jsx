import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  Sparkles, 
  Radio, 
  MapPin, 
  ShieldCheck, 
  Users, 
  Clock, 
  Award,
  Trophy,
  ChevronRight
} from 'lucide-react';
import { VIDEO_CHAPTERS } from '../data/promoData';

export default function VideoReel() {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const activeChapter = VIDEO_CHAPTERS[activeChapterIndex];
  const progressTimerRef = useRef(null);

  // Auto-progress animation loop (simulates video playback)
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(progressTimerRef.current);
      return;
    }

    const intervalTime = 60; // 60ms tick
    const totalDuration = 6500; // 6.5s per video
    const step = (intervalTime / totalDuration) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Switch to next video chapter
          setActiveChapterIndex((idx) => (idx + 1) % VIDEO_CHAPTERS.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(progressTimerRef.current);
  }, [isPlaying, activeChapterIndex]);

  const handleSelectChapter = (index) => {
    setActiveChapterIndex(index);
    setProgress(0);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <section 
      id="cinema" 
      className="section-wrapper"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(7, 10, 8, 0) 0%, rgba(14, 20, 16, 0.85) 50%, rgba(7, 10, 8, 0) 100%)'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-pill badge-pill-cyan" style={{ marginBottom: '14px' }}>
            <Sparkles size={14} />
            INTERACTIVE VIDEO ADVERTISEMENT SHOWCASE
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)' }}>
            Watch How MatchConnect <span className="neon-gradient-text">Powers Every Match</span>
          </h2>
          <p className="section-subtitle">
            Experience our 5 core pillars in action: Fast Matchmaking, Ground Booking, Certified Umpires, 
            Tournament Leagues, and Ball-by-Ball Live Scoring.
          </p>
        </div>

        {/* Video Reel Container */}
        <div 
          className="glass-panel"
          style={{
            padding: '28px',
            border: `1px solid ${activeChapter.accentColor}40`,
            boxShadow: `0 25px 80px rgba(0, 0, 0, 0.9), 0 0 50px ${activeChapter.accentColor}20`,
            position: 'relative'
          }}
        >
          {/* Chapter Navigation Tabs (5 videos) */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '10px',
              marginBottom: '24px'
            }}
            className="video-tabs-grid"
          >
            {VIDEO_CHAPTERS.map((ch, idx) => {
              const isCurrent = idx === activeChapterIndex;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChapter(idx)}
                  style={{
                    background: isCurrent ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Active Progress Bar Underlay */}
                  {isCurrent && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '3px',
                        width: `${progress}%`,
                        background: ch.accentColor,
                        boxShadow: `0 0 10px ${ch.accentColor}`,
                        transition: 'width 0.08s linear'
                      }}
                    />
                  )}
                  <div style={{ fontSize: '0.68rem', color: isCurrent ? ch.accentColor : 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {ch.tag.split('.')[0]}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isCurrent ? '#fff' : 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ch.tag.split('.')[1]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cinematic Cinema Display Stage */}
          <div 
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              minHeight: '480px',
              background: '#080d09',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            className="cinema-screen"
          >
            {/* Dynamic Stage Background & Simulated Video Visuals */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at center, ${activeChapter.accentColor}18 0%, #080d09 75%)`,
                transition: 'background 0.8s ease'
              }}
            />

            {/* Stadium Grid Overlay */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.6
              }}
            />

            {/* Simulated Animated Video Content per Chapter */}
            <div className="cinema-stage-inner" style={{ position: 'relative', zIndex: 2, padding: '36px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              
              {/* VIDEO 1: FAST TWO-TEAM MATCHMAKING */}
              {activeChapterIndex === 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }} className="cinema-content-split">
                  {/* Interactive Matchmaking Simulation Visual */}
                  <div 
                    style={{
                      background: 'rgba(15, 24, 18, 0.9)',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 0 35px rgba(34, 197, 94, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span className="badge-pill" style={{ fontSize: '0.72rem' }}>
                        <span className="live-dot"></span> TEAM CHALLENGE SENT
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                        Confirmed in 38s
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#fff', fontSize: '0.92rem' }}>Thunderbolts CC</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>11/11 confirmed &bull; ★ 4.9</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#4ade80', background: 'rgba(34,197,94,0.15)', padding: '3px 8px', borderRadius: '4px' }}>
                          CHALLENGER
                        </span>
                      </div>

                      <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: 800, fontSize: '0.85rem' }}>
                        ⚡ INSTANT MATCH HANDSHAKE
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#fff', fontSize: '0.92rem' }}>Royals Strikers</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>11/11 confirmed &bull; ★ 4.8</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(6,182,212,0.15)', padding: '3px 8px', borderRadius: '4px' }}>
                          ACCEPTED IN 28s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chapter Narrative */}
                  <div>
                    <span className="badge-pill" style={{ marginBottom: '12px' }}>
                      {activeChapter.badge}
                    </span>
                    <h3 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#fff', marginBottom: '14px' }}>
                      {activeChapter.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '20px' }}>
                      {activeChapter.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeChapter.features.map((feat, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                          <CheckCircle size={16} color="#22c55e" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIDEO 2: INSTANT FLOODLIT GROUND BOOKING */}
              {activeChapterIndex === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }} className="cinema-content-split">
                  <div 
                    style={{
                      background: 'rgba(10, 20, 18, 0.9)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 0 35px rgba(6, 182, 212, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={18} color="#06b6d4" />
                        <strong style={{ color: '#fff', fontSize: '1rem' }}>Apex Floodlit Arena &bull; Pitch 1</strong>
                      </div>
                      <span className="badge-pill-cyan badge-pill" style={{ fontSize: '0.72rem' }}>
                        SLOT RESERVED
                      </span>
                    </div>

                    <div 
                      style={{
                        height: '110px',
                        background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                        borderRadius: '10px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        marginBottom: '16px'
                      }}
                    >
                      <div style={{ width: '40%', height: '50px', border: '1px dashed rgba(255,255,255,0.5)', borderRadius: '4px' }}></div>
                      <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>
                        1000 LUX LED &bull; ASTROTURF
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Automated Split Fee</div>
                        <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>₹2,400 Total</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: '#38bdf8' }}>15 Players Paid</div>
                        <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>₹160 / player</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="badge-pill badge-pill-cyan" style={{ marginBottom: '12px' }}>
                      {activeChapter.badge}
                    </span>
                    <h3 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#fff', marginBottom: '14px' }}>
                      {activeChapter.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '20px' }}>
                      {activeChapter.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeChapter.features.map((feat, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                          <CheckCircle size={16} color="#06b6d4" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIDEO 3: CERTIFIED UMPIRES BOOKING */}
              {activeChapterIndex === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }} className="cinema-content-split">
                  <div 
                    style={{
                      background: 'rgba(24, 18, 10, 0.92)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 0 35px rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span className="badge-pill-gold badge-pill" style={{ fontSize: '0.72rem' }}>
                        <ShieldCheck size={12} /> STATE PANEL A CERTIFIED
                      </span>
                      <strong style={{ color: '#fbbf24', fontSize: '0.82rem' }}>
                        ★ 4.95 Rating
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
                      <h4 style={{ color: '#fff', fontSize: '1.15rem' }}>Sanjeev Sharma</h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        8+ Years Experience &bull; 240 Matches Officiated
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px' }}>
                          Official Ball Tracking
                        </span>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '4px' }}>
                          DRS &amp; Fair Play Rules
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Umpire Fee</span>
                      <strong className="mono" style={{ fontSize: '1.25rem', color: '#fbbf24' }}>₹800 / fixture</strong>
                    </div>
                  </div>

                  <div>
                    <span className="badge-pill badge-pill-gold" style={{ marginBottom: '12px' }}>
                      {activeChapter.badge}
                    </span>
                    <h3 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#fff', marginBottom: '14px' }}>
                      {activeChapter.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '20px' }}>
                      {activeChapter.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeChapter.features.map((feat, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                          <CheckCircle size={16} color="#f59e0b" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIDEO 4: TOURNAMENTS ENGINE */}
              {activeChapterIndex === 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }} className="cinema-content-split">
                  <div 
                    style={{
                      background: 'rgba(20, 14, 25, 0.9)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 0 35px rgba(168, 85, 247, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <strong style={{ color: '#c084fc', fontSize: '0.95rem' }}>🏆 Super 8 Champions Trophy</strong>
                      <span className="badge-pill" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', borderColor: 'rgba(168,85,247,0.3)', fontSize: '0.72rem' }}>
                        KNOCKOUT BRACKET
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fff', fontSize: '0.85rem' }}>Thunderbolts CC</span>
                        <span style={{ color: '#4ade80', fontWeight: 700 }}>182/4 (W)</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Night Hawks XI</span>
                        <span style={{ color: 'var(--text-muted)' }}>164/9</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Escrow Prize Pool</span>
                      <strong style={{ color: '#f59e0b' }}>₹60,000 Verified</strong>
                    </div>
                  </div>

                  <div>
                    <span className="badge-pill" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', borderColor: 'rgba(168,85,247,0.3)', marginBottom: '12px' }}>
                      {activeChapter.badge}
                    </span>
                    <h3 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#fff', marginBottom: '14px' }}>
                      {activeChapter.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '20px' }}>
                      {activeChapter.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeChapter.features.map((feat, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                          <CheckCircle size={16} color="#a855f7" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIDEO 5: BROADCAST LIVE SCORING */}
              {activeChapterIndex === 4 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }} className="cinema-content-split">
                  <div 
                    style={{
                      background: 'rgba(25, 12, 18, 0.92)',
                      border: '1px solid rgba(236, 72, 153, 0.35)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 0 35px rgba(236, 72, 153, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span className="badge-pill" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.3)', fontSize: '0.72rem' }}>
                        <Radio size={12} /> OVER 16.2 &bull; TELECAST
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#f472b6', fontWeight: 600 }}>
                        Req RR: 7.80
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '16px' }}>
                      <div className="mono" style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff' }}>
                        154 / 3
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        (16.2 / 20 ov)
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      {['4', '1', '6', '0', '4', '1'].map((b, i) => (
                        <div 
                          key={i}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: b === '6' ? '#22c55e' : b === '4' ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                            color: b === '6' || b === '4' ? '#070a08' : '#fff',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem'
                          }}
                        >
                          {b}
                        </div>
                      ))}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#f472b6' }}>
                      ⚡ <strong>Live Spectator Link:</strong> matchconnect.in/live/match-789
                    </div>
                  </div>

                  <div>
                    <span className="badge-pill" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.3)', marginBottom: '12px' }}>
                      {activeChapter.badge}
                    </span>
                    <h3 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: '#fff', marginBottom: '14px' }}>
                      {activeChapter.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '20px' }}>
                      {activeChapter.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeChapter.features.map((feat, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                          <CheckCircle size={16} color="#ec4899" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div 
              className="cinema-controls-bar"
              style={{
                position: 'relative',
                zIndex: 3,
                background: 'rgba(7, 10, 8, 0.85)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '14px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  onClick={togglePlay}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  aria-label={isPlaying ? 'Pause Video Reel' : 'Play Video Reel'}
                >
                  {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
                </button>

                <button
                  onClick={handleRestart}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  aria-label="Restart Current Video"
                >
                  <RotateCcw size={18} />
                </button>

                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mono">
                  {`0:0${Math.floor((progress / 100) * 6)}`} / 0:06
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isMuted ? 'var(--text-muted)' : '#4ade80',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem'
                  }}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  <span>{isMuted ? 'Muted' : 'Audio'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .cinema-content-split {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .video-tabs-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .cinema-screen {
            min-height: auto !important;
          }
        }
        @media (max-width: 540px) {
          .cinema-stage-inner {
            padding: 20px 14px !important;
          }
          .cinema-controls-bar {
            padding: 10px 14px !important;
          }
          .video-tabs-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory;
            gap: 8px !important;
            padding-bottom: 8px !important;
            -webkit-overflow-scrolling: touch;
          }
          .video-tabs-grid button {
            flex: 0 0 150px !important;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
}
