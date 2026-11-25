import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  PanelLeftClose,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { UI_COPY } from '../data/subjects';
import { UserProfile } from '../firebase';
import { UILanguage } from '../types/quiz';
import { AppView, TeacherScope } from './TopBar';

interface SideMenuProps {
  lang: UILanguage;
  activeView: AppView;
  teacherScope: TeacherScope;
  userProfile: UserProfile;
  desktopOpen: boolean;
  mobileOpen: boolean;
  onCloseDesktop: () => void;
  onCloseMobile: () => void;
  onSelectView: (view: AppView) => void;
}

export function SideMenu({
  lang,
  activeView,
  teacherScope,
  userProfile,
  desktopOpen,
  mobileOpen,
  onCloseDesktop,
  onCloseMobile,
  onSelectView,
}: SideMenuProps) {
  const copy = UI_COPY[lang];
  const isAnyTeacher = teacherScope !== 'none';

  const navItems: {
    id: AppView;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    { id: 'dashboard', label: copy.navHome, icon: LayoutDashboard },
    { id: 'subjects', label: copy.navSubjects, icon: Layers },
    { id: 'quiz', label: copy.navTest, icon: ClipboardCheck },
    { id: 'guide', label: copy.navGuide, icon: BookOpen },
    { id: 'results', label: copy.navResults, icon: BarChart3 },
    ...(isAnyTeacher
      ? [{ id: 'permission' as AppView, label: copy.navPermission, icon: ShieldCheck }]
      : []),
  ];

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

  const renderLinks = (closeOnSelect: boolean, showDesktopCollapse: boolean) => (
    <nav aria-label={lang === 'uz' ? 'Asosiy menyu' : 'Main menu'} className="space-y-1">
      <div className="flex items-center justify-between px-3 pb-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {lang === 'uz' ? 'Bo‘limlar' : 'Menu'}
        </p>
        {showDesktopCollapse && (
          <button
            type="button"
            onClick={onCloseDesktop}
            title={lang === 'uz' ? 'Menyuni yopish' : 'Collapse menu'}
            aria-label={lang === 'uz' ? 'Menyuni yopish' : 'Collapse menu'}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectView(item.id);
              if (closeOnSelect) onCloseMobile();
            }}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              isActive
                ? 'bg-teal-50 font-bold text-teal-800'
                : 'font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const userSummary = (
    <div className="mt-auto border-t border-slate-200/80 pt-4">
      <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
        {isAnyTeacher ? (
          <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
        ) : (
          <UserIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900">
            {userProfile.displayName}
          </p>
          <p className="truncate text-[11px] font-medium text-teal-700">{badgeText}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Vertical Sidebar Menu */}
      {desktopOpen && (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
          <div className="sticky top-20 flex flex-1 flex-col">
            {renderLinks(false, true)}
          </div>
        </aside>
      )}

      {/* Mobile Vertical Drawer Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/40"
            aria-hidden="true"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-display text-base font-bold text-slate-900">
                {copy.brand}
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label={lang === 'uz' ? 'Menyuni yopish' : 'Close menu'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {renderLinks(true, false)}
            {userSummary}
          </aside>
        </div>
      )}
    </>
  );
}
