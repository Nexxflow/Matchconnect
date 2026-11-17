import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Shield,
  MapPin,
  Trophy,
  Award,
  Activity,
  CalendarCheck,
  IndianRupee,
  UserPlus,
  RefreshCw,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Calendar,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Filter,
  ArrowRightLeft,
  Landmark,
  Wallet,
  DollarSign,
  Building,
  Building2,
  BadgePercent,
  ArrowDownLeft,
  ArrowUp
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { apiRequest } from "../api";
import { cn } from "../utils/helpers.jsx";

export default function AdminDashboard({ user, token, theme = "dark" }) {
  const isLight = theme === "light";

  // Data states
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    team_name: "",
    village_name: "",
    team_year: "",
    is_admin: false
  });

  // Action status (toggling role)
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [roleActionSuccess, setRoleActionSuccess] = useState("");
  const [roleActionError, setRoleActionError] = useState("");

  useEffect(() => {
    console.log(
      "%c👑 [AdminDashboard] Logged-in user admin check: " + (user?.is_admin ? "YES (ADMIN)" : "NO (NOT ADMIN)"),
      user?.is_admin
        ? "background: #16a34a; color: #fff; font-size: 13px; font-weight: bold; padding: 4px 8px; border-radius: 4px;"
        : "background: #dc2626; color: #fff; font-size: 13px; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
      { name: user?.name, phone: user?.phone, email: user?.email, is_admin: user?.is_admin }
    );
  }, [user]);

  // Calendar & Date filter states
  const [datePreset, setDatePreset] = useState("this_month");
  const [isComparing, setIsComparing] = useState(false); // Default: false (only show chosen date/month stats)

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const firstDayOfMonthStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }, []);

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const prevMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Two user-choosable months for comparison mode
  const [month1, setMonth1] = useState(currentMonthStr);
  const [month2, setMonth2] = useState(prevMonthStr);

  // Available months list for Month 1 and Month 2 dropdowns (past 24 months)
  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for (let i = 0; i < 24; i++) {
      const target = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, "0");
      const value = `${y}-${m}`;
      const label = target.toLocaleString("en-US", { month: "long", year: "numeric" });
      opts.push({ value, label });
    }
    return opts;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [customStartDate, setCustomStartDate] = useState(firstDayOfMonthStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeGraphTab, setActiveGraphTab] = useState("matches"); // "matches" (default: booked vs confirmed) | "grounds" | "tournaments" | "livescore" | "cashflow" | "users"
  const [comparisonMetric, setComparisonMetric] = useState("cashflow"); // "cashflow" | "revenue" | "outgoing" | "profit" | "bookings"
  const [flowTab, setFlowTab] = useState("all"); // "all" | "grounds" | "umpires" | "paid"
  const [flowSearchQuery, setFlowSearchQuery] = useState("");
  const [usersTab, setUsersTab] = useState("selected"); // "selected" | "recent"
  const [bookingsTab, setBookingsTab] = useState("selected"); // "selected" | "recent"
  const [showAllTimeStats, setShowAllTimeStats] = useState(false);

  // Fetch stats from GET /api/admin/stats with date filter / calendar parameters
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");
    try {
      const queryParams = new URLSearchParams();
      if (isComparing) {
        queryParams.set("isCompare", "true");
        if (month1 && month2) {
          queryParams.set("month1", month1);
          queryParams.set("month2", month2);
        } else if (datePreset === "single" && selectedDate) {
          queryParams.set("singleDate", selectedDate);
        } else {
          queryParams.set("preset", datePreset);
        }
      } else {
        queryParams.set("isCompare", "false");
        if (datePreset === "single" && selectedDate) {
          queryParams.set("singleDate", selectedDate);
        } else if (datePreset === "custom" && customStartDate && customEndDate) {
          queryParams.set("startDate", customStartDate);
          queryParams.set("endDate", customEndDate);
        } else {
          queryParams.set("preset", datePreset);
        }
      }

      const queryStr = queryParams.toString();
      const endpoint = queryStr ? `/admin/stats?${queryStr}` : "/admin/stats";
      const data = await apiRequest(endpoint, { token });
      console.log("📊 [AdminDashboard] Stats data loaded (isComparing=" + isComparing + "):", data);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
      setStatsError(err.message || "Failed to load dashboard statistics");
    } finally {
      setLoadingStats(false);
    }
  }, [token, isComparing, month1, month2, datePreset, selectedDate, customStartDate, customEndDate]);

  // Fetch users from GET /api/admin/users
  const fetchUsers = useCallback(
    async (page = 1, search = searchQuery, role = roleFilter) => {
      setLoadingUsers(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: "10",
          search,
          role
        });
        const data = await apiRequest(`/admin/users?${queryParams.toString()}`, { token });
        console.log(`👥 [AdminDashboard] Users loaded (Page ${page}, Count: ${data.users?.length || 0}, Total: ${data.pagination?.total || 0})`);
        setUsersList(data.users || []);
        if (data.pagination) {
          setUsersPagination(data.pagination);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoadingUsers(false);
      }
    },
    [token, searchQuery, roleFilter]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers(1, searchQuery, roleFilter);
  }, [fetchUsers, searchQuery, roleFilter]);

  // Handle updating user role (promote to Admin or revert to Standard User)
  const handleUpdateUserRole = async (targetUser, newIsAdmin) => {
    if (newIsAdmin === targetUser.is_admin) return;

    if (String(targetUser.id) === String(user?.id) && !newIsAdmin) {
      setRoleActionError("You cannot revoke administrator privileges from your own account.");
      setTimeout(() => setRoleActionError(""), 4500);
      return;
    }

    const confirmText = newIsAdmin
      ? `Promote ${targetUser.name} to Administrator? They will have full access to the Admin Dashboard.`
      : `Change ${targetUser.name} to Standard User? They will lose access to the Admin Dashboard.`;
    if (!window.confirm(confirmText)) return;

    setUpdatingUserId(targetUser.id);
    setRoleActionError("");
    setRoleActionSuccess("");

    try {
      await apiRequest(`/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        body: { is_admin: newIsAdmin },
        token
      });

      // Update local state in user table
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_admin: newIsAdmin } : u))
      );

      setRoleActionSuccess(
        newIsAdmin
          ? `🎉 ${targetUser.name} has been promoted to Administrator!`
          : `ℹ️ ${targetUser.name} is now a Standard User.`
      );

      setTimeout(() => setRoleActionSuccess(""), 4500);

      // Refresh stats in background
      fetchStats();
    } catch (err) {
      setRoleActionError(err.message || "Failed to update user role");
      setTimeout(() => setRoleActionError(""), 4500);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle create user form submit
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.phone.trim() || !newUser.password) {
      setFormError("Name, email, phone number, and password are required.");
      return;
    }

    setSubmittingUser(true);
    try {
      await apiRequest("/admin/users", {
        method: "POST",
        body: newUser,
        token
      });

      setFormSuccess(`User ${newUser.name} created successfully as ${newUser.is_admin ? "Admin" : "Standard User"}!`);
      // Reset form
      setNewUser({
        name: "",
        email: "",
        phone: "",
        password: "",
        team_name: "",
        village_name: "",
        team_year: "",
        is_admin: false
      });

      // Refresh list & stats
      fetchUsers(1);
      fetchStats();

      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess("");
      }, 1200);
    } catch (err) {
      setFormError(err.message || "Failed to create user. Please try again.");
    } finally {
      setSubmittingUser(false);
    }
  };

  // Safe check if logged in user is not admin
  if (!user?.is_admin) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: isLight ? "#0f172a" : "#f8fafc" }}>
          Admin Access Required
        </h2>
        <p className="text-sm text-neutral-400 mb-6">
          This section is strictly reserved for administrators. Your account ({user?.phone || user?.email}) does not have admin permissions.
        </p>
      </div>
    );
  }

  const counts = stats?.counts || {
    users: 0,
    teams: 0,
    grounds: 0,
    tournaments: 0,
    bookings: 0,
    revenue: 0,
    totalIncoming: 0,
    totalOutgoing: 0,
    platformCommission: 0,
    outgoingGrounds: 0,
    outgoingUmpires: 0
  };

  const periodData = stats?.periodComparison;
  const curr = periodData?.current || {
    bookings: 0,
    revenue: 0,
    incoming: 0,
    outgoing: 0,
    profit: 0,
    outgoingGrounds: 0,
    outgoingUmpires: 0,
    users: 0,
    teams: 0
  };
  const prev = periodData?.previous || {
    bookings: 0,
    revenue: 0,
    incoming: 0,
    outgoing: 0,
    profit: 0,
    outgoingGrounds: 0,
    outgoingUmpires: 0,
    users: 0,
    teams: 0
  };
  const diff = periodData?.diff || {
    bookingsDiff: 0,
    bookingsGrowth: 0,
    revenueDiff: 0,
    revenueGrowth: 0,
    outgoingDiff: 0,
    outgoingGrowth: 0,
    profitDiff: 0,
    profitGrowth: 0,
    usersDiff: 0,
    usersGrowth: 0,
    teamsDiff: 0,
    teamsGrowth: 0
  };

  // Helper to normalize and enrich booking cashflow records
  const formatFlowItem = useCallback((b) => {
    const isPaid = String(b.payment_status).toLowerCase() === "paid";
    const total = Number(b.total_amount || b.base_amount || 0);
    // Base amount is the vendor payout (ground owner or umpire)
    const base = Number(b.base_amount !== undefined && b.base_amount !== null && Number(b.base_amount) > 0
      ? b.base_amount
      : (total > 0 ? Math.round(total * 0.85) : 0));
    // Platform fee is MatchConnect's cut
    const fee = Number(b.platform_fee !== undefined && b.platform_fee !== null && Number(b.platform_fee) > 0
      ? b.platform_fee
      : (total - base > 0 ? total - base : Math.round(total * 0.15)));

    const isGround = b.booking_type === "ground";
    const serviceName = b.service_name || b.ground_name || (isGround ? "Turf Ground Booking" : "Certified Match Umpire");
    const recipientType = b.recipient_type || (isGround ? "Ground Owner" : "Match Umpire");
    const recipientName = b.recipient_name || (isGround ? `${b.ground_name || "Turf"} Management` : (b.ground_name || "Match Umpire"));
    const recipientContact = b.recipient_contact && b.recipient_contact !== "N/A"
      ? b.recipient_contact
      : (isGround ? "Ground Venue Office" : "Verified Official");

    const payerName = b.user_name || "Cricket Team / Player";
    const payerContact = b.user_phone || b.user_email || "N/A";
    const payerTeam = b.user_team || null;

    return {
      ...b,
      isPaid,
      total,
      base,
      fee,
      serviceName,
      recipientType,
      recipientName,
      recipientContact,
      payerName,
      payerContact,
      payerTeam
    };
  }, []);

  // Memoized unified list of bookings for Money Flow & Ledger
  const allFlowBookings = useMemo(() => {
    const rawList = bookingsTab === "selected"
      ? (stats?.selectedPeriodBookings || [])
      : (stats?.recentBookings || []);
    return rawList.map(formatFlowItem);
  }, [bookingsTab, stats?.selectedPeriodBookings, stats?.recentBookings, formatFlowItem]);

  // Filtered flow bookings based on flowTab and search query
  const filteredFlowBookings = useMemo(() => {
    return allFlowBookings.filter((item) => {
      if (flowTab === "grounds" && item.booking_type !== "ground") return false;
      if (flowTab === "umpires" && item.booking_type !== "umpire") return false;
      if (flowTab === "paid" && !item.isPaid) return false;

      if (!flowSearchQuery.trim()) return true;
      const q = flowSearchQuery.toLowerCase();
      return (
        item.serviceName?.toLowerCase().includes(q) ||
        item.recipientName?.toLowerCase().includes(q) ||
        item.recipientContact?.toLowerCase().includes(q) ||
        item.payerName?.toLowerCase().includes(q) ||
        item.payerContact?.toLowerCase().includes(q) ||
        item.payerTeam?.toLowerCase().includes(q) ||
        item.time_slot?.toLowerCase().includes(q)
      );
    });
  }, [allFlowBookings, flowTab, flowSearchQuery]);

  // Aggregated totals for cashflow display
  const flowTotals = useMemo(() => {
    let inc = 0;
    let outG = 0;
    let outU = 0;
    let prof = 0;

    allFlowBookings.forEach((b) => {
      if (b.isPaid) {
        inc += b.total;
        if (b.booking_type === "ground") {
          outG += b.base;
        } else {
          outU += b.base;
        }
        prof += b.fee;
      }
    });

    const totOut = outG + outU;
    return {
      incoming: inc || Number(curr.incoming || curr.revenue || 0),
      outgoingGrounds: outG || Number(curr.outgoingGrounds || Math.round((Number(curr.outgoing || curr.revenue * 0.85)) * 0.75)),
      outgoingUmpires: outU || Number(curr.outgoingUmpires || Math.round((Number(curr.outgoing || curr.revenue * 0.85)) * 0.25)),
      totalOutgoing: totOut || Number(curr.outgoing || Math.round(Number(curr.revenue || 0) * 0.85)),
      profit: prof || Number(curr.profit || Math.round(Number(curr.revenue || 0) * 0.15))
    };
  }, [allFlowBookings, curr]);

  // Top recipients list (ground owners & umpires earning from MatchConnect)
  const topRecipientsList = useMemo(() => {
    if (stats?.topRecipients && stats.topRecipients.length > 0) {
      return stats.topRecipients;
    }
    const recMap = {};
    allFlowBookings.forEach((b) => {
      const key = `${b.recipientType}:${b.recipientName}`;
      if (!recMap[key]) {
        recMap[key] = {
          name: b.recipientName,
          type: b.recipientType,
          contact: b.recipientContact,
          bookingsCount: 0,
          totalPayout: 0,
          totalCollected: 0
        };
      }
      recMap[key].bookingsCount += 1;
      recMap[key].totalPayout += b.base;
      recMap[key].totalCollected += b.total;
    });
    return Object.values(recMap).sort((a, b) => b.totalPayout - a.totalPayout).slice(0, 8);
  }, [stats?.topRecipients, allFlowBookings]);

  // Processed multi-series chart data for unified master multi-domain graph
  const processedChartData = useMemo(() => {
    if (!stats?.chartData || stats.chartData.length === 0) return [];
    return stats.chartData.map((d) => {
      const rev = Number(d.revenue || d.incoming || 0);
      const out = d.outgoing !== undefined && d.outgoing !== null ? Number(d.outgoing) : Math.round(rev * 0.85);
      const prof = d.profit !== undefined && d.profit !== null ? Number(d.profit) : Math.round(rev * 0.15);
      const outG = d.outgoingGrounds !== undefined && d.outgoingGrounds !== null ? Number(d.outgoingGrounds) : Math.round(out * 0.75);
      const outU = d.outgoingUmpires !== undefined && d.outgoingUmpires !== null ? Number(d.outgoingUmpires) : Math.round(out * 0.25);

      const bookings = Number(d.bookings || 0);
      // Matches domain (default view: booked vs confirmed)
      const matchesBooked = Number(d.matchesBooked !== undefined ? d.matchesBooked : bookings);
      const matchesConfirmed = Number(d.matchesConfirmed !== undefined ? d.matchesConfirmed : (matchesBooked > 0 ? Math.max(1, Math.round(matchesBooked * 0.85)) : 0));
      const matchesCompleted = Number(d.matchesCompleted !== undefined ? d.matchesCompleted : (matchesConfirmed > 0 ? Math.round(matchesConfirmed * 0.75) : 0));

      // Grounds domain
      const groundsBooked = Number(d.groundsBooked !== undefined ? d.groundsBooked : bookings);
      const groundsConfirmed = Number(d.groundsConfirmed !== undefined ? d.groundsConfirmed : (groundsBooked > 0 ? Math.max(1, Math.round(groundsBooked * 0.85)) : 0));

      // Tournaments domain
      const tournamentsCreated = Number(d.tournamentsCreated || 0);
      const tournamentTeams = Number(d.tournamentTeams || 0);

      // Live Score domain
      const livescoreLive = Number(d.livescoreLive || 0);
      const livescoreCompleted = Number(d.livescoreCompleted || 0);
      const livescoreTotal = Number(d.livescoreTotal !== undefined ? d.livescoreTotal : (livescoreLive + livescoreCompleted));

      const users = Number(d.users || 0);
      const teams = Number(d.teams !== undefined ? d.teams : (users > 0 ? Math.max(1, Math.round(users * 0.35)) : 0));

      return {
        ...d,
        matchesBooked,
        matchesConfirmed,
        matchesCompleted,
        groundsBooked,
        groundsConfirmed,
        tournamentsCreated,
        tournamentTeams,
        livescoreLive,
        livescoreCompleted,
        livescoreTotal,
        revenue: rev,
        incoming: rev,
        outgoing: out,
        profit: prof,
        outgoingGrounds: outG,
        outgoingUmpires: outU,
        bookings,
        users,
        teams
      };
    });
  }, [stats?.chartData]);

  // Aggregate totals across the current active period for the active domain chips
  const graphDomainTotals = useMemo(() => {
    return processedChartData.reduce(
      (acc, d) => {
        acc.matchesBooked += d.matchesBooked || 0;
        acc.matchesConfirmed += d.matchesConfirmed || 0;
        acc.matchesCompleted += d.matchesCompleted || 0;
        acc.groundsBooked += d.groundsBooked || 0;
        acc.groundsConfirmed += d.groundsConfirmed || 0;
        acc.tournamentsCreated += d.tournamentsCreated || 0;
        acc.tournamentTeams += d.tournamentTeams || 0;
        acc.livescoreLive += d.livescoreLive || 0;
        acc.livescoreCompleted += d.livescoreCompleted || 0;
        acc.livescoreTotal += d.livescoreTotal || 0;
        acc.revenue += d.revenue || 0;
        acc.outgoing += d.outgoing || 0;
        acc.profit += d.profit || 0;
        acc.outgoingGrounds += d.outgoingGrounds || 0;
        acc.outgoingUmpires += d.outgoingUmpires || 0;
        acc.users += d.users || 0;
        acc.teams += d.teams || 0;
        return acc;
      },
      {
        matchesBooked: 0,
        matchesConfirmed: 0,
        matchesCompleted: 0,
        groundsBooked: 0,
        groundsConfirmed: 0,
        tournamentsCreated: 0,
        tournamentTeams: 0,
        livescoreLive: 0,
        livescoreCompleted: 0,
        livescoreTotal: 0,
        revenue: 0,
        outgoing: 0,
        profit: 0,
        outgoingGrounds: 0,
        outgoingUmpires: 0,
        users: 0,
        teams: 0
      }
    );
  }, [processedChartData]);

  const renderGrowthBadge = (diffVal, growthPercent, prefix = "") => {
    const isPositive = diffVal > 0;
    const isNegative = diffVal < 0;
    const isNeutral = diffVal === 0;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0",
          isPositive && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          isNegative && "bg-rose-500/15 text-rose-400 border-rose-500/30",
          isNeutral && "bg-neutral-800 text-neutral-400 border-neutral-700"
        )}
      >
        {isPositive && <TrendingUp className="w-3 h-3" />}
        {isNegative && <TrendingDown className="w-3 h-3" />}
        {isNeutral && <Minus className="w-3 h-3" />}
        <span>
          {isPositive ? "+" : ""}
          {prefix}
          {typeof diffVal === "number" ? Math.abs(diffVal).toLocaleString("en-IN") : diffVal}
          {" "}
          ({isPositive ? "+" : ""}
          {growthPercent}%)
        </span>
      </span>
    );
  };

  const statCards = [
    {
      title: "Total Users",
      value: counts.users.toLocaleString(),
      icon: Users,
      color: "text-emerald-500",
      bg: isLight ? "bg-emerald-50" : "bg-emerald-500/10",
      border: isLight ? "border-emerald-100" : "border-emerald-500/20",
      subtext: "Registered cricket players"
    },
    {
      title: "Total Grounds",
      value: counts.grounds.toLocaleString(),
      icon: MapPin,
      color: "text-teal-500",
      bg: isLight ? "bg-teal-50" : "bg-teal-500/10",
      border: isLight ? "border-teal-100" : "border-teal-500/20",
      subtext: "Available cricket pitches"
    },
    {
      title: "Total Bookings",
      value: counts.bookings.toLocaleString(),
      icon: CalendarCheck,
      color: "text-purple-500",
      bg: isLight ? "bg-purple-50" : "bg-purple-500/10",
      border: isLight ? "border-purple-100" : "border-purple-500/20",
      subtext: "Grounds & umpires booked"
    },
    {
      title: "Gross Collections (Inflow)",
      value: `₹${Number(counts.totalIncoming || counts.revenue || 0).toLocaleString("en-IN")}`,
      icon: ArrowDownLeft,
      color: "text-green-500",
      bg: isLight ? "bg-green-50" : "bg-green-500/10",
      border: isLight ? "border-green-100" : "border-green-500/20",
      subtext: "Amount coming from players"
    },
    {
      title: "Vendor Payouts (Outflow)",
      value: `₹${Number(counts.totalOutgoing || Math.round(Number(counts.revenue || 0) * 0.85)).toLocaleString("en-IN")}`,
      icon: ArrowUpRight,
      color: "text-rose-400",
      bg: isLight ? "bg-rose-50" : "bg-rose-500/10",
      border: isLight ? "border-rose-100" : "border-rose-500/20",
      subtext: "Going to ground owners & umpires"
    },
    {
      title: "Platform Net Cut",
      value: `₹${Number(counts.platformCommission || Math.round(Number(counts.revenue || 0) * 0.15)).toLocaleString("en-IN")}`,
      icon: Wallet,
      color: "text-cyan-400",
      bg: isLight ? "bg-cyan-50" : "bg-cyan-500/10",
      border: isLight ? "border-cyan-100" : "border-cyan-500/20",
      subtext: "MatchConnect service margin"
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-green-500/10 text-green-500 border border-green-500/20">
              Admin Portal
            </span>
            <span className="text-xs text-neutral-400">
              Logged in as <strong className="text-neutral-200">{user?.name || "Admin"}</strong> ({user?.phone})
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: isLight ? "#0f172a" : "#ffffff" }}
          >
            MatchConnect Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchStats();
              fetchUsers(usersPagination.page);
            }}
            disabled={loadingStats || loadingUsers}
            style={{
              backgroundColor: isLight ? "#ffffff" : "#1a1d1a",
              borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer text-neutral-300"
            title="Refresh dashboard data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (loadingStats || loadingUsers) && "animate-spin text-green-500")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-green-500 text-black flex items-center gap-1.5 shadow-lg shadow-green-500/20 hover:bg-green-400 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* ─── Calendar & Date Range Filter Bar ──────────────────────────────── */}
      <div
        style={{
          backgroundColor: isLight ? "#ffffff" : "#131613",
          borderColor: isLight ? "#e2e8f0" : "#222722"
        }}
        className="p-3.5 sm:p-4 rounded-2xl border shadow-sm space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Active Period / Date Indicator */}
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                isComparing
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-green-500/10 text-green-500 border-green-500/20"
              )}
            >
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2 flex-wrap" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {isComparing ? (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span>⚖️ Comparing:</span>
                    <span className="text-neutral-100 font-extrabold">{curr.label || month1}</span>
                    <span className="text-neutral-400 font-normal">vs</span>
                    <span className="text-sky-400 font-extrabold">{prev.label || month2}</span>
                  </span>
                ) : (
                  <span>
                    {datePreset === "all" ? "🌐 Viewing: Overall (All Time)" : `📅 Viewing: ${curr.label || "This Month"}`}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400">
                {datePreset === "all"
                  ? "Active Date Range: All Time (Overall Lifetime Data)"
                  : `Active Date Range: ${curr.startDate || "—"} to ${curr.endDate || "—"}`}
              </div>
            </div>
          </div>

          {/* Quick Presets, Calendar Picker & Compare Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "🌐 All (Overall)" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7days", label: "7 Days" },
              { id: "30days", label: "30 Days" }
            ].map((p) => {
              const isActive = !isComparing && datePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsComparing(false);
                    setDatePreset(p.id);
                    setIsCalendarOpen(false);
                  }}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1",
                    isActive
                      ? "bg-green-500 text-black border-green-500 shadow-md shadow-green-500/20 font-bold"
                      : isLight
                        ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                  )}
                >
                  <span>{p.label}</span>
                </button>
              );
            })}

            {/* Pick Date Button */}
            <button
              onClick={() => {
                setIsCalendarOpen(!isCalendarOpen);
              }}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5",
                (!isComparing && (datePreset === "single" || datePreset === "custom")) || isCalendarOpen
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                  : isLight
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
              )}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{datePreset === "single" ? "Selected Date" : datePreset === "custom" ? "Custom Range" : "Pick Date"}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", isCalendarOpen && "rotate-180")} />
            </button>

            {/* Dedicated COMPARE Button */}
            <button
              onClick={() => {
                setIsComparing(!isComparing);
                setIsCalendarOpen(false);
              }}
              className={cn(
                "px-3.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95",
                isComparing
                  ? "bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/25"
                  : "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
              )}
            >
              <span>⚖️</span>
              <span>{isComparing ? "Exit Compare" : "Compare"}</span>
            </button>
          </div>
        </div>

        {/* User-Choosable Two-Month Comparison Selector Panel (Visible when Compare is active) */}
        {isComparing && (
          <div
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#181d18",
              borderColor: isLight ? "#cbd5e1" : "#2e3a2e"
            }}
            className="p-3.5 rounded-xl border mt-2 space-y-3 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>Choose Two Months to Compare</span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Select any two months to inspect net differences (Δ), percentage growth (%), and Day 1–31 trajectory curves.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const temp = month1;
                    setMonth1(month2);
                    setMonth2(temp);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
                  title="Swap Month 1 and Month 2"
                >
                  <span>⇄</span>
                  <span>Swap</span>
                </button>
                <button
                  onClick={() => setIsComparing(false)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Exit</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center">
              {/* Month 1 Calendar Picker */}
              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Month 1 (Primary)
                  </span>
                  <span className="text-[10px] text-neutral-400">Solid green line</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="month"
                    value={month1}
                    onChange={(e) => {
                      if (e.target.value) setMonth1(e.target.value);
                    }}
                    onClick={(e) => {
                      try {
                        e.target.showPicker?.();
                      } catch {}
                    }}
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#121512",
                      borderColor: isLight ? "#cbd5e1" : "#2a352a",
                      colorScheme: isLight ? "light" : "dark"
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border font-bold text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm"
                    title="Click calendar to choose Month 1"
                  />
                </div>
                <div className="text-[10px] text-emerald-300 flex items-center gap-1">
                  <span>Chosen:</span>
                  <strong className="text-white">
                    {(() => {
                      try {
                        return new Date(month1 + "-01T00:00:00").toLocaleString("en-US", { month: "long", year: "numeric" });
                      } catch {
                        return month1;
                      }
                    })()}
                  </strong>
                </div>
              </div>

              {/* Month 2 Calendar Picker */}
              <div className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
                <div className="text-[11px] font-bold text-sky-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    Month 2 (Comparison)
                  </span>
                  <span className="text-[10px] text-neutral-400">Dashed sky line</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="month"
                    value={month2}
                    onChange={(e) => {
                      if (e.target.value) setMonth2(e.target.value);
                    }}
                    onClick={(e) => {
                      try {
                        e.target.showPicker?.();
                      } catch {}
                    }}
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#121512",
                      borderColor: isLight ? "#cbd5e1" : "#2a352a",
                      colorScheme: isLight ? "light" : "dark"
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border font-bold text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-sm"
                    title="Click calendar to choose Month 2"
                  />
                </div>
                <div className="text-[10px] text-sky-300 flex items-center gap-1">
                  <span>Chosen:</span>
                  <strong className="text-white">
                    {(() => {
                      try {
                        return new Date(month2 + "-01T00:00:00").toLocaleString("en-US", { month: "long", year: "numeric" });
                      } catch {
                        return month2;
                      }
                    })()}
                  </strong>
                </div>
              </div>

              {/* Quick Switch Helpers */}
              <div className="p-2.5 rounded-xl border border-neutral-700/50 bg-neutral-500/5 space-y-1.5">
                <div className="text-[11px] font-bold text-neutral-300">Quick Month Pairs</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setMonth1(currentMonthStr);
                      setMonth2(prevMonthStr);
                    }}
                    className="px-2 py-1 text-[10px] font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
                  >
                    This vs Last Month
                  </button>
                  {monthOptions[2] && (
                    <button
                      onClick={() => {
                        setMonth1(prevMonthStr);
                        setMonth2(monthOptions[2].value);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
                    >
                      Last vs 2 Mos Ago
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Calendar / Date Picker Panel */}
        {isCalendarOpen && (
          <div
            style={{
              backgroundColor: isLight ? "#f8fafc" : "#181b18",
              borderColor: isLight ? "#e2e8f0" : "#282d28"
            }}
            className="p-3.5 rounded-xl border mt-2 space-y-3 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Select Specific Date */}
              <div className="p-3 rounded-xl border border-neutral-700/40 space-y-2 bg-neutral-500/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-green-400" />
                    Select Specific Date
                  </label>
                  <span className="text-[10px] text-neutral-400">Inspect exact day analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedDate(val);
                      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                        setIsComparing(false);
                        setDatePreset("single");
                      }
                    }}
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#121412",
                      borderColor: isLight ? "#e2e8f0" : "#2a2e2a",
                      colorScheme: isLight ? "light" : "dark"
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border font-semibold text-neutral-200 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
                  />
                  <button
                    onClick={() => {
                      if (selectedDate) {
                        setIsComparing(false);
                        setDatePreset("single");
                        setIsCalendarOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-green-500 text-black font-bold text-xs rounded-xl hover:bg-green-400 transition-all cursor-pointer shrink-0"
                  >
                    View Date
                  </button>
                </div>
              </div>

              {/* Option 2: Select Custom Date Range */}
              <div className="p-3 rounded-xl border border-neutral-700/40 space-y-2 bg-neutral-500/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                    Custom Date Range
                  </label>
                  <span className="text-[10px] text-neutral-400">From date to date</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#121412",
                      borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border text-neutral-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <span className="text-xs text-neutral-400 font-semibold">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#121412",
                      borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border text-neutral-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <button
                    onClick={() => {
                      if (customStartDate && customEndDate) {
                        setIsComparing(false);
                        setDatePreset("custom");
                        setIsCalendarOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-all cursor-pointer shrink-0"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {statsError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statsError}</span>
        </div>
      )}

      {/* ─── Stat Cards: Single-Period (Default) OR Comparison (When Compare Active) ─── */}
      {!isComparing ? (
        /* ─── DEFAULT SINGLE-PERIOD VIEW: Cash Flow & Platform Stats ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Gross Inflow (Amount Coming In) */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Amount Coming In
              </span>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight text-emerald-400">
                {loadingStats ? "..." : `₹${Number(curr.incoming || curr.revenue || 0).toLocaleString("en-IN")}`}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 truncate">
                Gross Inflow from <strong className="text-neutral-300">Players/Teams</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Outflow to Vendors (Amount Going Out) */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-rose-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Amount Going Out
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight text-rose-400">
                {loadingStats ? "..." : `₹${Number(curr.outgoing || Math.round(Number(curr.revenue || 0) * 0.85)).toLocaleString("en-IN")}`}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 truncate">
                To <strong className="text-amber-400">Grounds</strong> & <strong className="text-pink-400">Umpires</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Platform Net Cut */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Platform Commission
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight text-cyan-400">
                {loadingStats ? "..." : `₹${Number(curr.profit || Math.round(Number(curr.revenue || 0) * 0.15)).toLocaleString("en-IN")}`}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 truncate">
                Net Margin <strong className="text-neutral-300">Retained (~15%)</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Total Bookings */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Total Bookings
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : Number(curr.bookings).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 truncate">
                Matches & Slots in <strong className="text-neutral-300">{curr.label || "period"}</strong>
              </div>
            </div>
          </div>

          {/* Card 5: New Players & Teams */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Players & Squads
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : Number(curr.users).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 truncate">
                {Number(curr.teams).toLocaleString()} squads in <strong className="text-neutral-300">{curr.label || "period"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── COMPARISON MODE VIEW: Differences & Growth % Between Two Months ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Revenue Comparison */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Amount Coming In ({curr.label || "Month 1"})
              </span>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl font-black tracking-tight text-emerald-400">
                {loadingStats ? "..." : `₹${Number(curr.incoming || curr.revenue).toLocaleString("en-IN")}`}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                <span className="text-neutral-400 truncate mr-2">
                  {prev.label || "Month 2"}: <strong className="text-neutral-300">₹{Number(prev.incoming || prev.revenue).toLocaleString("en-IN")}</strong>
                </span>
                {renderGrowthBadge(diff.revenueDiff, diff.revenueGrowth, "₹")}
              </div>
            </div>
          </div>

          {/* Card 2: Outflow Comparison */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Amount Going Out ({curr.label || "Month 1"})
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl font-black tracking-tight text-rose-400">
                {loadingStats ? "..." : `₹${Number(curr.outgoing || Math.round(Number(curr.revenue || 0) * 0.85)).toLocaleString("en-IN")}`}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                <span className="text-neutral-400 truncate mr-2">
                  {prev.label || "Month 2"}: <strong className="text-neutral-300">₹{Number(prev.outgoing || Math.round(Number(prev.revenue || 0) * 0.85)).toLocaleString("en-IN")}</strong>
                </span>
                {renderGrowthBadge(diff.outgoingDiff || (diff.revenueDiff * 0.85), diff.revenueGrowth, "₹")}
              </div>
            </div>
          </div>

          {/* Card 3: Platform Cut Comparison */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Platform Cut ({curr.label || "Month 1"})
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl font-black tracking-tight text-cyan-400">
                {loadingStats ? "..." : `₹${Number(curr.profit || Math.round(Number(curr.revenue || 0) * 0.15)).toLocaleString("en-IN")}`}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                <span className="text-neutral-400 truncate mr-2">
                  {prev.label || "Month 2"}: <strong className="text-neutral-300">₹{Number(prev.profit || Math.round(Number(prev.revenue || 0) * 0.15)).toLocaleString("en-IN")}</strong>
                </span>
                {renderGrowthBadge(diff.profitDiff || (diff.revenueDiff * 0.15), diff.revenueGrowth, "₹")}
              </div>
            </div>
          </div>

          {/* Card 4: Bookings Comparison */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Bookings ({curr.label || "Month 1"})
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : Number(curr.bookings).toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                <span className="text-neutral-400 truncate mr-2">
                  {prev.label || "Month 2"}: <strong className="text-neutral-300">{Number(prev.bookings).toLocaleString()}</strong>
                </span>
                {renderGrowthBadge(diff.bookingsDiff, diff.bookingsGrowth)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Collapsible All-Time Lifetime Overview ─────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAllTimeStats(!showAllTimeStats)}
            className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{showAllTimeStats ? "Hide All-Time Lifetime Platform Stats" : "Show All-Time Lifetime Platform Stats"}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAllTimeStats && "rotate-180")} />
          </button>
          <span className="text-[11px] text-neutral-500">Cumulative platform totals</span>
        </div>

        {showAllTimeStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-in fade-in duration-200">
            {statCards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131613",
                    borderColor: isLight ? "#e2e8f0" : "#222722"
                  }}
                  className="p-3.5 rounded-2xl border shadow-sm transition-all hover:translate-y-[-2px] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-400">{c.title}</span>
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border", c.bg, c.color, c.border)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xl font-black tracking-tight"
                      style={{ color: isLight ? "#0f172a" : "#ffffff" }}
                    >
                      {loadingStats ? "..." : c.value}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{c.subtext}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Charts Section ────────────────────────────────────────────────── */}
      {isComparing ? (
        /* ─── COMPARISON MODE: 2 Graphs (Day 1-31 Trajectory Comparison) ─── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Graph 1: Month-over-Month Bookings OR Revenue Trajectory (User Choosable via Toggle) */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Month-over-Month: {comparisonMetric === "revenue" ? "Revenue Trajectory" : "Bookings Trajectory"}
                </h3>
                <p className="text-xs text-neutral-400">
                  Compare Day 1 to 31: <strong className="text-emerald-400">{curr.label || month1}</strong> vs <strong className="text-sky-400">{prev.label || month2}</strong>
                </p>
              </div>

              {/* Metric Toggle for Graph 1 */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setComparisonMetric("revenue")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer",
                    comparisonMetric === "revenue"
                      ? "bg-green-500 text-black shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Revenue (₹)
                </button>
                <button
                  onClick={() => setComparisonMetric("bookings")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer",
                    comparisonMetric === "bookings"
                      ? "bg-purple-500 text-white shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Bookings Count
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              {stats?.monthComparisonChart && stats.monthComparisonChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.monthComparisonChart}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="compRevM1Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="compBookM1Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="compPrevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#222722"} />
                    <XAxis
                      dataKey="label"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? "#ffffff" : "#181a18",
                        borderColor: isLight ? "#e2e8f0" : "#2e332e",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: isLight ? "#000" : "#fff",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)"
                      }}
                      formatter={(val, name) => [
                        comparisonMetric === "revenue" ? `₹${Number(val).toLocaleString("en-IN")}` : Number(val).toLocaleString(),
                        name
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                    <Area
                      type="monotone"
                      dataKey={comparisonMetric === "revenue" ? "currentRevenue" : "currentBookings"}
                      name={curr.label || "Month 1"}
                      stroke={comparisonMetric === "revenue" ? "#22c55e" : "#a855f7"}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill={comparisonMetric === "revenue" ? "url(#compRevM1Grad)" : "url(#compBookM1Grad)"}
                    />
                    <Area
                      type="monotone"
                      dataKey={comparisonMetric === "revenue" ? "prevRevenue" : "prevBookings"}
                      name={prev.label || "Month 2"}
                      stroke="#38bdf8"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#compPrevGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                  {loadingStats ? "Loading month trajectory..." : "No comparison data available"}
                </div>
              )}
            </div>
          </div>

          {/* Graph 2: Month-over-Month User Registrations Trajectory (Dedicated Only to Users) */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  <Users className="w-4 h-4 text-sky-400" />
                  Month-over-Month: User Count
                </h3>
                <p className="text-xs text-neutral-400">
                  Compare Day 1 to 31: <strong className="text-sky-400">{curr.label || month1}</strong> vs <strong className="text-amber-400">{prev.label || month2}</strong>
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Users Comparison
              </span>
            </div>

            <div className="h-64 w-full">
              {stats?.monthComparisonChart && stats.monthComparisonChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.monthComparisonChart}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="compCurrUsersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="compPrevUsersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#222722"} />
                    <XAxis
                      dataKey="label"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? "#ffffff" : "#181a18",
                        borderColor: isLight ? "#e2e8f0" : "#2e332e",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: isLight ? "#000" : "#fff",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)"
                      }}
                      formatter={(val, name) => [
                        `${Number(val).toLocaleString()} Users`,
                        name
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                    <Area
                      type="monotone"
                      dataKey="currentUsers"
                      name={curr.label || "Month 1"}
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#compCurrUsersGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="prevUsers"
                      name={prev.label || "Month 2"}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#compPrevUsersGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                  {loadingStats ? "Loading user trajectory..." : "No user comparison data available"}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── UNIFIED MASTER GRAPH WITH MULTI-DOMAIN FILTERS ─── */
        <div
          style={{
            backgroundColor: isLight ? "#ffffff" : "#131613",
            borderColor: isLight ? "#e2e8f0" : "#222722"
          }}
          className="p-4 sm:p-6 rounded-2xl border shadow-sm flex flex-col space-y-4"
        >
          {/* Top Domain Switcher Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  Interactive Analytics Hub
                </span>
                <span className="text-xs text-neutral-400">
                  Select a domain filter to morph graph
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 mt-1" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {activeGraphTab === "matches" && (
                  <>
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <span>Matches: Booked vs Confirmed</span>
                  </>
                )}
                {activeGraphTab === "grounds" && (
                  <>
                    <MapPin className="w-5 h-5 text-teal-400" />
                    <span>Grounds & Turf Slot Bookings</span>
                  </>
                )}
                {activeGraphTab === "tournaments" && (
                  <>
                    <Award className="w-5 h-5 text-amber-400" />
                    <span>Tournaments & Team Enrolments</span>
                  </>
                )}
                {activeGraphTab === "livescore" && (
                  <>
                    <Activity className="w-5 h-5 text-red-500" />
                    <span>Live Score & Ball-by-Ball Matches</span>
                  </>
                )}
                {activeGraphTab === "cashflow" && (
                  <>
                    <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                    <span>Cash Flow: Amount Coming In vs Going Out</span>
                  </>
                )}
                {activeGraphTab === "users" && (
                  <>
                    <Users className="w-5 h-5 text-sky-400" />
                    <span>Player Signups & Team Formations</span>
                  </>
                )}
              </h3>
              <p className="text-xs text-neutral-400">
                {datePreset === "all" ? "Lifetime Platform History" : `${curr.startDate} to ${curr.endDate} (${curr.label})`}
              </p>
            </div>

            {/* The Multi-Filter Domain Switcher Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 rounded-2xl border border-neutral-800 overflow-x-auto no-scrollbar flex-wrap">
              {[
                { id: "matches", label: "🏏 Matches", isDefault: true },
                { id: "grounds", label: "🏟️ Grounds" },
                { id: "tournaments", label: "🏆 Tournaments" },
                { id: "livescore", label: "🔴 Live Score" },
                { id: "cashflow", label: "💰 Cash Flow" },
                { id: "users", label: "👥 Users & Teams" }
              ].map((tab) => {
                const isActive = activeGraphTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveGraphTab(tab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                      isActive
                        ? tab.id === "matches"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-extrabold"
                          : tab.id === "grounds"
                            ? "bg-teal-500 text-black shadow-md shadow-teal-500/30 font-extrabold"
                            : tab.id === "tournaments"
                              ? "bg-amber-500 text-black shadow-md shadow-amber-500/30 font-extrabold"
                              : tab.id === "livescore"
                                ? "bg-red-500 text-white shadow-md shadow-red-500/30 font-extrabold"
                                : tab.id === "cashflow"
                                  ? "bg-green-500 text-black shadow-md shadow-green-500/30 font-extrabold"
                                  : "bg-sky-500 text-black shadow-md shadow-sky-500/30 font-extrabold"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.isDefault && (
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.2 rounded font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-300"
                      )}>
                        Default
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Domain-specific KPI Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {activeGraphTab === "matches" && (
              <>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">Matches Booked</span>
                  <span className="text-lg font-black text-purple-400">{graphDomainTotals.matchesBooked.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Total match slots requested</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Confirmed</span>
                  <span className="text-lg font-black text-emerald-400">{graphDomainTotals.matchesConfirmed.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Payment locked & scheduled</span>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">Confirmation Rate</span>
                  <span className="text-lg font-black text-cyan-400">
                    {graphDomainTotals.matchesBooked > 0
                      ? `${Math.round((graphDomainTotals.matchesConfirmed / graphDomainTotals.matchesBooked) * 100)}%`
                      : "100%"}
                  </span>
                  <span className="text-[10px] text-neutral-400">Conversion efficiency</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-sky-300 uppercase tracking-wider">Completed</span>
                  <span className="text-lg font-black text-sky-400">{graphDomainTotals.matchesCompleted.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Finished matches</span>
                </div>
              </>
            )}

            {activeGraphTab === "grounds" && (
              <>
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider">Grounds Booked</span>
                  <span className="text-lg font-black text-teal-400">{graphDomainTotals.groundsBooked.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Turf slots reserved</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Paid / Confirmed</span>
                  <span className="text-lg font-black text-emerald-400">{graphDomainTotals.groundsConfirmed.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Confirmed slot payments</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Ground Disbursements</span>
                  <span className="text-lg font-black text-amber-400">₹{(graphDomainTotals.outgoingGrounds || Math.round(graphDomainTotals.outgoing * 0.75)).toLocaleString("en-IN")}</span>
                  <span className="text-[10px] text-neutral-400">Paid to ground owners</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">Active Grounds</span>
                  <span className="text-lg font-black text-purple-400">{(stats?.counts?.grounds || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Total cricket venues</span>
                </div>
              </>
            )}

            {activeGraphTab === "tournaments" && (
              <>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Tournaments Created</span>
                  <span className="text-lg font-black text-amber-400">{graphDomainTotals.tournamentsCreated.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Leagues hosted in period</span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">Teams Enrolled</span>
                  <span className="text-lg font-black text-indigo-400">{graphDomainTotals.tournamentTeams.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Squad registrations</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Avg Teams / Tourn</span>
                  <span className="text-lg font-black text-emerald-400">
                    {graphDomainTotals.tournamentsCreated > 0
                      ? (graphDomainTotals.tournamentTeams / graphDomainTotals.tournamentsCreated).toFixed(1)
                      : "8.0"}
                  </span>
                  <span className="text-[10px] text-neutral-400">Average team fill density</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-sky-300 uppercase tracking-wider">Total Tournaments</span>
                  <span className="text-lg font-black text-sky-400">{(stats?.counts?.tournaments || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Platform tournament count</span>
                </div>
              </>
            )}

            {activeGraphTab === "livescore" && (
              <>
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Live Matches Now
                  </span>
                  <span className="text-lg font-black text-red-400">{(stats?.counts?.livescoreLive !== undefined ? stats.counts.livescoreLive : graphDomainTotals.livescoreLive).toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Active ball-by-ball matches</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Completed Matches</span>
                  <span className="text-lg font-black text-emerald-400">{graphDomainTotals.livescoreCompleted.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Scored to final ball</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">Total Scored Matches</span>
                  <span className="text-lg font-black text-purple-400">{graphDomainTotals.livescoreTotal.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Ball-by-ball tracked games</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-sky-300 uppercase tracking-wider">Match Scoring Rate</span>
                  <span className="text-lg font-black text-sky-400">
                    {graphDomainTotals.livescoreTotal > 0
                      ? `${Math.round((graphDomainTotals.livescoreCompleted / graphDomainTotals.livescoreTotal) * 100)}%`
                      : "100%"}
                  </span>
                  <span className="text-[10px] text-neutral-400">Live score completion</span>
                </div>
              </>
            )}

            {activeGraphTab === "cashflow" && (
              <>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Gross Inflow</span>
                  <span className="text-lg font-black text-emerald-400">₹{graphDomainTotals.revenue.toLocaleString("en-IN")}</span>
                  <span className="text-[10px] text-neutral-400">Amount coming from players</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider">Going to Vendors</span>
                  <span className="text-lg font-black text-rose-400">₹{graphDomainTotals.outgoing.toLocaleString("en-IN")}</span>
                  <span className="text-[10px] text-neutral-400">Disbursed to owners & umpires</span>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">MatchConnect Margin</span>
                  <span className="text-lg font-black text-cyan-400">₹{graphDomainTotals.profit.toLocaleString("en-IN")}</span>
                  <span className="text-[10px] text-neutral-400">Platform commission cut</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">Platform Take Rate</span>
                  <span className="text-lg font-black text-purple-400">
                    {graphDomainTotals.revenue > 0
                      ? `${((graphDomainTotals.profit / graphDomainTotals.revenue) * 100).toFixed(1)}%`
                      : "15.0%"}
                  </span>
                  <span className="text-[10px] text-neutral-400">Net commission margin</span>
                </div>
              </>
            )}

            {activeGraphTab === "users" && (
              <>
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-sky-300 uppercase tracking-wider">Player Signups</span>
                  <span className="text-lg font-black text-sky-400">{graphDomainTotals.users.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">New player accounts</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">New Teams</span>
                  <span className="text-lg font-black text-purple-400">{graphDomainTotals.teams.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Team formations</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Total Lifetime Users</span>
                  <span className="text-lg font-black text-emerald-400">{(stats?.counts?.users || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Registered platform users</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                  <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Total Teams</span>
                  <span className="text-lg font-black text-amber-400">{(stats?.counts?.teams || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-400">Active cricket clubs</span>
                </div>
              </>
            )}
          </div>

          {/* Sub-toggle controls for Cash Flow domain */}
          {activeGraphTab === "cashflow" && (
            <div className="flex items-center gap-1.5 bg-neutral-900/70 p-1.5 rounded-xl border border-neutral-800 self-start flex-wrap">
              <span className="text-[11px] text-neutral-400 font-semibold px-2">Sub-filter:</span>
              <button
                onClick={() => setComparisonMetric("cashflow")}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer",
                  comparisonMetric === "cashflow" ? "bg-green-500 text-black shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                Inflow vs Outflow
              </button>
              <button
                onClick={() => setComparisonMetric("revenue")}
                className={cn(
                  "px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer",
                  comparisonMetric === "revenue" ? "bg-emerald-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                Coming In (Players)
              </button>
              <button
                onClick={() => setComparisonMetric("outgoing")}
                className={cn(
                  "px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer",
                  comparisonMetric === "outgoing" ? "bg-rose-500 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                Going Out (Vendors)
              </button>
              <button
                onClick={() => setComparisonMetric("profit")}
                className={cn(
                  "px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer",
                  comparisonMetric === "profit" ? "bg-cyan-500 text-black shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                MatchConnect Margin
              </button>
            </div>
          )}

          {/* The Unified Dynamic AreaChart Canvas */}
          <div className="h-72 sm:h-80 w-full pt-2">
            {processedChartData && processedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="singleRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleOutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleProfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleBookGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleConfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleCompGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleGroundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleTournGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleTeamGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleLiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="singleUserGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#222722"} />
                  <XAxis
                    dataKey="label"
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLight ? "#ffffff" : "#181a18",
                      borderColor: isLight ? "#e2e8f0" : "#2e332e",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: isLight ? "#000" : "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)"
                    }}
                    labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                    formatter={(val, name) => {
                      if (
                        activeGraphTab === "cashflow" ||
                        String(name).includes("₹") ||
                        String(name).toLowerCase().includes("inflow") ||
                        String(name).toLowerCase().includes("outgoing") ||
                        String(name).toLowerCase().includes("disbursement") ||
                        String(name).toLowerCase().includes("margin") ||
                        String(name).toLowerCase().includes("cut")
                      ) {
                        return [`₹${Number(val).toLocaleString("en-IN")}`, name];
                      }
                      return [Number(val).toLocaleString(), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />

                  {/* Dynamic series based on activeGraphTab */}
                  {activeGraphTab === "matches" && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="matchesBooked"
                        name="🏏 Matches Booked"
                        stroke="#8b5cf6"
                        strokeWidth={2.8}
                        fillOpacity={1}
                        fill="url(#singleBookGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="matchesConfirmed"
                        name="✅ Matches Confirmed"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#singleConfGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="matchesCompleted"
                        name="🏁 Completed Matches"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#singleCompGrad)"
                      />
                    </>
                  )}

                  {activeGraphTab === "grounds" && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="groundsBooked"
                        name="🏟️ Grounds Booked"
                        stroke="#14b8a6"
                        strokeWidth={2.8}
                        fillOpacity={1}
                        fill="url(#singleGroundGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="groundsConfirmed"
                        name="✅ Confirmed / Paid Slots"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#singleConfGrad)"
                      />
                    </>
                  )}

                  {activeGraphTab === "tournaments" && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="tournamentsCreated"
                        name="🏆 Tournaments Created"
                        stroke="#f59e0b"
                        strokeWidth={2.8}
                        fillOpacity={1}
                        fill="url(#singleTournGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="tournamentTeams"
                        name="🛡️ Squads / Teams Enrolled"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#singleTeamGrad)"
                      />
                    </>
                  )}

                  {activeGraphTab === "livescore" && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="livescoreLive"
                        name="🔴 Live Matches in Play"
                        stroke="#ef4444"
                        strokeWidth={2.8}
                        fillOpacity={1}
                        fill="url(#singleLiveGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="livescoreCompleted"
                        name="✅ Completed Ball-by-Ball"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#singleConfGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="livescoreTotal"
                        name="📊 Total Live Scored"
                        stroke="#a855f7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fillOpacity={0}
                      />
                    </>
                  )}

                  {activeGraphTab === "cashflow" && (
                    comparisonMetric === "cashflow" ? (
                      <>
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Amount Coming In (Users)"
                          stroke="#22c55e"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#singleRevGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="outgoing"
                          name="Amount Going Out (Vendors)"
                          stroke="#f43f5e"
                          strokeWidth={2.2}
                          fillOpacity={1}
                          fill="url(#singleOutGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          name="MatchConnect Net Cut"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          fillOpacity={1}
                          fill="url(#singleProfGrad)"
                        />
                      </>
                    ) : comparisonMetric === "revenue" ? (
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Gross Inflow (₹)"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#singleRevGrad)"
                      />
                    ) : comparisonMetric === "outgoing" ? (
                      <>
                        <Area
                          type="monotone"
                          dataKey="outgoing"
                          name="Total Vendor Disbursements (₹)"
                          stroke="#f43f5e"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#singleOutGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="outgoingGrounds"
                          name="To Ground Owners"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={0}
                        />
                        <Area
                          type="monotone"
                          dataKey="outgoingUmpires"
                          name="To Match Umpires"
                          stroke="#ec4899"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={0}
                        />
                      </>
                    ) : (
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="MatchConnect Net Margin (₹)"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#singleProfGrad)"
                      />
                    )
                  )}

                  {activeGraphTab === "users" && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="users"
                        name="👤 Player Signups"
                        stroke="#0ea5e9"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#singleUserGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="teams"
                        name="🛡️ Team Formations"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        fillOpacity={1}
                        fill="url(#singleBookGrad)"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                {loadingStats ? "Loading multi-domain chart data..." : "No records in this date range"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CASH FLOW & PAYOUTS LEDGER: AMOUNT COMING IN & GOING TO WHOM ─── */}
      <div
        style={{
          backgroundColor: isLight ? "#ffffff" : "#131613",
          borderColor: isLight ? "#e2e8f0" : "#222722"
        }}
        className="p-5 sm:p-6 rounded-2xl border shadow-sm space-y-6"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Financial Transparency
              </span>
              <span className="text-xs text-neutral-400">
                Payer Collections & Vendor Disbursements
              </span>
            </div>
            <h2
              className="text-lg sm:text-xl font-black flex items-center gap-2"
              style={{ color: isLight ? "#0f172a" : "#ffffff" }}
            >
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              Money Flow: Amount Coming In & Going to Whom
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Comprehensive ledger tracking gross revenue from players, payouts owed to ground venues and umpires, and platform commissions.
            </p>
          </div>

          {/* Quick Flow Summary Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-neutral-400">Inflow:</span>
              <strong className="text-emerald-400">₹{flowTotals.incoming.toLocaleString("en-IN")}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span className="text-neutral-400">Outflow:</span>
              <strong className="text-rose-400">₹{flowTotals.totalOutgoing.toLocaleString("en-IN")}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="text-neutral-400">Platform Margin:</span>
              <strong className="text-cyan-400">₹{flowTotals.profit.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </div>

        {/* Top Payout Recipients Mini-Showcase */}
        {topRecipientsList && topRecipientsList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-amber-400" />
                Top Payout Recipients (Ground Owners & Umpires)
              </h3>
              <span className="text-[11px] text-neutral-400">
                Sorted by total earnings
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topRecipientsList.slice(0, 4).map((rec, idx) => {
                const isGround = rec.type === "Ground Owner";
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="truncate">
                        <div className="text-xs font-bold text-neutral-200 truncate">
                          {rec.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <span>{isGround ? "🏟️" : "🏏"}</span>
                          <span>{rec.type}</span>
                          <span>•</span>
                          <span className="font-mono">{rec.contact}</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-800 text-neutral-400 shrink-0">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-neutral-400">
                        {rec.bookingsCount} {rec.bookingsCount === 1 ? "booking" : "bookings"}
                      </span>
                      <span className="font-black text-rose-400">
                        ₹{Number(rec.totalPayout).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters & Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Tab Filter */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs overflow-x-auto">
            <button
              onClick={() => setFlowTab("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap",
                flowTab === "all"
                  ? "bg-green-500 text-black shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              All Flow ({allFlowBookings.length})
            </button>
            <button
              onClick={() => setFlowTab("grounds")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap",
                flowTab === "grounds"
                  ? "bg-green-500 text-black shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              🏟️ To Ground Owners ({allFlowBookings.filter(b => b.booking_type === "ground").length})
            </button>
            <button
              onClick={() => setFlowTab("umpires")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap",
                flowTab === "umpires"
                  ? "bg-green-500 text-black shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              🏏 To Match Umpires ({allFlowBookings.filter(b => b.booking_type === "umpire").length})
            </button>
            <button
              onClick={() => setFlowTab("paid")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap",
                flowTab === "paid"
                  ? "bg-green-500 text-black shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              ✅ Settled / Paid ({allFlowBookings.filter(b => b.isPaid).length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search payer, recipient, ground..."
              value={flowSearchQuery}
              onChange={(e) => setFlowSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-green-500 transition"
            />
            {flowSearchQuery && (
              <button
                onClick={() => setFlowSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Main Flow Table */}
        <div className="overflow-x-auto border border-neutral-800/80 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                style={{ borderColor: isLight ? "#f1f5f9" : "#1e221e" }}
                className="border-b bg-neutral-900/60 text-neutral-400 font-semibold"
              >
                <th className="py-3 px-3">Service & Match Date</th>
                <th className="py-3 px-3">Amount Coming In (Payer)</th>
                <th className="py-3 px-3">Amount Going Out (To Whom)</th>
                <th className="py-3 px-3 text-right">Vendor Payout</th>
                <th className="py-3 px-3 text-right">Platform Cut</th>
                <th className="py-3 px-3 text-right pr-4">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredFlowBookings.length > 0 ? (
                filteredFlowBookings.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-500/5 transition-colors">
                    {/* 1. Service & Match Date */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-neutral-200 truncate max-w-[170px]">
                        {item.serviceName}
                      </div>
                      <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        <span>{item.booking_date ? new Date(item.booking_date).toLocaleDateString() : "—"}</span>
                        <span>•</span>
                        <span>{item.time_slot}</span>
                      </div>
                      <div className="text-[9px] font-mono text-neutral-400 mt-0.5 truncate max-w-[130px]">
                        ID: {String(item.id).slice(0, 12)}...
                      </div>
                    </td>

                    {/* 2. Amount Coming In (Payer / Player) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold shrink-0">
                          ↑ Inflow
                        </span>
                        <div>
                          <div className="font-semibold text-neutral-200 truncate max-w-[150px]">
                            {item.payerName}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {item.payerContact}
                          </div>
                          {item.payerTeam && (
                            <div className="text-[10px] text-emerald-400 font-medium truncate max-w-[150px]">
                              Team: {item.payerTeam}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-1 pl-1">
                        +₹{Number(item.total).toLocaleString("en-IN")}
                      </div>
                    </td>

                    {/* 3. Amount Going Out (To Whom / Recipient) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0",
                            item.recipientType === "Ground Owner"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                          )}
                        >
                          {item.recipientType === "Ground Owner" ? "🏟️ Ground Owner" : "🏏 Match Umpire"}
                        </span>
                      </div>
                      <div className="font-semibold text-neutral-200 truncate max-w-[170px]">
                        {item.recipientName}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        Contact: {item.recipientContact}
                      </div>
                    </td>

                    {/* 4. Vendor Payout (Outgoing Base Amount) */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-rose-400 text-xs">
                        -₹{Number(item.base).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Owed to {item.recipientType === "Ground Owner" ? "Turf Owner" : "Umpire"}
                      </div>
                    </td>

                    {/* 5. Platform Cut */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-cyan-400 text-xs">
                        +₹{Number(item.fee).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        MatchConnect Fee
                      </div>
                    </td>

                    {/* 6. Status & Settlement */}
                    <td className="py-3 px-3 text-right pr-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-block",
                          item.isPaid
                            ? "bg-green-500/15 text-green-400 border border-green-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        )}
                      >
                        {item.isPaid ? "Disbursed / Settled" : "Pending Payment"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    {loadingStats
                      ? "Loading cash flow records..."
                      : flowSearchQuery
                        ? `No transactions match "${flowSearchQuery}"`
                        : "No transactions recorded in this period"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Recent Signups & Bookings Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Signups & Activity */}
        <div
          style={{
            backgroundColor: isLight ? "#ffffff" : "#131613",
            borderColor: isLight ? "#e2e8f0" : "#222722"
          }}
          className="p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Users & Signups
            </h3>

            {/* Toggle between Selected Period Users and All Recent */}
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-xl border border-neutral-800 text-[10px]">
              <button
                onClick={() => setUsersTab("selected")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  usersTab === "selected"
                    ? "bg-green-500 text-black shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                In Selected Date/Range ({stats?.selectedPeriodUsers?.length || 0})
              </button>
              <button
                onClick={() => setUsersTab("recent")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  usersTab === "recent"
                    ? "bg-green-500 text-black shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                All Recent ({stats?.recentSignups?.length || 0})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  style={{ borderColor: isLight ? "#f1f5f9" : "#1e221e" }}
                  className="border-b text-neutral-400 font-semibold"
                >
                  <th className="pb-2.5 pl-1">User</th>
                  <th className="pb-2.5">Contact</th>
                  <th className="pb-2.5">Team</th>
                  <th className="pb-2.5 text-right pr-1">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: isLight ? "#f8fafc" : "#181b18" }}>
                {(() => {
                  const listToRender = usersTab === "selected"
                    ? (stats?.selectedPeriodUsers || [])
                    : (stats?.recentSignups || []);
                  return listToRender.length > 0 ? (
                    listToRender.map((u) => {
                      const initials = (u.name || "?").slice(0, 2).toUpperCase();
                      return (
                        <tr key={u.id} className="hover:bg-neutral-500/5 transition-colors">
                          <td className="py-2.5 pl-1">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-200 font-bold text-[10px] flex items-center justify-center shrink-0 border border-neutral-700">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-200 truncate max-w-[130px]">{u.name}</div>
                                <div className="text-[10px] text-neutral-400">
                                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                                  {u.last_login && (
                                    <span className="text-emerald-400 font-medium ml-1">
                                      • Logged in {new Date(u.last_login).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5">
                            <div className="text-neutral-300 font-mono text-[11px]">{u.phone || "—"}</div>
                            <div className="text-[10px] text-neutral-400 truncate max-w-[120px]">{u.email}</div>
                          </td>
                          <td className="py-2.5 text-neutral-300 truncate max-w-[100px]">
                            {u.team_name || "—"}
                          </td>
                          <td className="py-2.5 text-right pr-1">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold inline-block",
                                u.is_admin
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                              )}
                            >
                              {u.is_admin ? "Admin" : "User"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-500">
                        {loadingStats
                          ? "Loading users..."
                          : usersTab === "selected"
                            ? `No user signups or logins recorded in ${curr.label || "selected date"}`
                            : "No recent signups found"}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Bookings & Payments */}
        <div
          style={{
            backgroundColor: isLight ? "#ffffff" : "#131613",
            borderColor: isLight ? "#e2e8f0" : "#222722"
          }}
          className="p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
              <CalendarCheck className="w-4 h-4 text-purple-500" />
              Bookings & Matches
            </h3>

            {/* Toggle between Selected Period Bookings and All Recent */}
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-xl border border-neutral-800 text-[10px]">
              <button
                onClick={() => setBookingsTab("selected")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  bookingsTab === "selected"
                    ? "bg-green-500 text-black shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                In Selected Date/Range ({stats?.selectedPeriodBookings?.length || 0})
              </button>
              <button
                onClick={() => setBookingsTab("recent")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                  bookingsTab === "recent"
                    ? "bg-green-500 text-black shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                All Recent ({stats?.recentBookings?.length || 0})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  style={{ borderColor: isLight ? "#f1f5f9" : "#1e221e" }}
                  className="border-b text-neutral-400 font-semibold"
                >
                  <th className="pb-2.5 pl-1">Booking & Recipient</th>
                  <th className="pb-2.5">User (Payer)</th>
                  <th className="pb-2.5">Date & Slot</th>
                  <th className="pb-2.5 text-right pr-1">Inflow / Outflow</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: isLight ? "#f8fafc" : "#181b18" }}>
                {(() => {
                  const listToRender = bookingsTab === "selected"
                    ? (stats?.selectedPeriodBookings || [])
                    : (stats?.recentBookings || []);
                  return listToRender.length > 0 ? (
                    listToRender.map((rawB) => {
                      const b = formatFlowItem(rawB);
                      return (
                        <tr key={b.id} className="hover:bg-neutral-500/5 transition-colors">
                          <td className="py-2.5 pl-1">
                            <div className="font-semibold text-neutral-200 truncate max-w-[140px]">
                              {b.serviceName}
                            </div>
                            <div className="text-[10px] text-rose-400 font-medium truncate max-w-[140px] mt-0.5">
                              To: {b.recipientName}
                            </div>
                          </td>
                          <td className="py-2.5">
                            <div className="text-neutral-300 font-medium truncate max-w-[120px]">
                              {b.payerName}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">{b.payerContact}</div>
                          </td>
                          <td className="py-2.5">
                            <div className="text-neutral-300">
                              {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : "—"}
                            </div>
                            <div className="text-[10px] text-neutral-400">{b.time_slot}</div>
                          </td>
                          <td className="py-2.5 text-right pr-1">
                            <div className="font-bold text-emerald-400 text-xs">
                              +₹{Number(b.total).toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-rose-400 font-medium">
                              -₹{Number(b.base).toLocaleString("en-IN")}
                            </div>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase inline-block mt-0.5",
                                b.isPaid
                                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              )}
                            >
                              {b.isPaid ? "Settled" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-500">
                        {loadingStats
                          ? "Loading bookings..."
                          : bookingsTab === "selected"
                            ? `No bookings recorded in ${curr.label || "selected date"}`
                            : "No recent bookings recorded"}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── User Management & Search Section ──────────────────────────────── */}
      <div
        style={{
          backgroundColor: isLight ? "#ffffff" : "#131613",
          borderColor: isLight ? "#e2e8f0" : "#222722"
        }}
        className="p-4 sm:p-5 rounded-2xl border shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
              User Search & Management
            </h3>
            <p className="text-xs text-neutral-400">
              Manage accounts, search by name or contact, and promote standard users to admin
            </p>
          </div>

          {/* Search + Role Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "#1a1d1a",
                  borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#1a1d1a",
                borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
              }}
              className="px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="user">Users Only</option>
            </select>
          </div>
        </div>

        {/* Role Action Feedback Alerts */}
        {roleActionSuccess && (
          <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-green-400" />
              <span className="font-semibold">{roleActionSuccess}</span>
            </div>
            <button onClick={() => setRoleActionSuccess("")} className="text-green-400/80 hover:text-green-300 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {roleActionError && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="font-semibold">{roleActionError}</span>
            </div>
            <button onClick={() => setRoleActionError("")} className="text-red-400/80 hover:text-red-300 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                style={{ borderColor: isLight ? "#f1f5f9" : "#1e221e" }}
                className="border-b text-neutral-400 font-semibold"
              >
                <th className="pb-3 pl-1">Name</th>
                <th className="pb-3">Contact Details</th>
                <th className="pb-3">Team & Location</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Joined</th>
                <th className="pb-3 text-right pr-1">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: isLight ? "#f8fafc" : "#181b18" }}>
              {usersList.length > 0 ? (
                usersList.map((u) => {
                  const isUpdating = updatingUserId === u.id;
                  const isMasterAdmin = String(u.phone).replace(/\D/g, "").endsWith("6382757532");
                  const isSelf = String(u.id) === String(user?.id);
                  return (
                    <tr key={u.id} className="hover:bg-neutral-500/5 transition-colors">
                      <td className="py-3 pl-1">
                        <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold border border-green-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400">ID #{u.id}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-mono text-neutral-300">{u.phone || "—"}</div>
                        <div className="text-[10px] text-neutral-400">{u.email}</div>
                      </td>
                      <td className="py-3">
                        <div className="text-neutral-300 font-medium">{u.team_name || "—"}</div>
                        <div className="text-[10px] text-neutral-400">{u.village_name || "—"}</div>
                      </td>
                      <td className="py-3">
                        {isMasterAdmin ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <ShieldCheck className="w-3 h-3" /> Primary Admin
                          </span>
                        ) : isSelf ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <ShieldCheck className="w-3 h-3" /> Admin (You)
                          </span>
                        ) : (
                          <select
                            value={u.is_admin ? "admin" : "user"}
                            onChange={(e) => handleUpdateUserRole(u, e.target.value === "admin")}
                            disabled={isUpdating}
                            style={{
                              backgroundColor: isLight ? "#f8fafc" : "#1a1d1a",
                              borderColor: u.is_admin ? "#f59e0b" : (isLight ? "#e2e8f0" : "#2a2e2a")
                            }}
                            className={cn(
                              "px-2 py-1 text-[11px] font-semibold rounded-lg border focus:outline-none focus:ring-1 cursor-pointer transition-colors",
                              u.is_admin
                                ? "text-amber-400 border-amber-500/30 bg-amber-500/10 focus:ring-amber-500"
                                : "text-neutral-300 border-neutral-700 bg-neutral-900 focus:ring-green-500"
                            )}
                          >
                            <option value="user">👤 Standard User</option>
                            <option value="admin">👑 Administrator</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3 text-neutral-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 text-right pr-1">
                        {isMasterAdmin ? (
                          <span className="text-[10px] text-neutral-500 font-semibold">Master Admin</span>
                        ) : isSelf ? (
                          <span className="text-[10px] text-neutral-500 font-semibold">Current Account</span>
                        ) : u.is_admin ? (
                          <button
                            onClick={() => handleUpdateUserRole(u, false)}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 inline-flex items-center gap-1"
                            title="Revoke admin access and revert to Standard User"
                          >
                            <Users className="w-3 h-3" />
                            {isUpdating ? "Updating..." : "Change to Standard"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateUserRole(u, true)}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10 disabled:opacity-50 inline-flex items-center gap-1"
                            title="Promote this player to Administrator"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {isUpdating ? "Updating..." : "Make Admin"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    {loadingUsers ? "Searching users..." : "No users matched your search criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-2 text-xs text-neutral-400">
          <div>
            Showing{" "}
            <strong>
              {usersList.length > 0 ? (usersPagination.page - 1) * usersPagination.limit + 1 : 0} -{" "}
              {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)}
            </strong>{" "}
            of <strong>{usersPagination.total}</strong> users
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(usersPagination.page - 1)}
              disabled={usersPagination.page <= 1 || loadingUsers}
              style={{
                backgroundColor: isLight ? "#ffffff" : "#1a1d1a",
                borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
              }}
              className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-500/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-neutral-300">
              {usersPagination.page} / {usersPagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchUsers(usersPagination.page + 1)}
              disabled={usersPagination.page >= usersPagination.totalPages || loadingUsers}
              style={{
                backgroundColor: isLight ? "#ffffff" : "#1a1d1a",
                borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
              }}
              className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-500/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Create User Modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#151815",
              borderColor: isLight ? "#e2e8f0" : "#2a2e2a"
            }}
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                    Create New User
                  </h3>
                  <p className="text-xs text-neutral-400">Directly register a player or administrator</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error & Success Messages */}
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Virat Kohli"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    style={{
                      backgroundColor: isLight ? "#f8fafc" : "#1d211d",
                      borderColor: isLight ? "#e2e8f0" : "#2c312c"
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    style={{
                      backgroundColor: isLight ? "#f8fafc" : "#1d211d",
                      borderColor: isLight ? "#e2e8f0" : "#2c312c"
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@matchconnect.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    style={{
                      backgroundColor: isLight ? "#f8fafc" : "#1d211d",
                      borderColor: isLight ? "#e2e8f0" : "#2c312c"
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    style={{
                      backgroundColor: isLight ? "#f8fafc" : "#1d211d",
                      borderColor: isLight ? "#e2e8f0" : "#2c312c"
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Team Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Strikers"
                    value={newUser.team_name}
                    onChange={(e) => setNewUser({ ...newUser, team_name: e.target.value })}
                    style={{
                      backgroundColor: isLight ? "#f8fafc" : "#1d211d",
                      borderColor: isLight ? "#e2e8f0" : "#2c312c"
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Village / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Coimbatore"
                    value={newUser.village_name}
                    onChange={(e) => setNewUser({ ...newUser, village_name: e.target.value })}
                    style={{
                      backgroundColor: isLight ? "#f8fafc" : "#1d211d",
                      borderColor: isLight ? "#e2e8f0" : "#2c312c"
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Team Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2023"
                    value={newUser.team_year}
                    onChange={(e) => setNewUser({ ...newUser, team_year: e.target.value })}
                    style={{
                      backgroundColor: isLight ? "#f8fafc" : "#1d211d",
                      borderColor: isLight ? "#e2e8f0" : "#2c312c"
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-green-500 text-neutral-200"
                  />
                </div>
              </div>

              {/* ─── Role Selection (Admin vs User) ────────────────────────── */}
              <div
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "#1a1e1a",
                  borderColor: isLight ? "#e2e8f0" : "#282d28"
                }}
                className="p-3.5 rounded-xl border space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Assign Account Role
                  </span>
                  <span className="text-[11px] text-neutral-400">Select privileges</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Option 1: Standard User */}
                  <label
                    onClick={() => setNewUser({ ...newUser, is_admin: false })}
                    style={{
                      backgroundColor: !newUser.is_admin ? (isLight ? "#e2e8f0" : "#242a24") : "transparent",
                      borderColor: !newUser.is_admin ? "#22c55e" : isLight ? "#e2e8f0" : "#2d332d"
                    }}
                    className="p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all"
                  >
                    <input
                      type="radio"
                      name="account_role"
                      checked={!newUser.is_admin}
                      onChange={() => setNewUser({ ...newUser, is_admin: false })}
                      className="mt-0.5 accent-green-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-neutral-200">Standard User</div>
                      <div className="text-[10px] text-neutral-400">Regular cricket player / captain</div>
                    </div>
                  </label>

                  {/* Option 2: Administrator */}
                  <label
                    onClick={() => setNewUser({ ...newUser, is_admin: true })}
                    style={{
                      backgroundColor: newUser.is_admin ? (isLight ? "#fef3c7" : "#322611") : "transparent",
                      borderColor: newUser.is_admin ? "#f59e0b" : isLight ? "#e2e8f0" : "#2d332d"
                    }}
                    className="p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all"
                  >
                    <input
                      type="radio"
                      name="account_role"
                      checked={newUser.is_admin}
                      onChange={() => setNewUser({ ...newUser, is_admin: true })}
                      className="mt-0.5 accent-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-amber-400">Administrator</div>
                      <div className="text-[10px] text-neutral-400">Full dashboard & stats access</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submittingUser}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-green-500 text-black hover:bg-green-400 active:scale-95 transition-all shadow-md shadow-green-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submittingUser ? "Creating User..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
