import { api } from './client';

export type Flag = {
  id: string;
  goalId: string;
  ownerId: string;
  state: string;
  privacy: string;
  proofLevel: string;
  color: string;
  multiplier: number;
  pullEnabled: boolean;
  pullEnabledEffective: boolean;
  highRisk: boolean;
  threatValue: number;
  featured: boolean;
  reviveUntil: string;
  revivedBy: string;
  giftOpenedAt?: string | null;
  canManage: boolean;
  title: string;
  template: string;
  rule: string;
  startDate: string;
  endDate: string;
  progressApproved: number;
  progressTotal: number;
  progressRatio: number;
  defendCount: number;
  temptCount: number;
  hasProof: boolean;
  standings: Standing[];
};

export type Standing = {
  id: string;
  flagId: string;
  userId: string;
  side: string;
  contentType: string;
  content: string;
  status: string;
  featured: boolean;
  pokedCount: number;
  countable: boolean;
  official: boolean;
  createdAt: string;
  reason?: string;
};

export const FLAG_STATE_TEXT: Record<string, string> = {
  pending: '待生效', active: '生效中', fallen: '已掉落', achieved: '已达成', closed: '已落幕', void: '已作废',
};

export const COLOR_TEXT: Record<string, string> = {
  auto: '自动核验 ×1.2', witness: '点验中 ×0.8', self: '仅自证 ×0.5',
};

export function flagField(tab: string, limit = 50) {
  return api<{ flags: any[] }>(`/api/flags/field?tab=${tab}&limit=${limit}`);
}

export function flagMine() {
  return api<{ flags: any[] }>('/api/flags/mine');
}

export function flagDetail(id: string) {
  return api<{ flag: any }>(`/api/flags/${id}`);
}

export function flagCard(id: string) {
  return api<{ card: any }>(`/api/flags/${id}/card`);
}

export function plantFlag(goalId: string, privacy: string, proofLevel: string, pullEnabled: boolean) {
  return api('/api/flags/plant', { method: 'POST', body: { goalId, privacy, proofLevel, pullEnabled } });
}

export function setFlagPrivacy(id: string, privacy: string) {
  return api(`/api/flags/${id}/privacy`, { method: 'POST', body: { privacy } });
}

export function setFlagPull(id: string, enabled: boolean) {
  return api(`/api/flags/${id}/pull`, { method: 'POST', body: { enabled } });
}

export function reviveFlag(id: string) {
  return api(`/api/flags/${id}/revive`, { method: 'POST' });
}

export function standingTemplates() {
  return api<{ templates: { id: string; category: string; text: string; disclaimer: string }[] }>('/api/standings/templates');
}

export function sendStanding(flagId: string, side: string, contentType: string, content: string, templateId: string) {
  return api('/api/standings', { method: 'POST', body: { flagId, side, contentType, content, templateId } });
}

export function featureStanding(id: string) {
  return api(`/api/standings/${id}/feature`, { method: 'POST' });
}

export function pokeStanding(id: string) {
  return api(`/api/standings/${id}/poke`, { method: 'POST' });
}

export function reportStanding(id: string, reason: string) {
  return api(`/api/standings/${id}/report`, { method: 'POST', body: { reason } });
}

export function proofRequests(flagId: string) {
  return api<{ requests: any[] }>(`/api/proofs/requests?flagId=${flagId}`);
}

export function requestProof(flagId: string) {
  return api('/api/proofs/request', { method: 'POST', body: { flagId } });
}

export function submitProof(flagId: string, dataUrl: string, source: string, requestId: string, checkinId: string) {
  return api('/api/proofs/submit', { method: 'POST', body: { flagId, dataUrl, source, requestId, checkinId } });
}

export function pointsSummary() {
  return api<{ points: any }>('/api/points/summary');
}

export function pointsLedger() {
  return api<{ ledger: any[] }>('/api/points/ledger');
}

export function pointsShop() {
  return api<{ items: any[] }>('/api/points/shop');
}

export function buyPointsItem(sku: string) {
  return api('/api/points/shop/buy', { method: 'POST', body: { sku } });
}

export function leaderboard(side: string) {
  return api<{ rows: any[]; season: string }>(`/api/points/leaderboard?side=${side}`);
}

export function trustMe() {
  return api<{ trust: any }>('/api/trust/me');
}

export function adminOverview() {
  return api<{ config: any }>('/api/admin/overview');
}

export function adminModeration() {
  return api<{ standings: any[]; reports: any[] }>('/api/admin/moderation');
}

export function adminMetrics() {
  return api<{ metrics: any }>('/api/admin/metrics');
}

export function track(type: string, extra: any = {}) {
  return api('/api/events/collect', { method: 'POST', body: { type, ...extra } }).catch(() => undefined);
}
