import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Drawer from '../drawer/Drawer';
import MobileHeader from './MobileHeader';

/** Shell do produto: drawer white-label + área de conteúdo rolável. */
export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // rede de segurança: fecha o overlay de mobile em qualquer navegação
  // (inclusive programática, que não passa pelo onClick do NavLink)
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // devolve o foco pro botão de hambúrguer ao fechar (Esc, backdrop, link) —
  // sem isso o foco do teclado "cai" pro topo da página
  function closeMobileNav() {
    setMobileNavOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Drawer mobileOpen={mobileNavOpen} onMobileClose={closeMobileNav} />
      <main className="brand-scroll flex-1 overflow-y-auto">
        <MobileHeader onOpenMenu={() => setMobileNavOpen(true)} buttonRef={menuButtonRef} />
        <div className="px-4 pb-10 pt-6 sm:px-7 sm:pt-8">
          <Outlet />
        </div>
        <footer className="pb-8 text-center text-[12px] text-ink-soft">
          MVGI · espelho diário somente leitura · dados pessoais não trafegam por esta API
        </footer>
      </main>
    </div>
  );
}
