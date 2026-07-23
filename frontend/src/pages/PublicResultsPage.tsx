import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Droplets,
  Eye,
  FolderKanban,
  LandPlot,
  Leaf,
  MapPin,
  RefreshCw,
  Users,
  WalletCards,
} from '../icons';
import { CARD } from '../components/Card';
import PublicHeader, { PUBLIC_CONTAINER } from '../components/public/PublicHeader';
import { CountUp, ResultStat } from '../components/public/Metric';
import PublicFooter from '../components/public/PublicFooter';
import LoginDialog from '../components/public/LoginDialog';
import YearFilter from '../components/YearFilter';
import { getApiErrorMessage } from '../lib/apiError';
import { getKey } from '../lib/auth';
import { formatCurrency, formatNumber } from '../lib/format';
import { modalityClassification, modalityPresentation } from '../lib/modalities';
import { EASE, riseIn, stagger } from '../lib/motion';
import { useYearFilter } from '../lib/useYearFilter';
import { RECURSO_TOTAL_REAIS, projectedCo2 } from '../lib/program';
import { useGetPublicPortalQuery } from '../services/gestaguaApi';

/**
 * Portal público de resultados: a visão que a prefeitura apresenta. Consome só
 * o GET /publico/portal, que devolve agregados curados. Nenhum nome de
 * produtor, CAR ou coordenada passa por aqui, por construção: a página não tem
 * de onde tirar esses dados.
 */

