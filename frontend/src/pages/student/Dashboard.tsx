import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, FullPageSpinner, PageHeader, StatCard, Badge, Button } from "../../components/ui";

interface Application {
  id: string;
  status: string;
  matchScore?: number;
  opportunity: { title: string; type: string; company: { name: string } };
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [readiness, setReadiness] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, appsRes, readinessRes] = await Promise.all([
          api.get("/students/me"),
          api.get("/students/applications"),
          api.get("/ai/readiness-score"),
        ]);
        setProfile(profileRes.data.data);
        setApplications(appsRes.data.data);
        setReadiness(readinessRes.data.data.placementReadinessScore);
      } catch (err) {
        push(extractErrorMessage(err), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  const skillCount = profile?.skills?.length ?? 0;
  const activeApplications = applications.filter((a) => !["REJECTED", "WITHDRAWN"].includes(a.status)).length;
  const hired = applications.filter((a) => a.status === "HIRED").length;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${profile?.fullName?.split(" ")[0] ?? "there"} 👋`}
        subtitle="Here's a snapshot of your placement journey."
        actions={
          <Link to="/student/opportunities">
            <Button>Browse opportunities</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Placement readiness" value={`${readiness ?? 0}%`} tone="brand" />
        <StatCard label="Skills tracked" value={skillCount} tone="green" />
        <StatCard label="Active applications" value={activeApplications} tone="amber" />
        <StatCard label="Offers / hires" value={hired} tone="green" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Recent applications</h2>
            <Link to="/student/applications" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 divide-y divide-stroke">
            {applications.length === 0 && <p className="py-6 text-sm text-ink-faint">You haven't applied to anything yet.</p>}
            {applications.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{a.opportunity.title}</p>
                  <p className="text-xs text-ink-faint">{a.opportunity.company.name} · {a.opportunity.type}</p>
                </div>
                <Badge tone={a.status === "HIRED" ? "green" : a.status === "REJECTED" ? "red" : "brand"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-ink">Quick actions</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/student/ai-hub" className="rounded-lg border border-stroke px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2">
              ✨ View AI recommendations
            </Link>
            <Link to="/student/profile" className="rounded-lg border border-stroke px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2">
              👤 Update profile & resume
            </Link>
            <Link to="/student/mock-interview" className="rounded-lg border border-stroke px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2">
              🎤 Practice mock interview
            </Link>
            <Link to="/student/mentor" className="rounded-lg border border-stroke px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2">
              💬 Chat with AI mentor
            </Link>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
