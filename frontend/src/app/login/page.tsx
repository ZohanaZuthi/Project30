import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "লগ ইন" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" href="/">
          <span className="brand-mark">P30</span>
          <span>Project30 Academy</span>
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">আবারও স্বাগতম</p>
          <h1>শেখা চালিয়ে যান।</h1>
          <p>
            আপনার ইমেইল বা username দিয়ে লগ ইন করুন। আপনি যেখানে থেমেছিলেন,
            সেখান থেকেই আবার শুরু করতে পারবেন।
          </p>
        </div>
        <Suspense fallback={<p>ফর্ম প্রস্তুত হচ্ছে…</p>}>
          <AuthForm mode="login" />
        </Suspense>
      </section>
    </main>
  );
}
