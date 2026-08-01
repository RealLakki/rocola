import type { ResolvedTrack, TrackSearchResult } from './types';
import { isUsableSongCandidate, pickBestCandidate, type YoutubeCandidate } from '../utils/youtubeFilter';
import { cacheYoutubeResolution, getCachedYoutubeResolution } from './api';

export const YT_PROVIDER_PREFIX = 'yt:';
/** Igual que yt: pero indica que el video es solo audio (Topic auto-generado).
 *  El reproductor mostrará el visualizer dorado en vez del iframe. */
export const YT_AUDIO_PROVIDER_PREFIX = 'yt-audio:';

/**
 * Resuelve un TrackSearchResult (de Spotify) al mejor video oficial de YouTube.
 * Pasos:
 *  1) Búsqueda en Music category (videoCategoryId=10) — query: "artist title"
 *  2) Trae detalles (duration, viewCount, channel) en una sola call
 *  3) Scoring vía youtubeFilter.ts
 *  4) Devuelve el ganador o null si nadie pasa el umbral mínimo
 *
 * Nota: la API key debe estar restringida por HTTP referrer en Google Cloud
 * Console — de lo contrario cualquiera puede agotarte la cuota.
 */

const MIN_ACCEPTABLE_SCORE = 28;
const MAX_RESULTS = 25;

/** PT3M21S → 201000 */
function isoDurationToMs(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] ?? '0', 10);
  const min = parseInt(m[2] ?? '0', 10);
  const s = parseInt(m[3] ?? '0', 10);
  return ((h * 60 + min) * 60 + s) * 1000;
}

/**
 * Mapea un item del proxy a YoutubeCandidate. Soporta AMBOS shapes:
 * - scrape (modo sin cuota): trae `durationMs`/`viewCount`/`official` directos.
 * - API oficial: `contentDetails.duration` (ISO) + `statistics.viewCount`.
 */
function mapItemToCandidate(v: any): YoutubeCandidate {
  const videoId = v?.id?.videoId ?? v?.id ?? '';
  const snippet = v?.snippet ?? {};
  const channelTitle = snippet.channelTitle ?? '';
  const durationMs =
    typeof v?.durationMs === 'number' ? v.durationMs
    : v?.contentDetails?.duration ? isoDurationToMs(v.contentDetails.duration)
    : 0;
  const viewCount =
    typeof v?.viewCount === 'number' ? v.viewCount
    : parseInt(v?.statistics?.viewCount ?? '0', 10);
  return {
    videoId,
    title: snippet.title ?? '',
    channelTitle,
    channelId: snippet.channelId ?? '',
    durationMs,
    viewCount,
    publishedAt: snippet.publishedAt ?? '',
    channelLooksOfficial:
      v?.official === true ||
      /\bofficial\b/i.test(channelTitle) ||
      /VEVO$/i.test(channelTitle) ||
      /Music$/i.test(channelTitle),
  };
}

/** Busca en YouTube y devuelve candidatos completos (con duración/vistas) en UNA
 *  sola llamada — el scrape ya trae la duración, así no se necesita videos.list. */
async function searchCandidates(query: string): Promise<YoutubeCandidate[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(MAX_RESULTS) });
  const res = await fetch(`/api/youtube-search?${params}`);
  if (!res.ok) throw new Error(`YT search failed: ${res.status}`);
  const data = (await res.json()) as { items?: any[] };
  return (data.items ?? []).map(mapItemToCandidate).filter((c) => c.videoId);
}

/** Detalle de un video puntual (para links pegados). */
async function getVideoDetails(ids: string[]): Promise<YoutubeCandidate[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({ id: ids.join(',') });
  const res = await fetch(`/api/youtube-videos?${params}`);
  if (!res.ok) throw new Error(`YT videos failed: ${res.status}`);
  const data = (await res.json()) as { items?: any[] };
  return (data.items ?? []).map(mapItemToCandidate).filter((c) => c.videoId);
}

/**
 * Búsqueda directa en YouTube como fallback cuando iTunes no tiene la canción.
 * Devuelve TrackSearchResult[] con providerId = "yt:VIDEOID" para que el
 * handleAdd sepa saltarse el resolver (el videoId ya lo tenemos).
 *
 * Filtra duro: descarta covers/karaoke/lives. Si hay video oficial real,
 * lo prefiere sobre los canales "Topic" auto-generados de YouTube
 * (que solo tienen audio + portada).
 */
