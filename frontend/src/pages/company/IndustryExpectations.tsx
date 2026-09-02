import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, Input, Label, PageHeader, Textarea } from "../../components/ui";

interface Expectation {
  id: string;
  title: string;
  requiredSkills: string[];
  hiringRoadmap?: string;
  interviewPattern?: string;
  certificationRequirements: string[];
  industryTrends?: string;
}

export default function CompanyIndustryExpectations() {
  const [expectations, setExpectations] = useState<Expectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", requiredSkills: "", hiringRoadmap: "", interviewPattern: "", certificationRequirements: "", industryTrends: "",
  });
  const { push } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/companies/industry-expectations");
      setExpectations(data.data);
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/companies/industry-expectations", {
        title: form.title,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        hiringRoadmap: form.hiringRoadmap || undefined,
        interviewPattern: form.interviewPattern || undefined,
        certificationRequirements: form.certificationRequirements.split(",").map((s) => s.trim()).filter(Boolean),
        industryTrends: form.industryTrends || undefined,
      });
      setExpectations((prev) => [data.data, ...prev]);
      setForm({ title: "", requiredSkills: "", hiringRoadmap: "", interviewPattern: "", certificationRequirements: "", industryTrends: "" });
      push("Published!", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/companies/industry-expectations/${id}`);
      setExpectations((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Industry Expectations" subtitle="Share hiring roadmaps & skill requirements to guide student prep." />

      <Card className="mb-6 p-6">
        <h2 className="font-semibold text-ink">Publish new expectation</h2>
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full Stack Developer 2026 hiring" />
          </div>
          <div>
            <Label>Required skills (comma separated)</Label>
            <Input value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
          </div>
          <div>
            <Label>Certification requirements (comma separated)</Label>
            <Input value={form.certificationRequirements} onChange={(e) => setForm({ ...form, certificationRequirements: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Hiring roadmap</Label>
            <Textarea rows={3} value={form.hiringRoadmap} onChange={(e) => setForm({ ...form, hiringRoadmap: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Interview pattern</Label>
            <Textarea rows={3} value={form.interviewPattern} onChange={(e) => setForm({ ...form, interviewPattern: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Industry trends</Label>
            <Textarea rows={3} value={form.industryTrends} onChange={(e) => setForm({ ...form, industryTrends: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving}>Publish</Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <FullPageSpinner />
      ) : expectations.length === 0 ? (
        <EmptyState title="Nothing published yet" />
      ) : (
        <div className="space-y-4">
          {expectations.map((exp) => (
            <Card key={exp.id} className="p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-ink">{exp.title}</h3>
                <Button size="sm" variant="ghost" onClick={() => remove(exp.id)}>Delete</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {exp.requiredSkills.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
              </div>
              {exp.hiringRoadmap && <p className="mt-2 text-sm text-ink-muted">{exp.hiringRoadmap}</p>}
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
