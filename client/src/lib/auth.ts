import { apiRequest } from "@/lib/queryClient";
import type { LoginData } from "@shared/schema";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
  expiresIn?: number;
}

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const EXP_KEY = "auth_exp"; // epoch seconds when access token expires

let refreshInFlight: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
  if (!r.ok) throw new Error("Unable to refresh session");
  const { token, expiresIn } = (await r.json()) as { token: string; expiresIn?: number };
  localStorage.setItem(TOKEN_KEY, token);
  if (expiresIn) {
    const exp = Math.floor(Date.now() / 1000) + expiresIn;
    localStorage.setItem(EXP_KEY, String(exp));
  }
  return token;
}

export const auth = {
  async login(credentials: LoginData): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const data: AuthResponse = await response.json();
    
    // Store token and user info
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.expiresIn) {
      const exp = Math.floor(Date.now() / 1000) + data.expiresIn;
      localStorage.setItem(EXP_KEY, String(exp));
    }
    
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXP_KEY);
    window.location.href = "/login";
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  async validateToken(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const user: AuthUser = await response.json();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (error) {
      this.logout();
      return null;
    }
  },

  // Helper to add auth headers to requests
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  getExpiryEpoch(): number | null {
    const exp = localStorage.getItem(EXP_KEY);
    return exp ? Number(exp) : null;
  },

  getSecondsUntilExpiry(): number | null {
    const exp = this.getExpiryEpoch();
    if (!exp) return null;
    return exp - Math.floor(Date.now() / 1000);
  },

  async refreshNow(): Promise<string> {
    if (!refreshInFlight) {
      refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  },

  async refreshIfNeeded(minSeconds: number = 30): Promise<void> {
    const remaining = this.getSecondsUntilExpiry();
    if (remaining === null || remaining <= minSeconds) {
      await this.refreshNow();
    }
  },
};

// Override the default queryClient to include auth headers
export async function authenticatedApiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  async function performRequest(accessToken: string | null): Promise<Response> {
    const headers = {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    } as Record<string, string>;

    return fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  }

  // Attach current token
  let res = await performRequest(auth.getToken());

  if (res.status === 401 || res.status === 403) {
    // Try refresh with single-flight
    if (!refreshInFlight) {
      refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }

    try {
      const newToken = await refreshInFlight;
      res = await performRequest(newToken);
    } catch (e) {
      auth.logout();
      throw e;
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.errors?.length) {
        message = body.errors.map((e: any) => `${e.path}: ${e.message}`).join("; ");
      } else if (body?.message) {
        message = body.message;
      }
    } catch {
      const text = (await res.text()) || res.statusText;
      message = text;
    }
    throw new Error(`${res.status}: ${message}`);
  }

  return res;
}
