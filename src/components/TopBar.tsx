import {
  Download,
  GraduationCap,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { UI_COPY } from '../data/subjects';
import { UserProfile } from '../firebase';
import { UILanguage } from '../types/quiz';

export type AppView = 'dashboard' | 'subjects' | 'quiz' | 'guide' | 'results' | 'permission';
export type TeacherScope = 'none' | 'computing' | 'math' | 'science' | 'english' | 'all';

interface TopBarProps {
  lang: UILanguage;
  onSelectView: (view: AppView) => void;
  onDownloadHtml: () => void;
  downloadNotice: boolean;
  userProfile: UserProfile;
  teacherScope: TeacherScope;
  onSignOut: () => void;
  isFullscreen: boolean;
  isQuizRunning?: boolean;
  onToggleFullscreen: () => void;
  desktopMenuOpen: boolean;
  onToggleDesktopMenu: () => void;
  onOpenMobileMenu: () => void;
}

export function TopBar({
  lang,
  onSelectView,
  onDownloadHtml,
  downloadNotice,
  userProfile,
  teacherScope,
  onSignOut,
  isFullscreen,
  isQuizRunning = false,
  onToggleFullscreen,
  desktopMenuOpen,
  onToggleDesktopMenu,
  onOpenMobileMenu,
}: TopBarProps) {
  const copy = UI_COPY[lang];
  const isAnyTeacher = teacherScope !== 'none';
  const canDownloadHtml = teacherScope === 'all';

  const badgeText =
    teacherScope === 'all'
      ? copy.teacherBadge
      : teacherScope === 'computing'
        ? copy.computingTeacherBadge
        : teacherScope === 'math'
          ? copy.mathTeacherBadge
          : teacherScope === 'science'
            ? copy.scienceTeacherBadge
            : teacherScope === 'english'
              ? copy.englishTeacherBadge
              : `@${userProfile.username}`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label={lang === 'uz' ? 'Menyuni ochish' : 'Open menu'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleDesktopMenu}
            title={
              desktopMenuOpen
                ? lang === 'uz'
                  ? 'Menyuni yopish'
                  : 'Close menu'
                : lang === 'uz'
                  ? 'Menyuni ochish'
                  : 'Open menu'
            }
            aria-label={
              desktopMenuOpen
                ? lang === 'uz'
                  ? 'Menyuni yopish'
                  : 'Close menu'
                : lang === 'uz'
                  ? 'Menyuni ochish'
                  : 'Open menu'
            }
            aria-expanded={desktopMenuOpen}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:inline-flex"
          >
            {desktopMenuOpen ? (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectView('dashboard')}
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-left font-display text-lg font-bold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <GraduationCap className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <span>{copy.brand}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:flex">
            {isAnyTeacher ? (
              <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
            ) : (
              <UserIcon className="h-4 w-4 text-slate-500" aria-hidden="true" />
            )}
            <span className="max-w-[140px] truncate text-xs font-semibold text-slate-800">
              {userProfile.displayName}
            </span>
            <span className="text-[11px] font-medium text-teal-700">{badgeText}</span>
          </div>

          <button
            type="button"
            disabled={isQuizRunning && isFullscreen}
            onClick={onToggleFullscreen}
            title={
              isQuizRunning && isFullscreen
                ? lang === 'uz'
                  ? "Test paytida to'liq ekrandan chiqish taqiqlanadi"
                  : 'Cannot exit fullscreen during an active test'
                : isFullscreen
                  ? lang === 'uz'
                    ? "To'liq ekrandan chiqish"
                    : 'Exit fullscreen'
                  : lang === 'uz'
                    ? "To'liq ekran"
                    : 'Fullscreen'
            }
            aria-label={
              isFullscreen
                ? lang === 'uz'
                  ? "To'liq ekrandan chiqish"
                  : 'Exit fullscreen'
                : lang === 'uz'
                  ? "To'liq ekran"
                  : 'Fullscreen'
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            title={copy.signOut}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{copy.signOut}</span>
          </button>

          {canDownloadHtml && (
            <button
              type="button"
              onClick={onDownloadHtml}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">
                {downloadNotice ? copy.htmlDownloaded : copy.downloadHtml}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
