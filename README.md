# Project30

Project30 is a role-secured Learning Management System built as a Next.js
frontend and a self-hosted Strapi modular monolith backed by PostgreSQL.

## Completed so far (27 August 2026)

- Next.js 16 App Router frontend in `frontend/`
- Strapi 5 backend in `backend/`
- PostgreSQL development service in `compose.yaml`
- Railway health/build configuration in `backend/railway.json`
- Version-controlled course, lesson, enrollment, progress, quiz, attempt, and
  blog schemas
- Reproducible Student, Instructor, Content Manager, and Admin application roles
- Student-only public registration and refresh-token sessions behind a Next.js
  `HttpOnly` cookie boundary
- Authenticated role-aware dashboard and optimistic route protection
- Public published-course read API
- Admin/Content Manager platform-wide course access and Instructor ownership
  enforcement in Strapi policies
- Course draft/publish/create/edit/delete and ordered lesson create/edit/delete
  screens
- Complete Student journey: enroll, separate My Courses library, sequential
  lessons, persistent progress, auto-graded quizzes, and attempt history
- Instructor/Content Manager quiz CRUD plus student-progress views, restricted
  to the courses each role is allowed to manage
- Blog workspace with draft/publish/edit/delete controls and public
  published-only list and article pages
- Dedicated Admin dashboard with platform statistics, user role/status controls,
  and access to every course and blog post
- Responsive role-aware navigation, loading, empty, pending, success, and error
  states across all workflows
- Responsive Bangladesh-focused public home page, Strapi-backed course catalog,
  course detail/curriculum pages, and privacy-enhanced lesson previews
- Idempotent demo seed with four realistic courses, 17 lessons, four quizzes,
  free-to-use Pexels photography, and public Bangla tutorial embeds
- Complete Strapi APIs for enrollment, persistent progress, server-graded
  quizzes and attempt history, draft/published blogs, and Admin users/stats
- Transactional course cleanup, strict request allow-lists, safe DTOs, and
  reproducible action permissions plus ownership/enrollment policies
- 19 backend unit assertions and 10 real Strapi/Supertest API scenarios using an
  isolated test database
- Architecture, authorization, and deployment notes in `docs/`

## Run locally

Requirements: Node.js 20+, npm, and Docker with Docker Compose.

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm --prefix backend install
npm --prefix frontend install
```

Replace the placeholder Strapi secrets in `backend/.env`, then seed the catalog
before starting Strapi. The seed command builds the backend first and is safe to
run more than once because it looks up each record before creating it:

```bash
npm run seed:demo
```

For a repeatable four-role walkthrough, set one local-only password while
seeding (minimum eight characters):

```bash
DEMO_USER_PASSWORD='choose-a-local-password' npm run seed:demo
```

This creates these application accounts, all using that password:

| Email                        | LMS role        |
| ---------------------------- | --------------- |
| `student@project30.local`    | Student         |
| `instructor@project30.local` | Instructor      |
| `manager@project30.local`    | Content Manager |
| `admin@project30.local`      | Admin           |

Do not configure `DEMO_USER_PASSWORD` in a public or production environment.

Then run the apps in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://localhost:3000`
- Strapi admin: `http://localhost:1337/admin`
- Backend health: `http://localhost:1337/api/health`
- Combined frontend health: `http://localhost:3000/api/health`
- Public course catalog: `http://localhost:3000/courses`
- Student learning area: `http://localhost:3000/learn`
- Published blog: `http://localhost:3000/blog`
- LMS Admin dashboard: `http://localhost:3000/admin`
- Third-party media credits: `http://localhost:3000/media-credits`

Public registration always creates a Student. Use the LMS Admin screen to
promote application users after the first Admin exists. For initial local setup,
use the optional demo accounts above or assign the first application Admin from
Strapi's Content Manager. The Strapi CMS administrator is a separate identity
from an LMS application Admin.

Verification commands:

```bash
npm test
npm run lint
npm run build
```

