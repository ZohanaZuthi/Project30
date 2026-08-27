"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="message-page">
      <div>
        <p className="eyebrow">Something interrupted the request</p>
        <h1>Let’s try that again.</h1>
        <p>
          Your data was not silently changed. Check that Strapi is running, then
          retry this screen.
        </p>
        <div className="hero-actions">
          <button className="button primary" onClick={reset} type="button">
            Retry
          </button>
          <Link className="button secondary" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
