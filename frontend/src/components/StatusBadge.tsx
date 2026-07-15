import type { ProjectStatus } from '../lib/api';
import { statusLabel } from '../lib/format';

const STYLES: Record<string, string> = {
  em_execucao: 'text-ok bg-ok-bg',
  cancelado: 'text-bad bg-bad-bg',
  arquivado: 'text-warn bg-warn-bg',
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const cls = STYLES[status] ?? 'text-ink-soft bg-line/60';
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}
    >
      {statusLabel(status)}
    </span>
  );
}
