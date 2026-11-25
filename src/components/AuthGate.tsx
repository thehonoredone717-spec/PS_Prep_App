import { AlertTriangle, Eye, EyeOff, GraduationCap, Lock, LogIn, User, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  DISPLAY_NAME_MAX_LEN,
  auth,
  googleProvider,
  isValidUsername,
  normalizeUsername,
  sanitizeDisplayName,
  toAuthEmail,
} from '../firebase';
import { UILanguage } from '../types/quiz';

interface AuthGateProps {
  lang: UILanguage;
  onChangeLang: (lang: UILanguage) => void;
  onPrepareSignup: (username: string, displayName: string) => void;
}

type AuthTab = 'login' | 'register';

function mapAuthError(code: string | undefined, lang: UILanguage): string {
  const uz = lang === 'uz';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return uz
        ? "Foydalanuvchi nomi (yoki email) yoxud parol noto'g'ri."
        : 'Invalid username (or email) or password.';
    case 'auth/invalid-email':
      return uz
        ? "Email yoki foydalanuvchi nomi formati noto'g'ri."
        : 'Invalid email or username format.';
    case 'auth/email-already-in-use':
      return uz
        ? 'Bu foydalanuvchi nomi allaqachon band. Boshqasini tanlang yoki tizimga kiring.'
        : 'This username is already taken. Choose another one or sign in.';
    case 'auth/weak-password':
      return uz
        ? "Parol kamida 6 ta belgidan iborat bo'lishi kerak."
        : 'Password must be at least 6 characters long.';
    case 'auth/operation-not-allowed':
      return uz
        ? "Username + parol orqali kirish uchun Firebase Console'da Email/Password usulini yoqish kerak (Authentication -> Sign-in method -> Email/Password). Hozircha Google orqali kirishingiz mumkin."
        : 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication -> Sign-in method -> Email/Password). You can sign in with Google right now.';
    case 'auth/unauthorized-domain':
      return uz
        ? `Ushbu domen (${host}) Firebase Console -> Authentication -> Settings -> Authorized domains ro'yxatiga qo'shilmagan.`
        : `This domain (${host}) is not listed in Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    case 'auth/popup-blocked':
      return uz
        ? "Brauzer Google kirish oynasini (popup) blokladi. Iltimos, brauzerda popup oynalarga ruxsat bering."
        : 'Browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return uz
        ? 'Google kirish oynasi yopildi. Qayta urinib ko‘ring.'
        : 'Google sign-in popup was closed. Please try again.';
    case 'auth/network-request-failed':
      return uz
        ? "Tarmoq xatoligi yuz berdi. Internet aloqasini tekshirib qayta urinib ko'ring."
        : 'Network error occurred. Please check your connection and try again.';
    case 'auth/too-many-requests':
      return uz
        ? "Juda ko'p urinish bo'ldi. Biroz kutib qayta urinib ko'ring."
        : 'Too many attempts. Please wait a moment and try again.';
    default:
      return uz
        ? `Kirishda xatolik yuz berdi${code ? ` (${code})` : ''}. Qayta urinib ko'ring.`
        : `Authentication failed${code ? ` (${code})` : ''}. Please try again.`;
  }
}

