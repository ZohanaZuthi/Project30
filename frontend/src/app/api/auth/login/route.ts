import { NextRequest, NextResponse } from "next/server";

import {
  loginSchema,
  readUpstreamError,
  rejectCrossOrigin,
  validationMessage,
} from "@/lib/auth/http";
import { setSessionCookies, type SessionTokens } from "@/lib/auth/session";
import { strapiFetch } from "@/lib/strapi";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: validationMessage(parsed.error) },
      { status: 400 },
    );
  }

  const upstream = await strapiFetch("/api/auth/local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: await readUpstreamError(upstream) },
      { status: upstream.status },
    );
  }

  const tokens = (await upstream.json()) as SessionTokens;
  if (!tokens.jwt || !tokens.refreshToken) {
    return NextResponse.json({ error: "Invalid session response." }, { status: 502 });
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookies(response, tokens);
  return response;
}
