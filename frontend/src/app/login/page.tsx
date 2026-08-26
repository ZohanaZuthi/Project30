import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" href="/">
          <span className="brand-mark">P30</span>
          <span>Project30 Academy</span>
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">Welcome back</p>
          <h1>Continue your work.</h1>
          <p>Use your LMS account. Access changes according to your assigned role.</p>
        </div>
        <Suspense fallback={<p>Loading form…</p>}>
          <AuthForm mode="login" />
        </Suspense>
      </section>
    </main>
  );
}
