import { useEffect, useRef } from 'react';
import anime from 'animejs';

interface Props {
  size?: number;
}

export function AnimatedLogo({ size = 64 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const bars = ref.current.querySelectorAll('.bar');
    const tl = anime.timeline({
      loop: true,
      easing: 'easeInOutSine',
    });
    tl.add({
      targets: bars,
      scaleY: [0.3, 1.0],
      duration: 600,
      delay: anime.stagger(80),
    }).add({
      targets: bars,
      scaleY: 0.4,
      duration: 500,
      delay: anime.stagger(80),
    }, '-=400');
  }, []);

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ filter: 'drop-shadow(0 0 10px rgba(168,85,247, 0.65))' }}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {[10, 22, 34, 46].map((x, i) => (
        <rect
          key={i}
          className="bar"
          x={x}
          y={16}
          width={8}
          height={32}
          rx={3}
          fill="url(#logoGrad)"
          style={{ transformOrigin: `${x + 4}px 32px` }}
        />
      ))}
    </svg>
  );
}