export async function youtubeSearchAsTracks(query: string): Promise<TrackSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  // Lowercase + sin acentos — para que YouTube no se confunda con MAYÚSCULAS
  const queryNorm = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  const candidates = await searchCandidates(queryNorm);

  const NEGATIVES = /\b(karaoke|cover|tutorial|reaction|sped up|slowed|nightcore|8d|bass boosted|mashup|parody)\b/i;
  const TOPIC = /\s*-\s*Topic$/i;

  // Palabras significativas del query (ignorar las muy cortas como "de", "la", "el")
  const queryWords = queryNorm.split(/\s+/).filter((w) => w.length > 3);

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const inRange = (c: typeof candidates[number]) => c.durationMs >= 90_000 && c.durationMs <= 720_000;

  // Cuántas palabras del query aparecen en title o channel del candidato
  const relevanceScore = (c: typeof candidates[number]): number => {
    const blob = norm(`${c.title} ${c.channelTitle}`);
    return queryWords.filter((w) => blob.includes(w)).length;
  };

  // Exigimos al menos 1 palabra significativa del query en title o channel.
  // Si el query tiene solo palabras cortas, no aplicamos el filtro.
  const minRelevance = queryWords.length === 0 ? 0 : 1;

  const clean = candidates
    .filter((c) => !NEGATIVES.test(c.title))
    .filter((c) => isUsableSongCandidate(c))
    .filter(inRange)
    .filter((c) => relevanceScore(c) >= minRelevance);

  // Separamos Topic vs no-Topic. Si hay no-Topic disponibles, esos son
  // los que mostramos. El Topic queda como fallback solo si no hay video real.
  const nonTopic = clean.filter((c) => !TOPIC.test(c.channelTitle));
  const topicOnly = clean.filter((c) => TOPIC.test(c.channelTitle));

  // Ranking dentro de cada grupo: primero por relevancia (cuántas palabras
  // del query coinciden), después por popularidad como tiebreaker.
  const rankFn = (a: typeof candidates[number], b: typeof candidates[number]) => {
    const ra = relevanceScore(a);
    const rb = relevanceScore(b);
    if (rb !== ra) return rb - ra;
    return b.viewCount - a.viewCount;
  };

  const usable = [
    ...nonTopic.sort(rankFn),
    ...topicOnly.sort(rankFn),
  ];

  // Logs siempre activos para debug en producción — ayudan a calibrar.
  console.log(
    `[yt-fallback] "${q}" → ${candidates.length} raw, ${nonTopic.length} non-topic, ${topicOnly.length} topic`,
  );
  if (usable.length > 0) {
    console.log(
      '[yt-fallback] top 5:',
      usable.slice(0, 5).map((c) => ({
        title: c.title,
        channel: c.channelTitle,
        views: c.viewCount,
        topic: TOPIC.test(c.channelTitle),
      })),
    );
  }

  return usable.slice(0, 12).map((c) => {
    const isTopic = TOPIC.test(c.channelTitle);
    // Parseamos "Artista - Titulo" del título de YouTube si lo tiene formato común
    const dashSplit = c.title.split(/\s*[-–—]\s+|\s+[-–—]\s*/);
    let artist = c.channelTitle.replace(/\s*-\s*topic$/i, '').replace(/VEVO$/i, '').replace(/Music$/i, '').trim();
    let title = c.title;
    if (dashSplit.length >= 2) {
      // "Karol G - PROVENZA (Official Video)" → artist="Karol G", title="PROVENZA"
      artist = dashSplit[0].trim();
      title = dashSplit.slice(1).join(' - ').trim();
    }
    // Limpia sufijos comunes
    title = title.replace(/\s*\((official|video|audio|music|lyric|lyrics|letra|letras|hd|4k)[^)]*\)\s*/gi, '').trim();
    title = title.replace(/\s*\[(official|video|audio|music|lyric|lyrics|letra|letras|hd|4k)[^\]]*\]\s*/gi, '').trim();

    return {
      providerId: `${isTopic ? YT_AUDIO_PROVIDER_PREFIX : YT_PROVIDER_PREFIX}${c.videoId}`,
      title,
      artists: [artist],
      durationMs: c.durationMs,
      imageUrl: `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`,
      explicit: false,
    } satisfies TrackSearchResult;
  });
}

/** Detecta si un track viene de YouTube fallback (skip resolver). */
export function isYoutubeProvidedTrack(track: TrackSearchResult): boolean {
  return (
    track.providerId.startsWith(YT_PROVIDER_PREFIX) ||
    track.providerId.startsWith(YT_AUDIO_PROVIDER_PREFIX)
  );
}

/**
 * Extrae el videoId de cualquier formato de URL de YouTube.
 * Soporta videos normales: youtube.com/watch?v=ID, youtu.be/ID,
 * youtube.com/embed/ID, music.youtube.com/watch?v=ID, m.youtube.com/...
 * Rechaza /shorts/ porque suelen ser clips, no canciones completas.
 */
