"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type Mode = "login" | "register";

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
      setError(result?.error ?? "Could not reach the server. Try again.");
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
          Username
          <input name="username" minLength={3} maxLength={40} required />
        </label>
      )}
      <label>
        {isLogin ? "Email or username" : "Email"}
        <input
          name={isLogin ? "identifier" : "email"}
          type={isLogin ? "text" : "email"}
          autoComplete={isLogin ? "username" : "email"}
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          required
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Please wait…" : isLogin ? "Log in" : "Create student account"}
      </button>
      <p className="form-switch">
        {isLogin ? "New to Project30?" : "Already registered?"}{" "}
        <Link href={isLogin ? "/register" : "/login"}>
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
