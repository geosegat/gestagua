import { Menu } from 'lucide-react';
import type { Ref } from 'react';
import { useBranding } from '../../branding/BrandingContext';

interface Props {
  onOpenMenu: () => void;
  /** pra devolver o foco ao botão quando o overlay fechar (a11y) */
  buttonRef?: Ref<HTMLButtonElement>;
}

/** Barra só de mobile: some a partir de md, quando o rail do Drawer assume. */
export default function MobileHeader({ onOpenMenu, buttonRef }: Props) {
  const { branding } = useBranding();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#e0e2e7] bg-card px-4 md:hidden">
      <button
        ref={buttonRef}
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-accent-soft/50"
      >
        <Menu size={20} />
      </button>
      <span className="truncate font-display text-[15px] font-semibold text-brand-deep">
        {branding.productName}
      </span>
    </header>
  );
}
