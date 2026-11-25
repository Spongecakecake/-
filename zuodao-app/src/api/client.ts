import { Platform } from 'react-native';

// 预览/真机共用同一后端；Web 用当前访问域名，避免局域网访问时仍请求 localhost。
const fallbackWebHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const fallback = Platform.OS === 'web'
  ? `http://${fallbackWebHost}:3001`
  : 'http://192.168.3.11:3001';
export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || fallback).replace(/\/$/, '');

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; token?: string | null; timeout?: number } = {}
): Promise<T> {
  const token = 'token' in opts ? opts.token : currentToken;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? 15000);
  try {
    const res = await fetch(BASE_URL + path, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && path !== '/api/auth/login') unauthorizedHandler?.();
      const msg = (data as any).error || (controller.signal.aborted ? '请求超时' : `请求失败(${res.status})`);
      throw new Error(msg);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

let currentToken: string | null = null;
export function setToken(t: string | null) {
  currentToken = t;
}
export function getToken() {
  return currentToken;
}

export async function copyText(text: string) {
  try {
    const g = globalThis as any;
    if (g.navigator?.clipboard?.writeText) {
      await g.navigator.clipboard.writeText(text);
      return true;
    }
    if (g.document) {
      const input = g.document.createElement('textarea');
      input.value = text;
      g.document.body.appendChild(input);
      input.select();
      g.document.execCommand('copy');
      g.document.body.removeChild(input);
      return true;
    }
  } catch {}
  return false;
}
