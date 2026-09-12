import { Download, Eye, EyeOff, FileText, Info, LoaderCircle } from '../icons';
import { useEffect, useState } from 'react';
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
 * O arquivo é servido por rota autenticada por `x-api-key`, e nem `<a href>`
 * nem `<iframe src>` carregam header — então baixar e visualizar passam pelo
 * mesmo fetch, e o que muda é só o destino do blob.
 */
async function fetchProposalBlob(projectId: string): Promise<Blob> {
  const baseUrl = import.meta.env.VITE_API_URL ?? '';
  const response = await fetch(
    `${baseUrl}/projetos/${projectId}/proposta-tecnica/arquivo`,
    { headers: { 'x-api-key': getKey() } },
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.erro ?? `falha ao obter o arquivo (HTTP ${response.status})`);
  }

  return response.blob();
}

async function downloadProposal(projectId: string, fileName: string) {
  const url = URL.createObjectURL(await fetchProposalBlob(projectId));
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // o blob fica na memória do navegador até ser revogado; sair da aba sem
  // revogar vaza o PDF inteiro
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  async function handlePreview() {
    if (!projectId) return;

    // já aberto: fecha e devolve a memória
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    setLoadingPreview(true);
    setDownloadError(null);
    try {
      const blob = await fetchProposalBlob(projectId);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'falha ao abrir o arquivo');
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* overflow-clip, não overflow-hidden: o símbolo decorativo extravasa 80px
          à direita, e "hidden" esconde mas deixa o card rolável — ao focar um
          botão o navegador rolava o card e o conteúdo saía do lugar */}
      <section className="relative overflow-clip rounded-[16px] border border-line bg-card">
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

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={!proposal.downloadable || loadingPreview}
              aria-expanded={previewUrl !== null}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-brand/25 bg-transparent px-5 py-3 text-[12px] font-semibold text-brand outline-none transition-colors hover:bg-brand-soft/60 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:border-line disabled:text-ink-soft/50"
            >
              {loadingPreview ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                  Abrindo…
                </>
              ) : previewUrl ? (
                <>
                  <EyeOff size={16} aria-hidden="true" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye size={16} aria-hidden="true" />
                  Visualizar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!proposal.downloadable || downloading}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-brand px-5 py-3 text-[12px] font-semibold text-on-brand outline-none transition-colors hover:bg-brand-deep focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-brand/40"
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
        </div>

      </section>

      {/* fora do card: o card é flex com overflow-hidden, e o iframe dentro
          dele empurrava a linha de botões para fora da área visível */}
      {previewUrl && (
        <section className="overflow-hidden rounded-[14px] border border-line bg-card p-3 sm:p-4">
          <iframe
            src={previewUrl}
            title={`Visualização de ${fileName}`}
            className="block h-[70vh] min-h-[420px] w-full rounded-[10px] border border-line bg-paper"
          />
          <p className="mt-2.5 text-center text-[10.5px] text-ink-soft">
            Não consegue ver o documento? Alguns navegadores de celular não
            exibem PDF na página — use o botão Baixar.
          </p>
        </section>
      )}

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
