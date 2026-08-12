import { useRef } from 'react';
import gsap from 'gsap';
import { formatDuration, joinArtists } from '../../utils/formatters';
import type { TrackSearchResult } from '../../lib/types';

interface Props {
  track: TrackSearchResult;
  disabled?: boolean;
  disabledReason?: string;
  onAdd: (track: TrackSearchResult) => Promise<void> | void;
}

export function SongResult({ track, disabled, disabledReason, onAdd }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);

  const handleAdd = async () => {
    if (disabled) return;

    // Botón: punch rápido
    if (btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.82, duration: 0.09, ease: 'power2.in' })
        .to(btnRef.current, { scale: 1.18, duration: 0.2,  ease: 'back.out(2.5)' })
        .to(btnRef.current, { scale: 1,    duration: 0.18, ease: 'power2.out' });
    }

    // Tarjeta: flash de confirmación
    if (cardRef.current) {
      gsap.timeline()
        .to(cardRef.current, {
          borderColor: 'rgb(var(--b1) / 0.8)',
          boxShadow: '0 0 22px rgb(var(--b1) / 0.5)',
          duration: 0.18, ease: 'power2.out',
        })
        .to(cardRef.current, {
          borderColor: 'rgb(var(--b1) / 0.18)',
          boxShadow: '0 0 0px rgb(var(--b1) / 0)',
          duration: 0.45, ease: 'power2.inOut',
        });
    }

    await onAdd(track);
  };

  return (
    <div
      ref={cardRef}
      className="group flex items-center gap-3 glass rounded-xl p-3 transition-colors"
      style={{ border: '1px solid rgb(var(--b1) / 0.18)' }}
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-base-elevated shrink-0">
        {track.imageUrl ? (
          <img src={track.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gold/20 to-gold-deep/20" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-ink font-medium truncate">{track.title}</p>
          {track.explicit && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-ink-dim/30 text-ink-mute">E</span>
          )}
        </div>
        <p className="text-ink-mute text-sm truncate">{joinArtists(track.artists)}</p>
        <p className="text-ink-dim text-xs">{formatDuration(track.durationMs)}</p>
      </div>

      <button
        ref={btnRef}
        onClick={handleAdd}
        disabled={disabled}
        title={disabled ? disabledReason : 'Agregar a la cola'}
        className={[
          'shrink-0 rounded-full w-10 h-10 grid place-items-center transition-colors',
          disabled
            ? 'bg-base-elevated text-ink-dim cursor-not-allowed'
            : 'bg-gradient-gold text-[#0A0A14] shadow-gold-sm hover:shadow-gold',
        ].join(' ')}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
