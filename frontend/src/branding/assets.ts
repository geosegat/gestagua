/**
 * Arquivos da marca do programa (PSA Alegre/ES), tratados a partir do PNG
 * original: fundo branco removido, sobras recortadas e traços internos da gota
 * preservados.
 *
 * Moram em `public/` e não em `src/assets/` de propósito: o caminho do logo é
 * gravado no localStorage junto do tema (`logoUrl`), e um asset importado pelo
 * Vite ganha hash no nome a cada build - o tema salvo apontaria pra um arquivo
 * que não existe mais. Aqui o caminho é estável entre builds.
 */

/** Lockup completo, cores originais. Só sobre fundo claro. */
export const LOGO_FULL = '/brand/psa-logo.png';

/**
 * Lockup pra fundo escuro: gota e folha seguem coloridas, a tipografia é
 * branca. O azul-marinho do "PSA" e o verde do subtítulo somem sobre o
 * petróleo da marca, daí a versão separada.
 */
export const LOGO_INVERSE = '/brand/psa-logo-inverso.png';

/**
 * Só o símbolo (gota + folha), quadrado. É o que vai nos chips de 36-48px, onde
 * o lockup inteiro ficaria ilegível.
 */
export const LOGO_SYMBOL = '/brand/psa-symbol.png';

/**
 * Foto do hero da landing: um rio corrente entre pedras e mata - a água é o
 * centro do programa (Gestágua). Vai sob um véu chapado da marca.
 */
export const HERO_RIO = '/brand/hero-rio.jpg';

/** Foto de faixa: mão plantando uma muda - restauração e o gancho de renda. */
export const FOTO_PLANTIO = '/brand/foto-plantio.jpg';

/**
 * O tema ainda está com o logo que veio de fábrica? Serve pra decidir se dá pra
 * usar a versão invertida - ela só existe pro logo do programa, então um logo
 * enviado pelo admin (white-label) precisa de outro tratamento sobre escuro.
 */
export function isDefaultLogo(logoUrl: string | null): boolean {
  return logoUrl === LOGO_SYMBOL;
}
