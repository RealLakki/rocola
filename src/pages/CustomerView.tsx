import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link, useParams } from 'react-router-dom';
import { useVenue } from '../hooks/useVenue';
import { useQueue } from '../hooks/useQueue';
import { useTrackSearch } from '../hooks/useTrackSearch';
import { SearchBar } from '../components/customer/SearchBar';
import { SongResult } from '../components/customer/SongResult';
import { QueueList } from '../components/customer/QueueList';
import { NowPlayingMini } from '../components/customer/NowPlayingMini';
import { TopTracksCard } from '../components/admin/TopTracksCard';
import { GlowCard } from '../components/common/GlowCard';
import { AnimatedLogo } from '../components/common/AnimatedLogo';
import { AppLogo } from '../components/common/AppLogo';
import { EmptyState } from '../components/common/EmptyState';
import { NeonButton } from '../components/common/NeonButton';
import { GuideTour, isTourDone, markTourDone } from '../components/customer/GuideTour';
import { enqueueTrack } from '../lib/api';
import { extractYoutubeVideoId, isYoutubeProvidedTrack, resolveOnYoutube, youtubeUrlToTrack, ytTrackToResolved } from '../lib/youtube';
import { getClientId, getClientName, setClientName } from '../utils/formatters';
import { safeLocal } from '../utils/safeStorage';
import type { TrackSearchResult, Venue } from '../lib/types';

const COOLDOWN_KEY = (vid: string) => `cantina:lastReq:${vid}`;

export function CustomerView() {
  const { slug } = useParams<{ slug: string }>();
  const { venue, loading: vLoading } = useVenue(slug);

  if (vLoading) return <FullScreenLoader />;
  if (!venue) return <NotFoundView />;

  return <CustomerInner venue={venue} />;
}

