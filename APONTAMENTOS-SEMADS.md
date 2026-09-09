# Apontamentos da SEMADS: repasse de tarefas

Contexto para quem vai executar. A Prefeitura de Alegre (SEMADS) emitiu o
relatório de análise do **Item 06 do Contrato 174/2025** avaliando a plataforma
do GestÁgua. Este documento traduz cada apontamento do ofício em tarefa, com a
causa já localizada no código.

Antes de começar, leia a seção **"O que NÃO é tarefa de código"** no fim. Metade
dos apontamentos do ofício é preenchimento de cadastro, não bug, e tentar
"consertar" no front vai gerar retrabalho.

## Estado dos dados na data deste documento

Números vindos de `GET /publico/portal` em produção (rota aberta, não precisa de
chave, dá para conferir no navegador):

| Indicador | Valor |
| --- | --- |
| Projetos ativos | 20 |
| Propriedades ativas | 20 |
| Área total | 227,47 ha |
| Implantações | 47 (sendo 27 Caixa de Abelha, que não tem área) |
| Comunidades retornadas pela API | 9 |
| Área realizada | 0 ha em todas as modalidades |

Guarde esses números. Várias tarefas abaixo são "o número da tela tem que bater
com o da API".

---

## Tarefa 1: a 20ª propriedade some do índice de comunidades

**O que a prefeitura escreveu:** "o Programa possui 20 projetos contemplados,
correspondentes a 20 propriedades distintas. Entretanto, no índice denominado
'Área acompanhada por comunidade', a ferramenta apresenta o somatório de 19
propriedades."

