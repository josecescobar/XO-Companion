import { api } from '../client';
import type { LoginResponse, RefreshResponse, MeResponse, User } from '@/lib/types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  });
}

export function refresh(refreshToken: string): Promise<RefreshResponse> {
  return api<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    skipAuth: true,
  });
}

export function logout(refreshToken: string): Promise<{ message: string }> {
  return api<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function me(): Promise<MeResponse> {
  return api<MeResponse>('/auth/me');
}
