import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import anime from 'animejs';

interface Props {
  slug: string;
  /** Tamaño del QR (default 180px). En TVs grandes considera subirlo. */
  size?: number;
}

/**
 * Panel del QR para mostrar en el reproductor (modo TV). Posicionado en
 * la esquina superior derecha, sutil pero suficientemente grande para
 * escanear desde mesas a 3-4 metros.
 */
export function PlayerQrPanel({ slug, size = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const url = `${window.location.origin}/v/${slug}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: { dark: '#0A0A14', light: '#E8F4FF' },
    });
  }, [slug, size]);

  useEffect(() => {
    if (!cardRef.current) return;
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [-12, 0],
      scale: [0.95, 1],
      duration: 700,
      delay: 800,
      easing: 'easeOutCubic',
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className="fixed bottom-4 right-4 z-40 rounded-xl p-2.5 flex flex-col items-center gap-1.5"
      style={{
        background: 'rgba(19, 19, 28, 0.90)',
        border: '1px solid rgba(0, 212, 255, 0.45)',
        boxShadow: '0 0 18px rgba(0, 212, 255, 0.25), 0 10px 30px rgba(0, 0, 0, 0.50)',
        backdropFilter: 'blur(16px)',
        opacity: 0,
      }}
    >
      <p className="text-gold font-heading uppercase tracking-[0.18em] text-[9px]">
        Pide tu canción
      </p>
      <div className="bg-[#E8F4FF] rounded-md p-1.5">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
