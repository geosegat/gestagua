import { CalendarDays } from '../icons';

interface Props {
  years: number[];
  value: number | null;
  onChange: (year: number | null) => void;
}

/**
 * Filtro de ano como controle segmentado. Substituiu o <select> nativo porque
 * o filtro fica em telas de apresentação: com poucos anos de programa, mostrar
 * as opções abertas é mais rápido de ler e de operar do que abrir uma lista.
 * Muitos anos simplesmente quebram linha, sem virar uma lista escondida.
 */
export default function YearFilter({ years, value, onChange }: Props) {
  const options = Array.from(new Set(value === null ? years : [...years, value])).sort(
    (left, right) => right - left,
  );

  const SEGMENT = 'cursor-pointer rounded-[6px] px-3 py-1.5 text-[13px] transition-colors';
  const ACTIVE = 'bg-brand font-semibold text-on-brand';
  const IDLE = 'font-medium text-ink-soft hover:bg-brand-soft hover:text-brand';

  return (
    <div>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Ano de referência
      </span>
      <div
        role="group"
        aria-label="Filtrar por ano"
        className="inline-flex flex-wrap items-center gap-1 rounded-[8px] border border-line bg-card p-1"
      >
        <CalendarDays size={15} className="ml-1.5 mr-1 shrink-0 text-ink-soft" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={`${SEGMENT} ${value === null ? ACTIVE : IDLE}`}
        >
          Todos
        </button>
        {options.map((year) => (
          <button
            key={year}
            type="button"
            aria-pressed={value === year}
            onClick={() => onChange(year)}
            className={`${SEGMENT} ${value === year ? ACTIVE : IDLE}`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
