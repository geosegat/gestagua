# GestAgua - Backend (API somente leitura)

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
.env                      segredos/ambiente (GITIGNORED - nunca commitar)
.env.example              modelo das variáveis (versionado, sem segredos)
demo.html                 página de demonstração (/demo)
src/
  server.ts                  composição do Express e frontend estático
  config.ts                  ambiente e defaults locais
  db.ts                      pool que segue o banco do dia
  log.ts                     log em console e arquivo
  middlewares/
    auth.ts                  valida x-api-key
    asyncHandler.ts          encaminha rejeições assíncronas
    errorHandler.ts          resposta e log central de exceções
  routes/index.ts            registro central das rotas
  controllers/
    projectsController.ts
    producersController.ts
    propertiesController.ts
    projectModalitiesController.ts
    projectStagesController.ts
  types/                     contratos, linhas SQL e parâmetros por domínio
  utils/
    pagination.ts            normalização de page/limit
    validation.ts            validações reutilizáveis
```

## Como criar uma rota nova (receita)

1. Declare linhas SQL, parâmetros e respostas em `src/types/<dominio>.ts`.
2. Crie o controller em `src/controllers/`, usando `parsePagination` quando
   houver lista paginada. Exceções devem subir para o middleware central.
3. Registre em `src/routes/index.ts` com `asyncHandler(controller)`.
4. Teste status HTTP e corpo com uma chave válida e uma inválida.

Resposta de lista sempre no mesmo formato:

```json
{ "program": "Gestagua", "dataSource": "mvgi_clone_2026_07_07",
  "pagination": { "page": 1, "perPage": 20, "total": 49, "totalPages": 3 },
  "projects": [ ... ] }
```

## Rotas atuais

| Rota                | Status | Descrição                                    |
| ------------------- | ------ | -------------------------------------------- |
| `GET /health`       | ✅     | healthcheck (sem chave)                       |
| `GET /demo`         | ✅     | página de demonstração (sem chave)            |
| `GET /dashboard`    | ✅     | resumo ativo; aceita `ano=AAAA`               |
| `GET /indicadores`  | ✅     | APP, restauração, pagamentos e carbono; aceita `ano=AAAA` |
| `GET /projetos`     | ✅     | lista paginada (`page`, `limit`, `status`, `ano`) |
| `GET /projetos/:id` | ✅     | detalhe + tags                                |
| `GET /projetos/:id/modalidades` | ✅ | modalidades, culturas e insumos      |
| `GET /projetos/:id/etapas` | ✅ | jornada e progresso das etapas              |
| `GET /projetos/:id/etapas/:stageId/atividades` | ✅ | atividades da etapa    |
| `GET /produtores`   | ✅     | lista paginada (`page`, `limit`, `busca`)     |
| `GET /propriedades` | ✅     | lista paginada                                |
| `GET /mobilizacoes` | ✅     | lista paginada (`page`, `limit`, `busca`)     |
| `GET /programs`     | ✅     | programas disponíveis no espelho              |

### Ano de referência

`GET /dashboard`, `GET /indicadores` e `GET /projetos` aceitam `ano=AAAA`.
O ano usa a data de emissão do contrato e, quando ela não foi preenchida,
usa a data de criação do projeto. A resposta de dashboard e indicadores
também devolve `filters.availableYears`.

### Cobertura dos indicadores

`GET /indicadores` não transforma campo vazio em resultado confirmado:

- área restaurada usa `lands.realizedLandArea` e devolve
  `restoredAreaCoverage`;
- área planejada em APP usa `lands.permanentPreservationArea` e devolve
  `appAreaCoverage`;
- pagamentos comparam `installments.isExecuted` e `installments.paidAt`;
- carbono devolve o catálogo e sua cobertura, mas mantém
  `totalStoredCarbon: null` até a definição da regra de cálculo e unidade.

## ⚠️ Dados pessoais (LGPD) - leia antes de expor coisa nova

Esta API foi prometida à prefeitura como **sem dados pessoais** (o rodapé do
demo diz isso). A tabela `producers` tem CPF, RG, telefones, nascimento…

- Na listagem de produtores, exponha o **mínimo**: nome (`users.name` via
  `producers."userId"`), comunidade, ocupação, contagem de propriedades.
- `users.password` **jamais** sai na API, em hipótese nenhuma.
- CPF/RG/telefones só com decisão explícita do time - e nesse caso separar
  a chave/escopo da prefeitura da chave do painel interno primeiro.

## Banco (o que existe no clone)

Tabelas principais: `projects` (→ `stages` → `etapas`; → `properties` →
`addresses`, `watersheds`), `producers` (→ `users` pro nome;
`properties."producerId"` faz o vínculo), `tags`/`projects_tags`.
Tudo somente leitura - o clone é recriado todo dia, **nunca** grave nele.
