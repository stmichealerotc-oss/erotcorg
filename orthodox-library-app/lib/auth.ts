/**
 * Auth - connects to real backend JWT login
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const TOKEN_KEY = 'orthlib_token';
const USER_KEY = 'orthlib_user';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

// ── Token storage ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── User storage ───────────────────────────────────────────────────────────

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

export function setCurrentUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getCurrentUser();
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'super-admin';
}

// ── Login / Logout ─────────────────────────────────────────────────────────

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success && data.token) {
      setToken(data.token);
      const user: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        permissions: data.user.permissions || [],
      };
      setCurrentUser(user);
      return { success: true, user };
    }

    return { success: false, error: data.error || 'Login failed' };
  } catch {
    return { success: false, error: 'Cannot reach server. Is the backend running?' };
  }
}

export function logout(): void {
  clearAuth();
}

// ── Auth header helper for API calls ──────────────────────────────────────

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}
