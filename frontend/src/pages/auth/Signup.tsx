import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useToast, extractErrorMessage } from "../../lib/toast";
import { Button, Input, Label, Select } from "../../components/ui";
import { AuthShell } from "./Login";
import { STANDARD_BRANCHES } from "../../lib/constants";

const HOME_BY_ROLE: Record<string, string> = {
  STUDENT: "/student",
  COMPANY: "/company",
  COLLEGE: "/college",
};

interface CollegeOption {
  id: string;
  name: string;
  code?: string | null;
}

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [collegeId, setCollegeId] = useState("");
  const [branch, setBranch] = useState("");
  const [phone, setPhone] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const { push } = useToast();

  useEffect(() => {
    let mounted = true;
    async function loadColleges() {
      try {
        const { data } = await api.get("/auth/colleges");
        if (mounted && data.data) {
          const rawColleges: CollegeOption[] = data.data;
          const seen = new Set<string>();
          const uniqueColleges = rawColleges.filter((c) => {
            const key = c.name.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setColleges(uniqueColleges);
        }
      } catch {
        // Non-blocking if colleges cannot be loaded
      }
    }
    loadColleges();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    // Client-side validations
    if (role === "STUDENT") {
      if (phone.trim() && !/^[0-9+\s\-()]{7,25}$/.test(phone.trim())) {
        push("Please enter a valid phone number", "error");
        return;
      }
      if (cgpa.trim()) {
        const numCgpa = parseFloat(cgpa);
        if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
          push("CGPA must be a number between 0 and 10", "error");
          return;
        }
      }
      if (graduationYear.trim()) {
        const numYear = parseInt(graduationYear, 10);
        if (isNaN(numYear) || numYear < 2000 || numYear > 2040) {
          push("Graduation year must be between 2000 and 2040", "error");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      if (role === "STUDENT") {
        if (collegeId) payload.collegeId = collegeId;
        if (branch) payload.branch = branch;
        if (phone.trim()) payload.phone = phone.trim();
        if (cgpa.trim()) payload.cgpa = parseFloat(cgpa);
        if (graduationYear.trim()) payload.graduationYear = parseInt(graduationYear, 10);
      }

      const { data } = await api.post("/auth/signup", payload);
      const result = data.data;
      if (result?.accessToken && result?.user) {
        setSession(result.accessToken, result.user, result.refreshToken);
        push("Account created! Welcome to SkillBridge AI.", "success");
        navigate(HOME_BY_ROLE[result.user.role] ?? "/login", { replace: true });
      } else {
        push("Account created. Please log in.", "success");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join SkillBridge AI as a student, company, or college">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>I am a</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="STUDENT">Student</option>
            <option value="COMPANY">Company</option>
            <option value="COLLEGE">College</option>
          </Select>
        </div>
        <div>
          <Label>Full name</Label>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        {role === "STUDENT" && (
          <>
            <div>
              <Label>College</Label>
              <Select value={collegeId} onChange={(e) => setCollegeId(e.target.value)}>
                <option value="">Select your college (optional)</option>
                {colleges.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}{col.code ? ` (${col.code})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Branch / Specialization</Label>
              <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="">Select your branch (optional)</option>
                {STANDARD_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Phone number</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CGPA (0 - 10)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="8.50"
                />
              </div>
              <div>
                <Label>Graduation year</Label>
                <Input
                  type="number"
                  min="2000"
                  max="2040"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder={String(new Date().getFullYear() + 1)}
                />
              </div>
            </div>
          </>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
