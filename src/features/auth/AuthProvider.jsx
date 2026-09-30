import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshSession, setAccessToken, setSessionEndedHandler } from '../../api/client.js';

const AuthContext = createContext(null);

/**
 * Session state for the app. On load it tries to resume a session from the refresh
 * cookie (single-flight, so StrictMode's double effect is harmless).
 *
 * `can(permission)` only decides what the UI SHOWS. Every rule is enforced again by
 * the API; the permission list comes from the server, never from the client.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ status: 'loading', user: null, permissions: [] });

  const applySession = useCallback((session) => {
    setAccessToken(session.accessToken);
    setState({ status: 'authenticated', user: session.user, permissions: session.permissions });
  }, []);

  const endSession = useCallback(
    (reason) => {
      setAccessToken(null);
      queryClient.clear();
      setState({ status: 'anonymous', user: null, permissions: [], reason });
    },
    [queryClient],
  );

  useEffect(() => {
    setSessionEndedHandler((code) => endSession(code === 'REFRESH_TOKEN_MISSING' ? undefined : 'expired'));
    let cancelled = false;
    refreshSession()
      .then((session) => !cancelled && applySession(session))
      .catch(() => !cancelled && setState({ status: 'anonymous', user: null, permissions: [] }));
    return () => {
      cancelled = true;
    };
  }, [applySession, endSession]);

  const login = useCallback(
    async (email, password) => {
      const res = await api.post('/auth/login', { email, password }, { skipAuthRefresh: true });
      applySession(res.data.data);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', undefined, { skipAuthRefresh: true });
    } finally {
      endSession();
    }
  }, [endSession]);

  const value = useMemo(() => {
    const set = new Set(state.permissions);
    return {
      ...state,
      isAdmin: state.user?.role === 'ADMIN',
      can: (permission) => set.has(permission),
      login,
      logout,
    };
  }, [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
