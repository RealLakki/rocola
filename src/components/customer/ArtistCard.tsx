import { useEffect, useState } from 'react';
import { itunesGetArtistAlbums, type ArtistResult } from '../../lib/itunes';

interface Props {
  artist: ArtistResult;
  onClick: () => void;
}

/**
 * iTunes API gratuita NO devuelve foto del artista. Workaround estándar:
 * cargamos su álbum más reciente y usamos ese artwork como avatar.
 * El fetch es lazy (al montar) y cacheado a nivel módulo para que si el
 * artista aparece varias veces no se duplique.
 */
const photoCache = new Map<number, string | null>();

export function ArtistCard({ artist, onClick }: Props) {
  const cached = photoCache.get(artist.itunesId);
  const [imageUrl, setImageUrl] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (cached !== undefined) return; // ya intentamos antes
    let cancelled = false;
    itunesGetArtistAlbums(artist.itunesId, { limit: 1 })
      .then((albums) => {
        const url = albums[0]?.imageUrl ?? null;
        photoCache.set(artist.itunesId, url);
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        photoCache.set(artist.itunesId, null);
      });
    return () => { cancelled = true; };
  }, [artist.itunesId, cached]);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 glass rounded-xl p-3 hover:border-gold/50 transition-all text-left"
    >
      <div
        className="relative w-14 h-14 rounded-full overflow-hidden shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.30), rgba(168,134,0,0.55))',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <span className="text-base font-heading font-bold text-gold/90 tracking-wider">
              {artist.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {/* Borde dorado sutil para que parezca medallón */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(168,85,247,0.40)' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink font-medium truncate">{artist.name}</p>
        <p className="text-ink-mute text-xs truncate">
          {artist.primaryGenreName ?? 'Artista'}
        </p>
      </div>
      <ChevronRight />
    </button>
  );
}

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gold/60 shrink-0">
    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
