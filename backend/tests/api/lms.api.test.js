const request = require("supertest");
const { setupStrapi, cleanupStrapi } = require("../strapi");

jest.setTimeout(60_000);

let app;
let instructorToken;
let otherInstructorToken;
let managerToken;
let adminToken;
let adminUser;
let studentToken;
let student;
let course;
let lesson;
let secondLesson;
let quiz;
let draftPost;

async function role(type) {
  return strapi.db
    .query("plugin::users-permissions.role")
    .findOne({ where: { type } });
}

async function createUser(username, roleType) {
  const assignedRole = await role(roleType);
  const created = await strapi
    .plugin("users-permissions")
    .service("user")
    .add({
      username,
      email: `${username}@example.test`,
      password: "Pass1234!",
      provider: "local",
      confirmed: true,
      blocked: false,
      role: assignedRole.id,
    });
  return created;
}

async function login(identifier) {
  const response = await request(app)
    .post("/api/auth/local")
    .send({ identifier: `${identifier}@example.test`, password: "Pass1234!" });
  if (response.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }
  return response.body.jwt ?? response.body.accessToken;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const instance = await setupStrapi();
  app = instance.server.httpServer;
  const seededUsers = [
    await createUser("instructor_a", "instructor"),
    await createUser("instructor_b", "instructor"),
    await createUser("content_manager", "content_manager"),
    await createUser("admin_user", "admin"),
  ];
  adminUser = seededUsers[3];
  instructorToken = await login("instructor_a");
  otherInstructorToken = await login("instructor_b");
  managerToken = await login("content_manager");
  adminToken = await login("admin_user");
});

afterAll(cleanupStrapi);

