/** Utilidades de cor: deriva a paleta inteira a partir de primary + accent. */

const HEX_RE = /^#([0-9a-f]{6})$/i;

export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

function hexToRgb(hex: string): [number, number, number] {
  const m = HEX_RE.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexToHsl(hex: string): [number, number, number] {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const s1 = Math.min(100, Math.max(0, s)) / 100;
  const l1 = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = l1 - c / 2;
  const to255 = (v: number) => Math.round((v + m) * 255);
  return (
    '#' +
    [to255(rgb[0]), to255(rgb[1]), to255(rgb[2])]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Luminância relativa (WCAG) — decide texto claro ou escuro sobre a cor. */
function luminance(hex: string): number {
  const lin = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/**
 * Gera as CSS variables da marca. O drawer/botões usam a primária como fundo;
 * hover/deep/soft são derivados pra não depender do admin escolher 7 cores.
 */
export function derivePalette(primary: string, accent: string): Record<string, string> {
  const p = isValidHex(primary) ? primary : '#0c4a55';
  const a = isValidHex(accent) ? accent : '#16a3b5';

  const [ph, ps, pl] = hexToHsl(p);
  const [ah, as] = hexToHsl(a);
  const isLight = luminance(p) > 0.45;

  return {
    '--brand-primary': p,
    // fundo mais fundo (gradientes, header do modal)
    '--brand-primary-deep': hslToHex(ph, ps, Math.max(pl - (isLight ? 14 : 9), 3)),
    // hover/selected dentro do drawer (um passo pro claro em fundos escuros)
    '--brand-primary-hover': isLight
      ? hslToHex(ph, ps, Math.max(pl - 10, 5))
      : hslToHex(ph, Math.min(ps + 4, 100), Math.min(pl + 9, 92)),
    // tinta clara da primária (chips/selected em fundo claro)
    '--brand-primary-soft': hslToHex(ph, Math.min(ps, 55), 93),
    // texto sobre a primária
    '--brand-on-primary': isLight ? '#1d2b2e' : '#ffffff',
    '--brand-accent': a,
    '--brand-accent-soft': hslToHex(ah, Math.min(as, 60), 92),
  };
}
