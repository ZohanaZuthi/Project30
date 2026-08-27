import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/auth/constants";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(ACCESS_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/learn/:path*",
    "/manage/:path*",
    "/quiz-attempts/:path*",
  ],
};
