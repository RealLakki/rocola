import type { AlbumResult } from '../../lib/itunes';

interface Props {
  album: AlbumResult;
  onClick: () => void;
}

export function AlbumCard({ album, onClick }: Props) {
  const year = album.releaseDate?.slice(0, 4);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 glass rounded-xl p-3 hover:border-gold/50 transition-all text-left"
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-base-elevated shrink-0">
        {album.imageUrl ? (
          <img src={album.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gold/20 to-gold-deep/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink font-medium truncate">{album.name}</p>
        <p className="text-ink-mute text-xs truncate">
          {year && <span>{year} · </span>}
          {album.trackCount ? `${album.trackCount} canciones` : 'Álbum'}
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
