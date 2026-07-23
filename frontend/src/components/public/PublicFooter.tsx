import { Droplets } from '../../icons';
import { useBranding } from '../../branding/BrandingContext';
import { LOGO_FULL, isDefaultLogo } from '../../branding/assets';
import { PUBLIC_CONTAINER } from './PublicHeader';

/**
 * Rodapé das páginas públicas: a marca oficial do programa fecha a página, em
 * tamanho que deixa o subtítulo do lockup legível.
 */
export default function PublicFooter() {
  const { branding } = useBranding();

  return (
    <footer className={`${PUBLIC_CONTAINER} flex flex-wrap items-center gap-4 py-10`}>
      {isDefaultLogo(branding.logoUrl) ? (
        <img
          src={LOGO_FULL}
          alt="PSA Alegre/ES, Programa Municipal de Pagamento por Serviços Ambientais"
          className="h-[88px] w-auto"
        />
      ) : branding.logoUrl ? (
        <img src={branding.logoUrl} alt="" className="h-12 w-12 object-contain" />
      ) : (
        <Droplets size={18} className="text-accent" />
      )}
      <div className="text-[12.5px] leading-relaxed text-ink-soft">
        <b className="font-semibold text-ink">{branding.productName}</b>
        {branding.productSubtitle && <> · {branding.productSubtitle}</>}
      </div>
    </footer>
  );
}
