# AI Basic Study

A zero-cost full-stack learning app: Google sign-in, admin/user roles, PDF
textbook downloads, and scored quizzes.

**Stack:** Next.js 14 (App Router + TypeScript), Firebase (Auth, Firestore —
Spark/free plan, no billing card required), Tailwind CSS. Deployable to Vercel's
free tier. PDF textbooks are referenced by external links (e.g. Google Drive),
so Firebase Storage is not used.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Firebase project** (free Spark plan — no card needed) and enable:
   - **Authentication** → Sign-in method → **Google** provider.
   - **Firestore Database** (production mode).

3. **Add your web app config.** Copy `.env.local.example` to `.env.local` and
   fill in the values from Firebase Console → Project settings → General → Your
   apps → SDK setup and configuration:

   ```bash
   cp .env.local.example .env.local
   ```

4. **Deploy the security rules** (from the Firebase Console or CLI):
   - `firestore.rules` → Firestore Rules

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Roles

Every new user is created in Firestore at `users/{uid}` with `role: "user"`.
To make someone an **admin**, open that document in the Firebase Console and
change `role` to `"admin"`. There is no self-service path to admin.

## Routes

- `/` — Google sign-in; redirects by role after login.
- `/admin/textbooks` — add PDF textbooks by external link (admin only).
- `/admin/tests` — create/publish quizzes (admin only).
- `/user/textbooks` — list and download textbooks.
- `/user/tests` — list published tests.
- `/user/tests/[testId]` — take a test.
- `/user/tests/[testId]/result` — score and per-question breakdown.

## Data model (Firestore)

- `users/{uid}` — `{ role, email, displayName, createdAt }`
- `textbooks/{id}` — `{ title, storageUrl, uploadedAt, uploadedBy }`
- `tests/{id}` — `{ title, description, published, questions[], createdAt, createdBy }`
- `results/{uid}_{testId}` — `{ uid, testId, score, total, answers, completedAt }`
