import { useCallback, useEffect, useRef } from 'react';
import { onPlayerCommand, sendPlayerCommand } from '../lib/realtime';

/**
 * Control remoto del reproductor TV desde otra pestaña/dispositivo.
 * Usa socket.io (server relaya el comando al room del venue) — mensajes
 * one-shot, sin persistencia, baja latencia. Perfecto para comandos de control.
 *
 * Patrón:
 * - Admin: `useSendPlayerCommand(venueId)` → send('play'), send('skip')
 * - Player: `useReceivePlayerCommand(venueId, handlers)` → escucha y ejecuta
 */

export type PlayerCommand =
  | 'play'
  | 'pause'
  | 'skip'
  | 'mute'
  | 'unmute'
  | 'volume-up'
  | 'volume-down';

/** Hook para ENVIAR comandos al player (usar en admin). */
export function useSendPlayerCommand(venueId: string | undefined) {
  return useCallback(
    (command: PlayerCommand) => {
      if (!venueId) return;
      sendPlayerCommand(venueId, command);
    },
    [venueId],
  );
}

/** Hook para RECIBIR comandos del player (usar en reproductor). */
export function useReceivePlayerCommand(
  venueId: string | undefined,
  onCommand: (cmd: PlayerCommand) => void,
) {
  // Mantener referencia estable al callback para no re-suscribir cada render.
  const handlerRef = useRef(onCommand);
  useEffect(() => { handlerRef.current = onCommand; }, [onCommand]);

  useEffect(() => {
    if (!venueId) return;
    const off = onPlayerCommand(venueId, (cmd) => handlerRef.current(cmd as PlayerCommand));
    return off;
  }, [venueId]);
}
