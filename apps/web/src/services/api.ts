import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

function resolveApiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  // GitHub Pages is static-only — do not POST to /api on github.io (that returns 405).
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    return 'http://127.0.0.1:9'; // unreachable; error handler shows a clear message
  }
  if (import.meta.env.PROD) return '/api';
  return 'http://localhost:4000/api';
}

const api = axios.create({
  baseURL: resolveApiBase(),
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

function isAuthPath(url?: string) {
  if (!url) return false;
  return url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register');
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthPath(original.url)
    ) {
      original._retry = true;
      refreshing =
        refreshing ||
        api
          .post('/auth/refresh')
          .then((r) => {
            useAuthStore.getState().setAccessToken(r.data.accessToken);
            if (r.data.user) useAuthStore.getState().setUser(r.data.user);
            return r.data.accessToken as string;
          })
          .catch(() => {
            useAuthStore.getState().logout();
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      const token = await refreshing;
      if (token) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 405) {
      return 'This GitHub Pages site is UI-only. For login, run locally: npm run dev:api and npm run dev:web';
    }
    if (err.code === 'ECONNABORTED') return 'Request timed out. Is the API running?';
    if (!err.response) {
      if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
        return 'No API on GitHub Pages. Run locally: npm run dev:api and npm run dev:web';
      }
      return 'Cannot reach API. Start the backend with npm run dev:api';
    }
    return (err.response?.data as { message?: string })?.message || err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export default api;
