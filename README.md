# Project30 Academy

Project30 Academy is a full-stack Learning Management System built for the
Junior Software Engineer project round. It uses the required stack without
substitution:

| Layer | Technology | Deployment target |
| --- | --- | --- |
| Frontend | Next.js 16 App Router, React, TypeScript | Vercel |
| Backend/CMS | Self-hosted Strapi 5.52.2 | Railway |
| Database | PostgreSQL 16 | Railway PostgreSQL |

The repository is a modular monolith. Course, lesson, quiz, enrollment,
progress, blog, and platform administration are separate Strapi modules, but
they run in one backend process and share one transactional PostgreSQL database.
No NATS, Kafka, RabbitMQ, or other message broker is required.

## Current submission status

The application code, local workflow, tests, Railway configuration, and
deployment guide are complete. The final hosted links and walkthrough must be
added after deployment:

| Submission item | Status |
| --- | --- |
| Public GitHub repository | Available |
| Vercel frontend URL | `https://project30-two.vercel.app` |
| Railway backend URL | `https://project30-production.up.railway.app` |
| Video walkthrough URL | Recording pending |

Do not submit until all four links are openable in a signed-out/incognito
browser.

## Reviewer access

Public registration always creates a Student. An LMS Admin can promote that
account to Instructor, Content Manager, or Admin.

| Account | Value |
| --- | --- |
| Reviewer LMS Admin email | `iamadmin@gmail.com` |
| Reviewer LMS Admin password | Shared privately with the reviewer |
| Strapi CMS Admin | Separate account created at `/admin` |

The LMS Admin password is intentionally not stored in this public repository.
Publishing an Admin password would let anyone change roles, block users, or
delete content on the deployed application. Provide the reviewer password in a
private submission field or direct message, and rotate it after the interviews.

The Strapi CMS Admin and LMS application Admin are different identities:

- The Strapi CMS Admin signs in at the Railway backend's `/admin` portal and
  administers Strapi itself.
- The LMS Admin signs in through the Next.js application and is governed by the
  same custom APIs and role policies as other application users.

## What is implemented

- Secure signup, login, refresh-token sessions, logout, and role-less-account
  handling.
- Four application roles: Admin, Content Manager, Instructor, and Student.
- Backend-enforced role, ownership, enrollment, and sequential-access rules.
- Course draft, publish, create, edit, and delete workflows.
- A shared ordered curriculum where each position can be either:
  - a General Lesson containing text, resource links, and/or a video URL; or
  - an auto-graded MCQ Quiz.
- Student course discovery, idempotent enrollment, and a separate My Courses
  library.
- Sequential lesson/quiz access enforced by Strapi, not only by the interface.
- Persistent per-student, per-course progress derived from stored completion
  facts and quiz attempts.
- Server-side quiz grading with correct answers removed from Student responses.
- Stored quiz result history with repeat attempts.
- Instructor/Content Manager views of enrolled Student progress.
- A dedicated LMS Admin dashboard with users, roles, account status, paginated
  lists, content access, and platform statistics.
- Last-active-Admin protection serialized with a PostgreSQL advisory
  transaction lock.
- Blog writing with author ownership and Strapi Draft & Publish.
- Public published-only course and blog pages.
- Bangladesh-focused responsive marketing, course, dashboard, and learning UI.
- Reproducible demo courses, lessons, quizzes, and optional role accounts.
- Unit, Strapi/Supertest API, and refresh-session tests.

## System architecture

```text
Browser
  |
  | same-origin HTTPS
  v
Next.js on Vercel
  |-- public and role-specific pages
  |-- server-side data-access layer
  |-- auth Route Handlers
  |-- allow-listed /api/lms proxy
  |-- HttpOnly access/refresh cookies
  |
  | Authorization: Bearer <Strapi access token>
  v
Strapi on Railway
  |-- Users & Permissions authentication
  |-- role and ownership policies
  |-- request validation
  |-- domain services and business rules
  |-- quiz grading and progress calculation
  v
Railway PostgreSQL
  |-- users and roles
  |-- content and publication state
  |-- enrollment, progress, and attempts
  |-- Strapi refresh sessions
```

### Responsibility boundaries

**Next.js**

- Renders the public website and role-specific workspaces.
- Stores Strapi tokens in `HttpOnly`, `SameSite=Lax` cookies; production
  cookies are also `Secure`.
- Uses Server Components and a server-only data-access layer for reads.
- Adds the access token to browser mutations through an allow-listed same-origin
  proxy.
