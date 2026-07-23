/**
 * Constantes do programa usadas nos indicadores da Visão Geral e do portal
 * público. Ficam aqui pra os dois lugares mostrarem exatamente o mesmo número.
 */

/**
 * Fator de CO₂ por hectare, replicado da metodologia do MVGI/Arvo
 * (overview-db.repository.ts): 125 t/ha de biomassa aérea + raízes × 0,47 de
 * fração de carbono (IPCC) × 3,67 de conversão C → CO₂ = 215,6 tCO₂e/ha.
 * Aplicado sobre a área planejada, daí o rótulo "projetado" (potencial dos
 * projetos, não sequestro já realizado).
 */
export const CO2_TCO2E_PER_HA = 125 * 0.47 * 3.67;

/**
 * Recurso total do programa, em reais. Valor institucional informado pela
 * prefeitura (planilha oficial: R$ 155.000,00), não calculado pelo sistema - o
 * banco só tem as parcelas dos produtores (~R$ 107 mil), enquanto este é o
 * recurso total destinado. Atualizar aqui se o valor oficial mudar.
 */
export const RECURSO_TOTAL_REAIS = 155000;

/** CO₂ projetado (tCO₂e) a partir da área planejada em hectares. */
export function projectedCo2(plannedAreaHa: number): number {
  return Math.round(plannedAreaHa * CO2_TCO2E_PER_HA);
}

/** Repasses por projeto no PSA (dois repasses de 50%, conforme o Decreto). */
export const REPASSES_POR_PROJETO = 2;

/**
 * Parcelas executadas (repasses já feitos) exibidas no portal. Fixo em 0 por
 * ora: nenhum repasse saiu ainda; vira ~20 (um por projeto) quando o primeiro
 * repasse for pago. Atualizar aqui, ou ligar no dado real, quando o
 * monitoramento passar a registrar os pagamentos.
 */
export const PARCELAS_EXECUTADAS = 0;
