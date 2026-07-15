# GestAgua — Backend (API somente leitura)

Express + `pg`, SQL cru, **só GET**. Lê o clone diário do banco do MVGI
(o nome do banco do dia vem do pointer file `banco_ativo.txt`) e serve o
frontend do Gestágua e a prefeitura, protegido por `x-api-key`.

## Rodar

```bash
npm install
cp .env.example .env   # preencha API_KEY e a senha do Postgres
npm run dev            # http://localhost:8080 (tsx, com reload)
# produção: npm run build && npm start  (compila p/ dist/ e roda node dist/server.js)
```

## Estrutura (padrão pra rotas novas)

```
.env                      segredos/ambiente (GITIGNORED — nunca commitar)
.env.example              modelo das variáveis (versionado, sem segredos)
demo.html                 página de demonstração (/demo)
src/
  server.ts               entry: express + auth + rotas (não mexe no dia a dia)
  config.ts               lê o .env (com defaults de dev)
  db.ts                   pool que segue o banco do dia (pointer file)
  log.ts                  log console + arquivo
  middlewares/auth.ts     valida x-api-key (libera /health e /demo)
  routes/index.ts         registro central de rotas
  controllers/
    projetosController.ts    ← EXEMPLO DE REFERÊNCIA do padrão
    produtoresController.ts
    propriedadesController.ts
```

## Como criar uma rota nova (receita)

1. **Controller** em `src/controllers/` com:
   - SQL base (com `"deletedAt" IS NULL` e, quando fizer sentido, o filtro
     do programa `$1 = config.gestaguaProgramId`);
   - função `map<Coisa>(row)` traduzindo colunas do banco pro shape da API
     **em português** (o front nunca vê nome de coluna);
   - handler `async (req, res)` com try/catch, paginação (`page`/`limit`,
     máx 100) e erros `{ erro: "..." }` — copie de `projetosController.listar`.
2. **Registrar** em `src/routes/index.ts`: `router.get('/coisas', ctrl.listar)`.
3. Testar: `curl -H "x-api-key: SUA_CHAVE" http://localhost:8080/coisas`.

Resposta de lista sempre no mesmo formato:

```json
{ "programa": "Gestagua", "dadosDe": "mvgi_clone_2026_07_07",
  "paginacao": { "pagina": 1, "porPagina": 20, "total": 49, "totalPaginas": 3 },
  "coisas": [ ... ] }
```

## Rotas atuais

| Rota                | Status | Descrição                                    |
| ------------------- | ------ | -------------------------------------------- |
| `GET /health`       | ✅     | healthcheck (sem chave)                       |
| `GET /demo`         | ✅     | página de demonstração (sem chave)            |
| `GET /projetos`     | ✅     | lista paginada (`page`, `limit`, `status`)    |
| `GET /projetos/:id` | ✅     | detalhe + tags                                |
| `GET /produtores`   | ✅     | lista paginada (`page`, `limit`, `busca`)     |
| `GET /propriedades` | ✅     | lista paginada                                |
| `GET /mobilizacoes` | ✅     | lista paginada (`page`, `limit`, `busca`)     |

## ⚠️ Dados pessoais (LGPD) — leia antes de expor coisa nova

Esta API foi prometida à prefeitura como **sem dados pessoais** (o rodapé do
demo diz isso). A tabela `producers` tem CPF, RG, telefones, nascimento…

- Na listagem de produtores, exponha o **mínimo**: nome (`users.name` via
  `producers."userId"`), comunidade, ocupação, contagem de propriedades.
- `users.password` **jamais** sai na API, em hipótese nenhuma.
- CPF/RG/telefones só com decisão explícita do time — e nesse caso separar
  a chave/escopo da prefeitura da chave do painel interno primeiro.

## Banco (o que existe no clone)

Tabelas principais: `projects` (→ `stages` → `etapas`; → `properties` →
`addresses`, `watersheds`), `producers` (→ `users` pro nome;
`properties."producerId"` faz o vínculo), `tags`/`projects_tags`.
Tudo somente leitura — o clone é recriado todo dia, **nunca** grave nele.
