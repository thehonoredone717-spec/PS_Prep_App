import { Ban, CheckCircle2, Lock, ShieldCheck, Unlock } from 'lucide-react';
import { SUBJECTS, SubjectPermission, pickText } from '../data/subjects';
import { SubjectId, UILanguage } from '../types/quiz';
import { TeacherScope } from './TopBar';

interface PermissionViewProps {
  lang: UILanguage;
  teacherScope: TeacherScope;
  permissions: Partial<Record<SubjectId, SubjectPermission>>;
  savingSubjectId: SubjectId | null;
  onSetSubjectProhibited: (subjectId: SubjectId, prohibited: boolean) => void;
}

export function PermissionView({
  lang,
  teacherScope,
  permissions,
  savingSubjectId,
  onSetSubjectProhibited,
}: PermissionViewProps) {
  const uz = lang === 'uz';

  const manageableSubjects =
    teacherScope === 'all'
      ? SUBJECTS
      : teacherScope === 'computing'
        ? SUBJECTS.filter((s) => s.id === 'computing')
        : teacherScope === 'math'
          ? SUBJECTS.filter((s) => s.id === 'math')
          : teacherScope === 'science'
            ? SUBJECTS.filter((s) => s.id === 'science')
            : teacherScope === 'english'
              ? SUBJECTS.filter((s) => s.id === 'english')
              : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>
              {teacherScope === 'all'
                ? uz
                  ? 'Admin boshqaruvi · Barcha fanlar'
                  : 'Admin Control · All Subjects'
                : uz
                  ? "O'qituvchi boshqaruvi · O'z fani"
                  : 'Teacher Control · Assigned Subject'}
            </span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {uz ? 'Permission — Test ruxsatlari' : 'Permission — Subject Test Access'}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            {teacherScope === 'all'
              ? uz
                ? "Admin sifatida barcha fanlardagi testlarni Allow (ruxsat berish) yoki Prohibit (to'liq qizil ekran bilan taqiqlash) qilishingiz mumkin."
                : 'As Admin, you can Allow or Prohibit quizzes across all subjects in real time.'
              : uz
                ? "O'z faningizdagi testlarni o'quvchilar uchun Allow (ruxsat berish) yoki Prohibit (to'liq qizil ekran bilan taqiqlash) qilishingiz mumkin."
                : 'Allow or Prohibit quizzes for your subject in real time across all students.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {manageableSubjects.map((subject) => {
          const perm = permissions[subject.id];
          const isProhibited = Boolean(perm?.prohibited);
          const isSaving = savingSubjectId === subject.id;

          return (
            <article
              key={subject.id}
              className={`flex flex-col justify-between rounded-xl border p-6 transition-colors ${
                isProhibited
                  ? 'border-rose-300 bg-rose-50/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                      isProhibited
                        ? 'bg-rose-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                    }`}
                  >
                    {isProhibited ? (
                      <>
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{uz ? 'Prohibited (Taqiqlangan)' : 'Prohibited'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{uz ? 'Allowed (Ochiq)' : 'Allowed'}</span>
                      </>
                    )}
                  </span>
                </div>

                <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
                  {pickText(subject.title, lang)}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {pickText(subject.subtitle, lang)}
                </p>

                {perm?.updatedByName && (
                  <p className="mt-4 text-xs text-slate-500">
                    {uz ? 'Oxirgi o‘zgartirish: ' : 'Last updated by: '}
                    <span className="font-semibold text-slate-700">{perm.updatedByName}</span>
                  </p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2.5 border-t border-slate-200/70 pt-4">
                <button
                  type="button"
                  disabled={isSaving || !isProhibited}
                  onClick={() => onSetSubjectProhibited(subject.id, false)}
                  className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                    !isProhibited
                      ? 'bg-emerald-700 text-white opacity-90 cursor-default'
                      : 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 disabled:opacity-60'
                  }`}
                >
                  <Unlock className="h-4 w-4" aria-hidden="true" />
                  <span>Allow</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving || isProhibited}
                  onClick={() => onSetSubjectProhibited(subject.id, true)}
                  className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2 ${
                    isProhibited
                      ? 'bg-rose-700 text-white opacity-90 cursor-default'
                      : 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 disabled:opacity-60'
                  }`}
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  <span>Prohibit</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
