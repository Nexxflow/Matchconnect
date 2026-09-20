import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Menu, 
  X, 
  ArrowRight, 
  Users, 
  Award, 
  Trophy,
  MapPin,
  Flame
} from 'lucide-react';

export default function Navbar({ onOpenConnect, onSelectTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Find Match', id: 'find-match', href: '#find-match' },
    { name: 'Book Umpire', id: 'book-umpire', href: '#book-umpire' },
    { name: 'Book Ground', id: 'book-ground', href: '#book-ground' },
    { name: 'Tournaments', id: 'tournaments', href: '#tournaments' },
    { name: 'Live Score', id: 'live-score', href: '#live-score' },
    { name: 'Feedback', id: 'feedback', href: '#feedback' },
  ];

  return (
    <header 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        background: scrolled 
          ? 'rgba(7, 10, 8, 0.92)' 
          : 'rgba(7, 10, 8, 0.65)',
        backdropFilter: 'blur(18px)',
        borderBottom: scrolled 
          ? '1px solid rgba(34, 197, 94, 0.25)' 
          : '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: scrolled ? '0 10px 30px rgba(0, 0, 0, 0.5)' : 'none'
      }}
    >
      {/* Top micro-ticker bar */}
      <div 
        className="top-ticker-bar"
        style={{
          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.15), rgba(6, 182, 212, 0.15), rgba(245, 158, 11, 0.15))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '4px 16px',
          fontSize: '0.78rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 600 }}>
          <span className="live-dot"></span>
          MATCHCONNECT APP SHOWCASE
        </span>
        <span className="top-disclaimer-text" style={{ color: 'var(--text-secondary)' }}>
          All matchmaking, grounds &amp; certified umpires are booked inside the <strong>MatchConnect App</strong>
        </span>
      </div>

      <div className="container nav-inner-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        {/* Brand Logo */}
        <a 
          href="#" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            textDecoration: 'none',
            color: '#fff'
          }}
        >
          <div 
            className="brand-logo-icon"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
              position: 'relative',
              flexShrink: 0
            }}
          >
            <Zap size={22} color="#051408" strokeWidth={2.8} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Match<span style={{ color: '#22c55e' }}>Connect</span>
            </div>
            <div className="brand-subtitle" style={{ fontSize: '0.68rem', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
              Teams &bull; Turfs &bull; Umpires &bull; Tournaments
            </div>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '22px' 
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                if (onSelectTheme) {
                  onSelectTheme(link.id);
                }
              }}
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                position: 'relative',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.target.style.color = '#fff')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-secondary)')}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary nav-btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
          >
            <span className="btn-text-desktop">Launch App</span>
            <span className="btn-text-mobile" style={{ display: 'none' }}>App</span>
            <ArrowRight size={15} />
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'none',
              padding: '8px',
              borderRadius: '8px',
              minWidth: '44px',
              minHeight: '44px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          style={{
            background: 'rgba(10, 15, 12, 0.98)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto'
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                if (onSelectTheme) {
                  onSelectTheme(link.id);
                }
              }}
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontSize: '1.05rem',
                fontWeight: 600,
                padding: '10px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                cursor: 'pointer'
              }}
            >
              {link.name}
            </a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <a
              href="#themes"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary"
            >
              Explore 5 Themes
            </a>
            <a
              href="http://localhost:5173"
              className="btn btn-primary"
            >
              Launch MatchConnect App
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1040px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: inline-flex !important; }
        }
        @media (max-width: 768px) {
          .nav-inner-container { height: 60px !important; }
        }
        @media (max-width: 640px) {
          .top-disclaimer-text { display: none !important; }
          .top-ticker-bar { padding: 3px 10px !important; font-size: 0.72rem !important; }
        }
        @media (max-width: 480px) {
          .nav-inner-container { height: 56px !important; }
          .brand-subtitle { display: none !important; }
          .btn-text-desktop { display: none !important; }
          .btn-text-mobile { display: inline !important; }
          .nav-btn-primary { 
            padding: 6px 12px !important; 
            font-size: 0.78rem !important; 
            border-radius: 9999px !important;
            gap: 4px !important;
            width: auto !important;
          }
          .brand-logo-icon {
            width: 34px !important;
            height: 34px !important;
            border-radius: 10px !important;
          }
          .brand-logo-icon svg {
            width: 18px !important;
            height: 18px !important;
          }
        }
      `}</style>
    </header>
  );
}