- Redirects obviously unauthorized navigation for good user experience.
- Never connects directly to PostgreSQL and is not the final authorization
  boundary.

**Strapi**

- Authenticates LMS users through Users & Permissions.
- Makes every final role, ownership, enrollment, and sequence decision.
- Accepts strict request shapes instead of unrestricted generated CRUD input.
- Derives the current Student, Instructor, author, score, totals, timestamps,
  unique keys, and slugs on the server.
- Returns safe DTOs and never sends `correctOption` to a Student.
- Owns every domain write.

**PostgreSQL**

- Is the source of truth for identities, content, relationships, progress, and
  results.
- Enforces unique enrollment and lesson-completion keys.
- Supplies transactional locking for Admin membership changes and curriculum
  position writes.

## Portals and routes

### Public portal

| Route | What the visitor gets |
| --- | --- |
| `/` | Academy home page, featured courses, and platform introduction |
| `/courses` | Published course catalog |
| `/courses/:documentId` | Published course description and ordered curriculum |
| `/blog` | Published blog posts |
| `/blog/:slug` | One published article |
| `/register` | Bangla-friendly Student registration |
| `/login` | Login for every LMS role |

Draft courses and draft blog posts never appear in the public portal.

### Student portal

| Route | What the Student gets |
| --- | --- |
| `/dashboard` | Real enrolled-course summary, progress, next step, and recent activity |
| `/learn` | Separate My Courses library |
| `/learn/:courseId` | One ordered curriculum of lessons and quizzes |
| `/learn/:courseId/lessons/:lessonId` | Text/resources/video lesson and completion control |
| `/learn/:courseId/quizzes/:quizId` | MCQ quiz with instant server result |
| `/quiz-attempts` | Stored result history |

A Student can open only a published course in which they are enrolled. Every
step after the first stays locked until all previous curriculum steps are
complete.

### Course-management portal

Admin, Content Manager, and Instructor use:

| Route | What the manager gets |
| --- | --- |
| `/manage/courses` | All manageable courses |
| `/manage/courses/new` | Course creation and draft/publish selection |
| `/manage/courses/:id/edit` | Course fields, unified curriculum builder, quiz editor, and Student progress |

The curriculum builder lets the setter choose `General lesson` or `Quiz`
for a shared course position. This supports flows such as:

```text
1. General Lesson
2. Quiz
3. General Lesson
4. Quiz
```

Every position must be unused. The backend checks positions across both the
Lesson and Quiz collections under the same course-scoped transaction lock.

### Blog-management portal

Admin and Content Manager use:

| Route | What the editor gets |
| --- | --- |
| `/manage/blogs` | Manageable draft and published posts |
| `/manage/blogs/new` | New post editor |
| `/manage/blogs/:id/edit` | Edit, publish, unpublish, or delete a post |

Content Managers manage posts authored by their own account. Admins manage
every author's posts.

### LMS Admin portal

Only an LMS application Admin can open `/admin`. It contains:

- exact total users and counts by all four roles;
- a visible unassigned-role bucket;
- paginated user records;
- role assignment, promotion, demotion, and role removal;
- block/unblock controls;
- total courses, lessons, enrollments, quizzes, attempts, and published posts;
- direct management links for all courses and all blog posts.

The final active Admin cannot be demoted, have their role removed, or be
blocked. Blocked Admins do not count as active backup administrators.

### Strapi and health portals

| Route | Purpose |
| --- | --- |
| `http://localhost:1337/admin` | Strapi CMS administration |
| `http://localhost:1337/api/health` | Backend readiness |
| `http://localhost:3000/api/health` | Combined frontend-to-backend health |

## Roles and permissions

| Action | Admin | Content Manager | Instructor | Student |
| --- | --- | --- | --- | --- |
| Manage users and roles | All | No | No | No |
| Create courses | Yes | Yes | Yes, assigned to self | No |
| Edit/delete courses | All | All | Own only | No |
| Manage lessons and quizzes | All | All | Own courses only | No |
| View Student progress | All | All | Own courses only | Own only |
| Manage blog posts | All | Own posts | No | No |
| Enroll in courses | No | No | No | Yes |
| View private lesson content | Managed courses | Managed courses | Own courses | Enrolled courses |
| Take quizzes | No | No | No | Enrolled courses |

The UI mirrors this table, but Strapi route permissions and policies are the
enforcement boundary. Hiding navigation or buttons is never treated as
authorization.

