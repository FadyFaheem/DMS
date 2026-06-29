import { apiFetch, throwIfNotOk, apiJson, setTokens, clearTokens } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_admin: boolean;
  is_active: boolean;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export async function login(username: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  await throwIfNotOk(res, 'Login failed');
  const data: LoginResponse = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data.user;
}

export function logout() {
  clearTokens();
}

export async function getMe(): Promise<User> {
  return apiJson<User>('/api/auth/me');
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  await throwIfNotOk(res, 'Failed to change password');
}
