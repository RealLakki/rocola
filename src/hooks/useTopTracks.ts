import { useCallback, useEffect, useState } from 'react';
import { getTopTracks, type TopTrackRow } from '../lib/api';
import { onVenueEvent } from '../lib/realtime';

/**
 * Carga las canciones más pedidas para un venue. Refresca cada 30s y cuando
 * hay cambios en la cola (algo se reprodujo / se agregó).
 */
export function useTopTracks(venueId: string | undefined, limit = 20) {
  const [tracks, setTracks] = useState<TopTrackRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!venueId) return;
    try {
      const data = await getTopTracks(venueId, limit);
      setTracks(data);
    } catch (e) {
      console.warn('[top-tracks] failed:', e);
    }
  }, [venueId, limit]);

  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));

    // Refresca cuando algo cambia en la cola (después de played/skipped).
    const off = onVenueEvent(venueId, 'queue:changed', () => { void refresh(); });
    // Polling adicional cada 30s por si el realtime perdió algún evento.
    const interval = window.setInterval(() => { void refresh(); }, 30_000);

    return () => {
      off();
      window.clearInterval(interval);
    };
  }, [venueId, refresh]);

  return { tracks, loading, refresh };
}
