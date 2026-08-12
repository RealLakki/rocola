// ─── Marca por deploy ────────────────────────────────────────────────────────
// El mismo código sirve a varios locales; cada uno define SUS dos colores de
// marca en su .env (build-time). De esos dos colores se derivan todos los tonos
// y sombras del tema (así solo hacen falta 2 variables por negocio).
//
//   VITE_B1 = color primario   → "R G B"  (ej. "37 99 235")
//   VITE_B2 = color secundario → "R G B"  (ej. "249 115 22")
//
// Sin .env => neón ROCOLA por defecto (violeta + cian), para no romper `rocola`.

const parseRgb = (s: string | undefined, def: number[]): number[] => {
  const m = String(s ?? '').trim().split(/[\s,]+/).map(Number);
  return m.length === 3 && m.every((n) => Number.isFinite(n) && n >= 0 && n <= 255)
    ? m
    : def;
};

const mix = (c: number[], t: number[], a: number) =>
  c.map((v, i) => Math.round(v + (t[i] - v) * a));

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

export const BRAND_1 = parseRgb(import.meta.env.VITE_B1, [168, 85, 247]);
export const BRAND_2 = parseRgb(import.meta.env.VITE_B2, [34, 211, 238]);

// Slug del venue de este deploy (cada negocio tiene el suyo). Default 'rocola'
// para no romper el principal.
export const VENUE_SLUG = import.meta.env.VITE_VENUE_SLUG || 'rocola';

// Triples "R G B" para usar como rgb(var(--b1) / <alpha>) en CSS/Tailwind.
const TRIPLES: Record<string, number[]> = {
  '--b1': BRAND_1,
  '--b1-light': mix(BRAND_1, WHITE, 0.28),
  '--b1-dim': mix(BRAND_1, BLACK, 0.30),
  '--b1-deep': mix(BRAND_1, BLACK, 0.62),
  '--b2': BRAND_2,
  '--b2-light': mix(BRAND_2, WHITE, 0.28),
  '--b2-dim': mix(BRAND_2, BLACK, 0.30),
};

/** Aplica las variables de marca al :root (llamar antes del render). */
export function applyBrand(): void {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(TRIPLES)) root.setProperty(k, v.join(' '));
  // Sólidos parseables (SVG / three.js).
  root.setProperty('--brand-1', `rgb(${BRAND_1.join(',')})`);
  root.setProperty('--brand-2', `rgb(${BRAND_2.join(',')})`);
}
