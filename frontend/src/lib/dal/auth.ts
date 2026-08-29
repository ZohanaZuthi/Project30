import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ACCESS_COOKIE, type AppRole } from "../auth/constants";
import { strapiFetch } from "../strapi";
import type { AssignedUser, CurrentUser } from "../types";

const currentUserSchema = z.object({
  data: z.object({
    id: z.number(),
    documentId: z.string().optional(),
    username: z.string(),
    email: z.string(),
    role: z.object({ name: z.string(), type: z.string() }).nullable(),
  }),
});

export const getAccessToken = cache(async () => {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await strapiFetch("/api/lms/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Could not load the current user.");

  const parsed = currentUserSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("The user response was not valid.");

  return parsed.data.data as CurrentUser;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAssignedUser(): Promise<AssignedUser> {
  const user = await requireUser();
  if (!user.role) redirect("/no-role");
  return user as AssignedUser;
}

export async function requireRole(allowed: readonly AppRole[]) {
  const user = await requireAssignedUser();
  if (!allowed.includes(user.role.type)) redirect("/forbidden");
  return user;
}
