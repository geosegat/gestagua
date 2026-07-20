import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  locked?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}
