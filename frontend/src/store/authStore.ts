import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "STUDENT" | "COMPANY" | "COLLEGE" | "ADMIN";

interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: "skillbridge-auth" }
  )
);
