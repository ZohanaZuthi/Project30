# Engineering decisions

These decisions are intentionally recorded so the implementation and video can
explain tradeoffs rather than present accidental behavior.

## ADR-001: Self-host Strapi on Railway

**Decision:** Deploy the repository's Strapi application to Railway and use a
Railway PostgreSQL service. Do not use Strapi Cloud.

**Reason:** The project mandates Railway hosting and requires custom backend
policies, controllers, and services to be reviewable in GitHub.

## ADR-002: Modular monolith without a broker

**Decision:** Keep LMS domains as modules inside one Strapi application and use
direct service calls. Do not add NATS, Kafka, RabbitMQ, or Redis.

**Reason:** The required operations are synchronous and small. A broker would
add deployment and consistency failure modes without solving a requirement.

## ADR-003: Public registration creates Students only

**Decision:** New public accounts always receive the Student role. Admins perform
all promotions.

**Reason:** Allowing self-selected roles would permit privilege escalation.

## ADR-004: Strapi is the authorization boundary

**Decision:** Next.js may redirect or hide actions, but every protected Strapi
route independently checks authentication, role, ownership, and enrollment.

**Reason:** Browser UI controls can be bypassed with direct HTTP requests.

## ADR-005: JWT stored in an HttpOnly cookie

**Decision:** Next.js login Route Handlers will exchange credentials with Strapi
and store its JWT in an HttpOnly, Secure, SameSite cookie.

**Reason:** Browser JavaScript cannot read an HttpOnly cookie, reducing token
exposure during an XSS incident. Next.js will forward the token to Strapi on
authorized requests.

## ADR-006: Progress is derived

**Decision:** Store one unique completion fact per student and lesson; calculate
the percentage from current course lessons on every progress read.

**Reason:** A stored percentage becomes stale when lessons are added or removed.
Derived progress remains explainable and accurate.

## ADR-007: Quiz answers are server-only

**Decision:** Correct option indexes exist in Strapi but are private. Students
use custom take/submit endpoints and may have multiple immutable attempts.

**Reason:** Generic content responses could leak answers, and client-computed
scores are forgeable. Multiple attempts also make stored results useful later.

## ADR-008: URL-based images for this scope

**Decision:** Store course thumbnails and blog covers as URLs.

**Reason:** The specification permits URLs, while local Railway files are
ephemeral without a volume or object-storage provider. This keeps the deadline
focused on access control and learning workflows.

## ADR-009: Content Manager blog ownership

**Decision:** A Content Manager manages posts they authored; an Admin manages
all posts.

**Reason:** This is the least-privilege reading of the brief's statement that a
Content Manager manages posts they can create, while it explicitly grants Admin
control over others' posts.
