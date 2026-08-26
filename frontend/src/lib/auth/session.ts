import "server-only";

import type { NextResponse } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";

export type SessionTokens = {
  jwt: string;
  refreshToken: string;
};

const secure = process.env.NODE_ENV === "production";

const baseCookie = {
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
};

export function setSessionCookies(
  response: NextResponse,
  { jwt, refreshToken }: SessionTokens,
) {
  response.cookies.set(ACCESS_COOKIE, jwt, {
    ...baseCookie,
    maxAge: 24 * 60 * 60,
  });
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    ...baseCookie,
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...baseCookie, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...baseCookie, maxAge: 0 });
}
