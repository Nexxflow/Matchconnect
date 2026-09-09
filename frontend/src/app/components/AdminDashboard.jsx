import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Shield,
  MapPin,
  Trophy,
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
  Filter
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
  const [comparisonMetric, setComparisonMetric] = useState("revenue"); // "revenue" | "bookings"
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
      alert("You cannot revoke administrator privileges from your own account.");
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
    revenue: 0
  };

  const periodData = stats?.periodComparison;
  const curr = periodData?.current || { bookings: 0, revenue: 0, users: 0, teams: 0 };
  const prev = periodData?.previous || { bookings: 0, revenue: 0, users: 0, teams: 0 };
  const diff = periodData?.diff || {
    bookingsDiff: 0,
    bookingsGrowth: 0,
    revenueDiff: 0,
    revenueGrowth: 0,
    usersDiff: 0,
    usersGrowth: 0,
    teamsDiff: 0,
    teamsGrowth: 0
  };

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
      title: "Total Teams",
      value: counts.teams.toLocaleString(),
      icon: Shield,
      color: "text-blue-500",
      bg: isLight ? "bg-blue-50" : "bg-blue-500/10",
      border: isLight ? "border-blue-100" : "border-blue-500/20",
      subtext: "Distinct squad rosters"
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
      title: "Tournaments",
      value: counts.tournaments.toLocaleString(),
      icon: Trophy,
      color: "text-amber-500",
      bg: isLight ? "bg-amber-50" : "bg-amber-500/10",
      border: isLight ? "border-amber-100" : "border-amber-500/20",
      subtext: "Organized leagues & cups"
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
      title: "Total Revenue",
      value: `₹${Number(counts.revenue).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-green-500",
      bg: isLight ? "bg-green-50" : "bg-green-500/10",
      border: isLight ? "border-green-100" : "border-green-500/20",
      subtext: "Paid successful bookings"
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
                  <span>📅 Viewing: {curr.label || "This Month"}</span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400">
                Active Date Range: {curr.startDate || "—"} to {curr.endDate || "—"}
              </div>
            </div>
          </div>

          {/* Quick Presets, Calendar Picker & Compare Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
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
        /* ─── DEFAULT SINGLE-PERIOD VIEW: Only Chosen Date / Month Stats ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Revenue in Period */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Paid Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : `₹${Number(curr.revenue).toLocaleString("en-IN")}`}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 truncate">
                Collected in <strong className="text-neutral-300">{curr.label || "period"}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Bookings in Period */}
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
                Bookings in <strong className="text-neutral-300">{curr.label || "period"}</strong>
              </div>
            </div>
          </div>

          {/* Card 3: New Users in Period */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                New Player Signups
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
                Registered in <strong className="text-neutral-300">{curr.label || "period"}</strong>
              </div>
            </div>
          </div>

          {/* Card 4: New Teams in Period */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between group hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                New Cricket Teams
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : Number(curr.teams).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 truncate">
                Teams created in <strong className="text-neutral-300">{curr.label || "period"}</strong>
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
                Revenue ({curr.label || "Month 1"})
              </span>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : `₹${Number(curr.revenue).toLocaleString("en-IN")}`}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                <span className="text-neutral-400 truncate mr-2">
                  {prev.label || "Month 2"}: <strong className="text-neutral-300">₹{Number(prev.revenue).toLocaleString("en-IN")}</strong>
                </span>
                {renderGrowthBadge(diff.revenueDiff, diff.revenueGrowth, "₹")}
              </div>
            </div>
          </div>

          {/* Card 2: Bookings Comparison */}
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

          {/* Card 3: New Users Comparison */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Signups ({curr.label || "Month 1"})
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : Number(curr.users).toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                <span className="text-neutral-400 truncate mr-2">
                  {prev.label || "Month 2"}: <strong className="text-neutral-300">{Number(prev.users).toLocaleString()}</strong>
                </span>
                {renderGrowthBadge(diff.usersDiff, diff.usersGrowth)}
              </div>
            </div>
          </div>

          {/* Card 4: New Teams Comparison */}
          <div
            style={{
              backgroundColor: isLight ? "#ffffff" : "#131613",
              borderColor: isLight ? "#e2e8f0" : "#222722"
            }}
            className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-400">
                Teams ({curr.label || "Month 1"})
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                {loadingStats ? "..." : Number(curr.teams).toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                <span className="text-neutral-400 truncate mr-2">
                  {prev.label || "Month 2"}: <strong className="text-neutral-300">{Number(prev.teams).toLocaleString()}</strong>
                </span>
                {renderGrowthBadge(diff.teamsDiff, diff.teamsGrowth)}
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
        /* ─── DEFAULT MODE: 2 Graphs side-by-side (Graph 1: Bookings/Revenue with user toggle, Graph 2: User Count) ─── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Graph 1: Bookings or Revenue (with user toggle) */}
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
                  {comparisonMetric === "revenue" ? (
                    <>
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                      Daily Revenue
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4 text-purple-400" />
                      Daily Bookings
                    </>
                  )}
                </h3>
                <p className="text-xs text-neutral-400">
                  {curr.startDate} to {curr.endDate} ({curr.label})
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
              {stats?.chartData && stats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="singleRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="singleBookGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
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
                      formatter={(val) => [
                        comparisonMetric === "revenue"
                          ? `₹${Number(val).toLocaleString("en-IN")}`
                          : Number(val).toLocaleString(),
                        comparisonMetric === "revenue" ? "Revenue" : "Bookings"
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={comparisonMetric === "revenue" ? "revenue" : "bookings"}
                      name={comparisonMetric === "revenue" ? "Revenue" : "Bookings"}
                      stroke={comparisonMetric === "revenue" ? "#22c55e" : "#a855f7"}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill={comparisonMetric === "revenue" ? "url(#singleRevGrad)" : "url(#singleBookGrad)"}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                  {loadingStats ? "Loading chart..." : "No data recorded in this range"}
                </div>
              )}
            </div>
          </div>

          {/* Graph 2: User Count (dedicated only to users) */}
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
                  Daily User Count
                </h3>
                <p className="text-xs text-neutral-400">
                  {curr.startDate} to {curr.endDate} ({curr.label})
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Player Signups
              </span>
            </div>

            <div className="h-64 w-full">
              {stats?.chartData && stats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
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
                      formatter={(val) => [`${Number(val).toLocaleString()} Users`, "New Signups"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="New Users"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#singleUserGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                  {loadingStats ? "Loading chart..." : "No user signups recorded in this range"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <th className="pb-2.5 pl-1">Booking</th>
                  <th className="pb-2.5">User</th>
                  <th className="pb-2.5">Date & Slot</th>
                  <th className="pb-2.5 text-right pr-1">Amount / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: isLight ? "#f8fafc" : "#181b18" }}>
                {(() => {
                  const listToRender = bookingsTab === "selected"
                    ? (stats?.selectedPeriodBookings || [])
                    : (stats?.recentBookings || []);
                  return listToRender.length > 0 ? (
                    listToRender.map((b) => {
                      const isPaid = String(b.payment_status).toLowerCase() === "paid";
                      return (
                        <tr key={b.id} className="hover:bg-neutral-500/5 transition-colors">
                          <td className="py-2.5 pl-1">
                            <div className="font-semibold text-neutral-200 truncate max-w-[130px]">
                              {b.ground_name}
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                              {b.booking_type}
                            </div>
                          </td>
                          <td className="py-2.5">
                            <div className="text-neutral-300 font-medium truncate max-w-[120px]">
                              {b.user_name || "Guest"}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">{b.user_phone || "—"}</div>
                          </td>
                          <td className="py-2.5">
                            <div className="text-neutral-300">
                              {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : "—"}
                            </div>
                            <div className="text-[10px] text-neutral-400">{b.time_slot}</div>
                          </td>
                          <td className="py-2.5 text-right pr-1">
                            <div className="font-bold text-neutral-200">
                              ₹{Number(b.total_amount).toLocaleString("en-IN")}
                            </div>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-block mt-0.5",
                                isPaid
                                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              )}
                            >
                              {b.payment_status || "pending"}
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
