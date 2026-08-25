# Architecture

## System shape

Project30 uses a separate frontend and backend. The Strapi backend is a modular
monolith: its domain modules deploy in one process and use one PostgreSQL
database.

```text
Browser
  |
  | HTTPS
  v
Next.js (Vercel)
  |  server-rendered pages and a small browser-facing API layer
  |  Authorization: Bearer <Strapi JWT>
  v
Strapi (Railway)
  |  authentication, authorization, validation, business logic
  v
PostgreSQL (Railway)
```

No message broker is required. Requests that enroll a student, complete a
lesson, grade a quiz, or publish a post are short synchronous operations.

## Responsibilities

### Next.js

- Renders public and role-specific pages.
- Keeps the Strapi JWT in an HttpOnly, Secure, SameSite cookie.
- Uses Server Components to read directly from Strapi when rendering.
- Uses Route Handlers for browser-initiated mutations and session cookie work.
- Performs optimistic route checks for user experience only.
- Never connects to PostgreSQL and never makes the final permission decision.

### Strapi

- Authenticates application users through Users & Permissions.
- Makes every final role, ownership, and enrollment decision.
- Validates allowed input fields instead of accepting arbitrary request data.
- Calculates progress and grades quizzes on the server.
- Returns minimal response shapes and never sends quiz answers to students.
- Persists domain records through the Document Service API.

### PostgreSQL

- Stores users, content, ownership, enrollment, completion, and quiz attempts.
- Enforces unique enrollment and lesson-completion keys.
- Is the only source of persisted application state.

## Backend modules

```text
backend/src/api/
  course/             course content and instructor ownership
  lesson/             ordered course content
  enrollment/         student-to-course membership
  lesson-progress/    persistent completion facts
  quiz/               questions and server-only answers
  quiz-attempt/       immutable graded submissions
  blog-post/          authored draft/published content
  health/             deployment readiness endpoint
```

Each domain follows the same direction:

```text
route -> authentication -> policy -> controller -> service -> database
```

Policies answer whether the current user may act. Controllers translate HTTP
input/output. Services contain reusable business rules. Tomorrow's RBAC work
will replace unrestricted core mutations with ownership-aware custom paths.

## Main relationships

```text
User (instructor) 1 --- * Course
Course            1 --- * Lesson
Course            1 --- * Enrollment * --- 1 User (student)
Lesson            1 --- * LessonProgress * --- 1 User (student)
Course            1 --- * Quiz
Quiz              1 --- * QuizAttempt * --- 1 User (student)
User (author)      1 --- * BlogPost
```

Strapi 5 `documentId` values are the public identifiers used in URLs. Internal
numeric database IDs are not treated as stable public identifiers.

## Deployment boundaries

- Vercel project root: `frontend`
- Railway Strapi service root: `backend`
- Railway PostgreSQL: separate database service in the same Railway project
- Browser-to-Next traffic: same-origin
- Next-to-Strapi traffic: public HTTPS Railway domain
- Strapi-to-PostgreSQL traffic: Railway private service variables
