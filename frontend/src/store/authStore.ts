import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "STUDENT" | "COMPANY" | "COLLEGE" | "ADMIN";

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser, refreshToken?: string | null) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (accessToken, user, refreshToken = null) =>
        set({ accessToken, user, ...(refreshToken !== undefined && { refreshToken }) }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "skillbridge-auth" }
  )
);

