import { Download, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useBranding } from '../branding/BrandingContext';
import { isValidHex } from '../branding/color';
import { COLOR_PRESETS } from '../branding/presets';
import { NAV_SECTIONS } from '../navigation/config';

/* ---------- blocos de UI ---------- */

function Card({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="animate-rise rounded-[14px] border border-line bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mb-4 mt-0.5 text-[13px] text-ink-soft">{desc}</p>
      {children}
    </section>
  );
}

const LABEL = 'mb-1 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft';
const INPUT =
  'w-full rounded-[10px] border-[1.5px] border-line bg-[#fbfaf6] px-3 py-2 text-sm outline-none transition-colors focus:border-aqua';

/** Seletor de cor com campo hex sincronizado. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-card p-1"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            if (isValidHex(v)) onChange(v.toLowerCase());
          }}
          spellCheck={false}
          className={`${INPUT} max-w-32.5 font-mono text-[13px]`}
        />
        <span
          className="h-10 flex-1 rounded-lg border border-line"
          style={{ background: value }}
        />
      </div>
    </div>
  );
}

/* ---------- página ---------- */

export default function PersonalizationPage() {
  const { branding, update, reset, exportJson, importJson } = useBranding();
  const importRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function setColor(key: 'primary' | 'accent', hex: string) {
    update({ colors: { ...branding.colors, [key]: hex } });
  }

  function setNavOverride(id: string, patch: { hidden?: boolean; label?: string }) {
    const current = branding.nav[id] ?? {};
    update({ nav: { ...branding.nav, [id]: { ...current, ...patch } } });
  }

  function handleLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) {
      setMsg('Logo muito grande (máx. ~400 KB) — use uma imagem menor.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ logoUrl: String(reader.result) });
      setMsg(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    const err = await importJson(file);
    setMsg(err ?? 'Tema importado com sucesso.');
  }

  const BTN =
    'inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-line bg-card px-4 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-aqua hover:text-brand';

  return (
    <>
      <div className="mb-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/60">
          Administração · white-label
        </div>
        <h1 className="font-display text-[34px] font-semibold leading-tight text-brand-deep">
          Personalização
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Tudo aplica na hora (preview ao vivo) e fica salvo neste navegador. Use{' '}
          <b>Exportar</b> pra gerar o JSON do tema oficial do produto.
        </p>
      </div>

      <div className="grid gap-5">
        {/* ---------- cores ---------- */}
        <Card
          title="Cores da marca"
          desc="A cor primária pinta o menu lateral, botões e títulos; a de destaque pinta chips e realces. Tons de hover/seleção são derivados automaticamente."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Cor primária"
              value={branding.colors.primary}
              onChange={(hex) => setColor('primary', hex)}
            />
            <ColorField
              label="Cor de destaque"
              value={branding.colors.accent}
              onChange={(hex) => setColor('accent', hex)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => update({ colors: { primary: p.primary, accent: p.accent } })}
                className={BTN}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-line"
                  style={{ background: p.primary }}
                />
                <span
                  className="-ml-2 h-3.5 w-3.5 rounded-full border border-line"
                  style={{ background: p.accent }}
                />
                {p.name}
              </button>
            ))}
          </div>
        </Card>

        {/* ---------- identidade ---------- */}
        <Card
          title="Identidade"
          desc="Nome e logo exibidos no topo do menu e no título da aba."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={LABEL}>Nome do produto</span>
              <input
                type="text"
                value={branding.productName}
                onChange={(e) => update({ productName: e.target.value })}
                className={INPUT}
              />
            </div>
            <div>
              <span className={LABEL}>Subtítulo</span>
              <input
                type="text"
                value={branding.productSubtitle}
                onChange={(e) => update({ productSubtitle: e.target.value })}
                className={INPUT}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => logoRef.current?.click()} className={BTN}>
              <Upload size={15} /> Enviar logo
            </button>
            {branding.logoUrl && (
              <>
                <img
                  src={branding.logoUrl}
                  alt="logo atual"
                  className="h-9 w-9 rounded-lg border border-line object-contain"
                />
                <button onClick={() => update({ logoUrl: null })} className={BTN}>
                  Remover
                </button>
              </>
            )}
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogo(e.target.files?.[0])}
            />
          </div>
        </Card>

        {/* ---------- menu ---------- */}
        <Card
          title="Menu"
          desc="Escolha o que aparece no menu lateral e renomeie itens. Campo vazio usa o nome padrão."
        >
          <div className="grid gap-5">
            {NAV_SECTIONS.map((section) => (
              <div key={section.id}>
                <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                  {section.title}
                </div>
                <div className="grid gap-2">
                  {section.items.map((item) => {
                    const ov = branding.nav[item.id] ?? {};
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-[10px] border border-line bg-[#fbfaf6] px-3 py-2"
                      >
                        <label
                          className={`flex items-center gap-2 text-[13px] font-medium ${item.locked ? 'opacity-50' : 'cursor-pointer'}`}
                          title={item.locked ? 'Este item não pode ser ocultado' : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={item.locked || !ov.hidden}
                            disabled={item.locked}
                            onChange={(e) => setNavOverride(item.id, { hidden: !e.target.checked })}
                            className="h-4 w-4 accent-(--brand-primary)"
                          />
                          visível
                        </label>
                        <span className="w-28 shrink-0 truncate text-[13px] text-ink-soft">
                          {item.label}
                        </span>
                        <input
                          type="text"
                          value={ov.label ?? ''}
                          placeholder={item.label}
                          onChange={(e) => setNavOverride(item.id, { label: e.target.value })}
                          className={`${INPUT} flex-1`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ---------- backup ---------- */}
        <Card
          title="Backup do tema"
          desc="Exporte o JSON pra versionar como tema oficial do produto, importe um tema pronto, ou volte ao padrão."
        >
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportJson} className={BTN}>
              <Download size={15} /> Exportar JSON
            </button>
            <button onClick={() => importRef.current?.click()} className={BTN}>
              <Upload size={15} /> Importar JSON
            </button>
            <button
              onClick={() => {
                reset();
                setMsg('Tema restaurado pro padrão do produto.');
              }}
              className={BTN}
            >
              <RotateCcw size={15} /> Restaurar padrão
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                handleImport(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {msg && <p className="mt-3 text-[13px] text-ink-soft">{msg}</p>}
        </Card>
      </div>
    </>
  );
}
