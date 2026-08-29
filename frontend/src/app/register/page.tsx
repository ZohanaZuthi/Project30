import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "ফ্রি account তৈরি করুন" };

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" href="/">
          <span className="brand-mark">P30</span>
          <span>Project30 Academy</span>
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">আজই শেখা শুরু করুন</p>
          <h1>ফ্রি Student account খুলুন।</h1>
          <p>
            এক মিনিটেই account তৈরি করুন। আপনার course, lesson progress এবং
            quiz result নিরাপদে সংরক্ষিত থাকবে।
          </p>
        </div>
        <Suspense fallback={<p>ফর্ম প্রস্তুত হচ্ছে…</p>}>
          <AuthForm mode="register" />
        </Suspense>
      </section>
    </main>
  );
}
