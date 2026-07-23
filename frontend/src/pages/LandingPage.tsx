import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Droplets,
  FolderKanban,
  LandPlot,
  Leaf,
  PackageOpen,
  Sprout,
  TreePine,
  Trees,
  WalletCards,
  type RemixiconComponentType,
} from '../icons';
import { CARD, CARD_ELEVATION } from '../components/Card';
import PublicHeader, { PUBLIC_CONTAINER } from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import LoginDialog from '../components/public/LoginDialog';
import { ResultStat } from '../components/public/Metric';
import { useBranding } from '../branding/BrandingContext';
import { FOTO_PLANTIO, HERO_RIO } from '../branding/assets';
import { getKey } from '../lib/auth';
import { formatNumber } from '../lib/format';
import { RECURSO_TOTAL_REAIS, projectedCo2 } from '../lib/program';
import { EASE, riseIn, stagger } from '../lib/motion';
import { useGetPublicPortalQuery } from '../services/gestaguaApi';

/**
 * Página pública de apresentação do programa. Não exige chave: consome apenas
 * o GET /publico/portal (agregados curados) e leva pro portal de resultados,
 * que é onde os números aparecem por inteiro.
 */

/** Botão sólido da marca (mesma receita do login). */
const CTA_SOLID =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-brand px-6 py-3 font-semibold text-on-brand transition-colors hover:bg-brand-deep';

/** Card de eixo de atuação (modalidades do Decreto 14.210/2026). */
function PillarCard({
  icon: Icon,
  badge,
  title,
  text,
}: {
  icon: RemixiconComponentType;
  badge: string;
  title: string;
  text: string;
}) {
  return (
    <motion.div variants={riseIn} whileHover={{ y: -4 }} className={`p-5 ${CARD} ${CARD_ELEVATION}`}>
      <span className="mb-4 inline-flex text-accent">
        <Icon size={22} />
      </span>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70">
        {badge}
      </div>
      <h3 className="mt-1 font-display text-[15.5px] font-semibold leading-snug">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{text}</p>
    </motion.div>
  );
}

/**
 * Vinheta do hero: o símbolo do programa ao centro e anéis que emanam dele em
 * loop, como a ondulação de uma gota na água. Com preferência por menos
 * movimento no sistema operacional, os anéis ficam parados.
 */
