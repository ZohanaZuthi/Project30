# Day 2: authentication, RBAC, courses, and lessons

Date: 26 August 2026

## Outcome

Today establishes the security boundary used by every later LMS feature. A user
can register or log in, reach a role-aware dashboard, and—if their role allows
it—create, edit, publish, or delete courses and manage their ordered lessons.

The completed slice is intentionally end to end:

```text
Browser form
  -> Next.js Route Handler (session cookie / same-origin boundary)
  -> Strapi route (authentication)
  -> Strapi role or ownership policy
  -> controller (Zod allow-list validation)
  -> service (business rule and safe DTO)
  -> Strapi Document Service
  -> PostgreSQL
```

Hiding a button is not treated as security. The corresponding Strapi route
rejects a direct request from the wrong user even if they bypass Next.js.

## What was implemented

### 1. Reproducible application roles

`backend/src/index.ts` runs an idempotent bootstrap at every backend startup. It
finds or creates four Users & Permissions roles with stable types:

```text
student
instructor
content_manager
admin
```

It also configures `student` as the public registration default and migrates
users left on Strapi's old `authenticated` role. Idempotent means restarting the
server does not create duplicate roles.

Why stable role types matter: display names can change, but authorization code
must compare predictable machine values.

### 2. Student-only registration

The register form sends only `username`, `email`, and `password`. The Next.js
Route Handler validates those fields and does not forward a `role`. Strapi is
also configured with an empty `allowedFields` registration extension and sets
the default role on the server.

This prevents the privilege-escalation request:

```json
{
  "username": "attacker",
  "email": "attacker@example.com",
  "password": "password123",
  "role": "admin"
}
```

The browser cannot choose a privileged role, and extra fields are not trusted.

### 3. Session design

Strapi Users & Permissions is the identity provider and issues an access token
plus a rotating refresh token. Next.js receives them server to server and writes
both as first-party cookies with these properties:

- `HttpOnly`: browser JavaScript cannot read the token.
- `Secure` in production: the browser sends it only over HTTPS.
- `SameSite=Lax`: reduces cross-site request exposure.
- `Path=/`: the application session applies to all routes.

The token is not stored in `localStorage`. Browser mutations go to same-origin
Next.js Route Handlers, which read the cookie on the server and forward the
access token as `Authorization: Bearer ...` to Strapi.

There are four session endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Logout attempts to revoke the Strapi session and always clears the local
cookies, even if Strapi is temporarily unreachable.

### 4. Next.js protection layers

`frontend/src/proxy.ts` performs an optimistic cookie-presence redirect for
`/dashboard` and `/manage`. This improves navigation but is not trusted as the
authorization boundary because a cookie can be stale or forged.

`frontend/src/lib/dal/auth.ts` is the server-only Data Access Layer. It asks the
custom Strapi `/api/lms/me` endpoint for a minimal user DTO and exposes:

- `getCurrentUser()`
- `requireUser()`
- `requireRole()`

Pages use these helpers before reading protected data. Mutations are still
independently checked inside Strapi.

### 5. Course and lesson authorization

The unrestricted generated Course and Lesson routers were replaced by explicit
custom routes. This matters because leaving generic mutations exposed can undo
all ownership checks in custom endpoints.

The important policies are:

- `is-course-manager`: only Admin, Content Manager, or Instructor can create or
  list managed courses.
- `can-manage-course`: Admin and Content Manager may manage any course;
  Instructor must match `course.instructor.id`.
- `can-manage-lesson`: loads the lesson's course and applies the same ownership
  decision.

Instructor ownership is assigned from `ctx.state.user` in the service. The
request body cannot supply or reassign `instructor`, so an Instructor cannot
create a course for somebody else or steal ownership.

The public course endpoints explicitly ask the Document Service for
`status: "published"`. Drafts are never returned by a public document-ID lookup.

### 6. Validation and safe responses

Controllers parse strict Zod schemas. Strict schemas are allow-lists: unknown
properties such as `instructor`, `publishedAt`, or arbitrary database fields
cause validation failure rather than being passed to Strapi.

Document Service returns unsanitized internal records, so services deliberately
map records to small DTOs. Passwords, user emails, internal numeric relation
IDs, and unrelated fields are never returned by the course endpoints.

Strapi 5 `documentId` is used in URLs. It is stable across draft and published
versions; numeric database IDs are used only for internal ownership comparison.

## Follow one request through the code

Example: Instructor edits a course.

1. `CourseForm` sends `PUT /api/lms/manage/courses/:documentId`.
2. The catch-all Next.js Route Handler accepts only fixed LMS path roots,
   rejects a mismatched `Origin`, reads the access cookie, and forwards JSON.
3. Strapi authenticates the Bearer token and places the user in
   `ctx.state.user`.
4. `can-manage-course` loads the requested course with its Instructor relation.
5. `canManageCourse` returns true only for platform-wide roles or the matching
   Instructor ID. A false result ends the request with 403 before the controller.
