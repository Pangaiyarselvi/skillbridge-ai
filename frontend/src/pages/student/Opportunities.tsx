import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, Input, PageHeader, Select } from "../../components/ui";

interface Opportunity {
  id: string;
  title: string;
  type: "JOB" | "INTERNSHIP";
  location?: string;
  stipendOrSalary?: string;
  description?: string;
  company: { name: string; logoUrl?: string };
  requiredSkills: { skill: { name: string } }[];
}

export default function StudentOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (search) params.search = search;
      if (location) params.location = location;
      const [oppRes, appsRes] = await Promise.all([
        api.get("/students/opportunities", { params }),
        api.get("/students/applications"),
      ]);
      setOpportunities(oppRes.data.data);
      setAppliedIds(new Set(appsRes.data.data.map((a: any) => a.opportunity?.id).filter(Boolean)));
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function apply(id: string) {
    setApplyingId(id);
    try {
      await api.post(`/students/opportunities/${id}/apply`, {});
      setAppliedIds((s) => new Set(s).add(id));
      push("Application submitted!", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setApplyingId(null);
    }
  }

  async function save(id: string) {
    try {
      await api.post(`/students/opportunities/${id}/save`, {});
      push("Saved for later", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Opportunities" subtitle="Browse jobs & internships matched to your profile." />

      <Card className="mb-6 p-4">
        <form onSubmit={onSearch} className="flex flex-wrap gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title" className="max-w-xs" />
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="max-w-[180px]" />
          <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-[160px]">
            <option value="">All types</option>
            <option value="JOB">Jobs</option>
            <option value="INTERNSHIP">Internships</option>
          </Select>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      {loading ? (
        <FullPageSpinner />
      ) : opportunities.length === 0 ? (
        <EmptyState title="No opportunities found" description="Try adjusting your filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {opportunities.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink">{o.title}</h3>
                  <p className="text-sm text-ink-muted">{o.company.name}{o.location ? ` · ${o.location}` : ""}</p>
                </div>
                <Badge tone={o.type === "INTERNSHIP" ? "blue" : "brand"}>{o.type}</Badge>
              </div>
              {o.stipendOrSalary && <p className="mt-2 text-sm font-medium text-growth">{o.stipendOrSalary}</p>}
              {o.description && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{o.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {o.requiredSkills?.slice(0, 5).map((s) => (
                  <Badge key={s.skill.name}>{s.skill.name}</Badge>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => apply(o.id)}
                  disabled={appliedIds.has(o.id)}
                  loading={applyingId === o.id}
                >
                  {appliedIds.has(o.id) ? "Applied" : "Apply now"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => save(o.id)}>
                  Save
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
