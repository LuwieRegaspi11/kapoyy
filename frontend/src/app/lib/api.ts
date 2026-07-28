// src/app/lib/api.ts
// Central API client for the Alumni Tracer & Donation Management backend.
// All contexts (Auth, Donations, Events, JobBoard, Notifications) and any page
// that needs live data should go through this module instead of touching
// `fetch` directly, so the base URL, auth header, and error handling stay
// consistent in one place.

export const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'ac_alumni_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore (e.g. private browsing) */ }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T = any>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Is the backend running?', 0);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : undefined;

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
};
