import { useEffect, useRef, useState } from 'react';
import { youtubeSearchAsTracks } from '../lib/youtube';
import type { Genre, TrackSearchResult } from '../lib/types';

const DEBOUNCE_MS = 450; // el scrape es un poco más lento que una API → más margen

/**
 * ROCOLA: la búsqueda va DIRECTO a YouTube (scrape, sin cuota). No hay iTunes
 * ni Last.fm. Los resultados ya vienen resueltos a un video (`yt:VIDEOID`), así
 * que al agregarlos no hace falta resolver de nuevo. Se ignoran allowExplicit /
 * allowedGenres (no aplican con YouTube como única fuente).
 */
export function useTrackSearch(
  query: string,
  _allowExplicit: boolean,
  _allowedGenres: Genre[] = [],
) {
  const [results, setResults] = useState<TrackSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const myId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    const handle = window.setTimeout(() => {
      youtubeSearchAsTracks(q)
        .then((r) => { if (reqIdRef.current === myId) setResults(r); })
        .catch((e) => { if (reqIdRef.current === myId) setError(e as Error); })
        .finally(() => { if (reqIdRef.current === myId) setLoading(false); });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query]);

  return { results, loading, error };
}
