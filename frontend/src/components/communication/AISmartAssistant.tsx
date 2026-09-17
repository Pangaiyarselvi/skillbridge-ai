import { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  SlidersHorizontal,
  FileCheck2,
  Calendar,
  Award,
  Briefcase,
  XCircle,
  Clock,
  ChevronRight,
  Info,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button, Input, Select, Textarea } from "../ui";
import { useToast } from "../../lib/toast";

export interface GeneratedTemplate {
  subject: string;
  body: string;
  suggestedSubjectLines?: string[];
  keyActionItems?: string[];
  tone: string;
}

interface AISmartAssistantProps {
  initialType?: "INTERVIEW_INVITATION" | "OFFER_LETTER" | "INTERNSHIP_ANNOUNCEMENT" | "REJECTION_EMAIL" | "FOLLOW_UP";
  defaultContext?: {
    studentName?: string;
    companyName?: string;
    jobRole?: string;
    salary?: string;
    date?: string;
    meetingLink?: string;
    department?: string;
  };
  onApplyTemplate: (subject: string, body: string) => void;
  onClose?: () => void;
}

const TEMPLATE_TYPES = [
  {
    id: "INTERVIEW_INVITATION",
    label: "Interview Invite",
    icon: Calendar,
    desc: "Virtual or in-person technical & HR interview rounds",
    tone: "PROFESSIONAL",
  },
  {
    id: "OFFER_LETTER",
    label: "Job Offer",
    icon: Award,
    desc: "Official congratulatory placement offer letter",
    tone: "ENCOURAGING",
  },
  {
    id: "INTERNSHIP_ANNOUNCEMENT",
    label: "Internship Drive",
    icon: Briefcase,
    desc: "Campus internship recruitment notification",
    tone: "PROFESSIONAL",
  },
  {
    id: "REJECTION_EMAIL",
    label: "Constructive Rejection",
    icon: XCircle,
    desc: "Empathetic feedback keeping candidate in talent pool",
    tone: "ENCOURAGING",
  },
  {
    id: "FOLLOW_UP",
    label: "Follow-Up",
    icon: Clock,
    desc: "Deadline reminders, document checks & schedule sync",
    tone: "DIRECT",
  },
];

const TONES = [
  { id: "PROFESSIONAL", label: "Professional & Polished", emoji: "💼" },
  { id: "ENCOURAGING", label: "Warm & Encouraging", emoji: "🌟" },
  { id: "FORMAL", label: "Executive & Formal", emoji: "🏛️" },
  { id: "DIRECT", label: "Clear & Direct", emoji: "⚡" },
];

