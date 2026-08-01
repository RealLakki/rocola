import { genreAllowed, type Genre, type TrackSearchResult } from './types';
import type { SearchOptions } from './musicProvider';

/**
 * iTunes Search API — gratis, pública, CORS habilitado, sin auth.
 * Catálogo global incluyendo música latina, internacional, indie, etc.
 *
 * Doc: https://performance-partners.apple.com/search-api
 */

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  trackTimeMillis: number;
  artworkUrl100?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackExplicitness?: 'explicit' | 'cleaned' | 'notExplicit';
  wrapperType?: string;
  kind?: string;
}

interface ITunesResponse {
  resultCount: number;
  results: ITunesTrack[];
}

export interface ItunesSearchOptions extends SearchOptions {
  /** ISO 3166-1 alpha-2 (US, CO, MX, AR, ES, etc.). 'US' por default — catálogo más amplio. */
  market?: string;
  /** Si está poblado, solo devuelve canciones cuyo género matchee. */
  allowedGenres?: Genre[];
}

export async function itunesSearch(
  query: string,
  opts: ItunesSearchOptions = {},
): Promise<TrackSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const allowedGenres = (opts.allowedGenres ?? []) as Genre[];

  const params = new URLSearchParams({
    term: q,
    media: 'music',
    entity: 'song',
    country: opts.market ?? 'US',
    limit: String(Math.min((opts.limit ?? 20) * (allowedGenres.length > 0 ? 5 : 2), 100)),
    explicit: opts.allowExplicit === false ? 'No' : 'Yes',
  });

  const res = await fetch(`/api/itunes-search?${params}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`iTunes search failed: ${res.status} ${errData.error || ''}`);
  }
  const data: ITunesResponse = await res.json();

  const tracks = data.results
    .filter((t) => (t.kind ?? t.wrapperType) === 'song' || t.wrapperType === 'track')
    .filter((t) => opts.allowExplicit !== false || t.trackExplicitness !== 'explicit')
    .filter((t) => genreAllowed(t.primaryGenreName, allowedGenres));

  return tracks.slice(0, opts.limit ?? 20).map(mapTrack);
}

function mapTrack(t: ITunesTrack): TrackSearchResult {
  const imageUrl = t.artworkUrl100?.replace('100x100bb', '600x600bb');
  const year = t.releaseDate ? parseInt(t.releaseDate.slice(0, 4), 10) : undefined;
  return {
    providerId: String(t.trackId),
    title: t.trackName,
    artists: [t.artistName],
    album: t.collectionName,
    durationMs: t.trackTimeMillis,
    imageUrl,
    year,
    explicit: t.trackExplicitness === 'explicit',
    genres: t.primaryGenreName ? [t.primaryGenreName] : undefined,
  };
}

/* ────────────────────────── Artistas y Álbumes ────────────────────────── */

export interface ArtistResult {
  itunesId: number;
  name: string;
  primaryGenreName?: string;
  artistType?: string;
  /** iTunes no devuelve foto de artista en su API gratuita; mostraremos
   * placeholder o el artwork del álbum más reciente cuando lo carguemos. */
  imageUrl?: string;
}

export interface AlbumResult {
  itunesId: number;
  name: string;
  artistName: string;
  artistId?: number;
  imageUrl?: string;
  releaseDate?: string;
  trackCount?: number;
  primaryGenreName?: string;
}

interface ITunesArtist {
  artistId: number;
  artistName: string;
  primaryGenreName?: string;
  artistType?: string;
  wrapperType: string;
}

interface ITunesAlbum {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artistId?: number;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
  primaryGenreName?: string;
  wrapperType: string;
  collectionType?: string;
}

export async function itunesSearchArtists(
  query: string,
  opts: { limit?: number; market?: string } = {},
): Promise<ArtistResult[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({
    term: q,
    media: 'music',
    entity: 'musicArtist',
    country: opts.market ?? 'US',
    limit: String(Math.min(opts.limit ?? 8, 25)),
  });
  const res = await fetch(`/api/itunes-search?${params}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`iTunes artist search failed: ${res.status} ${errData.error || ''}`);
  }
  const data = (await res.json()) as { results: ITunesArtist[] };
  return data.results
    .filter((a) => a.wrapperType === 'artist')
    .map((a) => ({
      itunesId: a.artistId,
      name: a.artistName,
      primaryGenreName: a.primaryGenreName,
      artistType: a.artistType,
    }));
}

export async function itunesGetArtistAlbums(
  artistId: number,
  opts: { limit?: number; market?: string } = {},
): Promise<AlbumResult[]> {
  const params = new URLSearchParams({
    id: String(artistId),
    entity: 'album',
    country: opts.market ?? 'US',
    limit: String(Math.min(opts.limit ?? 25, 100)),
  });
  const res = await fetch(`/api/itunes-search?${params}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`iTunes albums lookup failed: ${res.status} ${errData.error || ''}`);
  }
  const data = (await res.json()) as { results: Array<ITunesAlbum | ITunesArtist> };
  return data.results
    .filter((r): r is ITunesAlbum => r.wrapperType === 'collection')
    .map((a) => ({
      itunesId: a.collectionId,
      name: a.collectionName,
      artistName: a.artistName,
      artistId: a.artistId,
      imageUrl: a.artworkUrl100?.replace('100x100bb', '600x600bb'),
      releaseDate: a.releaseDate,
      trackCount: a.trackCount,
      primaryGenreName: a.primaryGenreName,
    }))
    .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
}

export async function itunesGetAlbumTracks(
  albumId: number,
  opts: { market?: string } = {},
): Promise<TrackSearchResult[]> {
  const params = new URLSearchParams({
    id: String(albumId),
    entity: 'song',
    country: opts.market ?? 'US',
    limit: '60',
  });
  const res = await fetch(`/api/itunes-search?${params}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`iTunes album tracks lookup failed: ${res.status} ${errData.error || ''}`);
  }
  const data = (await res.json()) as { results: Array<ITunesTrack & { wrapperType?: string }> };
  return data.results
    .filter((r) => r.wrapperType === 'track' || r.kind === 'song')
    .map(mapTrack);
}
