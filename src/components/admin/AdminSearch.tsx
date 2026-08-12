import { useState } from 'react';
import { useTrackSearch } from '../../hooks/useTrackSearch';
import { SearchBar } from '../customer/SearchBar';
import { SongResult } from '../customer/SongResult';
import { GlowCard } from '../common/GlowCard';
import { EmptyState } from '../common/EmptyState';
import type { TrackSearchResult, Venue } from '../../lib/types';

interface Props {
  venue: Venue;
  onAddTrack: (t: TrackSearchResult) => Promise<void>;
  disabledIds: Set<string>;
}

/**
 * Buscador del panel admin: el personal busca en YouTube y agrega a la cola
 * SIN cooldown (usa adminAddTrack, que no aplica el límite de pedidos del
 * cliente). El servidor sigue validando género/bloqueos al encolar.
 */
export function AdminSearch({ venue, onAddTrack, disabledIds }: Props) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const { results: songs, loading, error } = useTrackSearch(
    query,
    venue.allowExplicit,
    venue.allowedGenres,
  );

  const add = async (t: TrackSearchResult) => {
    setAdding(t.providerId);
    try {
      await onAddTrack(t);
    } finally {
      setAdding(null);
    }
  };

  return (
    <GlowCard>
      <h2 className="font-heading text-gold uppercase tracking-widest text-xs mb-3">
        Agregar música{' '}
        <span className="text-ink-dim lowercase tracking-normal">· sin límite</span>
      </h2>

      <SearchBar value={query} onChange={setQuery} />

      {error && (
        <p className="text-danger text-sm text-center mt-2">
          Error de búsqueda — revisa la conexión
        </p>
      )}

      {query.length >= 2 && (
        <div className="space-y-2 mt-3">
          {loading && (
            <p className="text-ink-dim text-center text-sm py-2">Buscando en YouTube…</p>
          )}
          {!loading && songs.length === 0 && (
            <EmptyState title="Sin resultados" description="Prueba con otro nombre" />
          )}
          {songs.map((t) => {
            const dup = disabledIds.has(t.providerId);
            return (
              <SongResult
                key={t.providerId}
                track={t}
                disabled={dup || adding === t.providerId}
                disabledReason={dup ? 'Ya está en la cola' : undefined}
                onAdd={add}
              />
            );
          })}
        </div>
      )}
    </GlowCard>
  );
}
