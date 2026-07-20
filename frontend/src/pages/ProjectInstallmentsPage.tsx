import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ApiErrorBanner from '../components/ApiErrorBanner';
import { getApiErrorMessage } from '../lib/apiError';
import { formatCurrency, formatDate, formatNumber } from '../lib/format';
import { useGetProjectInstallmentsQuery } from '../services/gestaguaApi';
import type { ProducerInstallment, ProducerInstallmentView } from '../types';

type AmountMode = 'total' | 'short' | 'long';

const MODES: Array<{ id: AmountMode; label: string }> = [
  { id: 'total', label: 'Total' },
  { id: 'short', label: 'Curto prazo' },
  { id: 'long', label: 'Longo prazo' },
];

function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <div className="text-center text-sm text-ink-soft">
        <div className="mx-auto mb-4 h-5 w-5 animate-pulse rounded-[50%_50%_50%_0] bg-accent [transform:rotate(-45deg)]" />
        Carregando parcelas do produtor…
      </div>
    </div>
  );
}

function viewLabel(view: ProducerInstallmentView, views: ProducerInstallmentView[]) {
  if (view.kind === 'project') return view.label;

  const duplicates = views.filter(
    (item) => item.kind === 'modality' && item.label === view.label,
  );
  const suffix = duplicates.length > 1
    ? ` · ${duplicates.findIndex((item) => item.id === view.id) + 1}`
    : '';
  const area = view.modality?.areaHa != null
    ? ` · ${formatNumber(view.modality.areaHa)} ha`
    : '';

  return `${view.label}${suffix}${area}`;
}

function expectedAmount(installment: ProducerInstallment, mode: AmountMode): number {
  if (mode === 'short') return installment.shortTermAmount;
  if (mode === 'long') return installment.longTermAmount;
  return installment.totalAmount;
}

function paidAmount(installment: ProducerInstallment, mode: AmountMode): number {
  if (!installment.paidAt) return 0;
  if (mode === 'short') return installment.shortTermAmount;
  if (mode === 'long') return installment.longTermAmount;
  return installment.paidAmount;
}

function getStatus(installment: ProducerInstallment) {
  if (installment.paidAt) {
    return {
      label: 'Paga',
      icon: <CheckCircle2 size={14} aria-hidden="true" />,
      className: 'bg-ok-bg text-ok',
    };
  }

  const due = new Date(installment.recalculatedDate ?? installment.expectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Number.isNaN(due.getTime()) && due.getTime() < today.getTime()) {
    return {
      label: 'Em atraso',
      icon: <AlertTriangle size={14} aria-hidden="true" />,
      className: 'bg-bad-bg text-bad',
    };
  }

  return {
    label: 'Prevista',
    icon: <Clock3 size={14} aria-hidden="true" />,
    className: 'bg-brand-soft text-brand',
  };
}

