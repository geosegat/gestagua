import type { ReactNode } from 'react';

/**
 * Largura de leitura padrão das telas: 1080px, centralizado.
 * Telas que devem ocupar a largura TODA (tabela full-width estilo ARVO —
 * ex.: Propriedades) simplesmente NÃO passam por aqui; ver FULL_WIDTH em App.tsx.
 */
export default function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1080px]">{children}</div>;
}
