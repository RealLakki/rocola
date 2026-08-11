/**
 * Acceso a Web Storage que NUNCA lanza.
 *
 * El cliente entra escaneando un QR, así que la app se abre en lo que sea que
 * el celular tenga a mano: Safari, Chrome, el WebView de una app lectora de QR,
 * el navegador embebido de WhatsApp/Instagram... En varios de esos contextos
 * `localStorage` no es utilizable:
 *
 *  - Safari con "Bloquear todas las cookies" → lanza SecurityError con solo
 *    LEER la propiedad.
 *  - WebView de Android → `domStorageEnabled` viene en false por defecto, y
 *    muchas apps lectoras de QR nunca lo activan.
 *  - Modos privados con cuota 0 → lanza QuotaExceededError al escribir.
 *
 * Sin esta capa, una excepción en el arranque (App.tsx lee sessionStorage en el
 * initializer de useState) tumba el render entero y el cliente ve una pantalla
 * en blanco. Con ella, se degrada a memoria: la sesión funciona igual, solo que
 * no sobrevive a una recarga.
 */

type Kind = 'local' | 'session';

const memory: Record<Kind, Map<string, string>> = {
  local: new Map(),
  session: new Map(),
};

const resolved = new Map<Kind, Storage | null>();

/** Prueba de escritura real: tener el objeto no garantiza poder usarlo. */
function probe(kind: Kind): Storage | null {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    if (!s) return null;
    const k = '__rocola_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

function backing(kind: Kind): Storage | null {
  if (!resolved.has(kind)) resolved.set(kind, probe(kind));
  return resolved.get(kind) ?? null;
}

function getItem(kind: Kind, key: string): string | null {
  try {
    const s = backing(kind);
    if (s) return s.getItem(key);
  } catch { /* el storage se cayó a mitad de sesión */ }
  return memory[kind].get(key) ?? null;
}

function setItem(kind: Kind, key: string, value: string): void {
  // Siempre espejamos en memoria: si el storage real falla después del probe
  // (cuota que se llena, permiso revocado), la sesión sigue coherente.
  memory[kind].set(key, value);
  try {
    backing(kind)?.setItem(key, value);
  } catch { /* noop */ }
}

export const safeLocal = {
  getItem: (key: string) => getItem('local', key),
  setItem: (key: string, value: string) => setItem('local', key, value),
};

export const safeSession = {
  getItem: (key: string) => getItem('session', key),
  setItem: (key: string, value: string) => setItem('session', key, value),
};

/**
 * UUID v4 con degradación. `crypto.randomUUID` solo existe desde Safari 15.4
 * (marzo 2022) y Chrome 92 — un iPhone en iOS 15.0-15.3 o un WebView viejo de
 * Android lanzarían "crypto.randomUUID is not a function" al identificar al
 * cliente, tumbando la vista antes de mostrar nada.
 */
export function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* sigue a los fallbacks */ }

  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40; // versión 4
      b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
      const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
  } catch { /* sigue al fallback final */ }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
