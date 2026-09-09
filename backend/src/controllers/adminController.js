const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const ADMIN_PHONE = "6382757532";

function isAdminPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  return digits.endsWith(ADMIN_PHONE) || digits === ADMIN_PHONE;
}

// Helper to format Date as YYYY-MM-DD
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to parse Month string YYYY-MM into start date, end date, and label
function parseMonthRange(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return null;
  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthNumStr, 10) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0); // last day of month
  const label = start.toLocaleString("en-US", { month: "short", year: "numeric" });
  return {
    start: formatDate(start),
    end: formatDate(end),
    label
  };
}

function calculateGrowth(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) {
    return curr > 0 ? 100 : 0;
  }
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

// ─── GET /api/admin/stats ──────────────────────────────────────────────────
// Returns platform counts, period metrics, optional comparison stats & charts.
// If isCompare is false or omitted, returns single-period stats for the selected date/month.
// If isCompare is true, computes difference metrics and trajectory comparison for chosen months/periods.
const getAdminStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const isCompare = req.query.isCompare === "true" || Boolean(req.query.month1 && req.query.month2);
  const preset = (req.query.preset || "this_month").toLowerCase();
  const singleDate = req.query.singleDate ? String(req.query.singleDate).trim() : null;

  let currentStart;
  let currentEnd;
  let previousStart;
  let previousEnd;
  let periodLabel = "This Month";
  let comparisonLabel = "";

  // 1. Resolve date ranges based on query parameters
  if (req.query.month1 && req.query.month2) {
    // Explicit two-month comparison chosen by user
    const m1 = parseMonthRange(req.query.month1);
    const m2 = parseMonthRange(req.query.month2);
    if (m1 && m2) {
      currentStart = m1.start;
      currentEnd = m1.end;
      periodLabel = m1.label;
      previousStart = m2.start;
      previousEnd = m2.end;
      comparisonLabel = m2.label;
    }
  } else if (req.query.month) {
    // Single month chosen
    const m = parseMonthRange(req.query.month);
    if (m) {
      currentStart = m.start;
      currentEnd = m.end;
      periodLabel = m.label;
      if (isCompare) {
        const [yStr, mStr] = req.query.month.split("-");
        const prevMonthDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 2, 1);
        const prevM = parseMonthRange(`${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`);
        if (prevM) {
          previousStart = prevM.start;
          previousEnd = prevM.end;
          comparisonLabel = prevM.label;
        }
      }
    }
  } else if (singleDate && /^\d{4}-\d{2}-\d{2}$/.test(singleDate)) {
    // Single selected date
    currentStart = singleDate;
    currentEnd = singleDate;
    periodLabel = `Selected Date (${singleDate})`;
    if (isCompare) {
      const compareDate = req.query.compareDate && /^\d{4}-\d{2}-\d{2}$/.test(req.query.compareDate)
        ? req.query.compareDate
        : null;
      if (compareDate) {
        previousStart = compareDate;
        previousEnd = compareDate;
        comparisonLabel = `Compared Date (${compareDate})`;
      } else {
        const sDate = new Date(singleDate + "T00:00:00");
        const prevDate = new Date(sDate);
        prevDate.setDate(prevDate.getDate() - 1);
        previousStart = formatDate(prevDate);
        previousEnd = formatDate(prevDate);
        comparisonLabel = `Previous Day (${previousStart})`;
      }
    }
  } else if (req.query.startDate && req.query.endDate) {
    // Custom date range
    currentStart = req.query.startDate;
    currentEnd = req.query.endDate;
    periodLabel = `${currentStart} to ${currentEnd}`;
    if (isCompare) {
      if (req.query.compareStartDate && req.query.compareEndDate) {
        previousStart = req.query.compareStartDate;
        previousEnd = req.query.compareEndDate;
        comparisonLabel = `${previousStart} to ${previousEnd}`;
      } else {
        const cStart = new Date(currentStart + "T00:00:00");
        const cEnd = new Date(currentEnd + "T00:00:00");
        const diffDays = Math.max(1, Math.round((cEnd - cStart) / (1000 * 60 * 60 * 24)) + 1);
        const pStart = new Date(cStart);
        pStart.setDate(pStart.getDate() - diffDays);
        const pEnd = new Date(cStart);
        pEnd.setDate(pEnd.getDate() - 1);
        previousStart = formatDate(pStart);
        previousEnd = formatDate(pEnd);
        comparisonLabel = `Prior ${diffDays} Days (${previousStart} to ${previousEnd})`;
      }
    }
  } else if (preset === "last_month") {
    // Last month
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    currentStart = formatDate(firstDayLastMonth);
    currentEnd = formatDate(lastDayLastMonth);
    periodLabel = `Last Month (${firstDayLastMonth.toLocaleString("en-US", { month: "short", year: "numeric" })})`;
    if (isCompare) {
      const firstDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const lastDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      previousStart = formatDate(firstDayTwoMonthsAgo);
      previousEnd = formatDate(lastDayTwoMonthsAgo);
      comparisonLabel = `2 Months Ago (${firstDayTwoMonthsAgo.toLocaleString("en-US", { month: "short", year: "numeric" })})`;
    }
  } else if (preset === "today") {
    const todayStr = formatDate(now);
    currentStart = todayStr;
    currentEnd = todayStr;
    periodLabel = "Today";
    if (isCompare) {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDate(yest);
      previousStart = yestStr;
      previousEnd = yestStr;
      comparisonLabel = "Yesterday";
    }
  } else if (preset === "yesterday") {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatDate(yest);
    currentStart = yestStr;
    currentEnd = yestStr;
    periodLabel = "Yesterday";
    if (isCompare) {
      const dayBefore = new Date(yest);
      dayBefore.setDate(dayBefore.getDate() - 1);
      previousStart = formatDate(dayBefore);
      previousEnd = formatDate(dayBefore);
      comparisonLabel = "Day Before Yesterday";
    }
  } else if (preset === "7days") {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    currentStart = formatDate(past7);
    currentEnd = formatDate(now);
    periodLabel = "Last 7 Days";
    if (isCompare) {
      const prev7End = new Date(past7);
      prev7End.setDate(prev7End.getDate() - 1);
      const prev7Start = new Date(prev7End);
      prev7Start.setDate(prev7Start.getDate() - 6);
      previousStart = formatDate(prev7Start);
      previousEnd = formatDate(prev7End);
      comparisonLabel = "Prior 7 Days";
    }
  } else if (preset === "30days") {
    const past30 = new Date(now);
    past30.setDate(past30.getDate() - 29);
    currentStart = formatDate(past30);
    currentEnd = formatDate(now);
    periodLabel = "Last 30 Days";
    if (isCompare) {
      const prev30End = new Date(past30);
      prev30End.setDate(prev30End.getDate() - 1);
      const prev30Start = new Date(prev30End);
      prev30Start.setDate(prev30Start.getDate() - 29);
      previousStart = formatDate(prev30Start);
      previousEnd = formatDate(prev30End);
      comparisonLabel = "Prior 30 Days";
    }
  } else {
    // Default: this_month
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    currentStart = formatDate(firstDayThisMonth);
    currentEnd = formatDate(lastDayThisMonth);
    periodLabel = `This Month (${firstDayThisMonth.toLocaleString("en-US", { month: "short", year: "numeric" })})`;
    if (isCompare) {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      previousStart = formatDate(firstDayLastMonth);
      previousEnd = formatDate(lastDayLastMonth);
      comparisonLabel = `Last Month (${firstDayLastMonth.toLocaleString("en-US", { month: "short", year: "numeric" })})`;
    }
  }

  // 2. Lifetime platform counts in parallel
  const [
    usersCountRes,
    teamsCountRes,
    groundsCountRes,
    tournamentsCountRes,
    bookingsCountRes,
    revenueRes
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query(`
      SELECT COUNT(DISTINCT team_name)::int AS count FROM (
        SELECT name AS team_name FROM teams WHERE name IS NOT NULL AND TRIM(name) != ''
        UNION
        SELECT team_name FROM users WHERE team_name IS NOT NULL AND TRIM(team_name) != ''
      ) t
    `),
    pool.query("SELECT COUNT(*)::int AS count FROM grounds"),
    pool.query("SELECT COUNT(*)::int AS count FROM tournaments"),
    pool.query("SELECT COUNT(*)::int AS count FROM bookings"),
    pool.query(`
      SELECT COALESCE(SUM(COALESCE(total_amount, base_amount, 0)), 0)::numeric AS total_revenue
      FROM bookings
      WHERE LOWER(payment_status) = 'paid'
    `)
  ]);

  // 3. Current Period Metrics
  const [
    currBookingsRes,
    currRevenueRes,
    currUsersRes,
    currTeamsRes
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM bookings
       WHERE (booking_date >= $1 AND booking_date <= $2) OR (created_at::date >= $1 AND created_at::date <= $2)`,
      [currentStart, currentEnd]
    ),
    pool.query(
      `SELECT COALESCE(SUM(COALESCE(total_amount, base_amount, 0)), 0)::numeric AS revenue FROM bookings
       WHERE LOWER(payment_status) = 'paid'
         AND ((booking_date >= $1 AND booking_date <= $2) OR (created_at::date >= $1 AND created_at::date <= $2))`,
      [currentStart, currentEnd]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE created_at::date >= $1 AND created_at::date <= $2`,
      [currentStart, currentEnd]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM teams WHERE created_at::date >= $1 AND created_at::date <= $2`,
      [currentStart, currentEnd]
    )
  ]);

  const currentMetrics = {
    bookings: currBookingsRes.rows[0]?.count || 0,
    revenue: Number(currRevenueRes.rows[0]?.revenue || 0),
    users: currUsersRes.rows[0]?.count || 0,
    teams: currTeamsRes.rows[0]?.count || 0,
    startDate: currentStart,
    endDate: currentEnd,
    label: periodLabel
  };

  // 4. Comparison Metrics & Day-by-Day Trajectory (ONLY if isCompare is true)
  let previousMetrics = null;
  let diffMetrics = null;
  let monthComparisonChart = [];

  if (isCompare && previousStart && previousEnd) {
    const [
      prevBookingsRes,
      prevRevenueRes,
      prevUsersRes,
      prevTeamsRes,
      monthCompRes
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM bookings
         WHERE (booking_date >= $1 AND booking_date <= $2) OR (created_at::date >= $1 AND created_at::date <= $2)`,
        [previousStart, previousEnd]
      ),
      pool.query(
        `SELECT COALESCE(SUM(COALESCE(total_amount, base_amount, 0)), 0)::numeric AS revenue FROM bookings
         WHERE LOWER(payment_status) = 'paid'
           AND ((booking_date >= $1 AND booking_date <= $2) OR (created_at::date >= $1 AND created_at::date <= $2))`,
        [previousStart, previousEnd]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE created_at::date >= $1 AND created_at::date <= $2`,
        [previousStart, previousEnd]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM teams WHERE created_at::date >= $1 AND created_at::date <= $2`,
        [previousStart, previousEnd]
      ),
      pool.query(
        `WITH curr_b AS (
           SELECT
             EXTRACT(DAY FROM COALESCE(b.booking_date, b.created_at::date))::int AS day_num,
             COUNT(b.id)::int AS bookings,
             COALESCE(SUM(CASE WHEN LOWER(b.payment_status) = 'paid' THEN COALESCE(b.total_amount, b.base_amount, 0) ELSE 0 END), 0)::numeric AS revenue
           FROM bookings b
           WHERE (b.booking_date >= $1 AND b.booking_date <= $2) OR (b.created_at::date >= $1 AND b.created_at::date <= $2)
           GROUP BY day_num
         ),
         prev_b AS (
           SELECT
             EXTRACT(DAY FROM COALESCE(b.booking_date, b.created_at::date))::int AS day_num,
             COUNT(b.id)::int AS bookings,
             COALESCE(SUM(CASE WHEN LOWER(b.payment_status) = 'paid' THEN COALESCE(b.total_amount, b.base_amount, 0) ELSE 0 END), 0)::numeric AS revenue
           FROM bookings b
           WHERE (b.booking_date >= $3 AND b.booking_date <= $4) OR (b.created_at::date >= $3 AND b.created_at::date <= $4)
           GROUP BY day_num
         ),
         curr_u AS (
           SELECT
             EXTRACT(DAY FROM created_at::date)::int AS day_num,
             COUNT(id)::int AS users
           FROM users
           WHERE created_at::date >= $1 AND created_at::date <= $2
           GROUP BY day_num
         ),
         prev_u AS (
           SELECT
             EXTRACT(DAY FROM created_at::date)::int AS day_num,
             COUNT(id)::int AS users
           FROM users
           WHERE created_at::date >= $3 AND created_at::date <= $4
           GROUP BY day_num
         ),
         days AS (
           SELECT generate_series(1, 31) AS day_num
         )
         SELECT
           d.day_num,
           'Day ' || d.day_num AS label,
           COALESCE(curr_b.bookings, 0)::int AS current_bookings,
           COALESCE(prev_b.bookings, 0)::int AS prev_bookings,
           COALESCE(curr_b.revenue, 0)::numeric AS current_revenue,
           COALESCE(prev_b.revenue, 0)::numeric AS prev_revenue,
           COALESCE(curr_u.users, 0)::int AS current_users,
           COALESCE(prev_u.users, 0)::int AS prev_users
         FROM days d
         LEFT JOIN curr_b ON d.day_num = curr_b.day_num
         LEFT JOIN prev_b ON d.day_num = prev_b.day_num
         LEFT JOIN curr_u ON d.day_num = curr_u.day_num
         LEFT JOIN prev_u ON d.day_num = prev_u.day_num
         ORDER BY d.day_num ASC`,
        [currentStart, currentEnd, previousStart, previousEnd]
      )
    ]);

    previousMetrics = {
      bookings: prevBookingsRes.rows[0]?.count || 0,
      revenue: Number(prevRevenueRes.rows[0]?.revenue || 0),
      users: prevUsersRes.rows[0]?.count || 0,
      teams: prevTeamsRes.rows[0]?.count || 0,
      startDate: previousStart,
      endDate: previousEnd,
      label: comparisonLabel
    };

    diffMetrics = {
      bookingsDiff: currentMetrics.bookings - previousMetrics.bookings,
      bookingsGrowth: calculateGrowth(currentMetrics.bookings, previousMetrics.bookings),
      revenueDiff: currentMetrics.revenue - previousMetrics.revenue,
      revenueGrowth: calculateGrowth(currentMetrics.revenue, previousMetrics.revenue),
      usersDiff: currentMetrics.users - previousMetrics.users,
      usersGrowth: calculateGrowth(currentMetrics.users, previousMetrics.users),
      teamsDiff: currentMetrics.teams - previousMetrics.teams,
      teamsGrowth: calculateGrowth(currentMetrics.teams, previousMetrics.teams)
    };

    monthComparisonChart = monthCompRes.rows.map((row) => ({
      day: Number(row.day_num),
      label: row.label,
      currentBookings: Number(row.current_bookings),
      prevBookings: Number(row.prev_bookings),
      currentRevenue: Number(row.current_revenue),
      prevRevenue: Number(row.prev_revenue),
      currentUsers: Number(row.current_users),
      prevUsers: Number(row.prev_users)
    }));
  }

  // 5. Timeline chart data for the selected current period
  const timelineRes = await pool.query(
    `WITH days AS (
       SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS day
     ),
     b_agg AS (
       SELECT
         COALESCE(b.booking_date, b.created_at::date) AS day,
         COUNT(b.id)::int AS bookings,
         COALESCE(SUM(CASE WHEN LOWER(b.payment_status) = 'paid' THEN COALESCE(b.total_amount, b.base_amount, 0) ELSE 0 END), 0)::numeric AS revenue
       FROM bookings b
       WHERE (b.booking_date >= $1 AND b.booking_date <= $2) OR (b.created_at::date >= $1 AND b.created_at::date <= $2)
       GROUP BY day
     ),
     u_agg AS (
       SELECT
         created_at::date AS day,
         COUNT(id)::int AS users
       FROM users
       WHERE created_at::date >= $1 AND created_at::date <= $2
       GROUP BY day
     )
     SELECT
       TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
       TO_CHAR(d.day, 'Mon DD') AS label,
       COALESCE(b_agg.bookings, 0)::int AS bookings,
       COALESCE(b_agg.revenue, 0)::numeric AS revenue,
       COALESCE(u_agg.users, 0)::int AS users
     FROM days d
     LEFT JOIN b_agg ON d.day = b_agg.day
     LEFT JOIN u_agg ON d.day = u_agg.day
     ORDER BY d.day ASC`,
    [currentStart, currentEnd]
  );

  // 6. Recent signups
  const recentSignupsRes = await pool.query(`
    SELECT
      id,
      name,
      email,
      phone,
      team_name,
      village_name,
      COALESCE(is_admin, false) AS is_admin,
      created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 25
  `);

  // 6b. Selected date/range specific users (signups or logins in selected period)
  let selectedPeriodUsers = [];
  try {
    const selectedUsersRes = await pool.query(
      `SELECT
        id,
        name,
        email,
        phone,
        team_name,
        village_name,
        COALESCE(is_admin, false) AS is_admin,
        created_at,
        last_login
      FROM users
      WHERE (created_at::date >= $1 AND created_at::date <= $2)
         OR (last_login IS NOT NULL AND last_login::date >= $1 AND last_login::date <= $2)
      ORDER BY created_at DESC
      LIMIT 50`,
      [currentStart, currentEnd]
    );
    selectedPeriodUsers = selectedUsersRes.rows;
  } catch (err) {
    const fallbackUsersRes = await pool.query(
      `SELECT
        id,
        name,
        email,
        phone,
        team_name,
        village_name,
        COALESCE(is_admin, false) AS is_admin,
        created_at
      FROM users
      WHERE created_at::date >= $1 AND created_at::date <= $2
      ORDER BY created_at DESC
      LIMIT 50`,
      [currentStart, currentEnd]
    );
    selectedPeriodUsers = fallbackUsersRes.rows;
  }

  // 7. Recent bookings
  const recentBookingsRes = await pool.query(
    `SELECT
      b.id,
      b.booking_type,
      b.booking_date,
      b.time_slot,
      b.base_amount,
      b.platform_fee,
      COALESCE(b.total_amount, b.base_amount, 0) AS total_amount,
      b.payment_status,
      b.created_at,
      u.name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      COALESCE(g.name, u_ump.name, 'N/A') AS ground_name
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN grounds g ON b.ground_id = g.id
    LEFT JOIN umpires u_ump ON b.umpire_id = u_ump.id
    ORDER BY b.created_at DESC NULLS LAST, b.booking_date DESC
    LIMIT 25`
  );

  // 8. Selected date/range specific bookings
  const selectedPeriodBookingsRes = await pool.query(
    `SELECT
      b.id,
      b.booking_type,
      b.booking_date,
      b.time_slot,
      b.base_amount,
      b.platform_fee,
      COALESCE(b.total_amount, b.base_amount, 0) AS total_amount,
      b.payment_status,
      b.created_at,
      u.name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      COALESCE(g.name, u_ump.name, 'N/A') AS ground_name
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN grounds g ON b.ground_id = g.id
    LEFT JOIN umpires u_ump ON b.umpire_id = u_ump.id
    WHERE (b.booking_date >= $1 AND b.booking_date <= $2) OR (b.created_at::date >= $1 AND b.created_at::date <= $2)
    ORDER BY b.booking_date DESC, b.created_at DESC NULLS LAST
    LIMIT 50`,
    [currentStart, currentEnd]
  );

  res.json({
    counts: {
      users: usersCountRes.rows[0]?.count || 0,
      teams: teamsCountRes.rows[0]?.count || 0,
      grounds: groundsCountRes.rows[0]?.count || 0,
      tournaments: tournamentsCountRes.rows[0]?.count || 0,
      bookings: bookingsCountRes.rows[0]?.count || 0,
      revenue: Number(revenueRes.rows[0]?.total_revenue || 0)
    },
    isComparing: Boolean(isCompare),
    periodComparison: {
      isComparing: Boolean(isCompare),
      preset,
      current: currentMetrics,
      previous: previousMetrics,
      diff: diffMetrics
    },
    monthComparisonChart,
    chartData: timelineRes.rows.map((row) => ({
      date: row.date,
      label: row.label,
      bookings: Number(row.bookings),
      revenue: Number(row.revenue),
      users: Number(row.users || 0)
    })),
    recentSignups: recentSignupsRes.rows,
    selectedPeriodUsers,
    recentBookings: recentBookingsRes.rows,
    selectedPeriodBookings: selectedPeriodBookingsRes.rows
  });
});

