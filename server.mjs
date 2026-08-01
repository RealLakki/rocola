import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rateLimit } from 'express-rate-limit';
import 'dotenv/config';
import * as db from './db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3100;

// Necesario para que express-rate-limit lea la IP real detrás de Nginx
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// ─── HTTP + WebSocket (socket.io): realtime de la cola y control del player ───
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true } });

/** Emite un evento a los clientes suscritos a un venue. */
const emitVenue = (venueId, event, extra = {}) =>
  io.to(`venue:${venueId}`).emit(event, { venueId, ...extra });

io.on('connection', (socket) => {
  // Cada cliente se une al room de su venue para recibir sus eventos.
  socket.on('join', (venueId) => {
    if (typeof venueId === 'string' && venueId) socket.join(`venue:${venueId}`);
  });
  // Relay de comandos del reproductor (admin -> player), sin persistencia.
  socket.on('player:cmd', (msg) => {
    const { venueId, command } = msg ?? {};
    if (venueId && command) socket.to(`venue:${venueId}`).emit('player:cmd', { command });
  });
});

// ─── API keys (server-only, nunca expuestas al cliente) ───────────────────────
// YouTube: soporta MÚLTIPLES API keys (YOUTUBE_API_KEYS=k1,k2,k3) con failover
// por cuota. Cada key de un proyecto de Google distinto = +100 búsquedas/día.
// Fallback a YOUTUBE_API_KEY (una sola) por compatibilidad.
const YT_KEYS = (process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY || '')
  .split(',').map((k) => k.trim()).filter(Boolean);
const LASTFM_API_KEY  = process.env.VITE_LASTFM_API_KEY || process.env.LASTFM_API_KEY;
const YT_API          = 'https://www.googleapis.com/youtube/v3';
const LASTFM_API      = 'https://ws.audioscrobbler.com/2.0/';

// ─── Rate limiters ───────────────────────────────────────────────────────────
// Generosos a propósito: el cache + dedup + stale de abajo son lo que protege a
// las APIs upstream. En un bar TODOS los celulares salen por la misma IP del
// WiFi, así que límites bajos por-IP romperían el servicio en horas pico.
const mkLimiter = (max, message) => rateLimit({
  windowMs: 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message },
  validate: { xForwardedForHeader: false }, // detrás de Nginx (trust proxy=1)
});
const ytLimiter     = mkLimiter(120,  'Demasiadas búsquedas de video. Espera un momento.');
const itunesLimiter = mkLimiter(600,  'Demasiadas búsquedas. Espera un momento.');
const lastfmLimiter = mkLimiter(2000, 'Too many requests');
// Endpoints de datos propios (Postgres local, baratos): límite muy alto — se
// llaman seguido (carga de venue, refresh de cola por realtime, etc.).
const dataLimiter   = mkLimiter(2000, 'Too many requests');

// ─── Cache TTL + dedup de in-flight + retry con backoff + serve-stale ──────────
// Esto es lo que hace que el sistema NO se caiga cuando las APIs upstream se
// saturan (Apple rate-limita por IP del servidor; Last.fm tiene límite bajo).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeCache(ttlMs, max = 5000, namespace = 'default') {
  const store = new Map(); // key -> { at, status, data }
  const inflight = new Map();
  return {
    namespace,
    ttlMs,
    fresh(key) { const e = store.get(key); return e && Date.now() - e.at < ttlMs ? e : null; },
    stale(key) { return store.get(key) || null; }, // cualquier entrada, aunque vencida
    set(key, status, data) {
      if (store.size >= max && !store.has(key)) store.delete(store.keys().next().value);
      store.set(key, { at: Date.now(), status, data });
    },
    inflight,
  };
}

