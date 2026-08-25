import { getBackendHealth } from "@/lib/strapi";

export async function GET() {
  const backend = await getBackendHealth();

  return Response.json(
    {
      service: "project30-frontend",
      status: "ok",
      backend: backend.status,
      timestamp: new Date().toISOString(),
    },
    {
      status: backend.status === "connected" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

