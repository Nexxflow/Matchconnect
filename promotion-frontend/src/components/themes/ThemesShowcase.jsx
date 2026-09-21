import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  Scale, 
  MapPin, 
  Trophy, 
  Radio, 
  Layers, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  LayoutGrid,
  Presentation
} from 'lucide-react';
import FindMatchCard from './FindMatchCard';
import BookUmpireCard from './BookUmpireCard';
import BookGroundCard from './BookGroundCard';
import TournamentCard from './TournamentCard';
import LiveScoreCard from './LiveScoreCard';

export default function ThemesShowcase({ selectedThemeId, navTimestamp }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewMode, setViewMode] = useState('slides'); // 'slides' | 'grid'
  const [slideProgress, setSlideProgress] = useState(0);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const progressTimerRef = useRef(null);

  const SLIDES = [
    { 
      id: 'find-match', 
      number: '01',
      label: 'Find a Match', 
      tagline: 'Team Matchmaking',
      icon: Users, 
      color: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.35)',
      component: <FindMatchCard /> 
    },
    { 
      id: 'book-umpire', 
      number: '02',
      label: 'Book Umpire', 
      tagline: 'Neutral Match Officials',
      icon: Scale, 
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.35)',
      component: <BookUmpireCard /> 
    },
    { 
      id: 'book-ground', 
      number: '03',
      label: 'Book Ground', 
      tagline: 'Live Ground Slots',
      icon: MapPin, 
      color: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.35)',
      component: <BookGroundCard /> 
    },
    { 
      id: 'tournaments', 
      number: '04',
      label: 'Tournaments', 
      tagline: 'Tournament Hosting',
      icon: Trophy, 
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.35)',
      component: <TournamentCard /> 
    },
    { 
      id: 'live-score', 
      number: '05',
      label: 'Live Score', 
      tagline: 'Ball-by-Ball Match Center',
      icon: Radio, 
      color: '#ec4899',
      glow: 'rgba(236, 72, 153, 0.35)',
      component: <LiveScoreCard /> 
    },
  ];

  const currentTheme = SLIDES[currentSlideIndex];

  const goToSlide = useCallback((index) => {
    setCurrentSlideIndex(index);
    setSlideProgress(0);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
    setSlideProgress(0);
  }, [SLIDES.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setSlideProgress(0);
  }, [SLIDES.length]);

  // Synchronize with external navigation (Navbar tabs, footer, URL hash)
  useEffect(() => {
    if (selectedThemeId) {
      const targetIndex = SLIDES.findIndex((s) => s.id === selectedThemeId);
      if (targetIndex !== -1) {
        setViewMode('slides');
        setCurrentSlideIndex(targetIndex);
        setSlideProgress(0);
      }
    }
  }, [selectedThemeId, navTimestamp]);

  // Handle URL hash changes (e.g. #find-match, #book-umpire)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const targetIndex = SLIDES.findIndex((s) => s.id === hash);
        if (targetIndex !== -1) {
          setViewMode('slides');
          setCurrentSlideIndex(targetIndex);
          setSlideProgress(0);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Autoplay progression
  useEffect(() => {
    if (!isAutoPlay || isHovered || viewMode !== 'slides') {
      clearInterval(progressTimerRef.current);
      return;
    }

    const duration = 6500; // 6.5 seconds per slide
    const interval = 50; // update progress every 50ms
    const step = (interval / duration) * 100;

    progressTimerRef.current = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(progressTimerRef.current);
  }, [isAutoPlay, isHovered, viewMode, nextSlide]);

  // Keyboard navigation (Left / Right arrows)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'slides') return;
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, viewMode]);

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      // Swiped left -> next slide
      nextSlide();
    } else if (diff < -50) {
      // Swiped right -> prev slide
      prevSlide();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handlePillClick = (slideId) => {
    if (slideId === 'all') {
      // Activate continuous slideshow presentation mode
      setIsAutoPlay(true);
      setViewMode('slides');
    } else {
      const targetIndex = SLIDES.findIndex((s) => s.id === slideId);
      if (targetIndex !== -1) {
        setViewMode('slides');
        goToSlide(targetIndex);
      }
    }
  };

  return (
    <section 
      id="themes" 
      className="section-wrapper"
      style={{
        position: 'relative',
        paddingTop: '60px',
        paddingBottom: '90px'
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="badge-pill" style={{ padding: '6px 14px' }}>
              <Sparkles size={14} />
              THE 5 PILLARS OF MATCHCONNECT
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(1.75rem, 4.8vw, 3.4rem)', lineHeight: 1.18, marginBottom: '14px' }}>
            Inside the MatchConnect App: <br />
            <span className="neon-gradient-text">The 5 Core Game Themes</span>
          </h2>

          <p className="section-subtitle" style={{ maxWidth: '780px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
            Recreational cricket is held back by WhatsApp spam, unfair umpiring, and double-booked grounds. 
            Explore how MatchConnect helps with each of these problems inside the app.
          </p>
        </div>

        {/* Quick Theme Switcher Pill Bar (Sticky, Single-Row Swipeable on Mobile) */}
        <div className="theme-switcher-bar">
          {/* All 5 Themes / Slideshow Pill */}
          <button
            onClick={() => handlePillClick('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '9999px',
              border: isAutoPlay ? '1px solid #22c55e' : '1px solid transparent',
              background: isAutoPlay ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: isAutoPlay ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Layers size={14} color={isAutoPlay ? '#22c55e' : 'var(--text-muted)'} />
            <span>All 5 Themes {isAutoPlay ? '(Slideshow On)' : ''}</span>
          </button>

          {/* Theme Specific Slide Pills */}
          {SLIDES.map((slide, index) => {
            const Icon = slide.icon;
            const isSelected = viewMode === 'slides' && currentSlideIndex === index;
            return (
              <button
                key={slide.id}
                onClick={() => handlePillClick(slide.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  border: isSelected ? `1px solid ${slide.color}` : '1px solid transparent',
                  background: isSelected ? `${slide.color}22` : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 16px ${slide.glow}` : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={14} color={isSelected ? slide.color : 'var(--text-muted)'} />
                <span>{slide.label}</span>
              </button>
            );
          })}
        </div>

        {/* SLIDE PRESENTATION CONTROLS BAR */}
        <div className="slide-controls-bar">
          {/* Left: Current Slide Info */}
          <div className="slide-controls-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                background: `${currentTheme.color}22`,
                border: `1px solid ${currentTheme.color}44`,
                color: currentTheme.color,
                whiteSpace: 'nowrap'
              }}
            >
              SLIDE {currentTheme.number} / 05
            </span>

            <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <currentTheme.icon size={15} color={currentTheme.color} />
              <span>{currentTheme.label}</span>
              <span className="slide-tagline-text" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> &bull; {currentTheme.tagline}</span>
            </span>
          </div>

          {/* Right: Controls & View Switcher */}
          <div className="slide-controls-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Autoplay toggle */}
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className="slide-control-btn"
              title={isAutoPlay ? 'Pause Slideshow' : 'Start Auto Slideshow'}
              style={{
                borderColor: isAutoPlay ? currentTheme.color : 'rgba(255, 255, 255, 0.12)',
                background: isAutoPlay ? `${currentTheme.color}18` : 'rgba(255, 255, 255, 0.05)'
              }}
            >
              {isAutoPlay ? (
                <>
                  <Pause size={14} color={currentTheme.color} />
                  <span>Slideshow Playing</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Auto-Play</span>
                </>
              )}
            </button>

            {/* View Mode Toggle: Slides vs Grid */}
            <button
              onClick={() => setViewMode(viewMode === 'slides' ? 'grid' : 'slides')}
              className="slide-control-btn"
              title="Toggle View Mode"
            >
              {viewMode === 'slides' ? (
                <>
                  <LayoutGrid size={14} />
                  <span>Grid View</span>
                </>
              ) : (
                <>
                  <Presentation size={14} color="#22c55e" />
                  <span>Slide View</span>
                </>
              )}
            </button>

            {/* Prev / Next Arrows */}
            {viewMode === 'slides' && (
              <div style={{ display: 'inline-flex', gap: '6px' }}>
                <button
                  onClick={prevSlide}
                  className="slide-control-btn"
                  style={{ padding: '8px 12px' }}
                  title="Previous Slide (Left Arrow)"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft size={16} />
                  <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>Prev</span>
                </button>
                <button
                  onClick={nextSlide}
                  className="slide-control-btn"
                  style={{ padding: '8px 12px' }}
                  title="Next Slide (Right Arrow)"
                  aria-label="Next Slide"
                >
                  <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Autoplay Progress Line */}
        {viewMode === 'slides' && isAutoPlay && (
          <div 
            style={{
              width: '100%',
              height: '3px',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}
          >
            <div 
              className="slide-timer-progress"
              style={{
                width: `${slideProgress}%`,
                background: `linear-gradient(90deg, ${currentTheme.color}, #ffffff)`
              }}
            />
          </div>
        )}

        {/* VIEW 1: INTERACTIVE SLIDES PRESENTATION DECK */}
        {viewMode === 'slides' && (
          <div 
            className="slides-deck-wrapper"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Floating Side Left Arrow */}
            <button
              onClick={prevSlide}
              className="floating-nav-arrow arrow-prev"
              title="Previous Slide"
              aria-label="Previous Slide"
              style={{
                borderColor: `${currentTheme.color}55`
              }}
            >
              <ChevronLeft size={24} color={currentTheme.color} />
            </button>

            {/* Slide Viewport */}
            <div 
              className="slides-viewport"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="slides-track"
                style={{
                  transform: `translateX(-${currentSlideIndex * 100}%)`,
                }}
              >
                {SLIDES.map((slide, index) => (
                  <div 
                    key={slide.id}
                    className="slide-slide-item"
                    style={{
                      opacity: currentSlideIndex === index ? 1 : 0.25,
                      transform: currentSlideIndex === index ? 'scale(1)' : 'scale(0.98)',
                    }}
                  >
                    {slide.component}
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Side Right Arrow */}
            <button
              onClick={nextSlide}
              className="floating-nav-arrow arrow-next"
              title="Next Slide"
              aria-label="Next Slide"
              style={{
                borderColor: `${currentTheme.color}55`
              }}
            >
              <ChevronRight size={24} color={currentTheme.color} />
            </button>
          </div>
        )}

        {/* VIEW 2: FULL GRID / STACKED VIEW */}
        {viewMode === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <FindMatchCard />
            <BookUmpireCard />
            <BookGroundCard />
            <TournamentCard />
            <LiveScoreCard />
          </div>
        )}

        {/* Slide navigation keyboard / touch hint */}
        {viewMode === 'slides' && (
          <div 
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}
          >
            <span className="desktop-hint">Use keyboard <kbd style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#fff' }}>&larr;</kbd> <kbd style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#fff' }}>&rarr;</kbd> or swipe to explore all slides</span>
            <span className="mobile-hint">👈 Swipe left or right to explore themes 👉</span>
            {isAutoPlay && isHovered && (
              <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>(Autoplay paused)</span>
            )}
          </div>
        )}

        <style>{`
          .mobile-hint { display: none; }
          @media (max-width: 640px) {
            .desktop-hint { display: none !important; }
            .mobile-hint { display: inline !important; font-size: 0.76rem !important; }
            .slide-tagline-text { display: none !important; }
          }
        `}</style>

      </div>
    </section>
  );
}