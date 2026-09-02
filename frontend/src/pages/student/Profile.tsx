import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, FullPageSpinner, Input, Label, PageHeader, Select } from "../../components/ui";

interface StudentSkill {
  id: string;
  proficiency: string;
  skill: { id: string; name: string };
}

export default function StudentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [proficiency, setProficiency] = useState("BEGINNER");
  const { push } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/students/me");
      setProfile(data.data);
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { fullName, phone, bio, department, degree, branch, currentSemester, cgpa, graduationYear, githubUrl, linkedinUrl, portfolioUrl } = profile;
      const { data } = await api.put("/students/me", {
        fullName, phone, bio, department, degree, branch,
        currentSemester: currentSemester ? Number(currentSemester) : null,
        cgpa: cgpa ? Number(cgpa) : null,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        githubUrl, linkedinUrl, portfolioUrl,
      });
      setProfile((p: any) => ({ ...p, ...data.data }));
      push("Profile updated", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function onResumeChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const form = new FormData();
      form.append("resume", file);
      const { data } = await api.post("/students/me/resume", form, { headers: { "Content-Type": "multipart/form-data" } });
      setProfile((p: any) => ({ ...p, resumeUrl: data.data.resumeUrl }));
      push("Resume uploaded", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setUploadingResume(false);
    }
  }

  async function addSkill(e: FormEvent) {
    e.preventDefault();
    if (!skillName.trim()) return;
    try {
      const { data } = await api.post("/students/me/skills", { name: skillName.trim(), proficiency });
      setProfile((p: any) => ({
        ...p,
        skills: [...(p.skills ?? []).filter((s: StudentSkill) => s.skill.name !== skillName.trim()), data.data],
      }));
      setSkillName("");
      push("Skill added", "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  }

  async function removeSkill(skillId: string) {
    try {
      await api.delete(`/students/me/skills/${skillId}`);
      setProfile((p: any) => ({ ...p, skills: p.skills.filter((s: StudentSkill) => s.skill.id !== skillId) }));
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  }

  if (loading || !profile) return <DashboardLayout><FullPageSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Profile & Skills" subtitle="Keep your profile complete for the best AI-powered matches." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold text-ink">Personal details</h2>
          <form onSubmit={saveProfile} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={profile.fullName ?? ""} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={profile.department ?? ""} onChange={(e) => setProfile({ ...profile, department: e.target.value })} />
            </div>
            <div>
              <Label>Degree</Label>
              <Input value={profile.degree ?? ""} onChange={(e) => setProfile({ ...profile, degree: e.target.value })} />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={profile.branch ?? ""} onChange={(e) => setProfile({ ...profile, branch: e.target.value })} />
            </div>
            <div>
              <Label>Current semester</Label>
              <Input type="number" value={profile.currentSemester ?? ""} onChange={(e) => setProfile({ ...profile, currentSemester: e.target.value })} />
            </div>
            <div>
              <Label>CGPA</Label>
              <Input type="number" step="0.01" value={profile.cgpa ?? ""} onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })} />
            </div>
            <div>
              <Label>Graduation year</Label>
              <Input type="number" value={profile.graduationYear ?? ""} onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })} />
            </div>
            <div>
              <Label>GitHub URL</Label>
              <Input value={profile.githubUrl ?? ""} onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })} />
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <Input value={profile.linkedinUrl ?? ""} onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Portfolio URL</Label>
              <Input value={profile.portfolioUrl ?? ""} onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-ink">Resume</h2>
          <p className="mt-1 text-sm text-ink-muted">Upload your resume for AI analysis and applications.</p>
          {profile.resumeUrl ? (
            <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm font-medium text-brand-600 hover:underline">
              View current resume
            </a>
          ) : (
            <p className="mt-3 text-sm text-ink-faint">No resume uploaded yet.</p>
          )}
          <label className="mt-4 block">
            <span className="sr-only">Upload resume</span>
            <input type="file" accept=".pdf,.doc,.docx" onChange={onResumeChange} disabled={uploadingResume}
              className="block w-full text-sm text-ink-muted file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100" />
          </label>
          {uploadingResume && <p className="mt-2 text-xs text-ink-faint">Uploading…</p>}

          <div className="mt-6 border-t border-stroke pt-4">
            <p className="text-sm font-medium text-ink">Placement readiness</p>
            <p className="mt-1 text-2xl font-bold text-brand-600">{profile.placementReadinessScore ?? 0}%</p>
            <p className="text-sm font-medium text-ink mt-3">ATS score</p>
            <p className="mt-1 text-2xl font-bold text-growth">{profile.atsScore ?? 0}%</p>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-semibold text-ink">Skills</h2>
        <form onSubmit={addSkill} className="mt-4 flex flex-wrap gap-2">
          <Input value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. React" className="max-w-xs" />
          <Select value={proficiency} onChange={(e) => setProficiency(e.target.value)} className="max-w-[160px]">
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="EXPERT">Expert</option>
          </Select>
          <Button type="submit">Add skill</Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {(profile.skills ?? []).length === 0 && <p className="text-sm text-ink-faint">No skills added yet.</p>}
          {(profile.skills ?? []).map((s: StudentSkill) => (
            <span key={s.id} className="flex items-center gap-2 rounded-full bg-surface-3 px-3 py-1.5 text-sm text-ink">
              {s.skill.name}
              <Badge tone="brand">{s.proficiency}</Badge>
              <button onClick={() => removeSkill(s.skill.id)} className="text-ink-faint hover:text-danger" aria-label={`Remove ${s.skill.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