## What is stored and where

### Browser and Next.js cookies

| Data | Storage | Notes |
| --- | --- | --- |
| Access token | HttpOnly cookie | 24-hour maximum age; browser JavaScript cannot read it |
| Refresh token | HttpOnly cookie | 7-day maximum session age |
| Role/content/progress | Not trusted in browser storage | Loaded from Strapi |

The application does not store tokens in `localStorage`.

### PostgreSQL domain records

| Record | Important stored fields | Purpose |
| --- | --- | --- |
| User | username, normalized email, password hash, confirmed, blocked, role | LMS identity |
| Role | name, type, controller permissions | Four-role authorization |
| Course | title, slug, description, thumbnail URL, instructor, publication versions | Course library |
| Lesson | title, content, video URL, position, course | General curriculum step |
| Quiz | title, position, course, repeated Question components | Quiz curriculum step |
| Question component | prompt, options, correct option index | Private grading source |
| Enrollment | Student, course, enrolled timestamp, private unique key | Course membership |
| LessonProgress | Student, lesson, completed timestamp, private unique key | Persistent completion fact |
| QuizAttempt | Student, quiz, submitted answers, score, total, submitted timestamp | Immutable graded result |
| BlogPost | title, slug, body, cover URL, author, publication versions | Draft/published editorial content |
| Strapi session | user/session identity and refresh-token state | Refresh and revocation |

### Derived rather than stored

The system does not store a course percentage. It derives it from the current
ordered curriculum:

```text
percentage = round(completed course steps / total course steps * 100)
```

A General Lesson is complete when its unique LessonProgress record exists. A
Quiz is complete after a valid full submission creates at least one
QuizAttempt. There is no mandatory pass mark in the supplied project brief, so
any valid graded attempt completes the step; Students can retry and every
attempt remains visible.

If the curriculum changes, the next read recalculates progress using the
current steps instead of trusting a stale stored percentage.

### External media

Course thumbnails, blog cover images, learning resources, and lesson videos are
stored as URLs. Images are restricted to the configured safe remote host for
Next Image. YouTube lessons use privacy-enhanced embed URLs. Resource URLs are
rendered as safe React text/links, not injected HTML.

## Main business flows

### Authentication

```text
Registration form
  -> Next.js validates username/email/password
  -> Strapi registration receives no role field
  -> Strapi assigns Student
  -> Next.js stores access/refresh tokens in HttpOnly cookies
  -> /api/lms/me returns a minimal safe user and role
```

Only the LMS Admin role-management endpoint can assign privileged roles. Email
uniqueness is enabled in Strapi.

### Enrollment

```text
Student selects Enroll
  -> Student-only Strapi policy
  -> published course is verified
  -> authenticated user becomes enrollment owner
  -> server creates student:course unique key
  -> duplicate request returns the existing enrollment
```

The browser never sends a Student ID.

### Curriculum and sequence

Lessons and quizzes have one shared ordered position space. For every Student
read or mutation, Strapi rebuilds the ordered list and marks a step locked
unless every earlier step has a completion fact.

This guard runs when:

- opening a lesson;
- marking a lesson complete;
- opening a quiz; and
- submitting a quiz.

Changing a URL or sending a direct HTTP request cannot skip the sequence.

### Lesson progress

```text
Mark complete button
  -> Next.js allow-listed proxy adds JWT
  -> Strapi verifies enrollment and sequence
  -> unique Student/Lesson completion row is created
  -> duplicate completion returns the existing row
  -> fresh combined lesson/quiz progress is returned
```

### Quiz grading

```text
Student quiz read
  -> prompt + options only
  -> correctOption removed

Student submit
  -> answers must match the exact question count
  -> every option index is validated
  -> Strapi loads private correctOption values
  -> score, total, and percentage are computed
  -> attempt is stored
  -> result is returned immediately
```

The request cannot supply Student ID, score, total, or correct answers.

### Course and blog publication

Course and BlogPost use Strapi Draft & Publish:

- leave the Publish checkbox clear to save a private draft;
- edit later and select Publish to expose it publicly;
- clear Publish on an existing item to unpublish it without deleting the draft.

Lesson and Quiz do not have independent Draft & Publish states. They belong to
the parent course. Changes to steps in an already-published course therefore
affect that course immediately.

### User role and status management

```text
Admin role/status request
  -> Admin-only policy
  -> PostgreSQL advisory transaction lock
  -> target user and active Admin count loaded
  -> last-active-Admin rule checked
  -> role/status updated
  -> exact safe user DTO returned
```

