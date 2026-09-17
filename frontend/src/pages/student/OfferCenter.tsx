import { useState, useEffect } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Award,
  Building,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Eye,
  FileText,
  DollarSign,
  MapPin,
  ShieldCheck,
  Printer,
  ChevronRight,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Send,
  X,
  Check,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button, Card, Badge, Spinner, Input, Textarea } from "../../components/ui";
import { useToast } from "../../lib/toast";
import { motion, AnimatePresence } from "framer-motion";

interface OfferLetterItem {
  id: string;
  companyId: string;
  studentId: string;
  opportunityId?: string;
  jobRole: string;
  salaryPackage: string;
  location?: string;
  joiningDate?: string;
  validUntil?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  letterContent?: string;
  documentUrl?: string;
  declineReason?: string;
  acceptedAt?: string;
  declinedAt?: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    logoUrl?: string;
    hqLocation?: string;
    website?: string;
    verificationStatus?: string;
  };
  opportunity?: {
    id: string;
    title: string;
    type: string;
    location?: string;
    isRemote?: boolean;
  };
}

export default function OfferCenter() {
  const [offers, setOffers] = useState<OfferLetterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<OfferLetterItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Decline modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [offerToDecline, setOfferToDecline] = useState<OfferLetterItem | null>(null);

  // Celebration banner
  const [acceptedCelebration, setAcceptedCelebration] = useState(false);

  const { push } = useToast();

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/offers");
      if (res.data?.success) {
        setOffers(res.data.data);
      }
    } catch {
      push("Failed to load offer letters", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleOpenPreview = (offer: OfferLetterItem) => {
    setSelectedOffer(offer);
    setModalOpen(true);
  };

  const handleAcceptOffer = async (offer: OfferLetterItem) => {
    try {
      setActionLoading(true);
      const res = await api.patch(`/offers/${offer.id}/respond`, {
        action: "ACCEPTED",
      });

      if (res.data?.success) {
        push(`🎉 Congratulations! You accepted the offer from ${offer.company.name}!`, "success");
        setAcceptedCelebration(true);
        setTimeout(() => setAcceptedCelebration(false), 8000);

        setOffers((prev) =>
          prev.map((o) => (o.id === offer.id ? { ...o, status: "ACCEPTED", acceptedAt: new Date().toISOString() } : o))
        );
        if (selectedOffer?.id === offer.id) {
          setSelectedOffer({ ...selectedOffer, status: "ACCEPTED", acceptedAt: new Date().toISOString() });
        }
      }
    } catch {
      push("Failed to accept offer. Please try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDecline = (offer: OfferLetterItem) => {
    setOfferToDecline(offer);
    setDeclineReason("");
    setDeclineModalOpen(true);
  };

  const handleConfirmDecline = async () => {
    if (!offerToDecline) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/offers/${offerToDecline.id}/respond`, {
        action: "DECLINED",
        declineReason,
      });

      if (res.data?.success) {
        push(`Offer from ${offerToDecline.company.name} declined`, "info");
        setOffers((prev) =>
          prev.map((o) =>
            o.id === offerToDecline.id
              ? { ...o, status: "DECLINED", declinedAt: new Date().toISOString(), declineReason }
              : o
          )
        );
        if (selectedOffer?.id === offerToDecline.id) {
          setSelectedOffer({
            ...selectedOffer,
            status: "DECLINED",
            declinedAt: new Date().toISOString(),
            declineReason,
          });
        }
        setDeclineModalOpen(false);
        setOfferToDecline(null);
      }
    } catch {
      push("Failed to decline offer", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
            <CheckCircle2 size={13} />
            OFFER ACCEPTED
          </span>
        );
      case "DECLINED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-700 border border-red-500/20">
            <XCircle size={13} />
            DECLINED
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-500/20">
            <Clock size={13} />
            EXPIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-500/20 animate-pulse">
            <AlertTriangle size={13} />
            ACTION REQUIRED
          </span>
        );
    }
  };

  const totalOffers = offers.length;
  const acceptedOffers = offers.filter((o) => o.status === "ACCEPTED").length;
  const pendingOffers = offers.filter((o) => o.status === "PENDING").length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Celebration Banner on Accept */}
        <AnimatePresence>
          {acceptedCelebration && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-2xl"
            >
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md">
                    <Sparkles size={24} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      🎉 Offer Accepted! Welcome to Your Next Career Milestone!
                    </h3>
                    <p className="text-xs text-white/90 mt-0.5">
                      The employer and college placement cell have been officially notified. Keep your document proofs ready.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAcceptedCelebration(false)}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Top Bar */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stroke pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-glow">
                <Award size={18} />
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Offer Letter Center
              </h1>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Review, print, and accept formal employment contracts from recruiting companies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOffers}
              className="text-xs"
            >
              Refresh Offers
            </Button>
          </div>
        </div>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600 shadow-soft">
              <Award size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Total Offers Received
              </p>
              <p className="font-display text-2xl font-bold text-ink">{totalOffers}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-soft">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Offers Accepted
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600">
                {acceptedOffers}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-soft">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Pending Decisions
              </p>
              <p className="font-display text-2xl font-bold text-amber-600">{pendingOffers}</p>
            </div>
          </Card>
        </div>

        {/* Offers Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-ink-faint">
            <Spinner size={32} />
            <p className="mt-3 text-sm">Loading your official offer letters...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke bg-white/70 p-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-3 text-ink-faint">
              <Award size={32} />
            </div>
            <h3 className="font-display text-base font-bold text-ink">
              No offer letters received yet
            </h3>
            <p className="mt-1 max-w-sm text-xs text-ink-muted leading-relaxed">
              When recruiters and partner enterprises extend official employment or internship offers, they will be delivered here with formal contract verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offers.map((offer) => {
              const isPending = offer.status === "PENDING";

              return (
                <div
                  key={offer.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-stroke bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div>
                    {/* Card Header: Company Logo & Status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-base font-bold text-white shadow-glow">
                          {offer.company.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-display text-sm font-bold text-ink">
                              {offer.company.name}
                            </h3>
                            {offer.company.verificationStatus === "VERIFIED" && (
                              <ShieldCheck size={14} className="text-emerald-600" />
                            )}
                          </div>
                          <p className="text-[11px] text-ink-faint flex items-center gap-1">
                            <MapPin size={10} />
                            {offer.location || "Bengaluru HQ"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>

                    {/* Job Role & CTC */}
                    <div className="rounded-xl bg-surface-2 p-3.5 mb-4 border border-stroke/50">
                      <p className="text-xs text-ink-faint uppercase font-bold tracking-wider">
                        Designation
                      </p>
                      <p className="font-display text-base font-bold text-ink">{offer.jobRole}</p>

                      <div className="mt-2.5 pt-2 border-t border-stroke/60 flex items-center justify-between">
                        <span className="text-xs text-ink-muted">Annual Package (CTC):</span>
                        <span className="font-display text-base font-bold text-emerald-600">
                          {offer.salaryPackage}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Info */}
                    <div className="space-y-1.5 text-xs text-ink-muted mb-4">
                      {offer.joiningDate && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-ink-faint">
                            <Calendar size={12} />
                            Joining Date:
                          </span>
                          <span className="font-medium text-ink">
                            {new Date(offer.joiningDate).toLocaleDateString(undefined, {
                              dateStyle: "medium",
                            })}
                          </span>
                        </div>
                      )}
                      {offer.validUntil && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-ink-faint">
                            <Clock size={12} />
                            Response Deadline:
                          </span>
                          <span className="font-semibold text-amber-700">
                            {new Date(offer.validUntil).toLocaleDateString(undefined, {
                              dateStyle: "medium",
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-ink-faint">
                        <span>Issued On:</span>
                        <span>
                          {new Date(offer.createdAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="border-t border-stroke pt-4 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPreview(offer)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold"
                    >
                      <Eye size={14} />
                      View Full Offer Letter
                    </Button>

                    {isPending && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptOffer(offer)}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs flex items-center justify-center gap-1"
                        >
                          <Check size={14} />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDecline(offer)}
                          disabled={actionLoading}
                          className="border-danger/30 text-danger hover:bg-danger-soft text-xs flex items-center justify-center gap-1"
                        >
                          <X size={14} />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FULL CORPORATE DOCUMENT VIEWER MODAL */}
        <AnimatePresence>
          {modalOpen && selectedOffer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stroke my-8 overflow-hidden"
              >
                {/* Modal Top Bar */}
                <div className="flex items-center justify-between border-b border-stroke bg-surface-2 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-accent-600" />
                    <span className="font-display text-sm font-bold text-ink">
                      Official Corporate Employment Offer Document
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      title="Print Document"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-white text-ink-muted hover:text-ink transition-colors"
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-3 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Printable Document Body */}
                <div className="p-8 sm:p-12 space-y-6 text-ink bg-white font-sans max-h-[70vh] overflow-y-auto">
                  {/* Corporate Letterhead */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                        {selectedOffer.company.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enterprise Campus Recruitment Division
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedOffer.company.hqLocation || "Bengaluru, Karnataka, India"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-700">
                        REF: SB-OFFER-{selectedOffer.id.slice(0, 8).toUpperCase()}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Date:{" "}
                        {new Date(selectedOffer.createdAt).toLocaleDateString(undefined, {
                          dateStyle: "long",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Salutation & Subject */}
                  <div>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Private & Confidential
                    </p>
                    <h3 className="font-display text-lg font-bold text-slate-900 mt-2">
                      Subject: Letter of Employment Offer for {selectedOffer.jobRole}
                    </h3>
                  </div>

                  {/* Letter Content */}
                  <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-line border-l-2 border-slate-200 pl-4 py-1">
                    {selectedOffer.letterContent}
                  </div>

                  {/* Compensation Breakdown Table */}
                  <div>
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                      Annexure A: Annual Compensation Structure
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                          <tr>
                            <th className="p-3">Component</th>
                            <th className="p-3 text-right">Amount (INR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-3 font-medium">Basic Salary & Flexible Allowance</td>
                            <td className="p-3 text-right font-mono">60% of Total CTC</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">House Rent Allowance (HRA)</td>
                            <td className="p-3 text-right font-mono">25% of Total CTC</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">Performance Bonus & Skill Retention Incentive</td>
                            <td className="p-3 text-right font-mono">15% of Total CTC</td>
                          </tr>
                          <tr className="bg-emerald-50/60 font-bold text-emerald-950">
                            <td className="p-3 text-sm">Total Cost to Company (CTC)</td>
                            <td className="p-3 text-right text-sm font-mono font-bold text-emerald-700">
                              {selectedOffer.salaryPackage}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Authorized Signatures */}
                  <div className="pt-8 flex items-end justify-between border-t border-slate-200 text-xs text-slate-600">
                    <div>
                      <div className="h-10 w-32 border-b border-slate-400 mb-1 flex items-center">
                        <span className="font-serif italic text-sm text-slate-700">
                          {selectedOffer.company.name} Talent HR
                        </span>
                      </div>
                      <p className="font-bold text-slate-900">Authorized Signatory</p>
                      <p className="text-[11px] text-slate-500">Corporate Talent Acquisition</p>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-2">
                        <ShieldCheck size={20} className="text-emerald-600 mb-0.5" />
                        <span className="text-[10px] font-bold uppercase text-emerald-800">
                          SkillBridge Verified
                        </span>
                        <span className="text-[9px] font-mono text-emerald-600">256-bit Secure</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke bg-surface-2 px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedOffer.status)}
                    {selectedOffer.validUntil && (
                      <span className="text-xs text-ink-muted">
                        Expires: {new Date(selectedOffer.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      Download / Print PDF
                    </Button>

                    {selectedOffer.status === "PENDING" && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleOpenDecline(selectedOffer)}
                          disabled={actionLoading}
                          className="text-xs"
                        >
                          Decline Offer
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptOffer(selectedOffer)}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-glow text-xs flex items-center gap-1.5 font-bold"
                        >
                          <Check size={15} />
                          Sign & Accept Offer
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DECLINE CONFIRMATION MODAL */}
        <AnimatePresence>
          {declineModalOpen && offerToDecline && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stroke space-y-4"
              >
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle size={20} />
                  <h3 className="font-display text-base font-bold text-ink">
                    Decline Employment Offer
                  </h3>
                </div>

                <p className="text-xs text-ink-muted leading-relaxed">
                  Are you sure you want to decline the offer for{" "}
                  <span className="font-bold text-ink">{offerToDecline.jobRole}</span> from{" "}
                  <span className="font-bold text-ink">{offerToDecline.company.name}</span>? This action cannot be reversed.
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1">
                    Reason for Declining (Optional feedback)
                  </label>
                  <Textarea
                    placeholder="e.g. Accepted another offer, pursuing higher education, location mismatch..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeclineModalOpen(false)}
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirmDecline}
                    loading={actionLoading}
                    className="text-xs"
                  >
                    Confirm Decline
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
