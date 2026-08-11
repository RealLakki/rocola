import { useEffect, useRef, useState } from 'react';

/**
 * Wrapper sobre YT.Player resistente a StrictMode.
 *
 * Idea: en vez de pasarle a YT.Player el id de un div renderizado por React
 * (que YT reemplaza con un iframe — y si React re-monta el efecto, ya no
 * existe ese id), creamos dinámicamente un sub-div dentro de un contenedor
 * que React conserva. YT reemplaza ese sub-div, y en cleanup lo borramos
 * limpiamente para que la siguiente ejecución del efecto recree todo.
 */

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT: typeof YT;
  }
}

/**
 * El check `window.YT && window.YT.Player` NO basta — YT define un placeholder
 * temprano y la API real (que dispara onReady) llega cuando widget_api.js
 * termina de cargar. El flag oficial para "todo listo" es `YT.loaded === 1`.
 */
let apiReadyPromise: Promise<void> | null = null;
function whenApiReady(): Promise<void> {
  if (apiReadyPromise) return apiReadyPromise;
  apiReadyPromise = new Promise<void>((resolve, reject) => {
    const isFullyLoaded = () =>
      typeof window.YT !== 'undefined' &&
      (window.YT as unknown as { loaded?: number }).loaded === 1;

    if (isFullyLoaded()) {
      console.log('[yt] API was already loaded');
      resolve();
      return;
    }

    // Combinar callback global (que YT llama 1 sola vez) con polling
    // como red de seguridad por si el callback se pierde.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      console.log('[yt] onYouTubeIframeAPIReady fired');
      prev?.();
      resolve();
    };

    const start = Date.now();
    const poll = window.setInterval(() => {
      if (isFullyLoaded()) {
        console.log('[yt] API ready (via polling)');
        window.clearInterval(poll);
        resolve();
      } else if (Date.now() - start > 15_000) {
        window.clearInterval(poll);
        const err = new Error(
          'YouTube IFrame API no cargo en 15s. Posibles causas: ad-blocker, ' +
          'firewall, extension de privacidad, o que el script no se incluyo en index.html.',
        );
        console.error('[yt]', err.message);
        reject(err);
      }
    }, 250);
  });
  return apiReadyPromise;
}

export interface PlayerState {
  isReady: boolean;
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  /**
   * Motivo por el que el reproductor nunca llegó a estar listo (la API de
   * YouTube no cargó). Sin exponerlo, la TV se queda con el botón de iniciar
   * deshabilitado y un "Cargando reproductor..." eterno, sin pista de que la
   * causa es un bloqueador de anuncios o un WiFi que filtra youtube.com.
   */
  apiError: string | null;
}

export interface PlayerControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  load: (videoId: string, autoplay?: boolean) => void;
  seekTo: (sec: number) => void;
  setVolume: (vol: number) => void;
}