/** Seção com título, apoio opcional e um badge de contagem à direita. */
function Section({
  kicker,
  title,
  description,
  badge,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={riseIn}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-70px' }}
      className={`${PUBLIC_CONTAINER} mt-14`}
    >
      {kicker && (
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
          {kicker}
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <h2 className="font-display text-[26px] font-semibold leading-tight text-brand-deep">
          {title}
        </h2>
        {badge && <span className="text-[12.5px] text-ink-soft">{badge}</span>}
      </div>
      {description && (
        <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}

interface BarRow {
  key: string;
  label: string;
  hint?: string;
  value: number;
  suffix?: string;
}

/**
 * Lista ranqueada com barra proporcional. Uma cor só (magnitude de uma mesma
 * medida), rótulo e valor sempre visíveis, sem depender de hover pra ler.
 */
function RankedBars({ rows, unit }: { rows: BarRow[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-x-9">
      {rows.map((row, index) => (
        <div key={row.key} title={`${row.label}: ${formatNumber(row.value)}${unit ?? ''}`}>
          <div className="mb-1.5 flex items-start justify-between gap-3 text-[13px]">
            <div className="min-w-0">
              <div className="font-medium leading-snug text-ink">{row.label}</div>
              {row.hint && (
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-soft/70">
                  {row.hint}
                </div>
              )}
            </div>
            <span className="shrink-0 font-semibold text-ink">
              {formatNumber(row.value)}
              {row.suffix && (
                <span className="ml-1 text-[11px] font-medium text-ink-soft">{row.suffix}</span>
              )}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line/50">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(row.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 + index * 0.05 }}
              className="h-full rounded-full bg-accent"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Número de destaque de uma faixa, com rótulo em caixa alta abaixo. */
function BandStat({
  value,
  label,
  hint,
  started,
}: {
  value: number | null;
  label: string;
  hint?: string;
  started: boolean;
}) {
  return (
    <div className="px-5 first:pl-0 last:pr-0">
      <div className="font-display text-[26px] font-semibold leading-none text-brand-deep">
        <CountUp value={value} started={started} />
      </div>
      <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-ink-soft/80">{hint}</div>}
    </div>
  );
}

export default function PublicResultsPage() {
  const { year, setYear } = useYearFilter();
  const { data, isLoading, error, refetch } = useGetPublicPortalQuery({ year });
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  function openLogin() {
    if (getKey()) navigate('/visao-geral');
    else setLoginOpen(true);
  }

  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: '-60px' });
  const bandRef = useRef<HTMLDivElement>(null);
  const bandInView = useInView(bandRef, { once: true, margin: '-60px' });

  const summary = data?.summary;
  const finance = data?.finance;
  const restoration = data?.restoration;
  // mesmos indicadores da Visão Geral: área planejada, recurso total e CO₂
  const plannedAreaHa = restoration?.plannedAreaHa ?? null;
  const co2Projected = plannedAreaHa === null ? null : projectedCo2(plannedAreaHa);
  const errorMessage = error ? getApiErrorMessage(error) : null;

  const modalityRows: BarRow[] =
    data?.modalities
      .filter((modality) => modality.totalImplementations > 0)
      .map((modality) => {
        const presentation = modalityPresentation(modality);
        return {
          key: modality.id,
          label: presentation.shortTitle,
          hint: modalityClassification(presentation),
          value: modality.totalImplementations,
        };
      }) ?? [];

  const communityRows: BarRow[] =
    data?.communities
      .filter((community) => community.totalAreaHa > 0)
      .slice(0, 10)
      .map((community) => ({
        key: community.name,
        label: community.name,
        hint: `${formatNumber(community.properties)} ${
          community.properties === 1 ? 'propriedade' : 'propriedades'
        }`,
        value: community.totalAreaHa,
        suffix: 'ha',
      })) ?? [];

  const evolutionRows: BarRow[] =
    data?.evolution.map((point) => ({
      key: String(point.year),
      label: String(point.year),
      value: point.projects,
    })) ?? [];

  // valor repassado só vira manchete quando o espelho tem o dado; senão a
  // seção mostra a execução das parcelas, que é o que existe de concreto
  const hasPaidAmount = (finance?.recordedPaidAmount ?? 0) > 0;

  return (
    <div className="brand-scroll h-full overflow-y-auto">
      <PublicHeader
        action={
          <button
            onClick={openLogin}
            className="cursor-pointer rounded-[10px] px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
          >
            Acesso administrativo
          </button>
        }
      />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* abertura */}
      <section className={`${PUBLIC_CONTAINER} pb-2 pt-12`}>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-wrap items-end justify-between gap-5"
        >
          <div>
            <motion.div
              variants={riseIn}
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60"
            >
              Painel público de resultados
            </motion.div>
            <motion.h1
              variants={riseIn}
              className="max-w-[640px] font-display text-[38px] font-semibold leading-[1.12] text-brand-deep"
            >
              O que o programa entregou até aqui
            </motion.h1>
            <motion.p
              variants={riseIn}
              className="mt-3 max-w-[560px] text-[14.5px] leading-relaxed text-ink-soft"
            >
              Todos os números vêm dos projetos em execução, direto do sistema de gestão do
              programa. Cancelados e arquivados ficam de fora do cálculo.
            </motion.p>
          </div>
          <motion.div variants={riseIn} className="flex flex-wrap items-end gap-4">
            <YearFilter
              years={data?.filters.availableYears ?? []}
              value={year}
              onChange={setYear}
            />
          </motion.div>
        </motion.div>
      </section>

      {errorMessage && (
        <div className={`${PUBLIC_CONTAINER} mt-8`}>
          <div className={`${CARD} px-6 py-10 text-center`}>
            <p className="text-[14px] text-ink">Não consegui carregar os resultados agora.</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{errorMessage}</p>
            <button
              onClick={() => void refetch()}
              className="mt-5 cursor-pointer rounded-[10px] bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-deep"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {/* números de manchete */}
      <section className={`${PUBLIC_CONTAINER} mt-8`}>
        <motion.div
          ref={heroRef}
          variants={stagger}
          initial="hidden"
          animate={heroInView ? 'show' : 'hidden'}
          className="grid grid-cols-2 gap-3.5 lg:grid-cols-4"
        >
          <ResultStat
            icon={FolderKanban}
            value={summary?.activeProjects ?? null}
            label="Projetos ativos"
            started={heroInView}
            loading={isLoading}
          />
          <ResultStat
            icon={LandPlot}
            value={plannedAreaHa}
            suffix="ha"
            label="Área planejada"
            started={heroInView}
            loading={isLoading}
          />
          <ResultStat
            icon={WalletCards}
            value={RECURSO_TOTAL_REAIS}
            prefix="R$"
            label="Recurso total"
            started={heroInView}
            loading={isLoading}
          />
          <ResultStat
            icon={Leaf}
            value={co2Projected}
            suffix="tCO₂e"
            label="CO₂ projetado"
            started={heroInView}
            loading={isLoading}
          />
        </motion.div>
      </section>

      {/* faixa de alcance */}
      {summary && (
        <Section
          kicker="Alcance"
          title="Onde o programa está"
          description="Propriedades rurais participantes e o território que elas somam. Os dados aparecem sempre agregados, sem identificar produtores ou localizações."
        >
          <div
            ref={bandRef}
            className={`${CARD} flex flex-wrap divide-line px-6 py-7 sm:divide-x`}
          >
            <BandStat
              value={summary.activeProperties}
              label="Propriedades atendidas"
              started={bandInView}
            />
            <BandStat
              value={data?.communities.length ?? 0}
              label="Comunidades alcançadas"
              started={bandInView}
            />
            <BandStat
              value={summary.totalSprings}
              label="Nascentes mapeadas"
              started={bandInView}
            />
            <BandStat
              value={restoration?.appAreaHa ?? 0}
              label="Área de APP (ha)"
              hint="Preservação permanente nas áreas dos projetos"
              started={bandInView}
            />
          </div>
        </Section>
      )}

      {/* modalidades */}
      {modalityRows.length > 0 && (
        <Section
          kicker="Modalidades"
          title="Como o programa atua"
          badge={`${formatNumber(summary?.totalImplementations ?? 0)} implantações`}
          description="Nomes e grupos conforme o Decreto 14.210/2026, combinando conservação, restauração e produção sustentável dentro das propriedades participantes."
        >
          <div className={`${CARD} p-6`}>
            <RankedBars rows={modalityRows} />
          </div>
        </Section>
      )}

      {/* comunidades */}
      {communityRows.length > 0 && (
        <Section
          kicker="Território"
          title="Área acompanhada por comunidade"
          badge={
            communityRows.length === 10
              ? '10 maiores'
              : `${formatNumber(communityRows.length)} comunidades`
          }
          description="Soma da área das propriedades participantes em cada comunidade."
        >
          <div className={`${CARD} p-6`}>
            <RankedBars rows={communityRows} unit=" ha" />
          </div>
        </Section>
      )}

      {/* execução financeira */}
      {finance && (
        <Section
          kicker="Execução"
          title="Recursos e parcelas"
          description="O pagamento por serviços ambientais é feito em parcelas ao produtor, conforme a execução das etapas previstas no projeto."
        >
          <div className={`${CARD} p-6`}>
            {hasPaidAmount ? (
              <div className="mb-6 border-b border-line pb-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Recursos repassados aos produtores
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <WalletCards size={26} className="text-accent" />
                  <span className="font-display text-[40px] font-semibold leading-none text-brand-deep">
                    {formatCurrency(finance.recordedPaidAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mb-6 border-b border-line pb-6 text-[13px] leading-relaxed text-ink-soft">
                Os valores repassados ainda não constam nos dados consultados, então esta seção
                mostra a execução das parcelas registrada até agora.
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <div className="font-display text-[24px] font-semibold leading-none text-brand-deep">
                  {formatNumber(finance.totalInstallments)}
                </div>
                <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Parcelas previstas
                </div>
              </div>
              <div>
                <div className="font-display text-[24px] font-semibold leading-none text-brand-deep">
                  {formatNumber(finance.executedInstallments)}
                </div>
                <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Parcelas executadas
                </div>
              </div>
              <div>
                <div className="font-display text-[24px] font-semibold leading-none text-brand-deep">
                  {formatNumber(finance.paidInstallments)}
                </div>
                <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Parcelas pagas
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* evolução: só faz sentido com mais de um ano de histórico */}
      {evolutionRows.length > 1 && (
        <Section
          kicker="Histórico"
          title="Projetos por ano"
          description="Contagem de projetos ativos pelo ano de emissão do contrato, considerando toda a série do programa."
        >
          <div className={`${CARD} p-6`}>
            <RankedBars rows={evolutionRows} />
          </div>
        </Section>
      )}

      {/* transparência */}
      <section className={`${PUBLIC_CONTAINER} mt-16`}>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="grid gap-6 border-y border-line py-8 sm:grid-cols-3"
        >
          {[
            {
              icon: RefreshCw,
              title: 'Atualização diária',
              text: 'Os números refletem o sistema de gestão do programa, atualizados a cada dia.',
            },
            {
              icon: Eye,
              title: 'Somente leitura',
              text: 'Esta página apenas consulta os dados. Nada é alterado a partir daqui.',
            },
            {
              icon: CheckCircle2,
              title: 'Sem dados pessoais',
              text: 'Produtores e propriedades aparecem sempre somados, nunca identificados.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <motion.div key={title} variants={riseIn} className="flex gap-3.5">
              <span className="mt-0.5 inline-flex shrink-0 text-accent">
                <Icon size={19} />
              </span>
              <div>
                <div className="text-[13.5px] font-semibold">{title}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* atalhos de leitura do território, sem sair da página */}
      {summary && (
        <section className={`${PUBLIC_CONTAINER} mt-10`}>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[12.5px] text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <Users size={15} className="text-accent" />
              {formatNumber(summary.activeProperties)} propriedades participantes
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} className="text-accent" />
              {formatNumber(data?.communities.length ?? 0)} comunidades
            </span>
            <span className="inline-flex items-center gap-2">
              <Droplets size={15} className="text-accent" />
              {formatNumber(summary.nativeVegetationAreaHa)} ha de vegetação nativa
            </span>
          </div>
        </section>
      )}

      <PublicFooter onLogin={openLogin} />
    </div>
  );
}
