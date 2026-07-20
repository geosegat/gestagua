const ACENTOS = 'áàâãäéèêëíìîïóòôõöúùûüç';
const BASE = 'aaaaaeeeeiiiiooooouuuuc';

export function buscaSemAcento(coluna: string, placeholder: string): string {
  return (
    `translate(lower(${coluna}), '${ACENTOS}', '${BASE}')` +
    ` LIKE translate(lower(${placeholder}), '${ACENTOS}', '${BASE}')`
  );
}