export function extractYoutubeVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  if (/youtube\.com\/shorts\//i.test(s) || /\/shorts\//i.test(s)) return null;

  // Si ya parece un videoId puro (11 chars, alfanuméricos + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  // Patrones de URL típicos
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,           // youtube.com/watch?v=XXX
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,      // youtu.be/XXX
    /\/embed\/([a-zA-Z0-9_-]{11})/,        // /embed/XXX
    /\/v\/([a-zA-Z0-9_-]{11})/,            // /v/XXX
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Resuelve una URL/videoId de YouTube a un TrackSearchResult listo para agregar.
 * Para casos donde el search de YouTube no encuentra la canción (catálogo nicho)
 * y el usuario tiene el link directo del video oficial.
 */
export async function youtubeUrlToTrack(input: string): Promise<TrackSearchResult | null> {
  const videoId = extractYoutubeVideoId(input);
  if (!videoId) return null;

  const candidates = await getVideoDetails([videoId]);
  if (candidates.length === 0) return null;

  const c = candidates[0];
  if (!isUsableSongCandidate(c)) return null;
  const TOPIC = /\s*-\s*Topic$/i;
  const isTopic = TOPIC.test(c.channelTitle);

  // Parseamos "Artista - Titulo" del título
  const dashSplit = c.title.split(/\s+[-–—]\s+/);
  let artist = c.channelTitle.replace(/\s*-\s*topic$/i, '').replace(/VEVO$/i, '').replace(/Music$/i, '').trim();
  let title = c.title;
  if (dashSplit.length >= 2) {
    artist = dashSplit[0].trim();
    title = dashSplit.slice(1).join(' - ').trim();
  }
  title = title.replace(/\s*\((official|video|audio|music|lyric|lyrics|letra|letras|hd|4k)[^)]*\)\s*/gi, '').trim();
  title = title.replace(/\s*\[(official|video|audio|music|lyric|lyrics|letra|letras|hd|4k)[^\]]*\]\s*/gi, '').trim();

  return {
    providerId: `${isTopic ? YT_AUDIO_PROVIDER_PREFIX : YT_PROVIDER_PREFIX}${videoId}`,
    title,
    artists: [artist],
    durationMs: c.durationMs,
    imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    explicit: false,
  };
}

/** Convierte un YT-provided track a ResolvedTrack sin pasar por resolver. */
export function ytTrackToResolved(track: TrackSearchResult): ResolvedTrack {
  const isTopicAudio = track.providerId.startsWith(YT_AUDIO_PROVIDER_PREFIX);
  const prefix = isTopicAudio ? YT_AUDIO_PROVIDER_PREFIX : YT_PROVIDER_PREFIX;
  return {
    ...track,
    youtubeVideoId: track.providerId.slice(prefix.length),
    isOfficial: false,
    hasVideo: !isTopicAudio, // Topic = solo audio, mostrar visualizer
  };
}

export async function resolveOnYoutube(
  track: TrackSearchResult,
): Promise<ResolvedTrack | null> {
  // Cache hit: si ya resolvimos esta canción antes (cualquier bar, alguna vez),
  // devolvemos el videoId guardado sin gastar cuota de YouTube API.
  // Esto es lo que permite escalar — canciones populares se resuelven 1 vez.
  const cached = await getCachedYoutubeResolution(track.providerId);
  if (cached) {
    if (import.meta.env.DEV) {
      console.log(`[youtube] CACHE HIT for "${track.title}" → ${cached.youtubeVideoId}`);
    }
    return { ...track, ...cached };
  }

  // Query LIMPIA — sin "official" en el query, eso sesga a YT a devolver
  // los videos más populares oficiales del artista (aunque no sean la canción
  // pedida). El bonus por "official" se aplica en el scoring, no en la query.
  const query = `${track.artists[0] ?? ''} ${track.title}`.trim();
  const candidates = await searchCandidates(query);

  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { scoreCandidate } = await import('../utils/youtubeFilter');
    const allScored = candidates.map((c) => scoreCandidate(c, track));
    allScored.sort((a, b) => b.score - a.score);
    console.log(
      `[youtube] resolving "${track.artists[0]} - ${track.title}" — top 3:`,
      allScored.slice(0, 3).map((s) => ({
        title: s.candidate.title,
        channel: s.candidate.channelTitle,
        score: Math.round(s.score),
        reasons: s.reasons,
      })),
    );
  }

  const best = pickBestCandidate(candidates, track);
  if (!best || best.score < MIN_ACCEPTABLE_SCORE) {
    console.warn(
      `[youtube] no acceptable match for "${track.title}" (best score: ${best?.score?.toFixed(1) ?? 'none'}, threshold: ${MIN_ACCEPTABLE_SCORE})`,
      best ? { title: best.candidate.title, channel: best.candidate.channelTitle, reasons: best.reasons } : undefined,
    );
    return null;
  }
  const resolution = {
    youtubeVideoId: best.candidate.videoId,
    isOfficial: best.isOfficial,
    hasVideo: best.hasVideo,
  };

  // Guardar al cache (fire-and-forget — no esperar para no demorar al user)
  void cacheYoutubeResolution(track.providerId, resolution);

  return { ...track, ...resolution };
}