/** fetch upstream con reintentos ante 429/5xx/red/no-JSON (throttle de Apple). */
async function fetchJsonRetry(url, opts = {}, tries = 3) {
  let delay = 300;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if ((r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep(delay); delay *= 2; continue; }
      const text = await r.text();
      try {
        return { status: r.status, data: JSON.parse(text) };
      } catch {
        // Respuesta no-JSON = casi siempre página de throttle → reintentar.
        if (i < tries - 1) { await sleep(delay); delay *= 2; continue; }
        return { status: 503, data: { error: 'upstream non-JSON' } };
      }
    } catch {
      if (i < tries - 1) { await sleep(delay); delay *= 2; continue; }
      return { status: 503, data: { error: 'upstream fetch failed' } };
    }
  }
}

/**
 * Proxy cacheado: sirve cache fresco si existe; dedup de requests idénticas
 * en vuelo (10 personas buscando lo mismo = 1 call upstream); y si upstream
 * falla, sirve cache VIEJO en vez de reventar. `isOk` evita cachear respuestas
 * de error (p.ej. rate-limit de Last.fm devuelto con HTTP 200).
 */
async function readDbCache(cache, key, allowStale = false) {
  try {
    return await db.getApiCache(cache.namespace, key, { allowStale });
  } catch (e) {
    console.warn('[api-cache] read failed', cache.namespace, e?.message ?? e);
    return null;
  }
}

async function writeDbCache(cache, key, status, data) {
  try {
    await db.setApiCache(cache.namespace, key, status, data, cache.ttlMs);
  } catch (e) {
    console.warn('[api-cache] write failed', cache.namespace, e?.message ?? e);
  }
}

async function activeCircuit(cache) {
  try {
    return await db.getCircuitBreaker(cache.namespace);
  } catch (e) {
    console.warn('[api-cache] circuit read failed', cache.namespace, e?.message ?? e);
    return null;
  }
}

async function tripCircuit(cache, ms, reason) {
  try {
    await db.tripCircuitBreaker(cache.namespace, ms, reason);
  } catch (e) {
    console.warn('[api-cache] circuit write failed', cache.namespace, e?.message ?? e);
  }
}

async function cachedProxy(cache, key, fetcher, isOk = () => true) {
  const fresh = cache.fresh(key);
  if (fresh) return { status: fresh.status, data: fresh.data };
  const dbFresh = await readDbCache(cache, key);
  if (dbFresh) {
    cache.set(key, dbFresh.status, dbFresh.data);
    return dbFresh;
  }
  if (cache.inflight.has(key)) return cache.inflight.get(key);
  const p = (async () => {
    try {
      const stale = cache.stale(key) ?? await readDbCache(cache, key, true);
      const circuit = await activeCircuit(cache);
      if (circuit) {
        if (stale) return { status: stale.status, data: stale.data };
        return { status: 503, data: { error: 'upstream temporarily paused' } };
      }
      const res = await fetcher();
      if (res.status >= 200 && res.status < 300 && isOk(res.data)) {
        cache.set(key, res.status, res.data);
        await writeDbCache(cache, key, res.status, res.data);
        return res;
      }
      if (res.status === 429 || res.status === 503 || res.status >= 500 || !isOk(res.data)) {
        await tripCircuit(cache, 2 * 60 * 1000, `status:${res.status}`);
      }
      if (stale) return { status: stale.status, data: stale.data };
      return res;
    } finally {
      cache.inflight.delete(key);
    }
  })();
  cache.inflight.set(key, p);
  return p;
}

const itunesCache   = makeCache(10 * 60 * 1000, 5000, 'itunes-search');   // 10 min
const lastfmCache   = makeCache(24 * 60 * 60 * 1000, 5000, 'lastfm');      // 24 h (tags casi no cambian)
const ytSearchCache = makeCache(60 * 60 * 1000, 5000, 'youtube-search');   // 1 h
const ytVideosCache = makeCache(24 * 60 * 60 * 1000, 5000, 'youtube-videos'); // 24 h

// Predicados de "respuesta válida" (no cachear errores upstream).
const itunesOk = (d) => d && typeof d.resultCount === 'number';
const lastfmOk = (d) => d && (d.error === undefined || d.error === 6); // 6 = not found (cacheable)
const ytOk     = (d) => d && !d.error;

