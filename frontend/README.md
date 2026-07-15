# GestAgua — Frontend

React + TypeScript + Vite + Tailwind v4. Consome o **backend** em
`../backend` (a `api-prefeitura`) — a API somente leitura do programa Gestágua.
Visual e fluxo herdados do demo aprovado (`../backend/demo.html`):
paleta petróleo/aqua, fontes Fraunces + Archivo, gate de chave, stats, filtros,
tabela e modal de detalhe.

## Rodar em dev

```bash
npm install
npm run dev   # http://localhost:5174
```

O Vite faz proxy de `/projetos` e `/health` para `http://localhost:8080`
(porta do backend). Para testar com dados reais em dev, rode o backend
localmente (`node server.js` em `../backend`, com um `config.js` apontando
pra um Postgres com o espelho).

Sem API no ar, a tela mostra o gate de chave com o erro de conexão — o
comportamento é o mesmo do demo.

## Autenticação

A API exige o header `x-api-key`. O acesso é por uma **tela de login**
(`/login`, estilo MVGI: painel da marca + card de acesso): a chave é validada
contra a própria API antes de entrar, fica salva em `localStorage`
(`gestagua_key`) e vai em toda requisição. Sem chave → redireciona pro login;
401 em uso → chave descartada e volta pro login; "Sair" no drawer limpa a chave.

## Build / deploy

```bash
npm run build   # gera dist/
```

Servir o `dist/` **na mesma origem da api-prefeitura** (é o padrão, com
`VITE_API_URL` vazio → chamadas relativas a `/projetos`). Para hospedar o
front separado da API, defina `VITE_API_URL` com a URL pública dela.

## White-label (drawer + tema)

O produto é um **shell** com drawer lateral temável (mesma UX do drawer do MVGI:
rail colapsado, expande no hover, pin, seções) — mas **100% orientado a dados**:

- **Tema**: o admin muda cores/nome/logo em **/personalizacao** (preview ao vivo).
  O `BrandingProvider` deriva a paleta (hover/deep/soft/contraste) de só 2 cores
  e escreve CSS variables no `:root`. Salva em `localStorage`; **Exportar JSON**
  gera o tema oficial pra versionar (pronto pra virar rota de backend depois).
- **Menu**: definido em `src/navigation/config.ts` (seções → itens → ícone/rota).
  O admin liga/desliga itens e renomeia labels pelo painel.
- **Tokens**: utilitários `bg-brand`, `text-on-brand`, `bg-accent`... via
  `@theme inline`. Os nomes legados `petrol`/`aqua` são aliases da marca, então
  todos os componentes recolorem juntos.

## Estrutura

```
src/
  App.tsx                     router + BrandingProvider + shell
  branding/                   white-label: tipos, derivação de cores,
                              presets, contexto (localStorage/export/import)
  navigation/config.ts        menu do produto (dados, não código)
  components/
    drawer/Drawer.tsx         drawer temável (UX do MVGI) + Sair
    shell/AppShell.tsx        drawer + área de conteúdo
    DataTableCard/FilterChips/ProjectModal/Stats/StatusBadge
  pages/
    LoginPage.tsx             login (valida a chave na API antes de entrar)
    Overview.tsx              dashboard do programa (stats, barras, recentes)
    ProjectsPage.tsx          consulta (stats, filtros, tabela, modal)
    PersonalizationPage.tsx   painel do admin (cores, identidade, menu, backup)
    PlaceholderPage.tsx       telas ainda não implementadas
  lib/api.ts                  cliente da api-prefeitura + chave
  lib/format.ts               formatação
  lib/usePaginatedList.ts     estado das listagens paginadas
  index.css                   tokens fixos + tokens de marca (@theme inline)
```
