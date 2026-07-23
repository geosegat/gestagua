import { motion } from 'framer-motion';
import { AlertTriangle, Leaf, WalletCards } from '../icons';
import { formatCurrency, formatNumber } from '../lib/format';
import {
  modalityClassification,
  modalityPresentation,
} from '../lib/modalities';
import { riseIn } from '../lib/motion';
import type { IndicatorModality, IndicatorsResponse } from '../types';
import { CARD } from './Card';

function AreaValue({
  value,
  filled,
  implementations,
}: {
  value: number;
  filled: number;
  implementations: number;
}) {
  if (implementations === 0) {
    return <span className="text-ink-soft/60">Não se aplica</span>;
  }

  if (filled === 0) {
    return <span className="font-medium text-warn">Não preenchido</span>;
  }

  return <>{formatNumber(value)} ha</>;
}

function ProgressLine({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-soft">
          {formatNumber(value)} de {formatNumber(total)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.7 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function ModalityRows({ modalities }: { modalities: IndicatorModality[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
            <th className="pb-3 pr-5">Modalidade</th>
            <th className="px-3 pb-3 text-right">Implantações</th>
            <th className="px-3 pb-3 text-right">Área planejada</th>
            <th className="px-3 pb-3 text-right">APP planejada</th>
            <th className="pb-3 pl-3 text-right">Área restaurada</th>
          </tr>
        </thead>
        <tbody>
          {modalities.map((modality) => {
            const presentation = modalityPresentation(modality);

            return (
            <tr key={modality.id} className="border-b border-line/65 last:border-0">
              <td className="py-3 pr-5">
                <div className="font-semibold leading-snug text-ink">
                  {presentation.title}
                </div>
                <div
                  className={`mt-0.5 text-[9.5px] uppercase tracking-[0.08em] ${
                    presentation.official ? 'text-brand/70' : 'text-warn'
                  }`}
                >
                  {modalityClassification(presentation)}
                </div>
              </td>
              <td className="px-3 py-3 text-right text-ink-soft">
                {formatNumber(modality.implementations)}
              </td>
              <td className="px-3 py-3 text-right text-ink-soft">
                {formatNumber(modality.plannedAreaHa)} ha
              </td>
              <td className="px-3 py-3 text-right text-ink-soft">
                <AreaValue
                  value={modality.appPlannedAreaHa}
                  filled={modality.appAreaFilled}
                  implementations={modality.implementations}
                />
              </td>
              <td className="py-3 pl-3 text-right text-ink-soft">
                <AreaValue
                  value={modality.restoredAreaHa}
                  filled={modality.restoredAreaFilled}
                  implementations={modality.implementations}
                />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OverviewIndicators({ data }: { data: IndicatorsResponse }) {
  const { land, payments, carbon } = data;

  return (
    <div className="mt-5 space-y-5">
      <motion.section variants={riseIn} initial="hidden" animate="show" className={`p-6 ${CARD}`}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Áreas por modalidade</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              Enquadramento oficial, planejamento, APP e execução dos projetos ativos.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold text-brand">
              {formatNumber(land.plannedAreaHa)} ha
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              planejados no programa
            </div>
          </div>
        </div>

        <ModalityRows modalities={land.byModality} />

        {(land.appAreaCoverage.filled === 0 ||
          land.restoredAreaCoverage.filled === 0) && (
          <div className="mt-4 flex items-start gap-2.5 border-l-2 border-warn pl-3 text-[12px] leading-relaxed text-ink-soft">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-warn" />
            <p>
              APP e área restaurada ainda não foram preenchidas nas{' '}
              {formatNumber(land.totalImplementations)} implantações. Por isso a tabela mostra
              “Não preenchido”, e não 0 ha como resultado confirmado.
            </p>
          </div>
        )}
      </motion.section>

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.section
          variants={riseIn}
          initial="hidden"
          animate="show"
          className={`p-6 ${CARD}`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Registros financeiros</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                Situação encontrada no espelho operacional.
              </p>
            </div>
            <WalletCards size={22} className="shrink-0 text-brand" />
          </div>

          <div className="mb-5 border-l-2 border-accent pl-3 text-[11.5px] leading-relaxed text-ink-soft">
            Regra oficial de 2026: dois repasses de 50%, um após o contrato e outro após a
            aprovação do relatório de monitoramento.
          </div>

          <div className="mb-6 grid grid-cols-2 divide-x divide-line border-y border-line py-4">
            <div className="pr-5">
              <div className="font-display text-[28px] font-semibold leading-none text-ink">
                {formatNumber(payments.executedInstallments)}
              </div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                marcadas como executadas
              </div>
            </div>
            <div className="pl-5">
              <div className="font-display text-[28px] font-semibold leading-none text-ink">
                {formatNumber(payments.paidInstallments)}
              </div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                marcadas como pagas
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ProgressLine
              label="Execução registrada"
              value={payments.executedInstallments}
              total={payments.totalInstallments}
              color="bg-brand"
            />
            <ProgressLine
              label="Pagamento registrado"
              value={payments.paidInstallments}
              total={payments.totalInstallments}
              color="bg-accent"
            />
          </div>

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4 text-[12px]">
            <span className="text-ink-soft">Valor pago registrado</span>
            <span className="font-semibold text-ink">
              {formatCurrency(payments.recordedPaidAmount)}
            </span>
          </div>

          <p className="mt-4 text-[10.5px] leading-relaxed text-warn">
            O banco ainda guarda um cronograma anterior com até cinco parcelas. Estes registros
            não representam, sozinhos, os dois repasses oficiais da edição 2026.
          </p>
        </motion.section>

        <motion.section
          variants={riseIn}
          initial="hidden"
          animate="show"
          className={`p-6 ${CARD}`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Carbono estocado</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                Cobertura do cadastro usado no cálculo.
              </p>
            </div>
            <Leaf size={22} className="shrink-0 text-ok" />
          </div>

          <div className="border-l-2 border-warn pl-4">
            <div className="font-display text-xl font-semibold text-ink">Cálculo pendente</div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              O campo não informa se o fator deve ser aplicado por hectare, planta ou cultura.
              O total ficará indisponível até essa regra ser confirmada.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-line border-y border-line py-4 text-center">
            <div className="px-2">
              <div className="font-display text-xl font-semibold">
                {formatNumber(carbon.coverage.totalLandCultures)}
              </div>
              <div className="mt-1 text-[10px] leading-tight text-ink-soft">implantações</div>
            </div>
            <div className="px-2">
              <div className="font-display text-xl font-semibold text-brand">
                {formatNumber(carbon.coverage.landCulturesWithCarbonData)}
              </div>
              <div className="mt-1 text-[10px] leading-tight text-ink-soft">com algum dado</div>
            </div>
            <div className="px-2">
              <div className="font-display text-xl font-semibold text-ok">
                {formatNumber(carbon.coverage.landCulturesWithPositiveCarbon)}
              </div>
              <div className="mt-1 text-[10px] leading-tight text-ink-soft">
                com valor positivo
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
            Culturas com informação disponível:{' '}
            <span className="font-semibold text-ink">
              {carbon.cultures
                .filter((culture) => culture.storedCarbonRows > 0)
                .map((culture) => culture.name)
                .join(', ') || 'nenhuma'}
            </span>
          </p>
        </motion.section>
      </div>
    </div>
  );
}
