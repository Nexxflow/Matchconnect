import React, { useState, useEffect, createContext, useContext } from "react";
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Shield, Calendar, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "../../api";
import TermsModal from "../TermsModal";
import TermsContent from "../TermsContent";

const AuthThemeContext = createContext("dark");

// ─── Shared field styles (supports both light and dark themes) ───────────
function Field({ icon: Icon, ...props }) {
  const theme = useContext(AuthThemeContext);
  const isLight = theme === "light";
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }} />
      <input
        {...props}
        className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#1a1a1a",
          border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
          color: isLight ? "#0f172a" : "#f0f2f0"
        }}
        onFocus={e => (e.target.style.borderColor = isLight ? "#16a34a" : "#22c55e")}
        onBlur={e => (e.target.style.borderColor = isLight ? "#cbd5e1" : "#2a2a2a")}
      />
    </div>
  );
}

function PasswordField({ value, onChange, placeholder = "Password" }) {
  const theme = useContext(AuthThemeContext);
  const isLight = theme === "light";
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }} />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-colors"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#1a1a1a",
          border: `1px solid ${isLight ? "#cbd5e1" : "#2a2a2a"}`,
          color: isLight ? "#0f172a" : "#f0f2f0"
        }}
        onFocus={e => (e.target.style.borderColor = isLight ? "#16a34a" : "#22c55e")}
        onBlur={e => (e.target.style.borderColor = isLight ? "#cbd5e1" : "#2a2a2a")}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: isLight ? "#94a3b8" : "#4a5a4a" }}
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
      style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
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
      style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#16a34a" }}
    >
      <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {message}
    </div>
  );
}

function SubmitButton({ children, loading, disabled }) {
  const theme = useContext(AuthThemeContext);
  const isLight = theme === "light";
  const isDisabled = disabled || loading;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer"
      style={
        isDisabled
          ? {
              backgroundColor: isLight ? "#f1f5f9" : "#1e211e",
              color: isLight ? "#94a3b8" : "#3a3a3a",
              cursor: "not-allowed"
            }
          : {
              backgroundColor: isLight ? "#16a34a" : "#22c55e",
              color: isLight ? "#ffffff" : "#000"
            }
      }
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}

// ─── Login ──────────────────────────────────────────────────────────────────
function LoginForm({ onAuthSuccess, onSwitch, notice }) {
  const theme = useContext(AuthThemeContext);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await apiRequest("/auth/login", {
        method: "POST",
        body: { identifier, password }
      });
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
      <Field
        icon={User}
        type="text"
        required
        placeholder="Email or phone number"
        value={identifier}
        onChange={e => setIdentifier(e.target.value)}
      />
      <PasswordField value={password} onChange={e => setPassword(e.target.value)} />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSwitch("forgot")}
          className={`text-xs font-semibold cursor-pointer ${theme === "light" ? "text-emerald-600 hover:text-emerald-700" : "text-green-400 hover:text-green-300"}`}
        >
          Forgot password?
        </button>
      </div>
      <SubmitButton loading={loading}>Log In</SubmitButton>
      <p className="text-center text-xs" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>
        New to MatchConnect?{" "}
        <button
          type="button"
          onClick={() => onSwitch("register")}
          className={`font-semibold cursor-pointer ${theme === "light" ? "text-emerald-600 hover:text-emerald-700" : "text-green-400 hover:text-green-300"}`}
        >
          Create an account
        </button>
      </p>
    </form>
  );
}

