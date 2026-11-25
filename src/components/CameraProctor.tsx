import {
  AlertTriangle,
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Video,
} from 'lucide-react';
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { UILanguage } from '../types/quiz';

export type ProctorStatus = 'facing' | 'looking_away' | 'no_face' | 'camera_off';
export type ProctorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNER_STORAGE_KEY = 'g7_chsb_proctor_corner_v1';

function loadSavedCorner(): ProctorCorner {
  try {
    const raw = window.localStorage.getItem(CORNER_STORAGE_KEY);
    if (raw === 'top-left' || raw === 'top-right' || raw === 'bottom-left' || raw === 'bottom-right') {
      return raw;
    }
  } catch {
    // Ignore storage errors
  }
  return 'bottom-right';
}

export interface CameraProctorProps {
  lang: UILanguage;
  isActive: boolean; // true during active quiz
  warningsLeft: number;
  maxWarnings: number;
  onViolation: (reasonUz: string, reasonEn: string) => void;
  stream: MediaStream | null;
  cameraStatus: 'idle' | 'requesting' | 'active' | 'denied' | 'error';
  cameraError: string | null;
  onRequestCamera: () => void;
  variant: 'preview-card' | 'floating';
}

const GRACE_LOOKAWAY_MS = 2500; // 2.5 seconds grace before deducting a warning
const SCAN_INTERVAL_MS = 200; // 5 FPS scan rate

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceLandmark {
  type: string;
  locations?: { x: number; y: number }[];
  location?: { x: number; y: number };
}

interface DetectedFaceNative {
  boundingBox?: BoundingBox;
  landmarks?: FaceLandmark[];
}

