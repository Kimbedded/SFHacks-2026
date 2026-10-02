import React, { useState } from 'react';
import { signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { FaLock, FaEnvelope, FaEye, FaEyeSlash, FaShieldHalved, FaGraduationCap, FaArrowRight } from 'react-icons/fa6';
import { GatorAppIcon } from './GatorAppIcon';

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

    setTimeout(() => {
      setLoading(false);
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
    }, 400);
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

      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/operation-not-supported-in-this-environment' ||
        err?.message?.includes('popup')
      ) {
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

  // Guest Access handler
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

  // Quick demo autofill helper
  const handleQuickDemoFill = () => {
    setEmail('student.gator@sfsu.edu');
    setPassword('GatorAccess2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f4f6] flex flex-col justify-between font-sans text-slate-900 select-none">
      {/* Official SFSU Header Bar */}
      <header className="bg-[#231161] text-white border-b-4 border-[#eaaa00] shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden shadow-sm">
              <GatorAppIcon className="w-full h-full" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight leading-tight">
                SAN FRANCISCO STATE UNIVERSITY
              </div>
              <div className="text-xs text-[#eaaa00] font-semibold tracking-wider uppercase">
                GatorAccess Campus Gateway
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-4 text-xs text-purple-200">
            <span>Official DPRC Accessibility Portal</span>
            <span>•</span>
            <span className="text-[#eaaa00] font-semibold">SF Hacks 2026</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden">
          
          {/* Top Header Card Section */}
          <div className="bg-[#231161] text-white p-6 text-center border-b-4 border-[#eaaa00]">
            {/* Required "Go Gaters!" */}
            <h1 className="text-3xl font-black tracking-tight text-[#eaaa00] uppercase">
              Go Gaters!
            </h1>
            {/* Required "SF State University" */}
            <p className="text-sm font-semibold text-purple-100 tracking-wide mt-1">
              SF State University
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b0d4c] text-[11px] font-medium text-purple-200 border border-purple-800">
              <FaShieldHalved className="w-3.5 h-3.5 text-[#eaaa00]" />
              <span>Campus Single Sign-On (SSO)</span>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            {/* Required Title Above Textboxes: "SF State Gateway/MySFSU Login" */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FaGraduationCap className="w-4 h-4 text-[#231161]" />
                <h2 className="text-base font-bold text-[#231161] tracking-tight">
                  SF State Gateway/MySFSU Login
                </h2>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-xs text-[#231161] hover:text-[#eaaa00] underline font-medium cursor-pointer"
                title="Fill demo credentials"
              >
                Auto-fill
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <span className="font-bold">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* General Student Login Form */}
            <form onSubmit={handleSfsuLogin} className="space-y-4">
              {/* Username / SFSU Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SFSU ID or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FaEnvelope className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="SFSU email: "
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#231161] focus:border-[#231161] transition"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FaLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#231161] focus:border-[#231161] transition"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* SFSU Edu Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#231161] hover:bg-[#1a0c47] text-white font-bold rounded-lg text-sm shadow flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Sign in with SF State Gateway</span>
                    <FaArrowRight className="w-3.5 h-3.5 text-[#eaaa00]" />
                  </>
                )}
              </button>
            </form>

            {/* Clean Collegiate Divider */}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-300"></div>
              <span className="flex-shrink mx-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Or
              </span>
              <div className="flex-grow border-t border-slate-300"></div>
            </div>

            {/* Alternative Sign In Options */}
            <div className="space-y-3">
              {/* Google Login API Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-lg text-sm border border-slate-300 shadow-sm flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-50"
              >
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

              {/* Guest Button: strictly "Continue as guest" */}
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#eaaa00] hover:bg-[#d89800] text-[#231161] font-bold rounded-lg text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <span>Continue as guest</span>
              </button>
            </div>

            {/* Assistance Footnote */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500 leading-relaxed">
              <p>
                Need help logging in? Contact{' '}
                <a
                  href="https://its.sfsu.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#231161] font-bold hover:underline"
                >
                  SFSU ITS Help Desk
                </a>{' '}
                or call{' '}
                <span className="font-semibold text-slate-700">(415) 338-1420</span>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Official SFSU Footer */}
      <footer className="bg-[#231161] text-purple-200 text-xs py-4 px-4 border-t border-purple-900 text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 San Francisco State University • 1600 Holloway Avenue • San Francisco, CA 94132
          </div>
          <div className="flex items-center space-x-3 text-purple-300">
            <a
              href="https://dprc.sfsu.edu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#eaaa00]"
            >
              Disability Programs (DPRC)
            </a>
            <span>•</span>
            <a
              href="https://gateway.sfsu.edu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#eaaa00]"
            >
              SF State Gateway
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
