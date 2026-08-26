import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="message-page">
      <div>
        <p className="eyebrow">403 · Access denied</p>
        <h1>This area is not available for your role.</h1>
        <p>The interface redirects you for clarity; Strapi also rejects the underlying request.</p>
        <Link className="button primary" href="/dashboard">Return to dashboard</Link>
      </div>
    </main>
  );
}
