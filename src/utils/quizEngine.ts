import {
  ActiveQuizQuestion,
  BilingualText,
  DifficultyLevel,
  QuestionItem,
  SubjectConfig,
  UILanguage,
  VariantSelection,
} from '../types/quiz';

export const QUESTIONS_PER_TEST = 25;
export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['easy', 'medium', 'hard'];

export function getDifficultyLabel(difficulty: DifficultyLevel, lang: UILanguage): string {
  if (difficulty === 'easy') return lang === 'uz' ? 'Oson' : 'Easy';
  if (difficulty === 'medium') return lang === 'uz' ? "O'rta" : 'Medium';
  return lang === 'uz' ? 'Qiyin' : 'Hard';
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getNextVariant(current: VariantSelection): VariantSelection {
  if (current === 1) return 2;
  if (current === 2) return 3;
  if (current === 3) return 4;
  if (current === 4) return 5;
  if (current === 5) return 'random';
  return 1;
}

export function getVariantLabel(variant: VariantSelection, lang: UILanguage): string {
  if (variant === 'random') {
    return lang === 'uz' ? 'Tasodifiy 25' : 'Random 25';
  }
  return `Variant ${variant}`;
}

/**
 * Interleaves questions deterministically round-robin by topic so any slice
 * across a difficulty pool retains balanced topic coverage.
 */
function interleaveByTopic(items: QuestionItem[]): QuestionItem[] {
  const byTopic = new Map<string, QuestionItem[]>();
  for (const item of items) {
    const list = byTopic.get(item.topic) ?? [];
    list.push(item);
    byTopic.set(item.topic, list);
  }
  const queues = Array.from(byTopic.values());
  const out: QuestionItem[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

/**
 * Builds a 25-question session for the chosen subject, difficulty, and variant.
 * Each difficulty tier ('easy', 'medium', 'hard') has 50 questions and 5 variants:
 *   Variant 1: items 0..24 (0 overlap with Variant 2)
 *   Variant 2: items 25..49 (0 overlap with Variant 1)
 *   Variant 3: even indices 0,2,4..48 (0 overlap with Variant 4)
 *   Variant 4: odd indices 1,3,5..49 (0 overlap with Variant 3)
 *   Variant 5: cross-strided indices (i*3 mod len)
 *   'random': topic-balanced 25 items prioritizing unseen IDs
 * Both question order and 4 option positions are Fisher-Yates shuffled every run.
 */
export function buildVariantQuestions(
  subject: SubjectConfig,
  difficulty: DifficultyLevel,
  variant: VariantSelection,
  previousIds: string[] = []
): ActiveQuizQuestion[] {
  const filtered = subject.questions.filter((q) => q.difficulty === difficulty);
  const basePool = filtered.length >= QUESTIONS_PER_TEST ? filtered : subject.questions;
  const pool = interleaveByTopic(basePool);
  let chosen: QuestionItem[] = [];

  if (variant === 1) {
    chosen = pool.slice(0, QUESTIONS_PER_TEST);
  } else if (variant === 2) {
    const slice = pool.slice(QUESTIONS_PER_TEST, QUESTIONS_PER_TEST * 2);
    chosen = slice.length === QUESTIONS_PER_TEST ? slice : pool.slice(-QUESTIONS_PER_TEST);
  } else if (variant === 3) {
    chosen = pool.filter((_, idx) => idx % 2 === 0).slice(0, QUESTIONS_PER_TEST);
  } else if (variant === 4) {
    chosen = pool.filter((_, idx) => idx % 2 === 1).slice(0, QUESTIONS_PER_TEST);
  } else if (variant === 5) {
    const seen = new Set<number>();
    const picked: QuestionItem[] = [];
    const n = pool.length;
    for (let step = 0; picked.length < QUESTIONS_PER_TEST && step < n * 2; step++) {
      let idx = (step * 3) % n;
      while (seen.has(idx) && seen.size < n) {
        idx = (idx + 1) % n;
      }
      if (!seen.has(idx)) {
        seen.add(idx);
        picked.push(pool[idx]);
      }
    }
    chosen = picked;
  } else {
    const prevSet = new Set(previousIds);
    const freshPool = pool.filter((q) => !prevSet.has(q.id));
    const candidatePool = freshPool.length >= QUESTIONS_PER_TEST ? freshPool : pool;

    const byTopic = new Map<string, QuestionItem[]>();
    for (const q of shuffleArray(candidatePool)) {
      const list = byTopic.get(q.topic) ?? [];
      list.push(q);
      byTopic.set(q.topic, list);
    }

    const picked: QuestionItem[] = [];
    const pickedIds = new Set<string>();
    const topicQueues = shuffleArray(Array.from(byTopic.values()));

    let addedInRound = true;
    while (picked.length < QUESTIONS_PER_TEST && addedInRound) {
      addedInRound = false;
      for (const queue of topicQueues) {
        if (picked.length >= QUESTIONS_PER_TEST) break;
        const nextItem = queue.shift();
        if (nextItem && !pickedIds.has(nextItem.id)) {
          picked.push(nextItem);
          pickedIds.add(nextItem.id);
          addedInRound = true;
        }
      }
    }

    if (picked.length < QUESTIONS_PER_TEST) {
      for (const q of shuffleArray(pool)) {
        if (picked.length >= QUESTIONS_PER_TEST) break;
        if (!pickedIds.has(q.id)) {
          picked.push(q);
          pickedIds.add(q.id);
        }
      }
    }

    chosen = picked;
  }

  return shuffleArray(chosen).map((q) => ({
    source: q,
    optionOrder: shuffleArray([0, 1, 2, 3]),
  }));
}

export function getLocalizedField(
  val: string | BilingualText,
  lang: UILanguage
): string {
  if (typeof val === 'string') return val;
  return lang === 'uz' ? val.uz : val.en;
}

export function getLocalizedOptions(
  opts: string[] | { uz: string[]; en: string[] },
  lang: UILanguage
): string[] {
  if (Array.isArray(opts)) return opts;
  return lang === 'uz' ? opts.uz : opts.en;
}

export function isChoiceCorrect(
  question: ActiveQuizQuestion,
  selectedDisplayIndex: number | undefined
): boolean {
  if (selectedDisplayIndex === undefined) return false;
  const originalIdx = question.optionOrder[selectedDisplayIndex];
  return originalIdx === question.source.answer;
}

export function getCorrectDisplayIndex(question: ActiveQuizQuestion): number {
  return question.optionOrder.indexOf(question.source.answer);
}

export function gradeOf(pct: number): {
  grade: 3 | 4 | 5;
  label: BilingualText;
} {
  if (pct >= 86) {
    return { grade: 5, label: { uz: "A'lo", en: 'Excellent' } };
  }
  if (pct >= 65) {
    return { grade: 4, label: { uz: 'Yaxshi', en: 'Good' } };
  }
  return { grade: 3, label: { uz: 'Qoniqarsiz', en: 'Unsatisfactory' } };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
