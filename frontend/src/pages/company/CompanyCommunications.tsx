import { useState, useEffect } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Send,
  Sparkles,
  Award,
  Calendar,
  Users,
  Search,
  Plus,
  Paperclip,
  Check,
  CheckCheck,
  Eye,
  FileText,
  Clock,
  Filter,
  DollarSign,
  Briefcase,
  X,
  UploadCloud,
  ChevronDown,
  Mail,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button, Input, Card, Badge, Spinner, Textarea, Select } from "../../components/ui";
import { useToast } from "../../lib/toast";
import { openOfferMailClient } from "../../lib/manualEmail";
import { AISmartAssistant } from "../../components/communication/AISmartAssistant";
import { motion, AnimatePresence } from "framer-motion";

interface Applicant {
  id: string;
  studentId: string;
  opportunityId: string;
  status: string;
  opportunity: { id: string; title: string; type: string };
  student: {
    id: string;
    fullName: string;
    department?: string;
    branch?: string;
    cgpa?: number;
    user: { id: string; email: string };
  };
}

interface SentItem {
  id: string;
  subject: string;
  category: string;
  priority: string;
  createdAt: string;
  isRead: boolean;
  recipient: {
    email: string;
    student?: { fullName: string; department?: string; branch?: string };
  };
  offerLetter?: any;
}

