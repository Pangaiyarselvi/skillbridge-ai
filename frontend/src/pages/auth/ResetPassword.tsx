import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import { Button, Input, Label } from "../../components/ui";
import { AuthShell } from "./Login";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      push("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      push("Password reset. Please log in.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="Enter your reset token and a new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Reset token</Label>
          <Input required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token from your email" />
        </div>
        <div>
          <Label>New password</Label>
          <Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div>
          <Label>Confirm new password</Label>
          <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Reset password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
