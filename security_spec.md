# Security Specification & TDD Plan

## 1. Data Invariants
1. **UserProfile (`/users/{userId}`)**:
   - Document ID `userId` must match `^[a-zA-Z0-9_\-]+$` (max 128 chars) and equal `request.auth.uid`.
   - `uid` must strictly match `request.auth.uid` and `userId`.
   - `username` must match `^[a-z0-9_.]{3,32}$` (3–32 chars).
   - `displayName` must be a non-empty string (`1 <= size <= 60`).
   - `role` on student self-creation MUST be `'student'`; self-assigning `'teacher'` is forbidden unless the caller is the bootstrapped verified teacher/admin.
   - `createdAt` must equal `request.time` on creation and remain immutable on update.
   - `updatedAt` must equal `request.time` on creation and update.
   - Student profile reads (`get`) are restricted strictly to the profile owner or the verified teacher/admin (`list` is restricted to the verified teacher/admin only).
2. **QuizAttempt (`/attempts/{attemptId}`)**:
   - Document ID `attemptId` must match `^[a-zA-Z0-9_\-]+$` (max 128 chars) and equal `incoming().id`.
   - An attempt cannot be created unless the user's `/users/{request.auth.uid}` profile already exists (`exists()`).
   - `userId` must strictly match `request.auth.uid`.
   - `subjectId` must be one of `['math', 'history', 'science', 'computing', 'english', 'uzbek']`.
   - `difficulty` must be one of `['easy', 'medium', 'hard']`.
   - `mode` must be one of `['practice', 'exam']`.
   - `score` (`0..25`), `total` (`25`), `percentage` (`0..100`), `grade` (`2, 3, 4, 5`), `elapsedSeconds` (`0..86400`) must be valid bounded integers.
   - `createdAt` must equal `request.time` on creation.
   - Score records are immutable after creation (`update: if false`) and can only be deleted by a verified full admin (`thehonoredone.717@gmail.com` or `ibrohimbekxujanazarov@gmail.com`) (`delete: if isAdmin() && isValidId(attemptId)`).
   - Listing attempts (`allow list`) requires verified full admin status, verified subject teacher status scoped strictly to their assigned `resource.data.subjectId`, OR `resource.data.userId == request.auth.uid` for students.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on User Create**: Including `{ ..., "isAdmin": true }` in `/users/{uid}` -> Rejected by `hasOnly(...)`.
2. **Self-Assigned Teacher Role Escalation**: Student creating `/users/{uid}` with `"role": "teacher"` -> Rejected by `incoming().role == 'student' || isAdmin()`.
3. **UID Spoofing on User Create**: Signed-in user `u1` creating `/users/u2` with `"uid": "u2"` or creating `/users/u1` with `"uid": "u2"` -> Rejected by `isOwner(userId)` & `incoming().uid == request.auth.uid`.
4. **Username Pattern / Length Poisoning**: Setting `"username": "ADMIN!!@@"` or a 200-char string -> Rejected by `^[a-z0-9_.]{3,32}$` and `.size()`.
5. **PII Cross-User Profile Read**: Student `u1` calling `get(/users/u2)` -> Rejected by `isOwner(userId) || isAdmin()`.
6. **Student Listing All Users**: Student `u1` calling `getDocs(collection(db, 'users'))` -> Rejected by `allow list: if isAdmin()`.
7. **Attempt Creation Without Profile (Orphaned Write)**: User without `/users/{uid}` attempting to create `/attempts/{id}` -> Rejected by `exists(/databases/$(database)/documents/users/$(request.auth.uid))`.
8. **Attempt Owner Spoofing**: Student `u1` creating `/attempts/{id}` with `"userId": "u2"` -> Rejected by `incoming().userId == request.auth.uid`.
9. **Score / Grade Bounds Manipulation**: Creating attempt with `"score": 999` or `"total": 1` or `"grade": 10` -> Rejected by integer range checks.
10. **Client-Forged Server Timestamp**: Creating `/attempts/{id}` with a stale timestamp `createdAt != request.time` -> Rejected by `incoming().createdAt == request.time`.
11. **Student Tampering / Deleting Poor Result**: Student `u1` calling `updateDoc` or `deleteDoc` on `/attempts/{ownId}` -> Rejected by `allow update: if false` and `allow delete: if isAdmin()`.
12. **Unverified Admin Email Spoof & Unscoped List**: Unverified token or `list` query on `/attempts` without `where('userId', '==', uid)` by a non-admin -> Rejected by `email_verified == true` and `resource.data.userId == request.auth.uid`.
