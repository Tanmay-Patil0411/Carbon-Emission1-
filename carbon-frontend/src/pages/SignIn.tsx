import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/api";
import {
  GlobeAltIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const AUTH_STATUS_KEY = "carbontrack_auth_status";

const IT_SECTOR_OPTIONS = [
  "Software Development & SaaS Enterprise",
  "Cloud Infrastructure & Managed Services (AWS / GCP / Azure)",
  "Offshore Development Center (ODC) & Tech Outsourcing",
  "IT Consulting & Digital Transformation",
  "Cybersecurity & Data Center Operations",
];

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Mode: "signin" | "register"
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");

  // Sign In State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register State (IT Firm specific)
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [itSector, setItSector] = useState(IT_SECTOR_OPTIONS[0]);
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation & Loading Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Clear auto-redirect so Sign In page can always be viewed directly when navigated to

  // Validation for Sign In
  const validateSignIn = () => {
    const errs: Record<string, string> = {};
    setFormError("");

    if (!email.trim()) {
      errs.email = "Please enter your email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = "Please enter a valid email address.";
      }
    }

    if (!password) {
      errs.password = "Please enter your password.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validation for Create Account (IT Firm)
  const validateRegister = () => {
    const errs: Record<string, string> = {};
    setFormError("");

    if (!fullName.trim()) {
      errs.fullName = "Full name is required.";
    }

    if (!regEmail.trim()) {
      errs.regEmail = "Please enter your email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(regEmail.trim())) {
        errs.regEmail = "Please enter a valid corporate email.";
      }
    }

    if (!companyName.trim()) {
      errs.companyName = "Enterprise / Organization name is required.";
    }

    if (!regPassword) {
      errs.regPassword = "Please enter your password.";
    } else if (regPassword.length < 6) {
      errs.regPassword = "Password must be at least 6 characters.";
    }

    if (regPassword !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler for Sign In
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignIn()) return;

    setIsLoading(true);
    setFormError("");

    try {
      await login(email.trim(), password);
      localStorage.setItem(AUTH_STATUS_KEY, "authenticated");
      sessionStorage.setItem("carbontrack_session_active", "true");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (!err.response) {
        setFormError("Unable to connect to server. Please try again.");
      } else {
        setFormError(err?.response?.data?.message || err?.message || "Invalid email or password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Handler for Create Account
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setIsLoading(true);
    setFormError("");

    try {
      // 1. Call API register
      await auth.register({
        email: regEmail.trim(),
        password: regPassword,
        full_name: fullName.trim(),
        organization_name: companyName.trim(),
      });

      // 2. Perform login and store token
      await login(regEmail.trim(), regPassword);
      localStorage.setItem(AUTH_STATUS_KEY, "authenticated");
      sessionStorage.setItem("carbontrack_session_active", "true");
      setSuccessMsg("Account created successfully! Redirecting...");

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 800);
    } catch (err: any) {
      console.error("Registration failed:", err);
      if (!err.response) {
        setFormError("Unable to connect to server. Please try again.");
      } else {
        setFormError(err?.response?.data?.message || err?.message || "An account with this email address already exists.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(AUTH_STATUS_KEY, "guest");
    sessionStorage.setItem("carbontrack_session_active", "true");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT BRAND PANEL */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />

          <div className="relative z-10">
            {/* Logo Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <GlobeAltIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl leading-none text-white tracking-tight">
                  CarbonTrack
                </h1>
                <p className="text-xs text-emerald-400 font-medium mt-1">
                  Environmental ESG Intelligence
                </p>
              </div>
            </div>

            {/* Value Proposition */}
            <div className="mt-12 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <ShieldCheckIcon className="w-4 h-4" /> Enterprise Carbon Accounting
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {authMode === "signin"
                  ? "Automate Scope 1-3 ESG Compliance & Net-Zero Tracking."
                  : "Onboard Your IT Firm for Automated ESG & Footprint Intelligence."}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Empower your IT organization with real-time GHG emissions analytics, audit-ready PDF evidence verification, and decarbonization intelligence.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>GHG Protocol Standard</span>
            <span>ISO 14064 Verified</span>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="lg:col-span-7 bg-slate-900 p-8 sm:p-10 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* MODE SWITCHER TABS */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setErrors({});
                  setFormError("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  authMode === "signin"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setErrors({});
                  setFormError("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  authMode === "register"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Header Title */}
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {authMode === "signin"
                  ? "Sign in to your account"
                  : "Create IT Enterprise Account"}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5">
                {authMode === "signin"
                  ? "Enter your corporate credentials to access enterprise ESG analytics."
                  : "Register your IT firm to begin tracking Scope 1-3 carbon emissions."}
              </p>
            </div>

            {/* Alert Messages */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{formError}</div>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircleIcon className="w-5 h-5 shrink-0" />
                <div>{successMsg}</div>
              </div>
            )}

            {/* FORM: SIGN IN */}
            {authMode === "signin" ? (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Corporate Email or Username
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="user@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-rose-400 font-medium">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-rose-400 font-medium">{errors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* FORM: CREATE ACCOUNT (IT FIRM SPECIFIC) */
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Administrator Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[10px] text-rose-400 font-medium">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Corporate Email Address *
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="s.jenkins@apexcloud.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {errors.regEmail && (
                    <p className="text-[10px] text-rose-400 font-medium">{errors.regEmail}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      IT Company / Enterprise Name *
                    </label>
                    <div className="relative">
                      <BuildingOfficeIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Apex Cloud Solutions"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-[10px] text-rose-400 font-medium">{errors.companyName}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      IT Sector Domain
                    </label>
                    <div className="relative">
                      <BriefcaseIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={itSector}
                        onChange={(e) => setItSector(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none"
                      >
                        {IT_SECTOR_OPTIONS.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Create Password *
                    </label>
                    <div className="relative">
                      <LockClosedIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    {errors.regPassword && (
                      <p className="text-[10px] text-rose-400 font-medium">{errors.regPassword}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <LockClosedIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[10px] text-rose-400 font-medium">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-3"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Register IT Firm & Enter App</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="w-full border-t border-slate-800" />
              <span className="bg-slate-900 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Or Continue As Guest
              </span>
            </div>

            {/* Skip Guest Action */}
            <div>
              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition duration-200 flex items-center justify-center gap-2"
              >
                Skip & Explore Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
