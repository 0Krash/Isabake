import { useCallback, useEffect, useState } from 'react';

import {
  getCurrentSession,
  checkSession,
  login,
  logout,
  register,
  refreshSession,
} from '../../data/auth/authService';

export default function useAuthSession({ autoLoad = true } = {}) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextSession = await getCurrentSession();
      setSession(nextSession);
      return nextSession;
    } catch (nextError) {
      setError(String(nextError?.message || nextError));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithPassword = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const nextSession = await login(credentials);
      setSession(nextSession);
      return nextSession;
    } catch (nextError) {
      setError(String(nextError?.message || nextError));
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerWithPassword = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const nextSession = await register(credentials);
      setSession(nextSession);
      return nextSession;
    } catch (nextError) {
      setError(String(nextError?.message || nextError));
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await logout({ session });
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const refreshTokens = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextSession = await refreshSession({ session });
      setSession(nextSession);
      return nextSession;
    } catch (nextError) {
      setSession(null);
      setError(String(nextError?.message || nextError));
      throw nextError;
    } finally {
      setRefreshing(false);
    }
  }, [session]);

  const verifySession = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextSession = await checkSession({ session });
      setSession(nextSession);
      return nextSession;
    } catch (nextError) {
      setError(String(nextError?.message || nextError));
      throw nextError;
    } finally {
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  return {
    error,
    loading,
    login: loginWithPassword,
    logout: logoutSession,
    refreshSession: refreshTokens,
    refreshing,
    refresh,
    register: registerWithPassword,
    session,
    verifySession,
  };
}
