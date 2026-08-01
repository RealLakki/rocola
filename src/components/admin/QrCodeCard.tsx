import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { GlowCard } from '../common/GlowCard';
import { NeonButton } from '../common/NeonButton';

interface Props {
  slug: string;
}

export function QrCodeCard({ slug }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const u = `${window.location.origin}/v/${slug}`;
    setUrl(u);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, u, {
        width: 220,
        margin: 1,
        color: { dark: '#A855F7', light: '#00000000' },
      });
    }
  }, [slug]);

  return (
    <GlowCard glow>
      <h3 className="font-heading text-gold uppercase tracking-widest text-xs mb-3">
        QR del local
      </h3>
      <div className="flex flex-col items-center gap-3">
        <div className="bg-base p-3 rounded-xl gold-border">
          <canvas ref={canvasRef} />
        </div>
        <code className="text-ink-mute text-xs font-mono text-center break-all">{url}</code>
        <NeonButton size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(url)}>
          Copiar URL
        </NeonButton>
      </div>
    </GlowCard>
  );
}
