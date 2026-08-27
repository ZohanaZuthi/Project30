import type { ManagedProgress } from "@/lib/types";

import { ProgressMeter } from "../learning/progress-meter";

export function CourseProgressPanel({
  records,
}: {
  records: ManagedProgress[];
}) {
  return (
    <section className="lesson-manager course-progress-panel">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Learner analytics</p>
          <h2>Student progress</h2>
        </div>
        <span className="count-badge">{records.length} enrolled</span>
      </div>
      {records.length ? (
        <div className="student-progress-list">
          {records.map(({ student, progress }) => (
            <article key={student.documentId}>
              <div className="student-avatar">
                {student.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="student-identity">
                <strong>{student.username}</strong>
                <span>{student.email}</span>
              </div>
              <ProgressMeter
                compact
                completed={progress.completedLessons}
                percentage={progress.percentage}
                total={progress.totalLessons}
              />
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          No students have enrolled in this course yet.
        </p>
      )}
    </section>
  );
}
