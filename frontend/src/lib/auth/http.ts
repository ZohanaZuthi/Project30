import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(40),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export function rejectCrossOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host");
  const requestProtocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    request.nextUrl.protocol.replace(":", "");

  try {
    const originUrl = new URL(origin);
    if (
      !requestHost ||
      originUrl.host !== requestHost ||
      originUrl.protocol !== `${requestProtocol}:`
    ) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
}

export async function readUpstreamError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };
    return payload.error?.message ?? payload.message ?? "The request failed.";
  } catch {
    return "The service is temporarily unavailable.";
  }
}

export function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the submitted fields.";
}

export function backendUnavailableResponse() {
  return NextResponse.json(
    {
      error:
        "The learning service is unavailable. Start the LMS Strapi backend and try again.",
    },
    { status: 503 },
  );
}