export function AuthGate({ lang, onChangeLang, onPrepareSignup }: AuthGateProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uz = lang === 'uz';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const rawLogin = username.trim();
    if (!rawLogin) {
      setErrorMsg(uz ? 'Foydalanuvchi nomini kiriting.' : 'Please enter your username.');
      return;
    }

    if (tab === 'register') {
      const normalized = normalizeUsername(rawLogin);
      if (!isValidUsername(normalized)) {
        setErrorMsg(
          uz
            ? "Username 3–32 belgi bo'lishi va faqat kichik harf, raqam, '_' yoki '.' dan iborat bo'lishi kerak."
            : 'Username must be 3–32 characters using lowercase letters, numbers, underscores, or dots.'
        );
        return;
      }
      const cleanName = sanitizeDisplayName(displayName, normalized);
      if (cleanName.length < 2) {
        setErrorMsg(uz ? 'Ism va familiyangizni kiriting.' : 'Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg(
          uz
            ? "Parol kamida 6 ta belgidan iborat bo'lishi kerak."
            : 'Password must be at least 6 characters.'
        );
        return;
      }

      setBusy(true);
      try {
        onPrepareSignup(normalized, cleanName);
        const cred = await createUserWithEmailAndPassword(auth, toAuthEmail(normalized), password);
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        setErrorMsg(mapAuthError(code, lang));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg(uz ? 'Parolni kiriting.' : 'Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, toAuthEmail(rawLogin), password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setErrorMsg(mapAuthError(code, lang));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setErrorMsg(mapAuthError(code, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div
        role="alert"
        className="border-b border-rose-800 bg-rose-700 px-4 py-2 text-white sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center text-xs font-semibold leading-snug sm:text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-100" aria-hidden="true" />
          <span>
            {uz
              ? 'OGOHLANTIRISH: Test paytida veb-kamera nazorati faol — boshqa tarafga burilib qarash, yuzni berkitish, boshqa oyna/desktopga 3 soniyadan ortiq o‘tish, skrinshot olish va Win / Win+G bosish taqiqlanadi (3 ta ogohlantirish tugasa, natija darhol 0 bo‘ladi).'
              : 'WARNING: Real-time webcam proctoring is active — looking away/turning your head, obscuring face, leaving to another tab/window for over 3s, taking screenshots, or pressing Win / Win+G is prohibited (3 warnings = immediate 0 score).'}
          </span>
        </div>
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-900">
            <GraduationCap className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <span>{uz ? '7-Sinf ChSB' : 'Grade 7 ChSB'}</span>
          </div>

          <div
            role="group"
            aria-label={uz ? 'Tilni tanlash' : 'Select Language'}
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
          >
            <button
              type="button"
              onClick={() => onChangeLang('uz')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                lang === 'uz' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              O&apos;zbekcha
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="text-center">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              {uz ? '7-Sinf ChSB Platformasi' : 'Grade 7 ChSB Portal'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {uz
                ? "Testlarni topshirish va natijalarni saqlash uchun hisobingizga kiring."
                : 'Sign in with your username and password to take tests and save your results.'}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
              }}
              className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>{uz ? 'Kirish' : 'Sign In'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMsg(null);
              }}
              className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>{uz ? "Ro'yxatdan o'tish" : 'Register'}</span>
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-rose-800"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {tab === 'register' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  {uz ? 'Ism va familiya' : 'Full Name'}
                </label>
                <div className="relative mt-1.5">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-fullname"
                    type="text"
                    maxLength={DISPLAY_NAME_MAX_LEN}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={uz ? 'Masalan: Ali Valiyev' : 'e.g. Ali Valiyev'}
                    className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-username"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                {uz ? 'Foydalanuvchi nomi (Username)' : 'Username'}
              </label>
              <div className="relative mt-1.5">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="auth-username"
                  type="text"
                  autoComplete="username"
                  maxLength={64}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={uz ? 'Masalan: ali_7b' : 'e.g. ali_7b'}
                  className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
              {tab === 'register' && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {uz
                    ? "Faqat kichik harflar, raqamlar, '_' va '.' (3–32 belgi)"
                    : 'Lowercase letters, numbers, underscores or dots (3–32 chars)'}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                {uz ? 'Parol' : 'Password'}
              </label>
              <div className="relative mt-1.5">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {tab === 'login'
                ? uz
                  ? 'Kirish'
                  : 'Sign In'
                : uz
                  ? 'Hisob yaratish'
                  : 'Create Account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">
              {uz ? 'yoki' : 'or'}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{uz ? 'Google bilan kirish' : 'Continue with Google'}</span>
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
            {uz
              ? "O'qituvchi barcha o'quvchilarning natijalarini ko'rishi uchun Google orqali kirishi kerak."
              : 'Teachers can sign in with their verified Google account to view all students’ test results.'}
          </p>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-slate-500">
          Developer: <span className="font-semibold text-slate-700">Ibrohimbek Xujanazarov</span>
        </p>
      </main>
    </div>
  );
}
