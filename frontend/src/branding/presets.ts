import type { BrandingConfig } from './types';

/** Tema padrão do produto — Gestágua (petróleo/aqua do demo aprovado). */
export const DEFAULT_BRANDING: BrandingConfig = {
  version: 1,
  productName: 'Gestágua',
  productSubtitle: 'Programa de gestão de água',
  logoUrl: null,
  colors: {
    primary: '#0c4a55',
    accent: '#16a3b5',
  },
  nav: {},
};

/** Presets rápidos de cor pro admin (aplicam só as cores, não o nome/logo). */
export const COLOR_PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: 'Gestágua (petróleo)', primary: '#0c4a55', accent: '#16a3b5' },
  { name: 'Arvo (verde)', primary: '#125b33', accent: '#ff7513' },
  { name: 'Azul', primary: '#14538c', accent: '#3ba7dc' },
  { name: 'Vinho', primary: '#5c1a33', accent: '#d95d78' },
];
