export const VIDEO_CHAPTERS = [
  {
    id: 'fast-matchmaking',
    tag: '01. CONNECT TEAMS FASTER',
    title: 'Challenge & Connect 2 Teams in Under 60 Seconds',
    subtitle: 'The core motive of MatchConnect: Stop endless WhatsApp texting. Broadcast a match challenge or browse ready opponent cricket squads filtered by skill level, overs, and distance.',
    badge: '48-Second Instant Match',
    accentColor: '#22c55e',
    videoType: 'teams',
    metrics: [
      { label: 'Avg Connection Time', val: '48 sec' },
      { label: 'Challenge Accept Rate', val: '96.2%' },
      { label: 'Active Squads Ready', val: '320+' }
    ],
    features: [
      '1-Tap Team Broadcast: Alert all matching cricket squads in your area instantly',
      'Balanced Matchmaking: Equal Elo ratings, overs format, and ball type (Tennis/Leather)',
      'Instant In-App & WhatsApp Notification: Rival captains accept challenges with 1 tap'
    ]
  },
  {
    id: 'turf-booking',
    tag: '02. BOOK FLOODLIT GROUNDS',
    title: 'Lock High-Grade Cricket Turfs Instantly',
    subtitle: 'Discover and reserve 450+ verified cricket turfs, indoor nets, and floodlit stadiums. View real-time slot calendars, pitch dimensions, and split costs among teammates.',
    badge: 'Direct Calendar Sync',
    accentColor: '#06b6d4',
    videoType: 'turf',
    metrics: [
      { label: 'Partner Turfs', val: '450+' },
      { label: 'Avg Booking Time', val: '2.4 min' },
      { label: 'Night Floodlit Arenas', val: '88%' }
    ],
    features: [
      'Real-time slot availability directly synced with turf venue managers',
      'High-spec pitch details: AstroTurf, synthetic shockpad, LED floodlights',
      'Automated team cost-splitting link: Each player pays their exact share'
    ]
  },
  {
    id: 'umpires',
    tag: '03. BOOK CERTIFIED UMPIRES',
    title: 'Professional Umpires For Every Match',
    subtitle: 'No more arguments over leg-before-wicket or no-balls. Hire licensed state and district cricket panel umpires with transparent match fees and proven track records.',
    badge: 'Certified Officials Panel',
    accentColor: '#f59e0b',
    videoType: 'umpire',
    metrics: [
      { label: 'Registered Umpires', val: '320+' },
      { label: 'Panel Rating Avg', val: '4.88 ★' },
      { label: 'Fair Play Index', val: '99.8%' }
    ],
    features: [
      'Browse umpires with experience level, matches officiated, and fee per match',
      'Instant assignment to friendly games, corporate matches, or league fixtures',
      'Zero dispute guarantee: Official decision telemetry and match reports'
    ]
  },
  {
    id: 'tournaments',
    tag: '04. TOURNAMENT ENGINE',
    title: 'Create & Host Cricket Tournaments Flawlessly',
    subtitle: 'From local weekend knockouts to corporate leagues. Automated fixture generation, group stages, live Net Run Rate (NRR) calculators, and digital prize pool escrow.',
    badge: 'Automated NRR & Brackets',
    accentColor: '#a855f7',
    videoType: 'bracket',
    metrics: [
      { label: 'Tournaments Hosted', val: '1,450+' },
      { label: 'Prize Pool Distributed', val: '₹4.2 Cr' },
      { label: 'Organizer Time Saved', val: '85%' }
    ],
    features: [
      'Automated Round-Robin and Knockout bracket draws with PDF schedule export',
      'Live dynamic points table with real-time Net Run Rate (NRR) recalculation',
      'Entry fee collection and verified prize money escrow protection'
    ]
  },
  {
    id: 'livescore',
    tag: '05. BROADCAST LIVE SCORING',
    title: 'Ball-By-Ball Scoring & Wagon Wheels',
    subtitle: 'Turn every match into an IPL-style broadcast. 1-tap live scoring, wagon wheels, run rate worms, player strike rates, and sharable spectator links for fans.',
    badge: 'Sub-Second Telemetry',
    accentColor: '#ec4899',
    videoType: 'scoring',
    metrics: [
      { label: 'Ball Update Latency', val: '< 0.5s' },
      { label: 'Career Stats Saved', val: '180K+' },
      { label: 'Spectator Link Clicks', val: '1.2M+' }
    ],
    features: [
      'Intuitive 1-tap scorer: Runs, boundaries, extras, and dismissals',
      'Interactive wagon wheels, run-rate worms, and Manhattan bar charts',
      'Free spectator web link: Friends watch live on WhatsApp with zero app install'
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
        desc: 'Post a match challenge or browse nearby teams ready to play. Connect and confirm in seconds.'
      },
      {
        title: 'Guaranteed Floodlit Ground Booking',
        desc: 'Instant booking on verified cricket turfs with 1-tap UPI split payment among all players.'
      },
      {
        title: 'Certified Umpires on Demand',
        desc: 'Book qualified cricket umpires for impartial officiating and professional match experience.'
      },
      {
        title: 'Pro Live Scoring & Lifetime Stats',
        desc: 'Ball-by-ball commentary, player career averages, strike rates, 5-wicket hauls, and MVP trophies.'
      },
      {
        title: 'Squad Roster Management',
        desc: 'Track teammate availability, pick up local guest players, and assign player roles with 1 click.'
      }
    ]
  },
  {
    role: 'Turf & Ground Owners',
    badge: 'VENUE PARTNERS',
    accent: '#06b6d4',
    icon: 'MapPin',
    headline: 'Fill Every Slot & Eliminate Revenue Loss from Cancellations',
    facilities: [
      {
        title: 'Zero Empty Night Slots',
        desc: 'Our matchmaking engine continuously pairs teams searching for grounds into your vacant slots.'
      },
      {
        title: '100% Upfront Guaranteed Payouts',
        desc: 'Captains lock turf fees upfront through automated squad split payments. No chasing payments.'
      },
      {
        title: 'No-Show Protection Escrow',
        desc: 'If a team cancels late, your venue is compensated instantly through commitment deposits.'
      },
      {
        title: 'Direct Calendar & Pitch Management',
        desc: 'Manage multiple pitches, floodlight surcharges, ball sales, and slot timings in real time.'
      },
      {
        title: 'Verified Cricketers Community',
        desc: 'Get discovered by thousands of active, verified cricket squads in your metropolitan area.'
      }
    ]
  },
  {
    role: 'Certified Cricket Umpires',
    badge: 'MATCH OFFICIALS',
    accent: '#f59e0b',
    icon: 'Award',
    headline: 'Get Booked For Weekend Matches & Earn Transparent Fees',
    facilities: [
      {
        title: 'Direct Captain Match Bookings',
        desc: 'Receive match officiating requests based on your location, free time, and preferred overs format.'
      },
      {
        title: 'Fixed & Transparent Match Fees',
        desc: 'Set your own match fee per fixture. Automated payout directly to your bank account post-match.'
      },
      {
        title: 'Official Rating & Credentials Profile',
        desc: 'Showcase your state/district panel certifications, matches officiated, and fair-play rating.'
      },
      {
        title: 'Zero Dispute Atmosphere',
        desc: 'Digital score sync ensures clear over counts, official balls, and documented team behavior.'
      },
      {
        title: 'Tournament Umpiring Contracts',
        desc: 'Exclusive access to officiate multi-day tournament knockouts and corporate championship cups.'
      }
    ]
  },
  {
    role: 'Tournament Organizers',
    badge: 'LEAGUE ORGANIZERS',
    accent: '#a855f7',
    icon: 'Trophy',
    headline: 'Run Multi-Team Cricket Leagues Like Professional Tournaments',
    facilities: [
      {
        title: 'Automated Bracket Generation',
        desc: 'Generate single-elimination, double-elimination, or group stage round-robin schedules with 1 tap.'
      },
      {
        title: 'Real-Time Dynamic Points Table',
        desc: 'Automated Net Run Rate (NRR) computation, boundary countback, and live standings updates.'
      },
      {
        title: 'Digital Entry Fee & Prize Escrow',
        desc: 'Collect team entry fees seamlessly and guarantee transparent prize pool distribution.'
      },
      {
        title: 'Live Tournament Broadcast Hub',
        desc: 'Dedicated tournament webpage with fixtures, top batsman/bowler leaderboards, and live scores.'
      },
      {
        title: 'Umpire & Ground Bundling',
        desc: 'Bulk reserve verified partner turfs and assign official umpires across all match fixtures.'
      }
    ]
  }
];

