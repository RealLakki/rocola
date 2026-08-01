import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { joinArtists } from '../../utils/formatters';
import type { QueueItem } from '../../lib/types';

interface Props {
  items: QueueItem[];
  highlightClientId?: string;
}

export function QueueList({ items, highlightClientId }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const prevIdsRef     = useRef<Set<string>>(new Set());
  const isFirstRender  = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const allRows = containerRef.current.querySelectorAll('.queue-row');

    if (isFirstRender.current) {
      if (allRows.length > 0) {
        gsap.from(allRows, {
          x: -24, opacity: 0,
          duration: 0.42, stagger: 0.055, ease: 'power3.out',
        });
      }
      isFirstRender.current = false;
    } else {
      // Solo animar los items nuevos
      allRows.forEach((row) => {
        const id = row.getAttribute('data-id');
        if (!id || prevIdsRef.current.has(id)) return;

        gsap.fromTo(row,
          { x: -28, opacity: 0, backgroundColor: 'rgba(240,90,26,0.28)' },
          { x: 0,   opacity: 1, backgroundColor: 'rgba(0,0,0,0)',
            duration: 0.55, ease: 'back.out(1.4)' }
        );
      });
    }

    prevIdsRef.current = new Set(items.map((i) => i.id));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <p className="text-2xl mb-2">🎙️</p>
        <p className="text-ink font-medium text-sm mb-1">El local te escucha</p>
        <p className="text-ink-dim text-xs leading-relaxed">
          Nadie ha pedido música todavía. Busca tu canción arriba y sé tú el que rompa el silencio.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isMine = item.requestedBy === highlightClientId;
        return (
          <div
            key={item.id}
            data-id={item.id}
            className={[
              'queue-row flex items-center gap-3 rounded-xl px-3 py-2 transition-colors',
              isMine
                ? 'bg-gold/10 border border-gold/30'
                : 'bg-base-card/40 border border-transparent',
            ].join(' ')}
          >
            <div
              className={[
                'w-7 h-7 rounded-md grid place-items-center text-xs font-bold shrink-0',
                item.boosted
                  ? 'bg-gradient-gold text-[#0A0A14] shadow-gold-sm'
                  : 'bg-base-elevated text-ink-mute',
              ].join(' ')}
            >
              {item.boosted ? '⚡' : i + 1}
            </div>
            {item.track.imageUrl && (
              <img
                src={item.track.imageUrl}
                alt=""
                className="w-9 h-9 rounded-md object-cover shrink-0"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-ink text-sm font-medium truncate">{item.track.title}</p>
              <p className="text-ink-mute text-xs truncate">{joinArtists(item.track.artists)}</p>
            </div>
            {isMine && (
              <span className="text-gold text-xs font-display shrink-0">tu pick</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
