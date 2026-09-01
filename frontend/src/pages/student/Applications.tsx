import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, PageHeader } from "../../components/ui";

interface Application {
  id: string;
  status: string;
  matchScore?: number;
  appliedAt: string;
  opportunity: { title: string; type: string; location?: string; company: { name: string } };
}

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "brand" | "blue"> = {
  APPLIED: "blue",
  SHORTLISTED: "brand",
  INTERVIEW_SCHEDULED: "amber",
  INTERVIEWED: "amber",
  OFFERED: "green",
  HIRED: "green",
  REJECTED: "red",
  WITHDRAWN: "slate",
};

export default function StudentApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const { push } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/students/applications");
      setApplications(data.data);
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw(id: string) {
    setWithdrawingId(id);
    try {
      await api.delete(`/students/applications/${id}`);
      setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, status: "WITHDRAWN" } : a)));
      push("Application withdrawn", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setWithdrawingId(null);
    }
  }

  if (loading) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="My Applications" subtitle="Track the status of every opportunity you've applied to." />
      {applications.length === 0 ? (
        <EmptyState title="No applications yet" description="Head over to Opportunities to apply." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stroke text-xs uppercase text-ink-faint">
              <tr>
                <th className="px-5 py-3">Opportunity</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Match</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Applied</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {applications.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-medium text-ink">{a.opportunity.title}</td>
                  <td className="px-5 py-3 text-ink-muted">{a.opportunity.company.name}</td>
                  <td className="px-5 py-3 text-ink-muted">{a.matchScore != null ? `${Math.round(a.matchScore)}%` : "—"}</td>
                  <td className="px-5 py-3"><Badge tone={STATUS_TONE[a.status] ?? "slate"}>{a.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-5 py-3 text-ink-muted">{new Date(a.appliedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    {!["WITHDRAWN", "REJECTED", "HIRED"].includes(a.status) && (
                      <Button size="sm" variant="outline" loading={withdrawingId === a.id} onClick={() => withdraw(a.id)}>
                        Withdraw
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </DashboardLayout>
  );
}
