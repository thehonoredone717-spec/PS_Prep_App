import { BilingualText, DifficultyLevel, SubjectConfig, SubjectId, UILanguage } from '../types/quiz';
import { computingQuestions, computingStudyGuide, computingTopics } from './computingQuestions';
import { englishQuestions, englishStudyGuide, englishTopics } from './englishQuestions';
import { historyQuestions, historyStudyGuide, historyTopics } from './historyQuestions';
import { mathQuestions, mathStudyGuide, mathTopics } from './mathQuestions';
import { scienceQuestions, scienceStudyGuide, scienceTopics } from './scienceQuestions';
import { uzbekQuestions, uzbekStudyGuide, uzbekTopics } from './uzbekQuestions';

export interface AttemptRecord {
  id: string;
  userId?: string;
  username?: string;
  studentName?: string;
  subjectId: SubjectId;
  difficulty?: DifficultyLevel;
  variant: string;
  mode: 'practice' | 'exam';
  score: number;
  total: number;
  percentage: number;
  grade: 2 | 3 | 4 | 5;
  elapsedSeconds: number;
  completedAt: string;
  cheated?: boolean;
}

export interface SubjectPermission {
  subjectId: SubjectId;
  prohibited: boolean;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt?: string;
}

export const SUBJECTS: SubjectConfig[] = [
  {
    id: 'math',
    title: { uz: 'Matematika (G7)', en: 'Mathematics (G7)' },
    shortLabel: { uz: 'Matematika', en: 'Math' },
    subtitle: {
      uz: "Unit 9.1–9.3: Daraja va standart shakl, sonlar sistemasi, algebra, tenglamalar, 2D/3D shakllar va Pifagor teoremasi (7 mavzu)",
      en: "Units 9.1–9.3: Indices & standard form, number system, algebra, simultaneous equations, 2D/3D shapes & Pythagoras' theorem (7 topics)",
    },
    questionLangNote: { uz: 'Savollar tili: Inglizcha', en: 'Question language: English' },
    topics: mathTopics,
    studyGuide: mathStudyGuide,
    questions: mathQuestions,
  },
  {
    id: 'history',
    title: { uz: "Tarix (O'zbekiston va Jahon)", en: 'History (Uzbekistan & World)' },
    shortLabel: { uz: 'Tarix', en: 'History' },
    subtitle: {
      uz: "1, 2 va 3-Summativ mavzulari: IV–VII asr Turon, Xoqonliklar va Jahon tarixi",
      en: 'Summative 1–3 topics: Early Medieval Turan, Khaganates & World History',
    },
    questionLangNote: { uz: "Savollar tili: O'zbekcha", en: 'Question language: Uzbek' },
    topics: historyTopics,
    studyGuide: historyStudyGuide,
    questions: historyQuestions,
  },
  {
    id: 'science',
    title: { uz: 'Science (Tabiiy fanlar)', en: 'Science (Combined G7)' },
    shortLabel: { uz: 'Science', en: 'Science' },
    subtitle: {
      uz: "O‘zgaruvchilar, laboratoriya xavfsizligi, molekulalar, ionlar, bog‘lanish, minerallar, fotosintez, uglerod sikli va zichlik",
      en: 'Variables, lab safety & tools, molecules, ions, bonding, structures, minerals, photosynthesis, water pathways, carbon cycle, periodic trends & density',
    },
    questionLangNote: { uz: 'Savollar tili: Inglizcha', en: 'Question language: English' },
    topics: scienceTopics,
    studyGuide: scienceStudyGuide,
    questions: scienceQuestions,
  },
  {
    id: 'computing',
    title: { uz: 'Informatika (Computing)', en: 'Computing (G7)' },
    shortLabel: { uz: 'Informatika', en: 'Computing' },
    subtitle: {
      uz: "Tarmoqlar, masshtablanuvchanlik (9DC.03), paketlar, saqlash, xavfsizlik, CPU registrlari va dasturlash (11 mavzu)",
      en: 'Networks, scalability (9DC.03), packets, storage, security, CPU registers & programming (11 topics)',
    },
    questionLangNote: { uz: "Savollar tili: O'zbekcha / Inglizcha", en: 'Question language: Bilingual (EN / UZ)' },
    topics: computingTopics,
    studyGuide: computingStudyGuide,
    questions: computingQuestions,
  },
  {
    id: 'english',
    title: { uz: 'Ingliz tili (Think 3 · Units 1–5)', en: 'English (Think 3 · Units 1–5)' },
    shortLabel: { uz: 'Ingliz tili', en: 'English' },
    subtitle: {
      uz: "Zamonlar, modal fe'llar, hikoya zamonlari, lug‘at va iboralar (1–5-bo‘limlar)",
      en: 'Tenses, modals, narrative forms, phrasal expressions & vocabulary (Units 1–5)',
    },
    questionLangNote: { uz: 'Savollar tili: Inglizcha', en: 'Question language: English' },
    topics: englishTopics,
    studyGuide: englishStudyGuide,
    questions: englishQuestions,
  },
  {
    id: 'uzbek',
    title: { uz: 'Ona tili va Adabiyot (7-sinf)', en: 'Uzbek Language & Literature (G7)' },
    shortLabel: { uz: 'Ona tili va Adabiyot', en: 'Ona tili' },
    subtitle: {
      uz: "Olmosh, fe'l, ravish, sintaksis, mumtoz va zamonaviy o‘zbek adabiyoti",
      en: 'Pronouns, verbs, adverbs, syntax, classical & modern Uzbek literature',
    },
    questionLangNote: { uz: "Savollar tili: O'zbekcha", en: 'Question language: Uzbek' },
    topics: uzbekTopics,
    studyGuide: uzbekStudyGuide,
    questions: uzbekQuestions,
  },
];

