import axios from "axios";
import { useAuthStore } from "../store/authStore";

function resolveBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    let clean = envUrl.replace(/\/+$/, "");
    if (!clean.endsWith("/api") && !clean.includes("/api/")) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  // Automatic production fallback: if running on Vercel or any live host
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "https://skillbridge-ai-backend.onrender.com/api";
  }

  return "http://localhost:5000/api";
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true, // sends refreshToken httpOnly cookie when available
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    const url = original.url || "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/signup") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    // Only attempt token refresh for protected endpoints (NOT for login/signup/auth itself)
    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve) => queue.push(resolve));
        return api(original);
      }

      isRefreshing = true;
      try {
        const storedRefreshToken = useAuthStore.getState().refreshToken;
        const { data } = await api.post("/auth/refresh", {
          refreshToken: storedRefreshToken || undefined,
        });

        const newAccessToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newAccessToken);
        queue.forEach((cb) => cb());
        queue = [];
        return api(original);
      } catch (refreshErr) {
        useAuthStore.getState().logout();
        // Redirect to login only if we were trying to access a protected dashboard
        if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/signup")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

