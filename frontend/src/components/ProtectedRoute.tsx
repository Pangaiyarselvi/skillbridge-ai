import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, Role } from "../store/authStore";

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { user, accessToken } = useAuthStore();

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