function Ripples({ logoUrl }: { logoUrl: string | null }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-[4%] top-1/2 hidden -translate-y-1/2 lg:block"
    >
      <div className="relative grid h-[380px] w-[380px] place-items-center">
        {reduceMotion
          ? [360, 265, 175].map((size) => (
              <div
                key={size}
                className="absolute rounded-full border border-accent/20"
                style={{ width: size, height: size }}
              />
            ))
          : [0, 1, 2].map((ring) => (
              <motion.div
                key={ring}
                className="absolute h-[180px] w-[180px] rounded-full border border-accent/30"
                animate={{ scale: [1, 2.05], opacity: [0, 0.8, 0] }}
                transition={{
                  duration: 6,
                  times: [0, 0.3, 1],
                  ease: 'easeOut',
                  repeat: Infinity,
                  delay: 0.6 + ring * 2,
                }}
              />
            ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
        >
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-[120px]" />
            ) : (
              <Droplets size={52} className="text-accent" />
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * `autoOpenLogin` atende a rota /login: em vez de uma tela de login própria, a
 * landing abre o modal de acesso por cima. Assim existe um caminho só pra
 * entrar, e links diretos pra /login continuam funcionando.
 */
export default function LandingPage({ autoOpenLogin = false }: { autoOpenLogin?: boolean }) {
  const { branding } = useBranding();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetPublicPortalQuery({});
  const [loginOpen, setLoginOpen] = useState(autoOpenLogin && !getKey());

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-60px' });

  const summary = data?.summary;
  // mesmos indicadores da Visão Geral e do portal: área planejada e CO₂
  const plannedAreaHa = data?.restoration?.plannedAreaHa ?? null;
  const co2Projected = plannedAreaHa === null ? null : projectedCo2(plannedAreaHa);

  // já autenticado e caiu em /login: vai direto pro painel
  useEffect(() => {
    if (autoOpenLogin && getKey()) navigate('/visao-geral', { replace: true });
  }, [autoOpenLogin, navigate]);

  return (
    <div className="brand-scroll h-full overflow-y-auto">
      <PublicHeader
        action={
          <button
            onClick={() => navigate('/resultados')}
            className="cursor-pointer rounded-[10px] px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
          >
            Ver resultados
          </button>
        }
      />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* hero: foto da Mata Atlântica sob um véu chapado da marca (cor sólida
          com opacidade, nunca gradiente) pra o texto branco ficar legível */}
      <section className="relative overflow-hidden">
        <img
          src={HERO_RIO}
          alt=""
          aria-hidden
          // ancora na base: a água fica embaixo na foto, então mostra o rio em
          // vez de cortar pra mata do topo
          className="absolute inset-0 h-full w-full object-cover object-bottom"
        />
        <div aria-hidden className="absolute inset-0 bg-brand/85" />
        <Ripples logoUrl={branding.logoUrl} />
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className={`${PUBLIC_CONTAINER} relative pb-28 pt-16 md:pb-32 md:pt-24`}
        >
          <motion.div
            variants={riseIn}
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-brand/55"
          >
            Programa Municipal de Pagamento por Serviços Ambientais
          </motion.div>
          <motion.h1
            variants={riseIn}
            className="max-w-[640px] font-display text-[38px] font-semibold leading-[1.1] text-on-brand md:text-[48px]"
          >
            Cuidar da água é cuidar da vida.
          </motion.h1>
          <motion.p
            variants={riseIn}
            className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-on-brand/80"
          >
            O {branding.productName} transforma a preservação ambiental em geração de renda para as
            famílias rurais de Alegre: remunera quem protege nascentes e vegetação nativa, recupera
            áreas degradadas e mantém a água no território. Os resultados ficam reunidos aqui, de
            forma aberta e atualizada.
          </motion.p>
          <motion.div variants={riseIn} className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/resultados')}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-on-brand px-6 py-3 font-semibold text-brand transition-colors hover:bg-on-brand/90"
            >
              Conhecer os resultados
              <ChevronRight size={17} />
            </button>
            <a
              href="#resultados"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-on-brand/40 px-5 py-[10.5px] text-sm font-semibold text-on-brand transition-colors hover:bg-on-brand/10"
            >
              Ver os números principais
            </a>
          </motion.div>
        </motion.div>

        {/* onda na base suaviza a passagem do hero escuro pro fundo claro. É uma
            forma sólida (fill da cor paper), não gradiente, e ecoa o tema água. */}
        <svg
          aria-hidden
          preserveAspectRatio="none"
          viewBox="0 0 1440 80"
          className="absolute inset-x-0 bottom-0 h-[64px] w-full md:h-[80px]"
        >
          <path
            d="M0,52 C360,86 1080,18 1440,52 L1440,80 L0,80 Z"
            fill="var(--color-paper)"
          />
        </svg>
      </section>

      {/* vitrine de resultados */}
      <section id="resultados" className="scroll-mt-20">
        <div className={PUBLIC_CONTAINER}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`${CARD} px-6 py-12 md:px-14`}
          >
            <div className="mx-auto max-w-[640px] text-center">
              <h2 className="font-display text-[27px] font-semibold leading-tight text-brand-deep">
                Explore o Painel de Resultados
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
                Consulte o portal completo, com dados de projetos, propriedades, modalidades e
                impacto ambiental do programa, de forma transparente e sempre atualizada.
              </p>
            </div>

            <motion.div
              ref={statsRef}
              variants={stagger}
              initial="hidden"
              animate={statsInView ? 'show' : 'hidden'}
              className="mx-auto mt-9 grid max-w-[860px] grid-cols-2 gap-3.5 lg:grid-cols-4"
            >
              <ResultStat
                icon={FolderKanban}
                value={summary?.activeProjects ?? null}
                label="Projetos ativos"
                started={statsInView}
                loading={isLoading}
              />
              <ResultStat
                icon={LandPlot}
                value={plannedAreaHa}
                suffix="ha"
                label="Área planejada"
                started={statsInView}
                loading={isLoading}
              />
              <ResultStat
                icon={WalletCards}
                value={RECURSO_TOTAL_REAIS}
                prefix="R$"
                label="Recurso total"
                started={statsInView}
                loading={isLoading}
              />
              <ResultStat
                icon={Leaf}
                value={co2Projected}
                suffix="tCO₂e"
                label="CO₂ projetado"
                started={statsInView}
                loading={isLoading}
              />
            </motion.div>

            <div className="mx-auto mt-8 max-w-[520px] text-center text-[12.5px] leading-relaxed text-ink-soft">
              {error ? (
                <>
                  Não consegui carregar os números agora.{' '}
                  <button
                    onClick={() => void refetch()}
                    className="cursor-pointer font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    Tentar de novo
                  </button>
                </>
              ) : (
                <>
                  Números dos projetos em execução. Cancelados e arquivados ficam de fora do
                  cálculo.
                </>
              )}
            </div>

            <div className="mt-9 text-center">
              <button onClick={() => navigate('/resultados')} className={CTA_SOLID}>
                Acessar Todos os Resultados
                <ChevronRight size={17} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* eixos de atuação */}
      <section className={`${PUBLIC_CONTAINER} mt-20`}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
          Modalidades
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <h2 className="font-display text-[27px] font-semibold leading-tight text-brand-deep">
            Como o programa atua
          </h2>
          {summary && (
            <span className="text-[12.5px] text-ink-soft">
              {formatNumber(summary.totalImplementations)} implantações registradas
            </span>
          )}
        </div>
        <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed text-ink-soft">
          As modalidades seguem o Decreto 14.210/2026 e combinam conservação, restauração e
          produção sustentável dentro das propriedades participantes.
        </p>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <PillarCard
            icon={TreePine}
            badge="Grupo A · Conservacionista"
            title="Florestal em Pé"
            text="Reconhece a floresta conservada dentro da propriedade, incluindo áreas de preservação permanente já protegidas."
          />
          <PillarCard
            icon={Sprout}
            badge="Grupo B · Restauração"
            title="Restauração de APP"
            text="Recupera áreas de preservação por regeneração natural ou plantio de essências nativas."
          />
          <PillarCard
            icon={Trees}
            badge="Grupo C · Produtiva"
            title="Sistemas Agroflorestais"
            text="Produção que convive com a floresta: implantação de SAFs e manejo dos sistemas já consolidados."
          />
          <PillarCard
            icon={PackageOpen}
            badge="Opcional"
            title="Caixas de abelha"
            text="Instalação de caixas que fortalecem a polinização das áreas restauradas e a renda das famílias."
          />
        </motion.div>
      </section>

      {/* faixa temática: foto de plantio sob véu chapado da marca (sem
          gradiente), com o gancho de renda + restauração */}
      <section className="relative mt-20 overflow-hidden">
        <img
          src={FOTO_PLANTIO}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-brand/80" />
        <div className={`${PUBLIC_CONTAINER} relative py-16 text-center`}>
          <p className="mx-auto max-w-[680px] font-display text-[22px] font-semibold leading-snug text-on-brand md:text-[26px]">
            Cada muda plantada e cada nascente protegida vira renda para uma família rural de
            Alegre.
          </p>
        </div>
      </section>

      {/* alinhamento com os ODS da ONU */}
      <section className={`${PUBLIC_CONTAINER} mt-20`}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
          Agenda 2030
        </div>
        <h2 className="font-display text-[27px] font-semibold leading-tight text-brand-deep">
          Alinhado aos Objetivos de Desenvolvimento Sustentável
        </h2>
        <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed text-ink-soft">
          A ação local em Alegre conecta-se às metas globais da ONU para água, clima e
          biodiversidade.
        </p>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-7 grid gap-3.5 sm:grid-cols-3"
        >
          <PillarCard
            icon={Droplets}
            badge="ODS 6"
            title="Água potável e saneamento"
            text="Proteção das nascentes e dos cursos d'água dentro das propriedades participantes."
          />
          <PillarCard
            icon={Sprout}
            badge="ODS 13"
            title="Ação contra a mudança climática"
            text="Mais cobertura florestal e carbono retido nas áreas em recuperação."
          />
          <PillarCard
            icon={TreePine}
            badge="ODS 15"
            title="Vida terrestre"
            text="Restauração de APPs e sistemas agroflorestais que devolvem a mata nativa ao território."
          />
        </motion.div>
      </section>

      <PublicFooter />
    </div>
  );
}
