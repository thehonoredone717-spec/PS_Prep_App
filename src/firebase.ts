import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, User, getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const TEACHER_EMAIL = 'thehonoredone.717@gmail.com';
export const OWNER_ADMIN_EMAIL = 'ibrohimbekxujanazarov@gmail.com';
export const ADMIN_EMAILS = [TEACHER_EMAIL, OWNER_ADMIN_EMAIL] as const;
export const COMPUTING_TEACHER_EMAIL = 'zarifa.xojiyeva2281@gmail.com';
export const MATH_TEACHER_EMAIL = 'qoqonovtohir@gmail.com';
export const SCIENCE_TEACHER_EMAIL = 'mohinurteshayeva19@gmail.com';
export const ENGLISH_TEACHER_EMAIL = 'melbernard24@gmail.com';
export const USERNAME_REGEX = /^[a-z0-9_.]{3,32}$/;
export const DISPLAY_NAME_MAX_LEN = 60;
export const VARIANT_MAX_LEN = 24;

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  role: 'student' | 'teacher';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function isTeacherAdmin(user: User | null): boolean {
  const email = user?.email?.toLowerCase();
  return Boolean(user && email && ADMIN_EMAILS.some((adminEmail) => adminEmail === email) && user.emailVerified);
}

export function isComputingTeacher(user: User | null): boolean {
  return Boolean(
    user && user.email?.toLowerCase() === COMPUTING_TEACHER_EMAIL && user.emailVerified
  );
}

export function isMathTeacher(user: User | null): boolean {
  return Boolean(
    user && user.email?.toLowerCase() === MATH_TEACHER_EMAIL && user.emailVerified
  );
}

export function isScienceTeacher(user: User | null): boolean {
  return Boolean(
    user && user.email?.toLowerCase() === SCIENCE_TEACHER_EMAIL && user.emailVerified
  );
}

export function isEnglishTeacher(user: User | null): boolean {
  return Boolean(
    user && user.email?.toLowerCase() === ENGLISH_TEACHER_EMAIL && user.emailVerified
  );
}

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 32);
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

export function toAuthEmail(loginInput: string): string {
  const trimmed = loginInput.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return `${normalizeUsername(trimmed)}@chsb7.local`;
}

export function deriveUsernameFromUser(user: User, preferred?: string): string {
  const candidate = preferred
    ? normalizeUsername(preferred)
    : user.email
      ? normalizeUsername(user.email.split('@')[0] || '')
      : normalizeUsername(user.displayName || '');

  if (USERNAME_REGEX.test(candidate)) {
    return candidate;
  }
  const padded = `${candidate || 'student'}_${user.uid.toLowerCase().slice(0, 6)}`.slice(0, 32);
  const cleaned = normalizeUsername(padded);
  return USERNAME_REGEX.test(cleaned) ? cleaned : `user_${user.uid.toLowerCase().slice(0, 8)}`;
}

export function sanitizeDisplayName(raw: string | null | undefined, fallback: string): string {
  const cleaned = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, DISPLAY_NAME_MAX_LEN);
  if (cleaned.length >= 1) return cleaned;
  return fallback.slice(0, DISPLAY_NAME_MAX_LEN) || 'Student';
}
