# Complete Strapi backend implementation guide

Date: 26 August 2026

## 1. What this backend is

This is one self-hosted Strapi 5 application deployed later to Railway with one
PostgreSQL database. It is a modular monolith: Course, Enrollment, Progress,
Quiz, Blog, and Platform are separate code modules, but they run in one process
and use direct service/database calls. NATS or another broker is unnecessary
because every required operation is a short synchronous request.

The request path is:

```text
HTTP route
  -> Strapi Users & Permissions authenticates the JWT and action scope
  -> policy checks role plus ownership/enrollment
  -> controller validates the body and sets HTTP status/shape
  -> service applies business rules
  -> Strapi Document Service / Query Engine
  -> PostgreSQL
```

This separation follows Strapi's documented backend customization model:

- [Routes](https://docs.strapi.io/cms/backend-customization/routes) declare the
  method, path, handler, and policies.
- [Policies](https://docs.strapi.io/cms/backend-customization/policies) run
  before controllers and reject unauthorized calls.
- [Controllers](https://docs.strapi.io/cms/backend-customization/controllers)
  translate HTTP requests and responses.
- [Services](https://docs.strapi.io/cms/backend-customization/services) contain
  reusable business rules.
- [Document Service](https://docs.strapi.io/cms/api/document-service) is the
  Strapi 5 document-oriented content API and uses `documentId` in public URLs.

## 2. Authentication and the four roles

Authentication uses Strapi's Users & Permissions plugin. In production it is
configured for refresh-token sessions in `backend/config/plugins.ts`. Next.js
is the browser-facing BFF: it receives the tokens from Strapi, stores them in
HttpOnly cookies, and forwards the access token as a Bearer token.

Important distinction:

- A Strapi CMS administrator signs in at `/admin` and operates Strapi itself.
- An LMS Admin is a normal Users & Permissions application user with role type
  `admin` and signs in through the LMS.

`backend/src/index.ts` performs an idempotent bootstrap:

1. Find or create `student`, `instructor`, `content_manager`, and `admin` roles.
2. Seed the exact controller-action permissions each role needs.
3. Make Student the public-registration default.
4. Migrate legacy `authenticated` application users to Student.

The bootstrap is version-controlled, so a fresh Railway database receives the
same access rules without manual dashboard clicking.

Public registration accepts only `username`, `email`, and `password`. Sending
`role: "admin"` is rejected. An LMS Admin changes roles later through the Admin
API. This prevents privilege escalation during signup.

## 3. Why generated CRUD routes were replaced

Strapi can generate generic REST CRUD routes for every content type. They are
not exposed for Enrollment, Progress, Quiz, QuizAttempt, or BlogPost here.
Instead, each router lists only the use-case endpoints we intend to support.

That prevents dangerous payloads such as:

```json
{
  "student": "someone-else",
  "score": 100,
  "correctOption": 0,
  "role": "admin"
}
```

The server derives the authenticated student, instructor/author ownership,
score, totals, timestamps, unique keys, and slugs.

## 4. API reference

All protected requests use:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Authentication and identity

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/local/register` | Public | Register a Student only |
| POST | `/api/auth/local` | Public | Log in and receive access/refresh tokens |
| GET | `/api/lms/me` | Any signed-in role | Return a minimal safe identity and role |

Register body:

```json
{
  "username": "zohana",
  "email": "zohana@example.com",
  "password": "strong-password"
}
```

### Courses and lessons

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/lms/courses` | Public, published only |
| GET | `/api/lms/courses/:courseDocumentId` | Public, published only |
| GET | `/api/lms/manage/courses` | Admin/CM all; Instructor own |
| POST | `/api/lms/manage/courses` | Admin/CM/Instructor |
| GET/PUT/DELETE | `/api/lms/manage/courses/:courseDocumentId` | Admin/CM all; Instructor own |
| GET/POST | `/api/lms/manage/courses/:courseDocumentId/lessons` | Course managers |
| PUT/DELETE | `/api/lms/manage/lessons/:lessonDocumentId` | Course managers |
| GET | `/api/lms/my-courses/:courseDocumentId/lessons/:lessonDocumentId` | Enrolled Student |

Course create body:

```json
{
  "title": "Backend Security",
  "description": "Policies and ownership checks",
  "thumbnailUrl": "https://example.com/cover.jpg",
  "publish": true
}
```

An Instructor is assigned as owner from the authenticated user, never from a
trusted browser field. Admin/Content Manager can optionally send a verified
`instructorDocumentId`. Deleting a course transactionally removes dependent
attempts, quizzes, progress, lessons, and enrollments first.

Lesson create body:

```json
{
  "title": "Authorization policies",
  "content": "Lesson text",
  "videoUrl": "https://video.example.com/watch/1",
  "position": 1
}
```

At least text or a valid video URL is required. `position` determines sequence.

### Enrollment and progress

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/lms/courses/:courseDocumentId/enroll` | Student |
| GET | `/api/lms/my-courses` | Student |
| GET | `/api/lms/my-courses/:courseDocumentId` | Enrolled Student |
| PUT | `/api/lms/my-courses/:courseDocumentId/lessons/:lessonDocumentId/complete` | Enrolled Student |
| GET | `/api/lms/my-courses/:courseDocumentId/progress` | Enrolled Student |
| GET | `/api/lms/manage/courses/:courseDocumentId/progress` | Course managers |

The enroll request has no body. The authenticated user is always the student.
The server creates this unique key:

```text
student:<numeric-user-id>:course:<course-document-id>
```

If the same request is repeated, the service returns the existing Enrollment
with `alreadyEnrolled: true`. The unique database column also closes the race
between two simultaneous requests.

Completion works the same way with:

```text
student:<numeric-user-id>:lesson:<lesson-document-id>
```

Progress stores completion facts, not a percentage. It is derived on every
read:

```ts
percentage = totalLessons === 0
  ? 0
  : Math.round((completedLessons / totalLessons) * 100)
```

This stays accurate when a course later gains or loses lessons.

### Quizzes and attempts

| Method | Path | Access |
| --- | --- | --- |
| GET/POST | `/api/lms/manage/courses/:courseDocumentId/quizzes` | Course managers |
| PUT/DELETE | `/api/lms/manage/quizzes/:quizDocumentId` | Course managers |
| GET | `/api/lms/my-courses/:courseDocumentId/quizzes` | Enrolled Student |
| GET | `/api/lms/my-courses/:courseDocumentId/quizzes/:quizDocumentId` | Enrolled Student |
| POST | `/api/lms/my-courses/:courseDocumentId/quizzes/:quizDocumentId/attempts` | Enrolled Student |
| GET | `/api/lms/my-quiz-attempts` | Student, own attempts only |

Management create body:

```json
{
  "title": "Security quiz",
  "questions": [
    {
      "prompt": "Where must authorization be enforced?",
      "options": ["Only the UI", "The backend"],
      "correctOption": 1
    }
  ]
}
```

The student response mapper deliberately omits `correctOption`, even though the
service needs it internally. A submission accepts only answers:

```json
{ "answers": [1] }
```

For every question, `gradeQuiz` validates the selected index, compares it to
the stored correct index, and derives `score`, `total`, and `percentage`. The
client cannot submit those fields. Each result is persisted as an immutable
QuizAttempt and can be read later.

### Blog

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/lms/blog-posts` | Public, published only |
| GET | `/api/lms/blog-posts/:slug` | Public, published only |
| GET/POST | `/api/lms/manage/blog-posts` | Admin/Content Manager |
| GET/PUT/DELETE | `/api/lms/manage/blog-posts/:blogDocumentId` | Admin all; CM own |

Create/update accepts `title`, `body`, optional `coverImageUrl`, and optional
`publish`. The server derives the author and unique slug. Public queries always
specify `status: "published"`, so knowing a draft's ID or slug does not reveal
it.

### Admin platform API

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/lms/admin/users` | Admin | Safe user list |
| PATCH | `/api/lms/admin/users/:userDocumentId/role` | Admin | Assign/remove LMS role |
| PATCH | `/api/lms/admin/users/:userDocumentId/status` | Admin | Block/unblock login |
| DELETE | `/api/lms/admin/users/:userDocumentId` | Admin | Delete account |
| GET | `/api/lms/admin/stats` | Admin | Users by role and content totals |

Role body:

```json
{ "role": "instructor" }
```

Allowed values are `admin`, `content_manager`, `instructor`, `student`, or
`null`. The service prevents self-blocking, self-deletion, and removing,
blocking, or demoting the final Admin.

## 5. How backend authorization works

Authorization is defense in depth:

1. Users & Permissions verifies the Bearer JWT.
2. The bootstrapped action permission rejects a role that never owns that
   controller action.
3. A policy applies dynamic rules that static roles cannot express.

Examples:

- `is-course-manager`: broad staff-role gate.
- `can-manage-course`: loads the course; Admin/CM pass, Instructor must own it.
- `can-manage-lesson` and `can-manage-quiz`: follow the child back to its course.
- `is-enrolled-in-course`: requires Student role, enrollment, and a currently
  published course.
- `can-manage-blog-post`: Admin passes; CM must be the stored author.
- `is-admin`: protects every platform endpoint.

This is stronger than hiding buttons. A direct curl/Postman request receives
403 before the controller changes data.

## 6. Validation and safe responses

`backend/src/utils/validation.ts` uses strict Zod schemas. Strict means unknown
properties cause a 400 response. Controllers never spread an arbitrary request
body directly into the database.

Services return explicit DTOs rather than raw Strapi records. That keeps
private unique keys, password data, and correct quiz answers out of responses.
Strapi's Document Service is an internal API and its output is not assumed to
be automatically safe for public callers.

## 7. Tests

The suite follows Strapi's current
[testing guide](https://docs.strapi.io/cms/testing): Jest for the runner,
Supertest for HTTP, and an isolated SQLite test database. Production and local
runtime remain PostgreSQL; SQLite is only a disposable test adapter.

Commands:

```bash
npm --prefix backend run test:unit
npm --prefix backend run test:api
npm --prefix backend test
```

Unit tests (19 assertions) cover:

- role and ownership truth tables;
- enrollment/completion unique-key generation;
- progress edge cases and clamping;
- quiz grading, missing answers, and invalid indexes;
- strict validation for courses, lessons, quizzes, submissions, blogs, roles.

API tests boot real Strapi and execute 10 scenarios through HTTP:

- public health plus anonymous rejection;
- authenticated identity and role loading;
- rejected `role: admin` registration attempt;
- Student course-create denial;
- Instructor ownership and cross-instructor denial;
- idempotent enrollment and completion;
- no correct answers in Student quiz responses plus automatic grading;
- draft-hidden then published blog flow;
- Content Manager admin denial and Admin role/stats success.

The API test runs a fresh build first and deletes its isolated database during
cleanup. It never touches the development PostgreSQL database.

The test harness uses the plugin's legacy JWT issuance mode because Strapi's
refresh-session manager is not compatible with the patched SQLite adapter used
by its testing guide. Production remains in refresh mode; the same
Users & Permissions authentication strategy still loads the user and role
before every LMS action/policy test.

## 8. Run locally

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env
npm --prefix backend install
npm --prefix backend run develop
```

Verify:

```bash
curl http://localhost:1337/api/health
```

Create the first Strapi CMS administrator at `http://localhost:1337/admin`.
Create a normal LMS user through registration, then use an LMS Admin account or
the CMS during initial development to assign application roles.

## 9. Interview questions to prepare

### Why Strapi instead of a separate Express API?

The stack is mandatory, and Strapi provides content schemas, Users &
Permissions, Draft & Publish, a Document Service, validation hooks, and an admin
CMS. Custom routes/policies/services supply the LMS-specific rules.

### Is this microservices?

No. It is a modular monolith. Modules are separated in code but share one
deployment and database. That is appropriate for this scope and deadline.

### Why no NATS or queue?

Enrollment, completion, and grading must return immediately and are small
database operations. A broker would add eventual consistency and deployment
failure modes without a requirement.

### Why both Strapi action permissions and policies?

Action permissions provide a static role gate. Policies handle dynamic facts
such as “this Instructor owns this course” and “this Student is enrolled.”
Together they prevent broad access and object-level leaks.

### Why not trust Next.js route protection?

The browser and frontend can be bypassed. Next.js protection improves UX;
Strapi remains the final authority for every read and mutation.

### Why derive progress instead of storing 60%?

A saved percentage becomes incorrect if lesson count changes. Unique completion
facts are the source of truth, so the percentage is always recomputed.

### How is a double-click handled?

The service first searches by deterministic key, and the database has a unique
constraint for the race where two requests both search before either creates.
The losing request reads and returns the winner's record.

### How do you stop quiz cheating?

Student DTOs omit correct indexes. Submission accepts answers only. The service
reads correct indexes on the server and derives all score fields before saving.

### Why use both Document Service and Query Engine?

Document Service is the normal Strapi 5 content API and understands document
IDs plus Draft & Publish. Query Engine is used narrowly for relation ownership
checks and transactional dependent cleanup where database-level filtering is
clearer. Public outputs still use document IDs and explicit DTOs.

### What would you improve after the deadline?

Add pagination/filter limits, rate limiting on auth/quiz submission, email
verification and password reset UX, audit-log storage, media object storage,
database indexes verified with production query plans, and browser E2E tests.
