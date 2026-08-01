import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { AppLogo } from '../components/common/AppLogo';
import { NeonButton } from '../components/common/NeonButton';

/* ─── Scroll progress bar ─── */
function ScrollProgressBar() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPct(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-[3px] bg-transparent">
      <div
        className="h-full transition-none"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #A855F7 0%, #C084FC 100%)',
          boxShadow: '0 0 8px rgba(168,85,247,0.80)',
        }}
      />
    </div>
  );
}

/* ─── CountUp hook ─── */
function useCountUp(target: number, inView: boolean, duration = 1400) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setCount(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, inView, duration]);
  return count;
}

/* ─── IntersectionObserver hook ─── */
function useInView(ref: React.RefObject<Element | null>, threshold = 0.3) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

/* ─── Stat card con countUp ─── */
function StatCard({ value, suffix, label, inView }: {
  value: number; suffix: string; label: string; inView: boolean;
}) {
  const count = useCountUp(value, inView);
  return (
    <div className="flex flex-col items-center py-6 px-4">
      <span className="font-display italic font-bold text-4xl sm:text-5xl gold-text">
        {count}{suffix}
      </span>
      <span className="mt-1 text-ink-mute font-heading uppercase tracking-widest text-xs text-center">
        {label}
      </span>
    </div>
  );
}

