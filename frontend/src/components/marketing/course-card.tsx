import Image from "next/image";
import Link from "next/link";

import { getCoursePresentation } from "@/lib/course-presentation";
import type { Course } from "@/lib/types";

export function CourseCard({ course, index = 0 }: { course: Course; index?: number }) {
  const view = getCoursePresentation(course, index);

  return (
    <article className="catalog-card">
      <Link className="catalog-card-link" href={`/courses/${course.documentId}`}>
        <span className="catalog-card-media">
          <Image
            src={view.image}
            alt={`${course.title} course cover`}
            fill
            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
          />
          <span className="course-badge">{view.badge}</span>
          <span className="play-chip" aria-label="Video lessons included">▶</span>
        </span>
        <span className="catalog-card-body">
          <span className="course-category">{view.category}</span>
          <h3>{course.title}</h3>
          <span className="course-mentor">Project30 Mentor Team</span>
          <span className="course-rating"><span>★ {view.rating}</span><span>({view.learners} learners)</span></span>
          <span className="course-meta-row">
            <span>◷ {view.duration}</span>
            <span>▤ {course.lessons.length} lessons</span>
          </span>
          <span className="course-card-footer">
            <span><small>Enrollment</small><strong>Free</strong></span>
            <b>বিস্তারিত দেখুন →</b>
          </span>
        </span>
      </Link>
    </article>
  );
}