Permanent application-user deletion is not exposed. Removing a role leaves an
explicit unassigned account with no private LMS permissions. Blocking suspends
authentication. Both operations preserve enrollment, lesson progress, and quiz
history relations.

## API reference

### Public and authentication

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/local/register` | Public; always creates Student |
| POST | `/api/auth/local` | Public login |
| POST | `/api/auth/refresh` | Valid refresh session |
| GET | `/api/lms/me` | Signed-in or role-less account |
| POST | `/api/lms/logout` | Idempotent refresh-session revocation |
| GET | `/api/lms/courses` | Public published courses |
| GET | `/api/lms/courses/:courseId` | Public published course |
| GET | `/api/lms/blog-posts` | Public published posts |
| GET | `/api/lms/blog-posts/:slug` | Public published post |

### Course management

| Method | Endpoint | Access |
| --- | --- | --- |
| GET/POST | `/api/lms/manage/courses` | Admin, Content Manager, Instructor |
| GET/PUT/DELETE | `/api/lms/manage/courses/:courseId` | Admin/CM all; Instructor own |
| GET/POST | `/api/lms/manage/courses/:courseId/lessons` | Manageable course |
| PUT/DELETE | `/api/lms/manage/lessons/:lessonId` | Manageable course |
| GET/POST | `/api/lms/manage/courses/:courseId/quizzes` | Manageable course |
| PUT/DELETE | `/api/lms/manage/quizzes/:quizId` | Manageable course |
| GET | `/api/lms/manage/courses/:courseId/progress` | Manageable course |

### Student learning

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/lms/courses/:courseId/enroll` | Student |
| GET | `/api/lms/my-courses` | Student |
| GET | `/api/lms/my-courses/:courseId` | Enrolled Student |
| GET | `/api/lms/my-courses/:courseId/progress` | Enrolled Student |
| GET | `/api/lms/my-courses/:courseId/lessons/:lessonId` | Enrolled and unlocked |
| PUT | `/api/lms/my-courses/:courseId/lessons/:lessonId/complete` | Enrolled and unlocked |
| GET | `/api/lms/my-courses/:courseId/quizzes` | Enrolled; summaries only |
| GET | `/api/lms/my-courses/:courseId/quizzes/:quizId` | Enrolled and unlocked |
| POST | `/api/lms/my-courses/:courseId/quizzes/:quizId/attempts` | Enrolled and unlocked |
| GET | `/api/lms/my-quiz-attempts` | Student's own attempts |

### Blog and Admin management

| Method | Endpoint | Access |
| --- | --- | --- |
| GET/POST | `/api/lms/manage/blog-posts` | Admin or Content Manager |
| GET/PUT/DELETE | `/api/lms/manage/blog-posts/:postId` | Admin all; CM own |
| GET | `/api/lms/admin/users` | Admin |
| PATCH | `/api/lms/admin/users/:userId/role` | Admin |
| PATCH | `/api/lms/admin/users/:userId/status` | Admin |
| GET | `/api/lms/admin/stats` | Admin |

## Repository structure

```text
Project30/
|-- frontend/
|   |-- src/app/                 Next.js routes and Route Handlers
|   |-- src/components/          auth, dashboard, learning, blog, admin UI
|   |-- src/lib/dal/             server-only data-access layer
|   |-- src/lib/auth/            cookie/session and auth validation
|   |-- src/proxy.ts             optimistic protected-route redirect
|   |-- next.config.ts
|   `-- .env.example
|-- backend/
|   |-- config/                  Strapi, database, CORS, session configuration
|   |-- src/api/
|   |   |-- account/             current identity and logout
|   |   |-- course/              course CRUD and ownership
|   |   |-- lesson/              general steps and sequence
|   |   |-- enrollment/          Student/course membership
|   |   |-- lesson-progress/     completion and derived progress
|   |   |-- quiz/                questions, ordering, and grading
|   |   |-- quiz-attempt/        result history
|   |   |-- blog-post/           author and publication workflow
|   |   |-- platform/            Admin users, roles, status, and stats
|   |   `-- health/              Railway readiness
|   |-- src/policies/            role, ownership, and enrollment guards
|   |-- src/utils/               validation, grading, locks, unique keys
|   |-- scripts/seed-demo.js
|   |-- tests/
|   `-- .env.example
|-- docs/                        architecture, decisions, role and deployment guides
|-- compose.yaml                 local PostgreSQL
|-- package.json                 root convenience scripts
`-- README.md
```