// ── YouTube: failover entre múltiples keys cuando una agota su cuota ─────────
const ytKeyExhausted = new Map(); // key -> ts hasta el que se considera agotada

function isYtQuotaError(status, data) {
  const reason = data?.error?.errors?.[0]?.reason || '';
  const st = data?.error?.status || '';
  const msg = data?.error?.message || '';
  return status === 429 || /quota|ratelimit|dailylimit|resource_exhausted/i.test(`${reason} ${st} ${msg}`);
}

/** Llama a la YouTube API probando cada key en orden; salta las agotadas y hace
 *  failover a la siguiente cuando una devuelve error de cuota. Devuelve {status,data}. */
async function youtubeFetch(endpoint, paramsObj) {
  const now = Date.now();
  const fresh = YT_KEYS.filter((k) => (ytKeyExhausted.get(k) ?? 0) < now);
  const order = fresh.length ? fresh : YT_KEYS; // si todas agotadas, reintenta todas
  let last = { status: 503, data: { error: 'no YouTube API keys configured' } };
  for (const key of order) {
    const qs = new URLSearchParams({ ...paramsObj, key });
    const res = await fetchJsonRetry(`${YT_API}/${endpoint}?${qs}`, {
      headers: { Referer: 'https://musica.wailus.co/' },
    });
    if (res.status >= 200 && res.status < 300 && !res.data?.error) return res;
    if (isYtQuotaError(res.status, res.data)) {
      ytKeyExhausted.set(key, now + 30 * 60 * 1000); // agotada ~30 min, luego re-prueba
      last = res;
      continue; // failover a la siguiente key
    }
    return res; // error no relacionado a cuota → devolver tal cual
  }
  return last;
}

// ── YouTube: búsqueda SIN cuota (scrape de la página de resultados) ──────────
// Fallback cuando la cuota de la API se agota. Devuelve el mismo shape que la
// API (items[].id.videoId + snippet) para que el cliente no note la diferencia.
/** Extrae el primer objeto JSON balanceado a partir de la posición del '{'. */
function extractBalancedJson(str, from) {
  let depth = 0, inStr = false, esc = false;
  for (let i = from; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return str.slice(from, i + 1); }
  }
  return null;
}

