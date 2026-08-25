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
trusted from the browser.

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
removal. The system prevents removing or demoting the final application Admin.

## Negative tests required before submission

- Anonymous user requests enrolled lesson content.
- Student sends a direct course creation request.
- Student attempts to enroll another user.
- Student completes a lesson without enrollment.
- Instructor A edits Instructor B's course.
- Instructor sends a blog creation request.
- Content Manager sends a role-change request.
- Student requests a quiz payload and searches it for correct answers.
- Student supplies a forged score during quiz submission.
- Public user opens a known draft blog document ID.
