/**
 * Last.fm API — usado para enriquecer tracks con tags de género reales.
 * iTunes solo etiqueta a nivel "Latin" / "Música Mexicana" (muy grueso).
 * Last.fm tiene tags por canción/artista mucho más granulares: "reggaeton",
 * "vallenato", "perreo", "corridos tumbados", etc.
 *
 * Las llamadas ahora pasan por el backend proxy para evitar problemas CORS
 * en iOS Safari y ocultar la API key.
 */

interface LastfmTag {
  name: string;
  count?: number;
  url?: string;
}

interface LastfmTrackInfo {
  track?: {
    name: string;
    artist?: { name: string };
    toptags?: { tag: LastfmTag[] };
  };
}

interface LastfmArtistInfo {
  artist?: {
    name: string;
    tags?: { tag: LastfmTag[] };
  };
}

/** Cache en memoria por sesión. Key normalizada para evitar dupes.
 * IMPORTANTE: SOLO se cachean respuestas reales (200 de Last.fm, aunque sean
 * vacías). Los errores/rate-limits NUNCA se cachean — antes se guardaba `[]`
 * ante cualquier fallo, lo que "envenenaba" la caché toda la sesión y hacía
 * que el filtro degradara de forma permanente (causa raíz del "a veces sí,
 * a veces no"). */
const trackCache = new Map<string, string[]>();
const artistCache = new Map<string, string[]>();

const cacheKey = (artist: string, title: string) =>
  `${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resultado de una llamada a Last.fm: `ok` distingue "respuesta real" (aunque
 * `tags` venga vacío) de "error/rate-limit" (para no cachear ni tratar como
 * 'sin tags'). */
interface TagFetch {
  ok: boolean;
  tags: string[];
}

/**
 * fetch con reintento ante 429 (rate-limit) y 5xx, con backoff exponencial.
 * Last.fm free comparte un límite bajo (~5 req/s por key) entre todos los
 * usuarios del proxy, así que en ráfagas es normal ver 429. Devuelve la
 * Response final, o null si la red falló en todos los intentos.
 */
async function fetchWithRetry(url: string, tries = 3): Promise<Response | null> {
  let delay = 350;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      // 429 / 5xx → reintentar (salvo que sea el último intento)
      if ((res.status === 429 || res.status >= 500) && i < tries - 1) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
      return res;
    } catch {
      // Error de red — reintentar
      if (i === tries - 1) return null;
      await sleep(delay);
      delay *= 2;
    }
  }
  return null;
}

/**
 * Devuelve los tags más populares de un track. Si Last.fm no encuentra el
 * track exacto (común para releases nuevos o muy nicho), hace fallback a los
 * tags del artista.
 *
 * El veredicto es DETERMINISTA: solo cachea respuestas reales, y ante un error
 * transitorio devuelve `[]` para esta llamada SIN cachearlo, de modo que el
 * siguiente intento reintente en vez de quedar "pegado" en vacío.
 */
export async function getTrackTags(artist: string, title: string): Promise<string[]> {
  const ck = cacheKey(artist, title);
  const cached = trackCache.get(ck);
  if (cached) return cached;

  // Intento 1: track exacto
  const track = await fetchTrackTags(artist, title);
  if (track.ok && track.tags.length > 0) {
    trackCache.set(ck, track.tags);
    return track.tags;
  }

  // Intento 2: tags del artista (fallback)
  const artistRes = await fetchArtistTags(artist);
  if (artistRes.ok) {
    // Respuesta real (aunque sea []) → la cacheamos como el veredicto del track.
    trackCache.set(ck, artistRes.tags);
    return artistRes.tags;
  }

  // Ambas llamadas fallaron (error/red/rate-limit tras reintentos). NO cachear:
  // que el próximo intento lo reintente. Devolvemos [] solo para esta llamada.
  console.warn('[lastfm] sin datos (error transitorio) para', artist, '-', title);
  return [];
}

async function fetchTrackTags(artist: string, title: string): Promise<TagFetch> {
  const params = new URLSearchParams({
    method: 'track.getInfo',
    artist,
    track: title,
    format: 'json',
    autocorrect: '1',
  });
  const res = await fetchWithRetry(`/api/lastfm-track?${params}`);
  if (!res || !res.ok) return { ok: false, tags: [] };
  const data = (await res.json().catch(() => ({}))) as LastfmTrackInfo;
  const tags = data.track?.toptags?.tag ?? [];
  return { ok: true, tags: tags.map((t) => t.name.toLowerCase()).filter((t) => t && t.length > 1) };
}

async function fetchArtistTags(artist: string): Promise<TagFetch> {
  const ak = artist.toLowerCase().trim();
  const cached = artistCache.get(ak);
  if (cached) return { ok: true, tags: cached };

  const params = new URLSearchParams({
    method: 'artist.getInfo',
    artist,
    format: 'json',
    autocorrect: '1',
  });
  const res = await fetchWithRetry(`/api/lastfm-artist?${params}`);
  if (!res || !res.ok) return { ok: false, tags: [] };
  const data = (await res.json().catch(() => ({}))) as LastfmArtistInfo;
  const tags = data.artist?.tags?.tag ?? [];
  const result = tags.map((t) => t.name.toLowerCase()).filter((t) => t && t.length > 1);
  artistCache.set(ak, result); // solo cacheamos respuestas reales
  return { ok: true, tags: result };
}

/**
 * Bulk: obtiene tags para muchos tracks en paralelo. Limita la concurrencia
 * a 5 simultáneos para no sobrepasar el rate limit de Last.fm.
 */
export async function getTrackTagsBulk(
  tracks: Array<{ artist: string; title: string }>,
): Promise<string[][]> {
  const CONCURRENCY = 5;
  const results: string[][] = new Array(tracks.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < tracks.length) {
      const i = cursor++;
      const t = tracks[i];
      results[i] = await getTrackTags(t.artist, t.title);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

/** Si la integración está disponible. Siempre true ya que el proxy maneja la key. */
export function isLastfmEnabled(): boolean {
  return true;
}
