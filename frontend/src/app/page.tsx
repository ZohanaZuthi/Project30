const capabilities = [
  {
    title: "Learn in sequence",
    description:
      "Enroll in a course, move through ordered lessons, and keep completion progress across sessions.",
  },
  {
    title: "Practice with feedback",
    description:
      "Take course quizzes, receive an immediate server-graded score, and return to previous attempts.",
  },
  {
    title: "Manage with confidence",
    description:
      "Role and ownership checks protect courses, students, users, and editorial content at the API layer.",
  },
];

const roles = ["Student", "Instructor", "Content manager", "Admin"];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Project30 LMS home">
          <span className="brand-mark" aria-hidden="true">
            P30
          </span>
          <span>Project30 LMS</span>
        </a>
        <div className="header-note">Foundation ready · Day 1</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Learning that keeps moving</p>
          <h1>One focused place to teach, learn, and see progress.</h1>
          <p className="hero-description">
            A secure learning platform for structured courses, measurable
            progress, practical quizzes, and thoughtful content.
          </p>
          <div className="hero-actions">
            <span className="primary-action">Course catalog coming next</span>
            <a className="text-link" href="/api/health">
              Check system health <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="progress-card" aria-label="Example course progress">
          <div className="card-topline">
            <span>Course progress</span>
            <span className="status-dot">On track</span>
          </div>
          <div className="progress-number">60%</div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={60}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span />
          </div>
          <p>3 of 5 lessons complete</p>
          <ol className="lesson-preview">
            <li>
              <span className="lesson-state complete">✓</span>
              Foundations
            </li>
            <li>
              <span className="lesson-state active">2</span>
              Building the first feature
            </li>
            <li>
              <span className="lesson-state">3</span>
              Test your understanding
            </li>
          </ol>
        </div>
      </section>

      <section className="role-strip" aria-label="Supported user roles">
        <span className="role-label">Built for</span>
        {roles.map((role) => (
          <span className="role" key={role}>
            {role}
          </span>
        ))}
      </section>

      <section className="capabilities">
        <div className="section-heading">
          <p className="eyebrow">A complete learning loop</p>
          <h2>Content, participation, and proof of progress.</h2>
        </div>
        <div className="capability-grid">
          {capabilities.map((capability, index) => (
            <article className="capability-card" key={capability.title}>
              <span className="capability-index">0{index + 1}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>Next.js · Strapi · PostgreSQL</span>
        <span>Vercel + Railway</span>
      </footer>
    </main>
  );
}

