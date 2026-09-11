import { Download, FileText, Info, LoaderCircle } from '../icons';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ApiErrorBanner from '../components/ApiErrorBanner';
import { getApiErrorMessage } from '../lib/apiError';
import { getKey } from '../lib/auth';
import { formatFileSize } from '../lib/format';
import { useGetProjectProposalQuery } from '../services/gestaguaApi';

function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <div className="text-center text-sm text-ink-soft">
        <div className="mx-auto mb-4 h-5 w-5 animate-pulse rounded-[50%_50%_50%_0] bg-accent [transform:rotate(-45deg)]" />
        Carregando proposta técnica…
      </div>
    </div>
  );
}

/**
 * O arquivo é servido por rota autenticada por `x-api-key`, e um `<a href>`
 * não carrega header — então baixa via fetch e entrega o blob ao navegador.
 */
async function downloadProposal(projectId: string, fileName: string) {
  const baseUrl = import.meta.env.VITE_API_URL ?? '';
  const response = await fetch(
    `${baseUrl}/projetos/${projectId}/proposta-tecnica/arquivo`,
    { headers: { 'x-api-key': getKey() } },
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.erro ?? `falha ao baixar (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // o objeto só pode ser revogado depois do clique, senão o download aborta
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function EmptyState() {
  return (
    <section className="rounded-[14px] border border-dashed border-line bg-card px-5 py-14 text-center">
      <FileText size={24} className="mx-auto text-brand/40" aria-hidden="true" />
      <h2 className="mt-3 font-display text-[15px] font-semibold text-brand-deep">
        Proposta técnica ainda não anexada
      </h2>
      <p className="mx-auto mt-1 max-w-lg text-[11.5px] leading-5 text-ink-soft">
        A proposta assinada aparece aqui depois de ser anexada à atividade
        “Projeto técnico” no MV Gest.
      </p>
    </section>
  );
}

export default function ProjectProposalPage() {
  const { projectId } = useParams();
  const query = useGetProjectProposalQuery(projectId ?? '', { skip: !projectId });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (query.isLoading) return <PageLoading />;

  if (!query.data) {
    return (
      <ApiErrorBanner
        error={
          !projectId
            ? 'projeto não identificado'
            : query.error
              ? getApiErrorMessage(query.error)
              : 'proposta não encontrada'
        }
        onRetry={() => void query.refetch()}
        message="Não foi possível carregar a proposta técnica"
      />
    );
  }

  const proposal = query.data;

  if (!proposal.available) return <EmptyState />;

  const fileName = proposal.fileName ?? 'Proposta Técnica_assinado.pdf';

  async function handleDownload() {
    if (!projectId) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadProposal(projectId, fileName);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'falha ao baixar o arquivo');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[16px] border border-line bg-card">
        <img
          src="/arvo-symbol-green.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -right-20 w-[360px] select-none opacity-[0.035]"
        />

        <header className="relative flex items-start gap-2.5 border-b border-line/70 px-5 py-4 sm:px-6">
          <FileText size={19} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h2 className="font-display text-[16px] font-semibold text-brand-deep">
              Proposta técnica assinada
            </h2>
            <p className="mt-0.5 text-[11.5px] leading-5 text-ink-soft">
              Documento anexado ao projeto no MV Gest.
            </p>
          </div>
        </header>

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
              Arquivo
            </div>
            <p className="mt-2 break-words text-[13px] font-semibold leading-5 text-ink">
              {fileName}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {formatFileSize(proposal.fileSizeBytes)}
              {proposal.mimeType === 'application/pdf' ? ' · PDF' : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!proposal.downloadable || downloading}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-brand px-5 py-3 text-[12px] font-semibold text-on-brand outline-none transition-colors hover:bg-brand-deep focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-brand/40"
          >
            {downloading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                Baixando…
              </>
            ) : (
              <>
                <Download size={16} aria-hidden="true" />
                Baixar
              </>
            )}
          </button>
        </div>
      </section>

      {!proposal.downloadable && (
        <section className="flex items-start gap-2.5 rounded-[10px] border border-line bg-card px-5 py-4">
          <Info size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h3 className="text-[12px] font-semibold text-ink">
              Arquivo indisponível neste ambiente
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              A proposta está registrada no sistema, mas o arquivo em si não está
              acessível a partir deste painel. O espelho sincroniza o banco, não
              os documentos.
            </p>
          </div>
        </section>
      )}

      {downloadError && (
        <ApiErrorBanner
          error={downloadError}
          onRetry={() => void handleDownload()}
          message="Não foi possível baixar a proposta"
        />
      )}
    </div>
  );
}
