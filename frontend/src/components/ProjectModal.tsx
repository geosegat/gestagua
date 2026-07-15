import type { Project } from '../lib/api';
import { formatDate, formatNumber, mirrorLabel } from '../lib/format';
import StatusBadge from './StatusBadge';

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <div className="mb-[3px] text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </div>
      <div className="text-[14.5px]">{children ?? '—'}</div>
    </div>
  );
}

export default function ProjectModal({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  if (!project) return null;
  const location = project.location;
  const property = project.property;
  const coords =
    location.latitude != null && location.longitude != null
      ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
      : null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(7,51,60,.45)] px-[18px] py-[7vh] backdrop-blur-[3px]"
    >
      <div className="max-h-[84vh] w-full max-w-[600px] animate-rise overflow-auto rounded-[18px] bg-card">
        <div className="relative rounded-t-[18px] bg-brand px-7 py-6 text-on-brand">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 h-8 w-8 cursor-pointer rounded-full border-none bg-on-brand/[.12] text-base text-on-brand"
          >
            ✕
          </button>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-brand/60">
            Projeto
          </div>
          <h3 className="font-display text-2xl font-semibold">
            {project.contract ? `Contrato ${project.contract}` : 'Sem nº de contrato'}
          </h3>
        </div>

        <div className="px-7 pb-[30px] pt-6">
          <div className="grid grid-cols-1 gap-x-[22px] gap-y-3.5 sm:grid-cols-2">
            <Field label="Status" full>
              <StatusBadge status={project.status} />
            </Field>
            <Field label="Propriedade">{property.name}</Field>
            <Field label="Comunidade">{property.community}</Field>
            <Field label="Município">
              {(location.municipality || '—') +
                (location.state ? ` · ${location.state}` : '')}
            </Field>
            <Field label="Bacia hidrográfica">{project.watershed}</Field>
            <Field label="Área total">
              {property.totalAreaHa != null ? `${formatNumber(property.totalAreaHa)} ha` : null}
            </Field>
            <Field label="Vegetação nativa">
              {property.nativeVegetationAreaHa != null
                ? `${formatNumber(property.nativeVegetationAreaHa)} ha`
                : null}
            </Field>
            <Field label="Nascentes">
              {property.totalSprings != null ? String(property.totalSprings) : null}
            </Field>
            <Field label="Coordenadas">{coords}</Field>
            <Field label="Etapa macro">{project.macroStage}</Field>
            <Field label="Etapa atual">{project.stage}</Field>
            <Field label="Contrato emitido em">{formatDate(project.contractIssueDate)}</Field>
            <Field label="Contrato assinado">
              {project.contractSigned === true
                ? 'sim'
                : project.contractSigned === false
                  ? 'não'
                  : null}
            </Field>
            {project.tags && project.tags.length > 0 && (
              <Field label="Tags" full>
                <div className="mt-1 flex flex-wrap gap-[7px]">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-aqua-soft px-[11px] py-1 text-[11.5px] font-semibold text-petrol"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Field>
            )}
            <Field label="Espelho de" full>
              {mirrorLabel(project.dataSource)}
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