// ─── Register ───────────────────────────────────────────────────────────────
// Step 1: Captures name, email, phone, password, team details.
// Clicking "Create Account" navigates to Step 2 (separate Terms & Conditions page).
// Step 2: Renders all 14 conditions directly on the page with a checkbox below.
// The account cannot be created without accepting the terms.
function RegisterForm({ onSwitch, step = 1, onStepChange, theme = "dark" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [villageName, setVillageName] = useState("");
  const [teamYear, setTeamYear] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentYear = new Date().getFullYear();

  // STEP 1: Validate account details, then advance to Terms page
  const handleProceedToTerms = e => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid email address is required");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (teamYear && (Number(teamYear) < 1900 || Number(teamYear) > currentYear)) {
      setError(`Team year must be between 1900 and ${currentYear}`);
      return;
    }

    // Advance to next page: Terms & Conditions
    onStepChange?.(2);
  };

  // STEP 2: Final submit after reading & checking Terms
  const handleFinalSubmit = async e => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("You must accept the Terms & Conditions with the checkbox below before creating your account.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiRequest("/auth/signup", {
        method: "POST",
        body: {
          name,
          email,
          phone,
          password,
          team_name: teamName || undefined,
          village_name: villageName || undefined,
          team_year: teamYear || undefined,
          terms_accepted: true
        }
      });
      // Registering no longer logs the user in — send them to login instead.
      onSwitch("login", "Account created successfully! Please log in.");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    // ─── STEP 2: Separate Terms & Conditions Page ────────────────────────────
    return (
      <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in fade-in duration-200">
        <ErrorBanner message={error} />

        {/* Scrollable Terms Content Area */}
        <div
          className="rounded-xl p-4 sm:p-5 overflow-y-auto space-y-4 pr-3"
          style={{
            backgroundColor: theme === "light" ? "#f8fafc" : "#101210",
            border: `1px solid ${theme === "light" ? "#e2e8f0" : "#242924"}`,
            maxHeight: "52vh"
          }}
        >
          <TermsContent theme={theme} />
        </div>

        {/* Checkbox below the conditions */}
        <div
          className="p-3.5 rounded-xl transition-all"
          style={{
            backgroundColor: termsAccepted ? "rgba(34, 197, 94, 0.08)" : (theme === "light" ? "#f8fafc" : "#181a18"),
            border: termsAccepted ? "1px solid rgba(34, 197, 94, 0.35)" : `1px solid ${theme === "light" ? "#e2e8f0" : "#2a2a2a"}`
          }}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="accept-terms-checkbox"
              checked={termsAccepted}
              onChange={e => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="mt-0.5 w-4 h-4 rounded border-green-500 text-green-500 focus:ring-green-500 cursor-pointer accent-green-500"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold" style={{ color: theme === "light" ? "#0f172a" : "#f0f2f0" }}>
                I have read and accept the Terms &amp; Conditions
              </span>
              <p className="text-[11px] mt-0.5" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>
                By checking this box, you confirm that you agree to all the rules, payment terms, and policies above.
              </p>
            </div>
          </label>
        </div>

        <SubmitButton loading={loading} disabled={!termsAccepted}>
          Accept Terms &amp; Complete Registration
        </SubmitButton>

        <button
          type="button"
          onClick={() => {
            setError(null);
            onStepChange?.(1);
          }}
          className="w-full py-2 rounded-xl text-xs font-semibold transition-colors text-center"
          style={{ color: theme === "light" ? "#64748b" : "#a3a3a3" }}
        >
          &larr; Back to Edit Account Details
        </button>
      </form>
    );
  }

  // ─── STEP 1: Details Form ──────────────────────────────────────────────────
  return (
    <form onSubmit={handleProceedToTerms} className="space-y-3 animate-in fade-in duration-200">
      <ErrorBanner message={error} />
      <Field icon={User} required placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
      <Field icon={Phone} type="tel" required placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
      <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min. 8 characters)" />

      <div className="pt-1 pb-0.5 flex items-center gap-1.5">
        <span className="h-px flex-1" style={{ backgroundColor: theme === "light" ? "#e2e8f0" : "#2a2a2a" }} />
        <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>Team details</span>
        <span className="h-px flex-1" style={{ backgroundColor: theme === "light" ? "#e2e8f0" : "#2a2a2a" }} />
      </div>

      <Field icon={Shield} placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} />
      <Field icon={MapPin} placeholder="Village / town name" value={villageName} onChange={e => setVillageName(e.target.value)} />
      <Field
        icon={Calendar}
        type="number"
        min="1900"
        max={currentYear}
        placeholder="Year team was formed"
        value={teamYear}
        onChange={e => setTeamYear(e.target.value)}
      />
      <p className="text-[11px] -mt-1" style={{ color: theme === "light" ? "#64748b" : "#4a5a4a" }}>
        Teammates who register with the same team name, village and year are grouped together automatically.
      </p>

      <SubmitButton>
        Create Account
      </SubmitButton>
      <p className="text-center text-xs" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className={`font-semibold cursor-pointer ${theme === "light" ? "text-emerald-600 hover:text-emerald-700" : "text-green-400 hover:text-green-300"}`}
        >
          Log in
        </button>
      </p>
    </form>
  );
}

