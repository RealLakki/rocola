import type { ResolvedTrack, TrackSearchResult } from './types';

/**
 * Abstracción de la fuente de música. Hoy: Spotify (search) + YouTube (playback).
 * Mañana: SoundMachine, biblioteca local, Soundtrack Your Brand, etc.
 * Cambiar de provider no debería tocar UI ni hooks.
 */
export interface MusicProvider {
  search(query: string, opts?: SearchOptions): Promise<TrackSearchResult[]>;
  resolve(track: TrackSearchResult): Promise<ResolvedTrack | null>;
}

export interface SearchOptions {
  limit?: number;
  market?: string;
  /** Si está, filtra los resultados a estos géneros (mejor esfuerzo). */
  allowedGenres?: string[];
  allowExplicit?: boolean;
}
