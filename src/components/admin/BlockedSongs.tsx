import { updateVenue } from '../../lib/api';
import { GlowCard } from '../common/GlowCard';
import type { Venue } from '../../lib/types';

interface Props {
  venue: Venue;
  onUpdate: (patch: Partial<Venue>) => void;
}

export function BlockedSongs({ venue, onUpdate }: Props) {
  const unblock = async (id: string) => {
    const next = venue.blockedTrackIds.filter((x) => x !== id);
    await updateVenue(venue.id, { blockedTrackIds: next });
    onUpdate({ blockedTrackIds: next });
  };

  return (
    <GlowCard>
      <h3 className="font-heading text-gold uppercase tracking-widest text-xs mb-3">
        Canciones bloqueadas ({venue.blockedTrackIds.length})
      </h3>
      {venue.blockedTrackIds.length === 0 ? (
        <p className="text-ink-dim text-sm">Ninguna canción bloqueada.</p>
      ) : (
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {venue.blockedTrackIds.map((id) => (
            <li
              key={id}
              className="flex items-center justify-between gap-2 text-xs bg-base-card/40 rounded-md px-3 py-1.5"
            >
              <code className="text-ink-mute font-mono truncate">{id}</code>
              <button
                onClick={() => unblock(id)}
                className="text-gold hover:text-gold-light text-xs shrink-0"
              >
                desbloquear
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlowCard>
  );
}
