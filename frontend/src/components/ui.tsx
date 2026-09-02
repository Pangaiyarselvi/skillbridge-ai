import { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

export function Card({
  className = "",
  hover = false,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={`glass-panel rounded-2xl shadow-card transition-all duration-200 ${
        hover ? "hover:-translate-y-0.5 hover:shadow-card-hover" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Card with a colored gradient border-glow, used to draw attention (e.g. featured stat, upsell). */
export function GradientCard({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`relative rounded-2xl p-[1px] bg-brand-gradient shadow-glow ${className}`} {...rest}>
      <div className="glass-panel h-full w-full rounded-[15px] bg-white/80">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Button                                                             */
/* ------------------------------------------------------------------ */

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-brand-gradient text-white shadow-glow hover:brightness-[1.06] hover:shadow-card-hover disabled:opacity-40 disabled:shadow-none",
    secondary:
      "bg-white text-ink border border-stroke shadow-soft hover:border-accent-300 hover:bg-accent-50/60 disabled:text-ink-faint",
    outline:
      "border border-stroke text-ink-muted bg-white/40 hover:border-accent-400 hover:text-accent-600 hover:bg-accent-50/50 disabled:text-ink-faint disabled:hover:border-stroke",
    ghost: "text-ink-muted hover:bg-accent-50/70 hover:text-accent-700 disabled:text-ink-faint",
    danger: "bg-danger text-white shadow-[0_8px_20px_-6px_rgba(240,68,56,0.5)] hover:brightness-105 disabled:opacity-40",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-150 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Form fields                                                        */
/* ------------------------------------------------------------------ */

const fieldBase =
  "w-full rounded-xl border border-stroke bg-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint shadow-[inset_0_1px_2px_rgba(30,32,60,0.04)] transition-all focus:border-accent-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent-400/15";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldBase} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">{children}</label>;
}

export function FormField({
  label,
  children,
  hint,
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge                                                              */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "brand" | "blue";
}) {
  const tones: Record<string, string> = {
    slate: "bg-surface-3 text-ink-muted border border-stroke",
    green: "bg-growth-soft text-growth border border-growth/20",
    amber: "bg-warn-soft text-warn border border-warn/25",
    red: "bg-danger-soft text-danger border border-danger/20",
    brand: "bg-accent-50 text-accent-700 border border-accent-200",
    blue: "bg-sky-500/10 text-sky-500 border border-sky-500/25",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading / empty / error states                                     */
/* ------------------------------------------------------------------ */

export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 style={{ width: size, height: size }} className="animate-spin text-accent-500" />;
}

export function FullPageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-ink-faint">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="bg-dot-grid flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-strong bg-white/40 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-faint">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page header                                                        */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 flex flex-wrap items-start justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  hint,
  tone = "brand",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "green" | "amber" | "red" | "slate";
  icon?: ReactNode;
}) {
  const toneStyles: Record<string, { text: string; chip: string }> = {
    brand: { text: "text-accent-600", chip: "bg-brand-gradient text-white" },
    green: { text: "text-growth", chip: "bg-growth text-white" },
    amber: { text: "text-warn", chip: "bg-warn text-white" },
    red: { text: "text-danger", chip: "bg-danger text-white" },
    slate: { text: "text-ink", chip: "bg-ink text-white" },
  };
  const t = toneStyles[tone];
  return (
    <Card hover className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-glow ${t.chip}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-3 font-display text-3xl font-semibold ${t.text}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      <svg className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-32 opacity-[0.15]" viewBox="0 0 120 50" fill="none">
        <path d="M2 44 C 30 44, 30 20, 50 20 S 80 6, 118 4" stroke="currentColor" className={t.text} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Table (lightweight wrapper for consistent styling)                 */
/* ------------------------------------------------------------------ */

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stroke">
      <table className={`w-full border-collapse text-left text-sm ${className}`}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-3/70 text-xs font-semibold uppercase tracking-wide text-ink-faint">{children}</thead>;
}

export function TRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`border-t border-stroke transition-colors hover:bg-accent-50/40 ${className}`}>{children}</tr>;
}

export function TH({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

export function TD({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-ink ${className}`}>{children}</td>;
}

/* ------------------------------------------------------------------ */
/*  Progress bar (used for readiness / match scores)                   */
/* ------------------------------------------------------------------ */

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface-3 ${className}`}>
      <div
        className="h-full rounded-full bg-brand-gradient transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