// ─── GET /api/admin/users ──────────────────────────────────────────────────
// Search, filter, and pagination for user management.
const getAdminUsers = asyncHandler(async (req, res) => {
  const search = (req.query.search || "").trim();
  const role = (req.query.role || "all").trim().toLowerCase();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length} OR team_name ILIKE $${params.length})`);
  }

  if (role === "admin") {
    conditions.push("is_admin = true");
  } else if (role === "user") {
    conditions.push("(is_admin IS FALSE OR is_admin IS NULL)");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count for pagination
  const countQuery = `SELECT COUNT(*)::int AS total FROM users ${whereClause}`;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Get paginated users
  const dataParams = [...params, limit, offset];
  const usersQuery = `
    SELECT
      id,
      name,
      email,
      phone,
      team_name,
      village_name,
      team_year,
      COALESCE(is_admin, false) AS is_admin,
      created_at
    FROM users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const usersRes = await pool.query(usersQuery, dataParams);

  res.json({
    users: usersRes.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  });
});

// ─── POST /api/admin/users ─────────────────────────────────────────────────
// Allows admin to create a new user and specify if they are Admin or standard User.
const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, team_name, village_name, team_year, is_admin } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "Name, email, phone, and password are required" });
  }

  const cleanPhone = String(phone).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  // Check existing
  const existing = await pool.query(
    "SELECT email, phone FROM users WHERE LOWER(TRIM(email)) = $1 OR phone = $2",
    [cleanEmail, cleanPhone]
  );

  if (existing.rows.length > 0) {
    const emailTaken = existing.rows.some(r => r.email?.toLowerCase() === cleanEmail);
    const phoneTaken = existing.rows.some(r => r.phone === cleanPhone);
    if (emailTaken && phoneTaken) {
      return res.status(409).json({ error: "Email and phone number are already registered" });
    }
    if (emailTaken) {
      return res.status(409).json({ error: "Email already registered" });
    }
    if (phoneTaken) {
      return res.status(409).json({ error: "Phone number already registered" });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const adminFlag = is_admin === true || is_admin === "true" || isAdminPhone(cleanPhone);

  let parsedYear = null;
  if (team_year) {
    parsedYear = parseInt(team_year, 10);
    if (Number.isNaN(parsedYear)) parsedYear = null;
  }

  const result = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, team_name, village_name, team_year, is_admin, terms_accepted, terms_accepted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now())
     RETURNING id, name, email, phone, team_name, village_name, team_year, COALESCE(is_admin, false) AS is_admin, created_at`,
    [
      name.trim(),
      cleanEmail,
      cleanPhone,
      passwordHash,
      team_name?.trim() || null,
      village_name?.trim() || null,
      parsedYear,
      adminFlag
    ]
  );

  res.status(201).json({
    message: "User created successfully",
    user: result.rows[0]
  });
});

// ─── PATCH /api/admin/users/:id/role ───────────────────────────────────────
// Update user admin role
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { is_admin, role } = req.body;

  if (role !== undefined && is_admin === undefined) {
    is_admin = role === "admin" || role === "administrator";
  }

  if (typeof is_admin === "string") {
    is_admin = is_admin.toLowerCase() === "true" || is_admin === "1" || is_admin.toLowerCase() === "admin";
  } else if (typeof is_admin === "number") {
    is_admin = is_admin === 1;
  }

  if (typeof is_admin !== "boolean") {
    return res.status(400).json({ error: "is_admin boolean or valid role is required" });
  }

  // Prevent admin from revoking themselves or the master phone
  const userCheck = await pool.query("SELECT id, phone, name FROM users WHERE id = $1", [id]);
  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  const targetUser = userCheck.rows[0];

  // Prevent revoking primary system admin
  if (isAdminPhone(targetUser.phone) && !is_admin) {
    return res.status(400).json({ error: "Primary system admin phone 6382757532 cannot have admin revoked." });
  }

  // Prevent currently logged-in admin from accidentally demoting themselves
  if (req.user && String(req.user.id) === String(targetUser.id) && !is_admin) {
    return res.status(400).json({ error: "You cannot revoke admin privileges from your own account." });
  }

  const result = await pool.query(
    "UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, name, email, phone, team_name, village_name, COALESCE(is_admin, false) AS is_admin",
    [is_admin, id]
  );

  console.log(`👑 [Admin Controller] Admin ${req.user?.name || "System"} changed role of ${targetUser.name} (ID: ${id}) to ${is_admin ? "ADMIN" : "STANDARD USER"}`);

  res.json({
    message: `User role updated to ${is_admin ? "Admin" : "Standard User"}`,
    user: result.rows[0]
  });
});

module.exports = {
  getAdminStats,
  getAdminUsers,
  createAdminUser,
  updateUserRole
};
