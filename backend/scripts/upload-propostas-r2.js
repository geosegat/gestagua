/**
 * Envia as propostas técnicas assinadas para o bucket R2.
 *
 * Lê do diretório já populado por `seed-propostas.js` (arquivos nomeados pelo
 * id do projeto), então o casamento produtor -> projeto acontece uma vez só,
 * lá, com relatório na tela. Aqui é transferência pura.
 *
 * Uso:
 *   node scripts/seed-propostas.js <pasta-origem> --apply    (uma vez)
 *   node scripts/upload-propostas-r2.js                      (simula)
 *   node scripts/upload-propostas-r2.js --apply              (envia)
 *
 * As credenciais saem do .env do backend; nada é pedido por argumento, para
 * não deixar segredo no histórico do shell.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const MIME = { '.pdf': 'application/pdf' };

async function main() {
  const apply = process.argv.includes('--apply');
  const backendDir = path.resolve(__dirname, '..');
  const env = { ...loadEnv(path.join(backendDir, '.env')), ...process.env };

  const missing = ['R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
    .filter((name) => !(env[name] || '').trim());
  if (missing.length) {
    console.error(`faltando no .env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const sourceDir = (env.PROPOSALS_DIR || '').trim();
  if (!sourceDir) {
    console.error('PROPOSALS_DIR não definido — rode scripts/seed-propostas.js antes.');
    process.exit(1);
  }
  const resolvedSource = path.resolve(backendDir, sourceDir);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`diretório de origem não existe: ${resolvedSource}`);
    process.exit(1);
  }

  const prefix = (env.R2_PREFIX || 'propostas').replace(/^\/+|\/+$/g, '');
  const bucket = env.R2_BUCKET.trim();

  const client = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT.trim(),
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(),
    },
  });

  const files = fs
    .readdirSync(resolvedSource, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(resolvedSource, entry.name));

  console.log(`origem: ${resolvedSource}`);
  console.log(`destino: ${bucket}/${prefix}`);
  console.log(`arquivos: ${files.length}\n`);

  let enviados = 0;
  let jaExistiam = 0;
  let falhas = 0;

  for (const file of files) {
    const name = path.basename(file);
    const key = prefix ? `${prefix}/${name}` : name;
    const size = fs.statSync(file).size;

    let existing = null;
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      existing = head.ContentLength ?? 0;
    } catch {
      existing = null;
    }

    if (existing === size) {
      jaExistiam += 1;
      console.log(`  = ${name} (já no bucket, mesmo tamanho)`);
      continue;
    }

    if (!apply) {
      console.log(`  + ${name} (${Math.round(size / 1024)} KB)${existing !== null ? ' [substitui]' : ''}`);
      continue;
    }

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fs.createReadStream(file),
          ContentLength: size,
          ContentType: MIME[path.extname(name).toLowerCase()] || 'application/octet-stream',
        }),
      );
      enviados += 1;
      console.log(`  + ${name} (${Math.round(size / 1024)} KB)`);
    } catch (error) {
      falhas += 1;
      console.log(`  ! ${name}: ${error.message}`);
    }
  }

  console.log(
    `\nresumo: ${apply ? `${enviados} enviados` : `${files.length - jaExistiam} a enviar`}` +
      `, ${jaExistiam} já no bucket` +
      (falhas ? `, ${falhas} falha(s)` : ''),
  );

  if (!apply) console.log('\n(simulação — rode de novo com --apply para enviar)');
  if (falhas) process.exit(1);
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
