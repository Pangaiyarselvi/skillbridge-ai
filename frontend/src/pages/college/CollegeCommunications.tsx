import { useState, useEffect } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Megaphone,
  Users,
  Sparkles,
  Send,
  Calendar,
  Briefcase,
  GraduationCap,
  Layers,
  CheckCircle2,
  Clock,
  Plus,
  Filter,
  Paperclip,
  Check,
  X,
  Building,
  UploadCloud,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button, Input, Card, Badge, Spinner, Textarea, Select } from "../../components/ui";
import { useToast } from "../../lib/toast";
import { AISmartAssistant } from "../../components/communication/AISmartAssistant";
import { motion, AnimatePresence } from "framer-motion";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Artificial Intelligence & Data Science",
];

const GRAD_YEARS = [2024, 2025, 2026, 2027, 2028];

const CAMPAIGN_CATEGORIES = [
  { id: "PLACEMENT_DRIVE", label: "Placement Drive Notice", icon: Megaphone },
  { id: "WORKSHOP", label: "Technical Workshop & Hackathon", icon: Sparkles },
  { id: "INTERNSHIP", label: "Internship Opportunity", icon: Briefcase },
  { id: "TRAINING", label: "Upskilling & Training Schedule", icon: GraduationCap },
];

export default function CollegeCommunications() {
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Broadcast Form Fields
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [category, setCategory] = useState<string>("PLACEMENT_DRIVE");
  const [priority, setPriority] = useState<string>("HIGH");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; size: string; type: string }>>([]);

  // Stats & logs
  const [sentBroadcasts, setSentBroadcasts] = useState<any[]>([]);
  const [totalStudentsInCollege, setTotalStudentsInCollege] = useState(0);

  const { push } = useToast();

  const fetchCollegeInfo = async () => {
    try {
      setLoading(true);
      const [studentsRes, sentRes] = await Promise.all([
        api.get("/colleges/students"),
        api.get("/communications/sent"),
      ]);

      if (studentsRes.data?.success) {
        setTotalStudentsInCollege(studentsRes.data.data?.length || 0);
      }
      if (sentRes.data?.success) {
        setSentBroadcasts(sentRes.data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollegeInfo();
  }, []);

  const toggleDept = (dept: string) => {
    if (selectedDepartments.includes(dept)) {
      setSelectedDepartments(selectedDepartments.filter((d) => d !== dept));
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  const toggleYear = (yr: number) => {
    if (selectedYears.includes(yr)) {
      setSelectedYears(selectedYears.filter((y) => y !== yr));
    } else {
      setSelectedYears([...selectedYears, yr]);
    }
  };

  const handleSelectAllDepts = () => {
    if (selectedDepartments.length === DEPARTMENTS.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments([...DEPARTMENTS]);
    }
  };

  const handleSelectAllYears = () => {
    if (selectedYears.length === GRAD_YEARS.length) {
      setSelectedYears([]);
    } else {
      setSelectedYears([...GRAD_YEARS]);
    }
  };

  const handleApplyAITemplate = (newSubject: string, newBody: string) => {
    setSubject(newSubject);
    setBody(newBody);
    setAiAssistantOpen(false);
  };

  const handleAddSampleAttachment = () => {
    setAttachments([
      ...attachments,
      {
        name: `Schedule_${category}.pdf`,
        url: "/documents/placement_schedule.pdf",
        size: "410 KB",
        type: "application/pdf",
      },
    ]);
    push("Attached placement brochure / circular", "info");
  };

  const handleDispatchBroadcast = async () => {
    if (!subject.trim() || !body.trim()) {
      push("Subject and announcement body are required", "error");
      return;
    }

    try {
      setSending(true);
      const res = await api.post("/communications/college/broadcast", {
        departments: selectedDepartments,
        graduationYears: selectedYears,
        category,
        priority,
        subject,
        body,
        attachments,
      });

      if (res.data?.success) {
        push(res.data.message || "Broadcast successfully dispatched!", "success");
        setBroadcastModalOpen(false);
        setSubject("");
        setBody("");
        setSelectedDepartments([]);
        setSelectedYears([]);
        setAttachments([]);
        fetchCollegeInfo();
      }
    } catch (err: any) {
      push(err?.response?.data?.message || "Failed to dispatch broadcast", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Page Top Bar */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stroke pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-glow">
                <Megaphone size={18} />
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Placement & Campus Broadcast Hub
              </h1>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Targeted student communication for placement drives, technical workshops, and internship alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setBroadcastModalOpen(true)}
              className="text-xs flex items-center gap-1.5 shadow-glow"
            >
              <Plus size={14} />
              Dispatch New Broadcast
            </Button>
          </div>
        </div>

        {/* Audience & Campaign Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-soft">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Enrolled College Students
              </p>
              <p className="font-display text-2xl font-bold text-ink">
                {totalStudentsInCollege}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-soft">
              <Megaphone size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Total Broadcasts Issued
              </p>
              <p className="font-display text-2xl font-bold text-blue-600">
                {sentBroadcasts.length}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-soft">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Department Cohorts
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600">
                {DEPARTMENTS.length} Active
              </p>
            </div>
          </Card>
        </div>

        {/* Broadcast Activity Feed */}
        <div className="rounded-2xl border border-stroke bg-white p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-ink">
                Broadcast Dispatch Timeline
              </h3>
              <p className="text-xs text-ink-muted">
                Recent notifications and placement notices published to targeted cohorts.
              </p>
            </div>
            <button
              onClick={fetchCollegeInfo}
              className="text-xs font-semibold text-accent-600 hover:text-accent-800"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-ink-faint">
              <Spinner size={28} />
              <p className="mt-2 text-xs">Loading broadcast logs...</p>
            </div>
          ) : sentBroadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-ink-muted">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-ink-faint">
                <Megaphone size={20} />
              </div>
              <p className="text-sm font-semibold text-ink">No placement broadcasts yet</p>
              <p className="text-xs text-ink-faint mt-1">
                Dispatch your first placement announcement or workshop notification above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sentBroadcasts.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stroke bg-surface-2/40 p-4 transition-colors hover:border-accent-200"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent-700">
                        {item.category.replace(/_/g, " ")}
                      </span>
                      {item.priority === "HIGH" && (
                        <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[9px] font-bold text-warn">
                          HIGH PRIORITY
                        </span>
                      )}
                      <span className="text-[11px] text-ink-faint">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    <h4 className="font-display text-sm font-bold text-ink">{item.subject}</h4>
                    <p className="text-xs text-ink-muted line-clamp-2 max-w-2xl leading-relaxed">
                      {item.body}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-ink-faint">
                      <span>Recipient: {item.recipient.student?.fullName || item.recipient.email}</span>
                      {item.recipient.student?.department && (
                        <span>• Dept: {item.recipient.student.department}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TARGETED BROADCAST DISPATCH MODAL */}
        <AnimatePresence>
          {broadcastModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stroke my-6 overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-stroke bg-surface-2 px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-glow">
                      <Megaphone size={16} />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold text-ink">
                        Publish Targeted Campus Broadcast
                      </h3>
                      <p className="text-[11px] text-ink-muted">
                        Deliver real-time placement notices and notifications to specific student cohorts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAiAssistantOpen(true)}
                      className="text-xs flex items-center gap-1.5 border-accent-300 text-accent-700 bg-accent-50/50"
                    >
                      <Sparkles size={13} className="text-accent-600" />
                      AI Smart Assistant
                    </Button>
                    <button
                      onClick={() => setBroadcastModalOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-3 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                  {/* Department & Year Targeting Box */}
                  <div className="rounded-xl border border-stroke bg-surface-2/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                        <Filter size={13} className="text-purple-600" />
                        Target Cohort Filters (Leave empty for All Students)
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAllDepts}
                        className="text-xs font-semibold text-accent-700 hover:underline"
                      >
                        {selectedDepartments.length === DEPARTMENTS.length ? "Deselect All" : "Select All Depts"}
                      </button>
                    </div>

                    {/* Department Multi-select Pills */}
                    <div>
                      <p className="text-[11px] font-semibold text-ink-muted mb-1.5">Departments:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {DEPARTMENTS.map((dept) => {
                          const active = selectedDepartments.includes(dept);
                          return (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => toggleDept(dept)}
                              className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
                                active
                                  ? "border-purple-600 bg-purple-50 text-purple-800 font-bold shadow-xs"
                                  : "border-stroke bg-white text-ink-muted hover:border-purple-300"
                              }`}
                            >
                              {active && <Check size={11} className="inline mr-1 text-purple-700" />}
                              {dept}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Graduation Year Multi-select Pills */}
                    <div className="pt-2 border-t border-stroke/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-semibold text-ink-muted">Graduation Years:</p>
                        <button
                          type="button"
                          onClick={handleSelectAllYears}
                          className="text-[11px] font-semibold text-accent-700 hover:underline"
                        >
                          {selectedYears.length === GRAD_YEARS.length ? "Deselect" : "Select All Years"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {GRAD_YEARS.map((yr) => {
                          const active = selectedYears.includes(yr);
                          return (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => toggleYear(yr)}
                              className={`rounded-lg border px-3 py-1 text-xs transition-all ${
                                active
                                  ? "border-accent-600 bg-accent-50 text-accent-800 font-bold shadow-xs"
                                  : "border-stroke bg-white text-ink-muted hover:border-accent-300"
                              }`}
                            >
                              Class of {yr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Category & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                        Campaign Category
                      </label>
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="text-xs"
                      >
                        {CAMPAIGN_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                        Notification Priority
                      </label>
                      <Select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="text-xs"
                      >
                        <option value="NORMAL">Normal Priority</option>
                        <option value="HIGH">High Priority (Urgent Pin)</option>
                        <option value="URGENT">Critical / Mandatory Notice</option>
                      </Select>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                      Announcement Title / Subject *
                    </label>
                    <Input
                      placeholder="e.g. Upcoming Placement Drive: TechCorp Off-Campus Eligibility Details"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="text-xs font-semibold"
                    />
                  </div>

                  {/* Announcement Body */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                      Announcement Details & Action Instructions *
                    </label>
                    <Textarea
                      placeholder="Write detailed instructions, venue, eligibility criteria, or registration deadlines..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  {/* Attachment Bar */}
                  <div className="rounded-xl border border-stroke bg-surface-2/30 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Paperclip size={16} className="text-ink-faint" />
                      <span className="text-xs font-semibold text-ink">Attachments:</span>
                      {attachments.length === 0 ? (
                        <span className="text-xs text-ink-faint">No circular attached</span>
                      ) : (
                        attachments.map((a, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-white border border-stroke px-2 py-0.5 text-[11px] font-medium text-ink flex items-center gap-1 shadow-xs"
                          >
                            {a.name}
                            <button
                              type="button"
                              onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                              className="text-ink-faint hover:text-danger ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSampleAttachment}
                      className="text-[11px] py-1"
                    >
                      <UploadCloud size={12} />
                      Attach Circular (PDF)
                    </Button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-stroke bg-surface-2 px-6 py-4">
                  <span className="text-xs text-ink-muted">
                    Targeted cohorts:{" "}
                    <strong className="text-ink">
                      {selectedDepartments.length > 0 ? `${selectedDepartments.length} Depts` : "All Depts"}
                    </strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBroadcastModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleDispatchBroadcast}
                      loading={sending}
                      disabled={!subject.trim() || !body.trim()}
                      className="text-xs flex items-center gap-2 shadow-glow bg-purple-600 hover:bg-purple-700"
                    >
                      <Megaphone size={14} />
                      Dispatch Broadcast
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI SMART ASSISTANT MODAL */}
        <AnimatePresence>
          {aiAssistantOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stroke my-6 overflow-hidden p-6"
              >
                <div className="flex items-center justify-between border-b border-stroke pb-3 mb-4">
                  <div className="flex items-center gap-2 text-accent-700">
                    <Sparkles size={18} />
                    <span className="font-display text-base font-bold">
                      SkillBridge AI Placement Assistant
                    </span>
                  </div>
                  <button
                    onClick={() => setAiAssistantOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-3 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <AISmartAssistant
                  initialType="INTERNSHIP_ANNOUNCEMENT"
                  defaultContext={{
                    department: selectedDepartments[0] || "All Departments",
                    companyName: "Campus Placement Cell",
                  }}
                  onApplyTemplate={handleApplyAITemplate}
                  onClose={() => setAiAssistantOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
