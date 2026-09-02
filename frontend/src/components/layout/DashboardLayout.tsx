import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  User,
  Compass,
  FileText,
  Sparkles,
  MessageSquare,
  Mic,
  PenLine,
  BarChart3,
  Handshake,
  TrendingUp,
  Users,
  ShieldCheck,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../lib/api";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  STUDENT: [
    { to: "/student", label: "Dashboard", icon: Home, end: true },
    { to: "/student/profile", label: "Profile & Skills", icon: User },
    { to: "/student/opportunities", label: "Opportunities", icon: Compass },
    { to: "/student/applications", label: "Applications", icon: FileText },
    { to: "/student/ai-hub", label: "AI Career Hub", icon: Sparkles },
    { to: "/student/mentor", label: "Mentor Chat", icon: MessageSquare },
    { to: "/student/mock-interview", label: "Mock Interview", icon: Mic },
  ],
  COMPANY: [
    { to: "/company", label: "Dashboard", icon: Home, end: true },
    { to: "/company/jobs/new", label: "Post Job/Internship", icon: PenLine },
    { to: "/company/industry-expectations", label: "Industry Expectations", icon: BarChart3 },
  ],
  COLLEGE: [
    { to: "/college", label: "Dashboard", icon: Home, end: true },
    { to: "/college/analytics", label: "Analytics", icon: TrendingUp },
    { to: "/college/collaboration", label: "Industry Collaboration", icon: Handshake },
  ],
  ADMIN: [
    { to: "/admin", label: "Dashboard", icon: Home, end: true },
    { to: "/admin/users", label: "User Management", icon: Users },
    { to: "/admin/verification", label: "Verification", icon: ShieldCheck },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student",
  COMPANY: "Company",
  COLLEGE: "College",
  ADMIN: "Admin",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = user ? NAV_BY_ROLE[user.role] ?? [] : [];

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout
    }
    logout();
    navigate("/login", { replace: true });
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-stroke px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white shadow-glow">
          S
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          SkillBridge <span className="text-gradient">AI</span>
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-muted hover:bg-accent-50 hover:text-accent-700"
              }`
            }
          >
            <item.icon size={17} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto shrink-0 border-t border-stroke p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-glow">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user?.email}</p>
            <p className="text-xs text-ink-faint">{user ? ROLE_LABEL[user.role] : ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stroke bg-white/50 px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-void lg:flex">
      {/* Mobile topbar */}
      <div className="glass-panel sticky top-0 z-30 flex items-center justify-between border-b border-stroke px-4 py-3 lg:hidden">
        <span className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-xs font-bold text-white">
            S
          </span>
          SkillBridge <span className="text-gradient">AI</span>
        </span>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-lg p-2 text-ink-muted hover:bg-accent-50 hover:text-accent-700"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="glass-panel z-40 hidden w-64 shrink-0 flex-col border-r border-stroke shadow-nav lg:sticky lg:top-0 lg:flex lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "tween", duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stroke lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
}