export const SUBJECT_MAP: Record<SubjectId, SubjectConfig> = SUBJECTS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<SubjectId, SubjectConfig>
);

export const TOTAL_QUESTION_COUNT = SUBJECTS.reduce(
  (sum, item) => sum + item.questions.length,
  0
);

export const UI_COPY: Record<
  UILanguage,
  {
    brand: string;
    navHome: string;
    navSubjects: string;
    navTest: string;
    navGuide: string;
    navResults: string;
    navPermission: string;
    downloadHtml: string;
    heroTitle: string;
    heroSubtitle: string;
    questionsPerTest: string;
    variantsCount: string;
    totalBank: string;
    startTest: string;
    openGuide: string;
    bestScore: string;
    notAttempted: string;
    difficultyLabel: string;
    variant: string;
    randomVariant: string;
    modePractice: string;
    modeExam: string;
    startOver: string;
    startOverHint: string;
    questionOf: string;
    answeredCount: string;
    previous: string;
    next: string;
    finishExam: string;
    correctBadge: string;
    incorrectBadge: string;
    unansweredBadge: string;
    explanation: string;
    resultTitle: string;
    scoreLabel: string;
    gradeLabel: string;
    timeLabel: string;
    topicBreakdown: string;
    topicCol: string;
    correctCol: string;
    accuracyCol: string;
    answerReview: string;
    filterAll: string;
    filterWrong: string;
    yourAnswer: string;
    correctAnswer: string;
    notSelected: string;
    studyGuideTitle: string;
    topicsCovered: string;
    historyTitle: string;
    historyEmpty: string;
    clearHistory: string;
    subjectCol: string;
    variantCol: string;
    modeCol: string;
    dateCol: string;
    gradingScaleNote: string;
    backToTest: string;
    htmlDownloaded: string;
    signOut: string;
    teacherBadge: string;
    computingTeacherBadge: string;
    mathTeacherBadge: string;
    scienceTeacherBadge: string;
    englishTeacherBadge: string;
    studentBadge: string;
    teacherResultsTitle: string;
    computingResultsTitle: string;
    mathResultsTitle: string;
    scienceResultsTitle: string;
    englishResultsTitle: string;
    studentCol: string;
    allStudents: string;
    allSubjects: string;
    totalAttempts: string;
    activeStudents: string;
    averagePct: string;
    gradeFiveCount: string;
    deleteRecord: string;
    resultsSyncNote: string;
  }
