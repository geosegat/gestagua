import { ChevronsLeft, ChevronsRight, Droplets, LogOut, X } from '../../icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { BrandingConfig, NavSection } from '../../types';
import { useBranding } from '../../branding/BrandingContext';
import { clearKey } from '../../lib/auth';
import { gestaguaApi } from '../../services/gestaguaApi';
import { useDispatch } from 'react-redux';
import { resolveNav } from '../../navigation/config';

const COLLAPSED_KEY = 'gestagua_drawer_collapsed';
const W_OPEN = 272;
const W_RAIL = 64;

interface DrawerBodyProps {
  branding: BrandingConfig;
  sections: NavSection[];
  open: boolean;
  headerControl: ReactNode;
  onNavigate?: () => void;
  onSignOut: () => void;
}

/** Miolo do drawer (logo, navegação, sair) - compartilhado entre o rail de
 * desktop e o overlay de mobile; só a moldura ao redor muda. */
function DrawerBody({
  branding,
  sections,
  open,
  headerControl,
  onNavigate,
  onSignOut,
}: DrawerBodyProps) {
  return (
    <>
      {/* topo: logo + nome + controle (pin no desktop, X no mobile) */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-on-brand/10 px-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <Droplets size={20} className="text-accent" />
          )}
        </div>
        {open && (
          <>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-display text-[17px] font-semibold">
                {branding.productName}
              </div>
              {branding.productSubtitle && (
                // duas linhas em vez de truncar: o subtítulo da marca é uma
                // frase inteira e cortaria no meio de uma palavra
                <div className="line-clamp-2 text-[10.5px] leading-[1.25] text-on-brand/60">
                  {branding.productSubtitle}
                </div>
              )}
            </div>
            {headerControl}
          </>
        )}
      </div>

      {/* navegação */}
      <nav className="brand-scroll-inverse flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
        {sections.map((section) => (
          <div key={section.id} className="mb-2">
            {open ? (
              <div className="px-3 pb-1.5 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-on-brand/45">
                {section.title}
              </div>
            ) : (
              <div className="mx-3 my-2.5 border-t border-on-brand/15" />
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  title={open ? undefined : item.label}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      'mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] transition-colors',
                      open ? '' : 'justify-center px-0',
                      isActive
                        ? 'bg-brand-hover font-semibold text-on-brand'
                        : 'font-medium text-on-brand/75 hover:bg-brand-hover/60 hover:text-on-brand',
                    ].join(' ')
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {open && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* rodapé: trocar chave + versão */}
      <div className="shrink-0 border-t border-on-brand/10 px-2.5 py-2.5">
        <button
          onClick={onSignOut}
          title={open ? undefined : 'Sair'}
          className={[
            'flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium text-on-brand/60 transition-colors hover:bg-brand-hover/60 hover:text-on-brand',
            open ? '' : 'justify-center px-0',
          ].join(' ')}
        >
          <LogOut size={17} className="shrink-0" />
          {open && <span>Sair</span>}
        </button>
        {open && (
          <div className="px-3 pt-1 text-[10.5px] text-on-brand/35">v0.1.0 · white-label</div>
        )}
      </div>
    </>
  );
}

export default function Drawer({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { branding } = useBranding();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const sections = resolveNav(branding);

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === 'true',
  );
  const [hovering, setHovering] = useState(false);

  // regra herdada do MVGI: aberto se fixado, ou se colapsado + mouse em cima
  const open = !collapsed || hovering;

  function togglePin() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
    if (!next) setHovering(false);
  }

  function signOut() {
    clearKey();
    dispatch(gestaguaApi.util.resetApiState());
    navigate('/', { replace: true });
  }

  const mobileAsideRef = useRef<HTMLElement>(null);

  // Esc fecha, Tab fica preso dentro do overlay (foco não escapa pro
  // conteúdo por trás), e o primeiro item ganha foco assim que abre.
  useEffect(() => {
    if (!mobileOpen) return;
    const container = mobileAsideRef.current;
    if (!container) return;

    function focusable(): HTMLElement[] {
      return Array.from(
        container!.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
    }

    focusable()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onMobileClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* rail de desktop - some completamente abaixo de md, o overlay de
          mobile assume a navegação nesse ponto */}
      <div
        className="hidden h-full shrink-0 overflow-hidden bg-brand text-on-brand transition-[width] duration-200 ease-out md:block"
        style={{ width: open ? W_OPEN : W_RAIL }}
        onMouseEnter={() => collapsed && setHovering(true)}
        onMouseLeave={() => collapsed && setHovering(false)}
      >
        <aside
          className="flex h-full w-full flex-col overflow-hidden"
        >
          <DrawerBody
            branding={branding}
            sections={sections}
            open={open}
            onSignOut={signOut}
            headerControl={
              <button
                onClick={togglePin}
                title={collapsed ? 'Fixar menu aberto' : 'Recolher menu'}
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-on-brand/60 transition-colors hover:bg-brand-hover hover:text-on-brand"
              >
                {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
              </button>
            }
          />
        </aside>
      </div>

      {/* overlay de mobile - sempre aberto (sem rail colapsado), fecha ao
          navegar, tocar no fundo ou apertar Esc */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside
            ref={mobileAsideRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[85vw] flex-col overflow-hidden bg-brand text-on-brand shadow-[8px_0_32px_-12px_rgba(0,0,0,.45)] outline-none md:hidden"
          >
            <DrawerBody
              branding={branding}
              sections={sections}
              open
              onNavigate={onMobileClose}
              onSignOut={signOut}
              headerControl={
                <button
                  onClick={onMobileClose}
                  aria-label="Fechar menu"
                  className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-on-brand/60 transition-colors hover:bg-brand-hover hover:text-on-brand"
                >
                  <X size={18} />
                </button>
              }
            />
          </aside>
        </>
      )}
    </>
  );
}