export const CERTIFIED_UMPIRES = [
  {
    id: 'u1',
    name: 'Sanjeev Sharma',
    role: 'Lead Match Umpire',
    experience: '8+ Years',
    matchesOfficiated: 240,
    rating: 4.95,
    feePerMatch: 800,
    certification: 'State Cricket Association Panel A',
    status: 'Available Tonight'
  },
  {
    id: 'u2',
    name: 'Manoj Pillai',
    role: 'Senior Official & Scorer',
    experience: '6+ Years',
    matchesOfficiated: 185,
    rating: 4.9,
    feePerMatch: 650,
    certification: 'District Certified Panel',
    status: 'Available Weekend'
  },
  {
    id: 'u3',
    name: 'K. Venkatesh',
    role: 'Tournament Referee / Umpire',
    experience: '11+ Years',
    matchesOfficiated: 410,
    rating: 4.98,
    feePerMatch: 950,
    certification: 'National Umpire Academy Graduate',
    status: 'Available Tonight'
  }
];

export const ACTIVE_TOURNAMENTS = [
  {
    id: 'tour-1',
    name: 'Super 8 Champions Trophy 2026',
    format: 'Turf T10 (8 Overs)',
    prizePool: '₹60,000',
    firstPrize: '₹35,000 + Trophy',
    teamsRegistered: 12,
    maxTeams: 16,
    entryFee: '₹4,000 / team',
    status: 'Registering',
    dates: 'Next Saturday & Sunday',
    location: 'Apex Arena & Floodlit Ground'
  },
  {
    id: 'tour-2',
    name: 'Night Box Premier League (NBPL)',
    format: 'Box Cricket (6v6)',
    prizePool: '₹40,000',
    firstPrize: '₹25,000 + Trophy',
    teamsRegistered: 8,
    maxTeams: 8,
    entryFee: '₹3,000 / team',
    status: 'Ongoing (Knockouts)',
    dates: 'Tonight 7:00 PM',
    location: 'Skyline Box Cricket Stadium'
  },
  {
    id: 'tour-3',
    name: 'Corporate Weekend Cricket Cup',
    format: 'Leather Ball T20',
    prizePool: '₹1,00,000',
    firstPrize: '₹60,000 + Trophy',
    teamsRegistered: 10,
    maxTeams: 16,
    entryFee: '₹7,500 / team',
    status: 'Registering',
    dates: 'Starting End of Month',
    location: 'Green Field International Grounds'
  }
];

