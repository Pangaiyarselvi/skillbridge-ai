import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import { openOfferMailClient } from "../../lib/manualEmail";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, PageHeader, Select } from "../../components/ui";

interface RankedCandidate {
  applicationId: string;
  studentId: string;
  studentName: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

interface ApplicantDetail {
  status: string;
  email: string;
  jobRole: string;
}

const STATUS_OPTIONS = ["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "OFFERED", "REJECTED", "HIRED"];

export default function CompanyApplicants() {
  const { id } = useParams();
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [applicantDetails, setApplicantDetails] = useState<Record<string, ApplicantDetail>>({});
  const [companyName, setCompanyName] = useState<string>("SkillBridge Partner");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { push } = useToast();

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [aiRes, appRes, compRes] = await Promise.all([
        api.get(`/ai/opportunities/${id}/rank-candidates`),
        api.get(`/companies/applicants?opportunityId=${id}`).catch(() => ({ data: { data: [] } })),
        api.get("/companies/me").catch(() => ({ data: { data: null } })),
      ]);

      setCandidates(aiRes.data.data || []);

      if (compRes.data?.data?.name) {
        setCompanyName(compRes.data.data.name);
      }

      if (Array.isArray(appRes.data?.data)) {
        const detailsMap: Record<string, ApplicantDetail> = {};
        for (const app of appRes.data.data) {
          detailsMap[app.id] = {
            status: app.status,
            email: app.student?.user?.email || "",
            jobRole: app.opportunity?.title || "Selected Role",
          };
        }
        setApplicantDetails(detailsMap);
      }
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function handleSendOfferEmail(applicationId: string, studentName: string) {
    const details = applicantDetails[applicationId];
    const email = details?.email;

    if (!email) {
      push("Student email address not found for this applicant.", "error");
      return;
    }

    const result = openOfferMailClient({
      studentName,
      studentEmail: email,
      companyName,
      jobRole: details?.jobRole || "Selected Role",
    });

    if (result.success) {
      push(`Opening email client for ${email}...`, "success");
    } else {
      push(result.error || "Failed to open email client.", "error");
    }
  }

  async function updateStatus(applicationId: string, status: string) {
    setUpdatingId(applicationId);
    try {
      await api.patch(`/companies/applications/${applicationId}/status`, { status });
      push(`Status updated to ${status.replace(/_/g, " ")}`, "success");

      setApplicantDetails((prev) => ({
        ...prev,
        [applicationId]: {
          ...(prev[applicationId] || { email: "", jobRole: "Selected Role" }),
          status,
        },
      }));

      // If status became OFFERED, automatically launch mail client with pre-filled offer
      if (status === "OFFERED") {
        const targetCandidate = candidates.find((c) => c.applicationId === applicationId);
        handleSendOfferEmail(applicationId, targetCandidate?.studentName || "Candidate");
      }
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Applicant Ranking" subtitle="AI-ranked candidates for this posting, best match first." />
      {candidates.length === 0 ? (
        <EmptyState title="No applicants yet" description="Check back once students start applying." />
      ) : (
        <div className="space-y-3">
          {candidates.map((c, i) => {
            const details = applicantDetails[c.applicationId];
            const isOffered = details?.status === "OFFERED";

            return (
              <Card key={c.applicationId} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      #{i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink">{c.studentName}</p>
                        {details?.status && (
                          <Badge tone={isOffered ? "green" : "slate"}>
                            {details.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-faint">
                        {details?.email ? `${details.email} · ` : ""}Match score {c.score}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOffered && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3"
                        onClick={() => handleSendOfferEmail(c.applicationId, c.studentName)}
                        title="Open email client with pre-filled offer details"
                      >
                        <Mail size={14} />
                        Send Offer Email
                      </Button>
                    )}

                    <Select
                      value={details?.status || ""}
                      onChange={(e) => e.target.value && updateStatus(c.applicationId, e.target.value)}
                      className="max-w-[200px]"
                      disabled={updatingId === c.applicationId}
                    >
                      <option value="" disabled>Update status…</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {c.matchedSkills.map((s) => <Badge key={s} tone="green">{s}</Badge>)}
                  {c.missingSkills.map((s) => <Badge key={s} tone="amber">missing: {s}</Badge>)}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
