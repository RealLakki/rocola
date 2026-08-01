// Cliente de la API de datos del VPS (Express + PostgreSQL). Reemplaza a
// src/lib/supabase.ts — mismas firmas para no tocar los call-sites.
// El realtime vive en ./realtime.ts (socket.io).
import type { Genre, QueueItem, ResolvedTrack, TrackSearchResult, Venue } from './types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(`API ${path} failed: ${res.status} ${body.error ?? ''}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/* ────────────────────────── Venue ────────────────────────── */

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  return req<Venue | null>(`/venues?slug=${encodeURIComponent(slug)}`);
}

export async function updateVenue(
  id: string,
  patch: Partial<{
    allowedGenres: Genre[];
    blockedTrackIds: string[];
    requestCooldownSec: number;
    allowExplicit: boolean;
    tipEnabled: boolean;
    tipPriceCop: number;
    name: string;
  }>,
): Promise<void> {
  await req(`/venues/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

/* ────────────────────────── Queue ────────────────────────── */

export async function fetchActiveQueue(venueId: string): Promise<QueueItem[]> {
  return req<QueueItem[]>(`/queue?venueId=${encodeURIComponent(venueId)}`);
}

export async function enqueueTrack(args: {
  venueId: string;
  track: ResolvedTrack;
  requestedBy: string;
  requestedByName?: string;
  boosted?: boolean;
}): Promise<QueueItem> {
  return req<QueueItem>(`/queue`, { method: 'POST', body: JSON.stringify(args) });
}

export async function fetchHouseTrack(
  venueId: string,
  excludeProviderIds: string[] = [],
): Promise<ResolvedTrack | null> {
  const params = new URLSearchParams({ venueId });
  if (excludeProviderIds.length > 0) params.set('exclude', excludeProviderIds.join(','));
  return req<ResolvedTrack | null>(`/house-track?${params}`);
}

export async function setItemStatus(id: string, status: QueueItem['status']): Promise<void> {
  await req(`/queue/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function removeQueueItem(id: string): Promise<void> {
  await req(`/queue/${id}`, { method: 'DELETE' });
}

export async function boostItem(id: string): Promise<void> {
  await req(`/queue/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'boost' }) });
}

/** Revierte un boost: manda la canción al final de la cola. */
export async function unboostItem(id: string, venueId: string): Promise<void> {
  await req(`/queue/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'unboost', venueId }),
  });
}

/* ────────────────────────── Analytics ────────────────────────── */

export interface TopTrackRow {
  providerId: string;
  title: string;
  artists: string[];
  imageUrl: string | null;
  durationMs: number;
  requestCount: number;
  lastRequested: string;
}

/** Top canciones más pedidas en el venue (solo cuenta played/playing). */
export async function getTopTracks(venueId: string, limit = 20): Promise<TopTrackRow[]> {
  return req<TopTrackRow[]>(`/top-tracks?venueId=${encodeURIComponent(venueId)}&limit=${limit}`);
}

/** Convierte un TopTrackRow al formato común TrackSearchResult. */
export function topTrackToSearchResult(row: TopTrackRow): TrackSearchResult {
  return {
    providerId: row.providerId,
    title: row.title,
    artists: row.artists,
    durationMs: row.durationMs,
    imageUrl: row.imageUrl ?? undefined,
  };
}

/* ────────────────────────── YouTube cache ────────────────────────── */

interface CachedResolution {
  youtubeVideoId: string;
  isOfficial: boolean;
  hasVideo: boolean;
}

export async function getCachedYoutubeResolution(
  providerId: string,
): Promise<CachedResolution | null> {
  try {
    return await req<CachedResolution | null>(
      `/youtube-resolutions/${encodeURIComponent(providerId)}`,
    );
  } catch (e) {
    console.warn('[yt-cache] read failed:', e);
    return null;
  }
}

export async function cacheYoutubeResolution(
  providerId: string,
  resolution: CachedResolution,
): Promise<void> {
  try {
    await req(`/youtube-resolutions/${encodeURIComponent(providerId)}`, {
      method: 'PUT',
      body: JSON.stringify(resolution),
    });
  } catch (e) {
    console.warn('[yt-cache] write failed:', e);
  }
}
