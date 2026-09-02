import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, PageHeader, StatCard } from "../../components/ui";

interface Opportunity {
  id: string;
  title: string;
  type: "JOB" | "INTERNSHIP";
  isActive: boolean;
  createdAt: string;
  _count?: { applications: number };
}

export default function CompanyDashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [oppRes, profileRes] = await Promise.all([
          api.get("/companies/opportunities"),
          api.get("/companies/me"),
        ]);
        setOpportunities(oppRes.data.data);
        setProfile(profileRes.data.data);
      } catch (err) {
        push(extractErrorMessage(err), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  const active = opportunities.filter((o) => o.isActive).length;
  const totalApplicants = opportunities.reduce((sum, o) => sum + (o._count?.applications ?? 0), 0);

  return (
    <DashboardLayout>
      <PageHeader
        title={`${profile?.name ?? "Company"} Dashboard`}
        subtitle={
          profile?.verificationStatus === "VERIFIED"
            ? "Your company is verified."
            : `Verification status: ${profile?.verificationStatus ?? "PENDING"}`
        }
        actions={
          <Link to="/company/jobs/new">
            <Button>Post a job / internship</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active postings" value={active} tone="brand" />
        <StatCard label="Total postings" value={opportunities.length} tone="slate" />
        <StatCard label="Total applicants" value={totalApplicants} tone="green" />
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-semibold text-ink">My postings</h2>
        {opportunities.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No postings yet" description="Create your first job or internship posting." action={
              <Link to="/company/jobs/new"><Button>Post now</Button></Link>
            } />
          </div>
        ) : (
          <div className="mt-4 divide-y divide-stroke">
            {opportunities.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{o.title}</p>
                  <p className="text-xs text-ink-faint">{o.type} · {o._count?.applications ?? 0} applicants</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={o.isActive ? "green" : "slate"}>{o.isActive ? "Active" : "Closed"}</Badge>
                  <Link to={`/company/jobs/${o.id}/applicants`}>
                    <Button size="sm" variant="outline">View applicants</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
