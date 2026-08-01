import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { useTopTracks } from '../../hooks/useTopTracks';
import { topTrackToSearchResult, type TopTrackRow } from '../../lib/api';
import { joinArtists } from '../../utils/formatters';
import { confirmAdd } from '../../utils/animations';
import { GlowCard } from '../common/GlowCard';
import type { TrackSearchResult } from '../../lib/types';

interface Props {
  venueId: string;
  /** Si pasas un handler, cada fila muestra un botón + para agregar la canción. */
  onAddTrack?: (track: TrackSearchResult) => Promise<void> | void;
  /** Si pasas un set de providerIds bloqueados/duplicados, su botón aparece deshabilitado. */
  disabledIds?: Set<string>;
  /** Cantidad máxima a mostrar (default 15). */
  limit?: number;
  /** Texto del header (default "Más pedidas"). */
  title?: string;
}

/**
 * Ranking de canciones más pedidas en el bar. Útil para el dueño:
 * detectar hits, identificar patrones, decidir qué bloquear/promover.
 * Si se pasa `onAddTrack`, el cliente puede agregar directamente desde aquí.
 */
export function TopTracksCard({
  venueId, onAddTrack, disabledIds, limit = 15, title = 'Más pedidas',
}: Props) {
  const { tracks, loading } = useTopTracks(venueId, limit);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const els = listRef.current.querySelectorAll('.top-row');
    if (els.length > 0) {
      anime({
        targets: els,
        translateY: [10, 0],
        opacity: [0, 1],
        duration: 500,
        delay: anime.stagger(45),
        easing: 'easeOutCubic',
      });
    }
  }, [tracks.length]);

  return (
    <GlowCard>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-heading text-gold uppercase tracking-widest text-xs">
          {title}
        </h3>
        <span className="text-ink-dim text-xs font-heading uppercase tracking-wider">
          {loading ? 'cargando...' : `${tracks.length} top`}
        </span>
      </div>

      {!loading && tracks.length === 0 && (
        <p className="text-ink-dim text-sm py-4 text-center">
          Aún no se ha reproducido nada — el ranking aparece cuando suene la primera canción.
        </p>
      )}

      <div ref={listRef} className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto">
        {tracks.map((t, i) => (
          <TopRow
            key={t.providerId}
            row={t}
            position={i + 1}
            onAddTrack={onAddTrack}
            disabled={disabledIds?.has(t.providerId)}
          />
        ))}
      </div>
    </GlowCard>
  );
}

function TopRow({
  row, position, onAddTrack, disabled,
}: {
  row: TopTrackRow;
  position: number;
  onAddTrack?: (track: TrackSearchResult) => Promise<void> | void;
  disabled?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isTop3 = position <= 3;

  const handleAdd = async () => {
    if (disabled || !onAddTrack) return;
    if (rowRef.current) confirmAdd(rowRef.current);
    await onAddTrack(topTrackToSearchResult(row));
  };

  return (
    <div
      ref={rowRef}
      className="top-row flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-base-card/50 transition"
    >
      <span
        className={[
          'w-6 text-center text-xs font-heading font-bold shrink-0',
          isTop3 ? 'text-gold' : 'text-ink-dim',
        ].join(' ')}
      >
        {position}
      </span>
      {row.imageUrl ? (
        <img src={row.imageUrl} alt="" className="w-10 h-10 rounded-md shrink-0 object-cover" loading="lazy" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-base-elevated shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm font-medium truncate">{row.title}</p>
        <p className="text-ink-mute text-xs truncate">{joinArtists(row.artists)}</p>
      </div>
      <div
        className="shrink-0 px-2.5 py-1 rounded-md text-xs font-heading font-bold tabular-nums"
        style={{
          background: isTop3 ? 'rgba(168,85,247,0.18)' : 'rgba(18,18,31,0.80)',
          color: isTop3 ? '#C084FC' : '#8A7A60',
          border: '1px solid rgba(168,85,247,0.30)',
        }}
      >
        ×{row.requestCount}
      </div>
      {onAddTrack && (
        <button
          onClick={handleAdd}
          disabled={disabled}
          title={disabled ? 'Ya está en la cola' : 'Agregar a la cola'}
          className={[
            'shrink-0 rounded-full w-8 h-8 grid place-items-center transition-all',
            disabled
              ? 'bg-base-elevated text-ink-dim cursor-not-allowed'
              : 'bg-gradient-gold text-[#0A0A14] shadow-gold-sm hover:shadow-gold hover:scale-110 active:scale-95',
          ].join(' ')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
