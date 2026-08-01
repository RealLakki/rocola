import { useCallback, useState } from 'react';
import { youtubeSearchAsTracks } from '../lib/youtube';
import type { TrackSearchResult } from '../lib/types';

/** Búsqueda manual a YouTube — el user la dispara con click. NO debounce
 * porque cada call cuesta 100 unidades de cuota gratis. */
export function useYoutubeFallback() {
  const [results, setResults] = useState<TrackSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [queriedFor, setQueriedFor] = useState<string | null>(null);

  const run = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const r = await youtubeSearchAsTracks(q);
      setResults(r);
      setQueriedFor(q);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setQueriedFor(null);
  }, []);

  return { results, loading, error, queriedFor, run, clear };
}
