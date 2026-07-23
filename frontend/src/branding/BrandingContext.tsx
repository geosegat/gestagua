import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { derivePalette, isValidHex } from './color';
import { applyFavicon } from './favicon';
import { DEFAULT_BRANDING } from './presets';
import type { BrandingConfig } from '../types';

const STORAGE_KEY = 'gestagua_branding_v1';
const VERSION = 4;

interface BrandingContextValue {
  branding: BrandingConfig;
  /** Merge raso de campos no config (persiste e aplica na hora). */
  update: (patch: Partial<BrandingConfig>) => void;
  reset: () => void;
  exportJson: () => void;
  /** Importa um JSON exportado; retorna mensagem de erro ou null se ok. */
  importJson: (file: File) => Promise<string | null>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function load(): BrandingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw) as Partial<BrandingConfig>;
    return sanitize(parsed);
  } catch {
    return DEFAULT_BRANDING;
  }
}

/** Garante shape válido mesmo com JSON antigo/alheio (import ou storage). */
function sanitize(raw: Partial<BrandingConfig>): BrandingConfig {
  const colors = raw.colors ?? DEFAULT_BRANDING.colors;
  // Tema gravado antes desta versão carrega valores que eram o padrão de
  // fábrica antigo, não escolha do admin: v2 mudou o logo e v3 trocou o
  // subtítulo pela redação oficial do programa. Nesses casos adota os novos
  // padrões, preservando cores e menu já customizados.
  //
  // A contrapartida é que nome e subtítulo digitados à mão antes da v3 se
  // perdem nesta atualização. Vale porque o produto ainda não foi entregue e o
  // texto antigo brigava com a marca na tela; de v3 em diante, o que o admin
  // escrever é preservado.
  const legacy = raw.version !== VERSION;
  return {
    version: VERSION,
    productName:
      !legacy && typeof raw.productName === 'string' && raw.productName.trim()
        ? raw.productName
        : DEFAULT_BRANDING.productName,
    productSubtitle:
      !legacy && typeof raw.productSubtitle === 'string'
        ? raw.productSubtitle
        : DEFAULT_BRANDING.productSubtitle,
    logoUrl:
      typeof raw.logoUrl === 'string'
        ? raw.logoUrl
        : legacy
          ? DEFAULT_BRANDING.logoUrl
          : null,
    colors: {
      primary: isValidHex(colors.primary ?? '') ? colors.primary : DEFAULT_BRANDING.colors.primary,
      accent: isValidHex(colors.accent ?? '') ? colors.accent : DEFAULT_BRANDING.colors.accent,
    },
    nav: raw.nav && typeof raw.nav === 'object' ? raw.nav : {},
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(load);

  // Aplica o tema: CSS variables no :root + título do documento + persistência.
  useEffect(() => {
    const palette = derivePalette(branding.colors.primary, branding.colors.accent);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(palette)) root.style.setProperty(k, v);
    document.title = `${branding.productName} · Painel`;
    applyFavicon(branding.colors.primary, branding.colors.accent, branding.logoUrl);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    } catch {
      /* storage cheio (logo grande demais) - tema segue aplicado em memória */
    }
  }, [branding]);

  const update = useCallback((patch: Partial<BrandingConfig>) => {
    setBranding((prev) => sanitize({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBranding(DEFAULT_BRANDING);
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(branding, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `branding-${branding.productName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [branding]);

  const importJson = useCallback(async (file: File): Promise<string | null> => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<BrandingConfig>;
      if (!parsed || typeof parsed !== 'object' || !parsed.colors) {
        return 'Arquivo não parece um branding.json válido (faltou "colors").';
      }
      setBranding(sanitize(parsed));
      return null;
    } catch {
      return 'Não consegui ler o arquivo. É um JSON válido?';
    }
  }, []);

  const value = useMemo(
    () => ({ branding, update, reset, exportJson, importJson }),
    [branding, update, reset, exportJson, importJson],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding precisa estar dentro de <BrandingProvider>');
  return ctx;
}
