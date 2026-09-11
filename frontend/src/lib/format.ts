import type { ProjectStatus } from '../types';

export function formatNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? 'Não informado' : Number(n).toLocaleString('pt-BR');
}

export function formatCurrency(n: number | null | undefined): string {
  return n === null || n === undefined
    ? 'Não informado'
    : Number(n).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'Não informado';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return 'Não informado';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return 'Não informado';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;

  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(dt);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('day')}/${value('month')}/${value('year')} - ${value('hour')}:${value('minute')}`;
}

export const STATUS_LABEL: Record<string, string> = {
  em_execucao: 'em execução',
  cancelado: 'cancelado',
  arquivado: 'arquivado',
};

export function statusLabel(s: ProjectStatus): string {
  return STATUS_LABEL[s] ?? s;
}
