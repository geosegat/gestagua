import type { Request, Response } from 'express';

import { buscaSemAcento } from '../busca';
import config from '../config';
import { getCurrentDb, getPool } from '../db';
import type {
  PaginationQuery,
  Producer,
  ProducerRow,
  TotalRow,
} from '../types';
import { parsePagination } from '../utils/pagination';

function mapProducer(row: ProducerRow): Producer {
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    occupation: row.occupation,
    totalProperties: row.total_propriedades,
  };
}

/**
 * A propriedade entra no Gestágua pelo projeto: é o `projects."programId"` que
 * diz de quem ela é. `$1` é o id do programa.
 */
const PROPRIEDADE_DO_PROGRAMA = `
  scoped_property."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM projects scoped_project
    WHERE scoped_project."propertyId" = scoped_property.id
      AND scoped_project."programId" = $1
      AND scoped_project."deletedAt" IS NULL
      AND scoped_project.status NOT IN ('canceled', 'archived')
  )
`;

/**
 * Só os produtores do Gestágua: a tabela `producers` é da base inteira do ARVO
 * (milhares de nomes, de todos os programas), então sem este filtro a tela de
 * Produtores lista gente que nunca teve projeto aqui.
 */
const PRODUTOR_DO_PROGRAMA = `
  WHERE pd."deletedAt" IS NULL
    AND EXISTS (
      SELECT 1
      FROM properties scoped_property
      WHERE scoped_property."producerId" = pd.id
        AND ${PROPRIEDADE_DO_PROGRAMA}
    )
`;

/** Propriedades do produtor - contando só as do programa, pelo mesmo critério. */
const TOTAL_PROPRIEDADES = `
  (
    SELECT count(*)::int
    FROM properties scoped_property
    WHERE scoped_property."producerId" = pd.id
      AND ${PROPRIEDADE_DO_PROGRAMA}
  ) AS total_propriedades
`;

export async function listar(
  req: Request<object, object, object, PaginationQuery>,
  res: Response,
): Promise<Response> {
  const { page, limit, offset } = parsePagination(req.query);
  const params: string[] = [config.gestaguaProgramId];
  let where = PRODUTOR_DO_PROGRAMA;
  const busca = (req.query.busca ?? '').trim();

  if (busca) {
    params.push(`%${busca}%`);
    where += ` AND ${buscaSemAcento('u.name', `$${params.length}`)}`;
  }

  const db = getPool();
  const totalQuery = await db.query<TotalRow>(
    `SELECT count(*)::int AS total
     FROM producers pd
     LEFT JOIN users u ON u.id = pd."userId"
     ${where}`,
    params,
  );
  const rowsQuery = await db.query<ProducerRow>(
    `SELECT pd.id, u.name, pd.community, pd.occupation,
            ${TOTAL_PROPRIEDADES}
     FROM producers pd
     LEFT JOIN users u ON u.id = pd."userId"
     ${where}
     ORDER BY u.name NULLS LAST
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const total = totalQuery.rows[0]?.total ?? 0;

  return res.json({
    program: 'Gestagua',
    dataSource: getCurrentDb(),
    pagination: {
      page,
      perPage: limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    producers: rowsQuery.rows.map(mapProducer),
  });
}
