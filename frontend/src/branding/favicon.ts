// Path data são as duas gotas do ícone "Droplets" do lucide-react — o mesmo
// ícone já usado como logo no Drawer/LoginPage. Reaproveitado aqui em vez de
// importar o componente porque o favicon é desenhado num <canvas> (só PNG,
// sem depender de SVG dinâmico, que tem suporte inconsistente como rel="icon"
// entre navegadores).
const DROPLET_PATHS = [
  'M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z',
  'M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97',
];

const ICON_VIEWBOX = 24;
const SIZE = 64;
const ICON_DISPLAY = 42; // tamanho da gota dentro do quadrado — deixa uma margem, igual ao chip de logo do Drawer
const SCALE = ICON_DISPLAY / ICON_VIEWBOX;
const OFFSET = (SIZE - ICON_DISPLAY) / 2;
const RADIUS = SIZE * 0.22;

/**
 * Desenha o favicon — quadrado arredondado na cor primária + gota na cor de
 * acento, o mesmo par de cores do chip de logo do Drawer — e devolve como PNG
 * data URL.
 */
export function buildFaviconDataUrl(primary: string, accent: string): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.roundRect(0, 0, SIZE, SIZE, RADIUS);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.translate(OFFSET, OFFSET);
  ctx.scale(SCALE, SCALE);
  for (const d of DROPLET_PATHS) ctx.fill(new Path2D(d));

  return canvas.toDataURL('image/png');
}

/**
 * Troca o <link rel="icon"> por um elemento novo, não só o href. Só mudar o
 * href faz vários navegadores manterem o ícone antigo na aba até um F5 —
 * remover e reinserir o <link> força o repaint na hora, sem recarregar nada.
 */
export function applyFavicon(primary: string, accent: string): void {
  const dataUrl = buildFaviconDataUrl(primary, accent);
  if (!dataUrl) return;

  document.querySelectorAll('link[rel~="icon"]').forEach((el) => el.remove());

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = dataUrl;
  document.head.appendChild(link);
}
