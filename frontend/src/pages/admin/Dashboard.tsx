import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Card, FullPageSpinner, PageHeader, StatCard } from "../../components/ui";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [a, r] = await Promise.all([
          api.get("/admin/analytics/platform"),
          api.get("/admin/monitoring/recent-activity"),
        ]);
        setAnalytics(a.data.data);
        setActivity(r.data.data);
      } catch (err) {
        push(extractErrorMessage(err), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Platform Overview" subtitle="Real-time metrics across the entire SkillBridge AI platform." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total students" value={analytics?.totalStudents ?? 0} tone="brand" />
        <StatCard label="Total companies" value={analytics?.totalCompanies ?? 0} tone="green" />
        <StatCard label="Total colleges" value={analytics?.totalColleges ?? 0} tone="amber" />
        <StatCard label="Active opportunities" value={analytics?.totalOpportunities ?? 0} tone="slate" />
        <StatCard label="Total applications" value={analytics?.totalApplications ?? 0} tone="slate" />
        <StatCard label="Overall placement rate" value={`${analytics?.overallPlacementRate ?? 0}%`} tone="green" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="font-semibold text-ink">Recent signups</h2>
          <div className="mt-3 divide-y divide-stroke">
            {(activity?.recentUsers ?? []).map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="truncate text-ink">{u.email}</span>
                <Badge tone="brand">{u.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-ink">Recent applications</h2>
          <div className="mt-3 divide-y divide-stroke">
            {(activity?.recentApplications ?? []).map((a: any) => (
              <div key={a.id} className="py-2.5 text-sm">
                <p className="text-ink">{a.student?.fullName}</p>
                <p className="text-xs text-ink-faint">applied to {a.opportunity?.title}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-ink">Recent postings</h2>
          <div className="mt-3 divide-y divide-stroke">
            {(activity?.recentOpportunities ?? []).map((o: any) => (
              <div key={o.id} className="py-2.5 text-sm">
                <p className="text-ink">{o.title}</p>
                <p className="text-xs text-ink-faint">{o.company?.name}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
