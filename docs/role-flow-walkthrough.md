# Complete role-flow and interview walkthrough

This guide is the shortest path through the finished application and the code
behind it. It is also a rehearsal outline for the mandatory video. The Strapi
CMS administrator and the LMS application Admin are different accounts: the CMS
account configures Strapi, while the LMS Admin is subject to the same custom API
authorization as every other application user.

## Start the complete system

Start PostgreSQL first, then use one terminal per application:

```bash
docker compose up -d postgres
npm run dev:backend
npm run dev:frontend
```

If the demo data or accounts do not exist yet, stop Strapi and run:

```bash
DEMO_USER_PASSWORD='choose-a-local-password' npm run seed:demo
```

The URLs are:

- Next.js application: `http://localhost:3000`
- Strapi CMS: `http://localhost:1337/admin`
- Strapi health check: `http://localhost:1337/api/health`
- Combined frontend/backend check: `http://localhost:3000/api/health`

## The security model to explain first

The browser never stores the Strapi token in `localStorage`. Login goes to a
Next.js route handler, which forwards the credentials to Strapi and stores the
returned JWT in an `HttpOnly`, `SameSite=Lax` cookie. Server Components read via
the data-access layer. Browser mutations call the allow-listed `/api/lms/*`
proxy, which adds the JWT server-side.

There are three layers, with different responsibilities:

1. Next.js middleware redirects obviously unauthenticated navigation. This is a
   user-experience optimization.
2. Pages call `requireUser` or `requireRole` so the wrong dashboard is not
   rendered.
3. Every Strapi mutation and private read authenticates and authorizes again.
   Policies and services are the final security boundary, including ownership
   and enrollment checks.

Hiding a button is never treated as authorization.

## Student flow

Log in as `student@project30.local`, open `/courses`, and choose a published
course.

1. Select **Enroll now**. The client calls `POST /api/lms/courses/:id/enroll`.
   Strapi requires the Student role, creates an enrollment with a server-built
   unique key, and returns the safe course summary. A repeated request returns
   the existing enrollment instead of duplicating it.
2. Open **My Courses** at `/learn`. The page calls `GET /api/lms/my-courses` and
   receives only this student's enrollments plus computed progress.
3. Open a course and then its first incomplete curriculum step. Strapi checks
   enrollment before returning content. General Lessons and Quizzes share one
   position order; a later step unlocks only when every preceding step is
   complete. Strapi rejects forged direct requests to locked Lessons or Quizzes.
4. Select **Mark lesson complete**. The client calls
   `PUT /api/lms/my-courses/:courseDocumentId/lessons/:lessonDocumentId/complete`.
   Strapi upserts the student's
   lesson-progress record and calculates
   `completed lessons and quizzes / total curriculum steps`. The result
   persists in PostgreSQL, so refresh does not change it.
5. Open a quiz. `GET /api/lms/my-courses/:courseDocumentId/quizzes/:quizDocumentId`
   intentionally omits every `correctOption`. On submit,
   `POST /api/lms/my-courses/:courseDocumentId/quizzes/:quizDocumentId/attempts`
   sends only the selected option indexes. Strapi loads the private answers, compares by
   question position, calculates the score, and stores a quiz attempt.
6. Open `/quiz-attempts` to show the stored result later.

Key code to show:

- `frontend/src/components/learning/enroll-button.tsx`
- `frontend/src/components/learning/complete-lesson-button.tsx`
- `frontend/src/components/learning/quiz-taker.tsx`
- `backend/src/api/course/controllers/course.ts`
- `backend/src/api/lesson-progress/services/lesson-progress.ts`
- `backend/src/api/quiz/services/quiz.ts`

Interview point: progress belongs in a join-style record keyed by both student
and lesson. It cannot be a boolean on Lesson because students progress
independently.

## Instructor flow

Log in as `instructor@project30.local` and use the dashboard.

1. Create a course. The backend always assigns the authenticated Instructor as
   owner; a forged instructor identifier is not trusted.
2. Add, reorder, edit, or delete lessons on that course. Positions are unique
   per course, concurrent order writes are serialized in PostgreSQL, and lesson
   deletion transactionally removes dependent progress rows.
3. Create and edit an MCQ quiz. Each question must have at least two non-empty
   options and a valid correct-option index.
4. Open student progress for the course. The response contains enrollments only
   for that owned course.
5. Try changing another instructor's course through the API: Strapi returns
   `403`, even if a URL or request is manually forged.

Content Managers use the same course, lesson, and quiz screens but may manage
all courses. They can also use the Blog workspace. Admins inherit both scopes.

Key code to show:

- `frontend/src/components/dashboard/course-form.tsx`
- `frontend/src/components/dashboard/quiz-manager.tsx`
- `frontend/src/components/dashboard/course-progress-panel.tsx`
- `backend/src/policies/can-manage-course.ts`
- `backend/src/api/course/services/course.ts`

## Content Manager and blog flow

Log in as `manager@project30.local`, open **Blog workspace**, and create a post.

1. Save it without **Publish now**. The managed API returns a draft, but the
   public `GET /api/lms/blog-posts` endpoint cannot see it.
