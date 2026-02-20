import { create } from 'zustand';
import type { User } from '@/lib/types';
import {
  getAccessToken,
  getRefreshToken,
  getPushToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from '@/lib/secure-storage';
import * as authApi from '@/api/endpoints/auth';
import { unregisterPushToken } from '@/api/endpoints/notifications';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Restore session from secure storage on app launch */
  hydrate: () => Promise<void>;

  /** Log in with email/password */
  login: (email: string, password: string) => Promise<void>;

  /** Log out and clear tokens */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();

      if (!accessToken && !refreshToken) {
        set({ isLoading: false });
        return;
      }

      // Try to get user info with existing access token
      if (accessToken) {
        try {
          const meData = await authApi.me();
          set({
            user: {
              id: meData.sub,
              email: meData.email,
              role: meData.role,
              organizationId: meData.organizationId,
              firstName: '',
              lastName: '',
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch {
          // Access token expired, try refresh below
        }
      }

      // Try refresh
      if (refreshToken) {
        try {
          const data = await authApi.refresh(refreshToken);
          await setAccessToken(data.accessToken);
          await setRefreshToken(data.refreshToken);
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch {
          await clearTokens();
        }
      }
    } catch {
      await clearTokens();
    }

    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    await setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const pushToken = await getPushToken();
      if (pushToken) {
        await unregisterPushToken(pushToken).catch(() => {});
      }
    } catch {
      // Ignore push token unregister errors
    }
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Ignore logout API errors
    }
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));
