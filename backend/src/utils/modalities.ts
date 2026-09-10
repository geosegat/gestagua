/**
 * Modalidade que se mede em ÁREA, ou em unidade instalada?
 *
 * A caixa de abelha é a exceção do programa: ela conta colmeia, não hectare.
 * Nenhuma das lands dela tem `totalArea` preenchida - e como ela responde pela
 * maior parte dos registros (27 de 47), somá-la ao total de "implantações"
 * inflava o número e estragava as coberturas de APP e área restaurada, que
 * apareciam como "preenchidas em 20 de 47" quando o denominador real era 20.
 *
 * Por isso as duas contagens andam separadas: implantações de área de um lado,
 * caixas de abelha do outro. Nenhuma informação some; elas só param de ser
 * somadas como se medissem a mesma coisa.
 */

export interface ModalidadeIdentidade {
  code?: string | null;
  name?: string | null;
}

function normalizado(valor: string | null | undefined): string {
  return (valor ?? '').trim().toLocaleUpperCase('pt-BR');
}

/** A modalidade é caixa de abelha? (mesmo critério do lib/modalities do front) */
export function ehCaixaDeAbelha(modality: ModalidadeIdentidade): boolean {
  return (
    normalizado(modality.code) === 'CAS' ||
    normalizado(modality.name).includes('CAIXA DE ABELHA')
  );
}

/** A modalidade se mede em área (hectares)? */
export function ehModalidadeDeArea(modality: ModalidadeIdentidade): boolean {
  return !ehCaixaDeAbelha(modality);
}

/**
 * Soma as implantações separando as que se medem em área das caixas de abelha.
 * Os três controllers que publicam esse total (indicadores, dashboard e portal
 * público) usam esta função, pra nunca divergirem entre si.
 */
export function separarImplantacoes<T extends ModalidadeIdentidade>(
  modalities: T[],
  quantidade: (modality: T) => number,
): { areaImplementations: number; beehiveInstallations: number } {
  let areaImplementations = 0;
  let beehiveInstallations = 0;

  for (const modality of modalities) {
    if (ehCaixaDeAbelha(modality)) beehiveInstallations += quantidade(modality);
    else areaImplementations += quantidade(modality);
  }

  return { areaImplementations, beehiveInstallations };
}
