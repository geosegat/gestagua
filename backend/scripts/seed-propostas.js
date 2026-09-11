/**
 * Popula o diretório de propostas técnicas (PROPOSALS_DIR) a partir de uma
 * pasta de PDFs assinados, nomeando cada arquivo com o id do projeto.
 *
 * O casamento é determinístico, em duas passadas, e nunca por similaridade de
 * nome de produtor — os nomes divergem entre as fontes ("Renan Batista" no
 * banco x "Renan Baptista" no arquivo), então adivinhar aqui trocaria a
 * proposta de um produtor pela de outro:
 *
 *   1. `documents.name` idêntico ao nome do arquivo;
 *   2. para o que sobrar, `documents.fileSize` idêntico ao tamanho do arquivo
 *      (usado pelos uploads que chegaram com nome curto do DOS, `PROPOS~2.PDF`),
 *      exigindo que o tamanho seja único dos dois lados.
 *
 * Uso:
 *   node scripts/seed-propostas.js <pasta-de-origem> [--apply]
 *
 * Sem --apply ele só relata o que faria.
 */
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const PROPOSAL_ACTIVITY_NAME = 'Projeto técnico';
const GESTAGUA_PROGRAM_ID = 'e0c5918f-32a5-44bd-917d-ad43fd3111b0';

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function buildPool(backendDir) {
  const env = { ...loadEnv(path.join(backendDir, '.env')), ...process.env };
  const cs = (env.DATABASE_URL || '').trim();
  if (cs) return new Pool({ connectionString: cs });

  const pointer = path.join(backendDir, 'banco_ativo.txt');
  return new Pool({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD,
    database: fs.readFileSync(pointer, 'utf8').trim(),
  });
}

/** Agrupa por chave e devolve só as chaves com exatamente uma ocorrência. */
function uniqueBy(items, keyOf) {
  const buckets = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  return new Map([...buckets].filter(([, v]) => v.length === 1).map(([k, v]) => [k, v[0]]));
}

async function main() {
  const [sourceDir, ...flags] = process.argv.slice(2);
  const apply = flags.includes('--apply');

  if (!sourceDir) {
    console.error('uso: node scripts/seed-propostas.js <pasta-de-origem> [--apply]');
    process.exit(1);
  }
  if (!fs.existsSync(sourceDir)) {
    console.error(`pasta de origem não encontrada: ${sourceDir}`);
    process.exit(1);
  }

  const backendDir = path.resolve(__dirname, '..');
  const env = { ...loadEnv(path.join(backendDir, '.env')), ...process.env };
  const targetDir = (env.PROPOSALS_DIR || '').trim();

  if (!targetDir) {
    console.error('PROPOSALS_DIR não definido no .env do backend — defina antes de rodar.');
    process.exit(1);
  }
  const resolvedTarget = path.resolve(backendDir, targetDir);

  const pool = buildPool(backendDir);
  const { rows } = await pool.query(
    `SELECT p.id AS "projectId",
            d.name AS "documentName",
            d."fileSize",
            d."filePath",
            u.name AS "producerName"
       FROM projects p
       JOIN activities a
         ON a."projectId" = p.id AND a."deletedAt" IS NULL AND a.name = $1
       JOIN documents d
         ON d.id = a."documentId" AND d."deletedAt" IS NULL
       LEFT JOIN properties pr ON pr.id = p."propertyId"
       LEFT JOIN producers prod ON prod.id = pr."producerId"
       LEFT JOIN users u ON u.id = prod."userId"
      WHERE p."deletedAt" IS NULL AND p."programId" = $2`,
    [PROPOSAL_ACTIVITY_NAME, GESTAGUA_PROGRAM_ID],
  );
  await pool.end();

  const files = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = path.join(sourceDir, entry.name);
      return { name: entry.name, full, size: fs.statSync(full).size };
    });

  console.log(`documentos no banco: ${rows.length} | arquivos na origem: ${files.length}\n`);

  const filesByName = uniqueBy(files, (f) => f.name);
  const filesBySize = uniqueBy(files, (f) => f.size);
  const docsBySize = uniqueBy(rows, (r) => r.fileSize);

  const plan = [];
  const unmatched = [];
  const usedFiles = new Set();

  for (const row of rows) {
    const byName = filesByName.get(row.documentName);
    if (byName) {
      plan.push({ row, file: byName, how: 'nome' });
      usedFiles.add(byName.full);
      continue;
    }

    // fallback por tamanho: só vale se o tamanho identifica um único documento
    // E um único arquivo, senão é palpite
    const bySize = filesBySize.get(row.fileSize);
    if (bySize && docsBySize.has(row.fileSize) && !usedFiles.has(bySize.full)) {
      plan.push({ row, file: bySize, how: 'tamanho' });
      usedFiles.add(bySize.full);
      continue;
    }

    unmatched.push(row);
  }

  for (const item of plan) {
    const extension = path.extname(item.file.name) || '.pdf';
    item.target = path.join(resolvedTarget, `${item.row.projectId}${extension}`);
    console.log(
      `  [${item.how.padEnd(8)}] ${(item.row.producerName || '?').padEnd(40)} <- ${item.file.name}`,
    );
  }

  if (unmatched.length) {
    console.log(`\n  ${unmatched.length} sem correspondência:`);
    for (const row of unmatched) {
      console.log(`    ${(row.producerName || '?').padEnd(40)} banco: "${row.documentName}" (${row.fileSize} bytes)`);
    }
  }

  const leftover = files.filter((f) => !usedFiles.has(f.full));
  if (leftover.length) {
    console.log(`\n  ${leftover.length} arquivo(s) da origem sem uso:`);
    for (const f of leftover) console.log(`    ${f.name}`);
  }

  console.log(`\nresumo: ${plan.length} casados, ${unmatched.length} sem par, ${leftover.length} sobrando`);

  if (!apply) {
    console.log('\n(simulação — rode de novo com --apply para copiar)');
    return;
  }

  fs.mkdirSync(resolvedTarget, { recursive: true });
  for (const item of plan) fs.copyFileSync(item.file.full, item.target);
  console.log(`\ncopiados ${plan.length} arquivo(s) para ${resolvedTarget}`);
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
