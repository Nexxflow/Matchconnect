import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, Home, Swords, Radio, MapPin, Users, Trophy } from "lucide-react";
import AuthScreen from "./components/Auth/AuthScreen.jsx";
import Navbar from "./components/Navbar.jsx";
import BookingModal from "./components/BookingModal.jsx";
import ChatModal from "./components/ChatModal.jsx";
import HomeTab from "./components/tabs/HomeTab.jsx";
import FindMatchTab from "./components/tabs/FindMatchTab.jsx";
import GroundsTab from "./components/tabs/GroundsTab.jsx";
import UmpiresTab from "./components/tabs/UmpiresTab.jsx";
import LiveScoreTab from "./components/LiveScoreTab.jsx";
import TournamentsTab from "./components/tabs/TournamentsTab.jsx";
import MyTeamTab from "./components/tabs/MyTeamTab.jsx";
import { apiRequest, getStoredToken, setStoredToken } from "./api";
import { requestNotificationPermission } from "../services/firebaseNotification";
import { getFirebaseMessaging } from "../firebase";
import { onMessage } from "firebase/messaging";
import { GROUNDS } from "./utils/constants";
import {
  useForceDark,
  normalizePhone,
  transformGround,
  transformUmpire,
  transformBooking,
  transformTournament
} from "./utils/helpers.jsx";

// Register the FCM background service worker once
if (typeof window !== "undefined" && "serviceWorker" in navigator && !window.__swRegistered) {
  window.__swRegistered = true;
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then(reg => console.log("FCM service worker registered:", reg.scope))
    .catch(err => console.error("FCM service worker registration failed:", err));
}

function normalizeChallenge(c) {
  return {
    id: c.id,
    team: c.team_name,
    contact_no: c.contact_no,
    postedBy: c.posted_by_name || c.creator_name || null,
    postedAt: c.created_at || null,
    format: c.format,
    date: c.match_date,
    rawDate: c.match_date,
    time: c.time_slot,
    ground: c.ground_name || (c.ground_id ? "Ground booked" : "Not booked yet"),
    groundLat: c.ground_lat != null ? Number(c.ground_lat) : null,
    groundLng: c.ground_lng != null ? Number(c.ground_lng) : null,
    note: c.note || "",
    urgent: !!c.urgent,
    rating: 0,
    wins: 0,
    losses: 0
  };
}

