import { randomId, safeLocal, safeSession } from './safeStorage';

export const formatDuration = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatCop = (cop: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cop);

export const joinArtists = (artists: string[]): string => artists.join(', ');

/** Identidad opaca por dispositivo, persistida en sessionStorage. */
export function getClientId(): string {
  const KEY = 'cantina:cid';
  let id = safeSession.getItem(KEY);
  if (!id) {
    id = randomId();
    safeSession.setItem(KEY, id);
  }
  return id;
}

export function getClientName(): string | undefined {
  return safeLocal.getItem('cantina:cname') ?? undefined;
}

export function setClientName(name: string): void {
  safeLocal.setItem('cantina:cname', name.trim().slice(0, 24));
}
