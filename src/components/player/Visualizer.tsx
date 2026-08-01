import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Fallback visual cuando no hay videoclip oficial. No usa Web Audio (no podemos
 * decodificar el audio del iframe de YouTube), así que es un visualizer "fake"
 * — animejs anima barras a alturas pseudo-aleatorias en loop continuo.
 */
interface Props {
  imageUrl?: string;
  active: boolean;
}

const BAR_COUNT = 64;

export function Visualizer({ imageUrl, active }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const bars = Array.from(containerRef.current.querySelectorAll<HTMLElement>('.viz-bar'));

    cancelRef.current?.();

    if (!active) {
      anime({ targets: bars, scaleY: 0.2, duration: 400, easing: 'easeOutQuad' });
      return;
    }

    let stopped = false;
    const tick = () => {
      if (stopped) return;
      anime({
        targets: bars,
        scaleY: () => 0.15 + Math.random() ** 0.7,
        duration: 280,
        delay: anime.stagger(8, { from: 'center' }),
        easing: 'easeInOutQuad',
        complete: tick,
      });
    };
    tick();
    cancelRef.current = () => { stopped = true; };

    return () => { cancelRef.current?.(); };
  }, [active]);

  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-40"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent" />
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="relative w-72 h-72 rounded-3xl object-cover shadow-gold-lg z-10"
        />
      )}
      <div
        ref={containerRef}
        className="absolute inset-x-0 bottom-0 h-40 flex items-end justify-center gap-1 px-8 pb-8 z-20"
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className="viz-bar flex-1 max-w-[8px] bg-gradient-to-t from-gold-deep to-gold rounded-t"
            style={{ height: '100%', transformOrigin: 'bottom', transform: 'scaleY(0.2)' }}
          />
        ))}
      </div>
    </div>
  );
}
