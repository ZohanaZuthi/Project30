import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/dashboard/logout-button";
import { requireUser } from "@/lib/dal/auth";

export default async function NoRolePage() {
  const user = await requireUser();
  if (user.role) redirect("/dashboard");

  return (
    <main className="message-page">
      <div>
        <p className="eyebrow">Account awaiting access</p>
        <h1>Your account does not have an assigned role.</h1>
        <p>
          You are signed in as {user.email}, but no LMS workspace is currently
          available. Contact a platform Admin if you need a role assigned.
        </p>
        <LogoutButton />
      </div>
    </main>
  );
}
