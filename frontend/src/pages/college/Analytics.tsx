import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, FullPageSpinner, PageHeader, StatCard } from "../../components/ui";

const COLORS = ["#4F7CFF", "#6D5EF0", "#9B5CF6", "#12B76A", "#F59E0B", "#38BDF8"];

export default function CollegeAnalytics() {
  const [placement, setPlacement] = useState<any>(null);
  const [internship, setInternship] = useState<any>(null);
  const [skillGap, setSkillGap] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [p, i, sg, d] = await Promise.all([
          api.get("/colleges/analytics/placements"),
          api.get("/colleges/analytics/internships"),
          api.get("/colleges/analytics/skill-gaps"),
          api.get("/colleges/analytics/departments"),
        ]);
        setPlacement(p.data.data);
        setInternship(i.data.data);
        setSkillGap(sg.data.data);
        setDepartments(d.data.data);
      } catch (err) {
        push(extractErrorMessage(err), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  const statusData = (placement?.statusBreakdown ?? []).map((s: any) => ({ name: s.status, value: s._count }));
  const deptData = departments.map((d: any) => ({
    name: d.department ?? "Unspecified",
    avgReadiness: Math.round(d._avg?.placementReadinessScore ?? 0),
    students: d._count,
  }));

  return (
    <DashboardLayout>
      <PageHeader title="Placement & Skill Analytics" subtitle="A data-driven view of your students' placement journey." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Placement rate" value={`${placement?.placementRate ?? 0}%`} tone="green" />
        <StatCard label="Students hired" value={placement?.studentsHired ?? 0} tone="brand" />
        <StatCard label="Internship applications" value={internship?.totalInternshipApplications ?? 0} tone="slate" />
        <StatCard label="Active internships" value={internship?.activeInternships ?? 0} tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-ink">Application status breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {statusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-ink">Avg. readiness by department</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avgReadiness" fill="#4F7CFF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-semibold text-ink">Top missing skills across students</h2>
        <p className="text-sm text-ink-faint">Based on {skillGap?.studentsAnalyzed ?? 0} recent skill-gap reports.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(skillGap?.topMissingSkills ?? []).length === 0 && <p className="text-sm text-ink-faint">No data yet.</p>}
          {(skillGap?.topMissingSkills ?? []).map((s: any) => (
            <span key={s.skill} className="rounded-full bg-warn-soft px-3 py-1.5 text-sm font-medium text-warn">
              {s.skill} · {s.count}
            </span>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
