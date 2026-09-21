// =====================================================================
// SITE CONFIG - ellam inga irundhu maathina podhum
// =====================================================================

// Live web app URL (main MatchConnect app)
export const WEB_APP_URL = 'https://matchconnect-five.vercel.app';

// Play Store live aana piragu inga link podunga. Empty na "Coming Soon" mode.
// Ex: 'https://play.google.com/store/apps/details?id=com.nexxflow.matchconnect'
export const PLAY_STORE_URL = '';

// Support / contact email (footer + feedback la varum)
export const SUPPORT_EMAIL = 'matchconnectmuon@gmail.com';

// Optional: real number irundha mattum podunga. Empty na buttons kaattaadhu.
// SUPPORT_PHONE   ex: '+919876543210'
// SUPPORT_WHATSAPP ex: '919876543210' (+ illama, country code oda)
export const SUPPORT_PHONE = '';
export const SUPPORT_WHATSAPP = '';

// Legal pages (promotion-frontend/public/ la privacy.html, terms.html vekkanum)
export const PRIVACY_URL = '/privacy.html';
export const TERMS_URL = '/terms.html';

// Optional: Formspree / Google Form / Apps Script URL.
// Empty na feedback + waitlist email app (mailto) vazhiya varum.
export const FEEDBACK_ENDPOINT = '';
export const WAITLIST_FORM_URL = '';

export const LAUNCH_REGION = 'Tamil Nadu';
export const CITIES = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'];

// =====================================================================
// CONTENT
// Note: fake numbers, fake reviews, escrow/ELO/AI-reels maathiri claims
// remove pannirukken. App la real ah irukkura feature na mattum thirumba add pannunga.
// =====================================================================

export const VIDEO_CHAPTERS = [
  {
    id: 'fast-matchmaking',
    tag: '01. CONNECT TEAMS FASTER',
    title: 'Challenge & Connect Teams Without the WhatsApp Chaos',
    subtitle: 'The core motive of MatchConnect: stop endless WhatsApp texting. Post a match challenge or browse nearby cricket squads by overs format, ball type, and distance.',
    badge: 'Instant Team Matchmaking',
    accentColor: '#22c55e',
    videoType: 'teams',
    metrics: [
      { label: 'Find Opponents By', val: 'Area & Format' },
      { label: 'Challenge Alerts', val: 'In-App' },
      { label: 'WhatsApp Chaos', val: 'None' }
    ],
    features: [
      'Post a match challenge and let nearby cricket squads see it instantly',
      'Filter by overs format and ball type (Tennis / Leather)',
      'Rival captains get an in-app notification and can accept with one tap'
    ]
  },
  {
    id: 'turf-booking',
    tag: '02. BOOK GROUNDS',
    title: 'Find & Book Cricket Grounds Near You',
    subtitle: 'Discover cricket grounds and turfs around you, check available slots, and book online without endless phone calls.',
    badge: 'Live Slot Booking',
    accentColor: '#06b6d4',
    videoType: 'turf',
    metrics: [
      { label: 'Slots', val: 'Live Calendar' },
      { label: 'Payment', val: 'Online' },
      { label: 'Search', val: 'Near Me' }
    ],
    features: [
      'See ground details and available slots in one place',
      'Find grounds close to you with the Near Me map',
      'Book and pay online securely'
    ]
  },
  {
    id: 'umpires',
    tag: '03. BOOK UMPIRES',
    title: 'Neutral Umpires For Your Matches',
    subtitle: 'No more arguments over leg-before-wicket or no-balls. Book a neutral umpire directly from the app with clear match fees.',
    badge: 'Neutral Match Officials',
    accentColor: '#f59e0b',
    videoType: 'umpire',
    metrics: [
      { label: 'Booking', val: 'In-App' },
      { label: 'Fees', val: 'Transparent' },
      { label: 'Officials', val: 'Neutral' }
    ],
    features: [
      'Browse umpire profiles with experience and fee per match',
      'Book an umpire for friendly games, corporate matches, or leagues',
      'A neutral official on the field keeps every match fair'
    ]
  },
  {
    id: 'tournaments',
    tag: '04. TOURNAMENTS',
    title: 'Create & Host Cricket Tournaments',
    subtitle: 'From local weekend knockouts to corporate cups. Create a tournament, set entry fees and prizes, and let teams register online.',
    badge: 'Tournament Hosting Tools',
    accentColor: '#a855f7',
    videoType: 'bracket',
    metrics: [
      { label: 'Registrations', val: 'Online' },
      { label: 'Entry Fee', val: 'Set Your Own' },
      { label: 'Prizes', val: 'Clearly Listed' }
    ],
    features: [
      'Create a tournament with format, venue, dates, entry fee and prizes',
      'Teams register from the app and organizers see who has joined',
      'Keep every team informed in one place instead of scattered chats'
    ]
  },
  {
    id: 'livescore',
    tag: '05. LIVE SCORING',
    title: 'Ball-By-Ball Live Scoring',
    subtitle: 'Turn every match into a live broadcast for your friends and fans. Score ball by ball and let everyone follow the match live.',
    badge: 'Live Scorecards',
    accentColor: '#ec4899',
    videoType: 'scoring',
    metrics: [
      { label: 'Scoring', val: 'Ball by Ball' },
      { label: 'Updates', val: 'Live' },
      { label: 'Match Records', val: 'Scorecard' }
    ],
    features: [
      'Simple scoring for runs, boundaries, extras and wickets',
      'Live scorecard updates for everyone following the match',
      'Friends and fans can follow the score without WhatsApp forwards'
    ]
  }
];

