/** Config de white-label editável pelo admin (persistida em localStorage / JSON). */
export interface BrandingColors {
  /** Cor da marca — pinta o drawer, botões, títulos ("a parte verde" do MVGI). */
  primary: string;
  /** Cor de destaque — chips, hovers suaves, detalhes. */
  accent: string;
}

export interface NavOverride {
  hidden?: boolean;
  /** Label customizado; vazio/ausente usa o padrão do produto. */
  label?: string;
}

export interface BrandingConfig {
  version: 1;
  productName: string;
  productSubtitle: string;
  /** Data-URL ou URL de imagem; null usa o ícone padrão. */
  logoUrl: string | null;
  colors: BrandingColors;
  /** Overrides por id de item do menu (visibilidade/label). */
  nav: Record<string, NavOverride>;
}
