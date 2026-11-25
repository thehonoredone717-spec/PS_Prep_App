/**
 * Dirty Dozen Security Rule Verification Spec for Grade 7 ChSB Platform.
 * Validates the 12 adversarial payloads against the deployed rule invariants.
 */

export interface MockAuthToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

export const DIRTY_DOZEN_CASES = [
  {
    name: '1. Shadow Field Injection on User Create',
    target: 'users/student1',
    operation: 'create',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    payload: {
      uid: 'student1',
      username: 'ali_g7',
      displayName: 'Ali',
      role: 'student',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Self-Assigned Teacher Role Escalation',
    target: 'users/student1',
    operation: 'create',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    payload: {
      uid: 'student1',
      username: 'ali_g7',
      displayName: 'Ali',
      role: 'teacher',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. UID Spoofing on User Create',
    target: 'users/student2',
    operation: 'create',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    payload: {
      uid: 'student2',
      username: 'other_g7',
      displayName: 'Other',
      role: 'student',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Username Regex & Size Poisoning',
    target: 'users/student1',
    operation: 'create',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    payload: {
      uid: 'student1',
      username: 'INVALID!!',
      displayName: 'Ali',
      role: 'student',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Cross-User Profile Read',
    target: 'users/student2',
    operation: 'get',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Student Listing All Users',
    target: 'users',
    operation: 'list',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Orphaned Attempt Write Without User Profile',
    target: 'attempts/math-1',
    operation: 'create',
    auth: { uid: 'ghost_user', email: 'ghost@chsb7.local', email_verified: false },
    payload: { id: 'math-1', userId: 'ghost_user', subjectId: 'math', score: 25, total: 25 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Attempt Owner Spoofing',
    target: 'attempts/math-2',
    operation: 'create',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    payload: { id: 'math-2', userId: 'student2', subjectId: 'math', score: 25, total: 25 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Score & Grade Bounds Poisoning',
    target: 'attempts/math-3',
    operation: 'create',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    payload: { id: 'math-3', userId: 'student1', subjectId: 'math', score: 99, total: 25, grade: 9 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Client-Forged Timestamp on Attempt Create',
    target: 'attempts/math-4',
    operation: 'create',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    payload: { id: 'math-4', userId: 'student1', createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Student Deleting or Mutating Own Result',
    target: 'attempts/math-5',
    operation: 'delete',
    auth: { uid: 'student1', email: 'ali@chsb7.local', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Unverified Admin Email Spoof & Unscoped Attempts List',
    target: 'attempts',
    operation: 'list',
    auth: { uid: 'spoof', email: 'thehonoredone.717@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '13. Computing Teacher Reading Non-Computing Attempt',
    target: 'attempts/math-10',
    operation: 'get',
    auth: { uid: 'comp_teacher', email: 'zarifa.xojiyeva2281@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '14. Unverified Second Admin Email Spoof on Attempts List',
    target: 'attempts',
    operation: 'list',
    auth: { uid: 'spoof2', email: 'ibrohimbekxujanazarov@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
] as const;
