import { useCallback, useEffect, useRef } from 'react';
import { enqueueTrack, fetchHouseTrack } from '../lib/api';
import type { Genre, QueueItem, ResolvedTrack } from '../lib/types';

interface Args {
  venueId: string;
  queued: QueueItem[];
  nowPlaying: QueueItem | null;
  /** Si está poblado, las canciones del filler se filtran por estos géneros. */
  allowedGenres?: Genre[];
  /** Si false, no auto-fill (modo silencio voluntario). */
  enabled?: boolean;
  /** Cuántos ms esperar antes de inyectar el pre-fetched cuando hay silencio
   *  (margen para que admin meta algo manualmente). Default 1500ms. */
  silenceMs?: number;
}

const PREFETCH_RETRY_MS = 10_000;
const SILENCE_RETRY_MS = 8_000;

/**
 * Auto-fill con "Las de siempre" cuando la cola se queda vacía. Estrategia:
 *
 * 1. PRE-FETCH: apenas `queued.length === 0`, empieza a buscar/resolver una
 *    canción de la casa en background, AUNQUE haya nowPlaying. Resultado
 *    queda en `prefetchedRef`.
 * 2. INJECT: cuando además se acaba el silencio (no nowPlaying + queue vacía),
 *    espera `silenceMs` y enqueue el pre-fetched instantáneamente. Si admin
 *    agregó algo en ese tiempo, descarta el pre-fetched.
 *
 * Tiempo total de silencio: ~1.5-2s (vs 8-10s sin pre-fetch).
 */
export function useHouseFiller({
  venueId,
  queued,
  nowPlaying,
  allowedGenres = [],
  enabled = true,
  silenceMs = 1500,
}: Args) {
  // Memo del key para deps stable
  const genresKey = allowedGenres.slice().sort().join(',');
  const prefetchedRef = useRef<ResolvedTrack | null>(null);
  const fetchingRef = useRef(false);
  const injectingRef = useRef(false);
  const enqueueTimerRef = useRef<number | null>(null);
  const triedProviderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    triedProviderIdsRef.current.clear();
    prefetchedRef.current = null;
  }, [genresKey]);

  const fetchCatalogTrack = useCallback(async (label: string): Promise<ResolvedTrack | null> => {
    const excludeProviderIds = new Set<string>(triedProviderIdsRef.current);
    queued.forEach((item) => excludeProviderIds.add(item.track.providerId));
    if (nowPlaying) excludeProviderIds.add(nowPlaying.track.providerId);

    const track = await fetchHouseTrack(venueId, [...excludeProviderIds]);
    if (!track) {
      console.warn(`[house-filler] ${label}: no curated track available`);
      return null;
    }

    triedProviderIdsRef.current.add(track.providerId);
    console.log(`[house-filler] ${label}: picked`, track.title, 'by', track.artists[0]);
    return track;
  }, [nowPlaying, queued, venueId]);

  // ─── Pre-fetch en background ───
  // Apenas la cola se queda vacía, busca y resuelve una canción para tenerla lista.
  useEffect(() => {
    if (!enabled) return;
    if (queued.length > 0) {
      // Cola tiene canciones, no necesitamos pre-fetch
      prefetchedRef.current = null;
      return;
    }

    let cancelled = false;
    const attemptPrefetch = async () => {
      if (cancelled || prefetchedRef.current || fetchingRef.current) return;
      fetchingRef.current = true;
      console.log('[house-filler] pre-fetching backup track...');
      try {
        const resolved = await fetchCatalogTrack('pre-fetch');
        if (cancelled) return;
        if (!resolved) {
          console.warn('[house-filler] pre-fetch: no valid candidate found');
          return;
        }
        prefetchedRef.current = resolved;
        console.log('[house-filler] pre-fetched:', resolved.title, 'by', resolved.artists[0]);
      } catch (e) {
        console.error('[house-filler] pre-fetch error:', e);
      } finally {
        fetchingRef.current = false;
      }
    };

    void attemptPrefetch();
    const retry = window.setInterval(() => { void attemptPrefetch(); }, PREFETCH_RETRY_MS);
    return () => {
      cancelled = true;
      window.clearInterval(retry);
    };
  }, [queued.length, enabled, genresKey, fetchCatalogTrack]);

  // ─── Inject cuando hay silencio ───
  useEffect(() => {
    if (!enabled) return;
    const isSilence = !nowPlaying && queued.length === 0;
    if (!isSilence) {
      // Cancelar timer pendiente si la cola se llenó
      if (enqueueTimerRef.current) {
        window.clearTimeout(enqueueTimerRef.current);
        enqueueTimerRef.current = null;
      }
      injectingRef.current = false;
      return;
    }
    if (enqueueTimerRef.current) return;

    let cancelled = false;
    const tryInject = async () => {
      if (cancelled || injectingRef.current) return;
      injectingRef.current = true;
      enqueueTimerRef.current = null;

      const track = prefetchedRef.current ?? await fetchCatalogTrack('silence');
      if (cancelled) {
        injectingRef.current = false;
        return;
      }
      if (track) {
        prefetchedRef.current = null;
        try {
          await enqueueTrack({
            venueId,
            track,
            requestedBy: 'house',
            requestedByName: 'La casa',
          });
          console.log('[house-filler] injected:', track.title);
        } catch (e) {
          console.error('[house-filler] inject failed:', e);
          injectingRef.current = false;
        }
        return;
      }

      console.warn('[house-filler] silence: no valid track yet, will retry');
      injectingRef.current = false;
    };

    enqueueTimerRef.current = window.setTimeout(() => { void tryInject(); }, silenceMs);
    const retry = window.setInterval(() => { void tryInject(); }, SILENCE_RETRY_MS);

    return () => {
      cancelled = true;
      if (enqueueTimerRef.current) {
        window.clearTimeout(enqueueTimerRef.current);
        enqueueTimerRef.current = null;
      }
      window.clearInterval(retry);
    };
  }, [nowPlaying, queued.length, enabled, silenceMs, venueId, genresKey, fetchCatalogTrack]);
}
