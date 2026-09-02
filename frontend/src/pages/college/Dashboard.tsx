import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Card, EmptyState, FullPageSpinner, PageHeader, StatCard } from "../../components/ui";

interface Student {
  id: string;
  fullName: string;
  department?: string;
  cgpa?: number;
  placementReadinessScore?: number;
}

export default function CollegeDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [placement, setPlacement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, studentsRes, placementRes] = await Promise.all([
          api.get("/colleges/me"),
          api.get("/colleges/students"),
          api.get("/colleges/analytics/placements"),
        ]);
        setProfile(profileRes.data.data);
        setStudents(studentsRes.data.data);
        setPlacement(placementRes.data.data);
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
      <PageHeader
        title={`${profile?.name ?? "College"} Dashboard`}
        subtitle={`Verification status: ${profile?.verificationStatus ?? "PENDING"}`}
        actions={<Link to="/college/analytics" className="text-sm font-medium text-brand-600 hover:underline">View full analytics →</Link>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={placement?.totalStudents ?? students.length} tone="brand" />
        <StatCard label="Students hired" value={placement?.studentsHired ?? 0} tone="green" />
        <StatCard label="Placement rate" value={`${placement?.placementRate ?? 0}%`} tone="green" />
        <StatCard label="Total applications" value={placement?.totalApplications ?? 0} tone="slate" />
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-semibold text-ink">Students</h2>
        {students.length === 0 ? (
          <div className="mt-4"><EmptyState title="No students linked yet" /></div>
        ) : (
          <div className="mt-4 divide-y divide-stroke">
            {students.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{s.fullName}</p>
                  <p className="text-xs text-ink-faint">{s.department ?? "—"} · CGPA {s.cgpa ?? "—"}</p>
                </div>
                <Badge tone="brand">{s.placementReadinessScore ?? 0}% ready</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
