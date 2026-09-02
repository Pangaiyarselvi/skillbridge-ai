import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, EmptyState, FullPageSpinner, Input, PageHeader, Select } from "../../components/ui";

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (role) params.role = role;
      if (search) params.search = search;
      const { data } = await api.get("/admin/users", { params });
      setUsers(data.data);
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

  async function toggleActive(u: User) {
    setUpdatingId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/status`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !u.isActive } : x)));
      push(`User ${!u.isActive ? "activated" : "deactivated"}`, "success");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="User Management" subtitle="View and manage every account on the platform." />

      <Card className="mb-6 p-4">
        <form onSubmit={onSearch} className="flex flex-wrap gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email" className="max-w-xs" />
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="max-w-[180px]">
            <option value="">All roles</option>
            <option value="STUDENT">Student</option>
            <option value="COMPANY">Company</option>
            <option value="COLLEGE">College</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      {loading ? (
        <FullPageSpinner />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stroke text-xs uppercase text-ink-faint">
              <tr>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium text-ink">{u.email}</td>
                  <td className="px-5 py-3"><Badge tone="brand">{u.role}</Badge></td>
                  <td className="px-5 py-3"><Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Disabled"}</Badge></td>
                  <td className="px-5 py-3">{u.isEmailVerified ? "✅" : "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" loading={updatingId === u.id} onClick={() => toggleActive(u)}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </DashboardLayout>
  );
}