export const SAMPLE_TURFS = [
  {
    id: 'g1',
    name: 'Apex Arena & Floodlit Turf',
    location: 'Sector 45 / Central Sports Hub',
    pricePerHour: 1400,
    rating: 4.9,
    reviews: 142,
    pitch: 'Pro AstroTurf (15mm shockpad)',
    lights: '1000 Lux Shadowless LED',
    amenities: ['Dugouts', 'Live Stream Cam', 'Chilled Water', 'Shower'],
    slotsAvailableTonight: 3
  },
  {
    id: 'g2',
    name: 'Skyline Box Cricket Stadium',
    location: 'Outer Ring Road, Tech Corridor',
    pricePerHour: 1100,
    rating: 4.8,
    reviews: 98,
    pitch: 'High-Density Turf Matting',
    lights: '800 Lux Night Sport Lights',
    amenities: ['Scoreboard Screen', 'Cafeteria', 'Parking', 'Bat Rental'],
    slotsAvailableTonight: 5
  },
  {
    id: 'g3',
    name: 'Green Field International Grounds',
    location: 'North Athletic Campus Hub',
    pricePerHour: 1600,
    rating: 4.95,
    reviews: 210,
    pitch: 'ICC Standard 22-Yard Turf',
    lights: 'Shadowless HD Floodlights',
    amenities: ['Bowling Machine', 'Pro Umpire On-Site', 'Locker Room'],
    slotsAvailableTonight: 2
  }
];

