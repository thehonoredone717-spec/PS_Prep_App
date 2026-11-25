import {
  ArrowRight,
  Award,
  Ban,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Code2,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  AttemptRecord,
  SUBJECTS,
  SUBJECT_MAP,
  TOTAL_QUESTION_COUNT,
  UI_COPY,
  pickText,
} from '../data/subjects';
import { UserProfile } from '../firebase';
import { SubjectId, UILanguage } from '../types/quiz';
import { AppView, TeacherScope } from './TopBar';

interface DashboardSectionProps {
  lang: UILanguage;
  userProfile: UserProfile;
  teacherScope: TeacherScope;
  history: AttemptRecord[];
  prohibitedSubjects: ReadonlySet<SubjectId>;
  onNavigate: (view: AppView) => void;
  onStartSubjectQuiz: (id: SubjectId) => void;
  onOpenSubjectGuide: (id: SubjectId) => void;
}

const SUBJECT_ICONS: Record<SubjectId, typeof Calculator> = {
  math: Calculator,
  history: Landmark,
  science: FlaskConical,
  computing: Code2,
  english: Globe2,
  uzbek: Languages,
};

export function DashboardSection({
  lang,
  userProfile,
  teacherScope,
  history,
  prohibitedSubjects,
  onNavigate,
  onStartSubjectQuiz,
  onOpenSubjectGuide,
}: DashboardSectionProps) {
  const uz = lang === 'uz';
  const copy = UI_COPY[lang];

  const openSubjectsCount = SUBJECTS.filter((s) => !prohibitedSubjects.has(s.id)).length;
  const avgPct =
    history.length > 0
      ? Math.round(history.reduce((sum, item) => sum + item.percentage, 0) / history.length)
      : null;
  const bestPct =
    history.length > 0
      ? history.reduce((best, item) => Math.max(best, item.percentage), 0)
      : null;
  const recentAttempts = history.slice(0, 5);

  const roleLabel =
    teacherScope === 'all'
      ? uz
        ? 'Admin · Barcha fanlar'
        : 'Admin · All Subjects'
      : teacherScope === 'computing'
        ? copy.computingTeacherBadge
        : teacherScope === 'math'
          ? copy.mathTeacherBadge
          : teacherScope === 'science'
            ? copy.scienceTeacherBadge
            : teacherScope === 'english'
              ? copy.englishTeacherBadge
              : copy.studentBadge;

  return (
    <section className="space-y-6">
      {/* Welcome / Home Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>
                {uz ? '7-Sinf ChSB · Asosiy Dashboard' : 'Grade 7 ChSB · Home Dashboard'} · {roleLabel}
              </span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {uz
                ? `Xush kelibsiz, ${userProfile.displayName}!`
                : `Welcome back, ${userProfile.displayName}!`}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
              {uz
                ? `Platformada ${SUBJECTS.length} ta asosiy fan, ${TOTAL_QUESTION_COUNT} ta test savoli va barcha mavzular bo‘yicha qo‘llanmalar jamlangan. Qaysi bo‘limdan boshlashni tanlang.`
                : `Access ${SUBJECTS.length} core subjects, ${TOTAL_QUESTION_COUNT} ChSB practice questions, and full revision study guides. Choose where to start below.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('subjects')}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <span>{uz ? 'Fanlar bo‘limi' : 'Browse Subjects'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('guide')}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>{uz ? "Qo'llanmalar" : 'Study Guides'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('results')}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <ClipboardList className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>{copy.navResults}</span>
            </button>

            {teacherScope !== 'none' && (
              <button
                type="button"
                onClick={() => onNavigate('permission')}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>{copy.navPermission}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{uz ? 'Ochiq fanlar' : 'Open Subjects'}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="font-mono-num mt-2 text-2xl font-extrabold text-slate-900">
            {openSubjectsCount} / {SUBJECTS.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {uz ? 'Qo‘llanmalar barcha fanlarda ochiq' : 'All study guides remain open'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{uz ? 'Savollar bazasi' : 'Question Bank'}</span>
            <BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />
          </div>
          <p className="font-mono-num mt-2 text-2xl font-extrabold text-slate-900">
            {TOTAL_QUESTION_COUNT}
          </p>
          <p className="mt-1 text-xs text-slate-500">{copy.questionsPerTest}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{uz ? 'Topshirilgan testlar' : 'Completed Tests'}</span>
            <ClipboardList className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </div>
          <p className="font-mono-num mt-2 text-2xl font-extrabold text-slate-900">
            {history.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {teacherScope === 'none'
              ? uz
                ? 'Shaxsiy natijalaringiz'
                : 'Your saved attempts'
              : uz
                ? 'Ko‘rinadigan natijalar'
                : 'Scoped records'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{uz ? "O'rtacha natija" : 'Average Score'}</span>
            <TrendingUp className="h-4 w-4 text-teal-700" aria-hidden="true" />
          </div>
          <p className="font-mono-num mt-2 text-2xl font-extrabold text-slate-900">
            {avgPct !== null ? `${avgPct}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {bestPct !== null
              ? uz
                ? `Eng yuqori: ${bestPct}%`
                : `Best score: ${bestPct}%`
              : uz
                ? 'Hali test topshirilmagan'
                : 'No tests taken yet'}
          </p>
        </div>
      </div>

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Subjects Quick Access */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {uz ? 'Fanlar va tezkor kirish' : 'Subjects Quick Access'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {uz
                  ? 'Kerakli fanning qo‘llanmasini o‘qing yoki testni tanlang'
                  : 'Open any subject study guide or launch a practice/exam test'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('subjects')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              {uz ? 'Barchasi →' : 'View all →'}
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {SUBJECTS.map((subject) => {
              const Icon = SUBJECT_ICONS[subject.id];
              const isProhibited = prohibitedSubjects.has(subject.id);
              const best = history
                .filter((h) => h.subjectId === subject.id)
                .reduce<AttemptRecord | null>(
                  (acc, cur) => (!acc || cur.percentage > acc.percentage ? cur : acc),
                  null
                );

              return (
                <div
                  key={subject.id}
                  className="flex flex-col justify-between gap-3 py-3.5 first:pt-1 last:pb-1 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isProhibited
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-teal-700'
                      }`}
                    >
                      {isProhibited ? (
                        <Ban className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-sm font-bold text-slate-900">
                          {pickText(subject.title, lang)}
                        </h3>
                        {isProhibited ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                            {uz ? 'Test yopiq' : 'Test Prohibited'}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {uz ? 'Ochiq' : 'Open'}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {subject.topics.length} {uz ? 'mavzu' : 'topics'} ·{' '}
                        {subject.questions.length} {uz ? 'savol' : 'questions'}
                        {best ? ` · ${uz ? 'Eng yaxshi' : 'Best'}: ${best.percentage}%` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenSubjectGuide(subject.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                      <span>{copy.navGuide}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartSubjectQuiz(subject.id)}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                        isProhibited
                          ? 'bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-700'
                          : 'bg-teal-700 hover:bg-teal-800 focus-visible:ring-teal-700'
                      }`}
                    >
                      <span>{isProhibited ? (uz ? 'Yopiq' : 'Locked') : copy.navTest}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Activity & Rules */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                <Award className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <span>{uz ? 'Oxirgi natijalar' : 'Recent Results'}</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('results')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                {uz ? 'Barchasi →' : 'View all →'}
              </button>
            </div>

            {recentAttempts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{copy.historyEmpty}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {recentAttempts.map((item) => {
                  const sub = SUBJECT_MAP[item.subjectId];
                  const isCheatedZero = Boolean(item.cheated && item.score === 0);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {sub ? pickText(sub.shortLabel, lang) : item.subjectId}
                          {teacherScope !== 'none' && item.studentName
                            ? ` · ${item.studentName}`
                            : ''}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {item.variant} ·{' '}
                          {item.mode === 'exam'
                            ? uz
                              ? 'Imtihon'
                              : 'Exam'
                            : uz
                              ? 'Mashq'
                              : 'Practice'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {isCheatedZero ? (
                          <span className="text-xs font-extrabold uppercase tracking-wide text-rose-700">
                            Cheated
                          </span>
                        ) : (
                          <>
                            <p className="font-mono-num text-sm font-bold text-slate-900">
                              {item.score}/{item.total} ({item.percentage}%)
                            </p>
                            <p className="text-[11px] font-medium text-slate-500">
                              {uz ? 'Baho' : 'Grade'} {item.grade}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
              <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" />
              <span>{uz ? 'Imtihon tartibi' : 'Exam Rules'}</span>
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              <li>
                {uz
                  ? "• To'liq ekran rejimi faqat testdagi Boshlash (Start) tugmasi bosilgandan keyin yoqiladi."
                  : '• Fullscreen mode activates only after you click Start inside a quiz.'}
              </li>
              <li>
                {uz
                  ? "• Test paytida boshqa tab/oynaga o'tish (3s+), skrinshot olish yoki Win / Win+G bosish ogohlantirish beradi (3 ogohlantirishdan keyin 0 ball / Cheated)."
                  : '• Switching tabs/windows (>3s), screenshots, or Win / Win+G triggers warnings (3 warnings = 0 score / Cheated).'}
              </li>
              <li>
                {uz
                  ? "• Biror fan testi yopilgan (Prohibited) bo'lsa ham, uning Qo'llanma bo'limi ochiq qoladi."
                  : '• Study Guides remain open and readable even if quizzes for a subject are prohibited.'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