6. The controller parses only editable fields with `courseUpdateSchema`.
7. The service updates the draft through `strapi.documents(...).update()` and
   publishes or unpublishes according to the validated flag.
8. The service returns a deliberately shaped course DTO to the form.

This is the data-flow feature to demonstrate in the walkthrough because it
shows frontend, authentication, authorization, validation, persistence, and
response shaping in one short path.

## How to verify the slice manually

1. Start PostgreSQL, Strapi, and Next.js using the README commands.
2. Register a normal account. Confirm the dashboard says Student.
3. Try `POST /api/lms/manage/courses` while signed in as that Student. It must
   return 403, even if the JSON is valid.
4. In Strapi Content Manager, change that application user's role to Instructor.
5. Log in again so the new access token/session resolves the updated role.
6. Create an Instructor course and add, edit, and delete a lesson.
7. Create a second Instructor. Copy the first course document ID and attempt a
   direct update as the second Instructor. It must return 403.
8. Assign Content Manager and confirm the same course can be managed.
9. Uncheck Publish and confirm the public `/api/lms/courses/:documentId` request
   returns 404; publish and confirm it becomes visible.

Automated checks:

```bash
npm test       # ownership decision unit tests
npm run lint   # Next.js ESLint rules
npm run build  # production builds for Next.js and Strapi
```

## Interview questions and concise answers

### Why not store the JWT in localStorage?

JavaScript can read localStorage, so an XSS bug can directly extract the token.
An HttpOnly cookie is not readable by JavaScript. It does not eliminate XSS or
CSRF, which is why SameSite cookies and same-origin mutation checks are also
used.

### Is `proxy.ts` your authorization system?

No. It performs only an optimistic cookie-presence check for UX. The Data Access
Layer protects server-rendered reads, and every Strapi mutation independently
authenticates and applies a role/ownership policy.

### Authentication versus authorization?

Authentication answers “who is calling?” Strapi validates the token and builds
`ctx.state.user`. Authorization answers “may that user do this?” Policies check
the role and requested resource ownership.

### Why does public registration create only Students?

Allowing the request to select Instructor, Content Manager, or Admin is a direct
privilege-escalation vulnerability. Promotions belong to the Admin workflow.

### Why compare role `type`, not role `name`?

`type` is the stable machine identifier. `name` is display text and may be
renamed or vary in capitalization.

### Why is ownership checked with a server-loaded course?

The client is untrusted. Accepting an owner ID from the request would let the
caller forge it. The policy loads the actual persisted relation and compares it
with the authenticated user.

### Why both policy and filtered list query?

The policy protects a particular mutation. Filtering the Instructor's list at
the database query avoids leaking other Instructors' course metadata and avoids
fetching data that will be discarded.

### Why custom routes instead of Strapi's generated CRUD routes?

The ownership rules and safe DTOs are application-specific. Explicit routes
make the allowed surface reviewable and avoid a parallel generic mutation path
that might bypass them.

### Why controller, service, and policy separately?

The policy makes the access decision, the controller owns HTTP validation and
response status, and the service owns reusable business/persistence behavior.
This separation makes each part testable and easier to explain.

### Why use Document Service instead of Entity Service?

Document Service is Strapi 5's recommended backend API. It uses stable
`documentId` values and understands Draft & Publish. Entity Service is the older
Strapi 4 API.

### Why manually create DTOs after Document Service?

Document Service returns unsanitized data and may include private fields.
Explicit DTOs are an output allow-list and keep responses stable as schemas
grow.

### How do draft and publish work during an update?

The editable draft is updated. A true publish flag publishes that draft; a false
flag invokes unpublish so the public API no longer returns it. Public reads
always request published status explicitly.

### What happens when two lessons use the same position?

They are still valid records and are sorted by position. A later improvement
could enforce unique `(course, position)` or implement transactional reordering.
For this scope, position is an explicit ordering hint rather than a unique key.

### What is tested today?

Pure authorization tests cover staff creation, platform-wide Admin/Content
Manager access, Instructor ownership, cross-Instructor denial, Student denial,
and anonymous denial. Production TypeScript builds also verify the framework
contracts. HTTP integration tests are the next testing layer once the local
PostgreSQL service is running.

### Is this a microservice system?

No. Strapi is a modular monolith: course, lesson, enrollment, progress, quiz,
and blog are domain modules in one deployable process and one PostgreSQL
database. Next.js is a separate frontend deployment, not a domain microservice.
No broker is needed for these short synchronous workflows.

## Sources followed

- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security)
- [Next.js cookies API](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Next.js Proxy guide](https://nextjs.org/docs/app/getting-started/proxy)
- [Strapi policies](https://docs.strapi.io/cms/backend-customization/policies)
- [Strapi Document Service API](https://docs.strapi.io/cms/api/document-service)
- [Strapi relations](https://docs.strapi.io/cms/api/rest/relations)
