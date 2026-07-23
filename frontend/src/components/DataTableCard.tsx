import { ChevronDown, ChevronLeft, ChevronRight, Search, Table2 } from '../icons';
import type { ReactNode } from 'react';
import { formatNumber } from '../lib/format';
import type { PaginatedList } from '../types';

// MODELO do ARVO (medidas), CORES do GestAgua nos ACENTOS (título/números).
// th: padding 6px 24px · td: padding-x 24px + altura fixa 80px · fonte 14px.
const TH = 'px-6 py-1.5 text-left text-[14px] font-medium text-[#4b5563]';
const TD = 'h-20 px-6 align-middle text-[14px]';

// Tons NEUTROS da tabela copiados do ARVO (gray100/200) - o tint petrol deixava
// o cabeçalho "azulado". Marca fica só nos acentos, não nas superfícies.
const BORDER = 'border-[#e0e2e7]'; // bordas de card / busca / seletor (gray200)
const ROW_LINE = 'border-[#f0f2f5]'; // divisórias entre linhas (gray100)

// classes completas (o Tailwind não enxerga strings montadas em runtime)
const HIDE_BELOW = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
} as const;

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** classes extras no <td> desta coluna (ex.: 'font-semibold text-brand') */
  tdClassName?: string;
  /** some com a coluna abaixo do breakpoint */
  hideBelow?: keyof typeof HIDE_BELOW;
}

interface Props<T> {
  title: string;
  placeholder: string;
  emptyMessage: string;
  list: PaginatedList<T>;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** omitido → sem seletor de itens por página (o backend limita em 100) */
  pageSizes?: number[];
  /** barra de filtros entre o cabeçalho e a tabela (chips, dropdowns…) */
  filters?: ReactNode;
  /** linha vira clicável (hover + cursor) quando informado */
  onRowClick?: (row: T) => void;
}

/**
 * Card de listagem no estilo ARVO: cabeçalho branco com busca, faixa de colunas
 * TRANSPARENTE e linhas brancas.
 *
 * O branco vive nos blocos (busca / tbody / rodapé), NUNCA no container - assim
 * o `thead` deixa o fundo da tela atravessar e a faixa lê como um recorte no
 * card, que é o efeito do ARVO. Pintar o `thead` de bg-paper não funciona: o
 * body tem um wash de marca, então a cor chapada nunca casa com o entorno.
 */
