import React, { useState, useEffect } from "react";
import AdminDashboard from "./app/components/AdminDashboard.jsx";
import { apiRequest } from "./app/api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("admin_token") || null);
  const [checking, setChecking] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("admin_user");
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.is_admin) {
          setUser(parsed);
        } else {
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_user");
          setToken(null);
        }
      } catch {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        setToken(null);
      }
    }
    setChecking(false);
  }, []);

  const handleLogin = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user: loggedInUser, token: newToken } = await apiRequest("/auth/login", {
        method: "POST",
        body: { identifier, password }
      });
      if (!loggedInUser?.is_admin) {
        setError("This account does not have admin access.");
        setLoading(false);
        return;
      }
      localStorage.setItem("admin_token", newToken);
      localStorage.setItem("admin_user", JSON.stringify(loggedInUser));
      setToken(newToken);
      setUser(loggedInUser);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setUser(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0f0d] text-white">
        Loading...
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0f0d] px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#151715] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
          <div className="text-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#16a34a] flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-black text-lg">MC</span>
            </div>
            <h1 className="text-lg font-bold text-white">Admin Login</h1>
            <p className="text-xs text-[#6b7a6b] mt-1">MatchConnect Admin Panel</p>
          </div>
          {error && (
            <div className="text-xs rounded-lg p-2.5 bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}
          <input
            type="text"
            required
            placeholder="Email or phone number"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-white outline-none"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-white outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-[#22c55e] text-black disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Log In"}
          </button>
        </form>
      </div>
    );
  }

  return <AdminDashboard user={user} token={token} theme="dark" onLogout={handleLogout} />;
}
