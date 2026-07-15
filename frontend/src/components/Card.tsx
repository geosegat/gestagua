import type { ReactNode } from 'react';

/**
 * Raio dos blocos de nível superior. Mora AQUI e em lugar nenhum mais: o
 * DataTableCard usa 8px por ser uma tabela larga, todo o resto herda este
 * valor. Mexer no arredondamento do produto é mexer nesta constante.
 */
export const RADIUS = 'rounded-[6px]';

/** Superfície de card: raio + borda + fundo do tema. */
export const CARD = `${RADIUS} border border-line bg-card`;

/** Sombra de elevação no hover — cards que reagem ao mouse. */
export const CARD_ELEVATION =
  'transition-shadow hover:shadow-[0_14px_34px_-14px_rgba(13,60,68,0.25)]';

/** Raio dos elementos internos do card (chips de ícone, itens de lista). */
export const INNER_CARD = 'rounded-[5px]';

/** Card estático. Precisa animar? Componha `CARD` num motion.div. */
export default function Card({
  className = '',
  children,
}: {
  className?: string;
  /** vazio é válido: o skeleton usa o card só como superfície */
  children?: ReactNode;
}) {
  return <div className={`${CARD} ${className}`}>{children}</div>;
}
