import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Red de seguridad de último recurso.
 *
 * Sin esto, cualquier excepción durante el render desmonta el árbol entero y el
 * cliente se queda mirando una pantalla en blanco — sin saber si es su celular,
 * el WiFi del bar o la app. Como la vista del cliente se abre en cualquier
 * navegador que traiga el que escanea el QR, la superficie de fallos que no
 * controlamos es grande: conviene fallar mostrando algo accionable.
 *
 * En el reproductor de la TV importa todavía más: nadie está mirando la
 * pantalla para diagnosticar, así que el mensaje tiene que decir qué hacer.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[error-boundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen grid place-items-center bg-base p-6">
        <div className="max-w-sm text-center">
          <p className="text-gold font-heading uppercase tracking-[0.22em] text-xs mb-3">
            Rocola digital
          </p>
          <h1 className="text-2xl font-display italic text-ink mb-3">
            Algo se atascó
          </h1>
          <p className="text-ink-mute text-sm mb-6">
            La música del local sigue sonando. Recarga esta página para volver a
            pedir canciones.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-gradient-gold text-base font-heading uppercase tracking-widest text-sm shadow-gold"
          >
            Recargar
          </button>
          <p className="text-ink-dim text-[11px] mt-6 break-words">
            {error.message}
          </p>
        </div>
      </div>
    );
  }
}
