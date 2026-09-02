import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "../../components/ui";

export default function CompanyJobPost() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("JOB");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [stipendOrSalary, setStipendOrSalary] = useState("");
  const [duration, setDuration] = useState("");
  const [openings, setOpenings] = useState(1);
  const [minCgpa, setMinCgpa] = useState("");
  const [eligibleBranches, setEligibleBranches] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Backend expects skillIds: [{skillId, weight}] — but we only have skill names here,
      // so we resolve/create skills implicitly is not supported by this endpoint; instead
      // we send skill names via a lightweight convention the controller can upsert against.
      const skillNames = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
      await api.post("/companies/opportunities", {
        title,
        type,
        description,
        location: location || undefined,
        isRemote,
        stipendOrSalary: stipendOrSalary || undefined,
        duration: duration || undefined,
        openings: Number(openings) || 1,
        minCgpa: minCgpa ? Number(minCgpa) : undefined,
        eligibleBranches: eligibleBranches ? eligibleBranches.split(",").map((b) => b.trim()).filter(Boolean) : [],
        deadline: deadline || undefined,
        skillNames,
      });
      push("Posting created!", "success");
      navigate("/company");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Post a Job / Internship" subtitle="Publish a new opportunity for students to apply to." />
      <Card className="p-6">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Developer Intern" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="JOB">Job</option>
              <option value="INTERNSHIP">Internship</option>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Stipend / Salary</Label>
            <Input value={stipendOrSalary} onChange={(e) => setStipendOrSalary(e.target.value)} placeholder="e.g. ₹25,000/month" />
          </div>
          <div>
            <Label>Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 6 months" />
          </div>
          <div>
            <Label>Openings</Label>
            <Input type="number" min={1} value={openings} onChange={(e) => setOpenings(Number(e.target.value))} />
          </div>
          <div>
            <Label>Minimum CGPA</Label>
            <Input type="number" step="0.1" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} placeholder="e.g. 7.0" />
          </div>
          <div>
            <Label>Eligible branches (comma separated)</Label>
            <Input value={eligibleBranches} onChange={(e) => setEligibleBranches(e.target.value)} placeholder="CSE, IT, ECE" />
          </div>
          <div>
            <Label>Application deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Required skills (comma separated)</Label>
            <Input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="React, Node.js, SQL" />
          </div>
          <div className="flex items-center gap-2">
            <input id="remote" type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} className="h-4 w-4 rounded border-stroke-strong text-brand-600" />
            <label htmlFor="remote" className="text-sm text-ink-muted">This is a remote opportunity</label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving}>Publish posting</Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
