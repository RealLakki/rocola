import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { GlowCard } from '../common/GlowCard';
import { NeonButton } from '../common/NeonButton';
import { BRAND_1 } from '../../brand';

interface Props {
  slug: string;
}

// La librería `qrcode` solo acepta HEX (no variables CSS). Convertimos el color
// de marca primario a hex para el QR.
const brandHex = '#' + BRAND_1.map((c) => c.toString(16).padStart(2, '0')).join('');

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
        color: { dark: brandHex, light: '#FFFFFF' },
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