**Causa:** [`frontend/src/pages/PublicResultsPage.tsx:172`](frontend/src/pages/PublicResultsPage.tsx#L172)

```ts
.filter((community) => community.totalAreaHa > 0)
```

A API devolve 9 comunidades. A nona é `Lagoa Seca`, com 1 propriedade e
`totalAreaHa: 0`, porque a propriedade "Lagoa seca" está sem área cadastrada na
origem. Esse filtro descarta a comunidade inteira, e a 20ª propriedade vai
junto. O backend está certo, quem esconde é a tela.

**Comportamento esperado:** a comunidade aparece na lista mesmo com área zero,
com a barra vazia e a área escrita como "não informada" em vez de "0 ha". O
importante é o programa nunca parecer menor do que é: a contagem de
propriedades somada na tela precisa fechar em 20.

Cuidado ao mexer: existe um `.slice(0, 10)` logo abaixo e um rótulo que muda
para "10 maiores" quando a lista chega em 10
([`PublicResultsPage.tsx:326`](frontend/src/pages/PublicResultsPage.tsx#L326)).
Com 9 comunidades hoje isso não dispara, mas não quebre esse caminho.

**Como testar:** abrir o portal público e somar as propriedades listadas no card
"Área acompanhada por comunidade". Tem que dar 20, e `Lagoa Seca` tem que estar
na lista.

---

## Tarefa 2: a mesma página mostra três contagens que se contradizem

**O que a prefeitura escreveu:** não escreveu, e é sorte nossa. Foi encontrado
na análise e é o mesmo problema da Tarefa 1 vazando por outro lugar. Se eles
rolarem a página, acham.

**Causa:** três números sobre a mesma coisa, calculados de três jeitos:

| Onde | Linha | Fonte | Mostra hoje |
| --- | --- | --- | --- |
| Rótulo do card de comunidades | [`PublicResultsPage.tsx:328`](frontend/src/pages/PublicResultsPage.tsx#L328) | lista **filtrada** | 8 comunidades |
| Faixa "território" no rodapé | [`PublicResultsPage.tsx:424`](frontend/src/pages/PublicResultsPage.tsx#L424) | lista **crua** | 9 comunidades |
| Faixa "território" no rodapé | [`PublicResultsPage.tsx:420`](frontend/src/pages/PublicResultsPage.tsx#L420) | `summary.activeProperties` | 20 propriedades |

**Comportamento esperado:** a página inteira concorda. Resolvendo a Tarefa 1 o
8 vira 9 sozinho, mas confirme os três pontos em vez de assumir.

**Como testar:** abrir o portal público e comparar o rótulo do card com a faixa
do rodapé. Os dois números de comunidade têm que ser iguais.

---

## Tarefa 3: propriedade sem CAR desaparece do mapa

**O que a prefeitura escreveu:** "No índice propriedades, foram apresentados os
códigos do imóvel CAR, só o da Alessandra Costa Sapavine Gonçalves que não foi
disponibilizado."

Eles não perceberam a consequência, mas ela está no print deles: o cabeçalho da
lista do mapa diz **"19 de 19 · 18 no mapa"**, e não 20.

**Causa:** [`frontend/src/pages/PropertyMapPage.tsx:31`](frontend/src/pages/PropertyMapPage.tsx#L31)

```ts
() => (data?.properties ?? []).filter((p) => carOf(p)),
```

Quem não tem CAR é removido da lista antes de qualquer coisa, então some da tela
e do contador em
[`PropertyMapPage.tsx:185`](frontend/src/pages/PropertyMapPage.tsx#L185). Os
"18 no mapa" são outra história e estão corretos: uma propriedade tem CAR mas o
SICAR não devolve geometria, e ela já aparece sinalizada.

**Comportamento esperado:** propriedade sem CAR continua na lista, desabilitada,
com um aviso do mesmo estilo do "sem geometria no CAR" que já existe em
[`PropertyMapPage.tsx:216`](frontend/src/pages/PropertyMapPage.tsx#L216). Texto
sugerido: "sem CAR cadastrado". O contador passa a dizer "20 de 20 · 18 no
mapa".

A lacuna some da tela hoje. O certo é ela ficar visível, porque é assim que
alguém repara e vai preencher.

**Como testar:** abrir o mapa no painel e conferir que o contador fecha em 20 e
que a propriedade "Boa Esperança" aparece na lista, desabilitada e com o aviso.

---

## Tarefa 4: a mesma área escrita diferente em duas telas

**O que a prefeitura escreveu:** apontaram divergência entre o mapa e a proposta
técnica. Parte disso não é nosso (ver o fim do documento), mas essa parte é, e
alimenta a desconfiança deles.

**Causa:** duas formatações diferentes para o mesmo campo.

| Tela | Linha | Resultado |
| --- | --- | --- |
| Tabela de Propriedades | [`PropertiesPage.tsx:27`](frontend/src/pages/PropertiesPage.tsx#L27), com `maximumFractionDigits: 2` | `10,08 ha` |
| Lista do mapa | [`PropertyMapPage.tsx:213`](frontend/src/pages/PropertyMapPage.tsx#L213), via `formatNumber` | `10,082 ha` |

O `formatNumber` em [`frontend/src/lib/format.ts:4`](frontend/src/lib/format.ts#L4)
usa `toLocaleString('pt-BR')` sem limite, e o padrão da locale são 3 casas.

**Comportamento esperado:** área sempre com no máximo 2 casas, em qualquer tela.
Vale criar um `formatArea` em `lib/format.ts` e usar nos dois lugares em vez de
duplicar a regra. Procure outros pontos que imprimem área antes de fechar.

Atenção: `formatNumber` é usado para muita coisa que não é área (contagens,
nascentes, projetos). Não mude o comportamento dele, crie o helper novo.

**Como testar:** comparar a área da propriedade "PA Paraíso" na tabela de
Propriedades e na lista do mapa. Tem que ler igual nos dois.

---

## Já corrigido: log de sincronização

Não é tarefa de ninguém, está registrado só para quem for ler o histórico.

O painel mostrava `Baixando os dados do sistema (Azure)â€¦` porque o
`sync-worker.ps1` tinha `…` no texto e o PowerShell 5.1 lê o arquivo como ANSI.
E a linha final dizia "o site esta com 1481 projetos", contando a tabela
`projects` inteira, de todos os clientes da ARVO, em vez dos 20 do GestÁgua.

Os dois foram corrigidos em `backend/scripts/sync-worker.ps1`: o script agora é
100% ASCII e a conferência final filtra pelo `programId` do programa, com a
mesma regra da API. A mensagem passou a ser "o Gestagua esta com N projetos
ativos".

**Pendência operacional, não de código:** a cópia que roda em produção fica em
`C:\arvo-sync\sync-worker.ps1` na VPS e precisa ser atualizada lá também, senão
o painel continua mostrando o texto antigo. Ver
[`backend/SYNC_RAILWAY.md`](backend/SYNC_RAILWAY.md).

---

## O que NÃO é tarefa de código

Três apontamentos do ofício são **preenchimento de cadastro no sistema da ARVO**.
A API do GestÁgua é somente leitura: ela mostra o que existe no banco. Não tente
resolver no front.

1. **CAR da Alessandra ausente.** O código
   `ES-3200201-E6EAD89B5F9042E596F32BD384C57F83` consta na proposta técnica mas
   não está em `properties.propertyCode`. Preencher na origem e sincronizar.
2. **Área realizada e área de APP em branco.** Hoje a área realizada é 0 em
   todas as modalidades. Vale saber, para responder ao ofício, que das 47
   implantações **27 são Caixa de Abelha**, que não tem área por natureza. As de
   área são 20, e essas já têm área planejada (17,57 ha). O que falta é a área
   realizada, que só passa a existir depois do monitoramento em campo. A
   redação do ofício ("não preenchidas nas 47 implantações") está imprecisa.
3. **Área da propriedade "Lagoa seca" em branco.** É a causa raiz da Tarefa 1.
   Corrigir na origem faz o sintoma sumir, mas **a Tarefa 1 continua valendo**:
   a tela não pode esconder dado incompleto, ela tem que mostrar que está
   incompleto.

Sobre a divergência entre o mapa e a proposta técnica (PA Paraíso 10,08 ha no
sistema contra 10,5 ha na proposta): são dois objetos diferentes. O mapa desenha
o **polígono do CAR** vindo do SICAR, a prancha da proposta desenha a **ATP
declarada**. Divergir alguns décimos é esperado. E no caso da propriedade
"Roseira" é a proposta que está com a ATP em branco, não o sistema.

---

## Convenções da casa

Regras já estabelecidas no projeto. Seguir sem precisar perguntar:

- **Nada de gradiente.** Fundo sempre chapado, em qualquer tela.
- **Copy sem travessão.** Não usar `—` em texto de interface.
- **Ícone Remix puro.** Sem chip ou fundo colorido atrás do ícone.
- **Portal público não expõe dado pessoal.** Nome de produtor, CAR e coordenada
  não saem por `/publico/portal`. Se um dado novo precisar aparecer lá, ele é
  adicionado de forma explícita no `publicPortalController`, nunca reaproveitando
  as rotas autenticadas do painel. Isso vale especialmente para a Tarefa 1: ao
  mexer no card de comunidades, não puxe dado de outra rota.

## Como rodar

```bash
cd frontend
npm install
npm run dev
```

O painel pede a chave `x-api-key` na entrada. Peça a chave ao responsável, ela
não está no repositório. O portal público (`/`) abre sem chave e é onde estão as
Tarefas 1 e 2.

Antes de abrir PR, rode:

```bash
npm run build
```

Aviso: o `frontend/README.md` tem trechos desatualizados (cita arquivos que não
existem mais, como `lib/api.ts` e `LoginPage.tsx`). Confie no código, não nele.
