import { useState, useEffect, useCallback } from 'react';
import { getAuthSession, clearAuthSession, loginUser as apiLoginUser } from '../api/authApi';
import { AuthSession, LoginResponse } from '../../../core/types';
import { requestNotificationPermission, getFCMToken } from '../../../shared/services/notifications';

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const initSession = useCallback(async () => {
    try {
      await requestNotificationPermission();
      const token = await getFCMToken();
      if (token) setFcmToken(token);

      const saved = await getAuthSession();
      if (saved) {
        setSession(saved);
      }
    } catch (err) {
      console.warn('[useAuth] Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const login = useCallback(
    async (identifier: string, pass: string): Promise<LoginResponse> => {
      const activeFcm = fcmToken || (await getFCMToken());
      const res = await apiLoginUser(identifier, pass, 10000, activeFcm);
      setSession(res);
      return res;
    },
    [fcmToken]
  );

  const logout = useCallback(async () => {
    await clearAuthSession();
    setSession(null);
  }, []);

  return {
    session,
    isAuthenticated: !!session?.token,
    isLoading,
    fcmToken,
    login,
    logout,
    setSession,
  };
}
