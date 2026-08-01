import { useEffect, useRef, useState } from 'react';
import {
  itunesGetAlbumTracks,
  itunesGetArtistAlbums,
  itunesSearchArtists,
  type AlbumResult,
  type ArtistResult,
} from '../lib/itunes';
import type { TrackSearchResult } from '../lib/types';

const DEBOUNCE_MS = 300;

export function useArtistSearch(query: string) {
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const myId = ++reqIdRef.current;
    setLoading(true);
    const handle = window.setTimeout(() => {
      itunesSearchArtists(q, { limit: 8 })
        .then((r) => { if (reqIdRef.current === myId) setResults(r); })
        .catch((e) => { console.warn('[artist-search]', e); })
        .finally(() => { if (reqIdRef.current === myId) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  return { results, loading };
}

export function useArtistAlbums(artistId: number | null) {
  const [albums, setAlbums] = useState<AlbumResult[]>([]);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (artistId == null) {
      setAlbums([]);
      return;
    }
    const myId = ++reqIdRef.current;
    setLoading(true);
    itunesGetArtistAlbums(artistId, { limit: 30 })
      .then((r) => { if (reqIdRef.current === myId) setAlbums(r); })
      .catch((e) => { console.warn('[artist-albums]', e); })
      .finally(() => { if (reqIdRef.current === myId) setLoading(false); });
  }, [artistId]);

  return { albums, loading };
}

export function useAlbumTracks(albumId: number | null) {
  const [tracks, setTracks] = useState<TrackSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (albumId == null) {
      setTracks([]);
      return;
    }
    const myId = ++reqIdRef.current;
    setLoading(true);
    itunesGetAlbumTracks(albumId)
      .then((r) => { if (reqIdRef.current === myId) setTracks(r); })
      .catch((e) => { console.warn('[album-tracks]', e); })
      .finally(() => { if (reqIdRef.current === myId) setLoading(false); });
  }, [albumId]);

  return { tracks, loading };
}
