// ============================================================
// Helpers de busca textual.
//
// buscaSemAcento(): monta uma comparação SQL que ignora acento E
// caixa (maiúscula/minúscula). Normaliza os dois lados com
// translate()+lower() em vez da extensão `unaccent` — assim não
// depende de nada instalado no banco e sobrevive ao clone diário.
// ============================================================

// As duas strings têm o MESMO comprimento: cada caractere acentuado
// é mapeado para a letra base na mesma posição. Cobre o português.
const ACENTOS = 'áàâãäéèêëíìîïóòôõöúùûüç';
const BASE = 'aaaaaeeeeiiiiooooouuuuc';

/**
 * Gera o predicado SQL de busca sem acento para uma coluna.
 *
 * @param coluna       expressão da coluna (ex.: 'u.name') — texto FIXO
 *                     controlado pelo dev, nunca entrada do usuário.
 * @param placeholder  placeholder do parâmetro já no formato '%busca%'
 *                     (ex.: '$1'). O valor é bindado pelo pg, sem risco
 *                     de injeção.
 * @returns ex.: `translate(lower(u.name), '…', '…') LIKE translate(lower($1), '…', '…')`
 */
export function buscaSemAcento(coluna: string, placeholder: string): string {
  return (
    `translate(lower(${coluna}), '${ACENTOS}', '${BASE}')` +
    ` LIKE translate(lower(${placeholder}), '${ACENTOS}', '${BASE}')`
  );
}
