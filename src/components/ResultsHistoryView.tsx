import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttemptRecord, SUBJECTS, SUBJECT_MAP, UI_COPY, pickText } from '../data/subjects';
import { UserProfile } from '../firebase';
import { SubjectId, UILanguage } from '../types/quiz';
import { formatTime, getDifficultyLabel } from '../utils/quizEngine';
import { TeacherScope } from './TopBar';

interface ResultsHistoryViewProps {
  lang: UILanguage;
  history: AttemptRecord[];
  teacherScope: TeacherScope;
  usersList: UserProfile[];
  onDeleteAttempt: (attemptId: string) => void;
  onClearAllAttempts: () => void;
  onOpenSubjectQuiz: (id: SubjectId) => void;
}

export function ResultsHistoryView({
  lang,
  history,
  teacherScope,
  usersList,
  onDeleteAttempt,
  onClearAllAttempts,
  onOpenSubjectQuiz,
}: ResultsHistoryViewProps) {
  const copy = UI_COPY[lang];
  const isAnyTeacher = teacherScope !== 'none';
  const canManage = teacherScope === 'all';
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const studentOptions = useMemo(() => {
    const map = new Map<string, { userId: string; label: string }>();
    usersList.forEach((u) => {
      map.set(u.uid, { userId: u.uid, label: `${u.displayName} (@${u.username})` });
    });
    history.forEach((item) => {
      if (item.userId && !map.has(item.userId)) {
        map.set(item.userId, {
          userId: item.userId,
          label: `${item.studentName || item.username || item.userId} ${item.username ? `(@${item.username})` : ''}`.trim(),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [history, usersList]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (teacherScope === 'computing' && item.subjectId !== 'computing') {
        return false;
      }
      if (teacherScope === 'math' && item.subjectId !== 'math') {
        return false;
      }
      if (teacherScope === 'science' && item.subjectId !== 'science') {
        return false;
      }
      if (teacherScope === 'english' && item.subjectId !== 'english') {
        return false;
      }
      if (isAnyTeacher && studentFilter !== 'all' && item.userId !== studentFilter) {
        return false;
      }
      if (
        teacherScope !== 'computing' &&
        teacherScope !== 'math' &&
        teacherScope !== 'science' &&
        teacherScope !== 'english' &&
        subjectFilter !== 'all' &&
        item.subjectId !== subjectFilter
      ) {
        return false;
      }
      return true;
    });
  }, [history, teacherScope, isAnyTeacher, studentFilter, subjectFilter]);

  const teacherStats = useMemo(() => {
    const total = filteredHistory.length;
    const uniqueStudents = new Set(
      filteredHistory.map((h) => h.userId || h.username || 'unknown')
    ).size;
    const avgPct =
      total > 0
        ? Math.round(
            filteredHistory.reduce((sum, item) => sum + item.percentage, 0) / total
          )
        : 0;
    const gradeFives = filteredHistory.filter((item) => item.grade === 5).length;
    return { total, uniqueStudents, avgPct, gradeFives };
  }, [filteredHistory]);

  const headingTitle =
    teacherScope === 'all'
      ? copy.teacherResultsTitle
      : teacherScope === 'computing'
        ? copy.computingResultsTitle
        : teacherScope === 'math'
          ? copy.mathResultsTitle
          : teacherScope === 'science'
            ? copy.scienceResultsTitle
            : teacherScope === 'english'
              ? copy.englishResultsTitle
              : copy.historyTitle;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {headingTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{copy.gradingScaleNote}</p>
          <p className="mt-0.5 text-xs text-slate-500">{copy.resultsSyncNote}</p>
        </div>

        {canManage && history.length > 0 && (
          <button
            type="button"
            onClick={onClearAllAttempts}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>{copy.clearHistory}</span>
          </button>
        )}
      </div>

      {/* Summary & Filters */}
      <div className="space-y-4">
        {isAnyTeacher && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{copy.totalAttempts}</p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-slate-900">
                {teacherStats.total}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{copy.activeStudents}</p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-slate-900">
                {teacherStats.uniqueStudents}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{copy.averagePct}</p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-teal-700">
                {teacherStats.avgPct}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{copy.gradeFiveCount}</p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-emerald-700">
                {teacherStats.gradeFives}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {isAnyTeacher && (
            <select
              aria-label={copy.studentCol}
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="all">{copy.allStudents}</option>
              {studentOptions.map((opt) => (
                <option key={opt.userId} value={opt.userId}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {teacherScope !== 'computing' &&
            teacherScope !== 'math' &&
            teacherScope !== 'science' &&
            teacherScope !== 'english' && (
            <select
              aria-label={copy.subjectCol}
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="all">{copy.allSubjects}</option>
              {SUBJECTS.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {pickText(subj.shortLabel, lang)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          {copy.historyEmpty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  {isAnyTeacher && <th className="px-4 py-3">{copy.studentCol}</th>}
                  <th className="px-4 py-3">{copy.subjectCol}</th>
                  <th className="px-4 py-3">{copy.variantCol}</th>
                  <th className="px-4 py-3">{copy.modeCol}</th>
                  <th className="px-4 py-3">{copy.scoreLabel}</th>
                  <th className="px-4 py-3">{copy.gradeLabel}</th>
                  <th className="px-4 py-3">{copy.timeLabel}</th>
                  <th className="px-4 py-3">{copy.dateCol}</th>
                  {canManage && <th className="px-4 py-3 text-right" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => {
                  const subject = SUBJECT_MAP[item.subjectId];
                  const dt = new Date(item.completedAt);
                  const dateLabel = Number.isNaN(dt.getTime())
                    ? item.completedAt
                    : `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`;
                  const diffText = item.difficulty
                    ? `${getDifficultyLabel(item.difficulty, lang)} · `
                    : '';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      {isAnyTeacher && (
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {item.studentName || item.username || 'Student'}
                          </div>
                          {item.username && (
                            <div className="text-xs text-slate-500">@{item.username}</div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => onOpenSubjectQuiz(item.subjectId)}
                          className="text-left hover:text-teal-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                        >
                          {subject ? pickText(subject.shortLabel, lang) : item.subjectId}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {diffText}
                        {item.variant}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.mode === 'practice'
                          ? lang === 'uz'
                            ? 'Mashq'
                            : 'Practice'
                          : lang === 'uz'
                            ? 'Imtihon'
                            : 'Exam'}
                      </td>
                      <td className="font-mono-num px-4 py-3 font-semibold text-slate-900">
                        <span>
                          {item.score}/{item.total} ({item.percentage}%)
                        </span>
                        {item.cheated && item.score === 0 && (
                          <span className="ml-2 font-sans font-extrabold text-rose-600">
                            Cheated
                          </span>
                        )}
                      </td>
                      <td className="font-mono-num px-4 py-3 font-bold text-teal-700">
                        {item.grade}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-slate-600">
                        {formatTime(item.elapsedSeconds)}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-slate-500">
                        {dateLabel}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteAttempt(item.id)}
                            title={copy.deleteRecord}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
