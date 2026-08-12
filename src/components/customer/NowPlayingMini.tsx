import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { joinArtists } from '../../utils/formatters';
import type { QueueItem } from '../../lib/types';

interface Props { nowPlaying: QueueItem | null; }

export function NowPlayingMini({ nowPlaying }: Props) {
  const ref     = useRef<HTMLDivElement>(null);
  const glowRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!nowPlaying || !ref.current) return;

    // Matar glow anterior si existía
    glowRef.current?.kill();

    // Entrada: sube + aparece + glow flash
    gsap.fromTo(ref.current,
      { y: 10, opacity: 0, scale: 0.96, boxShadow: '0 0 0px rgb(var(--b1) / 0)' },
      { y: 0,  opacity: 1, scale: 1,    boxShadow: '0 0 28px rgb(var(--b1) / 0.5)',
        duration: 0.55, ease: 'back.out(1.6)' }
    );

    // Glow respiratorio continuo
    glowRef.current = gsap.to(ref.current, {
      boxShadow: '0 0 48px rgb(var(--b1) / 0.85), 0 0 90px rgb(var(--b1) / 0.25)',
      duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut',
      delay: 0.6,
    });

    return () => { glowRef.current?.kill(); };
  }, [nowPlaying?.id]);

  if (!nowPlaying) {
    return (
      <div className="glass rounded-2xl p-4 text-center">
        <p className="text-ink-dim text-sm">Sin música por ahora</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="glass-elevated rounded-2xl p-4 flex items-center gap-3 gold-border">
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
        {nowPlaying.track.imageUrl && (
          <img src={nowPlaying.track.imageUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 grid place-items-center bg-base/40">
          <Bars />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-gold font-heading">Sonando</p>
        <p className="text-ink font-medium truncate">{nowPlaying.track.title}</p>
        <p className="text-ink-mute text-xs truncate">{joinArtists(nowPlaying.track.artists)}</p>
      </div>
    </div>
  );
}

function Bars() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const bars = Array.from(ref.current.querySelectorAll('.bar'));
    const tweens = bars.map((bar, i) =>
      gsap.to(bar, {
        scaleY: 0.15 + Math.random() * 0.1,
        yoyo: true, repeat: -1,
        duration: 0.38 + i * 0.13,
        ease: 'sine.inOut',
        delay: i * 0.18,
      })
    );
    return () => tweens.forEach((t) => t.kill());
  }, []);

  return (
    <div ref={ref} className="flex items-end gap-[3px] h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bar w-[3px] bg-gold rounded-sm"
          style={{ height: '100%', transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  );
}