// ─── Forgot password (request reset link) ─────────────────────────────────
function ForgotPasswordForm({ onSwitch }) {
  const theme = useContext(AuthThemeContext);
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
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}>Check your email</p>
        <p className="text-xs mb-5" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>
          If an account exists for {email}, a password reset link is on its way.
        </p>
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className={`text-xs font-semibold cursor-pointer ${theme === "light" ? "text-emerald-600 hover:text-emerald-700" : "text-green-400 hover:text-green-300"}`}
        >
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs mb-1" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>
        Enter the email on your account and we'll send you a link to reset your password.
      </p>
      <ErrorBanner message={error} />
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
      <SubmitButton loading={loading}>Send Reset Link</SubmitButton>
      <button
        type="button"
        onClick={() => onSwitch("login")}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium mt-1 cursor-pointer"
        style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to log in
      </button>
    </form>
  );
}

// ─── Reset password (arrived via emailed link with a token) ────────────────
function ResetPasswordForm({ token, onSwitch }) {
  const theme = useContext(AuthThemeContext);
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
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: password }
      });
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
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}>Password updated</p>
        <p className="text-xs mb-5" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>You can now log in with your new password.</p>
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className={`text-xs font-semibold cursor-pointer ${theme === "light" ? "text-emerald-600 hover:text-emerald-700" : "text-green-400 hover:text-green-300"}`}
        >
          Go to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs mb-1" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>Choose a new password for your account.</p>
      <ErrorBanner message={error} />
      <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (min. 8 characters)" />
      <PasswordField value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" />
      <SubmitButton loading={loading}>Reset Password</SubmitButton>
    </form>
  );
}

// ─── Root Auth screen ───────────────────────────────────────────────────────
// mode: "login" | "register" | "forgot" | "reset"
export default function AuthScreen({ onAuthSuccess, initialMode = "login", theme }) {
  const [mode, setMode] = useState(initialMode);
  const [registerStep, setRegisterStep] = useState(1);
  const [resetToken, setResetToken] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showFooterTerms, setShowFooterTerms] = useState(false);

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
    setRegisterStep(1);
  };

  const isTermsPage = mode === "register" && registerStep === 2;

  const titles = {
    login: ["Welcome back", "Log in to book grounds, umpires, and find your next match."],
    register: isTermsPage
      ? ["Terms & Conditions", "Review and accept the platform conditions below to complete registration."]
      : ["Create your account", "Join MatchConnect to start booking and playing."],
    forgot: ["Reset your password", ""],
    reset: ["Set a new password", ""]
  };
  const [title, subtitle] = titles[mode];

  return (
    <AuthThemeContext.Provider value={theme}>
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: theme === "light" ? "#f8fafc" : "#0d0f0d" }}>
        <div className={`w-full transition-all duration-300 ${isTermsPage ? "max-w-2xl" : "max-w-sm"}`}>
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#16a34a] flex items-center justify-center mb-3 shadow-md">
              <span className="text-white font-black text-lg">MC</span>
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}>MatchConnect</span>
          </div>

          <div className="rounded-2xl p-6 sm:p-7 shadow-xl transition-all" style={{ backgroundColor: theme === "light" ? "#ffffff" : "#151715", border: `1px solid ${theme === "light" ? "#e2e8f0" : "#2a2a2a"}` }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h1 className="text-lg font-bold" style={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}>{title}</h1>
              {isTermsPage && (
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${theme === "light" ? "text-emerald-700 bg-emerald-50 border-emerald-300" : "text-green-400 bg-green-500/10 border-green-500/20"}`}>
                  Step 2 of 2
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs mb-5" style={{ color: theme === "light" ? "#64748b" : "#6b7a6b" }}>{subtitle}</p>}
            {mode !== "forgot" && mode !== "reset" && !subtitle && <div className="mb-5" />}

            {mode === "login" && <LoginForm onAuthSuccess={onAuthSuccess} onSwitch={handleSwitch} notice={notice} />}
            {mode === "register" && (
              <RegisterForm
                onSwitch={handleSwitch}
                step={registerStep}
                onStepChange={setRegisterStep}
                theme={theme}
              />
            )}
            {mode === "forgot" && <ForgotPasswordForm onSwitch={handleSwitch} />}
            {mode === "reset" && <ResetPasswordForm token={resetToken} onSwitch={handleSwitch} />}
          </div>

          {/* Global Footer link to view Terms & Conditions anytime */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowFooterTerms(true)}
              className={`text-[11px] transition-colors underline cursor-pointer ${theme === "light" ? "text-slate-500 hover:text-slate-700" : "text-neutral-500 hover:text-neutral-300"}`}
            >
              Terms &amp; Conditions
            </button>
          </div>

          <TermsModal
            isOpen={showFooterTerms}
            onClose={() => setShowFooterTerms(false)}
            theme={theme}
          />
        </div>
      </div>
    </AuthThemeContext.Provider>
  );
}