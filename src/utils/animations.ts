import gsap from 'gsap';

export const enterFromBottom = (
  target: Element | Element[] | NodeListOf<Element>,
  delay = 0,
) =>
  gsap.from(target, {
    y: 24, opacity: 0, duration: 0.5, delay: delay / 1000, ease: 'power3.out',
  });

export const goldPulse = (target: Element) =>
  gsap.to(target, {
    boxShadow: '0 0 45px rgb(var(--b1) / 0.85), 0 0 90px rgb(var(--b1) / 0.30)',
    duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut',
  });

export const confirmAdd = (target: Element) => {
  gsap.timeline()
    .to(target, { scale: 0.88, duration: 0.1, ease: 'power2.in' })
    .to(target, { scale: 1.12, duration: 0.22, ease: 'back.out(2.5)' })
    .to(target, { scale: 1, duration: 0.22, ease: 'power2.out' });
};

export const exitToTop = (target: Element) =>
  gsap.to(target, { y: -32, opacity: 0, duration: 0.35, ease: 'power2.in' });

export const titleSweep = (target: Element) =>
  gsap.from(target, { x: -40, opacity: 0, duration: 0.65, ease: 'power3.out' });

export const staggerList = (targets: NodeListOf<Element> | Element[]) =>
  gsap.from(targets, {
    x: -20, opacity: 0, duration: 0.42, stagger: 0.055, ease: 'power3.out',
  });