// "3:45" / "1:02:33" → ms   |   "1.2M views" / "1,234,567 vistas" → número
function ytDurationToMs(txt) {
  if (!txt) return 0;
  const parts = String(txt).split(':').map((n) => parseInt(n, 10));
  if (parts.some(isNaN)) return 0;
  let s = 0;
  for (const p of parts) s = s * 60 + p;
  return s * 1000;
}
function ytViewsToNumber(txt) {
  if (!txt) return 0;
  const m = String(txt).replace(/[.,\s]/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
const YT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

function parseYtInitialData(html) {
  const marker = html.indexOf('ytInitialData');
  if (marker === -1) return null;
  const braceStart = html.indexOf('{', html.indexOf('=', marker));
  const jsonStr = braceStart === -1 ? null : extractBalancedJson(html, braceStart);
  if (!jsonStr) return null;
  try { return JSON.parse(jsonStr); } catch { return null; }
}

async function youtubeSearchScrape(query, maxResults = 25) {
  try {
    // sp=EgIQAQ%3D%3D → filtro "solo videos" (evita canales/playlists).
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    const r = await fetch(url, { headers: { 'User-Agent': YT_UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' } });
    if (!r.ok) return null;
    const data = parseYtInitialData(await r.text());
    if (!data) return null;
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];
    const items = [];
    for (const sec of sections) {
      for (const it of sec?.itemSectionRenderer?.contents ?? []) {
        const v = it?.videoRenderer;
        if (!v?.videoId) continue;
        const channelTitle = v.ownerText?.runs?.[0]?.text ?? v.longBylineText?.runs?.[0]?.text ?? '';
        const badges = (v.ownerBadges ?? []).map((b) => b?.metadataBadgeRenderer?.style ?? '').join(' ');
        items.push({
          id: { videoId: v.videoId },
          snippet: {
            title: v.title?.runs?.[0]?.text ?? '',
            channelTitle,
            channelId: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ?? '',
            publishedAt: '',
          },
          // Campos extra del scrape para no necesitar videos.list (sin cuota):
          durationMs: ytDurationToMs(v.lengthText?.simpleText),
          viewCount: ytViewsToNumber(v.viewCountText?.simpleText),
          official: /VERIFIED|ARTIST/i.test(badges),
        });
        if (items.length >= maxResults) break;
      }
      if (items.length >= maxResults) break;
    }
    return items.length ? { items, kind: 'youtube#searchListResponse', _scraped: true } : null;
  } catch (e) {
    console.warn('[yt-scrape] failed:', e?.message ?? e);
    return null;
  }
}

// Detalle de UN video por id (para links pegados) sin cuota — scrape del watch page.
async function youtubeVideoScrape(videoId) {
  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: { 'User-Agent': YT_UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' },
    });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.indexOf('ytInitialPlayerResponse');
    const braceStart = m === -1 ? -1 : html.indexOf('{', html.indexOf('=', m));
    const jsonStr = braceStart === -1 ? null : extractBalancedJson(html, braceStart);
    if (!jsonStr) return null;
    const vd = JSON.parse(jsonStr)?.videoDetails;
    if (!vd?.videoId) return null;
    return {
      items: [{
        id: vd.videoId,
        snippet: { title: vd.title ?? '', channelTitle: vd.author ?? '', channelId: vd.channelId ?? '', publishedAt: '' },
        durationMs: (parseInt(vd.lengthSeconds ?? '0', 10) || 0) * 1000,
        viewCount: parseInt(vd.viewCount ?? '0', 10) || 0,
        official: false,
      }],
      _scraped: true,
    };
  } catch (e) {
    console.warn('[yt-video-scrape] failed:', e?.message ?? e);
    return null;
  }
}

// ─── Genre guard (server-side policy; mirrors src/lib/types.ts) ─────────────
const ALL_GENRES = [
  'reggaeton', 'salsa', 'merengue', 'bachata', 'champeta', 'vallenato',
  'cumbia', 'popular', 'ranchera', 'pop', 'rock', 'electronica', 'hiphop',
  'rnb', 'afrobeats', 'dembow', 'banda', 'corridos',
];

const GENRE_KEYWORDS = {
  reggaeton: ['reggaeton', 'reggaetón', 'urban latin', 'urbano latino', 'reggaeton y hip-hop'],
  salsa: ['salsa', 'tropical'],
  merengue: ['merengue', 'tropical'],
  bachata: ['bachata', 'tropical'],
  champeta: ['champeta', 'tropical'],
  vallenato: ['vallenato'],
  cumbia: ['cumbia', 'tropical'],
  popular: ['popular'],
  ranchera: ['ranchera', 'mariachi'],
  pop: ['pop'],
  rock: ['rock', 'alternative', 'metal'],
  electronica: ['electronic', 'electrónica', 'dance', 'house', 'edm'],
  hiphop: ['hip-hop', 'rap', 'hip hop'],
  rnb: ['r&b', 'soul', 'r&b/soul'],
  afrobeats: ['afrobeats', 'afro', 'african'],
  dembow: ['dembow'],
  banda: ['banda', 'regional mexican', 'regional mexicano', 'música mexicana', 'musica mexicana'],
  corridos: ['corridos', 'norteño', 'regional mexican', 'regional mexicano', 'música mexicana', 'musica mexicana'],
};

const POPULAR_ARTISTS = [
  'charrito negro',
  'el charrito negro',
  'luis alberto posada',
  'yeison jimenez',
  'andariego',
  'el andariego',
  'paola jara',
  'jessi uribe',
  'pipe bueno',
  'jhonny rivera',
  'johnny rivera',
  'arelys henao',
  'francy',
  'dario gomez',
  'darío gómez',
  'giovanny ayala',
  'alzate',
  'john alex castano',
  'john alex castaño',
];

const GENRE_LASTFM_TAGS = {
  reggaeton: ['reggaeton', 'reggaetón', 'perreo', 'urbano latino', 'latin urban', 'trap latino', 'reggaeton colombiano'],
  salsa: ['salsa', 'salsa colombiana', 'salsa cubana', 'salsa choke'],
  merengue: ['merengue'],
  bachata: ['bachata', 'bachata moderna'],
  champeta: ['champeta', 'champeta urbana'],
  vallenato: ['vallenato', 'vallenato moderno', 'vallenato romantico'],
  cumbia: ['cumbia', 'cumbia colombiana', 'cumbia villera', 'cumbia sonidera'],
  popular: [
    'musica popular', 'música popular', 'popular colombiano',
    'despecho', 'ranchera colombiana', 'colombian popular',
    'ranchera', 'rancheras',
  ],
  ranchera: ['ranchera', 'mariachi', 'mexican folk', 'rancheras', 'mexican ranchera'],
  pop: ['pop', 'latin pop', 'pop latino', 'spanish pop', 'pop rock'],
  rock: ['rock', 'classic rock', 'hard rock', 'metal', 'alternative rock', 'indie rock', 'rock en español', 'rock latino'],
  electronica: ['electronic', 'electronica', 'electrónica', 'house', 'techno', 'edm', 'dance', 'electro'],
  hiphop: ['hip-hop', 'hip hop', 'rap', 'rap latino', 'rap español'],
  rnb: ['r&b', 'rnb', 'soul', 'neo soul'],
  afrobeats: ['afrobeats', 'afrobeat', 'afro', 'afropop'],
  dembow: ['dembow', 'dembow dominicano'],
  banda: ['banda', 'banda sinaloense', 'regional mexicano', 'banda mx'],
  corridos: ['corridos', 'corrido', 'corridos tumbados', 'norteño', 'narcocorridos', 'corridos belicos', 'sad sierreño', 'sierreño', 'sierreno'],
};

const REGIONAL_MEXICAN_GENRES = ['banda', 'corridos'];
// Géneros latinos NO regionales — iTunes a veces los etiqueta solo como "Latin".
// Si el local permite alguno de estos, un track "Latin" ambiguo se deja pasar.
const LATIN_NONREGIONAL = [
  'reggaeton', 'salsa', 'merengue', 'bachata', 'champeta',
  'vallenato', 'cumbia', 'dembow', 'popular', 'ranchera',
];

function normalizeGenreText(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tagMatches(myTag, trackTag) {
  const a = normalizeGenreText(myTag);
  const b = normalizeGenreText(trackTag);
  if (a === b) return true;
  const safe = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s|[/&,-])${safe}(\\s|[/&,-]|$)`, 'i').test(b);
}

function knownPopularArtist(artistName) {
  if (!artistName) return false;
  const artist = normalizeGenreText(artistName);
  return POPULAR_ARTISTS.some((name) => artist.includes(normalizeGenreText(name)));
}

function genreAllowed(itunesGenre, allowedGenres) {
  if (!allowedGenres || allowedGenres.length === 0) return true;
  // PERMISIVO ante la duda: sin género de iTunes (típico de canciones agregadas
  // vía YouTube) NO se puede confirmar → se deja pasar. Solo se rechaza cuando
  // hay señal POSITIVA de otro género (aquí o vía tags de Last.fm arriba).
  if (!itunesGenre) return true;
  const g = String(itunesGenre).toLowerCase();

  if (/regional mexican(o)?|música mexicana|musica mexicana/.test(g)) {
    return allowedGenres.some((ag) => REGIONAL_MEXICAN_GENRES.includes(ag));
  }

  // "Latin" a secas es ambiguo → permitir si el local acepta algún género latino.
  if (/^(latin|música latina|musica latina)$/.test(g)) {
    return allowedGenres.some((ag) => LATIN_NONREGIONAL.includes(ag));
  }

  return allowedGenres.some((ag) =>
    GENRE_KEYWORDS[ag]?.some((kw) => g.includes(kw)),
  );
}

function genreMatchedFor(lastfmTags, itunesGenre, allowedGenres, artistName) {
  if (!allowedGenres || allowedGenres.length === 0) return { allowed: true };
  if (allowedGenres.includes('popular') && knownPopularArtist(artistName)) {
    return { allowed: true, matchedGenre: 'popular', matchedTag: 'known-artist' };
  }
  if (lastfmTags.length > 0) {
    for (const ag of allowedGenres) {
      for (const myTag of GENRE_LASTFM_TAGS[ag] ?? []) {
        for (const trackTag of lastfmTags) {
          if (tagMatches(myTag, trackTag)) return { allowed: true, matchedGenre: ag, matchedTag: trackTag };
        }
      }
    }
    for (const g of ALL_GENRES) {
      if (allowedGenres.includes(g)) continue;
      for (const myTag of GENRE_LASTFM_TAGS[g] ?? []) {
        for (const trackTag of lastfmTags) {
          if (tagMatches(myTag, trackTag)) return { allowed: false, matchedGenre: g, matchedTag: trackTag };
        }
      }
    }
  }
  return { allowed: genreAllowed(itunesGenre, allowedGenres) };
}

const normalizeTags = (tags) =>
  (Array.isArray(tags) ? tags : [])
    .map((t) => String(t?.name ?? t).toLowerCase().trim())
    .filter((t) => t.length > 1);

async function fetchLastfmValidationTags(track) {
  if (!LASTFM_API_KEY) return [];
  const artist = String(track?.artists?.[0] ?? '').trim();
  const title = String(track?.title ?? '').trim();
  if (!artist || !title) return [];

  const trackParams = new URLSearchParams({
    method: 'track.getInfo',
    api_key: LASTFM_API_KEY,
    artist,
    track: title,
    format: 'json',
    autocorrect: '1',
  });
  const trackOut = await cachedProxy(
    lastfmCache,
    `validate-track|${artist.toLowerCase()}|${title.toLowerCase()}`,
    () => fetchJsonRetry(`${LASTFM_API}?${trackParams}`),
    lastfmOk,
  );
  const trackTags = normalizeTags(trackOut.data?.track?.toptags?.tag);
  if (trackTags.length > 0) return trackTags;

  const artistParams = new URLSearchParams({
    method: 'artist.getInfo',
    api_key: LASTFM_API_KEY,
    artist,
    format: 'json',
    autocorrect: '1',
  });
  const artistOut = await cachedProxy(
    lastfmCache,
    `validate-artist|${artist.toLowerCase()}`,
    () => fetchJsonRetry(`${LASTFM_API}?${artistParams}`),
    lastfmOk,
  );
  return normalizeTags(artistOut.data?.artist?.tags?.tag);
}

async function validateQueueRequest(venue, track) {
  if (!venue) return { ok: false, status: 404, error: 'venue not found' };
  if (venue.blockedTrackIds?.includes(track?.providerId)) {
    return { ok: false, status: 403, error: 'Cancion bloqueada por el local' };
  }
  if (venue.allowExplicit === false && track?.explicit === true) {
    return { ok: false, status: 403, error: 'Contenido explicito no permitido' };
  }
  if (!venue.allowedGenres || venue.allowedGenres.length === 0) return { ok: true };

  const houseMatch = String(track?.providerId ?? '').match(/^house:([^:]+):/);
  if (houseMatch) {
    const curated = await db.getHouseTrackByProviderId(track.providerId);
    const sameVideo = curated?.track?.youtubeVideoId && curated.track.youtubeVideoId === track?.youtubeVideoId;
    if (!curated || !sameVideo) {
      return { ok: false, status: 422, error: 'Cancion de la casa no verificada' };
    }
    return venue.allowedGenres.includes(curated.genre)
      ? { ok: true }
      : { ok: false, status: 422, error: 'Genero no permitido por el local' };
  }

  const tags = await fetchLastfmValidationTags(track);
  const verdict = genreMatchedFor(tags, track?.genres?.[0], venue.allowedGenres, track?.artists?.[0]);
  if (!verdict.allowed) {
    console.warn('[genre-guard] rejected', {
      title: track?.title,
      artist: track?.artists?.[0],
      itunes: track?.genres?.[0],
      tags,
      allowed: venue.allowedGenres,
      matched: verdict.matchedGenre,
    });
    return { ok: false, status: 422, error: 'Genero no permitido por el local' };
  }
  return { ok: true };
}

// ─── YouTube proxy ─────────────────────────────────────────────────────────────
app.get('/api/youtube-search', ytLimiter, async (req, res) => {
  const q = String(req.query.q ?? '');
  const maxResults = String(req.query.maxResults ?? '25');
  if (!q) return res.status(400).json({ error: 'Missing parameter: q' });
  // Si hay keys: API oficial primero (calidad), scrape como fallback por cuota.
  // Si NO hay keys (modo scrape-only): scrape directo, sin cuota. En ambos casos
  // el scrape ocurre dentro del fetcher → se cachea y no dispara el circuit breaker.
  const out = await cachedProxy(ytSearchCache, `${q}|${maxResults}`, async () => {
    if (YT_KEYS.length) {
      const api = await youtubeFetch('search', { part: 'snippet', type: 'video', videoCategoryId: '10', maxResults, q });
      if (api.status >= 200 && api.status < 300 && ytOk(api.data)) return api;
    }
    const scraped = await youtubeSearchScrape(q, Number(maxResults) || 25);
    if (scraped) return { status: 200, data: scraped };
    return { status: 503, data: { error: 'youtube unavailable' } };
  }, ytOk);
  res.status(out.status).json(out.data);
});

app.get('/api/youtube-videos', ytLimiter, async (req, res) => {
  const id = String(req.query.id ?? '');
  if (!id) return res.status(400).json({ error: 'Missing parameter: id' });
  const out = await cachedProxy(ytVideosCache, id, async () => {
    if (YT_KEYS.length) {
      const api = await youtubeFetch('videos', { part: 'snippet,contentDetails,statistics', id });
      if (api.status >= 200 && api.status < 300 && ytOk(api.data)) return api;
    }
    // Modo scrape-only: detalle de un video (para links pegados) sin cuota.
    const scraped = await youtubeVideoScrape(id.split(',')[0]);
    if (scraped) return { status: 200, data: scraped };
    return { status: 503, data: { error: 'youtube unavailable' } };
  }, ytOk);
  res.status(out.status).json(out.data);
});

// iTunes y Last.fm: ELIMINADOS en ROCOLA — la única fuente es YouTube (scrape).

// ─── Data API (PostgreSQL) ───────────────────────────────────────────────────
app.get('/api/venues', dataLimiter, async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    res.json(await db.getVenueBySlug(String(slug))); // null si no existe
  } catch (e) { console.error('[venues.get]', e); res.status(500).json({ error: 'db error' }); }
});

app.patch('/api/venues/:id', dataLimiter, async (req, res) => {
  try {
    const venue = await db.updateVenue(req.params.id, req.body ?? {});
    if (!venue) return res.status(404).json({ error: 'venue not found' });
    emitVenue(venue.id, 'venue:changed');
    res.json(venue);
  } catch (e) { console.error('[venues.patch]', e); res.status(500).json({ error: 'db error' }); }
});

app.get('/api/queue', dataLimiter, async (req, res) => {
  try {
    const { venueId } = req.query;
    if (!venueId) return res.status(400).json({ error: 'Missing venueId' });
    res.json(await db.fetchActiveQueue(String(venueId)));
  } catch (e) { console.error('[queue.get]', e); res.status(500).json({ error: 'db error' }); }
});

app.post('/api/queue', dataLimiter, async (req, res) => {
  try {
    const { venueId, track, requestedBy, requestedByName, boosted } = req.body ?? {};
    if (!venueId || !track || !requestedBy) return res.status(400).json({ error: 'Missing fields' });
    const venue = await db.getVenueById(String(venueId));
    const verdict = await validateQueueRequest(venue, track);
    if (!verdict.ok) return res.status(verdict.status).json({ error: verdict.error });
    const item = await db.enqueueTrack({ venueId, track, requestedBy, requestedByName, boosted });
    emitVenue(venueId, 'queue:changed');
    res.json(item);
  } catch (e) { console.error('[queue.post]', e); res.status(500).json({ error: 'db error' }); }
});

app.patch('/api/queue/:id', dataLimiter, async (req, res) => {
  try {
    const { action, status, venueId } = req.body ?? {};
    let vid = null;
    if (action === 'boost') vid = await db.boostItem(req.params.id);
    else if (action === 'unboost') vid = await db.unboostItem(req.params.id, venueId);
    else if (status) vid = await db.setItemStatus(req.params.id, status);
    else return res.status(400).json({ error: 'Missing action/status' });
    if (vid) emitVenue(vid, 'queue:changed');
    res.json({ ok: true });
  } catch (e) { console.error('[queue.patch]', e); res.status(500).json({ error: 'db error' }); }
});

app.delete('/api/queue/:id', dataLimiter, async (req, res) => {
  try {
    const vid = await db.removeQueueItem(req.params.id);
    if (vid) emitVenue(vid, 'queue:changed');
    res.json({ ok: true });
  } catch (e) { console.error('[queue.delete]', e); res.status(500).json({ error: 'db error' }); }
});

app.get('/api/youtube-resolutions/:providerId', dataLimiter, async (req, res) => {
  try {
    res.json(await db.getCachedYoutubeResolution(req.params.providerId));
  } catch (e) { console.error('[ytres.get]', e); res.status(500).json({ error: 'db error' }); }
});

app.put('/api/youtube-resolutions/:providerId', dataLimiter, async (req, res) => {
  try {
    const { youtubeVideoId, isOfficial, hasVideo } = req.body ?? {};
    if (!youtubeVideoId) return res.status(400).json({ error: 'Missing youtubeVideoId' });
    await db.cacheYoutubeResolution(req.params.providerId, { youtubeVideoId, isOfficial, hasVideo });
    res.json({ ok: true });
  } catch (e) { console.error('[ytres.put]', e); res.status(500).json({ error: 'db error' }); }
});

app.get('/api/house-track', dataLimiter, async (req, res) => {
  try {
    const venueId = String(req.query.venueId ?? '');
    if (!venueId) return res.status(400).json({ error: 'Missing venueId' });
    const venue = await db.getVenueById(venueId);
    if (!venue) return res.status(404).json({ error: 'venue not found' });
    const excludeProviderIds = String(req.query.exclude ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const excludes = new Set(excludeProviderIds);

    for (let attempt = 0; attempt < 8; attempt++) {
      const track = await db.getRandomHouseTrack({
        allowedGenres: venue.allowedGenres,
        excludeProviderIds: [...excludes],
      });
      if (!track) return res.json(null);
      excludes.add(track.providerId);

      const verdict = await validateQueueRequest(venue, track);
      if (verdict.ok) return res.json(track);

      console.warn('[house-track] curated track rejected', {
        providerId: track.providerId,
        title: track.title,
        artist: track.artists?.[0],
        reason: verdict.error,
      });
    }
    res.json(null);
  } catch (e) { console.error('[house-track.get]', e); res.status(500).json({ error: 'db error' }); }
});

app.get('/api/top-tracks', dataLimiter, async (req, res) => {
  try {
    const { venueId, limit } = req.query;
    if (!venueId) return res.status(400).json({ error: 'Missing venueId' });
    res.json(await db.getTopTracks(String(venueId), Number(limit) || 20));
  } catch (e) { console.error('[top-tracks]', e); res.status(500).json({ error: 'db error' }); }
});

// ─── Frontend estático ─────────────────────────────────────────────────────────
app.use(express.static(join(__dirname, 'dist')));

app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

db.ensureOperationalTables()
  .catch((e) => console.error('[db.init]', e))
  .finally(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      if (!YT_KEYS.length) console.warn('[WARN] Sin YouTube API keys — la búsqueda de YouTube fallará');
  else console.log(`YouTube: ${YT_KEYS.length} API key(s) configurada(s)`);
    });
  });
