import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { rejectCrossOrigin } from "@/lib/auth/http";
import { REFRESH_COOKIE } from "@/lib/auth/constants";
import {
  clearSessionCookies,
  setSessionCookies,
  type SessionTokens,
} from "@/lib/auth/session";
import { strapiFetch } from "@/lib/strapi";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;

  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ error: "No session." }, { status: 401 });

  const upstream = await strapiFetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!upstream.ok) {
    const response = NextResponse.json({ error: "Session expired." }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const tokens = (await upstream.json()) as SessionTokens;
  if (!tokens.jwt || !tokens.refreshToken) {
    const invalid = NextResponse.json(
      { error: "Invalid session response." },
      { status: 502 },
    );
    clearSessionCookies(invalid);
    return invalid;
  }
  const response = NextResponse.json({ ok: true });
  setSessionCookies(response, tokens);
  return response;
}
