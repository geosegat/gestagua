import { Droplets, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../branding/BrandingContext';
import { getKey, setKey } from '../lib/auth';
import { hasApiStatus } from '../lib/apiError';
import { useValidateKeyMutation } from '../services/gestaguaApi';

/**
 * Tela de login (estilo MVGI: painel da marca + card de acesso).
 * O "login" do produto é a chave de API — validada contra a própria API
 * antes de entrar; nada de credencial fake.
 */
export default function LoginPage() {
  const { branding } = useBranding();
  const navigate = useNavigate();

  const [accessKey, setAccessKey] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validateKey, { isLoading: loading }] = useValidateKeyMutation();

  // já autenticado? vai direto pro painel
  useEffect(() => {
    if (getKey()) navigate('/', { replace: true });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const key = accessKey.trim();
    if (!key || loading) return;
    setError(null);
    try {
      await validateKey(key).unwrap();
      setKey(key);
      navigate('/', { replace: true });
    } catch (validationError) {
      setError(
        hasApiStatus(validationError, 401)
          ? 'Chave recusada pela API. Confere e tenta de novo.'
          : 'Não consegui falar com a API. Ela está rodando?',
      );
    }
  }

  return (
    <div className="flex h-full">
      {/* painel da marca (o "drawer" do login do MVGI) */}
      <aside className="relative hidden w-[380px] shrink-0 flex-col justify-between overflow-hidden bg-brand p-9 text-on-brand md:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--brand-accent) 35%, transparent), transparent 45%), radial-gradient(circle at 10% 90%, color-mix(in srgb, var(--brand-accent) 22%, transparent), transparent 40%)',
          }}
        />
        <div className="relative">
          <div className="mb-8 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-on-brand/10">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <Droplets size={24} className="text-accent" />
            )}
          </div>
          <h1 className="font-display text-[40px] font-bold leading-[1.05]">
            {branding.productName}
          </h1>
          {branding.productSubtitle && (
            <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-on-brand/70">
              {branding.productSubtitle}
            </p>
          )}
        </div>
        <div className="relative text-[12px] text-on-brand/50">
          Espelho diário · somente leitura · dados pessoais não trafegam por esta API
        </div>
      </aside>

      {/* área do formulário */}
      <main className="flex flex-1 items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[420px] animate-rise rounded-[18px] border border-line bg-card p-9 shadow-[0_18px_40px_-28px_rgba(0,0,0,.35)]"
        >
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
            Acesso restrito
          </div>
          <h2 className="font-display text-[26px] font-semibold">Bem-vindo</h2>
          <p className="mb-6 mt-1.5 text-[13.5px] text-ink-soft">
            Informe a chave de acesso pra consultar o painel. Ela fica salva apenas neste
            navegador.
          </p>

          <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Chave de acesso
          </label>
          <div className="relative mb-4">
            <KeyRound
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              type={show ? 'text' : 'password'}
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="cole a chave aqui"
              autoComplete="off"
              autoFocus
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
      </main>
    </div>
  );
}
