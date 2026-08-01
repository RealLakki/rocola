import { Link, useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useVenue } from '../hooks/useVenue';
import { useQueue } from '../hooks/useQueue';
import { QueueManager } from '../components/admin/QueueManager';
import { enqueueTrack } from '../lib/api';
import { isYoutubeProvidedTrack, resolveOnYoutube, ytTrackToResolved } from '../lib/youtube';
import type { TrackSearchResult, Venue } from '../lib/types';
import { GenreSettings } from '../components/admin/GenreSettings';
import { VenueSettings } from '../components/admin/VenueSettings';
import { BlockedSongs } from '../components/admin/BlockedSongs';
import { QrCodeCard } from '../components/admin/QrCodeCard';
import { TopTracksCard } from '../components/admin/TopTracksCard';
import { AnimatedLogo } from '../components/common/AnimatedLogo';
import { AppLogo } from '../components/common/AppLogo';
import { NeonButton } from '../components/common/NeonButton';
import { GlowCard } from '../components/common/GlowCard';

/**
 * Outer: solo decide si renderizar el panel real. Los hooks (useCallback,
 * useQueue, etc) viven dentro de DashboardInner que solo se monta cuando
 * venue ya está cargado — así no violamos rules-of-hooks con early returns.
 */
export function AdminDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { venue, loading, setVenue } = useVenue(slug);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <AnimatedLogo size={80} />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-ink-mute">Local no encontrado.</p>
      </div>
    );
  }

  return <DashboardInner venue={venue} setVenue={setVenue} />;
}

function DashboardInner({
  venue, setVenue,
}: {
  venue: Venue;
  setVenue: (v: Venue) => void;
}) {
  const { queued, nowPlaying, refresh: refreshQueue } = useQueue(venue.id);

  const patchVenue = (patch: Partial<Venue>) => setVenue({ ...venue, ...patch });

  const adminAddTrack = useCallback(
    async (track: TrackSearchResult) => {
      try {
        const resolved = isYoutubeProvidedTrack(track)
          ? ytTrackToResolved(track)
          : await resolveOnYoutube(track);
        if (!resolved) return;
        await enqueueTrack({
          venueId: venue.id,
          track: resolved,
          requestedBy: 'admin',
          requestedByName: 'Admin',
        });
        await refreshQueue();
      } catch (e) {
        console.error('[admin] add track failed:', e);
      }
    },
    [venue.id, refreshQueue],
  );

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 bg-base/80 backdrop-blur-xl border-b border-base-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="shrink-0" title="Inicio">
            <AppLogo size={48} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-display italic text-ink text-xl leading-tight">{venue.name}</p>
            <p className="text-ink-mute text-[11px] uppercase tracking-widest font-heading">
              Administrador · control en tiempo real
            </p>
          </div>
          <Link
            to={`/v/${venue.slug}`}
            className="hidden md:inline text-ink-mute hover:text-gold text-xs font-heading uppercase tracking-wider transition"
          >
            Vista Cliente
          </Link>
          <Link
            to="/"
            className="hidden md:inline text-ink-mute hover:text-gold text-xs font-heading uppercase tracking-wider transition"
          >
            ← Inicio
          </Link>
          <Link to={`/admin/${venue.slug}/player`} target="_blank">
            <NeonButton variant="primary" size="md">
              Abrir reproductor
            </NeonButton>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-6 grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 space-y-4">
          <GlowCard>
            <h2 className="font-heading text-gold uppercase tracking-widest text-xs mb-3">
              Cola en vivo · {queued.length} pendiente{queued.length === 1 ? '' : 's'}
            </h2>
            <QueueManager
              venue={venue}
              queued={queued}
              nowPlaying={nowPlaying}
              onVenueUpdate={patchVenue}
              onRefresh={refreshQueue}
            />
          </GlowCard>

          <TopTracksCard
            venueId={venue.id}
            onAddTrack={adminAddTrack}
            disabledIds={
              new Set([
                ...queued.map((q) => q.track.providerId),
                ...(nowPlaying ? [nowPlaying.track.providerId] : []),
                ...venue.blockedTrackIds,
              ])
            }
          />
          <GenreSettings venue={venue} onUpdate={patchVenue} />
          <BlockedSongs venue={venue} onUpdate={patchVenue} />
        </section>

        <aside className="space-y-4">
          <QrCodeCard slug={venue.slug} />
          <VenueSettings venue={venue} onUpdate={patchVenue} />
        </aside>
      </main>
    </div>
  );
}
