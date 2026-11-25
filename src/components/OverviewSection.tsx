import { ArrowRight, Ban, BookOpen, Calculator, Code2, FlaskConical, Globe2, Landmark, Languages } from 'lucide-react';
import { AttemptRecord, SUBJECTS, UI_COPY, pickText } from '../data/subjects';
import { SubjectId, UILanguage } from '../types/quiz';

interface OverviewSectionProps {
  lang: UILanguage;
  activeSubjectId: SubjectId;
  history: AttemptRecord[];
  prohibitedSubjects?: ReadonlySet<SubjectId>;
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

export function OverviewSection({
  lang,
  activeSubjectId,
  history,
  prohibitedSubjects,
  onStartSubjectQuiz,
  onOpenSubjectGuide,
}: OverviewSectionProps) {
  const copy = UI_COPY[lang];

  return (
    <section className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          {copy.questionsPerTest} · {copy.variantsCount} · {copy.totalBank}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {copy.heroTitle}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">
          {copy.heroSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SUBJECTS.map((subject) => {
          const Icon = SUBJECT_ICONS[subject.id];
          const subjectAttempts = history.filter((h) => h.subjectId === subject.id);
          const bestAttempt = subjectAttempts.reduce<AttemptRecord | null>(
            (best, cur) => (!best || cur.percentage > best.percentage ? cur : best),
            null
          );
          const isCurrent = subject.id === activeSubjectId;
          const isProhibited = Boolean(prohibitedSubjects?.has(subject.id));

          return (
            <article
              key={subject.id}
              className={`flex flex-col justify-between rounded-xl border bg-white p-6 transition-colors ${
                isProhibited
                  ? 'border-rose-300 bg-rose-50/40'
                  : isCurrent
                    ? 'border-teal-700/60'
                    : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isProhibited ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-teal-700'
                    }`}
                  >
                    {isProhibited ? (
                      <Ban className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <span
                    className={`font-mono-num text-xs ${
                      isProhibited ? 'font-semibold text-rose-700' : 'font-medium text-slate-500'
                    }`}
                  >
                    {isProhibited
                      ? lang === 'uz'
                        ? 'Taqiqlangan (Prohibited)'
                        : 'Prohibited'
                      : `${subject.questions.length} ${lang === 'uz' ? 'savol' : 'questions'} · 3×5 ${lang === 'uz' ? 'variant' : 'variants'}`}
                  </span>
                </div>

                <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
                  {pickText(subject.title, lang)}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {pickText(subject.subtitle, lang)}
                </p>

                <p className="mt-4 text-xs font-medium text-slate-500">
                  {pickText(subject.questionLangNote, lang)} · {subject.topics.length}{' '}
                  {lang === 'uz' ? 'mavzu' : 'topics'}
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{copy.bestScore}:</span>
                  {bestAttempt ? (
                    <span className="font-mono-num font-semibold text-slate-900">
                      {bestAttempt.score}/25 ({bestAttempt.percentage}%) · {lang === 'uz' ? 'Baho' : 'Grade'} {bestAttempt.grade}
                    </span>
                  ) : (
                    <span>{copy.notAttempted}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onStartSubjectQuiz(subject.id)}
                    className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isProhibited
                        ? 'bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-700'
                        : 'bg-teal-700 hover:bg-teal-800 focus-visible:ring-teal-700'
                    }`}
                  >
                    <span>
                      {isProhibited
                        ? lang === 'uz'
                          ? 'Yopiq (Prohibited)'
                          : 'Prohibited'
                        : copy.startTest}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenSubjectGuide(subject.id)}
                    aria-label={`${pickText(subject.shortLabel, lang)} — ${copy.openGuide}`}
                    title={copy.openGuide}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