export function useYoutubePlayer(): {
  containerRef: React.RefObject<HTMLDivElement>;
  state: PlayerState;
  controls: PlayerControls;
  onEnded: (cb: () => void) => () => void;
  onError: (cb: (code: number) => void) => () => void;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const endedHandlersRef = useRef<Set<() => void>>(new Set());
  const errorHandlersRef = useRef<Set<(code: number) => void>>(new Set());
  const tickRef = useRef<number | null>(null);
  const [state, setState] = useState<PlayerState>({
    isReady: false,
    isPlaying: false,
    currentTimeSec: 0,
    durationSec: 0,
    apiError: null,
  });

  useEffect(() => {
    let destroyed = false;
    let createdTarget: HTMLDivElement | null = null;

    const start = async () => {
      console.log('[yt] hook mounted, awaiting API...');
      try {
        await whenApiReady();
      } catch (e) {
        console.error('[yt] aborting init:', e);
        if (!destroyed) {
          setState((s) => ({
            ...s,
            apiError:
              'No se pudo cargar el reproductor de YouTube. Revisa la conexion ' +
              'del televisor y desactiva bloqueadores de anuncios o extensiones ' +
              'de privacidad en este navegador.',
          }));
        }
        return;
      }
      if (destroyed || !containerRef.current) {
        console.warn('[yt] aborted: destroyed or no container');
        return;
      }

      // Vaciar el contenedor (por si quedo algo de un ciclo previo de StrictMode)
      containerRef.current.innerHTML = '';
      createdTarget = document.createElement('div');
      createdTarget.style.width = '100%';
      createdTarget.style.height = '100%';
      containerRef.current.appendChild(createdTarget);

      console.log('[yt] creating Player instance');
      playerRef.current = new YT.Player(createdTarget, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            console.log('[yt] player onReady fired');
            if (!destroyed) setState((s) => ({ ...s, isReady: true }));
          },
          onStateChange: (e) => {
            if (destroyed) return;
            const playing = e.data === YT.PlayerState.PLAYING;
            setState((s) => ({ ...s, isPlaying: playing }));
            if (e.data === YT.PlayerState.ENDED) {
              endedHandlersRef.current.forEach((cb) => cb());
            }
          },
          onError: (e) => {
            // Códigos comunes:
            // 2  = invalid parameter
            // 5  = HTML5 player error
            // 100 = video not found
            // 101/150 = embed disabled (bloqueado por copyright/región)
            console.error('[yt-player] error code:', e.data);
            errorHandlersRef.current.forEach((cb) => cb(Number(e.data)));
          },
        },
      });
    };

    void start();

    tickRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      try {
        setState((s) => ({
          ...s,
          currentTimeSec: p.getCurrentTime() ?? 0,
          durationSec: p.getDuration() ?? 0,
        }));
      } catch { /* iframe aun no responde */ }
    }, 500);

    return () => {
      destroyed = true;
      if (tickRef.current) window.clearInterval(tickRef.current);
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }
      } catch { /* ignore */ }
      playerRef.current = null;
      if (createdTarget && createdTarget.parentNode) {
        createdTarget.parentNode.removeChild(createdTarget);
      }
      // El contenedor seguro queda limpio para el siguiente mount
      if (containerRef.current) containerRef.current.innerHTML = '';
      setState({ isReady: false, isPlaying: false, currentTimeSec: 0, durationSec: 0, apiError: null });
    };
  }, []);

  // Helpers que NO crashean si el player aun no responde
  const safe = <K extends keyof YT.Player>(method: K): YT.Player[K] | null => {
    const p = playerRef.current;
    if (p && typeof (p as unknown as Record<string, unknown>)[method as string] === 'function') {
      return p[method];
    }
    return null;
  };

  const controls: PlayerControls = {
    play: () => safe('playVideo')?.call(playerRef.current),
    pause: () => safe('pauseVideo')?.call(playerRef.current),
    stop: () => safe('stopVideo')?.call(playerRef.current),
    load: (videoId, autoplay = true) => {
      const fn = autoplay ? safe('loadVideoById') : safe('cueVideoById');
      if (fn) (fn as (id: string) => void).call(playerRef.current, videoId);
      if (autoplay) {
        // Sello explícito del autoplay: en algunos contextos (iframe que cambió
        // de hidden a visible, varios cientos de ms despues del user gesture
        // original), loadVideoById no inicia el play por la policy del browser.
        // Llamar playVideo() inmediatamente despues lo fuerza.
        safe('playVideo')?.call(playerRef.current);
      }
    },
    seekTo: (sec) => {
      const fn = safe('seekTo');
      if (fn) (fn as (s: number, allow: boolean) => void).call(playerRef.current, sec, true);
    },
    setVolume: (vol) => {
      const fn = safe('setVolume');
      if (fn) (fn as (v: number) => void).call(playerRef.current, vol);
    },
  };

  const onEnded = (cb: () => void) => {
    endedHandlersRef.current.add(cb);
    return () => { endedHandlersRef.current.delete(cb); };
  };

  const onError = (cb: (code: number) => void) => {
    errorHandlersRef.current.add(cb);
    return () => { errorHandlersRef.current.delete(cb); };
  };

  return { containerRef, state, controls, onEnded, onError };
}