/* ─── Feature card con neon hover ─── */
function FeatureCard({ step, icon, title, body }: {
  step: string; icon: string; title: string; body: string;
}) {
  return (
    <div
      className="card-neon rounded-2xl p-5 sm:p-6 text-left"
      style={{
        background: 'rgba(18,18,31,0.80)',
        border: '1px solid rgba(168,85,247,0.18)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-heading font-bold shrink-0"
          style={{
            background: 'linear-gradient(135deg, #C084FC 0%, #A855F7 100%)',
            color: '#0A0A14',
          }}
        >
          {step}
        </span>
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="font-heading uppercase tracking-wide text-sm sm:text-base text-gold mb-2">{title}</h3>
      <p className="text-ink-mute text-sm leading-relaxed">{body}</p>
    </div>
  );
}

/* ─── Main Landing ─── */
export function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const statsRef  = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef as React.RefObject<Element>, 0.3);

  const badgeRef    = useRef<HTMLDivElement>(null);
  const titleRef    = useRef<HTMLHeadingElement>(null);
  const subRef      = useRef<HTMLParagraphElement>(null);
  const ctasRef     = useRef<HTMLDivElement>(null);
  const logoRef     = useRef<HTMLDivElement>(null);
  const cardsRef    = useRef<HTMLDivElement>(null);

  // Navbar scroll behaviour
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hero GSAP: fade + slide desde abajo
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [logoRef.current, badgeRef.current, titleRef.current, subRef.current, ctasRef.current],
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.13, ease: 'power3.out', delay: 0.15 }
      );
      if (cardsRef.current) {
        gsap.fromTo(
          Array.from(cardsRef.current.children),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.10, ease: 'power2.out', delay: 0.5 }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <ScrollProgressBar />

      {/* Grid pattern de fondo */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-60" />

      {/* Glow ornamenta corner */}
      <div
        className="fixed -top-40 -left-40 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)' }}
      />
      <div
        className="fixed -bottom-40 -right-40 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)' }}
      />

      {/* ── NAVBAR ── */}
      <nav
        className="fixed top-[3px] left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(10,10,20,0.92)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(168,85,247,0.15)' : '1px solid transparent',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <AppLogo size={36} />
          <span className="font-heading text-ink text-base sm:text-lg tracking-[0.18em] uppercase">
            ROCOLA
          </span>
        </div>
        <Link
          to="/admin/rocola"
          className="text-ink-mute hover:text-gold transition-colors text-xs sm:text-sm font-heading tracking-wide uppercase"
        >
          Soy del local →
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-20 pb-12 text-center">
        {/* Logo grande */}
        <div ref={logoRef} className="mb-6 sm:mb-8">
          <AppLogo size={160} glow />
        </div>

        {/* Badge */}
        <div ref={badgeRef} className="flex items-center gap-3 mb-5 sm:mb-6">
          <span
            className="block h-px w-8 sm:w-14"
            style={{ background: 'linear-gradient(to right, transparent, #A855F7)' }}
          />
          <span className="text-gold font-heading uppercase tracking-[0.24em] text-[10px] sm:text-[11px] whitespace-nowrap">
            Cartagena · Despecho & Popular
          </span>
          <span
            className="block h-px w-8 sm:w-14"
            style={{ background: 'linear-gradient(to left, transparent, #A855F7)' }}
          />
        </div>

        {/* Título principal */}
        <h1
          ref={titleRef}
          className="text-4xl sm:text-6xl md:text-7xl font-display italic font-bold text-ink leading-[1.05] max-w-3xl"
        >
          La música la pones{' '}
          <span className="gold-text not-italic">tú</span>.
        </h1>

        {/* Subtítulo */}
        <p
          ref={subRef}
          className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-ink-mute max-w-lg sm:max-w-xl leading-relaxed"
        >
          Escanea el QR de tu mesa, elige lo que quieres escuchar y agrégalo
          a la cola. Sin apps, sin cuentas, sin que te ignoren.
        </p>

        {/* CTAs */}
        <div
          ref={ctasRef}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center w-full max-w-sm sm:max-w-none"
        >
          <Link to="/v/rocola" className="w-full sm:w-auto">
            <NeonButton variant="primary" size="lg" className="w-full sm:w-auto">
              🔊 Ver demo
            </NeonButton>
          </Link>
          <Link to="/admin/rocola" className="w-full sm:w-auto">
            <NeonButton variant="ghost" size="lg" className="w-full sm:w-auto">
              Panel del local
            </NeonButton>
          </Link>
        </div>
      </section>

      {/* ── STATS ── */}
      <section
        ref={statsRef}
        className="px-4 sm:px-6 py-8 sm:py-12"
      >
        <div
          className="max-w-2xl mx-auto rounded-2xl"
          style={{
            background: 'rgba(18,18,31,0.70)',
            border: '1px solid rgba(168,85,247,0.20)',
          }}
        >
          <div className="grid grid-cols-3 divide-x divide-gold/10">
            <StatCard value={0}   suffix=""   label="Apps necesarias"     inView={statsInView} />
            <StatCard value={10}  suffix="K+" label="Canciones pedidas"   inView={statsInView} />
            <StatCard value={100} suffix="%"  label="Lo elige la gente"   inView={statsInView} />
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Divider ornamental */}
          <div className="flex items-center gap-3 mb-8 sm:mb-12">
            <span className="flex-1 h-px bg-gold/15" />
            <span className="text-gold/50 text-lg">◆</span>
            <span className="font-heading uppercase tracking-[0.22em] text-gold text-[11px]">
              Así funciona
            </span>
            <span className="text-gold/50 text-lg">◆</span>
            <span className="flex-1 h-px bg-gold/15" />
          </div>

          <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard
              step="01"
              icon="📱"
              title="Escanea el QR"
              body="Sin instalar nada. Solo apunta la cámara al código de tu mesa y ya entras."
            />
            <FeatureCard
              step="02"
              icon="🎵"
              title="Elige tu canción"
              body="Busca el tema, el artista o el álbum. Lo que quieras escuchar, lo encuentras."
            />
            <FeatureCard
              step="03"
              icon="🔊"
              title="¡A la rockola!"
              body="Toca el botón y tu canción entra a la cola. Espera tu turno y a gozar."
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="px-4 sm:px-6 py-6 sm:py-8 mt-4"
        style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="text-ink-dim text-xs uppercase tracking-[0.20em] font-heading">
              ROCOLA · Cartagena
            </span>
          </div>
          <div className="flex items-center gap-2 text-ink-dim text-[10px] uppercase tracking-widest font-heading">
            <span className="text-gold/50">◆</span>
            <span>Hecho pa' la costa</span>
            <span className="text-gold/50">◆</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
