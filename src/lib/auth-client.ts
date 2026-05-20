import { createAuthClient } from "better-auth/react";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "https://lampcode-production.up.railway.app";

export const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin : "https://vibe-coder-suite.vercel.app");

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    credentials: "include",
  },
});

export const dashboardCallbackURL = `${APP_URL}/dashboard`;