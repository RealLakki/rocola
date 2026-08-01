export type Genre =
  | 'reggaeton'
  | 'salsa'
  | 'merengue'
  | 'bachata'
  | 'champeta'
  | 'vallenato'
  | 'cumbia'
  | 'popular'
  | 'ranchera'
  | 'pop'
  | 'rock'
  | 'electronica'
  | 'hiphop'
  | 'rnb'
  | 'afrobeats'
  | 'dembow'
  | 'banda'
  | 'corridos';

export const ALL_GENRES: Genre[] = [
  'reggaeton', 'salsa', 'merengue', 'bachata', 'champeta', 'vallenato',
  'cumbia', 'popular', 'ranchera', 'pop', 'rock', 'electronica', 'hiphop',
  'rnb', 'afrobeats', 'dembow', 'banda', 'corridos',
];

export const CANTINA_GENRES: Genre[] = ['popular', 'ranchera', 'banda', 'corridos'];

export const GENRE_LABEL: Record<Genre, string> = {
  reggaeton: 'Reggaetón',
  salsa: 'Salsa',
  merengue: 'Merengue',
  bachata: 'Bachata',
  champeta: 'Champeta',
  vallenato: 'Vallenato',
  cumbia: 'Cumbia',
  popular: 'Popular (despecho)',
  ranchera: 'Ranchera',
  pop: 'Pop',
  rock: 'Rock',
  electronica: 'Electrónica',
  hiphop: 'Hip-Hop',
  rnb: 'R&B',
  afrobeats: 'Afrobeats',
  dembow: 'Dembow',
  banda: 'Banda',
  corridos: 'Corridos',
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

/**
 * Mapeo de nuestros géneros a palabras clave que aparecen en
 * `primaryGenreName` de iTunes. Como iTunes no es granular para
 * salsa/bachata/vallenato (todo cae en "Latin" o "Salsa & Tropical"),
 * el matching es aproximado.
 */
export const GENRE_KEYWORDS: Record<Genre, string[]> = {
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

/**
 * Mapeo de nuestros géneros a tags de Last.fm (mucho más granulares que iTunes).
 * Last.fm tiene tags por canción y artista — son "user-generated" pero los
 * más populares son confiables. Si el track tiene CUALQUIERA de estos tags,
 * lo consideramos del género.
 */
export const GENRE_LASTFM_TAGS: Record<Genre, string[]> = {
  reggaeton: ['reggaeton', 'reggaetón', 'perreo', 'urbano latino', 'latin urban', 'trap latino', 'reggaeton colombiano'],
  salsa: ['salsa', 'salsa colombiana', 'salsa cubana', 'salsa choke'],
  merengue: ['merengue'],
  bachata: ['bachata', 'bachata moderna'],
  champeta: ['champeta', 'champeta urbana'],
  vallenato: ['vallenato', 'vallenato moderno', 'vallenato romantico'],
  cumbia: ['cumbia', 'cumbia colombiana', 'cumbia villera', 'cumbia sonidera'],
  // Música popular colombiana — Yeison Jimenez, Pipe Bueno, Jessi Uribe,
  // Jhonny Rivera, Arelys Henao. En Colombia "ranchera" se usa también
  // para popular. NO incluimos "popular" suelto porque Last.fm lo usa como
  // tag genérico ("popular music") que matchea cualquier hit.
  popular: [
    'musica popular', 'música popular', 'popular colombiano',
    'despecho', 'ranchera colombiana', 'colombian popular',
    'ranchera', 'rancheras',
  ],
  // Ranchera mexicana tradicional — Vicente Fernández, Pedro Infante.
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

/** Géneros regionales mexicanos — iTunes los etiqueta como "Música Mexicana"
 * o "Regional Mexican", NUNCA como "Latin" puro. */
const REGIONAL_MEXICAN_GENRES: Genre[] = ['banda', 'corridos'];
// Géneros latinos NO regionales — iTunes a veces los etiqueta solo como "Latin".
const LATIN_NONREGIONAL: Genre[] = [
  'reggaeton', 'salsa', 'merengue', 'bachata', 'champeta',
  'vallenato', 'cumbia', 'dembow', 'popular', 'ranchera',
];

/**
 * Decide si un primaryGenreName de iTunes pasa el filtro de allowedGenres.
 * Politica estricta cuando hay filtros activos: ante duda, no dejar pasar.
 * El cliente puede ampliar resultados con Last.fm antes de caer aqui, pero el
 * fallback de iTunes no debe abrir la puerta a "Latin" generico.
 * - allowedGenres vacío → todo permitido
 * - Sin género en iTunes + filtros activos → rechazar
 * - "Música Mexicana" / "Regional Mexican" → solo si admin tiene banda/corridos
 * - "Latin" / "Música Latina" puro → rechazar por ambiguo
 * - Cualquier otro → match por substring contra GENRE_KEYWORDS
 */
export function genreAllowed(
  itunesGenre: string | undefined,
  allowedGenres: Genre[],
): boolean {
  if (allowedGenres.length === 0) return true;
  // PERMISIVO ante la duda: sin género de iTunes no se puede confirmar → se
  // deja pasar (solo se rechaza con señal positiva de otro género).
  if (!itunesGenre) return true;
  const g = itunesGenre.toLowerCase();

  // Regional Mexicano explícito (banda, corridos, norteño)
  if (/regional mexican(o)?|música mexicana|musica mexicana/.test(g)) {
    return allowedGenres.some((ag) => REGIONAL_MEXICAN_GENRES.includes(ag));
  }

  // "Latin" a secas es ambiguo → permitir si el local acepta algún género latino.
  if (/^(latin|música latina|musica latina)$/.test(g)) {
    return allowedGenres.some((ag) => LATIN_NONREGIONAL.includes(ag));
  }

  // Match por keywords
  return allowedGenres.some((ag) =>
    GENRE_KEYWORDS[ag].some((kw) => g.includes(kw)),
  );
}

/**
 * Word-boundary match: mi tag aparece como palabra dentro del trackTag.
 * Ej: myTag="salsa" matchea con "salsa cubana" o "salsa choke", pero
 * no matchea con "salsapuerca" (sin word boundary).
 */
function tagMatches(myTag: string, trackTag: string): boolean {
  const a = normalizeGenreText(myTag);
  const b = normalizeGenreText(trackTag);
  if (a === b) return true;
  // Escape regex special chars
  const safe = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|\\s|[/&,-])${safe}(\\s|[/&,-]|$)`, 'i');
  return re.test(b);
}

function normalizeGenreText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function knownPopularArtist(artistName: string | undefined): boolean {
  if (!artistName) return false;
  const artist = normalizeGenreText(artistName);
  return POPULAR_ARTISTS.some((name) => artist.includes(normalizeGenreText(name)));
}

/**
 * Decide si un track con tags de Last.fm pasa el filtro de allowedGenres.
 * - allowedGenres vacío → todo permitido
 * - Sin tags → fallback estricto a `genreAllowed` con el itunesGenre original
 * - Con tags → matchea word-boundary contra GENRE_LASTFM_TAGS
 *
 * Devuelve también un debug object para logging.
 */
export function genreAllowedByTags(
  lastfmTags: string[],
  itunesGenre: string | undefined,
  allowedGenres: Genre[],
): boolean {
  if (allowedGenres.length === 0) return true;
  if (lastfmTags.length === 0) return genreAllowed(itunesGenre, allowedGenres);

  return allowedGenres.some((ag) =>
    GENRE_LASTFM_TAGS[ag].some((myTag) =>
      lastfmTags.some((trackTag) => tagMatches(myTag, trackTag)),
    ),
  );
}

/** Veredicto de género para un track, combinando tags de Last.fm (señal fuerte)
 * con el género de iTunes (fallback estricto). Devuelve además qué género
 * matcheó — útil para logs y para filtrar el house-filler con la misma lógica.
 *
 * Reglas (politica estricta, determinista):
 *  1. Tag de Last.fm que matchea un género PERMITIDO → mostrar.
 *  2. Tag de Last.fm que matchea OTRO género conocido (no permitido) → ocultar
 *     (el género es determinable y no está en la lista).
 *  3. Tags presentes pero ninguno reconocible como genero → caer al genero de
 *     iTunes, que tambien es estricto.
 *  4. Sin tags de Last.fm → genero de iTunes estricto.
 */
export function genreMatchedFor(
  lastfmTags: string[],
  itunesGenre: string | undefined,
  allowedGenres: Genre[],
  artistName?: string,
): { allowed: boolean; matchedGenre?: Genre; matchedTag?: string } {
  if (allowedGenres.length === 0) return { allowed: true };
  if (allowedGenres.includes('popular') && knownPopularArtist(artistName)) {
    return { allowed: true, matchedGenre: 'popular', matchedTag: 'known-artist' };
  }

  if (lastfmTags.length > 0) {
    // 1) ¿matchea un género PERMITIDO?
    for (const ag of allowedGenres) {
      for (const myTag of GENRE_LASTFM_TAGS[ag]) {
        for (const trackTag of lastfmTags) {
          if (tagMatches(myTag, trackTag)) {
            return { allowed: true, matchedGenre: ag, matchedTag: trackTag };
          }
        }
      }
    }
    // 2) ¿matchea algún OTRO género conocido (no permitido)? → determinable → ocultar
    for (const g of ALL_GENRES) {
      if (allowedGenres.includes(g)) continue;
      for (const myTag of GENRE_LASTFM_TAGS[g]) {
        for (const trackTag of lastfmTags) {
          if (tagMatches(myTag, trackTag)) {
            return { allowed: false, matchedGenre: g, matchedTag: trackTag };
          }
        }
      }
    }
    // 3) Tags presentes pero sin señal de género reconocible → fallback iTunes.
  }

  // 4) Sin señal fiable de Last.fm → genero de iTunes estricto.
  return { allowed: genreAllowed(itunesGenre, allowedGenres) };
}

/** Resultado normalizado de una búsqueda (sea Spotify o cualquier otro provider). */
export interface TrackSearchResult {
  /** ID estable en el provider de búsqueda. */
  providerId: string;
  /** Nombre del track. */
  title: string;
  /** Artistas (1+). */
  artists: string[];
  /** Álbum si aplica. */
  album?: string;
  /** Duración en milisegundos. */
  durationMs: number;
  /** Imagen — usar el más grande disponible. */
  imageUrl?: string;
  /** ISRC para matching cross-provider de alta precisión. */
  isrc?: string;
  /** Géneros si el provider los expone. */
  genres?: string[];
  /** Año de release. */
  year?: number;
  /** Marcador explícito. */
  explicit?: boolean;
}

/** Track resuelto a un video reproducible. */
export interface ResolvedTrack extends TrackSearchResult {
  /** ID del video en YouTube ya filtrado y validado. */
  youtubeVideoId: string;
  /** Si la resolución se considera "official" (canal verificado / VEVO). */
  isOfficial: boolean;
  /** Si encontró videoclip o solo audio (para activar visualizer). */
  hasVideo: boolean;
}

export interface QueueItem {
  id: string;
  venueId: string;
  track: ResolvedTrack;
  /** Identificador opaco del cliente que la pidió (sessionStorage). */
  requestedBy: string;
  /** Display name opcional ("Cami", "Mesa 7"). */
  requestedByName?: string;
  /** Posición efectiva en la cola; menor = antes. */
  position: number;
  /** Si fue boostada por tip; rompe el orden FIFO. */
  boosted: boolean;
  status: 'queued' | 'playing' | 'played' | 'skipped';
  createdAt: string;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  /** Géneros permitidos — si está vacío, todo permitido. */
  allowedGenres: Genre[];
  /** Lista de spotifyId bloqueados explícitamente por el bar. */
  blockedTrackIds: string[];
  /** Cooldown en segundos entre requests del mismo cliente. */
  requestCooldownSec: number;
  /** Permitir explicit content. */
  allowExplicit: boolean;
  /** Habilitar tip-to-skip. */
  tipEnabled: boolean;
  /** Costo simulado del tip (display). */
  tipPriceCop: number;
}
