export type SubjectId =
  | 'math'
  | 'history'
  | 'science'
  | 'computing'
  | 'english'
  | 'uzbek';

export type UILanguage = 'uz' | 'en';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface BilingualText {
  uz: string;
  en: string;
}

export interface QuestionItem {
  id: string;
  topic: string;
  difficulty: DifficultyLevel;
  context?: string | BilingualText;
  q: string | BilingualText;
  opts: string[] | { uz: string[]; en: string[] };
  answer: number;
  explain: string | BilingualText;
}

export interface StudyGuideItem {
  title: string;
  points: string[];
}

export interface SubjectConfig {
  id: SubjectId;
  title: BilingualText;
  shortLabel: BilingualText;
  subtitle: BilingualText;
  questionLangNote: BilingualText;
  topics: string[];
  studyGuide: StudyGuideItem[];
  questions: QuestionItem[];
}

export interface ActiveQuizQuestion {
  source: QuestionItem;
  optionOrder: number[]; // maps displayed index 0..3 -> original index 0..3
}

export type VariantSelection = 1 | 2 | 3 | 4 | 5 | 'random';

export type QuizMode = 'practice' | 'exam';
