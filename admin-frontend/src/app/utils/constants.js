import React from "react";
import { Droplets, Car, Wind } from "lucide-react";

export const AMENITY_ICON = {
  Water: React.createElement(Droplets, { className: "w-3 h-3" }),
  Showers: React.createElement(Droplets, { className: "w-3 h-3" }),
  Parking: React.createElement(Car, { className: "w-3 h-3" }),
  "Open Air": React.createElement(Wind, { className: "w-3 h-3" })
};

export const TAG_COLOR = {
  Floodlights: "blue",
  Heritage: "amber",
  Popular: "amber",
  Budget: "green"
};

export const UMPIRE_GRADIENTS = [
  "linear-gradient(135deg,#7c3aed,#5b21b6)",
  "linear-gradient(135deg,#db2777,#9d174d)",
  "linear-gradient(135deg,#d97706,#92400e)",
  "linear-gradient(135deg,#2563eb,#1e40af)"
];

export const FORMATS = [
  { key: "T20", emoji: "⚡", title: "T20 Match", desc: "20 overs per side, fast-paced" },
  { key: "ODI", emoji: "🏏", title: "ODI Format", desc: "50 overs, balanced game" },
  { key: "Turf", emoji: "🔥", title: "Turf Nets", desc: "Short format, indoor/outdoor" },
  { key: "Test", emoji: "🎯", title: "Test Match", desc: "Multi-day, traditional format" }
];

export const DEFAULT_OVERS = { T20: 20, ODI: 50, Turf: 10, Test: "" };

export const ALL_CHALLENGES = [
  { id: 1, team: "Royal Strikers CC", rating: 4.7, wins: 23, losses: 8, format: "T20", date: "Today", time: "4:00 PM", ground: "Shivaji Park Ground", urgent: true, note: "Free entry" },
  { id: 2, team: "Mumbai Warriors", rating: 4.3, wins: 18, losses: 12, format: "ODI", date: "Weekend", time: "9:00 AM", ground: "Cross Maidan", urgent: false, note: "₹500/head" },
  { id: 3, team: "Thunder Bolts CC", rating: 4.6, wins: 31, losses: 9, format: "T20", date: "Weekend", time: "3:00 PM", ground: "Oval Maidan", urgent: false, note: "Intermediate" },
  { id: 4, team: "Green Eagles", rating: 4.4, wins: 24, losses: 14, format: "ODI", date: "Next Week", time: "8:00 AM", ground: "Azad Maidan", urgent: false, note: "Advanced" },
  { id: 5, team: "City Smashers", rating: 4.1, wins: 19, losses: 20, format: "Box", date: "Today", time: "6:00 PM", ground: "Kotturpuram Stadium", urgent: true, note: "Beginner" },
  { id: 6, team: "Deccan Chargers CC", rating: 4.5, wins: 27, losses: 11, format: "Test", date: "Next Week", time: "9:30 AM", ground: "Oval Maidan", urgent: false, note: "Multi-day" }
];

export const GROUNDS = [
  { name: "Kotturpuram Stadium", area: "Kotturpuram, Chennai", amenities: [{ icon: React.createElement(Droplets, { className: "w-3 h-3" }), label: "Water" }, { icon: React.createElement(Car, { className: "w-3 h-3" }), label: "Parking" }], tags: [{ label: "Floodlights", color: "blue" }, { label: "Pitches: 3", color: "green" }], price: "₹800/hr", rating: 4.8 },
  { name: "Shivaji Park Ground", area: "Dadar, Mumbai", amenities: [{ icon: React.createElement(Car, { className: "w-3 h-3" }), label: "Parking" }, { icon: React.createElement(Wind, { className: "w-3 h-3" }), label: "Open Air" }], tags: [{ label: "Natural Turf", color: "green" }, { label: "Popular", color: "amber" }], price: "₹600/hr", rating: 4.5 },
  { name: "Oval Maidan", area: "Churchgate, Mumbai", amenities: [{ icon: React.createElement(Droplets, { className: "w-3 h-3" }), label: "Showers" }, { icon: React.createElement(Car, { className: "w-3 h-3" }), label: "Parking" }], tags: [{ label: "Floodlights", color: "blue" }, { label: "Heritage", color: "amber" }, { label: "Pitches: 5", color: "green" }], price: "₹1,200/hr", rating: 4.9 },
  { name: "Azad Maidan", area: "Fort, Mumbai", amenities: [{ icon: React.createElement(Car, { className: "w-3 h-3" }), label: "Parking" }], tags: [{ label: "Budget", color: "green" }], price: "₹500/hr", rating: 4.2 }
];

export const TIME_SLOTS = ["6:00 AM", "8:00 AM", "10:00 AM", "2:00 PM", "4:00 PM", "6:00 PM"];
