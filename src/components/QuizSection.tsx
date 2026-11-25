import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AttemptRecord, UI_COPY, pickText } from '../data/subjects';
import { CameraProctor } from './CameraProctor';
import { FormattedMathText } from './FormattedMathText';
import { ScientificCalculator } from './ScientificCalculator';
import {
  ActiveQuizQuestion,
  DifficultyLevel,
  QuizMode,
  SubjectConfig,
  UILanguage,
  VariantSelection,
} from '../types/quiz';
import {
  DIFFICULTY_LEVELS,
  QUESTIONS_PER_TEST,
  buildVariantQuestions,
  formatTime,
  getCorrectDisplayIndex,
  getDifficultyLabel,
  getLocalizedField,
  getLocalizedOptions,
  getNextVariant,
  getVariantLabel,
  gradeOf,
  isChoiceCorrect,
} from '../utils/quizEngine';
import {
  isFullscreenActive,
  requestAppFullscreen,
  unlockSystemKeys,
} from '../utils/fullscreen';

interface QuizSectionProps {
  subject: SubjectConfig;
  lang: UILanguage;
  onOpenGuide: () => void;
  onRecordAttempt: (record: AttemptRecord) => void;
  onRunningStateChange?: (running: boolean) => void;
  registerFinishQuiz?: (fn: (() => void) | null) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const VARIANT_CHOICES: VariantSelection[] = [1, 2, 3, 4, 5, 'random'];
const MAX_WARNINGS = 3;
const GRACE_SECONDS = 3;

function playWarningBeep(isFinalZero: boolean) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isFinalZero ? 'sawtooth' : 'triangle';
    osc.frequency.value = isFinalZero ? 320 : 620;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (isFinalZero ? 0.35 : 0.16));
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Ignore Web Audio restriction errors
  }
}