> = {
  uz: {
    brand: '7-Sinf ChSB',
    navHome: 'Dashboard',
    navSubjects: 'Fanlar',
    navTest: 'Test',
    navGuide: "Qo'llanma",
    navResults: 'Natijalar',
    navPermission: 'Permission',
    downloadHtml: 'HTML Yuklash',
    heroTitle: '7-Sinf ChSB Tayyorlov Platformasi',
    heroSubtitle:
      "6 ta asosiy fan, har bir fanda Oson, O'rta va Qiyin darajalari bo'yicha 5 tadan (jami 15 ta) 25 talik variant hamda qayta boshlanganda savollar almashadigan ChSB imtihon muhiti.",
    questionsPerTest: '25 ta savol / test',
    variantsCount: '3 daraja × 5 variant + Tasodifiy 25',
    totalBank: `${TOTAL_QUESTION_COUNT} ta savol bazasi`,
    startTest: 'Testni boshlash',
    openGuide: "Mavzular va qo'llanma",
    bestScore: 'Eng yaxshi natija',
    notAttempted: 'Hali topshirilmagan',
    difficultyLabel: 'Qiyinchilik darajasi',
    variant: 'Variant',
    randomVariant: 'Tasodifiy 25',
    modePractice: 'Mashq (darhol javob)',
    modeExam: 'Imtihon (yakunda tekshirish)',
    startOver: 'Start over · Qayta boshlash',
    startOverHint: 'Shu daraja ichida yangi variant va aralashtirilgan savollar ochiladi',
    questionOf: 'Savol',
    answeredCount: 'Javob berildi',
    previous: 'Oldingi',
    next: 'Keyingi',
    finishExam: 'Testni yakunlash',
    correctBadge: "To'g'ri",
    incorrectBadge: "Noto'g'ri",
    unansweredBadge: 'Belgilanmagan',
    explanation: 'Izoh',
    resultTitle: 'ChSB Test Natijasi',
    scoreLabel: 'Ball',
    gradeLabel: 'Baho (ChSB)',
    timeLabel: 'Sarflangan vaqt',
    topicBreakdown: "Mavzular bo'yicha tahlil",
    topicCol: 'Mavzu',
    correctCol: "To'g'ri",
    accuracyCol: 'Foiz',
    answerReview: 'Savollar tahlili',
    filterAll: 'Barcha 25 savol',
    filterWrong: 'Faqat xatolar',
    yourAnswer: 'Sizning javobingiz',
    correctAnswer: "To'g'ri javob",
    notSelected: 'Tanlanmagan',
    studyGuideTitle: "Tezkor takrorlash va mavzular ro'yxati",
    topicsCovered: 'Qamrab olingan mavzular',
    historyTitle: 'Topshirilgan testlar tarixi',
    historyEmpty: "Hali birorta 25 talik test yakunlanmagan. Istalgan fanni tanlab testni boshlang.",
    clearHistory: 'Tarixni tozalash',
    subjectCol: 'Fan',
    variantCol: 'Variant',
    modeCol: 'Rejim',
    dateCol: 'Vaqt',
    gradingScaleNote: "Baholash mezoni: 86–100% = 5 (a'lo) · 65–85% = 4 (yaxshi) · 0–64% = 3 (qoniqarsiz)",
    backToTest: 'Testga qaytish',
    htmlDownloaded: 'Offline HTML fayl yuklab olindi',
    signOut: 'Chiqish',
    teacherBadge: "O'qituvchi",
    computingTeacherBadge: "Informatika O'qituvchisi",
    mathTeacherBadge: "Matematika O'qituvchisi",
    scienceTeacherBadge: "Science O'qituvchisi",
    englishTeacherBadge: "Ingliz tili O'qituvchisi",
    studentBadge: "O'quvchi",
    teacherResultsTitle: "Barcha o'quvchilarning ChSB natijalari",
    computingResultsTitle: "O'quvchilarning Informatika (Computing) natijalari",
    mathResultsTitle: "O'quvchilarning Matematika natijalari",
    scienceResultsTitle: "O'quvchilarning Science (Tabiiy fanlar) natijalari",
    englishResultsTitle: "O'quvchilarning Ingliz tili natijalari",
    studentCol: "O'quvchi",
    allStudents: "Barcha o'quvchilar",
    allSubjects: 'Barcha fanlar',
    totalAttempts: 'Jami urinishlar',
    activeStudents: "Faol o'quvchilar",
    averagePct: "O'rtacha foiz",
    gradeFiveCount: "5 (a'lo) baholar",
    deleteRecord: "O'chirish",
    resultsSyncNote: "Natijalar avtomatik ravishda bulutga saqlanadi va o'qituvchi panelida ko'rinadi.",
  },
  en: {
    brand: 'Grade 7 ChSB',
    navHome: 'Dashboard',
    navSubjects: 'Subjects',
    navTest: 'Quiz',
    navGuide: 'Study Guide',
    navResults: 'Results',
    navPermission: 'Permission',
    downloadHtml: 'Download HTML',
    heroTitle: 'Grade 7 ChSB Exam Prep Platform',
    heroSubtitle:
      'Dedicated sections for 6 core subjects, 3 difficulty levels (Easy, Medium, Hard) with 5 distinct 25-question variants each plus Random Mix and guaranteed shuffle on Start over.',
    questionsPerTest: '25 questions / test',
    variantsCount: '3 tiers × 5 variants + Random Mix',
    totalBank: `${TOTAL_QUESTION_COUNT} total questions`,
    startTest: 'Start Test',
    openGuide: 'Topics & Study Guide',
    bestScore: 'Best score',
    notAttempted: 'Not attempted yet',
    difficultyLabel: 'Difficulty',
    variant: 'Variant',
    randomVariant: 'Random 25',
    modePractice: 'Practice (instant check)',
    modeExam: 'Exam (grade at end)',
    startOver: 'Start over',
    startOverHint: 'Switches to the next variant in this tier and shuffles order on every click',
    questionOf: 'Question',
    answeredCount: 'Answered',
    previous: 'Previous',
    next: 'Next',
    finishExam: 'Submit Test',
    correctBadge: 'Correct',
    incorrectBadge: 'Incorrect',
    unansweredBadge: 'Unanswered',
    explanation: 'Explanation',
    resultTitle: 'ChSB Test Results',
    scoreLabel: 'Score',
    gradeLabel: 'ChSB Grade',
    timeLabel: 'Time spent',
    topicBreakdown: 'Performance by Topic',
    topicCol: 'Topic',
    correctCol: 'Correct',
    accuracyCol: 'Accuracy',
    answerReview: 'Question Review',
    filterAll: 'All 25 questions',
    filterWrong: 'Incorrect only',
    yourAnswer: 'Your answer',
    correctAnswer: 'Correct answer',
    notSelected: 'Not answered',
    studyGuideTitle: 'Quick Revision Guide & Syllabus Topics',
    topicsCovered: 'Covered Syllabus Topics',
    historyTitle: 'Completed Test History',
    historyEmpty: 'No 25-question tests submitted yet. Pick any subject to begin.',
    clearHistory: 'Clear History',
    subjectCol: 'Subject',
    variantCol: 'Variant',
    modeCol: 'Mode',
    dateCol: 'Completed',
    gradingScaleNote: 'Grading scale: 86–100% = 5 (Excellent) · 65–85% = 4 (Good) · 0–64% = 3 (Unsatisfactory)',
    backToTest: 'Return to Quiz',
    htmlDownloaded: 'Offline HTML file downloaded',
    signOut: 'Sign Out',
    teacherBadge: 'Teacher',
    computingTeacherBadge: 'Computing Teacher',
    mathTeacherBadge: 'Math Teacher',
    scienceTeacherBadge: 'Science Teacher',
    englishTeacherBadge: 'English Teacher',
    studentBadge: 'Student',
    teacherResultsTitle: 'All Students ChSB Results',
    computingResultsTitle: "Students' Computing Results",
    mathResultsTitle: "Students' Math Results",
    scienceResultsTitle: "Students' Science Results",
    englishResultsTitle: "Students' English Results",
    studentCol: 'Student',
    allStudents: 'All students',
    allSubjects: 'All subjects',
    totalAttempts: 'Total attempts',
    activeStudents: 'Active students',
    averagePct: 'Average score',
    gradeFiveCount: 'Grade 5 (Excellent)',
    deleteRecord: 'Delete',
    resultsSyncNote: 'Results sync automatically to the cloud and are visible in the teacher dashboard.',
  },
};

export function pickText(text: BilingualText, lang: UILanguage): string {
  return lang === 'uz' ? text.uz : text.en;
}