export const WHY_MATCHCONNECT = [
  {
    title: 'Connect Two Teams 10x Faster',
    problem: 'Captains spend 2–3 days asking around 5 WhatsApp groups hoping another team is free.',
    solution: 'MatchConnect broadcasts match invites or pairs you with an opponent in under 60 seconds.',
    icon: 'Zap'
  },
  {
    title: 'Book Grounds with Real-Time Slots',
    problem: 'Calling turf owners individually only to hear "sorry, fully booked" or facing double bookings.',
    solution: 'Live synced ground calendar allows 1-click slot reservation with upfront automated player split pay.',
    icon: 'MapPin'
  },
  {
    title: 'Certified Umpires on Demand',
    problem: 'Endless heated arguments over run-outs, no-balls, and LBWs when using friendly uncertified umpires.',
    solution: 'Book licensed state and district umpires with transparent match fees and official match control.',
    icon: 'Award'
  },
  {
    title: 'Full Tournament Operating Engine',
    problem: 'Organizing leagues with paper brackets, disputed points tables, and manual Net Run Rate math.',
    solution: 'Automated knockout brackets, live dynamic NRR calculation, digital entry fee & prize escrow.',
    icon: 'Trophy'
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Challenge Or Discover An Opponent',
    description: 'Post your match format (T10, T20, Box Cricket) or challenge a nearby squad. Rival captain gets an instant alert and confirms in seconds.',
    highlight: 'Connect in 48s'
  },
  {
    step: '02',
    title: 'Select & Lock A Floodlit Ground',
    description: 'Choose from 450+ partner turfs. Split the ground fee automatically with an instant UPI link sent to both squads.',
    highlight: 'Instant Slot Lock'
  },
  {
    step: '03',
    title: 'Assign A Certified Cricket Umpire',
    description: 'Add a qualified match official to oversee LBW rules, wides, and fair play for a zero-dispute professional game.',
    highlight: 'Official Umpire Panel'
  },
  {
    step: '04',
    title: 'Score Ball-By-Ball & Build Legacy',
    description: 'Stream live scores to WhatsApp, earn match MVP trophies, update tournament points tables, and rank up your team.',
    highlight: 'Broadcast Live Telecast'
  }
];

export const TESTIMONIALS = [
  {
    name: 'Rohit Kulkarni',
    role: 'Captain, Koramangala Knights',
    text: 'MatchConnect completely transformed how we play cricket. We challenged Royals XI, locked the turf, and booked an official umpire in under 4 minutes. Zero arguments, pro experience.',
    rating: 5,
    matchCount: '38 Matches',
    city: 'Bengaluru'
  },
  {
    name: 'Suhas Deshmukh',
    role: 'Owner, Apex Arena Turf',
    text: 'Our evening slots used to go empty on weekdays. With MatchConnect connecting teams to our ground, we have 92% occupancy and 100% guaranteed upfront payments.',
    rating: 5,
    matchCount: 'Turf Partner (14 Months)',
    city: 'Pune'
  },
  {
    name: 'Amanpreet Singh',
    role: 'Tournament Organizer, Corporate Cup',
    text: 'Hosted a 16-team tournament through MatchConnect. Automated brackets, NRR points table, and verified umpires saved our committee 20+ hours of headache.',
    rating: 5,
    matchCount: '4 Tournaments Hosted',
    city: 'Delhi NCR'
  }
];

export const FAQS = [
  {
    q: 'How does MatchConnect connect two teams faster?',
    a: 'MatchConnect maintains an active radar of cricket teams in your metropolitan area. When you post a match or broadcast a challenge with your overs format (T10, T20, Box Cricket), matching teams and captains receive an instant push and WhatsApp notification. Matches are typically confirmed within 48 to 60 seconds.'
  },
  {
    q: 'How does turf ground booking and payment splitting work?',
    a: 'MatchConnect connects directly to turf management calendars. When you select a ground slot, an automated per-player payment split link is generated. Both teams and all players chip in their share via UPI or cards, locking the slot instantly without the captain risking their own money.'
  },
  {
    q: 'Can we book certified umpires for our friendly or corporate matches?',
    a: 'Yes! MatchConnect has over 320+ registered state and district panel umpires. You can browse their officiating experience, match fee, and ratings, and add them to your match in one tap. The umpire receives the venue and timing and arrives to officiate with official equipment.'
  },
  {
    q: 'How do tournaments and prize pool escrow work on MatchConnect?',
    a: 'Tournament organizers can create cups, set entry fees and prize pools, and invite teams. Teams register digitally, and MatchConnect generates the automated bracket tree, schedules matches, calculates live Net Run Rates (NRR), and safely escrows the prize pool until the final is won.'
  },
  {
    q: 'Do spectators or friends need an app to watch the live match scoring?',
    a: 'No app download is needed for viewers. When scoring begins, a lightweight web live-stream link is generated that you can share on WhatsApp. Anyone can click and follow ball-by-ball commentary, wagon wheels, and run-rates on any browser in real time.'
  }
];
