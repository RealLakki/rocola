// Cliente realtime (socket.io) — reemplaza a Supabase Realtime.
// El server (server.mjs) emite `queue:changed` / `venue:changed` al room del
// venue tras cada escritura, y relaya `player:cmd` (admin -> reproductor).
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
const joinedVenues = new Set<string>();

/** Socket singleton (mismo origin: en prod lo sirve el propio Express; en dev
 *  Vite lo proxea a :3100). Re-une a los rooms tras reconectar. */
function getSocket(): Socket {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      joinedVenues.forEach((v) => socket!.emit('join', v));
    });
  }
  return socket;
}

export function joinVenue(venueId: string): void {
  const s = getSocket();
  joinedVenues.add(venueId);
  if (s.connected) s.emit('join', venueId);
}

/** Suscribe a un evento de datos scoped al venue. Devuelve la función de baja. */
export function onVenueEvent(
  venueId: string,
  event: 'queue:changed' | 'venue:changed',
  handler: () => void,
): () => void {
  const s = getSocket();
  joinVenue(venueId);
  const fn = (payload: { venueId?: string }) => {
    if (!payload?.venueId || payload.venueId === venueId) handler();
  };
  s.on(event, fn);
  return () => { s.off(event, fn); };
}

/** Escucha comandos del reproductor (usar en el player). Devuelve la baja. */
export function onPlayerCommand(
  venueId: string,
  handler: (command: string) => void,
): () => void {
  const s = getSocket();
  joinVenue(venueId);
  const fn = (payload: { command?: string }) => {
    if (payload?.command) handler(payload.command);
  };
  s.on('player:cmd', fn);
  return () => { s.off('player:cmd', fn); };
}

/** Envía un comando al reproductor del venue (usar en admin). */
export function sendPlayerCommand(venueId: string, command: string): void {
  const s = getSocket();
  joinVenue(venueId);
  s.emit('player:cmd', { venueId, command, ts: Date.now() });
}
