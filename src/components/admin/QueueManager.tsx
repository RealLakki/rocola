import { boostItem, removeQueueItem, setItemStatus, unboostItem, updateVenue } from '../../lib/api';
import { useSendPlayerCommand } from '../../hooks/usePlayerControl';
import { joinArtists } from '../../utils/formatters';
import type { QueueItem, Venue } from '../../lib/types';
import { NeonButton } from '../common/NeonButton';

interface Props {
  venue: Venue;
  queued: QueueItem[];
  nowPlaying: QueueItem | null;
  onVenueUpdate: (patch: Partial<Venue>) => void;
  /** Refresca la cola manualmente — defensivo por si el realtime falla
   * (especialmente DELETE events sin REPLICA IDENTITY FULL en la tabla). */
  onRefresh: () => Promise<unknown>;
}

export function QueueManager({ venue, queued, nowPlaying, onVenueUpdate, onRefresh }: Props) {
  const sendCommand = useSendPlayerCommand(venue.id);

  const after = (p: Promise<unknown>) =>
    p.then(() => onRefresh()).catch((e) => console.error('[admin] action failed:', e));

  const blockTrack = (trackId: string) => {
    const next = Array.from(new Set([...venue.blockedTrackIds, trackId]));
    void updateVenue(venue.id, { blockedTrackIds: next })
      .then(() => onVenueUpdate({ blockedTrackIds: next }));
  };

  return (
    <div className="space-y-2">
      {nowPlaying && (
        <div className="glass-elevated rounded-xl p-3 flex flex-wrap items-center gap-3 gold-border">
          <span className="text-[10px] uppercase tracking-widest text-gold font-heading">
            Sonando
          </span>
          {nowPlaying.track.imageUrl && (
            <img src={nowPlaying.track.imageUrl} alt="" className="w-10 h-10 rounded-md" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm font-medium truncate">{nowPlaying.track.title}</p>
            <p className="text-ink-mute text-xs truncate">{joinArtists(nowPlaying.track.artists)}</p>
          </div>
          {/* Control remoto del reproductor (cross-tab via socket.io) */}
          <div className="flex gap-1 shrink-0">
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => sendCommand('play')}
              title="Play (envía al reproductor)"
            >
              ▶
            </NeonButton>
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => sendCommand('pause')}
              title="Pausar"
            >
              ❚❚
            </NeonButton>
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => sendCommand('volume-down')}
              title="Bajar volumen"
            >
              −
            </NeonButton>
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => sendCommand('volume-up')}
              title="Subir volumen"
            >
              +
            </NeonButton>
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => {
                blockTrack(nowPlaying.track.providerId);
                sendCommand('skip');
                void after(setItemStatus(nowPlaying.id, 'skipped'));
              }}
              title="Bloquear esta canción para siempre + saltar"
            >
              ⛔
            </NeonButton>
            <NeonButton
              size="sm"
              variant="danger"
              onClick={() => {
                sendCommand('skip');
                void after(setItemStatus(nowPlaying.id, 'skipped'));
              }}
              title="Saltar canción"
            >
              ⏭
            </NeonButton>
          </div>
        </div>
      )}

      {queued.length === 0 && (
        <p className="text-ink-dim text-center text-sm py-6">Cola vacía</p>
      )}

      {queued.map((item, i) => (
        <div
          key={item.id}
          className="glass rounded-xl p-3 flex items-center gap-3 hover:border-gold/30 transition"
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
            <img src={item.track.imageUrl} alt="" className="w-9 h-9 rounded-md shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm font-medium truncate">{item.track.title}</p>
            <p className="text-ink-mute text-xs truncate">
              {joinArtists(item.track.artists)}
              {item.requestedByName && ` · ${item.requestedByName}`}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {item.boosted ? (
              <NeonButton
                size="sm"
                variant="ghost"
                onClick={() => after(unboostItem(item.id, venue.id))}
                title="Quitar boost — vuelve al final de la cola"
              >
                ↓
              </NeonButton>
            ) : (
              <NeonButton
                size="sm"
                variant="ghost"
                onClick={() => after(boostItem(item.id))}
                title="Subir al frente"
              >
                ⚡
              </NeonButton>
            )}
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => blockTrack(item.track.providerId)}
              title="Bloquear esta canción para siempre"
            >
              ⛔
            </NeonButton>
            <NeonButton
              size="sm"
              variant="danger"
              onClick={() => after(removeQueueItem(item.id))}
            >
              ✕
            </NeonButton>
          </div>
        </div>
      ))}
    </div>
  );
}
