import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AppLogo } from './AppLogo';

interface Props {
  onDone: () => void;
  duration?: number;
}

const TITLE_LETTERS = 'ROCOLA'.split('');
const SUBTITLE = 'PÍDELA · SUENA · GOZA';
const RAY_COUNT = 14;
const PARTICLE_COUNT = 36;

export function IntroSplash({ onDone, duration = 2000 }: Props) {
  const rootRef      = useRef<HTMLDivElement>(null);
  const flashRef     = useRef<HTMLDivElement>(null);
  const logoWrapRef  = useRef<HTMLDivElement>(null);
  const raysRef      = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const titleRef     = useRef<HTMLHeadingElement>(null);
  const subtitleRef  = useRef<HTMLParagraphElement>(null);
  const ringRef      = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(rootRef.current, {
            opacity: 0,
            duration: 0.35,
            ease: 'power2.inOut',
            onComplete: () => { setDone(true); onDone(); },
          });
        },
      });

      gsap.set([flashRef.current, ringRef.current], { opacity: 0 });
      gsap.set(logoWrapRef.current, { opacity: 0, scale: 0, rotation: -18 });
      gsap.set(raysRef.current?.querySelectorAll('.ray') ?? [], { scaleY: 0, opacity: 0 });
      gsap.set(particlesRef.current?.querySelectorAll('.particle') ?? [], { opacity: 0, scale: 0 });
      gsap.set(titleRef.current?.querySelectorAll('.letter') ?? [], { opacity: 0, y: 20, scale: 0.8 });
      gsap.set(subtitleRef.current, { opacity: 0, letterSpacing: '0.04em' });

      // 1. Flash
      tl.fromTo(flashRef.current,
        { opacity: 0, scale: 0 },
        { opacity: 0.85, scale: 22, duration: 0.3, ease: 'expo.out' }
      ).to(flashRef.current, { opacity: 0, duration: 0.18, ease: 'power2.in' }, '-=0.05');

      // 2. Logo con bounce
      tl.to(logoWrapRef.current, {
        scale: 1, opacity: 1, rotation: 0,
        duration: 0.45, ease: 'back.out(1.8)',
      }, '-=0.25');

      // 3. Anillo
      tl.fromTo(ringRef.current,
        { scale: 0.4, opacity: 0.9 },
        { scale: 1.8, opacity: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.38'
      );

      // 4. Rayos
      tl.to(raysRef.current?.querySelectorAll('.ray') ?? [], {
        scaleY: 1, opacity: 0.7,
        duration: 0.25, stagger: 0.012, ease: 'power2.out',
      }, '-=0.42')
      .to(raysRef.current?.querySelectorAll('.ray') ?? [], {
        opacity: 0, duration: 0.22, stagger: 0.012, ease: 'power2.in',
      }, '-=0.08');

      // 5. Partículas
      const particles = particlesRef.current?.querySelectorAll('.particle') ?? [];
      particles.forEach((p, i) => {
        const angle = (360 / PARTICLE_COUNT) * i;
        const dist  = 55 + Math.random() * 60;
        const dx    = Math.cos((angle * Math.PI) / 180) * dist;
        const dy    = Math.sin((angle * Math.PI) / 180) * dist;
        tl.to(p, {
          opacity: 0.9, scale: 0.5 + Math.random() * 0.7,
          x: dx, y: dy,
          duration: 0.35 + Math.random() * 0.2,
          ease: 'power2.out',
          delay: i * 0.006,
        }, '-=0.42');
      });
      tl.to(particles, { opacity: 0, duration: 0.22 }, '-=0.15');

      // 6. Letras
      tl.to(titleRef.current?.querySelectorAll('.letter') ?? [], {
        opacity: 1, y: 0, scale: 1,
        duration: 0.28, stagger: 0.028, ease: 'back.out(2)',
      }, '-=0.28');

      // 7. Subtítulo
      tl.to(subtitleRef.current, {
        opacity: 1, letterSpacing: '0.28em',
        duration: 0.32, ease: 'power3.out',
      }, '-=0.08');

      tl.to({}, { duration: 0.25 });

    }, rootRef);

    return () => ctx.revert();
  }, [duration, onDone]);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden"
      style={{ background: '#0A0A14' }}
    >
      {/* Halo ámbar desde el centro */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(168,85,247,0.22) 0%, rgba(18,18,31,0.96) 45%, #0A0A14 75%)',
        }}
      />

      {/* Flash ámbar */}
      <div
        ref={flashRef}
        className="absolute w-32 h-32 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,220,80,0.95) 0%, rgba(168,85,247,0.60) 40%, transparent 80%)',
          filter: 'blur(6px)',
        }}
      />

      {/* Rayos radiales */}
      <div
        ref={raysRef}
        className="absolute w-[600px] h-[600px] pointer-events-none"
        style={{ transformOrigin: 'center' }}
      >
        {Array.from({ length: RAY_COUNT }).map((_, i) => (
          <div
            key={i}
            className="ray absolute left-1/2 top-1/2"
            style={{
              width: '2px',
              height: '300px',
              background:
                'linear-gradient(to top, rgba(168,85,247,0) 0%, rgba(255,214,51,0.9) 50%, rgba(168,85,247,0) 100%)',
              transform: `translate(-50%, -100%) rotate(${(360 / RAY_COUNT) * i}deg)`,
              transformOrigin: 'bottom center',
            }}
          />
        ))}
      </div>

      {/* Anillo expansivo */}
      <div
        ref={ringRef}
        className="absolute w-72 h-72 rounded-full pointer-events-none"
        style={{
          border: '2px solid rgba(168,85,247,0.75)',
          boxShadow: '0 0 30px rgba(168,85,247,0.50), inset 0 0 30px rgba(255,214,51,0.18)',
        }}
      />

      {/* Partículas — ámbar + crema */}
      <div ref={particlesRef} className="absolute w-0 h-0 pointer-events-none">
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <div
            key={i}
            className="particle absolute rounded-full"
            style={{
              width: 4 + Math.random() * 3,
              height: 4 + Math.random() * 3,
              background: i % 3 === 0 ? '#ECECFF' : i % 3 === 1 ? '#A855F7' : '#C084FC',
              boxShadow: '0 0 8px rgba(168,85,247,0.85)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {/* Logo central */}
      <div
        ref={logoWrapRef}
        className="relative z-10"
        style={{ filter: 'drop-shadow(0 0 32px rgba(168,85,247,0.70))' }}
      >
        <AppLogo size={240} glow />
      </div>

      {/* Texto */}
      <div className="absolute bottom-[18vh] flex flex-col items-center px-4">
        <h1
          ref={titleRef}
          className="font-display italic font-bold text-3xl md:text-5xl text-ink mb-3 tracking-wide"
        >
          {TITLE_LETTERS.map((letter, i) =>
            letter === ' ' ? (
              <span key={i} className="inline-block w-3 md:w-5" />
            ) : (
              <span key={i} className="letter inline-block">{letter}</span>
            )
          )}
        </h1>
        <p
          ref={subtitleRef}
          className="text-gold font-heading uppercase text-[11px] md:text-xs"
          style={{ letterSpacing: '0.28em' }}
        >
          {SUBTITLE}
        </p>
      </div>
    </div>
  );
}
