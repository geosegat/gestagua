import type { RemixiconComponentType } from '../icons';

export interface NavItem {
  id: string;
  label: string;
  icon: RemixiconComponentType;
  path: string;
  locked?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}
