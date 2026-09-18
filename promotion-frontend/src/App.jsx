import React, { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ThemesShowcase from './components/themes/ThemesShowcase';
import TestimonialsFAQ from './components/TestimonialsFAQ';
import UpdatedFooter from './components/UpdatedFooter';

export default function App() {
  const [selectedThemeId, setSelectedThemeId] = useState('find-match');
  const [themeNavTimestamp, setThemeNavTimestamp] = useState(0);

  const handleSelectTheme = useCallback((themeId) => {
    if (themeId === 'feedback' || themeId === 'faq') {
      const el = document.getElementById(themeId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    setSelectedThemeId(themeId);
    setThemeNavTimestamp(Date.now());
    const el = document.getElementById('themes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="matchconnect-promo-app">
      {/* Top Floating Glassmorphic Nav */}
      <Navbar 
        onSelectTheme={handleSelectTheme}
        onOpenConnect={() => handleSelectTheme('find-match')} 
      />

      <main>
        {/* The Starting Screen */}
        <Hero 
          onExploreConnect={() => handleSelectTheme('find-match')}
        />

        {/* The 5 Core Themes: Find Match, Book Umpire, Book Ground, Tournaments, Live Score */}
        <ThemesShowcase 
          selectedThemeId={selectedThemeId}
          navTimestamp={themeNavTimestamp}
        />

        {/* Community Feedback & FAQs */}
        <TestimonialsFAQ />
      </main>

      {/* Modern High-Conversion Updated Footer */}
      <UpdatedFooter onConnectTeams={() => handleSelectTheme('find-match')} />
    </div>
  );
}
