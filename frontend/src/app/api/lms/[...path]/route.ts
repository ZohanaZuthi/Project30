import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/auth/constants";
import { rejectCrossOrigin } from "@/lib/auth/http";
import { getStrapiUrl } from "@/lib/strapi";

const allowedRoots = new Set([
  "admin",
  "blog-posts",
  "courses",
  "manage",
  "my-courses",
  "my-quiz-attempts",
]);

async function forward(
  request: NextRequest,
  context: RouteContext<"/api/lms/[...path]">,
) {
  const { path } = await context.params;
  if (
    path.length === 0 ||
    !allowedRoots.has(path[0]) ||
    path.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json(
      { error: "Unsupported LMS path." },
      { status: 404 },
    );
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    const rejected = rejectCrossOrigin(request);
    if (rejected) return rejected;
  }

  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.text();
  const upstream = await fetch(
    `${getStrapiUrl()}/api/lms/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
    {
      method: request.method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body,
      cache: "no-store",
    },
  ).catch(() => null);

  if (!upstream) {
    return NextResponse.json(
      { error: "The LMS backend is unavailable." },
      { status: 503 },
    );
  }

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
