import { RefreshCw } from 'lucide-react';
import { INNER_CARD, RADIUS } from './Card';

/** Banner de falha de rede com botão de retry, acima do conteúdo da tela. */
export default function ApiErrorBanner({
  error,
  onRetry,
  message = 'Não consegui falar com a API',
}: {
  error: string;
  onRetry: () => void;
  /** o texto antes do ':' — cada tela nomeia o que ela tentou fazer */
  message?: string;
}) {
  return (
    <section
      className={`animate-rise mb-5 flex items-center justify-between gap-4 border border-bad/30 bg-bad-bg px-5 py-4 ${RADIUS}`}
    >
      <p className="text-[13.5px] text-bad">
        {message}: {error}
      </p>
      <button
        onClick={onRetry}
        className={`inline-flex shrink-0 cursor-pointer items-center gap-2 bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand hover:bg-brand-deep ${INNER_CARD}`}
      >
        <RefreshCw size={14} /> Tentar de novo
      </button>
    </section>
  );
}
