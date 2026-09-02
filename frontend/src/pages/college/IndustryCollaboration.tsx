import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, Input, Label, PageHeader, Select, Textarea } from "../../components/ui";

interface Partnership {
  id: string;
  type: string;
  title: string;
  description?: string;
  company?: { name: string };
  startDate?: string;
  endDate?: string;
}

export default function CollegeIndustryCollaboration() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "MOU", description: "", startDate: "", endDate: "" });
  const { push } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/colleges/partnerships");
      setPartnerships(data.data);
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
      const { data } = await api.post("/colleges/partnerships", {
        title: form.title,
        type: form.type,
        description: form.description || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setPartnerships((prev) => [data.data, ...prev]);
      setForm({ title: "", type: "MOU", description: "", startDate: "", endDate: "" });
      push("Partnership added", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/colleges/partnerships/${id}`);
      setPartnerships((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Industry Collaboration" subtitle="Track MOUs, workshops, FDPs, and research partnerships." />

      <Card className="mb-6 p-6">
        <h2 className="font-semibold text-ink">Add a partnership</h2>
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="MOU">MOU</option>
              <option value="FDP">FDP</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="RESEARCH_PROJECT">Research Project</option>
            </Select>
          </div>
          <div>
            <Label>Start date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving}>Add partnership</Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <FullPageSpinner />
      ) : partnerships.length === 0 ? (
        <EmptyState title="No partnerships recorded yet" />
      ) : (
        <div className="space-y-3">
          {partnerships.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink">{p.title}</h3>
                    <Badge tone="brand">{p.type}</Badge>
                  </div>
                  {p.company?.name && <p className="mt-1 text-sm text-ink-muted">with {p.company.name}</p>}
                  {p.description && <p className="mt-2 text-sm text-ink-muted">{p.description}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
