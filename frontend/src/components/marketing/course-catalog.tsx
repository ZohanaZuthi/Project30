"use client";

import { useState } from "react";

import { getCoursePresentation } from "@/lib/course-presentation";
import type { Course } from "@/lib/types";

import { CourseCard } from "./course-card";

const filters = ["All", "Development", "Design", "Marketing", "Data"] as const;

export function CourseCatalog({ courses }: { courses: Course[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const visibleCourses = courses.filter((course, index) => {
    if (activeFilter === "All") return true;
    return getCoursePresentation(course, index).category.includes(activeFilter);
  });

  return (
    <>
      <section className="catalog-toolbar" aria-label="Filter courses">
        <div>
          {filters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter}
              className={activeFilter === filter ? "active" : undefined}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter === "All" ? "সব কোর্স" : filter}
            </button>
          ))}
        </div>
        <span>{visibleCourses.length} courses available</span>
      </section>
      <section className="catalog-page-grid" aria-live="polite">
        {visibleCourses.map((course) => (
          <CourseCard course={course} key={course.documentId} />
        ))}
      </section>
    </>
  );
}