export default function CompanyCommunications() {
  const [activeTab, setActiveTab] = useState<"sent" | "compose" | "offers">("sent");
  const [sentList, setSentList] = useState<SentItem[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // Form Fields
  const [selectedStudentUserIds, setSelectedStudentUserIds] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("INTERVIEW_INVITATION");
  const [priority, setPriority] = useState<string>("NORMAL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; size: string; type: string }>>([]);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Offer Letter specific fields in compose
  const [isOfferMode, setIsOfferMode] = useState(false);
  const [offerJobRole, setOfferJobRole] = useState("");
  const [offerSalary, setOfferSalary] = useState("");
  const [offerLocation, setOfferLocation] = useState("Bengaluru HQ / Hybrid");
  const [offerJoiningDate, setOfferJoiningDate] = useState("");
  const [offerValidUntil, setOfferValidUntil] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");

  const [companyName, setCompanyName] = useState<string>("SkillBridge Partner");
  const { push } = useToast();

  const fetchCompanyProfile = async () => {
    try {
      const res = await api.get("/companies/me");
      if (res.data?.data?.name) {
        setCompanyName(res.data.data.name);
      }
    } catch {
      // ignore
    }
  };

  const handleSendOfferEmail = (studentName: string, studentEmail?: string, jobRole?: string) => {
    if (!studentEmail) {
      push("Student email address not found.", "error");
      return;
    }

    const res = openOfferMailClient({
      studentName,
      studentEmail,
      companyName,
      jobRole: jobRole || "Selected Position",
    });

    if (res.success) {
      push(`Opening email client for ${studentEmail}...`, "success");
    } else {
      push(res.error || "Failed to open email client.", "error");
    }
  };

  const fetchSentCommunications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/communications/sent");
      if (res.data?.success) {
        setSentList(res.data.data);
      }
    } catch {
      push("Failed to load sent communications", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async () => {
    try {
      const res = await api.get("/companies/applicants");
      if (res.data?.success) {
        setApplicants(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCompanyProfile();
    fetchSentCommunications();
    fetchApplicants();
  }, []);

  const handleSelectAllApplicants = () => {
    const allUserIds = Array.from(new Set(applicants.map((a) => a.student.user.id)));
    setSelectedStudentUserIds(allUserIds);
    push(`Selected all ${allUserIds.length} candidate(s)`, "info");
  };

  const handleSelectByStatus = (status: string) => {
    const filteredUserIds = applicants
      .filter((a) => a.status === status)
      .map((a) => a.student.user.id);
    setSelectedStudentUserIds(Array.from(new Set(filteredUserIds)));
    push(`Selected ${filteredUserIds.length} candidate(s) with status ${status}`, "info");
  };

  const handleApplyAITemplate = (newSubject: string, newBody: string) => {
    setSubject(newSubject);
    setBody(newBody);
    setAiAssistantOpen(false);
  };

  const handleAddSampleAttachment = () => {
    const newAtt = {
      name: `Job_Spec_${category}_SkillBridge.pdf`,
      url: "/documents/sample_spec.pdf",
      size: "340 KB",
      type: "application/pdf",
    };
    setAttachments([...attachments, newAtt]);
    push("Attached document", "info");
  };

  const handleSendMessage = async () => {
    if (selectedStudentUserIds.length === 0) {
      push("Please select at least one recipient candidate", "error");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      push("Subject and body cannot be empty", "error");
      return;
    }

    try {
      setSending(true);

      if (isOfferMode || category === "OFFER_LETTER") {
        // Issuing formal offer letter for selected candidate
        const primaryUserId = selectedStudentUserIds[0];
        const app = applicants.find((a) => a.student.user.id === primaryUserId);
        const studentId = app?.studentId || app?.student?.id;

        if (!studentId || !offerJobRole || !offerSalary) {
          push("For offer letters, please select an applicant and specify Job Role and Salary Package", "error");
          setSending(false);
          return;
        }

        const offerRes = await api.post("/offers", {
          studentId,
          opportunityId: selectedOpportunityId || app?.opportunityId || undefined,
          jobRole: offerJobRole,
          salaryPackage: offerSalary,
          location: offerLocation,
          joiningDate: offerJoiningDate || undefined,
          validUntil: offerValidUntil || undefined,
          customSubject: subject,
          customMessage: body,
          letterContent: body,
          sendEmail: true,
        });

        if (offerRes.data?.success) {
          push("Official offer letter issued!", "success");
          const targetApplicant = applicants.find((a) => a.student.user.id === studentId);
          if (targetApplicant?.student?.user?.email) {
            handleSendOfferEmail(
              targetApplicant.student.fullName,
              targetApplicant.student.user.email,
              offerJobRole
            );
          }
        }
      } else {
        // Standard communication dispatch
        const res = await api.post("/communications/send", {
          recipientUserIds: selectedStudentUserIds,
          category,
          priority,
          subject,
          body,
          attachments,
        });

        if (res.data?.success) {
          push(`Successfully dispatched to ${selectedStudentUserIds.length} student(s)!`, "success");
        }
      }

      setComposeOpen(false);
      // Reset form
      setSubject("");
      setBody("");
      setSelectedStudentUserIds([]);
      setAttachments([]);
      setIsOfferMode(false);
      fetchSentCommunications();
    } catch {
      push("Failed to dispatch communication", "error");
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
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-glow">
                <Send size={18} />
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Recruitment Communication Panel
              </h1>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Dispatch interview invites, send official offer letters, and manage applicant communications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOfferMode(true);
                setCategory("OFFER_LETTER");
                setPriority("URGENT");
                setSubject("Congratulations! Official Job Offer");
                setComposeOpen(true);
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <Award size={14} className="text-emerald-600" />
              Issue Offer Letter
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsOfferMode(false);
                setCategory("INTERVIEW_INVITATION");
                setComposeOpen(true);
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus size={14} />
              Compose Communication
            </Button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-soft">
              <Send size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Total Communications Sent
              </p>
              <p className="font-display text-2xl font-bold text-ink">{sentList.length}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-soft">
              <Award size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Official Offers Dispatched
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600">
                {sentList.filter((s) => s.category === "OFFER_LETTER").length}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-soft">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Active Candidate Pool
              </p>
              <p className="font-display text-2xl font-bold text-purple-600">
                {applicants.length}
              </p>
            </div>
          </Card>
        </div>

        {/* Sent Logs Table */}
        <div className="rounded-2xl border border-stroke bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Sent Communication History</h3>
              <p className="text-xs text-ink-muted">
                Audit log of all outreach emails, interview schedules, and offer letters issued.
              </p>
            </div>
            <button
              onClick={fetchSentCommunications}
              className="text-xs font-semibold text-accent-600 hover:text-accent-800 transition-colors"
            >
              Refresh Logs
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-ink-faint">
              <Spinner size={28} />
              <p className="mt-2 text-xs">Loading sent records...</p>
            </div>
          ) : sentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-ink-muted">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-ink-faint">
                <Send size={20} />
              </div>
              <p className="text-sm font-semibold text-ink">No sent communications yet</p>
              <p className="text-xs text-ink-faint mt-1">
                Click "Compose Communication" above to invite students or issue offer letters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-[11px] font-bold text-ink-faint uppercase tracking-wider border-y border-stroke">
                  <tr>
                    <th className="p-3.5">Candidate / Recipient</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Date Dispatched</th>
                    <th className="p-3.5">Delivery & Read</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke/60">
                  {sentList.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-ink">
                          {item.recipient.student?.fullName || item.recipient.email}
                        </p>
                        <p className="text-[11px] text-ink-faint">
                          {item.recipient.student?.department || item.recipient.email}
                        </p>
                      </td>
                      <td className="p-3.5">
                        <span className="rounded-md bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent-700">
                          {item.category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-ink max-w-xs truncate">
                        {item.subject}
                      </td>
                      <td className="p-3.5">
                        {item.priority === "URGENT" ? (
                          <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[9px] font-bold text-danger">
                            URGENT
                          </span>
                        ) : item.priority === "HIGH" ? (
                          <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[9px] font-bold text-warn">
                            HIGH
                          </span>
                        ) : (
                          <span className="text-ink-faint">Normal</span>
                        )}
                      </td>
                      <td className="p-3.5 text-ink-faint">
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3.5">
                        {item.isRead ? (
                          <span className="flex items-center gap-1 font-bold text-emerald-600">
                            <CheckCheck size={14} />
                            Read by candidate
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-ink-faint">
                            <Check size={14} />
                            Delivered
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {item.category === "OFFER_LETTER" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 px-2.5 py-1"
                            onClick={() =>
                              handleSendOfferEmail(
                                item.recipient.student?.fullName || "Candidate",
                                item.recipient.email,
                                item.offerLetter?.jobRole || item.subject.replace(/^Congratulations!.*?: /i, "") || "Selected Role"
                              )
                            }
                            title="Open email client with pre-filled offer"
                          >
                            <Mail size={12} />
                            Send Offer Email
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COMPOSE EMAIL & OFFER MODAL */}
        <AnimatePresence>
          {composeOpen && (
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
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow">
                      {isOfferMode ? <Award size={16} /> : <Send size={16} />}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold text-ink">
                        {isOfferMode ? "Issue Corporate Offer Letter" : "Compose Enterprise Communication"}
                      </h3>
                      <p className="text-[11px] text-ink-muted">
                        Target individual candidates or broadcast to shortlisted applicants
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
                      onClick={() => setComposeOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-3 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Modal Body Scroll Area */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                  {/* Recipient Selection Section */}
                  <div className="rounded-xl border border-stroke bg-surface-2/40 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-ink">
                        Recipients ({selectedStudentUserIds.length} Selected)
                      </label>
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={handleSelectAllApplicants}
                          className="rounded px-2 py-0.5 text-accent-700 hover:bg-accent-50 font-semibold"
                        >
                          Select All ({applicants.length})
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => handleSelectByStatus("SHORTLISTED")}
                          className="rounded px-2 py-0.5 text-emerald-700 hover:bg-emerald-50 font-semibold"
                        >
                          Shortlisted Only
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentUserIds([])}
                          className="rounded px-2 py-0.5 text-ink-faint hover:text-danger"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Applicant Picker */}
                    <div className="max-h-36 overflow-y-auto divide-y divide-stroke/40 rounded-lg border border-stroke bg-white">
                      {applicants.length === 0 ? (
                        <p className="p-3 text-xs text-ink-faint text-center">
                          No applicants registered under your opportunities yet.
                        </p>
                      ) : (
                        applicants.map((app) => {
                          const uid = app.student.user.id;
                          const isSelected = selectedStudentUserIds.includes(uid);
                          return (
                            <div
                              key={app.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedStudentUserIds(selectedStudentUserIds.filter((id) => id !== uid));
                                } else {
                                  setSelectedStudentUserIds([...selectedStudentUserIds, uid]);
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                                isSelected ? "bg-accent-50/70 font-semibold" : "hover:bg-surface-2"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-stroke text-accent-600 focus:ring-accent-400"
                                />
                                <div>
                                  <p className="text-ink font-bold">{app.student.fullName}</p>
                                  <p className="text-[10px] text-ink-faint">
                                    {app.opportunity.title} • {app.student.department || "Student"}
                                  </p>
                                </div>
                              </div>
                              <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-ink-muted">
                                {app.status}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Mode Specific: Offer Letter Details */}
                  {isOfferMode && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                        <Award size={14} className="text-emerald-600" />
                        Offer Letter Contract Terms
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                            Designation / Job Role *
                          </label>
                          <Input
                            placeholder="e.g. Associate Software Engineer"
                            value={offerJobRole}
                            onChange={(e) => setOfferJobRole(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                            Compensation Package (CTC) *
                          </label>
                          <Input
                            placeholder="e.g. ₹14,50,000 / annum"
                            value={offerSalary}
                            onChange={(e) => setOfferSalary(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                            Work Location
                          </label>
                          <Input
                            placeholder="e.g. Bengaluru / Hybrid"
                            value={offerLocation}
                            onChange={(e) => setOfferLocation(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                            Anticipated Joining Date
                          </label>
                          <Input
                            type="date"
                            value={offerJoiningDate}
                            onChange={(e) => setOfferJoiningDate(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                            Response Deadline
                          </label>
                          <Input
                            type="date"
                            value={offerValidUntil}
                            onChange={(e) => setOfferValidUntil(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard Communication Category & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                        Communication Category
                      </label>
                      <Select
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          if (e.target.value === "OFFER_LETTER") {
                            setIsOfferMode(true);
                          }
                        }}
                        className="text-xs"
                      >
                        <option value="INTERVIEW_INVITATION">📅 Interview Invitation</option>
                        <option value="OFFER_LETTER">🏆 Official Offer Letter</option>
                        <option value="PLACEMENT_ANNOUNCEMENT">📢 Placement Announcement</option>
                        <option value="GENERAL">💬 General Update</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                        Urgency & Priority
                      </label>
                      <Select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="text-xs"
                      >
                        <option value="NORMAL">Normal Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="URGENT">Urgent (Red Alert Badge)</option>
                      </Select>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                      Subject Line *
                    </label>
                    <Input
                      placeholder="e.g. Invitation for Technical Round 1: Senior Frontend Engineer"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="text-xs font-semibold"
                    />
                  </div>

                  {/* Message Body & Variable Shortcuts */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Message Content (Rich Format) *
                      </label>
                      <div className="flex items-center gap-1 text-[11px] text-ink-faint">
                        <span>Insert Token:</span>
                        <button
                          type="button"
                          onClick={() => setBody(body + " {{student_name}}")}
                          className="rounded bg-surface-3 px-1.5 py-0.5 hover:text-ink"
                        >
                          + Name
                        </button>
                        <button
                          type="button"
                          onClick={() => setBody(body + " {{job_role}}")}
                          className="rounded bg-surface-3 px-1.5 py-0.5 hover:text-ink"
                        >
                          + Role
                        </button>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Write your professional corporate communication here..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  {/* Attachments Bar */}
                  <div className="rounded-xl border border-stroke bg-surface-2/30 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Paperclip size={16} className="text-ink-faint" />
                      <span className="text-xs font-semibold text-ink">Attachments:</span>
                      {attachments.length === 0 ? (
                        <span className="text-xs text-ink-faint">No files attached yet</span>
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
                      Attach Document (PDF)
                    </Button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-stroke bg-surface-2 px-6 py-4">
                  <span className="text-xs text-ink-muted">
                    Recipients selected: <strong className="text-ink">{selectedStudentUserIds.length}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setComposeOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleSendMessage}
                      loading={sending}
                      disabled={selectedStudentUserIds.length === 0 || !subject.trim() || !body.trim()}
                      className="text-xs flex items-center gap-2 shadow-glow"
                    >
                      <Send size={14} />
                      {isOfferMode ? "Issue & Dispatch Offer" : "Send Communication"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI SMART ASSISTANT DRAWER / MODAL */}
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
                      SkillBridge AI Smart Assistant
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
                  initialType={category as any}
                  defaultContext={{
                    jobRole: offerJobRole || "Full Stack Developer",
                    salary: offerSalary || "₹14 LPA",
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
