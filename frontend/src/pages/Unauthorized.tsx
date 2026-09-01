import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const HOME_BY_ROLE: Record<string, string> = {
  STUDENT: "/student",
  COMPANY: "/company",
  COLLEGE: "/college",
  ADMIN: "/admin",
};

export default function Unauthorized() {
  const { user } = useAuthStore();
  const home = user ? HOME_BY_ROLE[user.role] ?? "/" : "/";
  return (
    <div className="bg-dot-grid flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="text-sm font-semibold text-danger">403</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Access denied</h1>
      <p className="mt-2 max-w-sm text-ink-muted">You don't have permission to view this page with your current role.</p>
      <Link to={home} className="mt-6 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:brightness-105">
        Go to my dashboard
      </Link>
    </div>
  );
}
