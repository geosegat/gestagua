import { motion } from 'framer-motion';
import { FolderKanban, LandPlot, MapPin } from '../icons';
import { formatNumber } from '../lib/format';
import { stagger } from '../lib/motion';
import { StatCard } from './StatCard';

interface StatsProps {
  activeProjects: number | null;
  activeProperties: number | null;
  totalAreaHa: number | null;
}

/** Resumo do topo da aba Projetos. */
export default function Stats({
  activeProjects,
  activeProperties,
  totalAreaHa,
}: StatsProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5"
    >
      <StatCard
        icon={FolderKanban}
        value={activeProjects ?? 'Não informado'}
        label="Projetos ativos"
        tone="brand"
        hint="Projetos em execução; cancelados e arquivados não entram no cálculo"
      />
      <StatCard
        icon={MapPin}
        value={activeProperties ?? 'Não informado'}
        label="Propriedades ativas"
        tone="ok"
        hint="Propriedades distintas vinculadas aos projetos ativos"
      />
      <StatCard
        icon={LandPlot}
        value={totalAreaHa === null ? 'Não informado' : `${formatNumber(totalAreaHa)} ha`}
        label="Área total ativa"
        tone="accent"
        hint="Área das propriedades ativas, sem duplicidade"
      />
    </motion.div>
  );
}