export const USER_FACILITIES = [
  {
    role: 'Team Captains & Players',
    badge: 'PLAYERS & CAPTAINS',
    accent: '#22c55e',
    icon: 'Users',
    headline: 'Everything You Need To Play Every Weekend Without Stress',
    facilities: [
      {
        title: 'Fast Team-to-Team Matchmaking',
        desc: 'Post a match challenge or browse nearby teams ready to play. Connect and confirm inside the app.'
      },
      {
        title: 'Easy Ground Booking',
        desc: 'Find grounds near you, pick a slot, and book and pay online without endless phone calls.'
      },
      {
        title: 'Umpires on Demand',
        desc: 'Book a neutral umpire for impartial officiating and a proper match experience.'
      },
      {
        title: 'Live Scoring',
        desc: 'Ball-by-ball live scoring so your friends and fans can follow the match.'
      },
      {
        title: 'Squad Management',
        desc: 'Manage your team and teammates in one place and get chat with rival captains.'
      }
    ]
  },
  {
    role: 'Turf & Ground Owners',
    badge: 'VENUE PARTNERS',
    accent: '#06b6d4',
    icon: 'MapPin',
    headline: 'Get Your Ground In Front Of Local Cricket Teams',
    facilities: [
      {
        title: 'Reach Local Teams',
        desc: 'Get discovered by cricket squads searching for grounds in your area.'
      },
      {
        title: 'Online Slot Bookings',
        desc: 'Teams pick an available slot and book online, so fewer calls and fewer double bookings.'
      },
      {
        title: 'Secure Online Payments',
        desc: 'Booking payments are collected online instead of chasing cash on the day.'
      },
      {
        title: 'Ground Listing Details',
        desc: 'Show your pitch type, timings, pricing and location clearly to teams.'
      },
      {
        title: 'Cricket-Focused Community',
        desc: 'Be part of a platform built only for cricket teams, umpires and tournaments.'
      }
    ]
  },
  {
    role: 'Cricket Umpires',
    badge: 'MATCH OFFICIALS',
    accent: '#f59e0b',
    icon: 'Award',
    headline: 'Get Booked For Weekend Matches',
    facilities: [
      {
        title: 'Direct Captain Bookings',
        desc: 'Receive match officiating requests from captains directly in the app.'
      },
      {
        title: 'Transparent Match Fees',
        desc: 'Fees are clear to both sides before the match, so no awkward haggling.'
      },
      {
        title: 'Umpire Profile',
        desc: 'Showcase your experience and matches officiated to captains looking for officials.'
      },
      {
        title: 'Fair Play',
        desc: 'A neutral official keeps the game clean and disputes low.'
      },
      {
        title: 'Tournament Opportunities',
        desc: 'Get noticed by tournament organizers looking for umpires.'
      }
    ]
  },
  {
    role: 'Tournament Organizers',
    badge: 'LEAGUE ORGANIZERS',
    accent: '#a855f7',
    icon: 'Trophy',
    headline: 'Run Multi-Team Cricket Tournaments From One App',
    facilities: [
      {
        title: 'Create Tournaments Easily',
        desc: 'Set the format, venue, dates, entry fee and prizes in a few taps.'
      },
      {
        title: 'Online Team Registration',
        desc: 'Teams register from the app and you can see who has joined and how many slots are left.'
      },
      {
        title: 'Clear Entry Fee & Prize Details',
        desc: 'Show entry fees and prizes upfront so every team knows what they are playing for.'
      },
      {
        title: 'Live Scoring for Matches',
        desc: 'Score tournament matches live so teams and fans can follow along.'
      },
      {
        title: 'Grounds & Umpires In One Place',
        desc: 'Find grounds and umpires for your fixtures in the same app.'
      }
    ]
  }
];

