import { Link } from 'react-router-dom';
import { Droplets } from '../../icons';
import { useBranding } from '../../branding/BrandingContext';

/** Largura útil das páginas públicas (landing e portal). */
export const PUBLIC_CONTAINER = 'mx-auto w-full max-w-[1080px] px-6';

/**
 * Barra superior compartilhada pelas páginas públicas. `action` é o botão da
 * direita, que muda de página pra página (ir pro portal, entrar no sistema).
 */
export default function PublicHeader({ action }: { action?: React.ReactNode }) {
  const { branding } = useBranding();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className={`${PUBLIC_CONTAINER} flex h-16 items-center justify-between`}>
        <Link to="/" className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-10 w-10 shrink-0 object-contain" />
          ) : (
            <Droplets size={24} className="shrink-0 text-accent" />
          )}
          <div>
            <div className="font-display text-[15px] font-semibold leading-tight text-ink">
              {branding.productName}
            </div>
            {branding.productSubtitle && (
              <div className="text-[11px] leading-tight text-ink-soft">
                {branding.productSubtitle}
              </div>
            )}
          </div>
        </Link>
        {action}
      </div>
    </header>
  );
}
