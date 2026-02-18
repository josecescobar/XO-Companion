import { Role } from '@xo/shared';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RefreshResponse extends AuthTokens {
  user: User;
}

export interface MeResponse {
  sub: string;
  email: string;
  role: Role;
  organizationId: string;
  iat: number;
  exp: number;
}