// ---------------------------------------------------------------------
// SAMPLE / DEMO DATA - UI preview ku mattum. Real listings illa.
// (UmpiresAndTournaments.jsx, GroundsSpotlight.jsx la "Sample preview" nu label pannunga)
// ---------------------------------------------------------------------
export const CERTIFIED_UMPIRES = [
  {
    id: 'u1',
    name: 'Sample Umpire A',
    role: 'Match Umpire',
    experience: '8+ Years',
    matchesOfficiated: 240,
    rating: 4.9,
    feePerMatch: 800,
    certification: 'Sample profile',
    status: 'Available Tonight',
    sample: true
  },
  {
    id: 'u2',
    name: 'Sample Umpire B',
    role: 'Senior Official',
    experience: '6+ Years',
    matchesOfficiated: 185,
    rating: 4.8,
    feePerMatch: 650,
    certification: 'Sample profile',
    status: 'Available Weekend',
    sample: true
  },
  {
    id: 'u3',
    name: 'Sample Umpire C',
    role: 'Tournament Umpire',
    experience: '11+ Years',
    matchesOfficiated: 410,
    rating: 4.9,
    feePerMatch: 950,
    certification: 'Sample profile',
    status: 'Available Tonight',
    sample: true
  }
];

export const ACTIVE_TOURNAMENTS = [
  {
    id: 'tour-1',
    name: 'Sample Champions Trophy',
    format: 'Turf T10 (8 Overs)',
    prizePool: '₹60,000',
    firstPrize: '₹35,000 + Trophy',
    teamsRegistered: 12,
    maxTeams: 16,
    entryFee: '₹4,000 / team',
    status: 'Registering',
    dates: 'Sample dates',
    location: 'Sample Ground',
    sample: true
  },
  {
    id: 'tour-2',
    name: 'Sample Box Cricket League',
    format: 'Box Cricket (6v6)',
    prizePool: '₹40,000',
    firstPrize: '₹25,000 + Trophy',
    teamsRegistered: 8,
    maxTeams: 8,
    entryFee: '₹3,000 / team',
    status: 'Ongoing (Knockouts)',
    dates: 'Sample dates',
    location: 'Sample Box Cricket Arena',
    sample: true
  },
  {
    id: 'tour-3',
    name: 'Sample Corporate Cup',
    format: 'Leather Ball T20',
    prizePool: '₹1,00,000',
    firstPrize: '₹60,000 + Trophy',
    teamsRegistered: 10,
    maxTeams: 16,
    entryFee: '₹7,500 / team',
    status: 'Registering',
    dates: 'Sample dates',
    location: 'Sample International Ground',
    sample: true
  }
];

