import type { Variants } from 'framer-motion';

/** Curva de entrada padrão do produto (ease-out suave). */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Pai de uma grade que revela os filhos em cascata. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Filho de `stagger`: sobe e aparece. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
