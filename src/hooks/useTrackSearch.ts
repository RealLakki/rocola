import { useEffect, useMemo, useRef, useState } from 'react';
import { itunesSearch } from '../lib/itunes';
import { getTrackTagsBulk, isLastfmEnabled } from '../lib/lastfm';
import { genreMatchedFor, type Genre, type TrackSearchResult } from '../lib/types';

const DEBOUNCE_MS = 300;
const FINAL_LIMIT = 12;

export function useTrackSearch(
  query: string,
  allowExplicit: boolean,
  allowedGenres: Genre[] = [],
) {
  const [results, setResults] = useState<TrackSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reqIdRef = useRef(0);

  const genresKey = useMemo(() => allowedGenres.slice().sort().join(','), [allowedGenres]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const myId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    const allowed = genresKey ? (genresKey.split(',') as Genre[]) : [];
    const useLastfm = allowed.length > 0 && isLastfmEnabled();

    const handle = window.setTimeout(() => {
      // Si vamos a filtrar con Last.fm, NO le pasamos filtro a iTunes — pedimos
      // todo el set crudo para tener candidatos y filtrar después con tags reales.
      itunesSearch(q, {
        limit: useLastfm ? 30 : FINAL_LIMIT,
        allowExplicit,
        allowedGenres: useLastfm ? [] : allowed,
        market: 'CO', // catálogo/labels de música popular colombiana
      })
        .then(async (rawResults) => {
          if (reqIdRef.current !== myId) return;

          if (!useLastfm) {
            setResults(rawResults);
            return;
          }

          // Enrich con tags de Last.fm
          const tagBatches = await getTrackTagsBulk(
            rawResults.map((r) => ({ artist: r.artists[0] ?? '', title: r.title })),
          );
          if (reqIdRef.current !== myId) return;

          const filtered: TrackSearchResult[] = [];
          const acceptedDebug: Array<{ track: string; tags: string[]; itunes?: string; matched?: string; via: string }> = [];
          const rejected: Array<{ track: string; tags: string[]; itunes?: string }> = [];

          rawResults.forEach((r, i) => {
            const tags = tagBatches[i] ?? [];
            const itunesGenre = r.genres?.[0];
            const result = genreMatchedFor(tags, itunesGenre, allowed, r.artists[0]);
            if (result.allowed) {
              filtered.push(r);
              acceptedDebug.push({
                track: `${r.artists[0]} - ${r.title}`,
                tags,
                itunes: itunesGenre,
                matched: result.matchedGenre ?? '(via itunes fallback)',
                via: result.matchedTag ? `tag:${result.matchedTag}` : 'itunes-genre',
              });
            } else {
              rejected.push({
                track: `${r.artists[0]} - ${r.title}`,
                tags,
                itunes: itunesGenre,
              });
            }
          });

          console.log(
            `[genre-filter] "${q}" allowed=[${allowed.join(',')}]: ${filtered.length} pass, ${rejected.length} rejected`,
          );
          if (acceptedDebug.length > 0) {
            console.log('[genre-filter] accepted:', acceptedDebug);
          }
          if (rejected.length > 0) {
            console.log('[genre-filter] rejected:', rejected);
          }

          setResults(filtered.slice(0, FINAL_LIMIT));
        })
        .catch((e) => {
          if (reqIdRef.current === myId) setError(e as Error);
        })
        .finally(() => {
          if (reqIdRef.current === myId) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, allowExplicit, genresKey]);

  return { results, loading, error };
}
