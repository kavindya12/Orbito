import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
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
    if (err.code === 'ECONNABORTED') return 'Request timed out. Is the API running?';
    if (!err.response) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      if (String(apiUrl).includes('localhost')) {
        return 'Cannot reach API. Start the backend locally (npm run dev:api) or set VITE_API_URL on Vercel to your Render URL.';
      }
      return `Cannot reach API at ${apiUrl}. Check Render is online (/api/health) and CORS_ORIGIN includes this site.`;
    }
    return (err.response?.data as { message?: string })?.message || err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export default api;
