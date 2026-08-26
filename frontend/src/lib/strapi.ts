import "server-only";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

export function getStrapiUrl() {
  return (process.env.STRAPI_URL ?? DEFAULT_STRAPI_URL).replace(/\/$/, "");
}

export async function strapiFetch(
  path: `/api/${string}`,
  init: RequestInit = {},
) {
  try {
    return await fetch(`${getStrapiUrl()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    throw new Error(
      "Could not connect to Strapi. Verify STRAPI_URL and start the LMS backend.",
      { cause: error },
    );
  }
}

export async function getBackendHealth() {
  try {
    const response = await strapiFetch("/api/health", {
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
