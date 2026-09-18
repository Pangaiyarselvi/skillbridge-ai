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

  // When deployed on Vercel or live web host, use relative /api (proxied via vercel.json rewrite)
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "/api";
  }

  return "http://localhost:5000/api";
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
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

    // Proxy fallback: If relative /api fails with 404 or Network Error on live host, retry directly via Render backend URL once
    if (
      (!error.response || error.response.status === 404) &&
      !original._fallbackAttempted &&
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      original._fallbackAttempted = true;
      original.baseURL = "https://skillbridge-ai-backend.onrender.com/api";
      return api(original);
    }

    return Promise.reject(error);
  }
);

