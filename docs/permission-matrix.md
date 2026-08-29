# Authorization matrix

The UI mirrors these permissions, but Strapi is the enforcement boundary.

| Action | Admin | Content manager | Instructor | Student |
| --- | --- | --- | --- | --- |
| Manage users and roles | All | No | No | No |
| Create courses | Yes | Yes | Yes, assigned to self | No |
| Edit/delete courses | All | All | Own only | No |
| Manage lessons/quizzes | All | All | Own courses only | No |
| View student progress | All | All | Own courses only | Own only |
| Manage blog posts | All | Own posts | No | No |
| Enroll in courses | No | No | No | Yes |
| View lesson content | All | All | Own courses | Enrolled courses |
| Take quizzes | No | No | No | Enrolled courses |

## Enforcement rules

### Registration

Public registration always creates a Student. A request body cannot select a
privileged role. Only an application Admin can promote a user later.
At bootstrap, each LMS role's `api::` action permissions are reconciled to this
version-controlled allow-list; stale or manually added application actions are
removed.

### Course ownership

An Instructor-created course is assigned to the authenticated Instructor on the
server. Supplied instructor IDs are ignored. An Instructor cannot reassign a
course or mutate another Instructor's course.

### Enrollment

The authenticated Student is always the enrollment owner. The client supplies
only a course document ID. `studentId:courseDocumentId` is stored as a unique
server-generated key to make enrollment idempotent.

### Lesson access and progress

A Student must be enrolled before lesson content or a completion mutation is
allowed. `studentId:lessonDocumentId` is unique, so repeated completion calls do
not inflate progress. Percentages are derived from completion facts rather than
trusted from the browser. The first lesson is unlocked; every later lesson
requires all earlier lessons to be complete. The backend enforces this rule for
both reads and completion writes, not only in the interface.

### Quiz security

Students receive question prompts and options through a safe custom response.
The generic Quiz endpoint is not granted to Students. Correct option indexes are
private and read only by the grading service. The backend derives the student,
score, and total; none are accepted from request input.

### Blog publishing

Public requests explicitly query published documents. A direct ID lookup cannot
reveal a draft. Content Managers manage their own authored posts; Admins manage
all posts.

### Admin safety

Role management accepts only the four application roles or an explicit role
removal. An unassigned user receives no private LMS permissions and is sent to
the account-status page. Blocking is a separate suspension state. The system
prevents demoting or blocking the last unblocked application Admin. PostgreSQL
serializes all Admin membership/status mutations with one transaction advisory
lock so two concurrent requests cannot both pass the safety count.

Permanent application-user deletion is not exposed. Admins can block an
account or remove its role while enrollment, progress, quiz-attempt, and author
relations remain available for audit and reporting. Role-less accounts can
still revoke their own refresh session through the dedicated logout endpoint.

## Negative tests required before submission

- Anonymous user requests enrolled lesson content.
- Student sends a direct course creation request.
- Student attempts to enroll another user.
- Student completes a lesson without enrollment.
- Student opens or completes lesson 3 before lessons 1 and 2.
- Course manager creates or moves two lessons to the same position.
- Instructor A edits Instructor B's course.
- Instructor sends a blog creation request.
- Content Manager sends a role-change request.
- Student requests a quiz payload and searches it for correct answers.
- Student supplies a forged score during quiz submission.
- Public user opens a known draft blog document ID.
- Content Manager requests the Admin user list or changes a role.
- Admin requests an invalid page size and receives `400`.
- Unassigned user logs out and the old refresh token cannot be reused.