export const SAMPLE_TURFS = [
  {
    id: 'g1',
    name: 'Sample Floodlit Turf',
    location: 'Sample location',
    pricePerHour: 1400,
    rating: 4.9,
    reviews: 142,
    pitch: 'AstroTurf',
    lights: 'LED Floodlights',
    amenities: ['Dugouts', 'Drinking Water', 'Parking'],
    slotsAvailableTonight: 3,
    sample: true
  },
  {
    id: 'g2',
    name: 'Sample Box Cricket Arena',
    location: 'Sample location',
    pricePerHour: 1100,
    rating: 4.8,
    reviews: 98,
    pitch: 'Turf Matting',
    lights: 'Night Sport Lights',
    amenities: ['Scoreboard', 'Cafeteria', 'Parking'],
    slotsAvailableTonight: 5,
    sample: true
  },
  {
    id: 'g3',
    name: 'Sample Full-Size Ground',
    location: 'Sample location',
    pricePerHour: 1600,
    rating: 4.9,
    reviews: 210,
    pitch: '22-Yard Turf Pitch',
    lights: 'Floodlights',
    amenities: ['Locker Room', 'Parking', 'Drinking Water'],
    slotsAvailableTonight: 2,
    sample: true
  }
];

export const WHY_MATCHCONNECT = [
  {
    title: 'Find Opponents Faster',
    problem: 'Captains spend days asking around multiple WhatsApp groups hoping another team is free.',
    solution: 'Post your match once and let nearby teams see it and accept inside the app.',
    icon: 'Zap'
  },
  {
    title: 'Book Grounds With Live Slots',
    problem: 'Calling ground owners one by one only to hear "sorry, fully booked" or facing double bookings.',
    solution: 'See available slots and book online in a few taps.',
    icon: 'MapPin'
  },
  {
    title: 'Neutral Umpires On Demand',
    problem: 'Endless heated arguments over run-outs, no-balls, and LBWs when friends umpire the match.',
    solution: 'Book a neutral umpire with clear match fees for a fair game.',
    icon: 'Award'
  },
  {
    title: 'Tournaments In One App',
    problem: 'Organizing leagues with scattered chats, paper lists, and manual updates.',
    solution: 'Create tournaments, collect team registrations, and keep every team informed in one app.',
    icon: 'Trophy'
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Challenge Or Discover An Opponent',
    description: 'Post your match format (T10, T20, Box Cricket) or challenge a nearby squad. The rival captain gets an alert and can accept in the app.',
    highlight: 'Quick Match Connect'
  },
  {
    step: '02',
    title: 'Select & Book A Ground',
    description: 'Browse grounds near you, pick an available slot, and book online.',
    highlight: 'Online Slot Booking'
  },
  {
    step: '03',
    title: 'Add A Neutral Umpire',
    description: 'Book an umpire to oversee LBW calls, wides, and fair play for a low-dispute game.',
    highlight: 'Neutral Officials'
  },
  {
    step: '04',
    title: 'Score Ball-By-Ball',
    description: 'Score the match live so friends and fans can follow along, and keep your match records in one place.',
    highlight: 'Live Scoring'
  }
];

// Real reviews vandha inga add pannunga:
// { name: 'Name', role: 'Captain, Team Name', text: 'Review text', rating: 5, city: 'Chennai' }
export const TESTIMONIALS = [];

export const FAQS = [
  {
    q: 'How does MatchConnect help me find an opponent?',
    a: 'Post a match challenge with your overs format (T10, T20, Box Cricket) and preferred slot. Nearby teams can see it and accept inside the app, and captains get an in-app notification. No more searching through WhatsApp groups.'
  },
  {
    q: 'How does ground booking work?',
    a: 'Browse grounds near you, check the available slots, and book the one that suits your team. Booking payments are made online securely.'
  },
  {
    q: 'Can we book umpires for our friendly or corporate matches?',
    a: 'Yes. You can browse umpire profiles, see their fee per match, and book one for your game directly from the app.'
  },
  {
    q: 'How do tournaments work on MatchConnect?',
    a: 'Organizers can create a tournament, set the format, venue, dates, entry fee and prizes, and open registrations. Teams register from the app so organizers can see who has joined.'
  },
  {
    q: 'Do I need to install an app?',
    a: 'You can use MatchConnect right now in your browser. An Android app is coming soon on Google Play. Live scores and match details are available inside the app.'
  }
];