export default function DataTableCard<T>({
  title,
  placeholder,
  emptyMessage,
  list,
  columns,
  rowKey,
  pageSizes,
  filters,
  onRowClick,
}: Props<T>) {
  const { items, loading, page, totalPages, total, itemsPerPage } = list;

  return (
    <div className={`animate-rise overflow-hidden rounded-[8px] border ${BORDER}`}>
      {/* ícone + título + busca - SEMPRE na mesma linha (como o ARVO, sem
          flex-wrap): título à esquerda, busca à direita */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 sm:gap-4">
        <div className="flex shrink-0 items-center gap-2 text-brand-deep">
          <Table2 size={22} />
          <span className="font-display text-[16px] font-semibold">{title}</span>
        </div>

        {/* SearchContainer: borda 1px, radius 4px, padding 12px, input 220px/16px
            (16px é proposital - abaixo disso o Safari iOS dá zoom ao focar) */}
        <div
          className={`flex w-full items-center gap-2 rounded-[4px] border bg-card p-3 sm:w-auto sm:shrink-0 ${BORDER}`}
        >
          <Search size={18} className="text-ink-soft" />
          <input
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full border-none bg-transparent text-[16px] outline-none placeholder:text-ink-soft/70 sm:w-[220px]"
          />
        </div>
      </div>

      {/* faixa de filtros (só quem passa `filters` ganha a barra + divisória) */}
      {filters && (
        <div className={`border-t bg-card px-4 py-3 ${ROW_LINE}`}>{filters}</div>
      )}

      {loading && (
        <div className="bg-card px-5 py-[50px] text-center text-sm text-ink-soft">
          <div
            className="mx-auto mb-3 h-3.5 w-3.5 rounded-[50%_50%_50%_0] bg-aqua"
            style={{ transform: 'rotate(-45deg)', animation: 'drip 1s ease-in-out infinite' }}
          />
          consultando a API...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-card px-5 py-[50px] text-center text-sm text-ink-soft">
          {emptyMessage}
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          {/* mobile (< sm): cards empilhados - sem colunas lado a lado, sem
              rolagem lateral. Mostra TODAS as colunas (ignora hideBelow, que
              só faz sentido pra tabela) já que espaço vertical é barato.
              <ul>/<li> + <dl>/<dt>/<dd> no lugar de <div>s soltos: mantém
              pra leitor de tela a mesma ideia de "lista de registros, cada
              um com pares campo/valor" que a <table> dava antes (o preflight
              do Tailwind zera list-style, e o Safari/VoiceOver historicamente
              lê isso como perda de papel de lista - daí o role="list" explícito). */}
          <ul role="list" className={`divide-y bg-card ${ROW_LINE} sm:hidden`}>
            {items.map((row) => (
              <li
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={[
                  'px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                  onRowClick ? 'cursor-pointer transition-colors active:bg-accent-soft/50' : '',
                ].join(' ')}
              >
                <dl>
                  {columns.map((column) => {
                    // tdClassName foi pensado pra célula de tabela de altura fixa -
                    // "whitespace-nowrap" ali evita quebra de linha estranha numa
                    // linha de 80px. No card empilhado não existe essa restrição de
                    // altura, então nowrap só serve pra vazar texto comprido por
                    // cima do label ao lado; tiramos essa classe aqui e deixamos
                    // quebrar linha normalmente (sem perder dado, sem estourar).
                    const mobileValueClass = (column.tdClassName ?? '').replace(
                      /\bwhitespace-nowrap\b/g,
                      '',
                    );
                    return (
                      <div
                        key={column.header}
                        className="flex items-baseline justify-between gap-3 py-1 text-[13.5px]"
                      >
                        <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">
                          {column.header}
                        </dt>
                        <dd className={`min-w-0 text-right ${mobileValueClass}`}>
                          {column.cell(row)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </li>
            ))}
          </ul>

          {/* sm e acima: tabela tradicional */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.header}
                      className={`${TH} ${column.hideBelow ? HIDE_BELOW[column.hideBelow] : ''}`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card">
                {items.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={[
                      `border-b outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${ROW_LINE} last:border-b-0`,
                      onRowClick ? 'cursor-pointer transition-colors hover:bg-accent-soft/50' : '',
                    ].join(' ')}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.header}
                        className={`${TD} ${column.tdClassName ?? ''} ${column.hideBelow ? HIDE_BELOW[column.hideBelow] : ''}`}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* rodapé de paginação (padding 12px 16px, como o ARVO) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          {pageSizes && (
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => list.setItemsPerPage(Number(e.target.value))}
                aria-label="Itens por página"
                className={`cursor-pointer appearance-none rounded-[4px] border bg-card py-1.5 pl-3 pr-8 text-[14px] text-ink outline-none transition-colors focus:border-accent ${BORDER}`}
              >
                {pageSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft"
              />
            </div>
          )}
          <span className="text-[14px] font-semibold text-ink-soft">
            {items.length} de {formatNumber(total)} itens
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-ink-soft">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => list.goToPage(page - 1)}
            disabled={page <= 1}
            className="flex cursor-pointer items-center bg-transparent text-ink-soft transition-colors hover:text-brand disabled:cursor-default disabled:opacity-30 disabled:hover:text-ink-soft"
            aria-label="Página anterior"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => list.goToPage(page + 1)}
            disabled={page >= totalPages || total === 0}
            className="flex cursor-pointer items-center bg-transparent text-ink-soft transition-colors hover:text-brand disabled:cursor-default disabled:opacity-30 disabled:hover:text-ink-soft"
            aria-label="Próxima página"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
