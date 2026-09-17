import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Inbox as InboxIcon,
  Bell,
  Calendar,
  Award,
  Megaphone,
  Archive,
  Search,
  Check,
  CheckCheck,
  Star,
  Download,
  ExternalLink,
  Video,
  Clock,
  Building,
  User,
  Trash2,
  ChevronLeft,
  Mail,
  Filter,
  FileText,
  AlertCircle,
  Paperclip,
  Printer,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button, Input, Card, Badge, Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import { motion, AnimatePresence } from "framer-motion";

interface CommunicationItem {
  id: string;
  senderId: string;
  recipientId: string;
  category: string;
  priority: "NORMAL" | "HIGH" | "URGENT";
  subject: string;
  body: string;
  attachments?: Array<{ name: string; url: string; size: string; type: string }>;
  metadata?: any;
  isRead: boolean;
  isArchived: boolean;
  offerLetterId?: string;
  offerLetter?: any;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    role: string;
    company?: { id: string; name: string; logoUrl?: string; verificationStatus: string };
    college?: { id: string; name: string; logoUrl?: string; verificationStatus: string };
    admin?: { id: string; fullName: string };
  };
}

export default function StudentInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [activeFolder, setActiveFolder] = useState<string>("INBOX");
  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const [selectedMessage, setSelectedMessage] = useState<CommunicationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  // Mobile split-pane state
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const folders = [
    { id: "INBOX", label: "Inbox", icon: InboxIcon, category: "ALL", archived: false },
    { id: "NOTIFICATIONS", label: "System & Updates", icon: Bell, category: "GENERAL", archived: false },
    { id: "INTERVIEWS", label: "Interview Invites", icon: Calendar, category: "INTERVIEW_INVITATION", archived: false },
    { id: "OFFERS", label: "Offer Letters", icon: Award, category: "OFFER_LETTER", archived: false },
    { id: "ANNOUNCEMENTS", label: "College Broadcasts", icon: Megaphone, category: "PLACEMENT_ANNOUNCEMENT", archived: false },
    { id: "ARCHIVED", label: "Archived", icon: Archive, category: "ALL", archived: true },
  ];

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const current = folders.find((f) => f.id === activeFolder) || folders[0];
      const params: any = {
        isArchived: current.archived ? "true" : "false",
      };
      if (current.category !== "ALL") {
        params.category = current.category;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get("/communications/inbox", { params });
      if (res.data?.success) {
        const msgs = res.data.data.messages || [];
        setCommunications(msgs);
        setTotalUnread(res.data.data.totalUnread || 0);
        setUnreadMap(res.data.data.unreadByCategory || {});

        // Auto-select first or matching ID
        if (selectedId) {
          const found = msgs.find((m: any) => m.id === selectedId);
          if (found) {
            setSelectedMessage(found);
          } else {
            fetchMessageDetail(selectedId);
          }
        } else if (msgs.length > 0 && window.innerWidth >= 1024) {
          setSelectedId(msgs[0].id);
          setSelectedMessage(msgs[0]);
        }
      }
    } catch {
      push("Failed to load communications", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/communications/inbox/${id}`);
      if (res.data?.success) {
        setSelectedMessage(res.data.data);
        // Mark read in local state
        setCommunications((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isRead: true } : c))
        );
      }
    } catch {
      push("Error fetching message details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [activeFolder, searchQuery]);

  useEffect(() => {
    if (selectedId) {
      fetchMessageDetail(selectedId);
      setSearchParams({ id: selectedId });
    }
  }, [selectedId]);

  const handleSelect = (msg: CommunicationItem) => {
    setSelectedId(msg.id);
    setSelectedMessage(msg);
    setMobileView("detail");
    if (!msg.isRead) {
      api.patch(`/communications/inbox/${msg.id}/read`, { isRead: true }).catch(() => {});
      setCommunications((prev) =>
        prev.map((c) => (c.id === msg.id ? { ...c, isRead: true } : c))
      );
      setTotalUnread((t) => Math.max(0, t - 1));
    }
  };

  const toggleArchive = async (id: string) => {
    try {
      const res = await api.patch(`/communications/inbox/${id}/archive`);
      if (res.data?.success) {
        push(res.data.message, "success");
        setCommunications((prev) => prev.filter((c) => c.id !== id));
        if (selectedId === id) {
          setSelectedId(null);
          setSelectedMessage(null);
        }
      }
    } catch {
      push("Action failed", "error");
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/communications/inbox/mark-all-read");
      setCommunications((prev) => prev.map((c) => ({ ...c, isRead: true })));
      setTotalUnread(0);
      push("All messages marked as read", "success");
    } catch {
      push("Failed to mark all as read", "error");
    }
  };

  const filteredMessages = communications.filter((msg) => {
    if (priorityFilter !== "ALL" && msg.priority !== priorityFilter) return false;
    return true;
  });

  const getSenderName = (msg: CommunicationItem) => {
    if (msg.sender.company) return msg.sender.company.name;
    if (msg.sender.college) return msg.sender.college.name;
    if (msg.sender.admin) return msg.sender.admin.fullName;
    return msg.sender.email;
  };

  const getSenderRoleBadge = (msg: CommunicationItem) => {
    if (msg.sender.role === "COMPANY") {
      return (
        <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
          Company
        </span>
      );
    }
    if (msg.sender.role === "COLLEGE") {
      return (
        <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-600">
          College
        </span>
      );
    }
    return (
      <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
        System
      </span>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "OFFER_LETTER":
        return <Award size={14} className="text-emerald-600" />;
      case "INTERVIEW_INVITATION":
        return <Calendar size={14} className="text-blue-600" />;
      case "PLACEMENT_ANNOUNCEMENT":
      case "PLACEMENT_DRIVE":
      case "WORKSHOP":
        return <Megaphone size={14} className="text-amber-600" />;
      default:
        return <Mail size={14} className="text-slate-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4">
        {/* Page Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Communication Center
              </h1>
              {totalUnread > 0 && (
                <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-glow">
                  {totalUnread} new
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Secure enterprise mailbox for interviews, offer letters, and college placement alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInbox}
              className="flex items-center gap-1.5 rounded-xl border border-stroke bg-white/70 px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-accent-300 hover:text-accent-700 shadow-soft"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="text-xs flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              Mark All Read
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/student/offers")}
              className="text-xs flex items-center gap-1.5"
            >
              <Award size={14} />
              View Offer Letters
            </Button>
          </div>
        </div>

        {/* 3-Pane Outlook / Gmail Layout Container */}
        <div className="grid grid-cols-12 gap-4 min-h-[680px]">
          {/* FOLDER SIDEBAR (Cols: 3) */}
          <div className="hidden md:flex md:col-span-3 lg:col-span-2 flex-col gap-1 rounded-2xl border border-stroke bg-white/80 p-3 shadow-card backdrop-blur-md">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Folders
            </div>
            {folders.map((folder) => {
              const Icon = folder.icon;
              const isActive = activeFolder === folder.id;
              const count =
                folder.id === "INBOX"
                  ? totalUnread
                  : folder.category !== "ALL"
                  ? unreadMap[folder.category] || 0
                  : 0;

              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setMobileView("list");
                  }}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-brand-gradient text-white shadow-glow"
                      : "text-ink-muted hover:bg-accent-50/70 hover:text-accent-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} />
                    <span className="truncate">{folder.label}</span>
                  </div>
                  {count > 0 && (
                    <span
                      className={`ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        isActive ? "bg-white text-accent-700" : "bg-accent-50 text-accent-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick Helper Widget */}
            <div className="mt-auto border-t border-stroke/70 pt-4 p-2">
              <div className="rounded-xl bg-surface-2 p-3 text-center border border-stroke/50">
                <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Award size={16} />
                </div>
                <p className="text-xs font-bold text-ink">Offer Center</p>
                <p className="text-[10px] text-ink-faint mt-0.5">
                  Sign or decline your official employment contracts
                </p>
                <button
                  onClick={() => navigate("/student/offers")}
                  className="mt-2 block w-full rounded-lg bg-white border border-stroke py-1 text-[11px] font-semibold text-accent-600 hover:text-accent-800 shadow-xs"
                >
                  Open Offer Center
                </button>
              </div>
            </div>
          </div>

          {/* MIDDLE MESSAGE LIST (Cols: 4 or 5) */}
          <div
            className={`${
              mobileView === "detail" ? "hidden lg:flex" : "flex"
            } col-span-12 md:col-span-9 lg:col-span-4 flex-col rounded-2xl border border-stroke bg-white/80 shadow-card backdrop-blur-md overflow-hidden`}
          >
            {/* Search & Priority Filter Header */}
            <div className="border-b border-stroke p-3 space-y-2 bg-surface-2/40">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <Input
                  placeholder="Search subject, company, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-white"
                />
              </div>

              {/* Priority Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                {["ALL", "URGENT", "HIGH", "NORMAL"].map((pr) => (
                  <button
                    key={pr}
                    onClick={() => setPriorityFilter(pr)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      priorityFilter === pr
                        ? "bg-ink text-white font-semibold shadow-xs"
                        : "bg-surface-3 text-ink-muted hover:text-ink"
                    }`}
                  >
                    {pr === "ALL" ? "All Priorities" : pr}
                  </button>
                ))}
              </div>
            </div>

            {/* Message List Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-stroke/60">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-ink-faint">
                  <Spinner size={24} />
                  <p className="mt-2 text-xs">Fetching messages...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-ink-muted">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-ink-faint">
                    <InboxIcon size={20} />
                  </div>
                  <p className="text-sm font-semibold text-ink">No communications found</p>
                  <p className="text-xs text-ink-faint mt-1 max-w-xs">
                    {searchQuery
                      ? "Try tweaking your search terms or clearing filters."
                      : "Messages from companies and your college will appear here."}
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedId === msg.id;
                  const senderName = getSenderName(msg);

                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleSelect(msg)}
                      className={`group relative flex flex-col gap-1.5 p-3.5 transition-all cursor-pointer border-l-4 ${
                        isSelected
                          ? "bg-accent-50/70 border-accent-600 shadow-xs"
                          : !msg.isRead
                          ? "bg-white hover:bg-surface-2 border-accent-400 font-semibold"
                          : "bg-white/60 hover:bg-surface-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {getCategoryIcon(msg.category)}
                          <p className="truncate text-xs font-bold text-ink">{senderName}</p>
                          {getSenderRoleBadge(msg)}
                        </div>
                        <span className="shrink-0 text-[10px] text-ink-faint">
                          {new Date(msg.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-xs ${
                            !msg.isRead ? "font-bold text-ink" : "font-medium text-ink-muted"
                          }`}
                        >
                          {msg.subject}
                        </p>
                        {msg.priority === "URGENT" && (
                          <span className="shrink-0 rounded bg-danger-soft px-1.5 py-0.5 text-[9px] font-bold text-danger">
                            URGENT
                          </span>
                        )}
                        {msg.priority === "HIGH" && (
                          <span className="shrink-0 rounded bg-warn-soft px-1.5 py-0.5 text-[9px] font-bold text-warn">
                            HIGH
                          </span>
                        )}
                      </div>

                      <p className="line-clamp-2 text-[11px] text-ink-muted leading-relaxed">
                        {msg.body}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-[10px] text-ink-faint">
                          {msg.attachments && msg.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip size={11} />
                              {msg.attachments.length} file
                            </span>
                          )}
                          {msg.offerLetterId && (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                              <Award size={11} />
                              Official Offer
                            </span>
                          )}
                        </div>
                        {!msg.isRead && (
                          <span className="h-2 w-2 rounded-full bg-accent-500 shadow-xs" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT READING PANE (Cols: 5 or 6) */}
          <div
            className={`${
              mobileView === "list" ? "hidden lg:flex" : "flex"
            } col-span-12 lg:col-span-6 flex-col rounded-2xl border border-stroke bg-white p-6 shadow-card backdrop-blur-md overflow-y-auto`}
          >
            {detailLoading ? (
              <div className="flex h-full flex-col items-center justify-center p-12 text-ink-faint">
                <Spinner size={32} />
                <p className="mt-3 text-xs font-medium">Opening communication...</p>
              </div>
            ) : selectedMessage ? (
              <div className="flex flex-col gap-6">
                {/* Mobile Back button */}
                <div className="flex items-center justify-between lg:hidden border-b border-stroke pb-3">
                  <button
                    onClick={() => setMobileView("list")}
                    className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-800"
                  >
                    <ChevronLeft size={16} />
                    Back to message list
                  </button>
                  {getSenderRoleBadge(selectedMessage)}
                </div>

                {/* Sender Card & Actions Toolbar */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stroke pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-base font-bold text-white shadow-glow">
                      {getSenderName(selectedMessage)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-ink">
                          {getSenderName(selectedMessage)}
                        </h2>
                        {getSenderRoleBadge(selectedMessage)}
                      </div>
                      <p className="text-xs text-ink-muted">{selectedMessage.sender.email}</p>
                      <p className="text-[11px] text-ink-faint mt-0.5">
                        {new Date(selectedMessage.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleArchive(selectedMessage.id)}
                      title="Archive message"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-surface-2 text-ink-muted hover:border-accent-300 hover:text-accent-700 shadow-soft transition-colors"
                    >
                      <Archive size={15} />
                    </button>
                    <button
                      onClick={() => window.print()}
                      title="Print message"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-surface-2 text-ink-muted hover:border-accent-300 hover:text-accent-700 shadow-soft transition-colors"
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                </div>

                {/* Subject Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="rounded-md bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent-700 uppercase">
                      {selectedMessage.category.replace(/_/g, " ")}
                    </span>
                    {selectedMessage.priority === "URGENT" && (
                      <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                        URGENT ACTION
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink leading-tight">
                    {selectedMessage.subject}
                  </h3>
                </div>

                {/* SPECIAL OFFER LETTER BANNER */}
                {selectedMessage.offerLetterId && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4 shadow-sm backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-glow">
                          <Award size={20} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-emerald-900">
                            OFFICIAL OFFER LETTER ATTACHED
                          </p>
                          <p className="text-xs text-emerald-700">
                            {selectedMessage.metadata?.jobRole || "Job Role"} •{" "}
                            <span className="font-bold">
                              {selectedMessage.metadata?.salaryPackage || "Compensation Package"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate("/student/offers")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink size={13} />
                        Open Offer Letter Center
                      </Button>
                    </div>
                  </div>
                )}

                {/* SPECIAL INTERVIEW EVENT CARD */}
                {selectedMessage.category === "INTERVIEW_INVITATION" && (
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-50/50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-glow">
                          <Video size={18} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-blue-900">
                            VIRTUAL INTERVIEW SESSION
                          </p>
                          <p className="text-xs text-blue-700">
                            Check calendar and ensure webcam/microphone access ready.
                          </p>
                        </div>
                      </div>
                      {selectedMessage.metadata?.meetingLink && (
                        <a
                          href={selectedMessage.metadata.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-glow hover:bg-blue-700 transition-colors"
                        >
                          <Video size={14} />
                          Join Interview Call
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Email Body */}
                <div className="rounded-xl border border-stroke/70 bg-surface-2/30 p-5 text-sm leading-relaxed text-ink whitespace-pre-line font-sans shadow-xs">
                  {selectedMessage.body}
                </div>

                {/* Attachments Section */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="border-t border-stroke pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                      <Paperclip size={14} />
                      Attachments ({selectedMessage.attachments.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedMessage.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-stroke bg-white p-2.5 shadow-xs hover:border-accent-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 font-bold text-[10px]">
                              PDF
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-ink">{att.name}</p>
                              <p className="text-[10px] text-ink-faint">{att.size || "Document"}</p>
                            </div>
                          </div>
                          <a
                            href={att.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-accent-50 hover:text-accent-700 transition-colors"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-12 text-center text-ink-muted">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-3 text-ink-faint">
                  <Mail size={28} />
                </div>
                <h4 className="font-display text-base font-bold text-ink">
                  Select a message to read
                </h4>
                <p className="mt-1 max-w-xs text-xs text-ink-faint">
                  Click any message on the left list to view corporate details, interview links, and offer letters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
