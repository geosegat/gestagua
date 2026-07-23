import {
  CalendarDays,
  FileText,
  LandPlot,
  Waves,
} from '../icons';
import type { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import ProjectModalitiesSection from '../components/project/ProjectModalitiesSection';
import { formatDate, formatNumber } from '../lib/format';
import type { ProjectRouteContext } from '../types';

const QUESTIONNAIRE_LABELS: Record<string, string> = {
  no: 'Não realizado',
  brief: 'Resumido',
  complete: 'Completo',
};

const OWNERSHIP_LABELS: Record<string, string> = {
  settlement: 'Assentamento',
  association: 'Associação',
  proprietary: 'Proprietário',
  usufruct: 'Usufruto',
  lease_agreement: 'Arrendamento ou comodato',
};

function display(value: ReactNode): ReactNode {
  return value === null || value === undefined || value === '' ? 'Não informado' : value;
}

function InfoField({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft/75">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-[14px] font-medium leading-6 text-ink">
        {display(value)}
      </dd>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
  className = '',
  watermark = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  watermark?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[14px] border border-line bg-card ${className}`}>
      {watermark && (
        <img
          src="/arvo-symbol-green.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-16 w-60 select-none opacity-[0.035] sm:w-72"
        />
      )}
      <header className="relative z-10 flex items-start gap-2.5 border-b border-line/70 px-5 py-4 sm:px-6">
        <span className="mt-0.5 shrink-0 text-brand">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-[16px] font-semibold text-brand-deep">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] leading-5 text-ink-soft">{subtitle}</p>}
        </div>
      </header>
      <div className="relative z-10 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[10px] bg-brand-soft/70 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-brand/65">{label}</div>
      <div className="mt-1 font-display text-[17px] font-semibold text-brand-deep">{display(value)}</div>
    </div>
  );
}

export default function ProjectInformationPage() {
  const { project } = useOutletContext<ProjectRouteContext>();

  const { property, location, currentStage } = project;
  const coordinates =
    location.latitude != null && location.longitude != null
      ? `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`
      : null;
  const locationLabel = [...new Set([location.municipality, location.state].filter(Boolean))].join(' · ');
  const progress = currentStage?.progress ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          icon={<FileText size={18} />}
          title="Dados do projeto"
          subtitle="Identificação e informações contratuais registradas no MVGI."
        >
          <dl className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
            <InfoField label="ID do portal" value={project.portalId} />
            <InfoField label="Número do contrato" value={project.contract} />
            <InfoField label="Emissão do contrato" value={formatDate(project.contractIssueDate)} />
            <InfoField
              label="Assinado na propriedade"
              value={project.contractSigned == null ? null : project.contractSigned ? 'Sim' : 'Não'}
            />
            <InfoField
              label="Questionário"
              value={project.questionnaire ? (QUESTIONNAIRE_LABELS[project.questionnaire] ?? project.questionnaire) : null}
            />
            <InfoField label="Número da revisão" value={project.revisionNumber} />
            <InfoField label="Motivo da revisão" value={project.reasonForRevision} wide />
            <InfoField label="Ação registrada" value={project.action} wide />
          </dl>
        </SectionCard>

        <SectionCard
          icon={<Waves size={18} />}
          title="Etapa atual"
          subtitle="Leitura consolidada do estágio e das atividades deste projeto."
          watermark
        >
          {currentStage ? (
            <>
              <div className="rounded-[12px] border border-brand/10 bg-brand-soft/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand/60">
                      {display(currentStage.macroStage)}
                    </div>
                    <div className="mt-1 font-display text-[18px] font-semibold text-brand-deep">
                      {display(currentStage.name)}
                    </div>
                  </div>
                  <div className="font-display text-[23px] font-semibold text-brand-deep">{progress}%</div>
                </div>
                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-card"
                  role="progressbar"
                  aria-label="Progresso das atividades da etapa atual"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-ink-soft">
                  {currentStage.completedActivities} de {currentStage.totalActivities} atividades concluídas
                </div>
              </div>

              <dl className="mt-5 grid gap-x-7 gap-y-5 sm:grid-cols-2">
                <InfoField label="Duração prevista" value={currentStage.expectedDuration != null ? `${currentStage.expectedDuration} dias` : null} />
                <InfoField label="Duração máxima" value={currentStage.maximumDuration != null ? `${currentStage.maximumDuration} dias` : null} />
                <InfoField label="Descrição" value={currentStage.description} wide />
              </dl>
            </>
          ) : (
            <p className="text-sm text-ink-soft">Este projeto ainda não possui uma etapa associada.</p>
          )}
        </SectionCard>

        <SectionCard
          icon={<LandPlot size={18} />}
          title="Imóvel e localização"
          subtitle="Contexto territorial relacionado ao projeto."
          className="lg:col-span-2"
          watermark
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Área total" value={property.totalAreaHa != null ? `${formatNumber(property.totalAreaHa)} ha` : null} />
            <Metric label="Vegetação nativa" value={property.nativeVegetationAreaHa != null ? `${formatNumber(property.nativeVegetationAreaHa)} ha` : null} />
            <Metric label="Nascentes" value={formatNumber(property.totalSprings)} />
            <Metric label="Módulos fiscais" value={formatNumber(property.fiscalModules)} />
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Propriedade" value={property.name} />
            <InfoField label="Comunidade" value={property.community} />
            <InfoField label="Município / UF" value={locationLabel} />
            <InfoField label="Bacia hidrográfica" value={project.watershed} />
            <InfoField label="Código do imóvel" value={property.code} />
            <InfoField label="Cadastro ambiental rural" value={property.ruralEnvironmentalRegistry} />
            <InfoField label="Natureza da posse" value={property.ownershipNature ? (OWNERSHIP_LABELS[property.ownershipNature] ?? property.ownershipNature) : null} />
            <InfoField label="Coordenadas" value={coordinates} />
            <InfoField label="Rota de acesso" value={property.accessRoute} wide />
          </dl>
        </SectionCard>

        <ProjectModalitiesSection projectId={project.id} />

        <SectionCard
          icon={<CalendarDays size={18} />}
          title="Registro"
          subtitle="Últimas informações gerais disponíveis no espelho."
        >
          <dl className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
            <InfoField label="Última atualização" value={formatDate(project.updatedAt)} />
            <InfoField label="Local de assinatura" value={project.signatureLocation} />
            <InfoField label="Observações" value={project.notes} wide />
          </dl>
        </SectionCard>
    </div>
  );
}
