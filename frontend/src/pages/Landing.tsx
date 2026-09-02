import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Target, LineChart, Handshake, ArrowRight, GraduationCap, Building2, School } from "lucide-react";

const FEATURES = [
  { icon: Brain, title: "AI Resume Analysis", desc: "Instant ATS scoring and rewrite suggestions, powered by AI." },
  { icon: Target, title: "Smart Matching", desc: "A ranking engine that matches jobs to your real skill profile." },
  { icon: LineChart, title: "Placement Analytics", desc: "Colleges track readiness, skill gaps, and outcomes live." },
  { icon: Handshake, title: "Industry Collaboration", desc: "Companies publish expectations that shape curricula." },
];

const ROLES = [
  { role: "Student", icon: GraduationCap, desc: "Build your profile, get AI recommendations, and apply to opportunities.", to: "/signup" },
  { role: "Company", icon: Building2, desc: "Post jobs and internships, and rank applicants with AI matching.", to: "/signup" },
  { role: "College", icon: School, desc: "Monitor placements, skill gaps, and industry partnerships.", to: "/signup" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

function AscentLine() {
  return (
    <svg viewBox="0 0 1000 320" fill="none" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ascentStroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#4F7CFF" stopOpacity="0.25" />
          <stop offset="55%" stopColor="#6D5EF0" />
          <stop offset="100%" stopColor="#9B5CF6" />
        </linearGradient>
        <linearGradient id="ascentFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6D5EF0" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6D5EF0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 280 C 120 280, 160 220, 240 210 S 360 150, 440 140 S 560 90, 660 80 S 820 30, 1000 10"
        fill="none"
        stroke="url(#ascentStroke)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1000"
        className="animate-ascent-draw"
      />
      <path
        d="M0 280 C 120 280, 160 220, 240 210 S 360 150, 440 140 S 560 90, 660 80 S 820 30, 1000 10 V320 H0 Z"
        fill="url(#ascentFill)"
      />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-void">
      <header className="sticky top-0 z-30 border-b border-stroke glass-panel">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white shadow-glow">
              S
            </span>
            SkillBridge <span className="text-gradient">AI</span>
          </span>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all hover:brightness-105"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-grid-fade" />
        <div className="absolute inset-x-0 top-24 h-[360px] opacity-70">
          <AscentLine />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 pb-28 pt-24 text-center">
          <motion.span
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-stroke bg-white/70 px-3 py-1 text-xs font-medium text-ink-muted shadow-soft"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-growth" />
            Academia × Industry, connected by AI
          </motion.span>

          <motion.h1
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink md:text-6xl"
          >
            Your career, <span className="text-gradient">plotted on a line that only goes up.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-2xl text-base text-ink-muted md:text-lg"
          >
            SkillBridge AI connects students, companies, and colleges through an intelligent matching engine,
            resume AI, mock interviews, and real-time placement analytics.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:brightness-105"
            >
              Create your free account
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-stroke bg-white/60 px-6 py-3 text-sm font-semibold text-ink shadow-soft transition-colors hover:border-accent-400 hover:text-accent-700"
            >
              I already have an account
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              variants={fadeUp}
              className="glass-panel group rounded-2xl border border-stroke p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover hover:border-accent-300"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="border-y border-stroke bg-white/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center font-display text-2xl font-semibold text-ink md:text-3xl"
          >
            Built for every stakeholder
          </motion.h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {ROLES.map((r, i) => (
              <motion.div
                key={r.role}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
                className="glass-panel rounded-2xl border border-stroke p-7 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-growth-soft text-growth">
                  <r.icon size={22} />
                </div>
                <h3 className="mt-4 font-display font-semibold text-ink">{r.role}</h3>
                <p className="mt-2 text-sm text-ink-muted">{r.desc}</p>
                <Link
                  to={r.to}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:text-accent-700"
                >
                  Get started as a {r.role.toLowerCase()}
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-ink-faint">
        © {new Date().getFullYear()} SkillBridge AI. Built for Smart India Hackathon.
      </footer>
    </div>
  );
}
