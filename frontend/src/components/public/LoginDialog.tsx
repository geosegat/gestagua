import { Droplets, Eye, EyeOff, KeyRound, LoaderCircle, X } from '../../icons';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../branding/BrandingContext';
import { LOGO_FULL, isDefaultLogo } from '../../branding/assets';
import { setKey } from '../../lib/auth';
import { hasApiStatus } from '../../lib/apiError';
import { useValidateKeyMutation } from '../../services/gestaguaApi';
import { RADIUS } from '../Card';

/**
 * Acesso administrativo em modal, aberto de qualquer página pública. O "login"
 * do produto é a chave de API, validada contra a própria API antes de entrar.
 */
export default function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [accessKey, setAccessKey] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validateKey, { isLoading: loading }] = useValidateKeyMutation();

  // Esc fecha e o Tab fica preso no modal, pra navegação por teclado não
  // escapar pro conteúdo da página atrás.
  useEffect(() => {
    if (!open) return;
    const container = dialogRef.current;
    if (!container) return;

    function focusable(): HTMLElement[] {
      return Array.from(
        container!.querySelectorAll<HTMLElement>('input, button:not([disabled])'),
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // some com o erro e a chave digitada ao reabrir
  useEffect(() => {
    if (!open) {
      setError(null);
      setShow(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const key = accessKey.trim();
    if (!key || loading) return;
    setError(null);
    try {
      await validateKey(key).unwrap();
      setKey(key);
      navigate('/visao-geral', { replace: true });
    } catch (validationError) {
      setError(
        hasApiStatus(validationError, 401)
          ? 'Chave recusada pela API. Confere e tenta de novo.'
          : 'Não consegui falar com a API. Ela está rodando?',
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        className={`relative w-full max-w-[400px] animate-rise border border-line bg-card px-7 py-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,.45)] ${RADIUS}`}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <X size={17} />
        </button>

        <div className="mb-7 text-center">
          {isDefaultLogo(branding.logoUrl) ? (
            <img
              src={LOGO_FULL}
              alt="PSA Alegre/ES"
              className="mx-auto mb-5 h-[74px] w-auto"
            />
          ) : branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="mx-auto mb-5 h-14 w-14 object-contain"
            />
          ) : (
            <Droplets size={34} className="mx-auto mb-5 block text-accent" />
          )}
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-brand/60">
            Acesso restrito
          </div>
          <h2
            id="login-dialog-title"
            className="mt-1.5 font-display text-[21px] font-semibold leading-tight text-brand-deep"
          >
            Entrar no painel de gestão
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            Informe a chave de acesso. Ela fica salva apenas neste navegador.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <KeyRound
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              type={show ? 'text' : 'password'}
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              placeholder="cole a chave aqui"
              autoComplete="off"
              autoFocus
              aria-label="Chave de acesso"
              className="w-full rounded-[10px] border-[1.5px] border-line bg-[#fbfaf6] py-2.5 pl-10 pr-11 text-sm outline-none transition-colors focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              title={show ? 'Ocultar chave' : 'Mostrar chave'}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="mb-4 text-[13px] text-bad">{error}</p>}

          <button
            type="submit"
            disabled={loading || !accessKey.trim()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-brand py-2.5 font-semibold text-on-brand transition-colors hover:bg-brand-deep disabled:cursor-default disabled:opacity-40"
          >
            {loading && <LoaderCircle size={16} className="animate-spin" />}
            {loading ? 'Validando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