function CustomerInner({ venue }: { venue: Venue }) {
  const { queued, nowPlaying } = useQueue(venue.id);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const [name, setNameState] = useState(getClientName() ?? '');
  const [showTour, setShowTour] = useState(false);

  const clientId = useMemo(() => getClientId(), []);

  useEffect(() => {
    if (isTourDone()) return;
    const t = window.setTimeout(() => setShowTour(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  const showToast = useCallback((msg: string, kind: 'ok' | 'err') => {
    setToast({ msg, kind });
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const cooldownRemaining = useCallback((): number => {
    const last = Number(safeLocal.getItem(COOLDOWN_KEY(venue.id)) ?? 0);
    const elapsed = (Date.now() - last) / 1000;
    return Math.max(0, venue.requestCooldownSec - elapsed);
  }, [venue]);

  const isBlocked = (track: TrackSearchResult) =>
    venue.blockedTrackIds.includes(track.providerId);
  const isAlreadyInQueue = (track: TrackSearchResult) =>
    queued.some((q) => q.track.providerId === track.providerId) ||
    nowPlaying?.track.providerId === track.providerId;

  const handleAdd = useCallback(
    async (track: TrackSearchResult) => {
      const wait = cooldownRemaining();
      if (wait > 0) {
        showToast(`Espera ${Math.ceil(wait)}s para pedir otra`, 'err');
        return;
      }
      setAdding(track.providerId);
      try {
        // Los resultados de búsqueda ya vienen resueltos a un video de YouTube
        // (yt:VIDEOID). Solo el top-tracks (quick-add) puede necesitar resolver.
        const resolved = isYoutubeProvidedTrack(track)
          ? ytTrackToResolved(track)
          : await resolveOnYoutube(track);
        if (!resolved) {
          showToast('No encontré un video para esa canción', 'err');
          return;
        }
        await enqueueTrack({
          venueId: venue.id,
          track: resolved,
          requestedBy: clientId,
          requestedByName: name || undefined,
        });
        safeLocal.setItem(COOLDOWN_KEY(venue.id), String(Date.now()));
        showToast('✨ Agregada a la cola', 'ok');
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('Genero no permitido')) {
          showToast('Ese género no va con el local 🚫', 'err');
          return;
        }
        if (msg.includes('Cancion bloqueada')) {
          showToast('Canción bloqueada por el local', 'err');
          return;
        }
        showToast('No pude agregarla, intenta de nuevo', 'err');
      } finally {
        setAdding(null);
      }
    },
    [cooldownRemaining, showToast, venue.id, clientId, name],
  );

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-base/80 backdrop-blur-xl border-b border-base-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="shrink-0" title="Inicio">
            <AppLogo size={42} />
          </Link>
          <Link to="/" className="flex-1 min-w-0 group">
            <p className="font-display italic text-ink text-lg leading-tight truncate group-hover:text-gold transition">
              {venue.name}
            </p>
            <p className="text-ink-mute text-[11px] uppercase tracking-widest font-heading">
              La música la pones tú
            </p>
          </Link>
          <button
            onClick={() => setShowTour(true)}
            title="Ver guía de uso"
            className="shrink-0 text-ink-dim hover:text-gold transition p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        <HomeView
          venue={venue}
          queued={queued}
          nowPlaying={nowPlaying}
          clientId={clientId}
          name={name}
          onChangeName={(n) => { setNameState(n); setClientName(n); }}
          query={query}
          onChangeQuery={setQuery}
          adding={adding}
          isBlocked={isBlocked}
          isAlreadyInQueue={isAlreadyInQueue}
          onAddTrack={handleAdd}
        />

        <footer className="pt-10 pb-4 flex flex-col items-center gap-2">
          <AppLogo size={36} />
          <p className="text-ink-dim text-[10px] uppercase tracking-[0.22em] font-heading text-center">
            Sonando en {venue.name}
          </p>
          <div className="flex gap-3 text-[10px] uppercase tracking-widest font-heading text-ink-dim mt-2">
            <Link to="/" className="hover:text-gold transition">← Inicio</Link>
            <span className="text-gold/30">·</span>
            <Link to={`/admin/${venue.slug}`} className="hover:text-gold transition">Administrador</Link>
            <span className="text-gold/30">·</span>
            <Link to={`/admin/${venue.slug}/player`} className="hover:text-gold transition">Televisor</Link>
          </div>
        </footer>
      </main>

      {toast && <AnimatedToast msg={toast.msg} kind={toast.kind} />}

      <GuideTour show={showTour} onDone={() => { markTourDone(); setShowTour(false); }} />
    </div>
  );
}

/* ─────────────────────────── Home ─────────────────────────── */

interface HomeViewProps {
  venue: Venue;
  queued: ReturnType<typeof useQueue>['queued'];
  nowPlaying: ReturnType<typeof useQueue>['nowPlaying'];
  clientId: string;
  name: string;
  onChangeName: (n: string) => void;
  query: string;
  onChangeQuery: (q: string) => void;
  adding: string | null;
  isBlocked: (t: TrackSearchResult) => boolean;
  isAlreadyInQueue: (t: TrackSearchResult) => boolean;
  onAddTrack: (t: TrackSearchResult) => Promise<void>;
}

function HomeView({
  venue, queued, nowPlaying, clientId, name, onChangeName,
  query, onChangeQuery, adding, isBlocked, isAlreadyInQueue, onAddTrack,
}: HomeViewProps) {
  // ROCOLA: búsqueda directa en YouTube (scrape, sin cuota).
  const { results: songs, loading, error } = useTrackSearch(query, venue.allowExplicit, venue.allowedGenres);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loading || !listRef.current || songs.length === 0) return;
    gsap.from(listRef.current.children, {
      y: 18, opacity: 0, duration: 0.35, stagger: 0.045, ease: 'power3.out', clearProps: 'all',
    });
  }, [loading, songs.length]);

  return (
    <>
      <NowPlayingMini nowPlaying={nowPlaying} />

      <input
        value={name}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder="Tu nombre o mesa (opcional)"
        className="w-full bg-base-card/40 border border-base-border rounded-xl px-4 py-2 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-gold/50"
        maxLength={24}
      />

      <SearchBar value={query} onChange={onChangeQuery} autoFocus />

      {venue.tipEnabled && <TipHint />}

      {error && (
        <p className="text-danger text-sm text-center">Error de búsqueda — revisa la conexión</p>
      )}

      {query.length >= 2 ? (
        <div className="space-y-2">
          {loading && <p className="text-ink-dim text-center text-sm py-2">Buscando en YouTube…</p>}
          {!loading && songs.length === 0 && (
            <EmptyState title="Sin resultados" description="Prueba con otro nombre o pega el link de YouTube abajo" />
          )}
          <div ref={listRef} className="space-y-2">
            {songs.map((t) => {
              const blocked = isBlocked(t);
              const dup = isAlreadyInQueue(t);
              const reason = blocked ? 'Bloqueada por el local' : dup ? 'Ya está en la cola' : undefined;
              return (
                <SongResult
                  key={t.providerId}
                  track={t}
                  disabled={blocked || dup || adding === t.providerId}
                  disabledReason={reason}
                  onAdd={onAddTrack}
                />
              );
            })}
          </div>

          {!loading && (
            <div className="pt-3">
              <YoutubeUrlInput onAddTrack={onAddTrack} />
            </div>
          )}
        </div>
      ) : (
        <>
          <GlowCard>
            <h2 className="text-sm font-heading text-gold uppercase tracking-widest mb-3">
              En cola ({queued.length})
            </h2>
            <QueueList items={queued} highlightClientId={clientId} />
          </GlowCard>

          <TopTracksCard
            venueId={venue.id}
            title="Más pedidas"
            limit={10}
            onAddTrack={onAddTrack}
            disabledIds={
              new Set([
                ...queued.map((q) => q.track.providerId),
                ...(nowPlaying ? [nowPlaying.track.providerId] : []),
                ...venue.blockedTrackIds,
              ])
            }
          />
        </>
      )}
    </>
  );
}

/* ─────────────────────────── Pegar link YouTube ─────────────────────────── */

function YoutubeUrlInput({ onAddTrack }: { onAddTrack: (t: TrackSearchResult) => Promise<void> }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = !!extractYoutubeVideoId(url);

  const handleAdd = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const track = await youtubeUrlToTrack(url);
      if (!track) {
        setError('No pude leer ese link. Verifica que sea un video válido.');
        return;
      }
      await onAddTrack(track);
      setUrl('');
    } catch (e) {
      console.error('[yt-url]', e);
      setError('Error al procesar el link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'rgba(18,18,31,0.70)', border: '1px solid rgb(var(--b1) / 0.20)' }}
    >
      <p className="text-[10px] uppercase tracking-widest text-gold font-heading mb-2">
        ¿Tienes el link de YouTube?
      </p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 bg-base-card/60 border border-base-border rounded-lg px-3 py-2 text-xs text-ink placeholder:text-ink-dim outline-none focus:border-gold/50 font-mono"
          disabled={loading}
        />
        <NeonButton size="sm" variant="primary" onClick={handleAdd} disabled={!valid} loading={loading}>
          Agregar
        </NeonButton>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
      <p className="text-ink-dim text-[10px] mt-2 leading-snug">
        Pega el enlace de un video y se agrega directo a la cola.
      </p>
    </div>
  );
}

function TipHint() {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, rgb(var(--b1) / 0.12) 0%, rgba(18,18,31,0.75) 100%)',
        border: '1px solid rgb(var(--b1) / 0.30)',
      }}
    >
      <span className="text-xl shrink-0">⚡</span>
      <div className="flex-1 min-w-0">
        <p className="text-gold font-heading uppercase tracking-wider text-[10px]">
          ¿Apurado por escuchar tu canción?
        </p>
        <p className="text-ink-mute text-xs leading-snug mt-0.5">
          Acércate a la barra con una propina y la subimos al frente.
        </p>
      </div>
    </div>
  );
}

function AnimatedToast({ msg, kind }: { msg: string; kind: 'ok' | 'err' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { y: 48, opacity: 0, scale: 0.88 },
      { y: 0, opacity: 1, scale: 1, duration: 0.38, ease: 'back.out(1.8)' },
    );
  }, []);
  return (
    <div
      ref={ref}
      className={[
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl glass-elevated text-sm shadow-gold whitespace-nowrap',
        kind === 'ok' ? 'text-success' : 'text-danger',
      ].join(' ')}
    >
      {msg}
    </div>
  );
}

const FullScreenLoader = () => (
  <div className="min-h-screen grid place-items-center">
    <AnimatedLogo size={80} />
  </div>
);

const NotFoundView = () => (
  <div className="min-h-screen grid place-items-center px-6">
    <EmptyState
      title="Local no encontrado"
      description="Verifica el código QR o pídele al local uno nuevo"
    />
  </div>
);