function FinancialStatement({
  view,
  mode,
  vrteValue,
  onModeChange,
}: {
  view: ProducerInstallmentView;
  mode: AmountMode;
  vrteValue: number;
  onModeChange: (mode: AmountMode) => void;
}) {
  const expected = view.installments.reduce(
    (total, installment) => total + expectedAmount(installment, mode),
    0,
  );
  const paid = view.installments.reduce(
    (total, installment) => total + paidAmount(installment, mode),
    0,
  );
  const pending = Math.max(0, expected - paid);
  const percentage = expected > 0 ? Math.min(100, (paid / expected) * 100) : 0;
  const shortShare = view.summary.totalAmount > 0
    ? (view.summary.shortTermAmount / view.summary.totalAmount) * 100
    : 0;
  const longShare = view.summary.totalAmount > 0
    ? (view.summary.longTermAmount / view.summary.totalAmount) * 100
    : 0;

  return (
    <section className="relative overflow-hidden rounded-[16px] border border-line bg-card">
      <img
        src="/arvo-symbol-green.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -right-20 w-[360px] select-none opacity-[0.035]"
      />

      <header className="relative flex flex-col gap-4 border-b border-line/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-2.5">
          <CircleDollarSign size={19} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h2 className="font-display text-[16px] font-semibold text-brand-deep">Resumo financeiro</h2>
            <p className="mt-0.5 text-[11.5px] leading-5 text-ink-soft">
              Previsão contratual de pagamento ao produtor.
            </p>
          </div>
        </div>

        <div className="flex w-fit rounded-[9px] bg-brand-soft/70 p-1" aria-label="Composição do valor">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              aria-pressed={mode === item.id}
              className={`cursor-pointer rounded-[7px] px-3 py-2 text-[10.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                mode === item.id
                  ? 'bg-card text-brand-deep shadow-sm'
                  : 'bg-transparent text-ink-soft hover:text-brand'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="relative grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)] lg:gap-10">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
            Pago até agora
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[30px] font-semibold tracking-[-0.035em] text-brand-deep sm:text-[36px]">
              {formatCurrency(paid)}
            </span>
            <span className="text-[12px] text-ink-soft">de {formatCurrency(expected)}</span>
          </div>

          <div
            className="mt-5 h-2.5 overflow-hidden rounded-full bg-brand-soft"
            role="progressbar"
            aria-label="Percentual financeiro pago"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percentage)}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line/70 pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft/70">Saldo previsto</dt>
              <dd className="mt-1.5 text-[13px] font-semibold text-ink">{formatCurrency(pending)}</dd>
            </div>
            <div>
              <dt className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft/70">Parcelas pagas</dt>
              <dd className="mt-1.5 text-[13px] font-semibold text-ink">
                {view.summary.paidInstallments} de {view.summary.totalInstallments}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft/70">Próxima previsão</dt>
              <dd className="mt-1.5 text-[13px] font-semibold text-ink">{formatDate(view.summary.nextExpectedDate)}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-line/70 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
            Composição prevista
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="font-semibold text-ink">Curto prazo</span>
                <span className="text-ink-soft">{formatCurrency(view.summary.shortTermAmount)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full rounded-full bg-brand" style={{ width: `${shortShare}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="font-semibold text-ink">Longo prazo</span>
                <span className="text-ink-soft">{formatCurrency(view.summary.longTermAmount)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full rounded-full bg-accent" style={{ width: `${longShare}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-4 text-[10.5px] text-ink-soft">
            <span>VRTE aplicada</span>
            <span className="font-semibold text-ink">{formatCurrency(vrteValue)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function InstallmentTable({ installments }: { installments: ProducerInstallment[] }) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-2.5">
          <CalendarClock size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h2 className="font-display text-[16px] font-semibold text-brand-deep">Cronograma de parcelas</h2>
            <p className="mt-0.5 text-[11.5px] leading-5 text-ink-soft">Datas e valores previstos no contrato.</p>
          </div>
        </div>
        <span className="text-[10.5px] font-semibold text-ink-soft">{installments.length} parcelas</span>
      </header>

      <div className="brand-scroll overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line/70 text-[9.5px] font-semibold uppercase tracking-[0.11em] text-ink-soft/75">
              <th className="w-14 px-5 py-3.5 text-center">Nº</th>
              <th className="px-3 py-3.5">Parcela</th>
              <th className="px-3 py-3.5">Data prevista</th>
              <th className="px-3 py-3.5 text-right">Curto prazo</th>
              <th className="px-3 py-3.5 text-right">Longo prazo</th>
              <th className="px-3 py-3.5 text-right">Total</th>
              <th className="px-5 py-3.5">Situação</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((installment, index) => {
              const status = getStatus(installment);
              return (
                <tr key={installment.id} className="border-b border-line/60 last:border-0 hover:bg-brand-soft/25">
                  <td className="px-5 py-4 text-center font-display text-[15px] font-semibold text-brand/70">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-4">
                    <div className="max-w-[270px] text-[12px] font-semibold leading-5 text-ink">{installment.name}</div>
                    {installment.paidAt && (
                      <div className="mt-1 text-[9.5px] text-ink-soft">Pago em {formatDate(installment.paidAt)}</div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-[11.5px] text-ink-soft">
                    <div className="font-medium text-ink">{formatDate(installment.recalculatedDate ?? installment.expectedDate)}</div>
                    {installment.recalculatedDate && (
                      <div className="mt-1 text-[9.5px]">Original: {formatDate(installment.expectedDate)}</div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right text-[11.5px] tabular-nums text-ink-soft">{formatCurrency(installment.shortTermAmount)}</td>
                  <td className="px-3 py-4 text-right text-[11.5px] tabular-nums text-ink-soft">{formatCurrency(installment.longTermAmount)}</td>
                  <td className="px-3 py-4 text-right text-[12px] font-semibold tabular-nums text-ink">{formatCurrency(installment.totalAmount)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9.5px] font-semibold ${status.className}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ProjectInstallmentsPage() {
  const { projectId } = useParams();
  const query = useGetProjectInstallmentsQuery(projectId ?? '', { skip: !projectId });
  const [selectedViewId, setSelectedViewId] = useState('total');
  const [mode, setMode] = useState<AmountMode>('total');

  useEffect(() => {
    if (!query.data) return;
    if (!query.data.views.some((view) => view.id === selectedViewId)) {
      setSelectedViewId(query.data.views[0]?.id ?? 'total');
    }
  }, [query.data, selectedViewId]);

  const selectedView = useMemo(
    () => query.data?.views.find((view) => view.id === selectedViewId) ?? query.data?.views[0] ?? null,
    [query.data, selectedViewId],
  );

  if (query.isLoading) return <PageLoading />;

  if (!query.data) {
    return (
      <ApiErrorBanner
        error={
          !projectId
            ? 'projeto não identificado'
            : query.error
              ? getApiErrorMessage(query.error)
              : 'parcelas não encontradas'
        }
        onRetry={() => void query.refetch()}
        message="Não foi possível carregar as parcelas"
      />
    );
  }

  const data = query.data;

  if (!selectedView || selectedView.installments.length === 0) {
    return (
      <section className="rounded-[14px] border border-dashed border-line bg-card px-5 py-14 text-center">
        <WalletCards size={24} className="mx-auto text-brand/40" aria-hidden="true" />
        <h2 className="mt-3 font-display text-[15px] font-semibold text-brand-deep">Parcelas ainda não geradas</h2>
        <p className="mx-auto mt-1 max-w-lg text-[11.5px] leading-5 text-ink-soft">
          Este projeto não possui um cronograma financeiro do produtor disponível no espelho atual.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {data.views.length > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-soft/70">Visualização financeira</div>
            <p className="mt-1 text-[11.5px] text-ink-soft">Consulte o total do projeto ou uma modalidade específica.</p>
          </div>
          <label className="flex items-center gap-2 text-[10.5px] font-semibold text-ink-soft">
            Modalidade
            <select
              value={selectedView.id}
              onChange={(event) => setSelectedViewId(event.target.value)}
              className="min-w-[220px] cursor-pointer rounded-[9px] border border-line bg-card px-3 py-2.5 text-[11px] font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-accent/25"
            >
              {data.views.map((view) => (
                <option key={view.id} value={view.id}>{viewLabel(view, data.views)}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <FinancialStatement
        view={selectedView}
        mode={mode}
        vrteValue={data.vrteValue}
        onModeChange={setMode}
      />
      <InstallmentTable installments={selectedView.installments} />
    </div>
  );
}
