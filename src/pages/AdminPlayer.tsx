import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useVenue } from '../hooks/useVenue';
import { useQueue } from '../hooks/useQueue';
import { useYoutubePlayer } from '../hooks/useYoutubePlayer';
import { useFullscreen } from '../hooks/useFullscreen';
import { useReceivePlayerCommand } from '../hooks/usePlayerControl';
import { useHouseFiller } from '../hooks/useHouseFiller';
import { setItemStatus } from '../lib/api';
import { Visualizer } from '../components/player/Visualizer';
import { NextUpStrip } from '../components/player/NextUpStrip';
import { PlayerQrPanel } from '../components/player/PlayerQrPanel';
import { NeonButton } from '../components/common/NeonButton';
import { AnimatedLogo } from '../components/common/AnimatedLogo';
import { AppLogo } from '../components/common/AppLogo';
import { joinArtists } from '../utils/formatters';
import type { Venue } from '../lib/types';

const CROSSFADE_DURATION_SEC = 4;
const PRELOAD_THRESHOLD_SEC = 9;  // cuándo precargar el siguiente
const FADE_THRESHOLD_SEC = 5;     // empieza fade 5s antes; +1s de buffer al final
const TARGET_VOLUME = 90;
const FADE_TICK_MS = 50;          // 20fps — suficientemente fluido sin ahogar al CPU

// Curva constant-power: en t=0.5, ambos suenan a ~70% de TARGET (sin bajón).
// El cuadrado de las amplitudes suma 1 → potencia total constante.
const fadeOutCurve = (t: number) => Math.cos((t * Math.PI) / 2);
const fadeInCurve = (t: number) => Math.sin((t * Math.PI) / 2);

export function AdminPlayer() {
  const { slug } = useParams<{ slug: string }>();
  const { venue, loading } = useVenue(slug);

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

  return <PlayerSurface venue={venue} />;
}

/**
 * Reproductor con 2 iframes A/B para hacer crossfade entre canciones.
 * - `activeSlot` apunta al iframe que está sonando ahora
 * - Cuando el current está cerca del fin, precargamos el siguiente en el otro slot
 * - A FADE_THRESHOLD_SEC del fin, hacemos fade out + fade in en paralelo
 * - Cuando el current termina, hacemos el switch en DB y `activeSlot` cambia
 */
