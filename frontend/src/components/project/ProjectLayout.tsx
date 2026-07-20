import { ArrowLeft } from 'lucide-react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../lib/apiError';
import { useGetProjectQuery } from '../../services/gestaguaApi';
import type { ProjectRouteContext } from '../../types';
import ApiErrorBanner from '../ApiErrorBanner';
import ProjectInternalHeader from './ProjectInternalHeader';

function ProjectLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center" role="status">
      <div className="text-center text-sm text-ink-soft">
        <div className="mx-auto mb-4 h-5 w-5 animate-pulse rounded-[50%_50%_50%_0] bg-accent [transform:rotate(-45deg)]" />
        Carregando informações do projeto…
      </div>
    </div>
  );
}

export default function ProjectLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectQuery = useGetProjectQuery(projectId ?? '', { skip: !projectId });

  if (projectQuery.isLoading) return <ProjectLoading />;

  if (!projectQuery.data) {
    return (
      <div className="mx-auto max-w-[1280px]">
        <button
          type="button"
          onClick={() => navigate('/projetos')}
          className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-[6px] bg-transparent px-1 py-2 text-sm font-semibold text-brand outline-none transition-colors hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={17} /> Voltar para projetos
        </button>
        <ApiErrorBanner
          error={
            !projectId
              ? 'projeto não identificado'
              : projectQuery.error
                ? getApiErrorMessage(projectQuery.error)
                : 'projeto não encontrado'
          }
          onRetry={() => void projectQuery.refetch()}
          message="Não foi possível carregar o projeto"
        />
      </div>
    );
  }

  const activeTab = location.pathname.endsWith('/atividades')
    ? 'activities'
    : location.pathname.endsWith('/parcelas-produtor')
      ? 'installments'
      : 'project';
  const context: ProjectRouteContext = { project: projectQuery.data };

  return (
    <div className="mx-auto max-w-[1280px] animate-rise">
      <ProjectInternalHeader project={projectQuery.data} activeTab={activeTab} />
      <Outlet context={context} />
    </div>
  );
}
