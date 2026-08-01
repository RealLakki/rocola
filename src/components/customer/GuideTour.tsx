import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const TOUR_DONE_KEY = 'cantina:tourDone';

const STEPS = [
  {
    emoji: '🔊',
    title: '¡Bienvenido a ROCOLA!',
    body: 'La rockola digital del local. Aquí la música la pone la gente — no el DJ. ¡Tú mandas lo que suena!',
  },
  {
    emoji: '🔍',
    title: 'Busca tu canción',
    body: 'Escribe el nombre del tema o del artista en la barra de búsqueda. Encuentra lo que quieras escuchar.',
  },
  {
    emoji: '➕',
    title: 'Agrégala a la cola',
    body: 'Toca el botón + en la canción que quieras. Entra sola a la cola y suena cuando le toque el turno.',
  },
  {
    emoji: '📋',
    title: 'Revisa lo que viene',
    body: 'En la cola ves todo lo que está por sonar. ¿Quieres subir primero? Habla con el bar o el mesero.',
  },
];

interface Props {
  show: boolean;
  onDone: () => void;
}

export function GuideTour({ show, onDone }: Props) {
  const [step, setStep] = useState(0);
  const panelRef   = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { y: '100%', opacity: 0 },
      { y: '0%', opacity: 1, duration: 0.5, ease: 'power3.out' }
    );
  }, [show]);

  const animateIn = (dir: 1 | -1) => {
    if (!contentRef.current) return;
    gsap.fromTo(
      contentRef.current,
      { x: dir * 36, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.28, ease: 'power2.out' }
    );
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      gsap.to(contentRef.current, {
        x: -36, opacity: 0, duration: 0.18, ease: 'power2.in',
        onComplete: () => {
          setStep(s => s + 1);
          animateIn(1);
        },
      });
    } else {
      finish();
    }
  };

  const finish = () => {
    if (!panelRef.current) return;
    gsap.to(panelRef.current, {
      y: '100%', opacity: 0, duration: 0.32, ease: 'power2.in',
      onComplete: onDone,
    });
  };

  if (!show) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop semitransparente — toca fuera para saltar */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{ background: 'rgba(10,10,20,0.50)' }}
        onClick={finish}
      />

      {/* Panel deslizable desde abajo */}
      <div
        ref={panelRef}
        className="fixed bottom-0 left-0 right-0 z-[9991] px-3 sm:px-4 pb-5 sm:pb-6 pt-2"
      >
        <div
          className="max-w-xl mx-auto rounded-2xl p-4 sm:p-5"
          style={{
            background: 'rgba(18,18,31,0.97)',
            border: '1px solid rgba(168,85,247,0.40)',
            boxShadow: '0 -8px 40px rgba(168,85,247,0.15), 0 0 0 1px rgba(168,85,247,0.08)',
          }}
        >
          {/* Barra de progreso + botón saltar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5 items-center">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 22 : 6,
                    background: i === step
                      ? '#A855F7'
                      : i < step
                      ? 'rgba(168,85,247,0.50)'
                      : 'rgba(168,85,247,0.18)',
                  }}
                />
              ))}
              <span className="ml-2 text-ink-dim font-heading text-[10px] uppercase tracking-widest">
                {step + 1}/{STEPS.length}
              </span>
            </div>
            <button
              onClick={finish}
              className="text-[11px] text-ink-dim hover:text-ink transition font-heading uppercase tracking-widest px-2 py-1"
            >
              Saltar ×
            </button>
          </div>

          {/* Contenido del paso */}
          <div ref={contentRef}>
            <div className="text-4xl mb-3">{current.emoji}</div>
            <h2
              className="font-heading text-base sm:text-lg uppercase tracking-wide mb-2"
              style={{ color: '#A855F7' }}
            >
              {current.title}
            </h2>
            <p className="text-ink-mute text-sm leading-relaxed">
              {current.body}
            </p>
          </div>

          {/* Botón siguiente / listo */}
          <button
            onClick={next}
            className="mt-4 sm:mt-5 w-full py-3 rounded-xl font-heading uppercase tracking-wider text-sm font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #C084FC 0%, #A855F7 55%, #7C3AED 100%)',
              color: '#0A0A14',
              boxShadow: '0 0 18px rgba(168,85,247,0.35)',
            }}
          >
            {isLast ? '¡Listo, a pedir! 🔊' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </>
  );
}

/** Devuelve si el tour ya fue completado en este dispositivo */
export function isTourDone(): boolean {
  try { return localStorage.getItem(TOUR_DONE_KEY) === '1'; } catch { return false; }
}

/** Marca el tour como completado */
export function markTourDone(): void {
  try { localStorage.setItem(TOUR_DONE_KEY, '1'); } catch { /* noop */ }
}
