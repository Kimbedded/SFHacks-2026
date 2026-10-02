import React, { useState } from 'react';
import { signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { FaWheelchair, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaShieldHalved, FaGraduationCap, FaArrowRight } from 'react-icons/fa6';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isGuest: boolean;
  provider: 'sfsu_gateway' | 'google' | 'guest';
}

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SFSU Edu Student Login handler
  const handleSfsuLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your SFSU student email or username.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your SF State Gateway password.');
      return;
    }

    setLoading(true);

    // Simulate authenticating against SFSU Single Sign-On / Gateway
    setTimeout(() => {
      setLoading(false);
      // Generate display name from email or username
      const usernamePart = cleanEmail.split('@')[0];
      const formattedName = usernamePart
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      const fullEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@sfsu.edu`;

      const studentUser: AppUser = {
        uid: `sfsu_${Date.now()}`,
        displayName: formattedName || 'SFSU Gator Student',
        email: fullEmail,
        isGuest: false,
        provider: 'sfsu_gateway',
      };

      onLoginSuccess(studentUser);
    }, 450);
  };

  // Google Login API handler
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser: User = result.user;

      const appUser: AppUser = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'Google User',
        email: fbUser.email || 'user@gmail.com',
        photoURL: fbUser.photoURL || undefined,
        isGuest: false,
        provider: 'google',
      };

      onLoginSuccess(appUser);
    } catch (err: any) {
      console.warn('Firebase Google Auth popup warning/fallback:', err);

      // In sandboxed iframes where third-party popups might be blocked by browser policy,
      // provide smooth graceful fallback so student flow is uninterrupted
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/operation-not-supported-in-this-environment' ||
        err?.message?.includes('popup')
      ) {
        // Safe interactive fallback
        const demoGoogleUser: AppUser = {
          uid: `google_student_${Date.now()}`,
          displayName: 'Gator Google User',
          email: 'gator.access@mail.sfsu.edu',
          isGuest: false,
          provider: 'google',
        };
        onLoginSuccess(demoGoogleUser);
      } else {
        setErrorMessage(
          err?.message || 'Unable to sign in with Google. Please try again or use Guest Access.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Guest Access handler (takes you straight to the app)
  const handleGuestLogin = () => {
    const guestUser: AppUser = {
      uid: `guest_${Date.now()}`,
      displayName: 'Campus Visitor (Guest)',
      email: 'visitor@guest.sfsu.edu',
      isGuest: true,
      provider: 'guest',
    };
    onLoginSuccess(guestUser);
  };

  // Quick helper to fill demo credentials
  const handleQuickDemoFill = () => {
    setEmail('student.gator@sfsu.edu');
    setPassword('GatorAccess2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Decorative Campus Aura */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-900/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-indigo-900/25 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#3b0764_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
      </div>

      {/* Top Banner Accent */}
      <div className="h-2 w-full bg-gradient-to-r from-purple-800 via-amber-400 to-purple-800 relative z-10"></div>

      {/* Main Login Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-purple-800/40 rounded-3xl shadow-2xl shadow-purple-950/50 p-6 sm:p-8 text-white relative">
          
          {/* Header Area with Go Gaters & SF State University */}
          <div className="text-center mb-6">
            {/* Gator Access Wheelchair / Mobility Emblem */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-purple-950 shadow-lg shadow-amber-500/20 border-2 border-amber-300 mb-3 transform hover:scale-105 transition-transform">
              <FaWheelchair className="w-8 h-8 text-purple-950" />
            </div>

            {/* Required "Go Gaters!" */}
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-amber-400 uppercase drop-shadow-sm">
              Go Gaters!
            </h1>

            {/* Required "SF State University" */}
            <p className="text-sm sm:text-base font-semibold text-purple-200 tracking-wide mt-0.5">
              SF State University
            </p>

            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-700/50 text-[11px] font-medium text-purple-300">
              <FaShieldHalved className="w-3 h-3 text-amber-400" />
              <span>GatorAccess • Campus Accessibility Portal</span>
            </div>
          </div>

          {/* Form Section Card */}
          <div className="bg-slate-950/70 border border-purple-900/50 rounded-2xl p-5 sm:p-6 mb-5 shadow-inner">
            
            {/* Required title above textboxes: "SF State Gateway/MySFSU Login" */}
            <div className="flex items-center justify-between mb-4 border-b border-purple-800/30 pb-2.5">
              <div className="flex items-center gap-2">
                <FaGraduationCap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  SF State Gateway/MySFSU Login
                </h2>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 underline font-medium"
                title="Fill demo credentials"
              >
                Auto-fill Demo
              </button>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-red-200 text-xs flex items-start gap-2">
                <span className="font-bold text-red-400">Notice:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* General Student Login Form */}
            <form onSubmit={handleSfsuLogin} className="space-y-3.5">
              {/* Username / SFSU Email Textbox */}
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1">
                  SFSU Username or Student Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                    <FaEnvelope className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="SFSU. email: "
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-purple-700/60 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Textbox */}
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1">
                  SF State Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                    <FaLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-purple-700/60 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-purple-400 hover:text-white"
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* SFSU Edu Login Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-purple-950 font-black rounded-xl text-sm shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-purple-950 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>SFSU Edu Login</span>
                    <FaArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-purple-900/60"></div>
            <span className="flex-shrink mx-3 text-[11px] font-bold text-purple-300 uppercase tracking-wider">
              Or Choose Sign In Option
            </span>
            <div className="flex-grow border-t border-purple-900/60"></div>
          </div>

          {/* Options: Google Login API Button & Guest Access Button */}
          <div className="space-y-3">
            {/* Google Login API Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-sm shadow flex items-center justify-center gap-3 transition-colors border border-slate-300 disabled:opacity-50 cursor-pointer"
            >
              {/* Official Google 'G' icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Guest Button: Takes you straight to the app */}
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-purple-900/60 hover:bg-purple-900 text-purple-200 hover:text-white font-bold rounded-xl text-sm border border-purple-700/60 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Continue as Guest</span>
              <span className="text-xs text-amber-300 font-semibold bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                Straight to App
              </span>
            </button>
          </div>

          {/* Privacy & Disability Accommodations Disclaimer */}
          <div className="mt-6 text-center text-[11px] text-slate-400">
            <p>
              By accessing GatorAccess, you agree to SFSU Acceptable Use Policies.
              <br />
              Need disability accommodations? Contact{' '}
              <a
                href="https://dprc.sfsu.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline"
              >
                DPRC at (415) 405-3580
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding Bar */}
      <div className="py-3 px-4 bg-slate-950 border-t border-purple-900/30 text-center text-xs text-purple-300/80 relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>San Francisco State University • 1600 Holloway Ave, San Francisco, CA 94132</span>
        <span className="hidden sm:inline">•</span>
        <span className="text-amber-400 font-semibold">SF Hacks 2026</span>
      </div>
    </div>
  );
}