export default function App() {
  useForceDark();
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const validTabs = ["Home", "Find Match", "Grounds", "Umpires", "Live Score", "Tournaments", "My Team"];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
    } catch {}
    return "Home";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [autoOpenChallengeForm, setAutoOpenChallengeForm] = useState(false);
  const [findMatchEntryMode, setFindMatchEntryMode] = useState("browse");

  const goCreateChallenge = () => {
    setActiveTab("Find Match");
    setAutoOpenChallengeForm(true);
    setFindMatchEntryMode("create");
  };

  const handleNavTabClick = tab => {
    setFindMatchEntryMode("browse");
    setActiveTab(tab);
  };

  const [teammates, setTeammates] = useState({ phones: [], ids: [] });
  const [acceptedChallenge, setAcceptedChallenge] = useState(null);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingModal, setBookingModal] = useState(null);
  const [cancellingChallenge, setCancellingChallenge] = useState(false);
  const [chatChallenge, setChatChallenge] = useState(null);
  const [auth, setAuth] = useState({ token: null, user: null });
  const [authChecked, setAuthChecked] = useState(false);
  const [backendStatus, setBackendStatus] = useState("connecting");
  const [challenges, setChallenges] = useState([]);
  const [grounds, setGrounds] = useState(GROUNDS.map(g => ({ ...g })));
  const [umpires, setUmpires] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [pushNotifications, setPushNotifications] = useState([]);

  const resetMatch = window.location.pathname.match(/^\/reset-password\/(.+)$/);
  const resetToken = resetMatch ? resetMatch[1] : null;

  const registeredTournaments = tournaments.filter(t => registeredIds.includes(t.id));

  const loadTeammates = async (token) => {
    try {
      const res = await apiRequest("/users/teammates", { token });
      const members = res.members || [];
      setTeammates({
        phones: members.map(m => m.phone).filter(Boolean),
        ids: members.map(m => m.id).filter(Boolean)
      });
    } catch (err) {
      console.warn("Could not load teammates:", err.message);
    }
  };

  const loadMyTeamAndRegistrations = async (token) => {
    try {
      const teamRes = await apiRequest("/teams/mine", { token });
      const team = teamRes.team || null;
      setMyTeam(team);
      if (team) {
        const res = await apiRequest(`/tournaments/mine/${team.id}`, { token });
        setRegisteredIds((res.tournaments || []).map(t => t.id));
      }
    } catch (err) {
      console.warn("Could not load team/tournament registrations:", err.message);
    }
  };

  const refreshTournaments = async () => {
    try {
      const res = await apiRequest("/tournaments");
      setTournaments(res.tournaments.map(transformTournament));
    } catch (err) {
      console.warn("Could not refresh tournaments:", err.message);
    }
  };

  const refreshBookings = async (token) => {
    try {
      const res = await apiRequest("/bookings/mine", { token });
      setBookings(res.bookings.map(transformBooking));
    } catch {
      // non-fatal
    }
  };

  const handleBookingConfirm = booking => {
    refreshBookings(auth.token);
  };

  const loadAppData = async (token, user) => {
    try {
      const [groundsRes, umpiresRes, tournamentsRes, challengesRes] = await Promise.all([
        apiRequest("/grounds"),
        apiRequest("/umpires"),
        apiRequest("/tournaments"),
        apiRequest("/challenges", { token })
      ]);
      setGrounds(groundsRes.grounds.map(transformGround));
      setUmpires(umpiresRes.umpires.map(transformUmpire));
      setTournaments(tournamentsRes.tournaments.map(transformTournament));

      const allChallenges = challengesRes.challenges || [];
      setChallenges(allChallenges);

      // Auto-open chat modal if navigated from mobile phone notification with challengeId
      const searchParams = new URLSearchParams(window.location.search);
      const targetChallengeId = searchParams.get("challengeId");
      if (targetChallengeId) {
        const target = allChallenges.find(c => String(c.id) === String(targetChallengeId));
        if (target) {
          setChatChallenge(target);
        }
      }

      const myPhone = normalizePhone(user?.phone);
      const myActive = allChallenges.find(
        c =>
          c.status === "accepted" &&
          ((user?.id && String(c.accepted_by_user_id) === String(user.id)) ||
            (myPhone && normalizePhone(c.accepted_by_contact_no) === myPhone))
      );
      setAcceptedChallenge(myActive || null);

      setBackendStatus("online");
      loadMyTeamAndRegistrations(token);
      refreshBookings(token);
      loadTeammates(token);
    } catch (err) {
      console.warn("Backend unavailable, using demo data:", err.message);
      setBackendStatus("offline");
    }
  };

  const registerPushNotifications = async (token) => {
    try {
      console.log("🔑 [Frontend Notification] Checking notification permission and FCM token...");
      const fcmToken = await requestNotificationPermission();
      if (!fcmToken) {
        console.warn("⚠️ [Frontend Notification] Notification permission not granted or token unavailable.");
        return;
      }

      await apiRequest("/notifications/save-token", {
        method: "POST",
        token,
        body: { token: fcmToken },
      });
      console.log("✅ [Frontend Notification] FCM Device token successfully synced with backend.");
    } catch (err) {
      console.error("❌ [Frontend Notification] FCM Registration Error:", err);
    }
  };

  const knownNotifIdsRef = useRef(new Set());
  const lastNotifFetchRef = useRef(0);
  const challengesRef = useRef(challenges);
  challengesRef.current = challenges;
  const authRef = useRef(auth);
  authRef.current = auth;

  const handleNotificationNavigate = useCallback(async (item) => {
    if (!item) return;

    // 1. Mark as read immediately in local state & backend
    if (item.id) {
      setPushNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      const currentToken = authRef.current?.token;
      if (currentToken) {
        apiRequest(`/notifications/${item.id}/read`, { method: "PUT", token: currentToken }).catch(() => {});
      }
    }

    const type = String(item.type || item.data?.type || "").toLowerCase();
    const title = String(item.title || "").toLowerCase();
    const body = String(item.body || "").toLowerCase();
    const full = `${type} ${title} ${body}`.toLowerCase();

    console.log("🔔 [Notification Click] Navigating to target page:", { type, title, full, data: item.data });

    // 1. Chat Message: open chat modal & switch to My Team
    if (type.includes("chat") || full.includes("message")) {
      setActiveTab("My Team");
      const cId = item.data?.challengeId || item.data?.challenge_id || item.challengeId || item.challenge_id;
      if (cId) {
        const currentChallenges = challengesRef.current || [];
        let found = currentChallenges.find((c) => String(c.id) === String(cId));
        const currentToken = authRef.current?.token;
        if (!found && currentToken) {
          try {
            const res = await apiRequest("/challenges", { token: currentToken });
            if (res?.challenges) {
              setChallenges(res.challenges);
              found = res.challenges.find((c) => String(c.id) === String(cId));
            }
          } catch (e) {}
        }
        if (found) {
          setChatChallenge(found);
        }
      }
      return;
    }

    // 2. Accepted Challenge / Upcoming Match: go to My Team
    if (
      type.includes("challenge_accepted") ||
      type.includes("team_challenge_accepted") ||
      type.includes("teammate_challenge_accepted") ||
      (full.includes("challenge") && full.includes("accepted"))
    ) {
      setActiveTab("My Team");
      return;
    }

    // 3. New Challenge or Open Challenge: go to Find Match
    if (
      type.includes("new_challenge") ||
      type.includes("challenge_cancelled") ||
      type.includes("challenge") ||
      full.includes("challenge")
    ) {
      setActiveTab("Find Match");
      setFindMatchEntryMode("browse");
      return;
    }

    // 4. Tournaments:
    // If registration -> My Team
    if (
      type.includes("tournament_registration") ||
      (full.includes("tournament") && (full.includes("registered") || full.includes("registration") || full.includes("confirmed")))
    ) {
      setActiveTab("My Team");
      return;
    }
    // If tournament announced / general -> Tournaments tab
    if (type.includes("tournament") || full.includes("tournament")) {
      setActiveTab("Tournaments");
      return;
    }

    // 5. Grounds & Ground Bookings
    if (type.includes("ground_booking") || (full.includes("ground") && full.includes("booking"))) {
      setActiveTab("My Team");
      return;
    }
    if (type.includes("ground") || full.includes("ground") || full.includes("pitch")) {
      setActiveTab("Grounds");
      return;
    }

    // 6. Umpires & Umpire Bookings
    if (type.includes("umpire_booking") || (full.includes("umpire") && full.includes("booking"))) {
      setActiveTab("My Team");
      return;
    }
    if (type.includes("umpire") || full.includes("umpire")) {
      setActiveTab("Umpires");
      return;
    }

    // 7. Live Matches & Scores
    if (
      type.includes("live") ||
      type.includes("score") ||
      type.includes("match") ||
      full.includes("live score") ||
      full.includes("match created") ||
      full.includes("overs") ||
      full.includes("wicket")
    ) {
      setActiveTab("Live Score");
      return;
    }

    // 8. Team & Teammates
    if (type.includes("team") || full.includes("teammate") || full.includes("team")) {
      setActiveTab("My Team");
      return;
    }

    // Fallback default
    setActiveTab("Home");
  }, []);

  const loadNotifications = useCallback(async (token, force = false) => {
    if (!token) return;
    const now = Date.now();
    // Throttle to avoid duplicate rapid requests within 30s unless explicitly forced
    if (!force && now - lastNotifFetchRef.current < 30000) {
      return;
    }
    lastNotifFetchRef.current = now;
    try {
      const res = await apiRequest("/notifications", { token });
      if (res?.notifications) {
        setPushNotifications(res.notifications);
        res.notifications.forEach((n) => knownNotifIdsRef.current.add(n.id));
      }
    } catch (err) {
      console.warn("⚠️ [Frontend Notification] Could not load notifications:", err.message);
    }
  }, []);

  // Relaxed background check (every 60s) only when tab is visible, plus on focus if stale
  useEffect(() => {
    if (!auth.token) return;
    loadNotifications(auth.token, true);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications(auth.token);
      }
    }, 60000);

    const onFocus = () => {
      loadNotifications(auth.token);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [auth.token]);

  const handleMarkAllRead = async () => {
    setPushNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (auth.token) {
      await apiRequest("/notifications/mark-read", { method: "PUT", token: auth.token }).catch(() => {});
      console.log("✅ [Frontend Notification] Marked all notifications as read.");
    }
  };

  const handleClearNotifications = async () => {
    setPushNotifications([]);
    if (auth.token) {
      await apiRequest("/notifications", { method: "DELETE", token: auth.token }).catch(() => {});
      console.log("🗑️ [Frontend Notification] Cleared all notifications.");
    }
  };

  useEffect(() => {
    let unsubscribe;
    (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload?.data?.title || payload?.notification?.title || "";
        const body = payload?.data?.body || payload?.notification?.body || "";
        const type = payload?.data?.type || "general";

        // Filter out dummy/empty notifications (e.g. blank body with generic title)
        if (!title || (!body && title === "MatchConnect")) {
          console.log("ℹ️ [Frontend Notification] Ignored empty/dummy notification:", payload);
          return;
        }

        console.log("🔔 [Frontend Notification] Real-time Web Push notification RECEIVED:", {
          title,
          body,
          type,
          data: payload?.data || {},
        });

        const newNotif = {
          id: Date.now(),
          title,
          body,
          type,
          is_read: false,
          created_at: new Date().toISOString(),
          data: payload?.data || {},
        };
        setPushNotifications((prev) => [newNotif, ...prev]);

        // Browser native Web Notification (tagged to deduplicate)
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            const notifTag = payload?.data?.tag || `notif_${newNotif.id}`;
            const notif = new Notification(title, {
              body,
              icon: "/logo.png",
              tag: notifTag,
            });
            notif.onclick = () => {
              window.focus();
              handleNotificationNavigate(newNotif);
            };
            console.log("📱 [Frontend Notification] Browser system notification displayed:", title);
          } catch (e) {
            console.warn("⚠️ [Frontend Notification] Browser Web Notification error:", e);
          }
        }
      });
    })();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Handle notification click messages from Service Worker (background push notifications)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handleSwMessage = (event) => {
      if (event.data?.type === "NOTIFICATION_CLICK") {
        const item = event.data.notification || event.data.data;
        handleNotificationNavigate(item);
      }
    };
    navigator.serviceWorker.addEventListener("message", handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    };
  }, []);

  // Handle opening directly from notification click URL params (e.g. /?tab=... or /?notifType=...)
  useEffect(() => {
    const handleUrlNavigation = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const notifType = params.get("notifType");
      const challengeId = params.get("challengeId");

      const validTabs = ["Home", "Find Match", "Grounds", "Umpires", "Live Score", "Tournaments", "My Team"];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      } else if (notifType) {
        handleNotificationNavigate({ type: notifType, data: { challengeId } });
      }

      if (challengeId) {
        const found = challengesRef.current?.find((c) => String(c.id) === String(challengeId));
        if (found) setChatChallenge(found);
      }
    };

    handleUrlNavigation();
    window.addEventListener("popstate", handleUrlNavigation);
    return () => window.removeEventListener("popstate", handleUrlNavigation);
  }, []);

  useEffect(() => {
    if (resetToken) {
      setAuthChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = getStoredToken();
      if (!token) {
        setAuthChecked(true);
        return;
      }
      try {
        const { user } = await apiRequest("/auth/me", { token });
        if (cancelled) return;
        setAuth({ token, user });
        loadAppData(token, user);
        loadNotifications(token);
        registerPushNotifications(token);
      } catch {
        setStoredToken(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthSuccess = (user, token) => {
    setStoredToken(token);
    setAuth({ token, user });
    loadAppData(token, user);
    loadNotifications(token);
    registerPushNotifications(token);
  };

  const handleLogout = async () => {
    try {
      if (auth.token) {
        await apiRequest("/notifications/clear-token", { method: "POST", token: auth.token });
      }
    } catch (err) {
      console.warn("Could not clear FCM token on logout:", err.message);
    }
    setStoredToken(null);
    setAuth({ token: null, user: null });
    setBookings([]);
    setTeammates({ phones: [], ids: [] });
    setActiveTab("Home");
  };

  const handleChallengeAccepted = (updatedChallenge) => {
    setChallenges(prev => prev.map(c => c.id === updatedChallenge.id ? updatedChallenge : c));
    setAcceptedChallenge(updatedChallenge);
  };

  const handleCancelAcceptedChallenge = async (challengeId) => {
    const targetId = challengeId || acceptedChallenge?.id;
    if (!targetId || !auth.token) return;
    setCancellingChallenge(true);
    try {
      const res = await apiRequest(`/challenges/${targetId}/cancel`, { method: "POST", token: auth.token });
      setChallenges(prev => prev.map(c => c.id === res.challenge.id ? res.challenge : c));
      setAcceptedChallenge(null);
    } catch (err) {
      console.error("Could not cancel challenge:", err.message);
    } finally {
      setCancellingChallenge(false);
    }
  };

  const handleRegisterTournament = async (tournamentId) => {
    if (!auth.token) return;
    try {
      const res = await apiRequest(`/tournaments/${tournamentId}/register`, {
        method: "POST",
        token: auth.token,
        body: myTeam?.id ? { team_id: myTeam.id } : {},
      });
      setRegisteredIds(prev => (prev.includes(tournamentId) ? prev : [...prev, tournamentId]));
      if (res.tournament) {
        setTournaments(prev => prev.map(t => (t.id === tournamentId ? transformTournament(res.tournament) : t)));
      }
      // Reload team & registrations data to keep backend sync seamless across all tabs
      await loadMyTeamAndRegistrations(auth.token);
      await refreshTournaments();
    } catch (err) {
      alert(err.message || "Could not register for this tournament.");
    }
  };

  const handleUnregisterTournament = async (tournamentId) => {
    if (!auth.token) return;
    if (!window.confirm("Are you sure you want to cancel registration for this tournament?")) return;
    try {
      const res = await apiRequest(`/tournaments/${tournamentId}/unregister`, {
        method: "POST",
        token: auth.token,
      });
      setRegisteredIds(prev => prev.filter(id => id !== tournamentId));
      if (res.tournament) {
        setTournaments(prev => prev.map(t => (t.id === tournamentId ? transformTournament(res.tournament) : t)));
      }
      await loadMyTeamAndRegistrations(auth.token);
      await refreshTournaments();
    } catch (err) {
      alert(err.message || "Could not cancel tournament registration.");
    }
  };

  const handleUmpireCreated = raw => setUmpires(prev => [transformUmpire(raw, prev.length), ...prev]);
  const handleUmpireUpdated = raw => {
    const t = transformUmpire(raw);
    setUmpires(prev => prev.map(u => u.id === t.id ? { ...u, ...t } : u));
  };
  const handleUmpireDeleted = id => {
    setUmpires(prev => prev.filter(u => u.id !== id));
  };

  const handleTournamentCreated = (newTournament) => {
    setTournaments(prev => [transformTournament(newTournament), ...prev.filter(x => x.id !== newTournament.id)]);
    if (newTournament?.creator_included && newTournament?.id) {
      setRegisteredIds(prev => (prev.includes(newTournament.id) ? prev : [...prev, newTournament.id]));
    }
    refreshTournaments();
    if (auth?.token) {
      loadMyTeamAndRegistrations(auth.token);
    }
  };
  const handleTournamentUpdated = (raw) => {
    const t = transformTournament(raw);
    setTournaments(prev => prev.map(item => item.id === t.id ? { ...item, ...t } : item));
    refreshTournaments();
  };
  const handleTournamentDeleted = (id) => {
    setTournaments(prev => prev.filter(item => item.id !== id));
    setRegisteredIds(prev => prev.filter(item => item !== id));
    refreshTournaments();
  };

  const handleGroundCreated = (newGround) => {
    setGrounds(prev => [transformGround(newGround), ...prev]);
  };

  const handleGroundUpdated = (updatedGround) => {
    const t = transformGround(updatedGround);
    setGrounds(prev => prev.map(g => g.id === t.id ? t : g));
  };

  const handleGroundDeleted = (id) => {
    setGrounds(prev => prev.filter(g => g.id !== id));
  };

  const handleChallengeCreated = (newChallenge) => {
    setChallenges(prev => [newChallenge, ...prev]);
  };

  const handleChallengeDeleted = (id) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  if (resetToken) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} resetToken={resetToken} initialMode="reset" />;
  }

  if (!authChecked) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#0d0f0d" }} />;
  }

  if (!auth.user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const content = {
    "Home": (
      <HomeTab
        setActiveTab={setActiveTab}
        grounds={grounds}
        tournaments={tournaments}
        challenges={challenges.filter(c => c.status === "open").map(normalizeChallenge)}
        allChallenges={challenges}
        onCreateChallenge={goCreateChallenge}
      />
    ),
    "Find Match": (
      <FindMatchTab
        acceptedChallenge={acceptedChallenge}
        onChallengeAccepted={handleChallengeAccepted}
        token={auth.token}
        user={auth.user}
        challenges={challenges}
        onChallengeCreated={handleChallengeCreated}
        onChallengeDeleted={handleChallengeDeleted}
        teammatePhones={teammates.phones}
        teammateIds={teammates.ids}
        autoOpenForm={autoOpenChallengeForm}
        onAutoOpenHandled={() => setAutoOpenChallengeForm(false)}
        entryMode={findMatchEntryMode}
      />
    ),
    "Grounds": (
      <GroundsTab
        grounds={grounds}
        token={auth.token}
        user={auth.user}
        teammateIds={teammates.ids}
        onGroundCreated={handleGroundCreated}
        onGroundUpdated={handleGroundUpdated}
        onGroundDeleted={handleGroundDeleted}
        onBook={g => setBookingModal({ type: "ground", item: g })}
      />
    ),
    "Umpires": (
      <UmpiresTab
        umpires={umpires}
        user={auth.user}
        token={auth.token}
        onCreated={handleUmpireCreated}
        onUpdated={handleUmpireUpdated}
        onDeleted={handleUmpireDeleted}
        onBook={u => setBookingModal({ type: "umpire", item: u })}
      />
    ),
    "Live Score": <LiveScoreTab user={auth.user} />,
    "Tournaments": (
      <TournamentsTab
        tournaments={tournaments}
        registeredIds={registeredIds}
        onRegister={handleRegisterTournament}
        onUnregister={handleUnregisterTournament}
        token={auth.token}
        currentUser={auth.user}
        myTeamId={myTeam?.id}
        teammates={teammates}
        onTournamentCreated={handleTournamentCreated}
        onTournamentUpdated={handleTournamentUpdated}
        onTournamentDeleted={handleTournamentDeleted}
      />
    ),
    "My Team": (
      <MyTeamTab
        acceptedChallenge={acceptedChallenge}
        registeredTournaments={registeredTournaments}
        tournaments={tournaments}
        myTeam={myTeam}
        bookings={bookings}
        onCancelChallenge={handleCancelAcceptedChallenge}
        onUnregisterTournament={handleUnregisterTournament}
        cancelling={cancellingChallenge}
        onOpenChat={setChatChallenge}
        challenges={challenges}
        teammatePhones={teammates.phones}
        teammateIds={teammates.ids}
        user={auth.user}
        token={auth.token}
      />
    )
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0d0f0d", fontFamily: "Inter, sans-serif" }}>
      <Navbar
        active={activeTab}
        setActive={handleNavTabClick}
        user={auth.user}
        onLogout={handleLogout}
        token={auth.token}
        notifications={pushNotifications}
        onMarkAllRead={handleMarkAllRead}
        onClearNotifications={handleClearNotifications}
        onOpenNotifications={() => {
          if (auth.token) loadNotifications(auth.token, true);
        }}
        onNotificationClick={handleNotificationNavigate}
        onUserUpdated={updatedUser => {
          setAuth(prev => ({ ...prev, user: updatedUser }));
          if (auth.token) loadTeammates(auth.token);
        }}
      />
      {backendStatus === "offline" && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="rounded-xl px-3 py-2 text-xs text-amber-400 flex items-center gap-2" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Backend not reachable at localhost:8000 — showing demo data. Bookings won't save until the server is running.
          </div>
        </div>
      )}
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-8">
        {content[activeTab]}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f0d]/95 backdrop-blur-md border-t border-[#242624] px-1 py-1 flex items-center justify-around pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-2xl">
        {[
          { id: "Home", label: "Home", icon: Home },
          { id: "Find Match", label: "Matches", icon: Swords },
          { id: "Live Score", label: "Live", icon: Radio, isLive: true },
          { id: "Grounds", label: "Grounds", icon: MapPin },
          { id: "Tournaments", label: "Tourneys", icon: Trophy },
          { id: "My Team", label: "My Team", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavTabClick(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 relative group transition-all"
            >
              {isSelected && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform group-active:scale-90 ${
                    isSelected ? "text-green-400" : "text-[#6b7a6b]"
                  }`}
                />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold mt-1 tracking-tight ${
                  isSelected ? "text-green-400" : "text-[#6b7a6b]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {bookingModal && (
        <BookingModal
          type={bookingModal.type}
          item={bookingModal.item}
          token={auth.token}
          onClose={() => setBookingModal(null)}
          onConfirm={handleBookingConfirm}
        />
      )}
      {chatChallenge && (
        <ChatModal
          challenge={{
            ...chatChallenge,
            myTeamName: chatChallenge.creator_id === auth.user.id ? chatChallenge.team_name : chatChallenge.accepted_by_team_name
          }}
          token={auth.token}
          onClose={() => setChatChallenge(null)}
        />
      )}
    </div>
  );
}