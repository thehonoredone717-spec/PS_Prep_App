import { Lock } from 'lucide-react';
import { SUBJECTS, pickText } from '../data/subjects';
import { SubjectId, UILanguage } from '../types/quiz';

interface SubjectBarProps {
  lang: UILanguage;
  onChangeLang: (lang: UILanguage) => void;
  activeSubjectId: SubjectId;
  onSelectSubject: (id: SubjectId) => void;
  prohibitedSubjects?: ReadonlySet<SubjectId>;
}

export function SubjectBar({
  lang,
  onChangeLang,
  activeSubjectId,
  onSelectSubject,
  prohibitedSubjects,
}: SubjectBarProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div
          role="tablist"
          aria-label={lang === 'uz' ? 'Fanlar bo‘limlari' : 'Subject sections'}
          className="flex flex-wrap items-center gap-1.5"
        >
          {SUBJECTS.map((subject) => {
            const selected = subject.id === activeSubjectId;
            const prohibited = Boolean(prohibitedSubjects?.has(subject.id));
            return (
              <button
                key={subject.id}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => onSelectSubject(subject.id)}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1 ${
                  prohibited
                    ? selected
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 hover:text-rose-900'
                    : selected
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {prohibited && <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                <span>{pickText(subject.shortLabel, lang)}</span>
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label={lang === 'uz' ? 'Interfeys tili' : 'Interface language'}
          className="inline-flex rounded-lg bg-slate-200/70 p-0.5"
        >
          <button
            type="button"
            onClick={() => onChangeLang('uz')}
            className={`min-h-[36px] rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              lang === 'uz'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            O&apos;zbekcha
          </button>
          <button
            type="button"
            onClick={() => onChangeLang('en')}
            className={`min-h-[36px] rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              lang === 'en'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
        </div>
      </div>
    </div>
  );
}
