import {
  AppWindow,
  BarChart3,
  Droplets,
  LayoutDashboard,
  Map,
  MapPin,
  Megaphone,
  Palette,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { BrandingConfig } from '../branding/types';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  /** Item que o admin não pode esconder (ex.: a própria Personalização). */
  locked?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

/**
 * Menu do produto — dados, não código. Produto novo = outro array.
 * O admin sobrepõe visibilidade/label via branding.nav (por id).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'programa',
    title: 'Programa',
    items: [
      { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard, path: '/visao-geral' },
      { id: 'projetos', label: 'Projetos', icon: Droplets, path: '/projetos' },
      { id: 'produtores', label: 'Produtores', icon: Users, path: '/produtores' },
      { id: 'propriedades', label: 'Propriedades', icon: MapPin, path: '/propriedades' },
      { id: 'mobilizacao', label: 'Mobilização', icon: Megaphone, path: '/mobilizacoes' },
    ],
  },
  {
    id: 'analise',
    title: 'Análise',
    items: [
      { id: 'relatorios', label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
      { id: 'mapa', label: 'Mapa', icon: Map, path: '/mapa' },
    ],
  },
  {
    id: 'admin',
    title: 'Administração',
    items: [
      {
        id: 'personalizacao',
        label: 'Personalização',
        icon: Palette,
        path: '/personalizacao',
        locked: true,
      },
    ],
  },
  {
    id: 'utilities',
    title: 'Utilitários',
    items: [
      { id: 'program', label: 'Programa', icon: AppWindow, path: '/program' },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Aplica os overrides do admin: filtra escondidos e troca labels. */
export function resolveNav(branding: BrandingConfig): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => item.locked || !branding.nav[item.id]?.hidden)
      .map((item) => {
        const label = branding.nav[item.id]?.label?.trim();
        return label ? { ...item, label } : item;
      }),
  })).filter((section) => section.items.length > 0);
}
