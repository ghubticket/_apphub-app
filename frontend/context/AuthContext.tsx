'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type AuthUser = {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  role?: string;
};

type LoginPayload = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  remember: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (payload: LoginPayload, remember: boolean) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
};

const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  sessionId: 'sessionId',
  user: 'user',
};

const DEFAULT_STATE = {
  user: null as AuthUser | null,
  accessToken: null as string | null,
  refreshToken: null as string | null,
  sessionId: null as string | null,
  remember: false,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const removeAuthData = (storage: Storage) => {
  Object.values(STORAGE_KEYS).forEach((key) => storage.removeItem(key));
};

const serializeUser = (user: AuthUser | null) => {
  if (!user) return '';
  return JSON.stringify(user);
};

const deserializeUser = (raw: string | null): AuthUser | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readStoredAuth = (): typeof DEFAULT_STATE => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_STATE };
  }

  const storages = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    const accessToken = storage.getItem(STORAGE_KEYS.accessToken);
    if (accessToken) {
      const refreshToken = storage.getItem(STORAGE_KEYS.refreshToken);
      const sessionId = storage.getItem(STORAGE_KEYS.sessionId);
      const user = deserializeUser(storage.getItem(STORAGE_KEYS.user));
      return {
        user,
        accessToken,
        refreshToken,
        sessionId,
        remember: storage === window.localStorage,
      };
    }
  }

  return { ...DEFAULT_STATE };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<typeof DEFAULT_STATE>({ ...DEFAULT_STATE });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const restore = () => {
      setState(readStoredAuth());
      setIsReady(true);
    };

    restore();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && Object.values(STORAGE_KEYS).includes(event.key)) {
        restore();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback((payload: LoginPayload, remember: boolean) => {
    if (typeof window !== 'undefined') {
      const targetStorage = remember ? window.localStorage : window.sessionStorage;
      const secondaryStorage = remember ? window.sessionStorage : window.localStorage;

      targetStorage.setItem(STORAGE_KEYS.accessToken, payload.accessToken);
      targetStorage.setItem(STORAGE_KEYS.refreshToken, payload.refreshToken);
      if (payload.sessionId) {
        targetStorage.setItem(STORAGE_KEYS.sessionId, payload.sessionId);
      } else {
        targetStorage.removeItem(STORAGE_KEYS.sessionId);
      }
      targetStorage.setItem(STORAGE_KEYS.user, serializeUser(payload.user));

      removeAuthData(secondaryStorage);
    }

    setState({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      sessionId: payload.sessionId ?? null,
      remember,
    });
    setIsReady(true);
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      removeAuthData(window.localStorage);
      removeAuthData(window.sessionStorage);
    }
    setState({ ...DEFAULT_STATE });
    setIsReady(true);
  }, []);

  const updateUser = useCallback((user: AuthUser) => {
    if (typeof window !== 'undefined') {
      const targetStorage = state.remember ? window.localStorage : window.sessionStorage;
      targetStorage.setItem(STORAGE_KEYS.user, serializeUser(user));
    }
    setState((prev) => ({
      ...prev,
      user,
    }));
  }, [state.remember]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      sessionId: state.sessionId,
      remember: state.remember,
      isAuthenticated: Boolean(state.user),
      isReady,
      login,
      logout,
      updateUser,
    }),
    [state, isReady, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

