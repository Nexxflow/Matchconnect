import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("Home");
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

      const myPhone = normalizePhone(user?.phone);
      const myActive = myPhone
        ? allChallenges.find(
            c =>
              c.status === "accepted" &&
              (normalizePhone(c.contact_no) === myPhone ||
                normalizePhone(c.accepted_by_contact_no) === myPhone)
          )
        : null;
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
      const fcmToken = await requestNotificationPermission();
      if (!fcmToken) return;

      await apiRequest("/notifications/save-token", {
        method: "POST",
        token,
        body: { token: fcmToken },
      });
    } catch (err) {
      console.error("FCM Registration Error:", err);
    }
  };

  useEffect(() => {
    let unsubscribe;
    (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      unsubscribe = onMessage(messaging, payload => {
        setPushNotifications(prev => [
          {
            id: Date.now(),
            title: payload?.notification?.title || "MatchConnect",
            body: payload?.notification?.body || ""
          },
          ...prev
        ]);
      });
    })();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
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

  const handleCancelAcceptedChallenge = async () => {
    if (!acceptedChallenge || !auth.token) return;
    setCancellingChallenge(true);
    try {
      const res = await apiRequest(`/challenges/${acceptedChallenge.id}/cancel`, { method: "POST", token: auth.token });
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
    if (!myTeam) {
      alert("You need a registered team before joining a tournament. Add your team details in Edit Profile first.");
      return;
    }
    try {
      const res = await apiRequest(`/tournaments/${tournamentId}/register`, {
        method: "POST",
        token: auth.token,
        body: { team_id: myTeam.id },
      });
      setRegisteredIds(prev => (prev.includes(tournamentId) ? prev : [...prev, tournamentId]));
      if (res.tournament) {
        setTournaments(prev => prev.map(t => (t.id === tournamentId ? transformTournament(res.tournament) : t)));
      } else {
        refreshTournaments();
      }
    } catch (err) {
      alert(err.message || "Could not register for this tournament.");
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
    setTournaments(prev => [transformTournament(newTournament), ...prev]);
  };
  const handleTournamentUpdated = (updated) => {
    const t = transformTournament(updated);
    setTournaments(prev => prev.map(x => x.id === t.id ? t : x));
  };
  const handleTournamentDeleted = (id) => {
    setTournaments(prev => prev.filter(x => x.id !== id));
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
        token={auth.token}
        currentUser={auth.user}
        myTeamId={myTeam?.id}
        onTournamentCreated={handleTournamentCreated}
        onTournamentUpdated={handleTournamentUpdated}
        onTournamentDeleted={handleTournamentDeleted}
      />
    ),
    "My Team": (
      <MyTeamTab
        acceptedChallenge={acceptedChallenge}
        registeredTournaments={registeredTournaments}
        bookings={bookings}
        onCancelChallenge={handleCancelAcceptedChallenge}
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
        pushCount={pushNotifications.length}
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
      <main className="max-w-3xl mx-auto px-4 py-6">
        {content[activeTab]}
      </main>
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