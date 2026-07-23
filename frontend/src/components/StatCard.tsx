import { animate, motion } from 'framer-motion';
import { Info, type RemixiconComponentType } from '../icons';
import { useEffect, useState } from 'react';
import { formatNumber } from '../lib/format';
import { EASE, riseIn } from '../lib/motion';
import { CARD, CARD_ELEVATION } from './Card';

/** Cor da métrica. Vive somente no traço do ícone, nunca no número. */
export type Tone = 'brand' | 'accent' | 'ok' | 'bad' | 'warn';

const TONES: Record<Tone, string> = {
  brand: 'text-brand',
  accent: 'text-accent',
  ok: 'text-ok',
  bad: 'text-bad',
  warn: 'text-warn',
};

/**
 * Número contando de 0 até o valor. Texto (`10/10`, `-`) passa direto: só
 * contagem tem "de onde" contar.
 */
function AnimatedValue({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const targetValue = typeof value === 'number' ? value : 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number') return;
    const controls = animate(0, targetValue, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, targetValue]);

  if (typeof value !== 'number') return <>{value}</>;
  return (
    <>
      {formatNumber(n)}
      {suffix}
    </>
  );
}

interface Base {
  /** número anima de 0 até o valor; string é exibida como veio */
  value: number | string;
  suffix?: string;
  label: string;
  tone: Tone;
  /** sem ícone o card fica só com número + rótulo */
  icon?: RemixiconComponentType;
}

/**
 * Card de métrica destacada: ícone em cima, número grande, rótulo em caixa
 * alta. Espera um pai com `variants={stagger}` pra entrar em cascata.
 */
export function StatCard({
  icon: Icon,
  value,
  suffix,
  label,
  tone,
  hint,
}: Base & { hint?: string }) {
  return (
    <motion.div variants={riseIn} whileHover={{ y: -4 }} className={`p-5 ${CARD} ${CARD_ELEVATION}`}>
      {(Icon || hint) && (
        <div className="mb-4 flex items-start justify-between">
          {Icon && (
            <span className={`inline-flex ${TONES[tone]}`}>
              <Icon size={23} />
            </span>
          )}
          {hint && (
            <span title={hint} className="ml-auto cursor-help text-ink-soft/40 hover:text-ink-soft">
              <Info size={15} />
            </span>
          )}
        </div>
      )}
      <div className="font-display text-[30px] font-semibold leading-none text-ink">
        <AnimatedValue value={value} suffix={suffix} />
      </div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </div>
    </motion.div>
  );
}

/** Versão compacta: ícone à esquerda, número e rótulo empilhados à direita. */
export function MiniStat({ icon: Icon, value, suffix, label, tone }: Base) {
  return (
    <motion.div
      variants={riseIn}
      whileHover={{ y: -2 }}
      className={`flex items-center gap-3.5 px-4 py-3.5 ${CARD} ${CARD_ELEVATION}`}
    >
      {Icon && (
        <span className={`inline-flex shrink-0 ${TONES[tone]}`}>
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold leading-tight text-ink">
          <AnimatedValue value={value} suffix={suffix} />
        </div>
        <div className="truncate text-[12px] text-ink-soft">{label}</div>
      </div>
    </motion.div>
  );
}
