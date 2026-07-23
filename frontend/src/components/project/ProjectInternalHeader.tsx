import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  MapPin,
  UserRound,
} from '../../icons';
import { NavLink, useNavigate } from 'react-router-dom';
import type { ProjectDetail } from '../../types';
import StatusBadge from '../StatusBadge';

const TABS = [
  { key: 'project', label: 'Projeto', path: 'informacoes' },
  { key: 'activities', label: 'Etapas e atividades', path: 'atividades' },
  { key: 'installments', label: 'Parcelas do produtor', path: 'parcelas-produtor' },
] as const;

function valueOrDash(value: string | null | undefined): string {
  return value?.trim() || 'Não informado';
}

export default function ProjectInternalHeader({
  project,
  activeTab,
}: {
  project: ProjectDetail;
  activeTab: (typeof TABS)[number]['key'];
}) {
  const navigate = useNavigate();
  const locationLabel = [...new Set([project.location.municipality, project.location.state].filter(Boolean))].join(' · ');

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/projetos')}
        className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-[6px] bg-transparent px-1 py-2 text-sm font-semibold text-brand outline-none transition-colors hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={17} /> Voltar para projetos
      </button>

      <header className="relative overflow-hidden rounded-[18px] bg-brand-deep px-5 py-6 text-on-brand sm:px-8 sm:py-8">
        <img
          src="/arvo-symbol-beige.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-8 w-72 select-none opacity-[0.08] sm:-right-20 sm:-top-24 sm:w-[430px]"
        />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-on-brand/10 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-on-brand/80">
              Somente leitura
            </span>
            <StatusBadge status={project.status} />
          </div>

          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-brand/55">
              Projeto · dados sincronizados diariamente
            </p>
            <h1 className="mt-2 font-display text-[27px] font-semibold leading-tight sm:text-[36px]">
              {project.property.name || 'Projeto sem nome de propriedade'}
            </h1>
            <p className="mt-2 text-[13px] text-on-brand/70 sm:text-sm">
              {project.contract ? `Contrato ${project.contract}` : 'Contrato ainda não informado'}
            </p>
          </div>

          <dl className="mt-7 grid gap-x-6 gap-y-4 border-t border-on-brand/15 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <UserRound size={16} />, label: 'Proprietário', value: project.producer?.name },
              { icon: <MapPin size={16} />, label: 'Localização', value: locationLabel },
              { icon: <Building2 size={16} />, label: 'Programa', value: project.program.name },
              { icon: <ClipboardCheck size={16} />, label: 'Responsável técnico', value: project.responsible?.name },
            ].map((item) => (
              <div key={item.label} className="flex gap-3">
                <span className="mt-0.5 text-accent">{item.icon}</span>
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-brand/45">
                    {item.label}
                  </dt>
                  <dd className="mt-1 truncate text-[13px] font-medium text-on-brand/90">
                    {valueOrDash(item.value)}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <nav aria-label="Seções do projeto" className="brand-scroll my-5 overflow-x-auto border-b border-line">
        <div className="flex min-w-max items-end gap-6 px-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={`/projetos/${project.id}/${tab.path}`}
              end
              aria-current={activeTab === tab.key ? 'page' : undefined}
              className={`border-b-2 pb-3 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                activeTab === tab.key
                  ? 'border-accent text-brand-deep'
                  : 'border-transparent text-ink-soft hover:text-brand'
              }`}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
