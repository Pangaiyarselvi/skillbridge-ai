import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useToast, extractErrorMessage } from "../../lib/toast";
import { Button, Input, Label, Select } from "../../components/ui";
import { AuthShell } from "./Login";

const HOME_BY_ROLE: Record<string, string> = {
  STUDENT: "/student",
  COMPANY: "/company",
  COLLEGE: "/college",
};

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", { fullName, email, password, role });
      const result = data.data;
      if (result?.accessToken && result?.user) {
        setSession(result.accessToken, result.user);
        push("Account created!", "success");
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
