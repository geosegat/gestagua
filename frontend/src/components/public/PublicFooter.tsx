import { Droplets } from '../../icons';
import { useBranding } from '../../branding/BrandingContext';
import { LOGO_FULL, isDefaultLogo } from '../../branding/assets';
import { PUBLIC_CONTAINER } from './PublicHeader';

/**
 * Rodapé das páginas públicas: a marca oficial do programa fecha a página, em
 * tamanho que deixa o subtítulo do lockup legível.
 */
export default function PublicFooter({ onLogin }: { onLogin: () => void }) {
  const { branding } = useBranding();

  return (
    <footer
      className={`${PUBLIC_CONTAINER} flex flex-wrap items-center justify-between gap-6 py-10`}
    >
      <div className="flex items-center gap-4">
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
      </div>
      <div className="text-[12px] text-ink-soft">
        Acesso administrativo mediante chave ·{' '}
        <button
          onClick={onLogin}
          className="cursor-pointer font-semibold text-brand underline-offset-2 hover:underline"
        >
          entrar no painel
        </button>
      </div>
    </footer>
  );
}
