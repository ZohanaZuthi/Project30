import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" href="/">
          <span className="brand-mark">P30</span>
          <span>Project30 Academy</span>
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">Start learning</p>
          <h1>Create your account.</h1>
          <p>Public registration securely creates a Student account. Privileged roles are assigned only by an Admin.</p>
        </div>
        <Suspense fallback={<p>Loading form…</p>}>
          <AuthForm mode="register" />
        </Suspense>
      </section>
    </main>
  );
}
