import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, PageHeader } from "../../components/ui";

interface Org {
  id: string;
  name: string;
  verificationStatus: string;
  _count?: { opportunities?: number; students?: number };
}

export default function AdminVerification() {
  const [companies, setCompanies] = useState<Org[]>([]);
  const [colleges, setColleges] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { push } = useToast();

  async function load() {
    try {
      const [c, col] = await Promise.all([
        api.get("/admin/companies", { params: { status: "PENDING" } }),
        api.get("/admin/colleges", { params: { status: "PENDING" } }),
      ]);
      setCompanies(c.data.data);
      setColleges(col.data.data);
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function verify(kind: "companies" | "colleges", id: string, status: "VERIFIED" | "REJECTED") {
    setUpdatingId(id);
    try {
      await api.patch(`/admin/${kind}/${id}/verify`, { status });
      if (kind === "companies") setCompanies((prev) => prev.filter((c) => c.id !== id));
      else setColleges((prev) => prev.filter((c) => c.id !== id));
      push(`Marked as ${status.toLowerCase()}`, "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Verification Queue" subtitle="Approve or reject pending companies and colleges." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-ink">Companies pending verification</h2>
          {companies.length === 0 ? (
            <div className="mt-4"><EmptyState title="All caught up!" /></div>
          ) : (
            <div className="mt-4 space-y-3">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-stroke p-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{c.name}</p>
                    <Badge tone="amber">PENDING</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={updatingId === c.id} onClick={() => verify("companies", c.id, "VERIFIED")}>Approve</Button>
                    <Button size="sm" variant="outline" loading={updatingId === c.id} onClick={() => verify("companies", c.id, "REJECTED")}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-ink">Colleges pending verification</h2>
          {colleges.length === 0 ? (
            <div className="mt-4"><EmptyState title="All caught up!" /></div>
          ) : (
            <div className="mt-4 space-y-3">
              {colleges.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-stroke p-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{c.name}</p>
                    <Badge tone="amber">PENDING</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={updatingId === c.id} onClick={() => verify("colleges", c.id, "VERIFIED")}>Approve</Button>
                    <Button size="sm" variant="outline" loading={updatingId === c.id} onClick={() => verify("colleges", c.id, "REJECTED")}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
