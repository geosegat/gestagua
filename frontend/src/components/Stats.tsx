import { motion } from 'framer-motion';
import { Activity, Droplets, FolderKanban } from 'lucide-react';
import { stagger } from '../lib/motion';
import { StatCard } from './StatCard';

interface StatsProps {
  total: number | null;
  executionLabel: string;
  springs: number;
}

/** Resumo do topo da aba Projetos. */
export default function Stats({ total, executionLabel, springs }: StatsProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5"
    >
      <StatCard
        icon={FolderKanban}
        value={total ?? '—'}
        label="Projetos Gestágua"
        tone="brand"
        hint="Total do programa — não muda quando você filtra"
      />
      <StatCard
        icon={Activity}
        value={executionLabel}
        label="Em execução"
        tone="ok"
        hint="Em execução sobre o total da página carregada"
      />
      <StatCard icon={Droplets} value={springs} label="Nascentes (página)" tone="accent" />
    </motion.div>
  );
}
