# Public frontend and demo-content guide

## What this slice solves

The first interface proved authentication and role security, but it looked like
an internal prototype. This slice makes the public side believable without
changing the security architecture:

- the home page explains the learning value before asking someone to register;
- the course catalog is loaded from Strapi, not hard-coded in the React page;
- each course has an image, useful metadata, curriculum, and preview lesson;
- the same design works at desktop, tablet, and mobile widths;
- all external media has a source and is listed on `/media-credits`.

The visual direction was informed by recurring patterns on Shikho, 10 Minute
School, Ostad, and Bohubrihi: a compact navigation bar, a strong Bangla-first
hero, trust numbers, category shortcuts, image-led course cards, learner and
lesson metadata, free previews, and direct calls to action. We used those common
product patterns, not their logos, code, text, or proprietary artwork.

## Data flow

```text
Browser request for /courses
        |
        v
Next.js Server Component
        |
        v
getPublicCourses() data-access function
        |  GET /api/lms/courses
        v
Strapi public course controller
        |
        v
PostgreSQL -> safe course DTO -> Next.js -> HTML
```

`frontend/src/lib/dal/public-courses.ts` is the boundary between UI and API. It
uses `cache: "no-store"` so newly published CMS content appears immediately and
returns a safe empty state if the backend is temporarily unavailable. Pages do
not know Strapi's base URL or response details.

`frontend/src/lib/course-presentation.ts` adds display-only metadata for the demo
catalog, such as ratings and category labels. Core facts—title, description,
thumbnail URL, lesson order, ownership, and publication state—remain in Strapi.
In a production iteration these presentation fields would become schema fields.

## Images and video

Course and hero images use free-to-use Pexels URLs. `next.config.ts` permits only
HTTPS images from `images.pexels.com/photos/**`; this is deliberately narrower
than allowing arbitrary remote hosts. `next/image` then supplies responsive
sizes and layout stability.

Preview videos are public YouTube lessons embedded through
`youtube-nocookie.com`. The iframe is responsive and lazy-loaded. A video URL is
also stored on the first lesson of every seeded course, which demonstrates the
actual Strapi lesson field rather than a decorative player only.

Do not download, scrape, or re-upload a competitor's course artwork. Publicly
visible does not mean reusable. Use licensed stock media, your own assets, or a
provider API and preserve attribution when its licence requires it.

## Demo seed

Run this while the normal Strapi development server is stopped:

```bash
npm run seed:demo
```

The root command first creates a fresh backend build and then delegates to
`backend/scripts/seed-demo.js`. The script boots Strapi programmatically, checks
stable course slugs and lesson positions, creates only missing records, publishes
the courses, then shuts Strapi down cleanly. It is idempotent: running it twice
still leaves four courses, 17 lessons, and four quizzes rather than duplicating
the catalog.

This is preferable to manually clicking demo data into the CMS because a reviewer
or a fresh Railway database can reproduce the same state. The normal backend
bootstrap still owns roles and permissions; the demo seed owns presentation data.

## Files to explain in the interview

- `backend/scripts/seed-demo.js`: repeatable demo content and relations.
- `frontend/src/lib/dal/public-courses.ts`: server-side Strapi request boundary.
- `frontend/src/lib/course-presentation.ts`: safe image fallback and UI metadata.
- `frontend/src/components/marketing/course-card.tsx`: reusable card rendering.
- `frontend/src/app/page.tsx`: composed landing-page sections.
- `frontend/src/app/courses/[documentId]/page.tsx`: dynamic route and 404 handling.
- `frontend/src/app/marketing.css`: responsive visual system and breakpoints.
- `frontend/next.config.ts`: strict remote image allow-list.

## Likely interview questions

**Why fetch courses in a Server Component?**

The browser receives useful HTML immediately, the Strapi URL stays behind a
small server-side data layer, and no client JavaScript is needed merely to render
the catalog. Interactive enrollment can be a separate Client Component.

**Why not store scraped images locally?**

Copyright and provenance matter. The demo uses source-linked, free-to-use Pexels
photos and a credits page. In production I would upload licensed files to
Strapi's media library and configure durable object storage such as S3 or
Cloudinary, because a Railway container filesystem is ephemeral.

**Why use a remote image allow-list?**

Next's optimizer fetches remote files on the server. Restricting protocol, host,
and path prevents arbitrary URLs from turning the application into an open image
proxy.

**Why is some metadata in a presentation map?**

It lets the UI be demonstrated without expanding this day's backend scope. It is
explicitly display-only. If category, duration, rating, or enrollment count must
be managed by staff, each belongs in Strapi and should be returned in the DTO.

**What happens when Strapi is down?**

The public list shows a useful empty state instead of crashing the entire home
page. A missing individual course returns a Next.js 404. Authenticated mutations
remain strict and surface errors; silently pretending a write succeeded would be
unsafe.

**How is authorization affected by the redesign?**

It is not weakened. Public pages only call published-course read endpoints.
Enrollment, lesson access, progress, quiz submission, content management, and
admin actions are still authorized by Strapi policies/controllers. Hidden UI is
only a convenience; the backend is the security boundary.

**What would you improve next?**

Move display metadata into Strapi, upload optimized owned artwork through the
media library, add catalog search/filtering with URL query parameters, make the
enrollment CTA session-aware, and measure Core Web Vitals with production data.
