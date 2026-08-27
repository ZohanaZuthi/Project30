const request = require("supertest");
const { setupStrapi, cleanupStrapi } = require("../strapi");

jest.setTimeout(60_000);

let app;
let instructorToken;
let otherInstructorToken;
let managerToken;
let adminToken;
let studentToken;
let student;
let course;
let lesson;
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
  await Promise.all([
    createUser("instructor_a", "instructor"),
    createUser("instructor_b", "instructor"),
    createUser("content_manager", "content_manager"),
    createUser("admin_user", "admin"),
  ]);
  [instructorToken, otherInstructorToken, managerToken, adminToken] =
    await Promise.all([
      login("instructor_a"),
      login("instructor_b"),
      login("content_manager"),
      login("admin_user"),
    ]);
});

afterAll(cleanupStrapi);

describe("LMS API integration", () => {
  test("health is public and management routes require authentication", async () => {
    await request(app).get("/api/health").expect(200);
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

  test("owner creates a lesson and enrollment is idempotent", async () => {
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
      totalLessons: 1,
      completedLessons: 1,
      percentage: 100,
    });
    expect(second.body.data.alreadyCompleted).toBe(true);
    expect(second.body.data.progress.completedLessons).toBe(1);
  });

  test("quiz answers stay private and grading rejects forged scores", async () => {
    const created = await request(app)
      .post(`/api/lms/manage/courses/${course.documentId}/quizzes`)
      .set(auth(instructorToken))
      .send({
        title: "Authorization quiz",
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
      .post(
        `/api/lms/my-courses/${course.documentId}/quizzes/${quiz.documentId}/attempts`,
      )
      .set(auth(studentToken))
      .send({ answers: [1, 1], score: 2 })
      .expect(400);

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
  });
});
