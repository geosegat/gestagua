/**
 * Vocabulário do SICAR. O cadastro devolve códigos curtos (`ind_status`,
 * `ind_tipo`); aqui viram rótulo em português e o tom da cor do status. Código
 * desconhecido volta como veio - melhor mostrar o bruto do que inventar.
 */

export type SicarTone = 'ok' | 'warn' | 'bad' | 'neutral';

const STATUS_LABEL: Record<string, string> = {
  AT: 'Ativo',
  PE: 'Pendente',
  SU: 'Suspenso',
  CA: 'Cancelado',
};

const STATUS_TONE: Record<string, SicarTone> = {
  AT: 'ok',
  PE: 'warn',
  SU: 'warn',
  CA: 'bad',
};

const TIPO_LABEL: Record<string, string> = {
  IRU: 'Imóvel Rural',
  AST: 'Assentamento de Reforma Agrária',
  PCT: 'Território de Povos e Comunidades Tradicionais',
};

function key(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

export function sicarStatusLabel(status: string | null | undefined): string {
  const code = key(status);
  return STATUS_LABEL[code] ?? (code || 'Não informado');
}

export function sicarStatusTone(status: string | null | undefined): SicarTone {
  return STATUS_TONE[key(status)] ?? 'neutral';
}

export function sicarTipoLabel(tipo: string | null | undefined): string {
  const code = key(tipo);
  return TIPO_LABEL[code] ?? (code || 'Não informado');
}

/** Área/módulos fiscais do SICAR: número em pt-BR, com no máximo 2 casas. */
export function formatSicarNumber(
  value: number | null | undefined,
  suffix = '',
): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return 'Não informado';
  }
  const formatted = Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  });
  return suffix ? `${formatted} ${suffix}` : formatted;
}