export function QuizSection({
  subject,
  lang,
  onOpenGuide,
  onRecordAttempt,
  onRunningStateChange,
  registerFinishQuiz,
}: QuizSectionProps) {
  const copy = UI_COPY[lang];

  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [variant, setVariant] = useState<VariantSelection>(1);
  const [mode, setMode] = useState<QuizMode>('practice');
  const [questions, setQuestions] = useState<ActiveQuizQuestion[]>(() =>
    buildVariantQuestions(subject, 'easy', 1)
  );
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [started, setStarted] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong'>('all');
  const [rotationCount, setRotationCount] = useState<number>(0);
  const [pendingSwitchAction, setPendingSwitchAction] = useState<(() => void) | null>(null);

  // Per-test anti-cheat focus / tab / desktop guard state (3 warnings, 3s grace period)
  const [warningsLeft, setWarningsLeft] = useState<number>(MAX_WARNINGS);
  const [isAway, setIsAway] = useState<boolean>(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number>(GRACE_SECONDS);
  const [warningModal, setWarningModal] = useState<{
    remaining: number;
    deductedCount: number;
  } | null>(null);
  const [forcedZero, setForcedZero] = useState<boolean>(false);
  const [showForcedZeroOverlay, setShowForcedZeroOverlay] = useState<boolean>(false);
  const [fullscreenLost, setFullscreenLost] = useState<boolean>(false);
  const [securityViolationMsg, setSecurityViolationMsg] = useState<string | null>(null);

  const awayStartedAtRef = useRef<number | null>(null);
  const deductedThisAwayRef = useRef<number>(0);
  const warningsLeftRef = useRef<number>(MAX_WARNINGS);
  const submittedRef = useRef<boolean>(false);
  const blurConfirmTimerRef = useRef<number | null>(null);
  const wasFullscreenInTestRef = useRef<boolean>(false);
  const lastScreenshotPenaltyRef = useRef<number>(0);
  const originalTitleRef = useRef<string>(
    typeof document !== 'undefined' ? document.title : 'Grade 7 ChSB'
  );

  // Camera proctoring state & permissions
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'requesting' | 'active' | 'denied' | 'error'
  >('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(false);
  const lastRafAtRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0
  );

  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (cameraStream && cameraStream.active) {
      setCameraStatus('active');
      return true;
    }
    setCameraStatus('requesting');
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error(
          lang === 'uz'
            ? 'Brauzeringizda veb-kamera funksiyasi mavjud emas'
            : 'Camera access is not supported by your browser'
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 360 },
        },
        audio: false,
      });
      setCameraStream(stream);
      setCameraStatus('active');
      return true;
    } catch (err: unknown) {
      const errName = (err as { name?: string })?.name;
      let msg =
        lang === 'uz'
          ? 'Kameraga ulanishda xatolik yuz berdi. Brauzer sozlamalarida kameraga ruxsat bering.'
          : 'Failed to access camera. Please allow camera permissions in browser settings.';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        msg =
          lang === 'uz'
            ? 'Kameradan foydalanish rad etildi. Brauzer manzillar panelidagi qulf belgisini bosib kameraga ruxsat bering.'
            : 'Camera access was denied. Please click the lock icon in the address bar to allow camera.';
        setCameraStatus('denied');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        msg =
          lang === 'uz'
            ? 'Kompyuteringizda veb-kamera topilmadi.'
            : 'No webcam was found on this computer.';
        setCameraStatus('error');
      } else {
        setCameraStatus('error');
      }
      setCameraError(msg);
      return false;
    }
  }, [cameraStream, lang]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const resetFocusGuard = useCallback(() => {
    if (blurConfirmTimerRef.current !== null) {
      window.clearTimeout(blurConfirmTimerRef.current);
      blurConfirmTimerRef.current = null;
    }
    awayStartedAtRef.current = null;
    deductedThisAwayRef.current = 0;
    warningsLeftRef.current = MAX_WARNINGS;
    submittedRef.current = false;
    setWarningsLeft(MAX_WARNINGS);
    setIsAway(false);
    setGraceSecondsLeft(GRACE_SECONDS);
    setWarningModal(null);
    setForcedZero(false);
    setShowForcedZeroOverlay(false);
    setFullscreenLost(false);
    setSecurityViolationMsg(null);
    wasFullscreenInTestRef.current = isFullscreenActive();
    setPendingSwitchAction(null);
    if (typeof document !== 'undefined') {
      document.title = originalTitleRef.current;
    }
  }, []);

  // Reset to Variant 1 of current difficulty whenever user switches to a different subject section
  useEffect(() => {
    const fresh = buildVariantQuestions(subject, difficulty, 1);
    setVariant(1);
    setQuestions(fresh);
    setAnswers({});
    setCurrentIndex(0);
    setStarted(false);
    setSubmitted(false);
    setElapsedSeconds(0);
    setReviewFilter('all');
    setRotationCount(0);
    resetFocusGuard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  // Live exam timer (runs only after user clicks Start)
  useEffect(() => {
    if (!started || submitted) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [started, submitted, subject.id, difficulty, variant, rotationCount]);

  const startSession = (
    nextDiff: DifficultyLevel,
    nextVar: VariantSelection,
    prevIds: string[]
  ) => {
    const nextQuestions = buildVariantQuestions(subject, nextDiff, nextVar, prevIds);
    setDifficulty(nextDiff);
    setVariant(nextVar);
    setQuestions(nextQuestions);
    setAnswers({});
    setCurrentIndex(0);
    setStarted(false);
    setSubmitted(false);
    setElapsedSeconds(0);
    setReviewFilter('all');
    setRotationCount((c) => c + 1);
    resetFocusGuard();
  };

  const guardSwitch = (action: () => void) => {
    if (started && !submitted) {
      setPendingSwitchAction(() => action);
      return;
    }
    action();
  };

  // Mandatory requirement: Every time "Start over" is clicked, questions swap/shuffle
  const handleStartOver = () => {
    guardSwitch(() => {
      const nextVar = getNextVariant(variant);
      const prevIds = questions.map((q) => q.source.id);
      startSession(difficulty, nextVar, prevIds);
    });
  };

  const handleSelectDifficulty = (chosenDifficulty: DifficultyLevel) => {
    if (chosenDifficulty === difficulty && !submitted) return;
    guardSwitch(() => {
      const prevIds = questions.map((q) => q.source.id);
      startSession(chosenDifficulty, 1, prevIds);
    });
  };

  const handleSelectVariant = (chosenVariant: VariantSelection) => {
    if (chosenVariant === variant && !submitted) return;
    guardSwitch(() => {
      const prevIds = questions.map((q) => q.source.id);
      startSession(difficulty, chosenVariant, prevIds);
    });
  };

  const handleBeginTest = async () => {
    if (cameraStatus !== 'active') {
      const ok = await requestCamera();
      if (!ok) return;
    }
    resetFocusGuard();
    setElapsedSeconds(0);
    setStarted(true);
    void requestAppFullscreen(true).then((entered) => {
      if (entered) {
        wasFullscreenInTestRef.current = true;
        setFullscreenLost(false);
      }
    });
  };

  const handleSelectOption = (displayIdx: number) => {
    if (!started || submitted) return;
    if (mode === 'practice' && answers[currentIndex] !== undefined) return;
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: displayIdx,
    }));
  };

  const handleSubmit = () => {
    if (submitted || submittedRef.current) return;
    submittedRef.current = true;
    awayStartedAtRef.current = null;
    if (blurConfirmTimerRef.current !== null) {
      window.clearTimeout(blurConfirmTimerRef.current);
      blurConfirmTimerRef.current = null;
    }
    setIsAway(false);
    setWarningModal(null);
    if (typeof document !== 'undefined') {
      document.title = originalTitleRef.current;
    }

    let correct = 0;
    questions.forEach((q, idx) => {
      if (isChoiceCorrect(q, answers[idx])) {
        correct += 1;
      }
    });
    const pct = Math.round((correct / QUESTIONS_PER_TEST) * 100);
    const { grade } = gradeOf(pct);

    onRecordAttempt({
      id: `${subject.id}-${Date.now()}`,
      subjectId: subject.id,
      difficulty,
      variant: getVariantLabel(variant, lang),
      mode,
      score: correct,
      total: QUESTIONS_PER_TEST,
      percentage: pct,
      grade,
      elapsedSeconds,
      completedAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  // Keep latest callback for immediate zero-score termination when 3rd warning runs out
  const forceZeroSubmitRef = useRef<() => void>(() => {});
  forceZeroSubmitRef.current = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    awayStartedAtRef.current = null;
    if (blurConfirmTimerRef.current !== null) {
      window.clearTimeout(blurConfirmTimerRef.current);
      blurConfirmTimerRef.current = null;
    }
    warningsLeftRef.current = 0;
    setWarningsLeft(0);
    setIsAway(false);
    setWarningModal(null);
    setForcedZero(true);
    setShowForcedZeroOverlay(true);
    if (typeof document !== 'undefined') {
      document.title = originalTitleRef.current;
    }
    playWarningBeep(true);

    const { grade } = gradeOf(0);
    onRecordAttempt({
      id: `${subject.id}-${Date.now()}`,
      subjectId: subject.id,
      difficulty,
      variant: getVariantLabel(variant, lang),
      mode,
      score: 0,
      total: QUESTIONS_PER_TEST,
      percentage: 0,
      grade,
      elapsedSeconds,
      completedAt: new Date().toISOString(),
      cheated: true,
    });
    setSubmitted(true);
  };

  const triggerInstantPenalty = useCallback(
    (reasonUz: string, reasonEn: string) => {
      if (submittedRef.current) return;
      const now = Date.now();
      if (now - lastScreenshotPenaltyRef.current < 1500) return;
      lastScreenshotPenaltyRef.current = now;

      try {
        void navigator.clipboard?.writeText?.('').catch(() => {});
      } catch {
        // Ignore clipboard errors
      }

      const nextWarnings = Math.max(0, warningsLeftRef.current - 1);
      warningsLeftRef.current = nextWarnings;
      setWarningsLeft(nextWarnings);
      if (nextWarnings <= 0) {
        forceZeroSubmitRef.current();
        return;
      }
      playWarningBeep(false);
      setSecurityViolationMsg(lang === 'uz' ? reasonUz : reasonEn);
    },
    [lang]
  );

  // Sync running state and submit callback with App navigation guard
  const finishHandlerRef = useRef<() => void>(() => {});
  finishHandlerRef.current = handleSubmit;

  useEffect(() => {
    const active = started && !submitted;
    onRunningStateChange?.(active);
    registerFinishQuiz?.(active ? () => finishHandlerRef.current() : null);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('quiz-locked', active);
    }
    if (!active) {
      unlockSystemKeys();
    }
    return () => {
      onRunningStateChange?.(false);
      registerFinishQuiz?.(null);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('quiz-locked');
      }
      unlockSystemKeys();
    };
  }, [started, submitted, onRunningStateChange, registerFinishQuiz]);

  // Monitor tab switching, window blur, virtual desktop, fullscreen exit, screenshots & system keys
  useEffect(() => {
    if (!started || submitted) return;

    if (isFullscreenActive()) {
      wasFullscreenInTestRef.current = true;
    }

    lastRafAtRef.current = performance.now();
    let rafId = 0;
    let unmounted = false;

    const rafLoop = (now: number) => {
      if (unmounted) return;
      lastRafAtRef.current = now;
      rafId = window.requestAnimationFrame(rafLoop);
    };
    rafId = window.requestAnimationFrame(rafLoop);

    const startAwayTracking = (backdateMs = 0) => {
      if (submittedRef.current) return;
      if (awayStartedAtRef.current !== null) return;
      awayStartedAtRef.current = Date.now() - Math.max(0, backdateMs);
      deductedThisAwayRef.current = 0;
      setIsAway(true);
      setGraceSecondsLeft(GRACE_SECONDS);
      playWarningBeep(false);
    };

    const stopAwayTracking = () => {
      if (blurConfirmTimerRef.current !== null) {
        window.clearTimeout(blurConfirmTimerRef.current);
        blurConfirmTimerRef.current = null;
      }
      if (awayStartedAtRef.current === null) return;

      const elapsedMs = Date.now() - awayStartedAtRef.current;
      const stepsPassed = Math.floor(elapsedMs / (GRACE_SECONDS * 1000));
      if (stepsPassed > deductedThisAwayRef.current) {
        const delta = stepsPassed - deductedThisAwayRef.current;
        deductedThisAwayRef.current = stepsPassed;
        const nextWarnings = Math.max(0, warningsLeftRef.current - delta);
        warningsLeftRef.current = nextWarnings;
        setWarningsLeft(nextWarnings);
        if (nextWarnings <= 0) {
          forceZeroSubmitRef.current();
          return;
        }
      }
      if (submittedRef.current) return;

      const lostCount = deductedThisAwayRef.current;
      awayStartedAtRef.current = null;
      deductedThisAwayRef.current = 0;
      setIsAway(false);
      setGraceSecondsLeft(GRACE_SECONDS);
      document.title = originalTitleRef.current;

      if (lostCount > 0) {
        setWarningModal({
          remaining: warningsLeftRef.current,
          deductedCount: lostCount,
        });
      }
    };

    const tickAwayProgress = () => {
      if (submittedRef.current) return;

      const hiddenOrUnfocused =
        document.hidden ||
        document.visibilityState !== 'visible' ||
        !document.hasFocus();
      const rafGapMs = performance.now() - lastRafAtRef.current;
      const rafStalled = rafGapMs > 1200;

      if (hiddenOrUnfocused || rafStalled) {
        if (awayStartedAtRef.current === null) {
          startAwayTracking(rafStalled ? Math.min(1000, Math.floor(rafGapMs)) : 0);
        }
      } else if (
        awayStartedAtRef.current !== null &&
        (!wasFullscreenInTestRef.current || isFullscreenActive())
      ) {
        stopAwayTracking();
        return;
      }

      if (awayStartedAtRef.current === null) return;
      const elapsedMs = Date.now() - awayStartedAtRef.current;
      const stepsPassed = Math.floor(elapsedMs / (GRACE_SECONDS * 1000));

      if (stepsPassed > deductedThisAwayRef.current) {
        const delta = stepsPassed - deductedThisAwayRef.current;
        deductedThisAwayRef.current = stepsPassed;
        const nextWarnings = Math.max(0, warningsLeftRef.current - delta);
        warningsLeftRef.current = nextWarnings;
        setWarningsLeft(nextWarnings);

        if (nextWarnings <= 0) {
          forceZeroSubmitRef.current();
          return;
        }
        playWarningBeep(false);
      }

      const nextBoundaryMs = (stepsPassed + 1) * GRACE_SECONDS * 1000;
      const secLeft = Math.max(1, Math.ceil((nextBoundaryMs - elapsedMs) / 1000));
      setGraceSecondsLeft(secLeft);
      document.title =
        lang === 'uz'
          ? `⚠️ (${secLeft}s) Testga qayting! — ${warningsLeftRef.current}/${MAX_WARNINGS}`
          : `⚠️ (${secLeft}s) Return to quiz! — ${warningsLeftRef.current}/${MAX_WARNINGS}`;
    };

    const handleVisibilityChange = () => {
      if (submittedRef.current) return;
      if (document.hidden || document.visibilityState !== 'visible') {
        startAwayTracking();
        tickAwayProgress();
      } else if (document.hasFocus()) {
        stopAwayTracking();
      }
    };

    const handleWindowBlur = () => {
      if (submittedRef.current) return;
      if (blurConfirmTimerRef.current !== null) {
        window.clearTimeout(blurConfirmTimerRef.current);
      }
      // Immediate cover when losing focus (blocks virtual desktop switches, Ask Gemini, Snipping Tool, etc.)
      startAwayTracking();
      tickAwayProgress();
    };

    const handleFocusOut = () => {
      if (submittedRef.current) return;
      window.setTimeout(() => {
        if (!submittedRef.current && (!document.hasFocus() || document.hidden)) {
          startAwayTracking();
          tickAwayProgress();
        }
      }, 60);
    };

    const handleWindowFocus = () => {
      if (submittedRef.current) return;
      lastRafAtRef.current = performance.now();
      if (!document.hidden && document.hasFocus()) {
        stopAwayTracking();
      }
    };

    const handleFullscreenChange = () => {
      if (submittedRef.current) return;
      if (isFullscreenActive()) {
        wasFullscreenInTestRef.current = true;
        setFullscreenLost(false);
        lastRafAtRef.current = performance.now();
        if (!document.hidden && document.hasFocus()) {
          stopAwayTracking();
        }
      } else if (wasFullscreenInTestRef.current) {
        setFullscreenLost(true);
        startAwayTracking();
        tickAwayProgress();
      }
    };

    const handleKeyGuard = (e: KeyboardEvent) => {
      if (submittedRef.current) return;
      const keyLower = (e.key || '').toLowerCase();
      const isPrintScreen =
        e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44;
      const isMetaOrWin =
        e.key === 'Meta' ||
        e.key === 'OS' ||
        e.code === 'MetaLeft' ||
        e.code === 'MetaRight' ||
        e.metaKey;
      const isAltTab = e.altKey && e.key === 'Tab';
      const isBlockedCtrlCombo =
        e.ctrlKey &&
        (['p', 's', 'u', 'c', 'x', 'a', 'g'].includes(keyLower) ||
          (e.shiftKey && ['i', 'j', 'c', 's'].includes(keyLower)));
      const isSystemNavKey = e.key === 'Escape' || e.key === 'F11' || e.key === 'F12';

      if (isPrintScreen || isMetaOrWin || isAltTab || isBlockedCtrlCombo || isSystemNavKey) {
        e.preventDefault();
        e.stopPropagation();
      }

      const isScreenshotOrSystemCombo =
        isPrintScreen ||
        isMetaOrWin ||
        isAltTab ||
        (e.ctrlKey && e.shiftKey && keyLower === 's') ||
        (e.ctrlKey && keyLower === 'p') ||
        (isMetaOrWin && e.shiftKey && ['3', '4', '5', 's'].includes(keyLower));

      if (isScreenshotOrSystemCombo) {
        triggerInstantPenalty(
          'Skrinshot olish, boshqa desktop/oynaga o‘tish yoki Win / Win+G tugmalarini bosish taqiqlanadi! 1 ta ogohlantirish olib tashlandi.',
          'Screenshots, switching desktops/windows, Start (Win), and Win+G are prohibited! 1 warning was deducted.'
        );
      }
    };

    const preventAction = (e: Event) => {
      e.preventDefault();
    };

    const intervalId = window.setInterval(tickAwayProgress, 200);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('freeze', handleWindowBlur);
    window.addEventListener('pagehide', handleWindowBlur);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyGuard, { capture: true });
    window.addEventListener('keyup', handleKeyGuard, { capture: true });
    document.addEventListener('contextmenu', preventAction, { capture: true });
    document.addEventListener('copy', preventAction, { capture: true });
    document.addEventListener('cut', preventAction, { capture: true });
    document.addEventListener('selectstart', preventAction, { capture: true });
    document.addEventListener('dragstart', preventAction, { capture: true });

    return () => {
      unmounted = true;
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      if (blurConfirmTimerRef.current !== null) {
        window.clearTimeout(blurConfirmTimerRef.current);
        blurConfirmTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('freeze', handleWindowBlur);
      window.removeEventListener('pagehide', handleWindowBlur);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyGuard, { capture: true });
      window.removeEventListener('keyup', handleKeyGuard, { capture: true });
      document.removeEventListener('contextmenu', preventAction, { capture: true });
      document.removeEventListener('copy', preventAction, { capture: true });
      document.removeEventListener('cut', preventAction, { capture: true });
      document.removeEventListener('selectstart', preventAction, { capture: true });
      document.removeEventListener('dragstart', preventAction, { capture: true });
      document.title = originalTitleRef.current;
    };
  }, [started, submitted, lang, subject.id, difficulty, variant, rotationCount, triggerInstantPenalty]);

  const answeredCount = Object.keys(answers).length;
  const activeQuestion = questions[currentIndex];

  const resultsSummary = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;
    const topicMap = new Map<string, { ok: number; total: number }>();

    questions.forEach((q, idx) => {
      const entry = topicMap.get(q.source.topic) ?? { ok: 0, total: 0 };
      entry.total += 1;
      if (isChoiceCorrect(q, answers[idx])) {
        correct += 1;
        entry.ok += 1;
      }
      topicMap.set(q.source.topic, entry);
    });

    const finalCorrect = forcedZero ? 0 : correct;
    const percentage = Math.round((finalCorrect / QUESTIONS_PER_TEST) * 100);
    const gradeInfo = gradeOf(percentage);
    const topicRows = Array.from(topicMap.entries()).map(([topic, stat]) => ({
      topic,
      ok: stat.ok,
      total: stat.total,
      pct: Math.round((stat.ok / stat.total) * 100),
    }));

    return { correct: finalCorrect, percentage, gradeInfo, topicRows };
  }, [submitted, questions, answers, forcedZero]);

  return (
    <section className="space-y-5">
      {/* Subject Header & Variant / Mode Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              {pickText(subject.title, lang)}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {pickText(subject.subtitle, lang)} · {pickText(subject.questionLangNote, lang)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCalculatorOpen((open) => !open)}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                calculatorOpen
                  ? 'border-teal-700 bg-teal-50 text-teal-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Calculator className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>{lang === 'uz' ? 'Kalkulyator' : 'Calculator'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenGuide}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>{copy.navGuide}</span>
            </button>

            <button
              type="button"
              onClick={handleStartOver}
              title={copy.startOverHint}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>{copy.startOver}</span>
            </button>
          </div>
        </div>

        {/* Difficulty Tier + Quiz Mode Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {copy.difficultyLabel}:
            </span>
            <div
              role="group"
              aria-label={copy.difficultyLabel}
              className="inline-flex rounded-lg bg-slate-100 p-0.5"
            >
              {DIFFICULTY_LEVELS.map((lvl) => {
                const active = difficulty === lvl;
                const activeColor =
                  lvl === 'easy'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : lvl === 'medium'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-rose-700 text-white shadow-xs';
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSelectDifficulty(lvl)}
                    className={`min-h-[36px] rounded-md px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 sm:text-sm ${
                      active ? activeColor : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {getDifficultyLabel(lvl, lang)}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="group"
            aria-label={lang === 'uz' ? 'Test rejimi' : 'Quiz Mode'}
            className="inline-flex rounded-lg bg-slate-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => setMode('practice')}
              className={`min-h-[36px] rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                mode === 'practice'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {copy.modePractice}
            </button>
            <button
              type="button"
              onClick={() => setMode('exam')}
              className={`min-h-[36px] rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                mode === 'exam'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {copy.modeExam}
            </button>
          </div>
        </div>

        {/* 5 Variants per Difficulty + Random 25 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div
            role="group"
            aria-label={lang === 'uz' ? 'Variant tanlash' : 'Select Variant'}
            className="flex flex-wrap items-center gap-1.5"
          >
            {VARIANT_CHOICES.map((v) => {
              const active = variant === v;
              return (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => handleSelectVariant(v)}
                  className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 sm:text-sm ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {getVariantLabel(v, lang)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="font-mono-num mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
          <span>
            {getDifficultyLabel(difficulty, lang)} · {getVariantLabel(variant, lang)} ·{' '}
            {QUESTIONS_PER_TEST} {lang === 'uz' ? 'savol' : 'questions'} · {copy.answeredCount}:{' '}
            {answeredCount}/{QUESTIONS_PER_TEST}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                warningsLeft === 3
                  ? 'text-emerald-700'
                  : warningsLeft === 2
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
              title={
                lang === 'uz'
                  ? 'Boshqa oyna, sayt yoki desktopga 3 soniyadan ortiq o‘tsangiz 1 ta ogohlantirish kamayadi'
                  : 'Leaving the test window, tab, or desktop for over 3 seconds removes 1 warning'
              }
            >
              {warningsLeft === MAX_WARNINGS ? (
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {lang === 'uz' ? 'Ogohlantirish' : 'Warnings'}: {warningsLeft}/{MAX_WARNINGS}
              </span>
            </span>
            <span>
              {copy.timeLabel}: {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Full-Screen Red Away Countdown Overlay */}
      {started && !submitted && isAway && (
        <div
          role="alert"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-rose-700 p-6 text-center text-white"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-white">
              <AlertTriangle className="h-11 w-11" aria-hidden="true" />
            </div>

            <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              {lang === 'uz'
                ? 'DIQQAT! TEST OYNASIDAN CHIQIB KETDINGIZ!'
                : 'ATTENTION! YOU LEFT THE QUIZ WINDOW!'}
            </h2>

            <div className="font-mono-num mt-8 flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-white/80 bg-rose-800 text-6xl font-extrabold text-white shadow-2xl sm:h-40 sm:w-40 sm:text-7xl">
              {graceSecondsLeft}s
            </div>

            <p className="mt-8 max-w-xl text-lg font-semibold leading-relaxed text-rose-50 sm:text-xl">
              {lang === 'uz'
                ? `${graceSecondsLeft} soniya ichida testga qaytmasangiz 1 ta ogohlantirish olib tashlanadi!`
                : `Return to the quiz within ${graceSecondsLeft} seconds or 1 warning will be deducted!`}
            </p>

            <div className="font-mono-num mt-5 rounded-xl border border-white/30 bg-rose-900/60 px-5 py-2.5 text-base font-bold text-white">
              {lang === 'uz' ? 'Qolgan ogohlantirishlar' : 'Warnings remaining'}: {warningsLeft} /{' '}
              {MAX_WARNINGS}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Red Warning Deducted Overlay */}
      {started && !submitted && warningModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-rose-800/95 p-6 text-center text-white"
        >
          <div className="w-full max-w-xl rounded-2xl border-2 border-rose-300/60 bg-rose-950/90 p-8 shadow-2xl sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600 text-white">
              <ShieldAlert className="h-9 w-9" aria-hidden="true" />
            </div>

            <h2 className="mt-5 font-display text-2xl font-extrabold text-white sm:text-4xl">
              {lang === 'uz' ? 'TEST QOIDASI OGOHLANTIRISHI' : 'QUIZ FOCUS WARNING'}
            </h2>

            <p className="mt-4 text-base font-medium leading-relaxed text-rose-100 sm:text-lg">
              {lang === 'uz'
                ? `Boshqa sayt, oyna yoki desktopga 3 soniyadan ortiq chiqqaningiz uchun ${warningModal.deductedCount} ta ogohlantirish olib tashlandi.`
                : `You left the test tab, window, or desktop for over 3 seconds, so ${warningModal.deductedCount} warning was deducted.`}
            </p>

            <div className="mt-6 rounded-xl border border-rose-400/50 bg-rose-900/70 p-4">
              <p className="font-mono-num text-lg font-extrabold text-white sm:text-xl">
                {lang === 'uz'
                  ? `Qolgan ogohlantirishlar: ${warningModal.remaining} / ${MAX_WARNINGS}`
                  : `Remaining warnings: ${warningModal.remaining} / ${MAX_WARNINGS}`}
              </p>
              <p className="mt-1.5 text-sm text-rose-100">
                {lang === 'uz'
                  ? 'Agar barcha 3 ta ogohlantirish tugasa, test shu zahoti yakunlanadi va natijangiz 0 bo‘ladi.'
                  : 'If all 3 warnings run out, the test ends immediately with a score of 0.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setWarningModal(null);
                void requestAppFullscreen(true).then((entered) => {
                  if (entered) {
                    wasFullscreenInTestRef.current = true;
                    setFullscreenLost(false);
                  }
                });
              }}
              className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-6 text-base font-extrabold text-rose-900 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {lang === 'uz' ? 'Tushunarli, testga qaytish' : 'Understood, continue quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Red Security Shield (Screenshot / Win+G / Blocked Shortcut) */}
      {started && !submitted && securityViolationMsg && !isAway && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[105] flex flex-col items-center justify-center bg-rose-700 p-6 text-center text-white"
        >
          <div className="w-full max-w-xl rounded-2xl border-2 border-white/40 bg-rose-900/90 p-8 shadow-2xl sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white">
              <ShieldAlert className="h-9 w-9" aria-hidden="true" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold text-white sm:text-4xl">
              {lang === 'uz' ? 'TAQIQLANGAN HARAKAT!' : 'PROHIBITED ACTION DETECTED!'}
            </h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-rose-100 sm:text-lg">
              {securityViolationMsg}
            </p>
            <div className="mt-5 rounded-xl border border-rose-300/40 bg-rose-950/60 p-3.5 font-mono-num text-lg font-extrabold text-white">
              {lang === 'uz' ? 'Qolgan ogohlantirishlar' : 'Remaining warnings'}: {warningsLeft} /{' '}
              {MAX_WARNINGS}
            </div>
            <button
              type="button"
              onClick={() => {
                setSecurityViolationMsg(null);
                void requestAppFullscreen(true);
              }}
              className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-6 text-base font-extrabold text-rose-900 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {lang === 'uz' ? 'Tushunarli, testga qaytish' : 'Understood, continue quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Red Lock when user exits Fullscreen mid-test */}
      {started && !submitted && fullscreenLost && !isAway && !securityViolationMsg && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[105] flex flex-col items-center justify-center bg-rose-700 p-6 text-center text-white"
        >
          <div className="w-full max-w-xl rounded-2xl border-2 border-white/40 bg-rose-900/90 p-8 shadow-2xl sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white">
              <ShieldAlert className="h-9 w-9" aria-hidden="true" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold text-white sm:text-4xl">
              {lang === 'uz'
                ? 'FULLSCREENDAN CHIQISH TAQIQLANADI!'
                : 'EXITING FULLSCREEN IS NOT ALLOWED!'}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-rose-100 sm:text-lg">
              {lang === 'uz'
                ? 'Testni davom ettirish uchun to‘liq ekran rejimiga qayting.'
                : 'Return to fullscreen mode to continue your test.'}
            </p>
            <button
              type="button"
              onClick={() => {
                void requestAppFullscreen(true).then((entered) => {
                  if (entered) {
                    setFullscreenLost(false);
                  }
                });
              }}
              className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-6 text-base font-extrabold text-rose-900 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {lang === 'uz' ? 'To‘liq ekranga qaytish' : 'Return to Fullscreen'}
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Red Forced-Zero Termination Overlay */}
      {submitted && forcedZero && showForcedZeroOverlay && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-rose-700 p-6 text-center text-white"
        >
          <div className="w-full max-w-xl rounded-2xl border-2 border-white/40 bg-rose-900/80 p-8 shadow-2xl sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white">
              <ShieldAlert className="h-9 w-9" aria-hidden="true" />
            </div>
            <p className="font-mono-num mt-5 text-5xl font-extrabold text-white sm:text-6xl">
              0 / {QUESTIONS_PER_TEST}
            </p>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-white sm:text-3xl">
              {lang === 'uz'
                ? 'TEST QOIDABUZARLIK SABABLI DARHOL TO‘XTATILDI!'
                : 'TEST IMMEDIATELY TERMINATED (SCORE: 0)'}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-rose-100">
              {lang === 'uz'
                ? '3 ta ogohlantirish ham sarflandi (3 soniyadan ortiq boshqa oyna, sayt yoki desktopga o‘tildi). Ushbu test uchun natijangiz 0 / 25 (0%) qilib saqlandi.'
                : 'All 3 warnings were used (you stayed outside the test tab, window, or desktop for over 3 seconds). Your score was recorded as 0 / 25 (0%).'}
            </p>
            <button
              type="button"
              onClick={() => setShowForcedZeroOverlay(false)}
              className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-6 text-base font-extrabold text-rose-900 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {lang === 'uz' ? 'Natijalarni ko‘rish' : 'View Results'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm switching difficulty/variant mid-test: Cancel or Finish the test */}
      {started && !submitted && pendingSwitchAction && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-extrabold text-slate-900">
              {lang === 'uz' ? 'Test hali yakunlanmadi' : 'Test still in progress'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {lang === 'uz'
                ? 'Hozir boshqa variant yoki darajaga o‘tsangiz, joriy test yakunlanadi va natijasi saqlanadi.'
                : 'Switching variants or difficulty now will finish and submit your current test.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingSwitchAction(null)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const act = pendingSwitchAction;
                  setPendingSwitchAction(null);
                  handleSubmit();
                  act();
                }}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                Finish the test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ready-to-Start Screen OR Results View OR Active Workspace */}
      {!started ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            {pickText(subject.shortLabel, lang)} · {getDifficultyLabel(difficulty, lang)} ·{' '}
            {getVariantLabel(variant, lang)}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            {lang === 'uz'
              ? `Ushbu variantda ${QUESTIONS_PER_TEST} ta savol mavjud (${mode === 'practice' ? copy.modePractice : copy.modeExam}). Test paytida veb-kamera nazorati faol bo‘ladi — boshqa tarafga 2.5 soniyadan ortiq burilib qarash, yuzni berkitish yoki boshqa oyna/desktopga o‘tish ogohlantirish kamayishiga sabab bo‘ladi (jami 3 ta ogohlantirish; 3 tasi tugasa natija 0 bo‘ladi).`
              : `This variant contains ${QUESTIONS_PER_TEST} questions (${mode === 'practice' ? copy.modePractice : copy.modeExam}). Webcam proctoring is active during the test — turning your head away for over 2.5 seconds, obscuring face, or leaving the quiz window removes 1 warning (3 warnings max; exhausting all 3 gives 0).`}
          </p>

          <CameraProctor
            lang={lang}
            isActive={false}
            warningsLeft={warningsLeft}
            maxWarnings={MAX_WARNINGS}
            onViolation={triggerInstantPenalty}
            stream={cameraStream}
            cameraStatus={cameraStatus}
            cameraError={cameraError}
            onRequestCamera={requestCamera}
            variant="preview-card"
          />

          <button
            type="button"
            onClick={handleBeginTest}
            className="mt-6 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-teal-700 px-8 text-base font-bold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>
              {cameraStatus === 'active'
                ? 'Start Test'
                : lang === 'uz'
                  ? 'Kamera bilan boshlash'
                  : 'Start with Camera'}
            </span>
          </button>
        </div>
      ) : submitted && resultsSummary ? (
        <div className="space-y-6">
          {forcedZero && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-5 text-rose-900"
            >
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
              <div>
                <h2 className="font-display text-base font-extrabold text-rose-900">
                  {lang === 'uz'
                    ? 'Test qoidabuzarlik sababli darhol to‘xtatildi (Natija: 0)'
                    : 'Test immediately terminated due to focus violations (Score: 0)'}
                </h2>
                <p className="mt-1 text-sm text-rose-800">
                  {lang === 'uz'
                    ? '3 ta ogohlantirish ham sarflandi (3 soniyadan ortiq boshqa oyna, sayt yoki desktopga o‘tildi). Ushbu test uchun natijangiz 0 / 25 (0%) qilib saqlandi.'
                    : 'All 3 warnings were used (you stayed outside the test tab, window, or desktop for over 3 seconds). Your score for this test was recorded as 0 / 25 (0%).'}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-slate-900">
                  {copy.resultTitle}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{copy.gradingScaleNote}</p>
              </div>
              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>{copy.startOver}</span>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">{copy.scoreLabel}</p>
                <p className="font-mono-num mt-1 text-3xl font-bold text-slate-900">
                  {resultsSummary.correct} / {QUESTIONS_PER_TEST}
                  {forcedZero && (
                    <span className="ml-2 font-sans text-lg font-extrabold text-rose-600">
                      Cheated
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">{copy.accuracyCol}</p>
                <p className="font-mono-num mt-1 text-3xl font-bold text-slate-900">
                  {resultsSummary.percentage}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">{copy.gradeLabel}</p>
                <p className="font-mono-num mt-1 text-3xl font-bold text-teal-700">
                  {resultsSummary.gradeInfo.grade}{' '}
                  <span className="font-body text-sm font-semibold text-slate-600">
                    ({pickText(resultsSummary.gradeInfo.label, lang)})
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">{copy.timeLabel}</p>
                <p className="font-mono-num mt-1 text-3xl font-bold text-slate-900">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            {/* Topic Breakdown Table */}
            <div className="mt-6">
              <h3 className="font-display text-base font-bold text-slate-900">
                {copy.topicBreakdown}
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">{copy.topicCol}</th>
                      <th className="px-4 py-2.5">{copy.correctCol}</th>
                      <th className="px-4 py-2.5">{copy.accuracyCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsSummary.topicRows.map((row) => (
                      <tr key={row.topic}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{row.topic}</td>
                        <td className="font-mono-num px-4 py-2.5 text-slate-700">
                          {row.ok} / {row.total}
                        </td>
                        <td className="font-mono-num px-4 py-2.5 font-semibold text-slate-900">
                          {row.pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Question-by-Question Review */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {copy.answerReview}
              </h3>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${
                    reviewFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {copy.filterAll}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('wrong')}
                  className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${
                    reviewFilter === 'wrong'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {copy.filterWrong}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {questions.map((q, idx) => {
                const selectedDisp = answers[idx];
                const isOk = isChoiceCorrect(q, selectedDisp);
                if (reviewFilter === 'wrong' && isOk) return null;

                const opts = getLocalizedOptions(q.source.opts, lang);
                const correctDisp = getCorrectDisplayIndex(q);
                const selectedText =
                  selectedDisp !== undefined
                    ? `${OPTION_LETTERS[selectedDisp]}. ${opts[q.optionOrder[selectedDisp]]}`
                    : copy.notSelected;
                const correctText = `${OPTION_LETTERS[correctDisp]}. ${opts[q.optionOrder[correctDisp]]}`;

                return (
                  <article
                    key={q.source.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-500">
                        {idx + 1}. {q.source.topic}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isOk ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isOk ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            <span>{copy.correctBadge}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            <span>
                              {selectedDisp === undefined
                                ? copy.unansweredBadge
                                : copy.incorrectBadge}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {q.source.context && (
                      <div className="mt-2.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 border-l-4 border-l-teal-700 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-700">
                        {getLocalizedField(q.source.context, lang)}
                      </div>
                    )}

                    <p className="mt-2 whitespace-pre-line font-display text-base font-semibold text-slate-900">
                      {getLocalizedField(q.source.q, lang)}
                    </p>

                    <div className="mt-2.5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">{copy.yourAnswer}: </span>
                        <span className={isOk ? 'text-emerald-700' : 'text-rose-700'}>
                          {selectedText}
                        </span>
                      </p>
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">{copy.correctAnswer}: </span>
                        <span className="font-medium text-emerald-700">{correctText}</span>
                      </p>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-700">{copy.explanation}: </span>
                      <FormattedMathText text={getLocalizedField(q.source.explain, lang)} />
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Active 25-Question Workspace */
        <div className="space-y-5">
          {/* 1..25 Question Navigator Strip */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 md:grid-cols-[repeat(25,minmax(0,1fr))]">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const sel = answers[idx];
                const isAnswered = sel !== undefined;
                const isPracticeCorrect =
                  mode === 'practice' && isAnswered && isChoiceCorrect(q, sel);
                const isPracticeWrong =
                  mode === 'practice' && isAnswered && !isChoiceCorrect(q, sel);

                let styleClass =
                  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
                if (isCurrent) {
                  styleClass = 'border-slate-900 bg-slate-900 text-white';
                } else if (isPracticeCorrect) {
                  styleClass = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                } else if (isPracticeWrong) {
                  styleClass = 'border-rose-300 bg-rose-50 text-rose-800';
                } else if (isAnswered) {
                  styleClass = 'border-slate-400 bg-slate-100 text-slate-900';
                }

                return (
                  <button
                    key={q.source.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`${copy.questionOf} ${idx + 1}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`font-mono-num flex h-9 items-center justify-center rounded-md border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${styleClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Card */}
          {activeQuestion && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
                <span>
                  {activeQuestion.source.topic} ·{' '}
                  <span
                    className={`font-semibold ${
                      activeQuestion.source.difficulty === 'easy'
                        ? 'text-emerald-700'
                        : activeQuestion.source.difficulty === 'medium'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                    }`}
                  >
                    {getDifficultyLabel(activeQuestion.source.difficulty, lang)}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCalculatorOpen((open) => !open)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                      calculatorOpen
                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Calculator className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    <span>{lang === 'uz' ? 'Kalkulyator' : 'Calculator'}</span>
                  </button>
                  <span className="font-mono-num">
                    {copy.questionOf} {currentIndex + 1} / {QUESTIONS_PER_TEST}
                  </span>
                </div>
              </div>

              {activeQuestion.source.context && (
                <div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 border-l-4 border-l-teal-700 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-800 sm:text-[15px]">
                  {getLocalizedField(activeQuestion.source.context, lang)}
                </div>
              )}

              <h2 className="mt-3 whitespace-pre-line font-display text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
                {getLocalizedField(activeQuestion.source.q, lang)}
              </h2>

              <div className="mt-6 space-y-3">
                {activeQuestion.optionOrder.map((origIdx, dispIdx) => {
                  const opts = getLocalizedOptions(activeQuestion.source.opts, lang);
                  const selectedDisp = answers[currentIndex];
                  const isSelected = selectedDisp === dispIdx;
                  const showInstantFeedback =
                    mode === 'practice' && selectedDisp !== undefined;
                  const correctDisp = getCorrectDisplayIndex(activeQuestion);
                  const isCorrectOption = dispIdx === correctDisp;

                  let optStyle =
                    'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50';
                  let stateTag: 'correct' | 'wrong' | null = null;

                  if (showInstantFeedback) {
                    if (isCorrectOption) {
                      optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
                      stateTag = 'correct';
                    } else if (isSelected) {
                      optStyle = 'border-rose-500 bg-rose-50 text-rose-950 font-semibold';
                      stateTag = 'wrong';
                    } else {
                      optStyle = 'border-slate-200 bg-white text-slate-500';
                    }
                  } else if (isSelected) {
                    optStyle = 'border-slate-900 bg-slate-100 text-slate-900 font-semibold';
                  }

                  return (
                    <button
                      key={`${activeQuestion.source.id}-${origIdx}`}
                      type="button"
                      disabled={showInstantFeedback}
                      onClick={() => handleSelectOption(dispIdx)}
                      className={`flex min-h-[52px] w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:cursor-default ${optStyle}`}
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="font-mono-num text-sm font-bold text-slate-500">
                          {OPTION_LETTERS[dispIdx]}.
                        </span>
                        <span>{opts[origIdx]}</span>
                      </span>

                      {stateTag === 'correct' && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span>{copy.correctBadge}</span>
                        </span>
                      )}
                      {stateTag === 'wrong' && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-rose-700">
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          <span>{copy.incorrectBadge}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation Panel in Practice Mode */}
              {mode === 'practice' && answers[currentIndex] !== undefined && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    {isChoiceCorrect(activeQuestion, answers[currentIndex]) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                        <span className="text-emerald-800">{copy.correctBadge}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-rose-700" aria-hidden="true" />
                        <span className="text-rose-800">{copy.incorrectBadge}</span>
                      </>
                    )}
                    <span className="text-slate-400">·</span>
                    <span>{copy.explanation}</span>
                  </p>
                  <p className="mt-1.5 text-slate-700">
                    <FormattedMathText text={getLocalizedField(activeQuestion.source.explain, lang)} />
                  </p>
                </div>
              )}

              {/* Bottom Navigation & Submit Bar */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  <span>{copy.previous}</span>
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {currentIndex < QUESTIONS_PER_TEST - 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((i) => Math.min(QUESTIONS_PER_TEST - 1, i + 1))
                      }
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      <span>{copy.next}</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                  >
                    {copy.finishExam}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Floating Corner Camera Proctor (active during test, movable to any corner) */}
      {started && !submitted && (
        <CameraProctor
          lang={lang}
          isActive={true}
          warningsLeft={warningsLeft}
          maxWarnings={MAX_WARNINGS}
          onViolation={triggerInstantPenalty}
          stream={cameraStream}
          cameraStatus={cameraStatus}
          cameraError={cameraError}
          onRequestCamera={requestCamera}
          variant="floating"
        />
      )}

      {/* In-App Scientific Calculator */}
      <ScientificCalculator
        lang={lang}
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
    </section>
  );
}