2. Edit the post and publish it. It immediately appears at `/blog` and
   `/blog/:slug`.
3. Unpublish it and refresh the public page. It disappears without being
   deleted, preserving the editable draft.
4. The author relation is server-controlled. A Content Manager cannot claim a
   different author and cannot modify another manager's post; Admin can manage
   every post.

The backend explicitly resolves Strapi 5's draft and published document
versions when constructing managed DTOs. This keeps the checkbox accurate and
prevents an edit from accidentally changing publication state.

Key code to show:

- `frontend/src/components/blog/blog-form.tsx`
- `backend/src/api/blog-post/controllers/blog-post.ts`
- `backend/src/api/blog-post/services/blog-post.ts`

## Admin flow

Log in as `admin@project30.local` and open `/admin`.

1. Show live counts for users by role, unassigned users, courses, lessons,
   enrollments, quizzes, attempts, and blog posts. The user table is paginated;
   its total comes directly from the database rather than the visible page.
2. Change a user's application role, then refresh or log in as that user to show
   the new workspace.
3. Block and unblock a user. A blocked user cannot establish a new session.
4. Show access to all courses and blog posts regardless of owner.

The role selector calls `PATCH /api/lms/admin/users/:id/role`; choosing **No
role** creates an explicit unassigned state. That user can still sign in and see
the account-status page but has no LMS permissions. Blocking calls
`PATCH /api/lms/admin/users/:id/status`. Strapi validates allowed role types and
requires another active Admin before an Admin can be blocked or demoted.
Blocked Admins do not count toward this safety check.

Permanent deletion is intentionally absent. **No role** removes LMS authority
without destroying the account's history; **Block** suspends login. Demoting or
blocking an Admin runs inside a database transaction protected by a PostgreSQL
advisory lock, so concurrent requests cannot remove the final active Admin.

Key code to show:

- `frontend/src/components/admin/user-manager.tsx`
- `backend/src/api/platform/controllers/platform.ts`
- `backend/src/api/platform/services/platform.ts`
- `backend/src/policies/is-admin.ts`

## One data flow to draw in the video

Use lesson completion because it demonstrates all layers clearly:

```text
Complete button
  -> Next.js /api/lms allow-listed proxy
  -> JWT from HttpOnly cookie becomes Authorization header
  -> Strapi authentication + Student-role policy
  -> lesson-progress service verifies enrollment
  -> unique progress row written to PostgreSQL
  -> fresh progress summary returned
  -> React state updates the progress bar
```

Point out that the UI never sends a student id. Strapi derives it from the
verified JWT, which prevents one student from writing progress for another.

## Tests and what each layer proves

Run everything from the repository root:

```bash
npm test
npm run lint
npm run build
```

- Unit tests cover pure authorization and quiz-scoring edge cases quickly.
- Supertest API tests boot a real Strapi instance against an isolated SQLite
  test database and prove authentication, `403` ownership boundaries,
  enrollment, persistent progress, answer redaction, grading, draft/publish
  visibility, Admin protection, and cleanup behavior.
- A separate normal-Node refresh-session API test proves role-less logout
  revokes the old refresh token. The final count is 22 unit tests and 13
  main API scenarios, plus this refresh-session scenario.
- TypeScript compilation and the production Next.js build verify every route and
  the server/client boundaries.
- Manual browser walkthroughs verify cookie handling, navigation, pending/error
  states, refresh persistence, and responsive layouts.

## Questions likely to be asked

**Why not NATS or another broker?** The application is one Strapi modular
monolith with one transactional PostgreSQL database. Enrollment, grading, and
progress are synchronous request/response operations. A broker would add
deployment and consistency failure modes without solving a current requirement.

**Why self-host Strapi?** The mandatory target is Railway. Strapi runs there as
the backend service and connects to managed PostgreSQL; Vercel hosts Next.js.
Strapi Cloud is not required.

**Why a Next.js API proxy?** It keeps the JWT out of browser JavaScript and gives
the browser a same-origin API. The proxy uses an explicit root allow-list, so it
is not an unrestricted tunnel to Strapi.

**How do you prevent quiz cheating?** Student read DTOs exclude
`correctOption`; grading happens in Strapi; and attempts store submitted answers
and the server-computed score. Client-side scoring is never trusted.

**How do you prevent duplicate progress or enrollments?** The backend creates
stable composite keys and performs idempotent lookups. Database uniqueness is
the final guard against rapid duplicate requests.

**What is still outside local scope?** Only Vercel/Railway provisioning and
production environment values. The application code, health checks, Railway
configuration, schemas, seed, flows, and verification commands are ready for
that final deployment step.

## Suggested ten-minute recording order

- 0:00–0:45 — architecture and the four roles
- 0:45–3:15 — Student enrollment, lesson, persisted progress, quiz, history
- 3:15–5:15 — Instructor course, lesson, quiz, owned-course progress
- 5:15–6:30 — Content Manager blog draft then publish
- 6:30–7:30 — Admin statistics and role change
- 7:30–8:30 — lesson-completion data flow and backend authorization
- 8:30–9:20 — progress and grading code
- 9:20–10:00 — tests, environment variables, Vercel/Railway configuration
