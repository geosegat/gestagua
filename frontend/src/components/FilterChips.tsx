export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Fileira de chips de filtro único (estilo ARVO: pílulas discretas, marca só no
 * selecionado). Usada na barra de filtros do DataTableCard.
 */
export default function FilterChips({
  options,
  selectedValue,
  onChange,
  ariaLabel,
}: {
  options: FilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === selectedValue;
        return (
          <button
            key={option.value || 'todos'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={[
              'cursor-pointer rounded-[6px] border px-3 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-[#e0e2e7] bg-card text-ink-soft hover:border-accent hover:text-brand',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
