import { motion } from 'framer-motion';
import { Activity, Droplets, FolderKanban, MapPin } from 'lucide-react';
import { stagger } from '../lib/motion';
import { StatCard } from './StatCard';

interface StatsProps {
  total: number | null;
  executionLabel: string;
  municipalities: number;
  springs: number;
}

/** Resumo do topo da aba Projetos: os mesmos cards da Visão Geral. */
export default function Stats({ total, executionLabel, municipalities, springs }: StatsProps) {
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
      <StatCard icon={MapPin} value={municipalities} label="Municípios (página)" tone="accent" />
      <StatCard icon={Droplets} value={springs} label="Nascentes (página)" tone="accent" />
    </motion.div>
  );
}