See [`docs/backend-implementation-guide.md`](docs/backend-implementation-guide.md)
for the endpoint-by-endpoint code tour, request flows, test strategy, security
reasoning, and interview questions. The earlier authentication/course slice is
documented in [`docs/day-02-auth-and-content.md`](docs/day-02-auth-and-content.md).
The UI research, media choices, data flow, and likely frontend interview questions
are documented in [`docs/frontend-experience-guide.md`](docs/frontend-experience-guide.md).
The exact four-role demonstration path, API calls, backend checks, and interview
explanations are in [`docs/role-flow-walkthrough.md`](docs/role-flow-walkthrough.md).

The long-form implementation plan follows below.

You can build a strong submission in five days if you treat security and complete workflows as the product. Use Strapi 5, Next.js App Router with TypeScript, PostgreSQL from the beginning, and deploy a working skeleton on day one.

The most important architectural decision: Next.js controls the interface and session experience, but Strapi must make every final authorization decision.

## 1. Recommended architecture

```text
Browser
   │
   │ Forms / navigation
   ▼
Next.js on Vercel
   ├── Public pages
   ├── Role-specific dashboards
   ├── Server-side data-access layer
   └── Route handlers storing JWT in an HttpOnly cookie
                │
                │ Authorization: Bearer <JWT>
                ▼
Strapi 5 on Railway
   ├── Authentication
   ├── Roles and permissions
   ├── Custom policies
   ├── Controllers and services
   └── PostgreSQL
```

Use a monorepo:

```text
lms/
├── frontend/                # Next.js
├── backend/                 # Strapi
├── docs/
│   ├── architecture.md
│   ├── permission-matrix.md
│   └── decisions.md
├── README.md
└── .gitignore
```

Why this architecture is strong:

- Strapi owns the database and business rules.
- Next.js never connects directly to PostgreSQL.
- The JWT can remain in a secure `HttpOnly` cookie rather than `localStorage`.
- Next.js route protection improves UX, but Strapi policies stop actual unauthorized operations.
- Business logic lives in Strapi services and can be demonstrated clearly in the video.