export function CameraProctor({
  lang,
  isActive,
  warningsLeft,
  maxWarnings,
  onViolation,
  stream,
  cameraStatus,
  cameraError,
  onRequestCamera,
  variant,
}: CameraProctorProps) {
  const [proctorStatus, setProctorStatus] = useState<ProctorStatus>('camera_off');
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [corner, setCorner] = useState<ProctorCorner>(() => loadSavedCorner());
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const awayStartTimeRef = useRef<number | null>(null);
  const nativeFaceDetectorRef = useRef<unknown>(null);
  const nativeSupportedRef = useRef<boolean | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const attachVideoElement = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && stream) {
        if (node.srcObject !== stream) {
          node.srcObject = stream;
        }
        node.play().catch(() => {
          // Video autoplay policy handled
        });
      }
    },
    [stream]
  );

  // Re-bind video element whenever stream, variant, cameraStatus, or minimized state changes
  useEffect(() => {
    const node = videoRef.current;
    if (node && stream) {
      if (node.srcObject !== stream) {
        node.srcObject = stream;
      }
      node.play().catch(() => {
        // Video autoplay policy handled
      });
    }
  }, [stream, variant, isMinimized, cameraStatus]);

  const updateCorner = useCallback((next: ProctorCorner) => {
    setCorner(next);
    try {
      window.localStorage.setItem(CORNER_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Initialize native FaceDetector if supported in Chromium
  useEffect(() => {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const FaceDetectorCtor = (
          window as unknown as {
            FaceDetector: new (opts?: {
              fastMode?: boolean;
              maxDetectedFaces?: number;
            }) => unknown;
          }
        ).FaceDetector;
        nativeFaceDetectorRef.current = new FaceDetectorCtor({
          fastMode: true,
          maxDetectedFaces: 1,
        });
        nativeSupportedRef.current = true;
      } catch {
        nativeSupportedRef.current = false;
      }
    } else {
      nativeSupportedRef.current = false;
    }
  }, []);

  // Frame analyzer: classifies current video frame into 'facing', 'looking_away', or 'no_face'
  const analyzeFrame = useCallback(async (): Promise<ProctorStatus> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.paused || video.ended) {
      return 'camera_off';
    }

    // 1. Try Native FaceDetector if available
    if (nativeSupportedRef.current && nativeFaceDetectorRef.current) {
      try {
        const detector = nativeFaceDetectorRef.current as {
          detect: (source: HTMLVideoElement) => Promise<DetectedFaceNative[]>;
        };
        const faces = await detector.detect(video);
        if (!faces || faces.length === 0) {
          return 'no_face';
        }

        const face = faces[0];
        const landmarks = face.landmarks || [];
        const eyeLandmarks = landmarks.filter((l) => l.type === 'eye');
        const noseLandmark = landmarks.find((l) => l.type === 'nose');

        // If only 1 eye landmark is visible while user is facing camera, face is turned sideways (profile)
        if (eyeLandmarks.length === 1 && !noseLandmark) {
          return 'looking_away';
        }

        // If two eyes and nose are present, calculate head yaw offset
        if (eyeLandmarks.length >= 2 && noseLandmark) {
          const e1 = eyeLandmarks[0].locations?.[0] || eyeLandmarks[0].location;
          const e2 = eyeLandmarks[1].locations?.[0] || eyeLandmarks[1].location;
          const nose = noseLandmark.locations?.[0] || noseLandmark.location;

          if (e1 && e2 && nose) {
            const leftEye = e1.x < e2.x ? e1 : e2;
            const rightEye = e1.x < e2.x ? e2 : e1;
            const eyeDist = Math.max(1, rightEye.x - leftEye.x);
            const midX = (leftEye.x + rightEye.x) / 2;
            const yawOffset = (nose.x - midX) / eyeDist;

            // When facing forward, |yawOffset| < 0.22. When turned sideways, |yawOffset| >= 0.25
            if (Math.abs(yawOffset) > 0.24) {
              return 'looking_away';
            }
          }
        }

        // Check if face bounding box is pushed too far to the edges
        if (face.boundingBox) {
          const vidW = video.videoWidth || 320;
          const faceCenterX = face.boundingBox.x + face.boundingBox.width / 2;
          if (faceCenterX < vidW * 0.18 || faceCenterX > vidW * 0.82) {
            return 'looking_away';
          }
          const aspect = face.boundingBox.width / Math.max(1, face.boundingBox.height);
          if (aspect < 0.45) {
            return 'looking_away';
          }
        }

        return 'facing';
      } catch {
        // Fall back to Canvas pixel analysis if native call fails
      }
    }

    // 2. High-performance Canvas Computer Vision Fallback (160x120 resolution)
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 'facing';

    ctx.drawImage(video, 0, 0, 160, 120);
    const imgData = ctx.getImageData(0, 0, 160, 120);
    const data = imgData.data;

    let skinCount = 0;
    let sumX = 0;
    let minX = 160;
    let maxX = 0;
    let minY = 120;
    let maxY = 0;

    // Scan central/upper region for skin pixels
    for (let y = 6; y < 108; y++) {
      for (let x = 8; x < 152; x++) {
        const idx = (y * 160 + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Normalized YCbCr skin chrominance test
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin =
          cb >= 77 &&
          cb <= 127 &&
          cr >= 133 &&
          cr <= 173 &&
          r > 42 &&
          r > g &&
          g > b;

        if (isSkin) {
          skinCount++;
          sumX += x;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If skin area is too small, no face is looking at the camera
    if (skinCount < 260) {
      return 'no_face';
    }

    const avgX = sumX / skinCount;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;

    // If center of mass is severely shifted towards frame edge
    if (avgX < 26 || avgX > 134) {
      return 'looking_away';
    }

    // Bilateral horizontal symmetry check:
    // Split face region into Left half and Right half
    let leftSkin = 0;
    let rightSkin = 0;
    let leftDark = 0;
    let rightDark = 0;
    const eyeZoneLimitY = Math.floor(minY + faceHeight * 0.48);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * 160 + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin =
          cb >= 77 &&
          cb <= 127 &&
          cr >= 133 &&
          cr <= 173 &&
          r > 42 &&
          r > g &&
          g > b;

        if (isSkin) {
          if (x < centerX) leftSkin++;
          else rightSkin++;
        }

        // Dark features (eyes/pupils/brows) in upper eye zone
        if (y <= eyeZoneLimitY) {
          const brightness = (r + g + b) / 3;
          if (brightness < 68) {
            if (x < centerX) leftDark++;
            else rightDark++;
          }
        }
      }
    }

    const skinRatio =
      Math.max(leftSkin, rightSkin) / (Math.min(leftSkin, rightSkin) + 1);
    const centroidOffset = Math.abs(avgX - centerX) / Math.max(1, faceWidth);
    const darkRatio =
      Math.max(leftDark, rightDark) / (Math.min(leftDark, rightDark) + 1);

    // Turned head produces significant bilateral skin asymmetry (> 1.76),
    // shifts face centroid (> 0.16), or hides one eye feature (> 2.6)
    if (
      skinRatio > 1.76 ||
      centroidOffset > 0.16 ||
      (darkRatio > 2.6 && leftDark + rightDark > 18)
    ) {
      return 'looking_away';
    }

    return 'facing';
  }, []);

  // Proctoring loop: runs detection every SCAN_INTERVAL_MS
  useEffect(() => {
    if (!stream || cameraStatus !== 'active') {
      setProctorStatus('camera_off');
      setSecondsRemaining(null);
      awayStartTimeRef.current = null;
      return;
    }

    let isMounted = true;

    const intervalId = window.setInterval(async () => {
      const status = await analyzeFrame();
      if (!isMounted) return;

      setProctorStatus(status);

      // In active quiz mode, enforce looking-away / no-face grace countdown & violation penalties
      if (isActive) {
        if (status === 'looking_away' || status === 'no_face') {
          if (awayStartTimeRef.current === null) {
            awayStartTimeRef.current = Date.now();
          }

          const elapsedMs = Date.now() - awayStartTimeRef.current;
          const msLeft = Math.max(0, GRACE_LOOKAWAY_MS - elapsedMs);
          const secs = Math.max(1, Math.ceil(msLeft / 1000));
          setSecondsRemaining(secs);

          if (elapsedMs >= GRACE_LOOKAWAY_MS) {
            // Grace period expired! Deduct 1 warning via penalty callback
            awayStartTimeRef.current = Date.now(); // reset timer for subsequent warnings if away continues
            if (status === 'looking_away') {
              onViolation(
                'Boshqa tarafga burilib qarash taqiqlanadi! Ekranga to‘g‘ri qarang. 1 ta ogohlantirish olib tashlandi.',
                'Looking away from the screen is prohibited! Please face the screen. 1 warning was deducted.'
              );
            } else {
              onViolation(
                'Yuzingiz kamerada ko‘rinmay qoldi! Ekranga to‘g‘ri qarab o‘tiring. 1 ta ogohlantirish olib tashlandi.',
                'Face was not detected by the camera! Please face the screen. 1 warning was deducted.'
              );
            }
          }
        } else {
          // Facing screen: clear warning timer
          awayStartTimeRef.current = null;
          setSecondsRemaining(null);
        }
      } else {
        // Not active (preview mode before quiz starts): show status indicator without penalties
        if (status === 'looking_away' || status === 'no_face') {
          setSecondsRemaining(2);
        } else {
          setSecondsRemaining(null);
        }
      }
    }, SCAN_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [stream, cameraStatus, isActive, analyzeFrame, onViolation]);

  // Status visual cues
  const getStatusBadge = () => {
    if (cameraStatus !== 'active') {
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
        text: lang === 'uz' ? 'Kamera yoqilmagan' : 'Camera off',
      };
    }
    if (proctorStatus === 'facing') {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500 animate-pulse',
        text: lang === 'uz' ? '✓ Ekranga qaralyapti' : '✓ Facing screen',
      };
    }
    if (proctorStatus === 'looking_away') {
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse',
        dot: 'bg-amber-500',
        text:
          lang === 'uz'
            ? `⚠️ Boshqa tarafga qaralyapti! (${secondsRemaining ?? 2}s)`
            : `⚠️ Looking away! (${secondsRemaining ?? 2}s)`,
      };
    }
    return {
      bg: 'bg-rose-100 text-rose-900 border-rose-400 animate-pulse',
      dot: 'bg-rose-500',
      text:
        lang === 'uz'
          ? `✕ Yuz ko‘rinmadi! (${secondsRemaining ?? 2}s)`
          : `✕ No face detected! (${secondsRemaining ?? 2}s)`,
    };
  };

  const badge = getStatusBadge();

  // VARIANT A: PREVIEW CARD (on pre-quiz Start screen)
  if (variant === 'preview-card') {
    return (
      <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-left shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
              <Camera className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'uz' ? 'Kamera orqali nazorat (Proctoring)' : 'Webcam Proctoring Required'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'uz'
                  ? 'Boshqa tarafga burilib qarash va yuzni berkitish taqiqlanadi'
                  : 'Turning head away and obscuring face will deduct warnings'}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.bg}`}
          >
            <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
            <span>{badge.text}</span>
          </div>
        </div>

        {/* Video feed or Request button */}
        <div className="mt-4 flex flex-col items-center justify-center">
          {cameraStatus === 'active' ? (
            <div className="relative w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-black shadow-inner aspect-4/3 max-h-56">
              <video
                ref={attachVideoElement}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                <span>Live Test</span>
              </div>
              <div className="absolute bottom-2 inset-x-2 flex items-center justify-between rounded-lg bg-black/75 px-3 py-1.5 text-xs text-white backdrop-blur-xs">
                <span>{badge.text}</span>
                <span className="font-mono-num text-[11px] text-slate-300">
                  {lang === 'uz' ? 'Sinov rejimi' : 'Ready check'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <CameraOff className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                {lang === 'uz'
                  ? 'Imtihonni boshlash uchun kamera ruxsati zarur'
                  : 'Webcam access is required to begin the quiz'}
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {lang === 'uz'
                  ? 'Brauzer kamera so‘rovini ochish uchun quyidagi tugmani bosing va "Ruxsat berish"ni tanlang.'
                  : 'Click below and allow camera permissions in your browser to proceed with the exam.'}
              </p>

              {cameraError && (
                <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                  {cameraError}
                </div>
              )}

              <button
                type="button"
                onClick={onRequestCamera}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                <Video className="h-4 w-4" aria-hidden="true" />
                <span>{lang === 'uz' ? 'Kamerani yoqish' : 'Enable Camera'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p>
            {lang === 'uz'
              ? 'Diqqat: Test davomida boshqa tarafga 2.5 soniyadan ortiq burilib qaralsa yoki yuz yopilsa, ogohlantirish olib tashlanadi (3 ta ogohlantirish tugasa test 0 ball bilan yakunlanadi).'
              : 'Notice: Turning head away from the screen for over 2.5 seconds or obscuring your face will deduct 1 warning (3 warnings = instant zero).'}
          </p>
        </div>
      </div>
    );
  }

  // VARIANT B: FLOATING CORNER WIDGET (active during exam)
  const isAwayAlert =
    proctorStatus === 'looking_away' || proctorStatus === 'no_face';

  const cornerPosClass: Record<ProctorCorner, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const handleFloatingPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleFloatingPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    setDragOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleFloatingPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    setDragOffset(null);
    const isLeft = e.clientX < window.innerWidth / 2;
    const isTop = e.clientY < window.innerHeight / 2;
    const snapped: ProctorCorner = isTop
      ? isLeft
        ? 'top-left'
        : 'top-right'
      : isLeft
        ? 'bottom-left'
        : 'bottom-right';
    updateCorner(snapped);
  };

  const cornerOptions: { id: ProctorCorner; labelUz: string; labelEn: string }[] = [
    { id: 'top-left', labelUz: 'Yuqori chap', labelEn: 'Top left' },
    { id: 'top-right', labelUz: "Yuqori o'ng", labelEn: 'Top right' },
    { id: 'bottom-left', labelUz: 'Pastki chap', labelEn: 'Bottom left' },
    { id: 'bottom-right', labelUz: "Pastki o'ng", labelEn: 'Bottom right' },
  ];

  return (
    <div
      role="region"
      aria-label="Webcam Proctor"
      style={
        dragOffset
          ? { transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)` }
          : undefined
      }
      className={`fixed ${cornerPosClass[corner]} z-50 select-none ${
        dragOffset ? '' : 'transition-all duration-200'
      } ${isMinimized ? 'w-52' : 'w-56 sm:w-64'}`}
    >
      <div
        className={`overflow-hidden rounded-2xl border-2 shadow-2xl backdrop-blur-md transition-colors ${
          isAwayAlert
            ? 'border-rose-500 bg-rose-950/90 text-white ring-4 ring-rose-500/30'
            : 'border-slate-800 bg-slate-900/90 text-white'
        }`}
      >
        {/* Floating Widget Header (drag to any corner or click 2x2 corner grid) */}
        <div
          onPointerDown={handleFloatingPointerDown}
          onPointerMove={handleFloatingPointerMove}
          onPointerUp={handleFloatingPointerUp}
          className="flex cursor-grab items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isAwayAlert ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className="font-bold tracking-tight text-[11px]">PROCTOR</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 4-Corner Switcher (2x2 mini grid) */}
            <div
              role="group"
              aria-label={lang === 'uz' ? 'Kamera burchagi' : 'Camera corner'}
              className="grid grid-cols-2 gap-0.5 rounded border border-white/15 bg-black/30 p-0.5"
              title={lang === 'uz' ? 'Kamerani istalgan burchakka ko‘chirish' : 'Move camera to any corner'}
            >
              {cornerOptions.map((opt) => {
                const active = corner === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateCorner(opt.id)}
                    aria-label={lang === 'uz' ? opt.labelUz : opt.labelEn}
                    title={lang === 'uz' ? opt.labelUz : opt.labelEn}
                    className={`h-2.5 w-2.5 rounded-[2px] transition-colors ${
                      active ? 'bg-teal-400' : 'bg-slate-600 hover:bg-slate-400'
                    }`}
                  />
                );
              })}
            </div>

            <span
              className={`font-mono-num text-[11px] font-bold ${
                warningsLeft === 3
                  ? 'text-emerald-400'
                  : warningsLeft === 2
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
              title={lang === 'uz' ? 'Qolgan ogohlantirishlar' : 'Warnings remaining'}
            >
              {warningsLeft}/{maxWarnings}
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none"
              title={isMinimized ? 'Kattalashtirish' : 'Kichiklashtirish'}
            >
              {isMinimized ? (
                <Maximize2 className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Minimize2 className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Video feed (hidden when minimized) */}
        {!isMinimized && (
          <div className="relative aspect-4/3 w-full bg-black">
            <video
              ref={attachVideoElement}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />

            {/* Look-away warning banner overlay right on video */}
            {isAwayAlert && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/80 p-2 text-center text-white backdrop-blur-xs">
                <AlertTriangle className="h-6 w-6 animate-bounce text-amber-400" />
                <p className="mt-1 text-xs font-black tracking-wide text-white">
                  {lang === 'uz' ? 'EKRANGA QARANG!' : 'FACE THE SCREEN!'}
                </p>
                <div className="font-mono-num mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-sm font-extrabold text-white shadow-md">
                  {secondsRemaining ?? 2}s
                </div>
                <p className="mt-0.5 text-[10px] text-rose-200">
                  {lang === 'uz' ? 'Ogohlantirish beriladi' : 'Warning deduction'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status Pill Footer */}
        <div
          className={`px-3 py-1.5 text-[11px] font-semibold text-center transition-colors ${
            isAwayAlert
              ? 'bg-rose-600 text-white font-bold'
              : proctorStatus === 'facing'
                ? 'bg-emerald-950/80 text-emerald-300'
                : 'bg-slate-800 text-slate-300'
          }`}
        >
          {badge.text}
        </div>
      </div>
    </div>
  );
}