function PlayerSurface({ venue }: { venue: Venue }) {
  const { queued, nowPlaying, refresh } = useQueue(venue.id);
  const playerA = useYoutubePlayer();
  const playerB = useYoutubePlayer();
  const fullscreen = useFullscreen();

  const [activeSlot, setActiveSlot] = useState<'a' | 'b'>('a');
  const [muted, setMuted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  // Nivel de volumen vigente. Es un ref y no la constante TARGET_VOLUME porque
  // el admin puede subirlo/bajarlo desde el control remoto: usando la constante,
  // cada 'volume-up' aterrizaba en el mismo valor (no acumulaba) y el nivel
  // elegido se perdía al cargar la siguiente canción.
  const volumeRef = useRef(TARGET_VOLUME);
  const nudgeVolume = useCallback((delta: number) => {
    volumeRef.current = Math.max(0, Math.min(100, volumeRef.current + delta));
    return volumeRef.current;
  }, []);

  const active = activeSlot === 'a' ? playerA : playerB;
  const standby = activeSlot === 'a' ? playerB : playerA;

  // Track de qué video está cargado en cada slot, para evitar reload duplicados
  const loadedRef = useRef<{ a: string | null; b: string | null }>({ a: null, b: null });
  const promotingRef = useRef<string | null>(null);
  const preloadedNextRef = useRef<string | null>(null);
  const fadingRef = useRef(false);
  const fadeCleanupRef = useRef<(() => void) | null>(null);
  const retiringItemRef = useRef<string | null>(null);
  // Marca que un switch acaba de ocurrir — usado por effects de "promote" y
  // "load" para no recargar/duplicar mientras DB se sincroniza por realtime.
  const justSwitchedRef = useRef(false);

  // ─────────── Promover primera de la cola a "playing" ───────────
  useEffect(() => {
    if (nowPlaying || queued.length === 0) return;
    // Si acabamos de hacer crossfade, completeCrossfade ya pre-pobló
    // promotingRef y disparó el setItemStatus — no duplicar.
    if (justSwitchedRef.current) return;
    const next = queued[0];
    if (promotingRef.current === next.id) return;
    promotingRef.current = next.id;
    setItemStatus(next.id, 'playing')
      .then(() => refresh())
      .catch((e) => {
        console.error('[player] promote failed:', e);
        promotingRef.current = null;
      });
  }, [nowPlaying, queued, refresh]);

  // ─────────── Cargar nowPlaying en el slot activo ───────────
  useEffect(() => {
    if (!active.state.isReady || !nowPlaying || showOverlay) return;
    const vid = nowPlaying.track.youtubeVideoId;
    if (retiringItemRef.current && retiringItemRef.current !== nowPlaying.id) {
      retiringItemRef.current = null;
    }

    // Después del crossfade, nowPlaying (DB) tarda en reflejar el switch.
    // Durante ese window, NO recargamos — eso interrumpiria B (que ya esta
    // sonando). Solo limpiamos el flag cuando DB se ponga al día.
    if (justSwitchedRef.current) {
      if (loadedRef.current[activeSlot] === vid) {
        justSwitchedRef.current = false;
      }
      return;
    }

    // Si ya marcamos este item como played/skipped pero el realtime todavia
    // no actualizo nowPlaying, no lo recargamos por accidente.
    if (retiringItemRef.current === nowPlaying.id) return;

    if (loadedRef.current[activeSlot] === vid) return;
    console.log('[player] loading', vid, 'in slot', activeSlot);
    // Silenciar primero para evitar que el video anterior cargado en el slot
    // suene un fragmento antes de que el nuevo tome control (audio leak)
    active.controls.setVolume(0);
    active.controls.load(vid, true);
    loadedRef.current[activeSlot] = vid;
    // Restaurar volumen target tras delay — el nuevo video ya tomó control
    const targetVol = muted ? 0 : volumeRef.current;
    window.setTimeout(() => {
      if (loadedRef.current[activeSlot] === vid) {
        active.controls.setVolume(targetVol);
      }
    }, 400);
    promotingRef.current = null;
    preloadedNextRef.current = null;
  }, [active.state.isReady, nowPlaying, active.controls, showOverlay, activeSlot, muted]);

  // ─────────── Pre-cargar el siguiente cerca del final ───────────
  useEffect(() => {
    if (!active.state.isReady || !standby.state.isReady) return;
    if (showOverlay || !nowPlaying) return;
    const remaining = active.state.durationSec - active.state.currentTimeSec;
    if (active.state.durationSec === 0) return;
    if (remaining > PRELOAD_THRESHOLD_SEC || remaining <= 0) return;
    const next = queued[0];
    if (!next) return;
    if (preloadedNextRef.current === next.track.youtubeVideoId) return;
    if (loadedRef.current[activeSlot === 'a' ? 'b' : 'a'] === next.track.youtubeVideoId) return;
    console.log('[player] preloading', next.track.youtubeVideoId, 'in standby');
    standby.controls.setVolume(0);
    standby.controls.load(next.track.youtubeVideoId, false); // cue, no autoplay
    loadedRef.current[activeSlot === 'a' ? 'b' : 'a'] = next.track.youtubeVideoId;
    preloadedNextRef.current = next.track.youtubeVideoId;
  }, [
    active.state.isReady, standby.state.isReady, active.state.currentTimeSec,
    active.state.durationSec, queued, nowPlaying, showOverlay, activeSlot, standby.controls,
  ]);

  // ─────────── Crossfade ───────────
  const completeCrossfade = useCallback(() => {
    fadeCleanupRef.current?.();
    fadeCleanupRef.current = null;

    // B a volumen full (instantáneo, sin más fade)
    standby.controls.setVolume(muted ? 0 : volumeRef.current);

    // IMPORTANTE: NO llamar active.controls.stop(). Ya está en volumen 0
    // por el fade. Llamar stop() emite mensajes postMessage internos del
    // iframe que pueden afectar al otro iframe en algunos browsers.
    // Dejamos que A termine naturalmente — su listener onEnded ya fue
    // movido al nuevo slot por el effect cleanup.

    // Pre-poblar promotingRef para que el effect "promote" NO duplique
    // el setItemStatus que vamos a hacer aquí abajo.
    const nextItem = queued[0];
    if (nextItem) promotingRef.current = nextItem.id;

    loadedRef.current[activeSlot] = null;
    const newSlot: 'a' | 'b' = activeSlot === 'a' ? 'b' : 'a';
    justSwitchedRef.current = true;
    setActiveSlot(newSlot);

    if (nowPlaying) {
      const playedId = nowPlaying.id;
      retiringItemRef.current = playedId;
      // Encadenar para que sea una sola tanda de updates, no dos round-trips
      void setItemStatus(playedId, 'played')
        .then(() => nextItem ? setItemStatus(nextItem.id, 'playing') : Promise.resolve())
        .then(() => refresh())
        .catch((e) => console.error('[player] crossfade DB updates failed:', e));
    }

    preloadedNextRef.current = null;
    fadingRef.current = false;
  }, [activeSlot, standby, nowPlaying, queued, refresh, muted]);

  useEffect(() => {
    if (!active.state.isReady || showOverlay || !nowPlaying) return;
    const remaining = active.state.durationSec - active.state.currentTimeSec;
    if (active.state.durationSec === 0) return;
    if (remaining > FADE_THRESHOLD_SEC || remaining <= 0) return;
    if (fadingRef.current) return;
    if (preloadedNextRef.current === null) return;

    fadingRef.current = true;
    console.log('[player] starting crossfade');
    standby.controls.play();

    const startTime = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(1, elapsed / CROSSFADE_DURATION_SEC);
      active.controls.setVolume(Math.round(volumeRef.current * fadeOutCurve(t)));
      standby.controls.setVolume(muted ? 0 : Math.round(volumeRef.current * fadeInCurve(t)));
      if (t >= 1) completeCrossfade();
    }, FADE_TICK_MS);

    fadeCleanupRef.current = () => window.clearInterval(interval);
  }, [
    active.state.currentTimeSec, active.state.durationSec, active.state.isReady,
    showOverlay, nowPlaying, active.controls, standby.controls, muted, completeCrossfade,
  ]);

  // ─────────── Si A termina (naturalmente o por error) ───────────
  useEffect(() => {
    return active.onEnded(() => {
      if (justSwitchedRef.current) {
        // El switch ya ocurrió por el crossfade — A está terminando con
        // volumen 0, no hay nada que hacer en DB (ya se actualizó).
        console.log('[player] old slot ended after switch — ignored');
        justSwitchedRef.current = false;
        return;
      }
      if (fadingRef.current) {
        console.log('[player] A ended during crossfade, completing immediately');
        completeCrossfade();
        return;
      }
      console.log('[player] track ended without crossfade');
      if (nowPlaying) {
        retiringItemRef.current = nowPlaying.id;
        void setItemStatus(nowPlaying.id, 'played').then(() => {
          loadedRef.current[activeSlot] = null;
          void refresh();
        });
      }
    });
  }, [active, nowPlaying, refresh, activeSlot, completeCrossfade]);

  const handleSeek = useCallback((pct: number) => {
    if (!active.state.durationSec) return;
    active.controls.seekTo(pct * active.state.durationSec);
  }, [active]);

  const handleSkipForward = useCallback((sec: number) => {
    if (!active.state.durationSec) return;
    active.controls.seekTo(Math.min(active.state.durationSec - 1, active.state.currentTimeSec + sec));
  }, [active]);

  const handleSkipTrack = useCallback(() => {
    if (!nowPlaying) return;
    retiringItemRef.current = nowPlaying.id;
    void setItemStatus(nowPlaying.id, 'skipped').then(() => {
      loadedRef.current[activeSlot] = null;
      preloadedNextRef.current = null;
      void refresh();
    });
  }, [nowPlaying, activeSlot, refresh]);

  const handleToggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      active.controls.setVolume(next ? 0 : volumeRef.current);
      return next;
    });
  }, [active]);

  // ─── Auto-fill con "Las de siempre" cuando la cola se queda vacía ───
  useHouseFiller({
    venueId: venue.id,
    queued,
    nowPlaying,
    allowedGenres: venue.allowedGenres,
    enabled: !showOverlay,
    silenceMs: 1500,
  });

  // ─── Saltar un video por su id, venga de donde venga el aviso ───
  const skipByVideoId = useCallback((videoId: string | null, motivo: string) => {
    if (!videoId) return;
    const item = nowPlaying?.track.youtubeVideoId === videoId
      ? nowPlaying
      : queued.find((q) => q.track.youtubeVideoId === videoId);
    if (!item) return;
    console.warn(`[player] ${motivo}: saltando "${item.track.title}"`);
    if (item.id === nowPlaying?.id) retiringItemRef.current = item.id;
    void setItemStatus(item.id, 'skipped').then(() => {
      (['a', 'b'] as const).forEach((sl) => {
        if (loadedRef.current[sl] === videoId) loadedRef.current[sl] = null;
      });
      if (preloadedNextRef.current === videoId) preloadedNextRef.current = null;
      void refresh();
    });
  }, [nowPlaying, queued, refresh]);

  // ─── Auto-skip cuando YouTube bloquea el video ───
  // Códigos 100 (no existe), 101/150 (embed deshabilitado/copyright/región).
  //
  // Se escucha en los DOS slots, no solo en el activo. El error de "embed
  // bloqueado" salta cuando se CUEA el video durante la precarga — hasta 9s
  // antes de que suene — y en ese momento el video vive en el slot standby.
  // Escuchando solo al activo ese aviso se perdia, la cancion entraba igual y
  // la TV se quedaba en "Video no disponible" para siempre.
  useEffect(() => {
    const onErr = (code: number, videoId: string | null) => {
      if (code === 100 || code === 101 || code === 150) {
        skipByVideoId(videoId, `video bloqueado (codigo ${code})`);
      }
    };
    const offA = playerA.onError(onErr);
    const offB = playerB.onError(onErr);
    return () => { offA(); offB(); };
  }, [playerA, playerB, skipByVideoId]);

  // ─── Stuck detection: si currentTime no avanza, asumimos bloqueo silencioso ───
  // Detecta el videoId que ESTÁ realmente cargado en el slot active (puede no
  // coincidir con nowPlaying durante el window de switch tras un crossfade).
  // Para skipear, busca el item correcto entre nowPlaying/queued con ese videoId.
  //
  // IMPORTANTE: esto corre en su PROPIO interval, no como effect sobre
  // `currentTimeSec`. Colgado del tiempo, el chequeo se apaga justo cuando más
  // hace falta: en pausa `currentTimeSec` deja de cambiar → el effect no vuelve
  // a correr → el reloj de stuck se queda clavado en el instante de la pausa, y
  // al reanudar `sinceProgress` vale toda la pausa y dispara un skip falso.
  const YT_PAUSED = 2; // YT.PlayerState.PAUSED, sin depender del global
  const STUCK_TIMEOUT_MS = 5000;
  // Arrancar tarda mas que seguir sonando: en el WiFi de un bar un video puede
  // pasar varios segundos en BUFFERING sin estar roto. Se le da mas margen al
  // caso "aun no empieza" que al caso "venia sonando y se congelo".
  const STUCK_START_TIMEOUT_MS = 12000;
  const STUCK_PLAYBACK_OK_THRESHOLD_SEC = 5;
  const STUCK_MAX_CASCADE = 3;
  const STUCK_CHECK_MS = 1000;
  const stuckRef = useRef<{ vid: string | null; lastTime: number; lastUpdate: number; loadedAt: number }>({
    vid: null,
    lastTime: 0,
    lastUpdate: Date.now(),
    loadedAt: Date.now(),
  });
  // Contador de auto-skips consecutivos sin reproducción exitosa (t > 5s).
  // Si pasa de STUCK_MAX_CASCADE, dejamos de auto-skipear: probablemente
  // hay un problema sistémico (ad-blocker, red, browser policy) y vaciar
  // toda la cola no ayuda — el usuario debe intervenir.
  const cascadeRef = useRef(0);

  // Snapshot de lo que el watchdog necesita leer, para que el interval se cree
  // una sola vez y siempre vea el estado más reciente sin re-suscribirse.
  const stuckInputRef = useRef({
    showOverlay, activeSlot, nowPlaying, queued, refresh,
    state: active.state.playerState,
    currentTimeSec: active.state.currentTimeSec,
  });
  useEffect(() => {
    stuckInputRef.current = {
      showOverlay, activeSlot, nowPlaying, queued, refresh,
      state: active.state.playerState,
      currentTimeSec: active.state.currentTimeSec,
    };
  });

  useEffect(() => {
    const check = () => {
      const {
        showOverlay: overlay, activeSlot: slot, nowPlaying: playing, queued: pending,
        refresh: reload, state, currentTimeSec: t,
      } = stuckInputRef.current;

      if (overlay) {
        stuckRef.current.vid = null;
        cascadeRef.current = 0;
        return;
      }
      const slotVid = loadedRef.current[slot];
      if (!slotVid) {
        stuckRef.current.vid = null;
        return;
      }
      const now = Date.now();

      // Reset cuando cambia el video del slot
      if (stuckRef.current.vid !== slotVid) {
        stuckRef.current = { vid: slotVid, lastTime: 0, lastUpdate: now, loadedAt: now };
        return;
      }

      // Solo la PAUSA congela el reloj. Antes se congelaba ante cualquier
      // `!isPlaying`, y eso volvia indetectable el caso opuesto: un video
      // bloqueado nunca llega a PLAYING, asi que el reloj quedaba congelado
      // para siempre y la TV se quedaba clavada en "Video no disponible".
      // UNSTARTED / CUED / BUFFERING significan "deberia estar sonando y no
      // suena" — esos SI cuentan para el timeout.
      if (state === YT_PAUSED) {
        stuckRef.current.lastTime = t;
        stuckRef.current.lastUpdate = now;
        stuckRef.current.loadedAt = now;
        return;
      }

      // Si t cambió (avanzó, retrocedió por seek, o jitter): hay vida en el iframe.
      // Antes usábamos `t > lastTime + 0.3` pero el threshold causaba falsos
      // positivos cuando el tick caía justo abajo de 0.3s; cualquier cambio basta.
      if (t !== stuckRef.current.lastTime) {
        stuckRef.current.lastTime = t;
        stuckRef.current.lastUpdate = now;
        // Reproducción exitosa: reseteamos el contador de cascada.
        if (t > STUCK_PLAYBACK_OK_THRESHOLD_SEC) cascadeRef.current = 0;
        return;
      }

      const sinceLoaded = now - stuckRef.current.loadedAt;
      const sinceProgress = now - stuckRef.current.lastUpdate;

      if (!((t === 0 && sinceLoaded > STUCK_START_TIMEOUT_MS) || (t > 0 && sinceProgress > STUCK_TIMEOUT_MS))) {
        return;
      }

      // Circuit breaker: si ya fueron N auto-skips seguidos sin que ninguna
      // canción llegue a reproducirse >5s, bailamos. Vaciar toda la cola
      // automáticamente solo agrava un problema sistémico (CORS de ads,
      // ad-blocker bloqueando iframe, browser que freezó el tab, etc.).
      if (cascadeRef.current >= STUCK_MAX_CASCADE) {
        console.error(
          `[player] cascada de stuck (${cascadeRef.current} skips seguidos). ` +
          `Auto-skip desactivado hasta el próximo cambio. Pulsa Play manualmente.`,
        );
        stuckRef.current.vid = null; // dejar de chequear hasta el próximo load
        return;
      }

      // Buscar el item correspondiente al videoId cargado
      const stuckItem =
        playing?.track.youtubeVideoId === slotVid
          ? playing
          : pending.find((q) => q.track.youtubeVideoId === slotVid);

      if (!stuckItem) {
        console.warn('[player] stuck but no matching item found for', slotVid);
        return;
      }

      cascadeRef.current++;
      if (stuckItem.id === playing?.id) retiringItemRef.current = stuckItem.id;
      console.warn(
        `[player] stuck "${stuckItem.track.title}" ` +
        `(t=${t.toFixed(2)}, sinceLoaded=${sinceLoaded}ms, cascade=${cascadeRef.current}/${STUCK_MAX_CASCADE}), auto-skipping`,
      );
      stuckRef.current.vid = null; // evitar doble skip
      void setItemStatus(stuckItem.id, 'skipped').then(() => {
        loadedRef.current[slot] = null;
        preloadedNextRef.current = null;
        void reload();
      });
    };

    const id = window.setInterval(check, STUCK_CHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  // ─── Recibe comandos remotos del admin (cross-tab via socket.io) ───
  useReceivePlayerCommand(venue.id, (cmd) => {
    if (showOverlay) return; // ignorar comandos antes de iniciar reproductor
    switch (cmd) {
      case 'play': active.controls.play(); break;
      case 'pause': active.controls.pause(); break;
      case 'skip': handleSkipTrack(); break;
      case 'mute':
        setMuted(true);
        active.controls.setVolume(0);
        break;
      case 'unmute':
        setMuted(false);
        active.controls.setVolume(volumeRef.current);
        break;
      case 'volume-up':
        if (!muted) active.controls.setVolume(nudgeVolume(10));
        break;
      case 'volume-down':
        if (!muted) active.controls.setVolume(nudgeVolume(-10));
        break;
    }
  });

  // ─── Auto-hide del HUD por inactividad (estilo YouTube/Netflix) ───
  const [hudVisible, setHudVisible] = useState(true);
  const idleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (showOverlay) {
      setHudVisible(true);
      return;
    }
    const reset = () => {
      setHudVisible(true);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setHudVisible(false), 3500);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('mousedown', reset);
    window.addEventListener('touchstart', reset);
    window.addEventListener('keydown', reset);
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('mousedown', reset);
      window.removeEventListener('touchstart', reset);
      window.removeEventListener('keydown', reset);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [showOverlay]);

  const showVisualizer = !nowPlaying || !nowPlaying.track.hasVideo;

  return (
    <div
      className={[
        'h-screen w-screen overflow-hidden bg-base relative',
        hudVisible || showOverlay ? '' : 'cursor-none',
      ].join(' ')}
    >
      {/* Slot A */}
      <div
        ref={playerA.containerRef}
        className={[
          'absolute inset-0 transition-opacity duration-700',
          activeSlot === 'a' && !showVisualizer ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0',
        ].join(' ')}
      />
      {/* Slot B */}
      <div
        ref={playerB.containerRef}
        className={[
          'absolute inset-0 transition-opacity duration-700',
          activeSlot === 'b' && !showVisualizer ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0',
        ].join(' ')}
      />

      {showVisualizer && (
        <div className="absolute inset-0 z-20">
          <Visualizer imageUrl={nowPlaying?.track.imageUrl} active={active.state.isPlaying} />
        </div>
      )}

      {/* QR panel: SIEMPRE visible (no se oculta con el HUD). En la esquina
          inferior derecha para que clientes lo escaneen desde sus mesas. */}
      {!showOverlay && <PlayerQrPanel slug={venue.slug} size={130} />}

      {showOverlay && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-base/95 backdrop-blur-xl">
          <div className="text-center max-w-md p-8">
            <AppLogo size={200} glow />
            <p className="text-gold font-heading uppercase tracking-[0.22em] text-xs mt-8 mb-2">
              Rocola digital
            </p>
            <h1 className="text-4xl font-display italic text-ink mb-2 leading-tight">
              {venue.name}
            </h1>
            {playerA.state.apiError || playerB.state.apiError ? (
              <p className="text-danger text-sm mb-8 leading-snug">
                {playerA.state.apiError ?? playerB.state.apiError}
              </p>
            ) : (
              <p className="text-ink-mute mb-8">
                {playerA.state.isReady && playerB.state.isReady
                  ? 'Pulsa para activar el audio. Después es automático.'
                  : 'Cargando reproductor...'}
              </p>
            )}
            <NeonButton
              variant="primary"
              size="lg"
              disabled={!playerA.state.isReady || !playerB.state.isReady}
              onClick={() => {
                setShowOverlay(false);
                if (nowPlaying) {
                  active.controls.setVolume(volumeRef.current);
                  active.controls.load(nowPlaying.track.youtubeVideoId, true);
                  loadedRef.current[activeSlot] = nowPlaying.track.youtubeVideoId;
                }
              }}
            >
              Iniciar reproductor
            </NeonButton>
            <div className="flex justify-center gap-4 mt-6 text-[11px] uppercase tracking-widest font-heading text-ink-dim">
              <Link to={`/admin/${venue.slug}`} className="hover:text-gold transition">← Administrador</Link>
              <span className="text-gold/30">·</span>
              <Link to="/" className="hover:text-gold transition">Inicio</Link>
            </div>
          </div>
        </div>
      )}

      {/* Cola persistente — NO se oculta con el HUD por inactividad.
          Va arriba a la derecha para no chocar con el QR (abajo-derecha).
          Solo se renderiza si hay items: si la cola está vacía el QR ya
          invita a pedir, no hace falta duplicar el mensaje. */}
      {!showOverlay && queued.length > 0 && (
        <div className="absolute top-4 right-4 z-30 w-80 max-w-[35vw]">
          <NextUpStrip items={queued} />
        </div>
      )}

      {!showOverlay && (
        <div
          className={[
            'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-base via-base/85 to-transparent p-4 transition-opacity duration-500',
            hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
        >
          <div className="max-w-7xl mx-auto">
            {nowPlaying ? (
              <>
                <p className="text-[10px] uppercase tracking-widest text-gold font-heading mb-0.5">
                  Sonando · slot {activeSlot.toUpperCase()}
                </p>
                <h2 className="text-2xl font-display italic text-ink leading-tight truncate">
                  {nowPlaying.track.title}
                </h2>
                <p className="text-ink-mute text-sm truncate">
                  {joinArtists(nowPlaying.track.artists)}
                  {nowPlaying.requestedByName && (
                    <span className="text-gold ml-2">· {nowPlaying.requestedByName}</span>
                  )}
                </p>
                <SeekBar
                  current={active.state.currentTimeSec}
                  total={active.state.durationSec}
                  onSeek={handleSeek}
                />
              </>
            ) : (
              <p className="text-base text-ink-mute">Esperando que alguien pida música...</p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              <NeonButton
                size="sm"
                variant="ghost"
                onClick={() => active.state.isPlaying ? active.controls.pause() : active.controls.play()}
                disabled={!nowPlaying}
              >
                {active.state.isPlaying ? 'Pausar' : 'Play'}
              </NeonButton>
              <NeonButton size="sm" variant="ghost" onClick={() => handleSkipForward(30)} disabled={!nowPlaying}>
                +30s
              </NeonButton>
              <NeonButton size="sm" variant="ghost" onClick={() => handleSkipForward(-10)} disabled={!nowPlaying}>
                −10s
              </NeonButton>
              <NeonButton size="sm" variant="danger" onClick={handleSkipTrack} disabled={!nowPlaying}>
                Saltar
              </NeonButton>
              <NeonButton size="sm" variant="ghost" onClick={handleToggleMute}>
                {muted ? 'Audio' : 'Silenciar'}
              </NeonButton>
              <NeonButton size="sm" variant="ghost" onClick={fullscreen.toggle}>
                {fullscreen.isFullscreen ? 'Salir FS' : 'Pantalla completa'}
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SeekBar({
  current, total, onSeek,
}: {
  current: number;
  total: number;
  onSeek: (pct: number) => void;
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div className="mt-3">
      <div
        className="h-2 bg-base-elevated rounded-full overflow-hidden cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onSeek(Math.max(0, Math.min(1, ratio)));
        }}
      >
        <div
          className="h-full bg-gradient-gold shadow-gold-sm transition-all group-hover:shadow-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-ink-dim text-xs mt-1">
        <span>{fmt(current)}</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}

const fmt = (sec: number) => {
  if (!sec || !Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