The backend request direction is:

```text
route -> Strapi authentication/action permission -> policy
      -> controller validation -> service business rules -> PostgreSQL
```

## Run locally

### Requirements

- Node.js 20 or newer
- npm
- Docker Engine with Docker Compose

If Docker reports permission denied for `/var/run/docker.sock`, start Docker
and configure the current Linux user for Docker before continuing. Do not run
the application database as an unrelated root-owned manual process.

### 1. Install and configure

```bash
git clone https://github.com/ZohanaZuthi/Project30.git
cd Project30

docker compose up -d postgres

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

npm --prefix backend ci
npm --prefix frontend ci
```

Replace every `replace-me` Strapi secret in `backend/.env`. Generate random
values with:

```bash
openssl rand -base64 32
```

### 2. Seed optional demo content

```bash
npm run seed:demo
```

To create the four local walkthrough accounts, supply one local-only password:

```bash
DEMO_USER_PASSWORD='choose-a-local-password' npm run seed:demo
```

This creates:

| Email | LMS role |
| --- | --- |
| `student@project30.local` | Student |
| `instructor@project30.local` | Instructor |
| `manager@project30.local` | Content Manager |
| `iamadmin@gmail.com` | Admin |

Never commit a real password. For a controlled review deployment,
`DEMO_USER_PASSWORD` may be added to Railway only for the one-time seed deploy;
remove both the variable and the pre-deploy command immediately afterward.

### 3. Start both applications

Use separate terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Open:

- Next.js: <http://localhost:3000>
- Strapi CMS: <http://localhost:1337/admin>
- Backend health: <http://localhost:1337/api/health>
- Combined health: <http://localhost:3000/api/health>

On the first Strapi start, create the separate CMS administrator at
`/admin`. For the first LMS application Admin, use a local seeded account or
assign the Admin application role through Strapi's Content Manager.

## Environment variables

### Backend

| Variable | Purpose |
| --- | --- |
| `HOST`, `PORT`, `PUBLIC_URL`, `IS_PROXIED` | Railway server address |
| `CLIENT_URLS` | Allowed Next.js origins |
| `APP_KEYS` | Strapi application signing keys |
| `API_TOKEN_SALT` | API token hashing |
| `ADMIN_JWT_SECRET` | Strapi CMS Admin JWT signing |
| `TRANSFER_TOKEN_SALT` | Transfer token hashing |
| `JWT_SECRET` | LMS Users & Permissions JWT signing |
| `ENCRYPTION_KEY` | Strapi secret encryption |
| `DATABASE_*` or `DATABASE_URL` | PostgreSQL connection |
| `DATABASE_SSL` | Production PostgreSQL TLS |

### Frontend

| Variable | Purpose |
| --- | --- |
| `STRAPI_URL` | Server-only Railway backend URL |

`STRAPI_URL` must not be prefixed with `NEXT_PUBLIC_`; browser code does not
need the backend origin or tokens.

## Verification

Run from the repository root:

```bash
npm run lint
npm run build
npm test
```

Current verified result:

- Frontend ESLint: passed
- Next.js TypeScript production build: passed
- Strapi production build: passed
- Unit test suites: 6 passed
- Unit tests: 22 passed
- Strapi/Supertest API scenarios: 13 passed
- Refresh-session revocation scenario: passed

The API tests boot a real Strapi instance against an isolated SQLite test
database. Production uses PostgreSQL, so final Railway smoke tests must also
verify the PostgreSQL-specific advisory-lock paths.

Important negative cases covered include:

- public registration cannot select Admin;
- Student cannot create courses;
- another Instructor cannot edit an owned course;
- enrollment and completion cannot be duplicated;
- locked curriculum steps cannot be opened directly;
- Lesson and Quiz cannot claim the same position;
- quiz correct answers are absent from Student responses;
- forged score, missing answers, extra answers, and invalid options are rejected;
- draft posts are absent from the public blog;
- non-Admin cannot manage roles;
- last active Admin cannot be removed;
- role-less logout revokes its refresh session.

## Deployment

### Railway

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Add the GitHub repository as another service.
4. Set the Strapi service root directory to `/backend`.
5. In the service dashboard set Build Command to `npm run build`, Start Command
   to `npm run start`, and Healthcheck Path to `/api/health`.
6. Generate a public backend domain.
7. Configure the variables documented in
   [docs/deployment.md](docs/deployment.md).
