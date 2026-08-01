import { itunesSearch, itunesSearchArtists } from './itunes';
import { CANTINA_GENRES, type Genre, type TrackSearchResult } from './types';

/**
 * Lista de artistas favoritos del bar — "Las de siempre".
 * Compartida entre la card del cliente y el auto-filler del reproductor.
 */
interface HouseArtist {
  name: string;
  searchTerm: string;
  aliases?: string[];
}

export const HOUSE_ARTISTS: HouseArtist[] = [
  { name: 'Charrito Negro', searchTerm: 'Charrito Negro', aliases: ['El Charrito Negro'] },
  { name: 'Luis Alberto Posada', searchTerm: 'Luis Alberto Posada' },
  { name: 'Yeison Jiménez', searchTerm: 'Yeison Jimenez', aliases: ['Yeison Jiménez'] },
  { name: 'Andariego', searchTerm: 'Andariego', aliases: ['El Andariego'] },
  { name: 'Paola Jara', searchTerm: 'Paola Jara' },
  { name: 'Jessi Uribe', searchTerm: 'Jessi Uribe' },
];

const HOUSE_ARTISTS_BY_GENRE: Partial<Record<Genre, HouseArtist[]>> = {
  popular: [
    ...HOUSE_ARTISTS,
    { name: 'Arelys Henao', searchTerm: 'Arelys Henao' },
    { name: 'Jhonny Rivera', searchTerm: 'Jhonny Rivera', aliases: ['Johnny Rivera'] },
    { name: 'Pipe Bueno', searchTerm: 'Pipe Bueno' },
    { name: 'Alzate', searchTerm: 'Alzate' },
    { name: 'Darío Gómez', searchTerm: 'Dario Gomez', aliases: ['Darío Gómez'] },
  ],
  ranchera: [
    { name: 'Vicente Fernández', searchTerm: 'Vicente Fernandez', aliases: ['Vicente Fernández'] },
    { name: 'Antonio Aguilar', searchTerm: 'Antonio Aguilar' },
    { name: 'Pedro Infante', searchTerm: 'Pedro Infante' },
    { name: 'Alejandro Fernández', searchTerm: 'Alejandro Fernandez', aliases: ['Alejandro Fernández'] },
    { name: 'Rocío Dúrcal', searchTerm: 'Rocio Durcal', aliases: ['Rocío Dúrcal'] },
  ],
  banda: [
    { name: 'Banda MS', searchTerm: 'Banda MS', aliases: ['Banda Sinaloense MS'] },
    { name: 'La Arrolladora Banda El Limón', searchTerm: 'La Arrolladora Banda El Limon', aliases: ['La Arrolladora Banda El Limón'] },
    { name: 'Banda El Recodo', searchTerm: 'Banda El Recodo' },
    { name: 'Julión Álvarez', searchTerm: 'Julion Alvarez', aliases: ['Julión Álvarez'] },
    { name: 'Calibre 50', searchTerm: 'Calibre 50' },
  ],
  corridos: [
    { name: 'Los Tigres del Norte', searchTerm: 'Los Tigres del Norte' },
    { name: 'Peso Pluma', searchTerm: 'Peso Pluma' },
    { name: 'Natanael Cano', searchTerm: 'Natanael Cano' },
    { name: 'Junior H', searchTerm: 'Junior H' },
    { name: 'Fuerza Regida', searchTerm: 'Fuerza Regida' },
    { name: 'Ariel Camacho', searchTerm: 'Ariel Camacho' },
  ],
};

interface HouseTrackOptions {
  excludeProviderIds?: Set<string>;
  allowedGenres?: Genre[];
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function artistMatches(track: TrackSearchResult, artist: HouseArtist): boolean {
  const names = [artist.name, artist.searchTerm, ...(artist.aliases ?? [])].map(normalize);
  return track.artists.some((trackArtist) => {
    const candidate = normalize(trackArtist);
    return names.some((name) => candidate.includes(name) || name.includes(candidate));
  });
}

function sourceArtistsFor(allowedGenres: Genre[] = []): HouseArtist[] {
  const sourceGenres = allowedGenres.length > 0 ? allowedGenres : CANTINA_GENRES;
  const artists = sourceGenres.flatMap((genre) => HOUSE_ARTISTS_BY_GENRE[genre] ?? []);
  if (artists.length === 0) return HOUSE_ARTISTS;

  const seen = new Set<string>();
  return artists.filter((artist) => {
    const key = normalize(artist.searchTerm);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Devuelve una canción aleatoria de un artista aleatorio de la casa.
 * Usado para auto-fill cuando la cola se queda vacía — evita silencios.
 *
 * Estrategia:
 * 1. Pick artista al azar
 * 2. iTunes search (term=artist, entity=song) → 8 resultados
 * 3. Filtrar tracks del artista correcto (por si search devuelve features)
 * 4. Pick uno random
 *
 * Si falla, intenta con otro artista. Devuelve null si todos fallan.
 */
export async function getRandomHouseTrack(
  optionsOrExcludeProviderIds: Set<string> | HouseTrackOptions = new Set(),
): Promise<TrackSearchResult | null> {
  const options = optionsOrExcludeProviderIds instanceof Set
    ? { excludeProviderIds: optionsOrExcludeProviderIds }
    : optionsOrExcludeProviderIds;
  const excludeProviderIds = options.excludeProviderIds ?? new Set<string>();
  const shuffled = shuffle(sourceArtistsFor(options.allowedGenres));

  for (const artist of shuffled) {
    try {
      const tracks = await itunesSearch(artist.searchTerm, { limit: 20, market: 'CO' });
      const own = tracks.filter((t) => artistMatches(t, artist));
      const candidates = own.filter((t) => !excludeProviderIds.has(t.providerId));
      if (candidates.length === 0) continue;
      return shuffle(candidates)[0];
    } catch (e) {
      console.warn('[house-filler] failed for', artist.name, e);
      continue;
    }
  }

  // Fallback final: si iTunes search falla en todos, intentar resolver via lookup directo
  for (const artist of shuffled) {
    try {
      const artistResults = await itunesSearchArtists(artist.searchTerm, { limit: 1, market: 'CO' });
      if (artistResults.length === 0) continue;
      // Buscar tracks de ese artistId
      const tracks = await itunesSearch(artist.name, { limit: 5, market: 'CO' });
      const candidates = tracks
        .filter((t) => artistMatches(t, artist))
        .filter((t) => !excludeProviderIds.has(t.providerId));
      if (candidates.length > 0) {
        return shuffle(candidates)[0];
      }
    } catch {
      continue;
    }
  }

  return null;
}
