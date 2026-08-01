import { ALL_GENRES, CANTINA_GENRES, GENRE_LABEL, type Genre, type Venue } from '../../lib/types';
import { updateVenue } from '../../lib/api';
import { GlowCard } from '../common/GlowCard';

interface Props {
  venue: Venue;
  onUpdate: (patch: Partial<Venue>) => void;
}

export function GenreSettings({ venue, onUpdate }: Props) {
  const setGenres = async (next: Genre[]) => {
    await updateVenue(venue.id, { allowedGenres: next });
    onUpdate({ allowedGenres: next });
  };

  const toggleGenre = async (g: Genre) => {
    const next = venue.allowedGenres.includes(g)
      ? venue.allowedGenres.filter((x) => x !== g)
      : [...venue.allowedGenres, g];
    await setGenres(next.length > 0 ? next : CANTINA_GENRES);
  };

  const isHoraLoca =
    venue.allowedGenres.length === 0 ||
    ALL_GENRES.every((g) => venue.allowedGenres.includes(g));

  return (
    <GlowCard>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-heading text-gold uppercase tracking-widest text-xs">
          Géneros permitidos
        </h3>
        <span className="text-ink-dim text-xs">
          {isHoraLoca ? 'Hora loca' : `${venue.allowedGenres.length} activos`}
        </span>
      </div>
      <p className="text-ink-mute text-xs mb-3">
        Modo cantina permite solo despecho y regional. Hora loca abre todos los géneros temporalmente.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={() => setGenres(CANTINA_GENRES)}
          className={[
            'px-3 py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all border',
            !isHoraLoca
              ? 'bg-gold/15 border-gold/50 text-gold'
              : 'bg-base-card border-base-border text-ink-mute hover:border-gold/40 hover:text-ink',
          ].join(' ')}
        >
          Modo cantina
        </button>
        <button
          type="button"
          onClick={() => setGenres(ALL_GENRES)}
          className={[
            'px-3 py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all border',
            isHoraLoca
              ? 'bg-gradient-gold border-gold text-[#0A0A14] shadow-gold-sm'
              : 'bg-base-card border-base-border text-ink-mute hover:border-gold/40 hover:text-ink',
          ].join(' ')}
        >
          Hora loca
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {CANTINA_GENRES.map((g) => {
          const active = venue.allowedGenres.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                active
                  ? 'bg-gradient-gold text-[#0A0A14] shadow-gold-sm'
                  : 'bg-base-card border border-base-border text-ink-mute hover:border-gold/40 hover:text-ink',
              ].join(' ')}
            >
              {GENRE_LABEL[g]}
            </button>
          );
        })}
      </div>
    </GlowCard>
  );
}
