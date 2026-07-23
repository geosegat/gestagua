export interface ModalityIdentity {
  name: string;
  code?: string | null;
  type?: string | null;
}

export interface ModalityPresentation {
  title: string;
  shortTitle: string;
  group: string;
  category: string | null;
  detail: string | null;
  official: boolean;
}

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleUpperCase('pt-BR');
}

export function modalityPresentation(
  modality: ModalityIdentity,
): ModalityPresentation {
  const name = normalized(modality.name);
  const code = normalized(modality.code);
  const type = normalized(modality.type);

  if (code === 'FPE' || name === 'FPE') {
    return {
      title: 'Florestal em Pé',
      shortTitle: 'Florestal em Pé (FPE)',
      group: 'Grupo A',
      category: 'Conservacionista',
      detail: 'Inclui APP preservada',
      official: true,
    };
  }

  if (
    name.includes('SAF +2') ||
    name.includes('SAF > 2') ||
    (code === 'SAF' && type === 'CONSERVATION')
  ) {
    return {
      title: 'Sistema Agroflorestal implantado há mais de 2 anos',
      shortTitle: 'SAF > 2 anos',
      group: 'Grupo A',
      category: 'Conservacionista',
      detail: null,
      official: true,
    };
  }

  if (code === 'REG' || name === 'REG') {
    return {
      title: 'Restauração de APP por regeneração natural',
      shortTitle: 'APP por regeneração natural (REG)',
      group: 'Grupo B',
      category: 'Restauração',
      detail: null,
      official: true,
    };
  }

  if (code === 'REC' || name === 'REC') {
    return {
      title: 'Restauração de APP por plantio de essências nativas',
      shortTitle: 'APP com essências nativas (REC)',
      group: 'Grupo B',
      category: 'Restauração',
      detail: null,
      official: true,
    };
  }

  if (code === 'SAF' || name === 'SAF') {
    return {
      title: 'Implantação de Sistema Agroflorestal',
      shortTitle: 'Sistema Agroflorestal (SAF)',
      group: 'Grupo C',
      category: 'Produtiva',
      detail: null,
      official: true,
    };
  }

  if (code === 'CAS' || name.includes('CAIXA DE ABELHA')) {
    return {
      title: 'Instalação de caixas de abelha',
      shortTitle: 'Caixas de abelha',
      group: 'Opcional',
      category: null,
      detail: null,
      official: true,
    };
  }

  return {
    title: modality.name,
    shortTitle: modality.name,
    group: 'Sem grupo confirmado',
    category: null,
    detail: null,
    official: false,
  };
}

export function modalityClassification(
  presentation: ModalityPresentation,
): string {
  return presentation.category
    ? `${presentation.group} · ${presentation.category}`
    : presentation.group;
}
