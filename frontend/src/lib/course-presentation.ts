import type { Course } from "./types";

const fallbackImages = [
  "https://images.pexels.com/photos/5926382/pexels-photo-5926382.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/4443182/pexels-photo-4443182.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/1181359/pexels-photo-1181359.jpeg?auto=compress&cs=tinysrgb&w=1400",
] as const;

const presentationBySlug: Record<
  string,
  {
    category: string;
    level: string;
    duration: string;
    rating: string;
    learners: string;
    badge: string;
    previewVideoId: string;
  }
> = {
  "nextjs-full-stack-bangla": {
    category: "Web Development",
    level: "Beginner to intermediate",
    duration: "18 hours",
    rating: "4.9",
    learners: "1.8k",
    badge: "Bestseller",
    previewVideoId: "NgrljB7UU34",
  },
  "ui-ux-figma-bangla": {
    category: "Product Design",
    level: "Beginner friendly",
    duration: "12 hours",
    rating: "4.8",
    learners: "920",
    badge: "Portfolio track",
    previewVideoId: "Ed1ineovwzg",
  },
  "digital-marketing-growth-bangla": {
    category: "Business & Marketing",
    level: "Beginner friendly",
    duration: "10 hours",
    rating: "4.8",
    learners: "1.2k",
    badge: "Career skill",
    previewVideoId: "uNNcfiqNajg",
  },
  "python-data-analysis-bangla": {
    category: "Data & Analytics",
    level: "Beginner to intermediate",
    duration: "16 hours",
    rating: "4.9",
    learners: "1.5k",
    badge: "Project based",
    previewVideoId: "1mLmW0sTzjw",
  },
};

export function getSafeCourseImage(course: Course, index = 0) {
  if (course.thumbnailUrl) {
    try {
      const url = new URL(course.thumbnailUrl);
      if (url.protocol === "https:" && url.hostname === "images.pexels.com") {
        return course.thumbnailUrl;
      }
    } catch {
      // Invalid or untrusted image URLs fall back to an approved media host.
    }
  }
  return fallbackImages[index % fallbackImages.length];
}

export function getCoursePresentation(course: Course, index = 0) {
  const defaultPresentation = {
    category: "Professional skills",
    level: "All levels",
    duration: `${Math.max(course.lessons.length * 2, 4)} hours`,
    rating: "4.8",
    learners: "New",
    badge: "New course",
    previewVideoId: "NgrljB7UU34",
  };

  return {
    ...(presentationBySlug[course.slug] ?? defaultPresentation),
    image: getSafeCourseImage(course, index),
  };
}
