import { NextRequest, NextResponse } from "next/server";

import {
  backendUnavailableResponse,
  readUpstreamError,
  registerSchema,
  rejectCrossOrigin,
  validationMessage,
} from "@/lib/auth/http";
import { setSessionCookies, type SessionTokens } from "@/lib/auth/session";
import { strapiFetch } from "@/lib/strapi";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: validationMessage(parsed.error) },
      { status: 400 },
    );
  }

  // No role is forwarded. Strapi's server-side default is always Student.
  const upstream = await strapiFetch("/api/auth/local/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) return backendUnavailableResponse();

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

  const response = NextResponse.json({ ok: true }, { status: 201 });
  setSessionCookies(response, tokens);
  return response;
}
