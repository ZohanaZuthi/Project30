import "server-only";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

export function getStrapiUrl() {
  return (process.env.STRAPI_URL ?? DEFAULT_STRAPI_URL).replace(/\/$/, "");
}

export async function strapiFetch(
  path: `/api/${string}`,
  init: RequestInit = {},
) {
  return fetch(`${getStrapiUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });
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
