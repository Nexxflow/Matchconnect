const pool = require("../config/db");

async function seed() {
  console.log("Seeding grounds...");
  await pool.query(`
    INSERT INTO grounds (name, area, price_per_hour, rating, amenities, tags, latitude, longitude) VALUES
    ('Kotturpuram Stadium', 'Kotturpuram, Chennai', 800, 4.8, '["Water","Parking"]', '["Floodlights","Pitches: 3"]', 13.0244, 80.2422),
    ('Shivaji Park Ground', 'Dadar, Mumbai', 600, 4.5, '["Parking","Open Air"]', '["Natural Turf","Popular"]', 19.0283, 72.8397),
    ('Oval Maidan', 'Churchgate, Mumbai', 1200, 4.9, '["Showers","Parking"]', '["Floodlights","Heritage","Pitches: 5"]', 18.9320, 72.8261),
    ('Azad Maidan', 'Fort, Mumbai', 500, 4.2, '["Parking"]', '["Budget"]', 18.9432, 72.8347)
    ON CONFLICT DO NOTHING;
  `);

  console.log("Seeding umpires...");
  await pool.query(`
    INSERT INTO umpires (name, role, experience_years, price, available) VALUES
    ('Rahul Desai', 'Certified Umpire', 8, 800, true),
    ('Priya Sharma', 'Scorer', 4, 400, true),
    ('Vikram Nair', 'Umpire + Scorer', 12, 1100, false),
    ('Ananya Iyer', 'Certified Umpire', 6, 700, true)
    ON CONFLICT DO NOTHING;
  `);

  console.log("Seeding tournaments...");
  await pool.query(`
    INSERT INTO tournaments (name, status, format, venue, teams_count, matches_count, completed_count, prize, start_date, featured) VALUES
    ('Mumbai Premier Cricket League', 'Registering', 'T20', 'Multiple venues', 24, 48, 0, '₹50,000', '2026-08-15', true),
    ('Bandra T20 Cup', 'Ongoing', 'T20', 'Bandra Recreation Ground', 16, 24, 18, '₹15,000', '2026-07-08', false),
    ('Corporate Cricket Bash', 'Registering', 'T20', 'Cross Maidan', 8, 14, 0, 'Trophy', '2026-07-25', false),
    ('Monsoon Mavericks', 'Finals', 'ODI', 'Oval Maidan', 12, 22, 20, '₹25,000', '2026-06-01', false)
    ON CONFLICT DO NOTHING;
  `);

  console.log("✅ Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});