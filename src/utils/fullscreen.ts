interface FullscreenDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface KeyboardNavigator extends Navigator {
  keyboard?: {
    lock?: (keyCodes?: string[]) => Promise<void>;
    unlock?: () => void;
  };
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export async function lockSystemKeys(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as KeyboardNavigator;
  try {
    if (nav.keyboard?.lock) {
      await nav.keyboard.lock(['Escape', 'F11', 'MetaLeft', 'MetaRight']);
    }
  } catch {
    // Keyboard Lock API is only available in supported browsers / top-level fullscreen
  }
}

export function unlockSystemKeys(): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as KeyboardNavigator;
  try {
    nav.keyboard?.unlock?.();
  } catch {
    // Ignore unlock errors
  }
}

export async function requestAppFullscreen(lockKeys = false): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (isFullscreenActive()) {
    if (lockKeys) void lockSystemKeys();
    return true;
  }
  const el = document.documentElement as FullscreenElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      if (lockKeys) void lockSystemKeys();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      if (lockKeys) void lockSystemKeys();
      return true;
    }
  } catch {
    // Browsers may block fullscreen without a direct user gesture or inside restricted frames
  }
  return false;
}

export async function exitAppFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  unlockSystemKeys();
  if (!isFullscreenActive()) return;
  const doc = document as FullscreenDocument;
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    }
  } catch {
    // Ignore exit errors
  }
}
