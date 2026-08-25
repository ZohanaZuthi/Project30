import "server-only";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

function getStrapiUrl() {
  return (process.env.STRAPI_URL ?? DEFAULT_STRAPI_URL).replace(/\/$/, "");
}

export async function getBackendHealth() {
  try {
    const response = await fetch(`${getStrapiUrl()}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      return { status: "unavailable" as const };
    }

    return { status: "connected" as const };
  } catch {
    return { status: "unavailable" as const };
  }
}
