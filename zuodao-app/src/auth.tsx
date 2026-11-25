import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api, setToken, setUnauthorizedHandler } from './api/client';

export type User = { id: string; username: string; nickname: string };

type Ctx = {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

const KEY_TOKEN = 'zd_token';
const KEY_USER = 'zd_user';

// Web 用 localStorage；原生端如后续安装 AsyncStorage 会自动复用，未安装时保持内存会话。
async function readStore(): Promise<{ token: string | null; user: User | null }> {
  try {
    const g = globalThis as any;
    if (Platform.OS === 'web' && g.localStorage) {
      const t = g.localStorage.getItem(KEY_TOKEN);
      const u = g.localStorage.getItem(KEY_USER);
      return { token: t, user: u ? JSON.parse(u) : null };
    }
    const AsyncStorage = g.__zdAsyncStorage;
    if (AsyncStorage) {
      const t = await AsyncStorage.getItem(KEY_TOKEN);
      const u = await AsyncStorage.getItem(KEY_USER);
      return { token: t, user: u ? JSON.parse(u) : null };
    }
  } catch {}
  return { token: null, user: null };
}

async function writeStore(token: string | null, user: User | null) {
  try {
    const g = globalThis as any;
    if (Platform.OS === 'web' && g.localStorage) {
      if (token) {
        g.localStorage.setItem(KEY_TOKEN, token);
        g.localStorage.setItem(KEY_USER, JSON.stringify(user));
      } else {
        g.localStorage.removeItem(KEY_TOKEN);
        g.localStorage.removeItem(KEY_USER);
      }
    } else if (g.__zdAsyncStorage) {
      if (token) {
        await g.__zdAsyncStorage.setItem(KEY_TOKEN, token);
        await g.__zdAsyncStorage.setItem(KEY_USER, JSON.stringify(user));
      } else {
        await g.__zdAsyncStorage.removeItem(KEY_TOKEN);
        await g.__zdAsyncStorage.removeItem(KEY_USER);
      }
    }
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTok] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    setTok(null);
    setToken(null);
    setUser(null);
    void writeStore(null, null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    readStore().then(({ token: t, user: u }) => {
      if (t && u) {
        setTok(t);
        setToken(t);
        setUser(u);
      }
      setReady(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = async (username: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      token: null,
    });
    setTok(r.token);
    setToken(r.token);
    setUser(r.user);
    await writeStore(r.token, r.user);
  };

  const refresh = async () => {
    const r = await api<{ user: User }>('/api/me');
    setUser(r.user);
    await writeStore(token, r.user);
  };

  const updateNickname = async (nickname: string) => {
    const r = await api<{ user: User }>('/api/me', { method: 'PATCH', body: { nickname } });
    setUser(r.user);
    await writeStore(token, r.user);
  };

  return (
    <AuthCtx.Provider value={{ user, token, ready, login, logout, refresh, updateNickname }}>
      {children}
    </AuthCtx.Provider>
  );
}