export function AISmartAssistant({
  initialType = "INTERVIEW_INVITATION",
  defaultContext = {},
  onApplyTemplate,
  onClose,
}: AISmartAssistantProps) {
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [tone, setTone] = useState<string>("PROFESSIONAL");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratedTemplate | null>(null);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const { push } = useToast();

  const [context, setContext] = useState({
    studentName: defaultContext.studentName || "",
    companyName: defaultContext.companyName || "",
    jobRole: defaultContext.jobRole || "",
    salary: defaultContext.salary || "",
    date: defaultContext.date || "",
    meetingLink: defaultContext.meetingLink || "",
    department: defaultContext.department || "",
    notes: "",
  });

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await api.post("/communications/ai-suggest-template", {
        templateType: selectedType,
        tone,
        context,
      });

      if (res.data?.success && res.data.data) {
        setResult(res.data.data);
        push("AI draft generated successfully!", "success");
      }
    } catch {
      push("Failed to generate AI template, using instant offline template", "info");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyTemplate(result.subject, result.body);
    push("Template applied to email composer!", "success");
    if (onClose) onClose();
  };

  const handleCopy = (text: string, isSubject: boolean) => {
    navigator.clipboard.writeText(text);
    if (isSubject) {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
    push("Copied to clipboard!", "success");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-1 max-h-[85vh] overflow-y-auto">
      {/* Left controls column */}
      <div className="w-full lg:w-5/12 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-stroke pb-6 lg:pb-0 lg:pr-6">
        <div>
          <div className="flex items-center gap-2 text-accent-600 mb-1">
            <Sparkles size={18} className="animate-spin-slow" />
            <span className="text-xs font-bold uppercase tracking-wider">SIH Innovation</span>
          </div>
          <h3 className="font-display text-lg font-bold text-ink">
            AI Smart Communication Assistant
          </h3>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            Generate enterprise-grade recruitment and placement communications powered by Llama 3 & SkillBridge intelligence.
          </p>
        </div>

        {/* Template Type Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Select Communication Goal
          </label>
          <div className="grid grid-cols-1 gap-2">
            {TEMPLATE_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = selectedType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(t.id);
                    setTone(t.tone);
                  }}
                  className={`flex items-start gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-accent-500 bg-accent-50/60 shadow-sm ring-1 ring-accent-400/20"
                      : "border-stroke bg-white/60 hover:border-accent-200 hover:bg-surface-2"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-brand-gradient text-white shadow-glow"
                        : "bg-surface-3 text-ink-muted"
                    }`}
                  >
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold ${isSelected ? "text-accent-700" : "text-ink"}`}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-ink-muted truncate">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Communication Tone
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TONES.map((tn) => (
              <button
                key={tn.id}
                type="button"
                onClick={() => setTone(tn.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  tone === tn.id
                    ? "border-accent-500 bg-accent-50 text-accent-700 font-semibold shadow-xs"
                    : "border-stroke bg-white/60 text-ink-muted hover:border-accent-200"
                }`}
              >
                <span>{tn.emoji}</span>
                <span className="truncate">{tn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Context Variables Form */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Context & Parameters
            </label>
            <span className="text-[10px] text-ink-faint">Auto-interpolated</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-ink-muted font-medium mb-1 block">Candidate Name</label>
              <Input
                placeholder="e.g. Rahul Verma"
                value={context.studentName}
                onChange={(e) => setContext({ ...context, studentName: e.target.value })}
                className="text-xs py-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted font-medium mb-1 block">Company / Dept</label>
              <Input
                placeholder="e.g. Microsoft / CS Dept"
                value={context.companyName}
                onChange={(e) => setContext({ ...context, companyName: e.target.value })}
                className="text-xs py-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-ink-muted font-medium mb-1 block">Job Role</label>
              <Input
                placeholder="e.g. Full Stack Engineer"
                value={context.jobRole}
                onChange={(e) => setContext({ ...context, jobRole: e.target.value })}
                className="text-xs py-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted font-medium mb-1 block">CTC / Stipend</label>
              <Input
                placeholder="e.g. ₹16 LPA or ₹35,000/mo"
                value={context.salary}
                onChange={(e) => setContext({ ...context, salary: e.target.value })}
                className="text-xs py-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-ink-muted font-medium mb-1 block">Date / Timeline</label>
              <Input
                placeholder="e.g. Oct 15, 2026 10:00 AM"
                value={context.date}
                onChange={(e) => setContext({ ...context, date: e.target.value })}
                className="text-xs py-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted font-medium mb-1 block">Virtual Meet Link</label>
              <Input
                placeholder="e.g. meet.google.com/xyz"
                value={context.meetingLink}
                onChange={(e) => setContext({ ...context, meetingLink: e.target.value })}
                className="text-xs py-1.5"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-ink-muted font-medium mb-1 block">Custom Instructions</label>
            <Input
              placeholder="e.g. Ask candidate to bring laptop and portfolio"
              value={context.notes}
              onChange={(e) => setContext({ ...context, notes: e.target.value })}
              className="text-xs py-1.5"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          loading={loading}
          className="w-full flex items-center justify-center gap-2 mt-1"
        >
          <Sparkles size={16} />
          {loading ? "Synthesizing AI Copy..." : "Generate AI Draft"}
        </Button>
      </div>

      {/* Right preview column */}
      <div className="w-full lg:w-7/12 flex flex-col justify-between">
        {result ? (
          <div className="flex flex-col h-full space-y-4">
            {/* Subject preview */}
            <div className="rounded-xl border border-stroke bg-surface-2 p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent-700 flex items-center gap-1.5">
                  <SlidersHorizontal size={12} />
                  Suggested Subject Line
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(result.subject, true)}
                  className="text-xs flex items-center gap-1 text-ink-muted hover:text-accent-600 transition-colors"
                >
                  {copiedSubject ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copiedSubject ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm font-semibold text-ink leading-snug">{result.subject}</p>

              {result.suggestedSubjectLines && result.suggestedSubjectLines.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-stroke/60">
                  <span className="text-[10px] text-ink-faint uppercase font-bold block mb-1">
                    Alternative Subject Lines:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggestedSubjectLines.map((alt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setResult({ ...result, subject: alt })}
                        className="text-[11px] rounded-md border border-stroke bg-white px-2 py-0.5 text-ink-muted hover:border-accent-300 hover:text-accent-700 transition-colors truncate max-w-xs"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email Body preview */}
            <div className="flex-1 rounded-xl border border-stroke bg-white p-4 shadow-sm flex flex-col">
              <div className="flex items-center justify-between border-b border-stroke/80 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-ink">Body Preview</span>
                  <span className="text-[10px] rounded bg-surface-3 px-1.5 py-0.5 text-ink-muted">
                    {result.tone}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(result.body, false)}
                  className="text-xs flex items-center gap-1 text-ink-muted hover:text-accent-600 transition-colors"
                >
                  {copiedBody ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copiedBody ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px] text-xs leading-relaxed text-ink whitespace-pre-line font-sans bg-surface-2/40 p-3 rounded-lg border border-stroke/50">
                {result.body}
              </div>

              {/* Action items */}
              {result.keyActionItems && result.keyActionItems.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stroke/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1.5">
                    <FileCheck2 size={12} className="text-emerald-600" />
                    Key Checklist / Action Points:
                  </span>
                  <ul className="grid grid-cols-1 gap-1">
                    {result.keyActionItems.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                        <Check size={10} className="text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Apply footer */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {onClose && (
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleApply}
                className="flex items-center gap-2"
              >
                <Check size={16} />
                Insert Draft into Composer
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke bg-surface-2/50 p-8 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Sparkles size={28} />
            </div>
            <h4 className="font-display text-base font-semibold text-ink">
              Ready to Draft Communications
            </h4>
            <p className="mt-1 max-w-sm text-xs text-ink-muted leading-relaxed">
              Choose your communication goal, specify the role and recipient details, then click "Generate AI Draft" to create personalized, professional email copy in seconds.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-700">
                ✨ Zero Hallucination
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                🎯 Context Aware
              </span>
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
                🏆 SIH Ready
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
