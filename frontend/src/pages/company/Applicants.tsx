import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
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

const STATUS_OPTIONS = ["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "OFFERED", "REJECTED", "HIRED"];

export default function CompanyApplicants() {
  const { id } = useParams();
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { push } = useToast();

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/ai/opportunities/${id}/rank-candidates`);
      setCandidates(data.data);
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus(applicationId: string, status: string) {
    setUpdatingId(applicationId);
    try {
      await api.patch(`/companies/applications/${applicationId}/status`, { status });
      push("Status updated", "success");
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
          {candidates.map((c, i) => (
            <Card key={c.applicationId} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                    #{i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{c.studentName}</p>
                    <p className="text-xs text-ink-faint">Match score {c.score}%</p>
                  </div>
                </div>
                <Select
                  defaultValue=""
                  onChange={(e) => e.target.value && updateStatus(c.applicationId, e.target.value)}
                  className="max-w-[220px]"
                  disabled={updatingId === c.applicationId}
                >
                  <option value="" disabled>Update status…</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.matchedSkills.map((s) => <Badge key={s} tone="green">{s}</Badge>)}
                {c.missingSkills.map((s) => <Badge key={s} tone="amber">missing: {s}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