Next.js recommends centralizing authorization and safe data fetching in a server-side data-access layer, and warns that every mutation endpoint must independently authenticate and authorize its caller. [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication) and [data-security guidance](https://nextjs.org/docs/app/guides/data-security) are worth reading before implementation.

## 2. Important role decision

Do not let a person choose “Admin” or “Instructor” during public registration.

Use this workflow:

1. Every new registration receives the Student role.
2. An application Admin can promote the user to Instructor, Content Manager, or Admin.
3. Only an Admin endpoint can modify roles.
4. Prevent the last Admin from removing or demoting themselves.

Otherwise, anyone could register as an Admin and take over the platform.

Also understand that these are two different concepts in Strapi:

- Strapi administrator: logs into Railway’s `/admin` CMS interface.
- LMS application Admin: logs into your Next.js application and is stored through Strapi’s Users & Permissions plugin.

Your dedicated LMS admin dashboard must be built in Next.js. Do not present the default Strapi CMS dashboard as the required admin panel.

## 3. Data model

Keep the model small and relational.

| Collection     | Important fields                                              |
| -------------- | ------------------------------------------------------------- |
| User           | username, email, password, role                               |
| Course         | title, slug, description, thumbnailUrl, instructor, published |
| Lesson         | title, content, videoUrl, position, course                    |
| Enrollment     | student, course, enrolledAt, uniqueKey                        |
| LessonProgress | student, lesson, completedAt, uniqueKey                       |
| Quiz           | title, course, questions                                      |
| QuizAttempt    | student, quiz, answers, score, total, submittedAt             |
| BlogPost       | title, slug, body, coverImageUrl, author, draft/published     |

Relations:

```text
User (instructor) 1 ─── * Course
Course            1 ─── * Lesson
Course            1 ─── * Enrollment * ─── 1 User (student)
Lesson            1 ─── * LessonProgress * ─── 1 User
Course            1 ─── * Quiz
Quiz              1 ─── * QuizAttempt * ─── 1 User
User              1 ─── * BlogPost
```

### Questions

A simple Strapi repeatable component can contain:

```text
question
options: JSON array of strings
correctOption: integer
```

The standard quiz API must never be available to students because it would expose `correctOption`.

Instead, provide a custom “take quiz” endpoint that returns:

```json
{
  "documentId": "quiz-id",
  "title": "JavaScript Basics",
  "questions": [
    {
      "question": "Which value is falsy?",
      "options": ["{}", "[]", "0", "\"hello\""]
    }
  ]
}
```

Only the submit endpoint reads `correctOption` internally.

### Uniqueness

Strapi does not automatically give you every composite uniqueness constraint you need. Generate server-controlled unique strings:

```text
Enrollment.uniqueKey = studentId:courseDocumentId
LessonProgress.uniqueKey = studentId:lessonDocumentId
```

Mark them unique. This prevents duplicate enrollments and duplicate completion rows, including rapid double-clicks.

## 4. Backend structure

Suggested Strapi organization:

```text
backend/src/
├── api/
│   ├── course/
│   ├── lesson/
│   ├── enrollment/
│   ├── lesson-progress/
│   ├── quiz/
│   ├── quiz-attempt/
│   ├── blog-post/
│   └── platform/
├── policies/
│   ├── is-admin.ts
│   ├── can-manage-course.ts
│   ├── can-view-course-progress.ts
│   └── can-manage-blog.ts
├── utils/
│   ├── authorization.ts
│   └── validation.ts
└── index.ts                 # role/permission/bootstrap logic
```

Responsibilities:

- Route: declares the URL and attached policies.
- Policy: answers “may this user perform this action?”
- Controller: validates the request and creates the HTTP response.
- Service: performs enrollment, progress, grading, deletion, or statistics logic.
- Document Service: reads and writes Strapi records.

Strapi 5 supports custom routes, controllers, services, policies, and the Document Service API. [Strapi 5 documentation](https://docs.strapi.io/)

Avoid relying entirely on permissions configured manually through the local Strapi dashboard. Those settings are database records and may not automatically appear in a fresh Railway database. Add reproducible bootstrap or seed logic for:

- Student
- Instructor
- Content Manager
- Admin
- Their route permissions
- Optional demo accounts/data

Make the bootstrap idempotent so restarting Strapi does not create duplicates.

## 5. Authorization rules

Create centralized authorization helpers instead of scattering role comparisons everywhere.

Conceptually:

```ts
isAdmin(user);
isContentManager(user);
isInstructor(user);
isStudent(user);

canManageAnyCourse(user);
canManageCourse(user, course);
canViewCourseProgress(user, course);
canManageBlogPost(user, post);
```

`canManageCourse` should mean:

```text
Admin                    → yes
Content Manager          → yes
Instructor + owns course → yes
Everyone else            → no
```

Instructor ownership must be checked using the course loaded from the database. Never accept `ownerId` from the frontend as proof of ownership.

When an Instructor creates a course:

- Assign the authenticated instructor on the server.
- Ignore any instructor ID supplied by the request.
- Do not allow them to change ownership.

For every restricted action:

1. Confirm a valid authenticated user.
2. Load the target record.
3. inspect the role.
4. Check ownership/enrollment when required.
5. Validate allowed input fields.
6. Perform the operation.

Use consistent responses:

- `401`: no valid login.
- `403`: logged in but insufficient permission.
- `404`: record does not exist.
- `409`: already enrolled or other conflict.
- `400`: invalid request.

Disable generated content API routes that you do not need. Expose controlled custom routes instead of accidentally giving Students generic create/update/delete access.

## 6. Core API design

A clean custom API could look like this:

```text
Authentication
POST   /api/auth/local
POST   /api/auth/local/register
GET    /api/users/me

Courses
GET    /api/courses/available
GET    /api/courses/:documentId
POST   /api/courses
PUT    /api/courses/:documentId
DELETE /api/courses/:documentId

Lessons
GET    /api/courses/:documentId/lessons
POST   /api/courses/:documentId/lessons
PUT    /api/lessons/:documentId
DELETE /api/lessons/:documentId

Student learning
POST   /api/courses/:documentId/enroll
GET    /api/me/courses
POST   /api/lessons/:documentId/complete
GET    /api/courses/:documentId/my-progress

Quizzes
GET    /api/quizzes/:documentId/take
POST   /api/quizzes/:documentId/submit
GET    /api/quizzes/:documentId/my-attempts

Course progress
GET    /api/courses/:documentId/students

Blog
GET    /api/blog/posts
GET    /api/blog/posts/:slug
POST   /api/blog/posts
PUT    /api/blog/posts/:documentId
DELETE /api/blog/posts/:documentId
POST   /api/blog/posts/:documentId/publish
POST   /api/blog/posts/:documentId/unpublish

Admin
GET    /api/admin/stats
GET    /api/admin/users
PUT    /api/admin/users/:id/role
```

Public course responses should contain summaries. Lesson content should only be returned to an enrolled Student or authorized staff member.

## 7. Progress logic

Do not store `progressPercentage` as the source of truth.

Store individual lesson completions and calculate:

```ts
percentage =
  totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
```

A completion request should:

1. Authenticate the Student.
2. Load the lesson and its course.
3. Confirm the Student has an Enrollment for that course.
4. Look for an existing completion record.
5. Return the existing result if already completed.
6. Otherwise create a LessonProgress record.
7. Recount completed lessons and total lessons.
8. Return the new percentage.

This is accurate after refresh because completion records are stored in PostgreSQL. It also handles a new lesson being added later: the calculated percentage decreases appropriately.

Other edge cases:

- Zero lessons means 0%, not division by zero.
- Count distinct completed lessons.
- Deleted lessons must not remain in the denominator.
- Students cannot submit completion for someone else.
- Students cannot complete lessons in unenrolled courses.

This is an excellent feature to explain line by line in the walkthrough.

## 8. Quiz grading logic

The browser should submit only answer indexes:

```json
{
  "answers": [2, 0, 3]
}
```

The backend:

1. Authenticates the Student.
2. Checks enrollment.
3. Loads the quiz including correct answers.
4. Validates the number and range of submitted answers.
5. Compares submitted indexes with stored correct indexes.
6. Calculates the score.
7. Stores an immutable QuizAttempt.
8. Returns the score.

Conceptually:

```ts
const score = questions.reduce((points, question, index) => {
  return points + (answers[index] === question.correctOption ? 1 : 0);
}, 0);
```

Never accept these from the client:

```text
score
total
studentId
correctAnswers
```

Derive all of them on the backend.

Allow multiple attempts and display attempt history unless you deliberately choose one attempt. Document that choice in `docs/decisions.md`.

## 9. Blog design

Enable Strapi Draft & Publish for BlogPost.

Rules:

- Public and Students only receive published posts.
- Content Managers create posts with themselves assigned as author.
- Content Managers manage only their own posts.
- Admins manage every post.
- A draft is never returned simply because someone knows its document ID.
- Publish/unpublish must be authorized backend operations.

This gives you a clean video demonstration:

```text
Content Manager creates draft
        ↓
Public blog does not show it
        ↓
Content Manager publishes it
        ↓
Public blog now shows it
```

Using image URLs is a sensible scope decision. Railway’s filesystem is ephemeral unless a volume or object storage is configured, while the brief explicitly permits cover image URLs. [Railway’s Strapi deployment guide](https://docs.railway.com/guides/strapi)

## 10. Frontend pages

Keep one visual system and change navigation/actions by role.

```text
Public
/
├── /courses
├── /courses/[slug]
├── /blog
├── /blog/[slug]
├── /login
└── /register

Student
/dashboard
├── /my-courses
├── /learn/[courseId]/[lessonId]
├── /quiz/[quizId]
└── /quiz/[quizId]/results

Instructor / Content Manager
/dashboard/manage/courses
├── /new
├── /[courseId]/edit
├── /[courseId]/lessons
├── /[courseId]/quizzes
└── /[courseId]/students

Content Manager
/dashboard/manage/blog

Admin
/dashboard/admin
├── /users
├── /courses
├── /blogs
└── /stats
```

Use:

- Server Components for initial reads.
- Client Components only for interactive forms, quiz state, and lesson completion.
- A small server-side API client.
- Loading and error states.
- Form validation on both frontend and backend.
- Route redirection for UX, followed by real Strapi authorization.

Do not spend significant time on animations, certificates, payments, chat, email verification, or custom video uploads.

## 11. Knowledge to learn for each part

| Part                        | Learn                                     | You understand it when you can explain                      |
| --------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| HTTP                        | methods, headers, status codes, JSON      | Why a forbidden update returns 403                          |
| Authentication              | password login, JWT, cookies              | How the JWT reaches Strapi                                  |
| Authorization               | RBAC, ownership, IDOR                     | Why Instructor A cannot edit Instructor B’s course          |
| Database                    | relations and uniqueness                  | Why progress needs Student + Lesson                         |
| Strapi content types        | collections, components, relations        | How Course and Lesson records are connected                 |
| Strapi backend              | routes, policies, controllers, services   | Which layer checks permission and which calculates progress |
| Strapi Document Service     | find, create, update, delete              | How records are loaded and persisted                        |
| Next.js App Router          | layouts, pages, dynamic routes            | How `/learn/[courseId]/[lessonId]` works                    |
| Server vs Client Components | execution location and serialization      | Why the quiz form needs client state                        |
| Security                    | input validation and information leakage  | Why correct quiz answers never reach the browser            |
| Deployment                  | environment variables, CORS, PostgreSQL   | How Vercel securely reaches Railway                         |
| Testing                     | positive and negative authorization cases | How you prove a Student cannot create a course              |

Use a learning loop for each feature:

1. Read the relevant documentation for 30–45 minutes.
2. Build the smallest version.
3. Test it from the API directly.
4. Explain the request and data flow aloud without looking at notes.
5. Write a short decision note.

That last step protects you during the walkthrough.

## 12. Five-day execution plan

### August 25 — foundation and deployment

- Confirm the deadline timezone with the organizer.
- Create the monorepo and initial commits.
- Scaffold Next.js and Strapi 5 with TypeScript.
- Configure PostgreSQL.
- Deploy empty frontend to Vercel.
- Deploy empty backend and PostgreSQL to Railway.
- Configure CORS and environment variables.
- Create the data model.
- Write the permission matrix and architectural decisions.

End-of-day proof: both live URLs work and Next.js can fetch a health endpoint from Strapi.

### August 26 — authentication, roles, courses and lessons

- Registration defaults to Student.
- Login/logout with HttpOnly JWT cookie.
- Add server-side `currentUser` retrieval.
- Bootstrap the four roles.
- Build reusable authorization helpers and policies.
- Implement course and lesson CRUD.
- Test Instructor ownership with two separate instructors.
- Build basic management pages.

End-of-day proof: Instructor A cannot modify Instructor B’s course even with a direct API request.

### August 27 — complete Student flow

- Public course browsing.
- Enrollment with duplicate protection.
- My Courses.
- Ordered lesson viewer.
- Previous/next lesson navigation.
- Mark complete.
- Persist and calculate progress.
- Display course-level progress.

End-of-day proof: register → enroll → complete lessons → refresh → progress remains accurate.

### August 28 — quizzes

- Quiz editor for authorized staff.
- Safe student quiz endpoint.
- Server-side auto-grading.
- Persist QuizAttempt.
- Result and attempt-history UI.
- Test malformed answers and correct-answer leakage.

End-of-day proof: the browser network response never contains `correctOption`, but submission immediately returns a stored score.

### August 29 — admin and blog

- Admin stats.
- User list and role changes.
- Last-admin/self-lockout protection.
- Admin management of courses, lessons, and posts.
- Content Manager blog authoring.
- Draft/publish flow.
- Public blog list and details.
- Polish role-aware navigation and responsive layout.

End-of-day proof: an Admin promotes a Student to Instructor, and the user receives the new access after signing in again or refreshing their current user data.

### August 30 — hardening and submission

Morning:

- Run the complete permission test matrix.
- Test production, not only localhost.
- Seed stable demo accounts and content.
- Fix empty, loading, error, and unauthorized states.
- Check Railway restart persistence.
- Check Vercel production environment variables.

Afternoon:

- Finish README.
- Add screenshots and architecture explanation.
- Rehearse the video twice.
- Record a 9–9.5 minute walkthrough.
- Verify all links in an incognito browser.
- Submit several hours before closing.

Railway documents the PostgreSQL and Strapi variables required in production. [Railway Strapi setup](https://docs.railway.com/guides/strapi). Vercel environment-variable changes only affect new deployments, so redeploy after changing them. [Vercel environment variables](https://vercel.com/docs/environment-variables)

## 13. Permission test matrix

Create these test users:

```text
admin@example.com
manager@example.com
instructor-a@example.com
instructor-b@example.com
student-a@example.com
student-b@example.com
```

At minimum verify:

- Logged-out user cannot access lesson content.
- Student cannot create a course through direct API calls.
- Student cannot enroll another student.
- Student cannot complete a lesson before enrolling.
- Student A cannot view Student B’s attempts or progress.
- Instructor A cannot edit Instructor B’s course.
- Instructor cannot create blog posts.
- Content Manager can manage every course.
- Content Manager cannot manage users.
- Content Manager cannot edit another manager’s post if using author ownership.
- Admin can manage all content.
- Draft blog is absent from public list and direct public lookup.
- Quiz taking response contains no correct answers.
- Submitted score cannot be forged.
- Duplicate enrollment does not create two records.
- Duplicate lesson completion does not inflate progress.

Perform these with the browser and with Postman, Bruno, Insomnia, or `curl`. Hiding a button is not an authorization test.

## 14. Video structure

Aim for approximately 9 minutes:

```text
0:00–0:40  Architecture and roles
0:40–2:15  Student: enroll, lesson, progress, quiz
2:15–3:40  Instructor: own course, lesson, quiz, progress
3:40–4:30  Content Manager: course and blog draft/publish
4:30–5:20  Admin: stats and user role change
5:20–6:20  One frontend → Strapi → PostgreSQL data flow
6:20–7:20  Backend authorization policy
7:20–8:15  Progress logic line by line
8:15–9:00  Quiz grading and correct-answer protection
9:00–9:30  Vercel, Railway, PostgreSQL and environment variables
```

Do not spend the video slowly clicking through every page. Spend meaningful time showing the backend code because that is where your submission can stand out.

## 15. Commit strategy

Use understandable feature commits:

```text
chore: scaffold Next.js and Strapi applications
chore: configure PostgreSQL and deployment
feat(auth): add registration and secure login session
feat(rbac): bootstrap roles and authorization policies
feat(courses): implement ownership-aware course CRUD
feat(lessons): add ordered lesson management
feat(enrollment): add student enrollment and my courses
feat(progress): persist lesson completion and calculate progress
feat(quiz): add secure auto-grading and attempt history
feat(blog): add author ownership and draft publishing
feat(admin): add statistics and role management
test(rbac): cover role and ownership permissions
docs: add setup, architecture and completed features
```

Commit after each genuine working unit. Do not manufacture dozens of meaningless commits at the end.

## Final priorities

If time becomes tight, prioritize in this order:

1. Backend role and ownership enforcement.
2. Complete Student journey.
3. Persistent progress.
4. Secure quiz grading.
5. Admin role management.
6. Blog draft/publish.
7. Deployment reliability.
8. UI polish.

The four details most likely to distinguish your submission are:

- New users cannot self-register as privileged roles.
- Instructor ownership is checked by Strapi on every relevant request.
- Correct quiz answers never reach the Student’s browser.
- Progress is derived from persistent, unique completion records rather than a client-controlled percentage.
