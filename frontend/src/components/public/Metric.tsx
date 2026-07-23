import { animate, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { RemixiconComponentType } from '../../icons';
import { formatNumber } from '../../lib/format';
import { EASE, riseIn } from '../../lib/motion';
import { INNER_CARD } from '../Card';

/**
 * Peças de métrica das páginas públicas (landing e portal de resultados).
 * Vivem fora das páginas porque as duas exibem os mesmos tiles e o número
 * precisa se comportar igual nos dois lugares.
 */

/**
 * Número que conta de 0 até o valor quando `started` liga (a seção entrou na
 * viewport). Sem dado (API fora) mostra "n/d" em vez de zero enganoso.
 */
export function CountUp({ value, started }: { value: number | null; started: boolean }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!started || value === null) return;
    const controls = animate(0, value, {
      duration: 1.3,
      ease: EASE,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, started]);

  if (value === null) return <>n/d</>;
  return <>{formatNumber(n)}</>;
}

/** Tile centrado de resultado (ícone e número na mesma linha, rótulo abaixo). */
export function ResultStat({
  icon: Icon,
  value,
  prefix,
  suffix,
  label,
  started,
  loading,
}: {
  icon: RemixiconComponentType;
  value: number | null;
  /** prefixo antes do número (ex.: "R$"); só aparece quando há valor */
  prefix?: string;
  suffix?: string;
  label: string;
  started: boolean;
  loading: boolean;
}) {
  return (
    <motion.div
      variants={riseIn}
      className={`${INNER_CARD} border border-line bg-paper/60 px-4 py-6 text-center`}
    >
      {loading ? (
        <div className="mx-auto h-8 w-24 animate-pulse rounded bg-line/60" />
      ) : (
        <div className="flex items-baseline justify-center gap-2.5">
          <Icon size={21} className="translate-y-[3px] text-accent" />
          <span className="font-display text-[30px] font-semibold leading-none text-brand-deep">
            {prefix && value !== null && (
              <span className="mr-1 text-[19px] text-ink-soft">{prefix}</span>
            )}
            <CountUp value={value} started={started} />
          </span>
          {suffix && value !== null && (
            <span className="text-[15px] font-semibold text-ink-soft">{suffix}</span>
          )}
        </div>
      )}
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </div>
    </motion.div>
  );
}