describe("LMS API integration", () => {
  test("health is public and management routes require authentication", async () => {
    await request(app).get("/api/health").expect(200);
    await request(app).get("/api/lms/me").expect(401);
    await request(app).get("/api/lms/manage/courses").expect(403);
  });

  test("authenticated identity includes the application role", async () => {
    const response = await request(app)
      .get("/api/lms/me")
      .set(auth(instructorToken))
      .expect(200);
    expect(response.body.data.role.type).toBe("instructor");
  });

  test("public registration always creates a Student", async () => {
    await request(app)
      .post("/api/auth/local/register")
      .send({
        username: "student_one",
        email: "student_one@example.test",
        password: "Pass1234!",
        role: "admin",
      })
      .expect(400);
    const response = await request(app)
      .post("/api/auth/local/register")
      .send({
        username: "student_one",
        email: "student_one@example.test",
        password: "Pass1234!",
      })
      .expect(200);
    studentToken = response.body.jwt ?? response.body.accessToken;
    student = await strapi.db.query("plugin::users-permissions.user").findOne({
      where: { email: "student_one@example.test" },
      populate: { role: true },
    });
    expect(student.role.type).toBe("student");
  });

  test("student cannot create courses; instructor can create an owned course", async () => {
    const payload = {
      title: "Backend Security",
      description: "Learn server-side authorization.",
      publish: true,
    };
    await request(app)
      .post("/api/lms/manage/courses")
      .set(auth(studentToken))
      .send(payload)
      .expect(403);
    const response = await request(app)
      .post("/api/lms/manage/courses")
      .set(auth(instructorToken))
      .send(payload)
      .expect(201);
    course = response.body.data;
    expect(course.instructor.username).toBe("instructor_a");
    expect(course.publishedAt).toBeTruthy();
    const catalog = await request(app).get("/api/lms/courses").expect(200);
    expect(
      catalog.body.data.some(
        ({ documentId }) => documentId === course.documentId,
      ),
    ).toBe(true);
  });

  test("another instructor cannot edit the course", async () => {
    await request(app)
      .put(`/api/lms/manage/courses/${course.documentId}`)
      .set(auth(otherInstructorToken))
      .send({ title: "Stolen course" })
      .expect(403);
  });

  test("owner creates ordered lessons and enrollment is idempotent", async () => {
    const lessonResponse = await request(app)
      .post(`/api/lms/manage/courses/${course.documentId}/lessons`)
      .set(auth(instructorToken))
      .send({
        title: "Policies first",
        content: "Authorize on the server.",
        position: 1,
      })
      .expect(201);
    lesson = lessonResponse.body.data;

    const secondLessonResponse = await request(app)
      .post(`/api/lms/manage/courses/${course.documentId}/lessons`)
      .set(auth(instructorToken))
      .send({
        title: "Data ownership",
        content: "Keep student records scoped to the authenticated user.",
        position: 2,
      })
      .expect(201);
    secondLesson = secondLessonResponse.body.data;

    await request(app)
      .post(`/api/lms/manage/courses/${course.documentId}/lessons`)
      .set(auth(instructorToken))
      .send({ title: "Duplicate order", content: "Invalid.", position: 2 })
      .expect(400);

    const first = await request(app)
      .post(`/api/lms/courses/${course.documentId}/enroll`)
      .set(auth(studentToken))
      .expect(201);
    const second = await request(app)
      .post(`/api/lms/courses/${course.documentId}/enroll`)
      .set(auth(studentToken))
      .expect(201);
    expect(first.body.data.alreadyEnrolled).toBe(false);
    expect(second.body.data.alreadyEnrolled).toBe(true);
    expect(second.body.data.documentId).toBe(first.body.data.documentId);

    const myCourses = await request(app)
      .get('/api/lms/my-courses')
      .set(auth(studentToken))
      .expect(200);
    expect(myCourses.body.data).toHaveLength(1);
    expect(myCourses.body.data[0].progress).toMatchObject({
      totalSteps: 2,
      completedSteps: 0,
      totalLessons: 2,
      completedLessons: 0,
      percentage: 0,
    });
    expect(myCourses.body.data[0].progress.lessons).toEqual([
      expect.objectContaining({
        documentId: lesson.documentId,
        completed: false,
        locked: false,
      }),
      expect.objectContaining({
        documentId: secondLesson.documentId,
        completed: false,
        locked: true,
      }),
    ]);
  });

  test("students cannot view or complete lessons out of sequence", async () => {
    const viewPath = `/api/lms/my-courses/${course.documentId}/lessons/${secondLesson.documentId}`;
    const completePath = `${viewPath}/complete`;
    await request(app).get(viewPath).set(auth(studentToken)).expect(403);
    await request(app).put(completePath).set(auth(studentToken)).expect(403);

    await request(app)
      .put(`/api/lms/manage/lessons/${lesson.documentId}`)
      .set(auth(instructorToken))
      .send({ position: 2 })
      .expect(400);
  });

  test("completion persists and cannot be counted twice", async () => {
    const path = `/api/lms/my-courses/${course.documentId}/lessons/${lesson.documentId}/complete`;
    const first = await request(app).put(path).set(auth(studentToken));
    if (first.status !== 200) throw new Error(JSON.stringify(first.body));
    const second = await request(app)
      .put(path)
      .set(auth(studentToken))
      .expect(200);
    expect(first.body.data.progress).toMatchObject({
      totalSteps: 2,
      completedSteps: 1,
      totalLessons: 2,
      completedLessons: 1,
      percentage: 50,
    });
    expect(second.body.data.alreadyCompleted).toBe(true);
    expect(second.body.data.progress.completedLessons).toBe(1);
  });

  test("the next lesson unlocks and lesson deletion cleans its progress", async () => {
    const lessonPath = `/api/lms/my-courses/${course.documentId}/lessons/${secondLesson.documentId}`;
    await request(app).get(lessonPath).set(auth(studentToken)).expect(200);
    const completion = await request(app)
      .put(`${lessonPath}/complete`)
      .set(auth(studentToken))
      .expect(200);
    expect(completion.body.data.progress).toMatchObject({
      totalSteps: 2,
      completedSteps: 2,
      totalLessons: 2,
      completedLessons: 2,
      percentage: 100,
    });
    const progressRecord = await strapi.db
      .query("api::lesson-progress.lesson-progress")
      .findOne({
        where: {
          student: { id: student.id },
          lesson: { documentId: secondLesson.documentId },
        },
        select: ["id"],
      });
    expect(progressRecord).toBeTruthy();

    await request(app)
      .delete(`/api/lms/manage/lessons/${secondLesson.documentId}`)
      .set(auth(instructorToken))
      .expect(200);
    expect(
      await strapi.db.query("api::lesson-progress.lesson-progress").findOne({
        where: { id: progressRecord.id },
      }),
    ).toBeNull();
    const progress = await request(app)
      .get(`/api/lms/my-courses/${course.documentId}/progress`)
      .set(auth(studentToken))
      .expect(200);
    expect(progress.body.data).toMatchObject({
      totalSteps: 1,
      completedSteps: 1,
      totalLessons: 1,
      completedLessons: 1,
      percentage: 100,
    });
  });

  test("quiz answers stay private and grading rejects forged scores", async () => {
    const finalLesson = (
      await request(app)
        .post(`/api/lms/manage/courses/${course.documentId}/lessons`)
        .set(auth(instructorToken))
        .send({
          title: "Secure delivery",
          content: "Apply the authorization rules in production.",
          position: 3,
        })
        .expect(201)
    ).body.data;

    await request(app)
      .post(`/api/lms/manage/courses/${course.documentId}/quizzes`)
      .set(auth(instructorToken))
      .send({
        title: "Conflicting step",
        position: 1,
        questions: [
          { prompt: "Will this save?", options: ["No", "Yes"], correctOption: 0 },
        ],
      })
      .expect(400);

    const created = await request(app)
      .post(`/api/lms/manage/courses/${course.documentId}/quizzes`)
      .set(auth(instructorToken))
      .send({
        title: "Authorization quiz",
        position: 2,
        questions: [
          {
            prompt: "Where must access be enforced?",
            options: ["UI", "Backend"],
            correctOption: 1,
          },
          {
            prompt: "Who can enroll?",
            options: ["Student", "Instructor"],
            correctOption: 0,
          },
        ],
      })
      .expect(201);
    quiz = created.body.data;
    expect(quiz.questions[0].correctOption).toBe(1);

    await request(app)
      .post(`/api/lms/manage/courses/${course.documentId}/lessons`)
      .set(auth(instructorToken))
      .send({
        title: "Also conflicting",
        content: "A lesson cannot occupy a quiz position.",
        position: 2,
      })
      .expect(400);

    const followUpQuiz = (
      await request(app)
        .post(`/api/lms/manage/courses/${course.documentId}/quizzes`)
        .set(auth(instructorToken))
        .send({
          title: "Final knowledge check",
          position: 4,
          questions: [
            {
              prompt: "Which layer is the final authorization boundary?",
              options: ["Frontend", "Backend"],
              correctOption: 1,
            },
          ],
        })
        .expect(201)
    ).body.data;

    const studentQuizList = await request(app)
      .get(`/api/lms/my-courses/${course.documentId}/quizzes`)
      .set(auth(studentToken))
      .expect(200);
    expect(studentQuizList.body.data).toEqual([
      expect.objectContaining({
        documentId: quiz.documentId,
        position: 2,
        questionCount: 2,
      }),
      expect.objectContaining({
        documentId: followUpQuiz.documentId,
        position: 4,
        questionCount: 1,
      }),
    ]);
    expect(studentQuizList.body.data[0]).not.toHaveProperty("questions");

    const studentView = await request(app)
      .get(
        `/api/lms/my-courses/${course.documentId}/quizzes/${quiz.documentId}`,
      )
      .set(auth(studentToken));
    if (studentView.status !== 200)
      throw new Error(JSON.stringify(studentView.body));
    expect(studentView.body.data.questions[0]).not.toHaveProperty(
      "correctOption",
    );
    await request(app)
      .get(
        `/api/lms/my-courses/${course.documentId}/lessons/${finalLesson.documentId}`,
      )
      .set(auth(studentToken))
      .expect(403);
    await request(app)
      .get(
        `/api/lms/my-courses/${course.documentId}/quizzes/${followUpQuiz.documentId}`,
      )
      .set(auth(studentToken))
      .expect(403);

    await request(app)
      .post(
        `/api/lms/my-courses/${course.documentId}/quizzes/${quiz.documentId}/attempts`,
      )
      .set(auth(studentToken))
      .send({ answers: [1, 1], score: 2 })
      .expect(400);

    for (const answers of [[], [1], [1, 1, 0], [1, 99]]) {
      await request(app)
        .post(
          `/api/lms/my-courses/${course.documentId}/quizzes/${quiz.documentId}/attempts`,
        )
        .set(auth(studentToken))
        .send({ answers })
        .expect(400);
    }

    const attempt = await request(app)
      .post(
        `/api/lms/my-courses/${course.documentId}/quizzes/${quiz.documentId}/attempts`,
      )
      .set(auth(studentToken))
      .send({ answers: [1, 1] })
      .expect(201);
    expect(attempt.body.data).toMatchObject({
      score: 1,
      total: 2,
      percentage: 50,
    });

    await request(app)
      .get(
        `/api/lms/my-courses/${course.documentId}/quizzes/${followUpQuiz.documentId}`,
      )
      .set(auth(studentToken))
      .expect(403);
    await request(app)
      .get(
        `/api/lms/my-courses/${course.documentId}/lessons/${finalLesson.documentId}`,
      )
      .set(auth(studentToken))
      .expect(200);
    await request(app)
      .put(
        `/api/lms/my-courses/${course.documentId}/lessons/${finalLesson.documentId}/complete`,
      )
      .set(auth(studentToken))
      .expect(200);

    await request(app)
      .get(
        `/api/lms/my-courses/${course.documentId}/quizzes/${followUpQuiz.documentId}`,
      )
      .set(auth(studentToken))
      .expect(200);
    await request(app)
      .post(
        `/api/lms/my-courses/${course.documentId}/quizzes/${followUpQuiz.documentId}/attempts`,
      )
      .set(auth(studentToken))
      .send({ answers: [1] })
      .expect(201);

    const progress = await request(app)
      .get(`/api/lms/my-courses/${course.documentId}/progress`)
      .set(auth(studentToken))
      .expect(200);
    expect(progress.body.data).toMatchObject({
      totalSteps: 4,
      completedSteps: 4,
      totalLessons: 2,
      completedLessons: 2,
      totalQuizzes: 2,
      completedQuizzes: 2,
      percentage: 100,
    });
    expect(progress.body.data.steps.map(({ kind }) => kind)).toEqual([
      "lesson",
      "quiz",
      "lesson",
      "quiz",
    ]);

    const history = await request(app)
      .get("/api/lms/my-quiz-attempts")
      .set(auth(studentToken))
      .expect(200);
    expect(history.body.data).toHaveLength(2);
  });

  test("draft blog is private until its author publishes it", async () => {
    const created = await request(app)
      .post("/api/lms/manage/blog-posts")
      .set(auth(managerToken))
      .send({
        title: "Policy design",
        body: "Keep authorization close to data.",
      })
      .expect(201);
    draftPost = created.body.data;
    expect(draftPost.publishedAt).toBeNull();

    const before = await request(app).get("/api/lms/blog-posts").expect(200);
    expect(before.body.data).toHaveLength(0);

    const published = await request(app)
      .put(`/api/lms/manage/blog-posts/${draftPost.documentId}`)
      .set(auth(managerToken))
      .send({ publish: true })
      .expect(200);
    expect(published.body.data.publishedAt).toBeTruthy();
    const after = await request(app).get("/api/lms/blog-posts").expect(200);
    expect(after.body.data).toHaveLength(1);

    const unpublished = await request(app)
      .put(`/api/lms/manage/blog-posts/${draftPost.documentId}`)
      .set(auth(managerToken))
      .send({ publish: false })
      .expect(200);
    expect(unpublished.body.data.publishedAt).toBeNull();
    const hiddenAgain = await request(app)
      .get("/api/lms/blog-posts")
      .expect(200);
    expect(hiddenAgain.body.data).toHaveLength(0);
  });

  test("only admin can manage roles and view platform stats", async () => {
    await request(app)
      .patch(`/api/lms/admin/users/${student.documentId}/role`)
      .set(auth(managerToken))
      .send({ role: "instructor" })
      .expect(403);
    const updated = await request(app)
      .patch(`/api/lms/admin/users/${student.documentId}/role`)
      .set(auth(adminToken))
      .send({ role: "student" })
      .expect(200);
    expect(updated.body.data.role.type).toBe("student");
    const stats = await request(app)
      .get("/api/lms/admin/stats")
      .set(auth(adminToken))
      .expect(200);
    expect(stats.body.data).toMatchObject({
      totalCourses: 1,
      totalEnrollments: 1,
    });
    expect(stats.body.data.totalUsers).toBe(
      await strapi.db.query("plugin::users-permissions.user").count({}),
    );

    const users = await request(app)
      .get("/api/lms/admin/users?page=1&pageSize=2")
      .set(auth(adminToken))
      .expect(200);
    expect(users.body.data).toHaveLength(2);
    expect(users.body.meta).toMatchObject({ page: 1, pageSize: 2 });
    expect(users.body.meta.total).toBe(stats.body.data.totalUsers);
    await request(app)
      .get("/api/lms/admin/users?page=1&pageSize=101")
      .set(auth(adminToken))
      .expect(400);

    await request(app)
      .delete(`/api/lms/admin/users/${student.documentId}`)
      .set(auth(adminToken))
      .expect(405);
  });

  test("the last active Admin is protected and unassigned users remain visible", async () => {
    const demotePath = `/api/lms/admin/users/${adminUser.documentId}/role`;

    await request(app)
      .patch(demotePath)
      .set(auth(adminToken))
      .send({ role: null })
      .expect(400);

    const backupAdmin = await createUser("backup_admin", "admin");
    await strapi.db.query("plugin::users-permissions.user").update({
      where: { id: backupAdmin.id },
      data: { blocked: true },
    });

    // A blocked Admin cannot receive control of the platform.
    await request(app)
      .patch(demotePath)
      .set(auth(adminToken))
      .send({ role: "student" })
      .expect(400);

    await strapi.db.query("plugin::users-permissions.user").update({
      where: { id: backupAdmin.id },
      data: { blocked: false },
    });
    const backupAdminToken = await login("backup_admin");

    const demoted = await request(app)
      .patch(demotePath)
      .set(auth(adminToken))
      .send({ role: null })
      .expect(200);
    expect(demoted.body.data.role).toBeNull();

    const unassignedIdentity = await request(app)
      .get("/api/lms/me")
      .set(auth(adminToken))
      .expect(200);
    expect(unassignedIdentity.body.data.role).toBeNull();
    await request(app)
      .get("/api/lms/manage/courses")
      .set(auth(adminToken))
      .expect(401);

    const stats = await request(app)
      .get("/api/lms/admin/stats")
      .set(auth(backupAdminToken))
      .expect(200);
    expect(stats.body.data.totalUsers).toBe(
      await strapi.db.query("plugin::users-permissions.user").count({}),
    );
    expect(stats.body.data.usersByRole.unassigned).toBe(1);

  });
});