8. Verify `GET https://<backend-domain>/api/health`.
9. Open `https://<backend-domain>/admin` and create the Strapi CMS Admin.

Railway dashboard settings are the deployment source of truth. The deprecated
`railway.json`/`railway.toml` Config as Code format is intentionally not used.

### Vercel

1. Import the same GitHub repository.
2. Set Root Directory to `frontend`.
3. Keep the detected Next.js framework.
4. Add server-only `STRAPI_URL=https://<railway-backend-domain>`.
5. Deploy or redeploy after changing the environment variable.
6. Verify `GET https://<frontend-domain>/api/health`.

Set Railway `CLIENT_URLS` to the final Vercel domain and redeploy Strapi.

### Production smoke test

Verify in a signed-out/incognito browser:

1. Published course and blog pages open publicly.
2. Registration creates a Student.
3. Student enrolls, completes a lesson, refreshes, and keeps progress.
4. Student completes a quiz and later sees its result.
5. Instructor can manage only an owned course.
6. Content Manager can manage all courses and own blog posts.
7. Admin can change a user's role and see exact statistics.
8. Draft course/blog remains absent from public APIs.
9. Railway and frontend health endpoints return HTTP 200.

## Security decisions

- Privileged roles cannot be selected during registration.
- Correct quiz answers are server-only.
- Student IDs, ownership, scores, timestamps, and unique keys are server-derived.
- Generic unrestricted domain CRUD is not exposed to application roles.
- Next.js mutations use an explicit root allow-list and reject cross-origin
  state-changing requests.
- User-facing content renders as React text; no `dangerouslySetInnerHTML` is
  used.
- Public reads explicitly request published Strapi document versions.
- Role removal and blocking preserve learning history.
- Last-active-Admin changes are atomic in PostgreSQL.

The frontend production dependency audit currently reports no findings. Strapi
5.52.2 inherits Admin/build-tool advisories from its dependency tree. Do not run
`npm audit fix --force`, because npm proposes an incompatible Strapi 4
downgrade. Keep Strapi on the latest tested 5.x patch, restrict the CMS Admin,
and repeat the audit before deployment.

## Intentional scope and known behavior

- All demo courses are free. Payments were not requested by the project brief.
- Certificates, chat, live classes, and custom video upload are outside scope.
- Image and video URLs avoid relying on Railway's ephemeral local filesystem.
- Quiz completion requires a valid full submission but not a minimum score,
  because the brief defines auto-grading without a pass threshold.
- A Student may retake a quiz; every attempt is stored.
- Deleting a Quiz deliberately deletes its dependent attempt records after an
  explicit warning. A production audit-retention version would archive the Quiz
  or snapshot Quiz metadata inside attempts instead.
- Access tokens last 24 hours. A refresh endpoint exists, but automatic browser
  refresh/retry is a future UX improvement.
- Curriculum positions are explicit. Moving onto an occupied position is
  rejected instead of silently reordering other content.
- API integration tests use SQLite for isolation; PostgreSQL deployment smoke
  checks remain required.

## Ten-minute video walkthrough

```text
0:00-0:40  Architecture, mandatory stack, and four roles
0:40-2:30  Student: register/login -> enroll -> lesson -> progress -> quiz -> history
2:30-4:15  Instructor: own course -> choose lesson/quiz step -> progress view
4:15-5:15  Content Manager: platform course access -> blog draft -> publish
5:15-6:15  Admin: stats -> role change -> last-Admin safety
6:15-7:15  One frontend -> Next proxy -> Strapi -> PostgreSQL data flow
7:15-8:15  Backend policies and Instructor ownership
8:15-9:05  Progress logic and unique records line by line
9:05-9:40  Quiz answer privacy and server grading
9:40-10:00 Vercel, Railway, PostgreSQL, and environment variables
```

Show at least one forged/unauthorized API request returning `403` and show
that a Student quiz response has no `correctOption`. The video should be a
screen recording in the candidate's own voice.

## Further documentation

- [Architecture](docs/architecture.md)
- [Engineering decisions](docs/decisions.md)
- [Permission matrix](docs/permission-matrix.md)
- [Backend implementation guide](docs/backend-implementation-guide.md)
- [Frontend experience guide](docs/frontend-experience-guide.md)
- [Complete role-flow walkthrough](docs/role-flow-walkthrough.md)
- [Deployment guide](docs/deployment.md)

The code and documentation are intentionally structured so every important
business rule can be demonstrated and explained during the interview.
