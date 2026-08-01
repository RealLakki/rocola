import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { joinArtists } from '../../utils/formatters';
import type { QueueItem } from '../../lib/types';

interface Props {
  items: QueueItem[];
}

export function NextUpStrip({ items }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('.next-row');
    anime({
      targets: els,
      translateY: [12, 0],
      opacity: [0, 1],
      duration: 500,
      delay: anime.stagger(80),
      easing: 'easeOutCubic',
    });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-3xl mb-2">📲</p>
        <p className="text-gold font-heading uppercase tracking-widest text-[11px]">
          Escanea el QR
        </p>
        <p className="text-ink-mute text-xs mt-1">
          Pide la primera del lote
        </p>
      </div>
    );
  }

  const visible = items.slice(0, 3);
  const hidden = Math.max(0, items.length - visible.length);

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest text-gold font-heading mb-1">
        En cola · {items.length}
      </p>
      {visible.map((item, i) => (
        <div key={item.id} className="next-row flex items-center gap-3 glass rounded-xl px-3 py-2">
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
            <img src={item.track.imageUrl} alt="" className="w-10 h-10 rounded-md shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm font-medium truncate">{item.track.title}</p>
            <p className="text-ink-mute text-xs truncate">
              {joinArtists(item.track.artists)}
              {item.requestedByName && ` · ${item.requestedByName}`}
            </p>
          </div>
        </div>
      ))}
      {hidden > 0 && (
        <p className="text-ink-dim text-xs text-center font-heading uppercase tracking-wider pt-1">
          + {hidden} {hidden === 1 ? 'canción' : 'canciones'} más
        </p>
      )}
    </div>
  );
}
