import type { ReactNode } from 'react';
import { LandPlot, Layers3, MapPin, Sprout } from '../../icons';
import { getApiErrorMessage } from '../../lib/apiError';
import { modalityPresentation } from '../../lib/modalities';
import {
  formatSicarNumber,
  sicarStatusLabel,
  sicarStatusTone,
  sicarTipoLabel,
  type SicarTone,
} from '../../lib/sicar';
import { useGetImovelQuery } from '../../services/geoApi';
import { useGetPropertyByCarQuery } from '../../services/gestaguaApi';
import { CARD } from '../Card';

/**
 * Card "Dados do Imóvel": a ficha do CAR (SICAR, via geo-api) somada ao que o
 * Gestágua sabe sobre esse código - a propriedade vinculada e as MODALIDADES
 * implantadas nela.
 *
 * As duas fontes são independentes de propósito: um CAR pode existir no SICAR
 * sem estar no programa (mostra o aviso de sem vínculo) e uma propriedade do
 * programa pode ter CAR que o SICAR não devolve (mostra o vínculo mesmo assim).
 */

const TONE_BADGE: Record<SicarTone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  bad: 'bg-bad-bg text-bad',
  neutral: 'bg-line/60 text-ink-soft',
};

const LABEL = 'text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-soft';

function Field({
  label,
  children,
  divider = false,
}: {
  label: string;
  children: ReactNode;
  /** linha acima do campo, pra separar os blocos como no card do ARVO */
  divider?: boolean;
}) {
  return (
    <div className={divider ? 'border-t border-line/70 pt-3.5' : ''}>
      <div className={LABEL}>{label}</div>
      <div className="mt-1 text-[13.5px] text-ink">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className={`h-full p-5 ${CARD}`}>
      <div className="h-4 w-32 animate-pulse rounded bg-line/60" />
      <div className="mt-5 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <div className="h-2.5 w-20 animate-pulse rounded bg-line/50" />
            <div className="mt-2 h-3.5 w-40 animate-pulse rounded bg-line/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PropertyDataCard({ car }: { car: string | null }) {
  const skip = !car;
  const imovel = useGetImovelQuery(car ?? '', { skip });
  const link = useGetPropertyByCarQuery(car ?? '', { skip });

  if (!car) {
    return (
      <div className={`grid h-full place-items-center p-8 text-center ${CARD}`}>
        <div>
          <LandPlot size={22} className="mx-auto text-ink-soft/60" />
          <p className="mt-2 text-[12.5px] text-ink-soft">
            Selecione uma propriedade pra ver os dados do imóvel.
          </p>
        </div>
      </div>
    );
  }

  if (imovel.isLoading && link.isLoading) return <Skeleton />;

  const sicar = imovel.data ?? null;
  const linked = link.data?.linked ?? false;
  const property = link.data?.property ?? null;
  const modalities = link.data?.modalities ?? [];

  const municipality = sicar?.municipio ?? property?.location.municipality ?? null;
  const state = sicar?.cod_estado ?? property?.location.state ?? null;
  const place =
    municipality && state
      ? `${municipality} — ${state}`
      : municipality || state || 'Não informado';

  const statusTone = sicarStatusTone(sicar?.ind_status);

  return (
    <div className={`brand-scroll h-full overflow-y-auto p-5 ${CARD}`}>
      <h2 className="font-display text-[15px] font-semibold text-brand-deep">
        Dados do Imóvel
      </h2>

      <div className="mt-4 space-y-3.5">
        <Field label="Código CAR">
          <span className="break-all font-mono text-[12px] text-ink-soft">{car}</span>
        </Field>

        <Field label="Município / Estado">{place}</Field>

        <Field label="Área do imóvel" divider>
          {formatSicarNumber(sicar?.num_area ?? property?.totalAreaHa ?? null, 'ha')}
        </Field>

        <Field label="Módulos fiscais">{formatSicarNumber(sicar?.mod_fiscal)}</Field>

        <Field label="Tipo" divider>
          <span className="font-medium text-accent">{sicarTipoLabel(sicar?.ind_tipo)}</span>
        </Field>

        <Field label="Status">
          <span
            className={`inline-block rounded-full px-3 py-1 text-[11.5px] font-semibold ${TONE_BADGE[statusTone]}`}
          >
            {sicarStatusLabel(sicar?.ind_status)}
          </span>
        </Field>

        <Field label="Situação">{sicar?.des_condic || 'Não informado'}</Field>

        {/* o que o ARVO não mostra: as modalidades implantadas na propriedade */}
        <Field label="Modalidade" divider>
          {link.isFetching && modalities.length === 0 ? (
            <span className="text-ink-soft">carregando…</span>
          ) : modalities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {modalities.map((modality) => {
                const presentation = modalityPresentation(modality);
                return (
                  <span
                    key={modality.id}
                    title={`${presentation.title}${
                      modality.totalImplantations > 1
                        ? ` · ${modality.totalImplantations} implantações`
                        : ''
                    }`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11.5px] font-semibold text-brand-deep"
                  >
                    <Sprout size={12} className="shrink-0 text-brand" aria-hidden="true" />
                    {presentation.shortTitle}
                    {modality.totalImplantations > 1 && (
                      <span className="font-normal text-ink-soft">
                        ×{modality.totalImplantations}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-line/50 px-2.5 py-1 text-[11.5px] text-ink-soft">
              <Layers3 size={12} className="shrink-0" aria-hidden="true" />
              Sem modalidade implantada
            </span>
          )}
        </Field>

        <Field label="Vínculo no Gestágua" divider>
          {linked && property ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11.5px] font-semibold text-brand-deep">
                <MapPin size={12} className="shrink-0 text-brand" aria-hidden="true" />
                {property.name || 'Propriedade sem nome'}
              </span>
              <p className="mt-2 text-[12px] text-ink-soft">
                {[
                  property.producer
                    ? `Produtor: ${property.producer}`
                    : 'Nenhum produtor vinculado a esta propriedade',
                  property.totalProjects > 0
                    ? `${property.totalProjects} projeto${
                        property.totalProjects > 1 ? 's' : ''
                      } no programa`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-line/50 px-2.5 py-1 text-[11.5px] text-ink-soft">
                Sem vínculo
              </span>
              <p className="mt-2 text-[12px] text-accent">
                Nenhuma propriedade do programa está vinculada a este CAR.
              </p>
            </>
          )}
        </Field>
      </div>

      {/* falhas parciais: o card segue de pé com a fonte que respondeu */}
      {imovel.error && (
        <p className="mt-4 border-t border-line/70 pt-3 text-[11.5px] text-warn">
          Cadastro do SICAR indisponível ({getApiErrorMessage(imovel.error)}).
        </p>
      )}
      {link.error && (
        <p className="mt-2 text-[11.5px] text-warn">
          Não consegui checar o vínculo no programa ({getApiErrorMessage(link.error)}).
        </p>
      )}
    </div>
  );
}
