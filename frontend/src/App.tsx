import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BrandingProvider } from './branding/BrandingContext';
import PageContainer from './components/PageContainer';
import AppShell from './components/shell/AppShell';
import { getKey } from './lib/api';
import { ALL_NAV_ITEMS, type NavItem } from './navigation/config';
import LoginPage from './pages/LoginPage';
import MobilizationsPage from './pages/MobilizationsPage';
import PersonalizationPage from './pages/PersonalizationPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProducersPage from './pages/ProducersPage';
import ProgramsPage from './pages/ProgramsPage';
import ProjectsPage from './pages/ProjectsPage';
import PropertiesPage from './pages/PropertiesPage';
import OverviewPage from './pages/Overview';

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
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/visao-geral" replace />} />
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
