import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ExternalLink, Sparkles, Award, Calendar, Megaphone, Mail } from "lucide-react";
import { api } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "offers" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/students/notifications");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setNotifications(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string, link?: string) => {
    try {
      await api.patch(`/students/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await api.patch("/students/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "offers") {
      const t = (n.title + " " + (n.body || "")).toLowerCase();
      return t.includes("offer") || t.includes("interview") || n.type === "APPLICATION_UPDATE";
    }
    return true;
  });

  const getIcon = (item: NotificationItem) => {
    const t = (item.title + " " + (item.body || "")).toLowerCase();
    if (t.includes("offer")) {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
          <Award size={16} />
        </span>
      );
    }
    if (t.includes("interview")) {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
          <Calendar size={16} />
        </span>
      );
    }
    if (t.includes("broadcast") || t.includes("notice") || item.type === "SYSTEM") {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
          <Megaphone size={16} />
        </span>
      );
    }
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
        <Mail size={16} />
      </span>
    );
  };

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="View notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-stroke bg-white/70 text-ink-muted transition-all duration-150 hover:border-accent-300 hover:bg-white hover:text-accent-600 shadow-soft"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-stroke bg-white/95 p-0 shadow-2xl backdrop-blur-xl ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stroke px-4 py-3.5">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-semibold text-ink">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-800 transition-colors disabled:opacity-50"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 border-b border-stroke/60 bg-surface-2/60 px-3 py-1.5 text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  filter === "all"
                    ? "bg-white text-ink shadow-sm font-semibold"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("offers")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  filter === "offers"
                    ? "bg-white text-emerald-700 shadow-sm font-semibold"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Offers & Invites
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  filter === "unread"
                    ? "bg-white text-accent-700 shadow-sm font-semibold"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-stroke/40">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-ink-muted">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-ink-faint">
                    <Sparkles size={20} />
                  </div>
                  <p className="text-sm font-medium text-ink">You're all caught up!</p>
                  <p className="text-xs text-ink-faint mt-0.5">No notifications in this view.</p>
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id, item.link)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      !item.isRead ? "bg-accent-50/40 hover:bg-accent-50/70" : "hover:bg-surface-2"
                    }`}
                  >
                    {getIcon(item)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`truncate text-xs ${
                            !item.isRead ? "font-bold text-ink" : "font-medium text-ink-muted"
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-ink-faint">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                      {item.body && (
                        <p className="mt-0.5 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                          {item.body}
                        </p>
                      )}
                      {item.link && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-accent-600 group-hover:underline">
                          <span>View Details</span>
                          <ExternalLink size={10} />
                        </div>
                      )}
                    </div>
                    {!item.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-stroke bg-surface-2/80 px-4 py-2 text-center">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/student/inbox");
                }}
                className="text-xs font-semibold text-accent-600 hover:text-accent-800 transition-colors"
              >
                Go to Communication Inbox →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
