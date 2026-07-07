import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "../../api";

// ─── Shared field styles (matches the rest of the app's dark theme) ───────────
function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4a5a4a" }} />
      <input
        {...props}
        className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
        style={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          color: "#f0f2f0"
        }}
        onFocus={e => (e.target.style.borderColor = "#22c55e")}
        onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
      />
    </div>
  );
}

function PasswordField({ value, onChange, placeholder = "Password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4a5a4a" }} />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-colors"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#f0f2f0" }}
        onFocus={e => (e.target.style.borderColor = "#22c55e")}
        onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: "#4a5a4a" }}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="text-xs mb-3 rounded-lg p-2.5 flex items-start gap-2"
      style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {message}
    </div>
  );
}

function NoticeBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="text-xs mb-3 rounded-lg p-2.5 flex items-start gap-2"
      style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" }}
    >
      <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {message}
    </div>
  );
}

function SubmitButton({ children, loading, disabled }) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="w-full py-3 rounded-xl font-bold text-sm transition-colors"
      style={
        isDisabled
          ? { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }
          : { backgroundColor: "#22c55e", color: "#000" }
      }
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}

// ─── Login ──────────────────────────────────────────────────────────────────
function LoginForm({ onAuthSuccess, onSwitch, notice }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await apiRequest("/auth/login", { method: "POST", body: { email, password } });
      onAuthSuccess(user, token);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!error && <NoticeBanner message={notice} />}
      <ErrorBanner message={error} />
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
      <PasswordField value={password} onChange={e => setPassword(e.target.value)} />
      <div className="flex justify-end">
        <button type="button" onClick={() => onSwitch("forgot")} className="text-xs font-medium text-green-400 hover:text-green-300">
          Forgot password?
        </button>
      </div>
      <SubmitButton loading={loading}>Log In</SubmitButton>
      <p className="text-center text-xs" style={{ color: "#6b7a6b" }}>
        New to MatchConnect?{" "}
        <button type="button" onClick={() => onSwitch("register")} className="font-semibold text-green-400 hover:text-green-300">
          Create an account
        </button>
      </p>
    </form>
  );
}

// ─── Register ───────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/auth/signup", {
        method: "POST",
        body: { name, email, phone, password }
      });
      // Registering no longer logs the user in — send them to login instead.
      onSwitch("login", "Account created! Please log in.");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBanner message={error} />
      <Field icon={User} required placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
      <Field icon={Phone} type="tel" required placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
      <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min. 8 characters)" />
      <SubmitButton loading={loading}>Create Account</SubmitButton>
      <p className="text-center text-xs" style={{ color: "#6b7a6b" }}>
        Already have an account?{" "}
        <button type="button" onClick={() => onSwitch("login")} className="font-semibold text-green-400 hover:text-green-300">
          Log in
        </button>
      </p>
    </form>
  );
}

// ─── Forgot password (request reset link) ─────────────────────────────────
function ForgotPasswordForm({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/auth/forgot-password", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}
        >
          <CheckCircle className="w-7 h-7 text-green-400" />
        </div>
        <p className="text-sm text-white font-semibold mb-1">Check your email</p>
        <p className="text-xs mb-5" style={{ color: "#6b7a6b" }}>
          If an account exists for {email}, a password reset link is on its way.
        </p>
        <button type="button" onClick={() => onSwitch("login")} className="text-xs font-semibold text-green-400 hover:text-green-300">
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs mb-1" style={{ color: "#6b7a6b" }}>
        Enter the email on your account and we'll send you a link to reset your password.
      </p>
      <ErrorBanner message={error} />
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
      <SubmitButton loading={loading}>Send Reset Link</SubmitButton>
      <button
        type="button"
        onClick={() => onSwitch("login")}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium mt-1"
        style={{ color: "#6b7a6b" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to log in
      </button>
    </form>
  );
}

// ─── Reset password (arrived via emailed link with a token) ────────────────
function ResetPasswordForm({ token, onSwitch }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/auth/reset-password/${token}`, { method: "POST", body: { password } });
      setDone(true);
      // Clean the token out of the URL so refreshing doesn't re-trigger reset mode.
      window.history.replaceState({}, "", "/");
    } catch (err) {
      setError(err.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}
        >
          <CheckCircle className="w-7 h-7 text-green-400" />
        </div>
        <p className="text-sm text-white font-semibold mb-1">Password updated</p>
        <p className="text-xs mb-5" style={{ color: "#6b7a6b" }}>You can now log in with your new password.</p>
        <button type="button" onClick={() => onSwitch("login")} className="text-xs font-semibold text-green-400 hover:text-green-300">
          Go to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs mb-1" style={{ color: "#6b7a6b" }}>Choose a new password for your account.</p>
      <ErrorBanner message={error} />
      <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (min. 8 characters)" />
      <PasswordField value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" />
      <SubmitButton loading={loading}>Reset Password</SubmitButton>
    </form>
  );
}

// ─── Root Auth screen ───────────────────────────────────────────────────────
// mode: "login" | "register" | "forgot" | "reset"
export default function AuthScreen({ onAuthSuccess, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [resetToken, setResetToken] = useState(null);
  const [notice, setNotice] = useState(null);

  // Detect a reset link on load, e.g. https://yourapp.com/reset-password/<token>
  // This reads the token straight out of the URL, so clicking the emailed
  // link lands directly on the reset-password form.
  useEffect(() => {
    const match = window.location.pathname.match(/^\/reset-password\/([^/]+)/);
    if (match) {
      setResetToken(match[1]);
      setMode("reset");
    }
  }, []);

  const handleSwitch = (nextMode, message = null) => {
    setNotice(message);
    setMode(nextMode);
  };

  const titles = {
    login: ["Welcome back", "Log in to book grounds, umpires, and find your next match."],
    register: ["Create your account", "Join MatchConnect to start booking and playing."],
    forgot: ["Reset your password", ""],
    reset: ["Set a new password", ""]
  };
  const [title, subtitle] = titles[mode];

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0d0f0d" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center mb-3">
            <span className="text-black font-black text-lg">MC</span>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">MatchConnect</span>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }}>
          <h1 className="text-lg font-bold text-white mb-1">{title}</h1>
          {subtitle && <p className="text-xs mb-5" style={{ color: "#6b7a6b" }}>{subtitle}</p>}
          {mode !== "forgot" && mode !== "reset" && <div className="mb-5" />}

          {mode === "login" && <LoginForm onAuthSuccess={onAuthSuccess} onSwitch={handleSwitch} notice={notice} />}
          {mode === "register" && <RegisterForm onSwitch={handleSwitch} />}
          {mode === "forgot" && <ForgotPasswordForm onSwitch={handleSwitch} />}
          {mode === "reset" && <ResetPasswordForm token={resetToken} onSwitch={handleSwitch} />}
        </div>
      </div>
    </div>
  );
}