import { ArrowRight, Ban, BookOpenCheck } from 'lucide-react';
import { UI_COPY, pickText } from '../data/subjects';
import { SubjectConfig, UILanguage } from '../types/quiz';
import { FormattedMathText } from './FormattedMathText';

interface StudyGuidePanelProps {
  subject: SubjectConfig;
  lang: UILanguage;
  isProhibited?: boolean;
  onStartQuiz: () => void;
}

export function StudyGuidePanel({
  subject,
  lang,
  isProhibited = false,
  onStartQuiz,
}: StudyGuidePanelProps) {
  const copy = UI_COPY[lang];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            {pickText(subject.shortLabel, lang)} · {subject.topics.length}{' '}
            {lang === 'uz' ? 'mavzu' : 'topics'} · {subject.questions.length}{' '}
            {lang === 'uz' ? 'savol' : 'questions'}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {copy.studyGuideTitle}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {pickText(subject.title, lang)} — {pickText(subject.subtitle, lang)}
          </p>
        </div>

        <button
          type="button"
          disabled={isProhibited}
          onClick={onStartQuiz}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isProhibited
              ? 'cursor-not-allowed bg-rose-700/90 opacity-90 focus-visible:ring-rose-700'
              : 'bg-teal-700 hover:bg-teal-800 focus-visible:ring-teal-700'
          }`}
        >
          {isProhibited ? (
            <>
              <Ban className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'uz' ? 'Test yopiq (Prohibited)' : 'Test Prohibited'}</span>
            </>
          ) : (
            <>
              <span>{copy.startTest} (25)</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
            <BookOpenCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>{copy.topicsCovered}</span>
          </h2>
          <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
            {subject.topics.map((topic, idx) => (
              <li
                key={topic}
                className="flex items-start gap-2.5 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"
              >
                <span className="font-mono-num mt-0.5 text-xs font-semibold text-slate-400">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span>{topic}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-4 lg:col-span-8">
          {subject.studyGuide.map((section) => (
            <article
              key={section.title}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <h3 className="font-display text-lg font-bold text-slate-900">
                {section.title}
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700"
                    />
                    <span>
                      <FormattedMathText text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
