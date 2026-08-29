"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type Mode = "login" | "register";

function banglaError(message?: string) {
  const value = message?.toLowerCase() ?? "";
  if (value.includes("invalid identifier") || value.includes("invalid credentials"))
    return "ইমেইল/username অথবা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।";
  if (value.includes("already taken") || value.includes("already exists"))
    return "এই ইমেইল বা username দিয়ে ইতিমধ্যে account তৈরি করা হয়েছে।";
  if (value.includes("blocked"))
    return "এই account-টি সাময়িকভাবে বন্ধ আছে। Admin-এর সঙ্গে যোগাযোগ করুন।";
  return message || "Server-এর সঙ্গে যোগাযোগ করা যাচ্ছে না। আবার চেষ্টা করুন।";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isLogin = mode === "login";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }).catch(() => null);

    if (!response?.ok) {
      const result = (await response?.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(banglaError(result?.error));
      setPending(false);
      return;
    }

    const requestedPath = searchParams.get("next");
    const next = requestedPath?.startsWith("/") ? requestedPath : "/dashboard";
    router.push(next);
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {!isLogin && (
        <label>
          আপনার নাম বা username
          <input
            name="username"
            minLength={3}
            maxLength={40}
            placeholder="যেমন: zohana"
            autoComplete="username"
            required
          />
        </label>
      )}
      <label>
        {isLogin ? "ইমেইল অথবা username" : "ইমেইল ঠিকানা"}
        <input
          name={isLogin ? "identifier" : "email"}
          type={isLogin ? "text" : "email"}
          autoComplete={isLogin ? "username" : "email"}
          placeholder={isLogin ? "আপনার ইমেইল বা username" : "name@example.com"}
          required
        />
      </label>
      <label>
        পাসওয়ার্ড
        <input
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          placeholder="কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড"
          required
        />
        {!isLogin && <small>কমপক্ষে ৮ অক্ষরের একটি মনে রাখার মতো পাসওয়ার্ড দিন।</small>}
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={pending} type="submit">
        {pending
          ? "অপেক্ষা করুন…"
          : isLogin
            ? "লগ ইন করে শেখা চালিয়ে যান"
            : "ফ্রি Student account তৈরি করুন"}
      </button>
      <p className="form-switch">
        {isLogin ? "Project30-এ নতুন?" : "আগেই account আছে?"}{" "}
        <Link href={isLogin ? "/register" : "/login"}>
          {isLogin ? "ফ্রি account খুলুন" : "লগ ইন করুন"}
        </Link>
      </p>
    </form>
  );
}
