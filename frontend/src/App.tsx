import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BrandingProvider } from './branding/BrandingContext';
import PageContainer from './components/PageContainer';
import AppShell from './components/shell/AppShell';
import ProjectLayout from './components/project/ProjectLayout';
import { getKey } from './lib/auth';
import { ALL_NAV_ITEMS } from './navigation/config';
import LandingPage from './pages/LandingPage';
import MobilizationsPage from './pages/MobilizationsPage';
import PersonalizationPage from './pages/PersonalizationPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProducersPage from './pages/ProducersPage';
import ProgramsPage from './pages/ProgramsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectInformationPage from './pages/ProjectInformationPage';
import ProjectInstallmentsPage from './pages/ProjectInstallmentsPage';
import ProjectStagesPage from './pages/ProjectStagesPage';
import PropertiesPage from './pages/PropertiesPage';
// mapa carregado sob demanda: puxa o Google Maps só quem abre a tela
const PropertyMapPage = lazy(() => import('./pages/PropertyMapPage'));
import PublicResultsPage from './pages/PublicResultsPage';
import OverviewPage from './pages/Overview';
import type { NavItem } from './types';

/** Sem chave salva → tela de login. (As páginas ainda tratam 401 em uso.) */
function RequireAuth({ children }: { children: ReactElement }) {
  if (!getKey()) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Telas que ocupam a largura TODA (tabela estilo ARVO). As demais entram no
 * PageContainer (1080px). Pra converter uma aba depois (ex.: Produtores),
 * basta adicionar o id aqui.
 */
const FULL_WIDTH = new Set<string>([
  'propriedades',
  'produtores',
  'projetos',
  'mobilizacao',
  'program',
  'mapa',
]);

/** Resolve a página de cada item do menu; sem página real → placeholder. */
function elementFor(item: NavItem) {
  switch (item.id) {
    case 'visao-geral':
      return <OverviewPage />;
    case 'projetos':
      return <ProjectsPage />;
    case 'produtores':
      return <ProducersPage />;
    case 'propriedades':
      return <PropertiesPage />;
    case 'mobilizacao':
      return <MobilizationsPage />;
    case 'mapa':
      return (
        <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-[6px] bg-line/30" />}>
          <PropertyMapPage />
        </Suspense>
      );
    case 'personalizacao':
      return <PersonalizationPage />;
    case 'program':
      return <ProgramsPage />;
    default:
      return <PlaceholderPage title={item.label} />;
  }
}

export default function App() {
  return (
    <BrandingProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/resultados" element={<PublicResultsPage />} />
          {/* o acesso é um modal, não uma tela: /login abre a landing com ele
              por cima, então links diretos e o redirect do RequireAuth seguem
              funcionando */}
          <Route path="/login" element={<LandingPage autoOpenLogin />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/projetos/:projectId" element={<ProjectLayout />}>
              <Route index element={<Navigate to="informacoes" replace />} />
              <Route path="informacoes" element={<ProjectInformationPage />} />
              <Route path="atividades" element={<ProjectStagesPage />} />
              <Route path="parcelas-produtor" element={<ProjectInstallmentsPage />} />
            </Route>
            {ALL_NAV_ITEMS.map((item) => (
              <Route
                key={item.id}
                path={item.path}
                element={
                  FULL_WIDTH.has(item.id) ? (
                    elementFor(item)
                  ) : (
                    <PageContainer>{elementFor(item)}</PageContainer>
                  )
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/visao-geral" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BrandingProvider>
  );
}
