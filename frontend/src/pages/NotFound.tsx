import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="bg-dot-grid flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="text-sm font-semibold text-gradient">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-ink-muted">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="mt-6 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:brightness-105">
        Back to home
      </Link>
    </div>
  );
}
