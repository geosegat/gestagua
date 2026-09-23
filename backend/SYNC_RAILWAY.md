# Sincronizacao dos dados: Azure -> Railway

Como os dados do GestAgua chegam no site.

```text
Azure (arvo_stage)  --pg_dump-->  arquivo  --pg_restore-->  Railway
                    \___________ sync-worker.ps1, na VPS ___________/
```

O worker puxa **direto do Azure**. Ele nao passa pelo Postgres local da VPS e
nao usa o `banco_ativo.txt`. A cada etapa ele avisa a API
(`POST /admin/sync event=log`), e o painel mostra o progresso ao vivo. A VPS so
faz chamadas de saida, sem abrir porta nenhuma.

## Onde as coisas ficam na VPS

| Item | Caminho |
| --- | --- |
| Worker em producao | `C:\arvo-sync\sync-worker.ps1` |
| Pasta de trabalho (dump temporario) | `C:\arvo-sync\tmp` |
| App da API legada | `C:\arvo-sync\api-prefeitura` |

O worker fica na **raiz** do `C:\arvo-sync`, nao dentro de
`api-prefeitura\scripts`. A copia versionada deste repositorio esta em
`backend/scripts/sync-worker.ps1`: ao mudar o script, atualize a VPS tambem.

O `sync-agent.ps1` ao lado e a versao antiga, substituida pelo worker. Ignore.

## Variaveis de ambiente (escopo Machine, definir uma vez)

```powershell
setx /M GESTAGUA_API_URL     "https://gestagua-production.up.railway.app"
setx /M GESTAGUA_API_KEY     "a mesma chave do x-api-key"
setx /M GESTAGUA_AZURE_URL   "connection string do Postgres do Azure (origem)"
setx /M GESTAGUA_TARGET_URL  "connection string PUBLICA do Postgres da Railway"
```

Use a `DATABASE_PUBLIC_URL` da Railway, nunca a URL privada `railway.internal`:
a VPS esta fora da rede da Railway. Nao coloque esses valores no Git nem no
`.env.example`.

> **Armadilha ja paga.** O `GESTAGUA_API_KEY` e a **mesma** chave usada em
> outros dois lugares: o login do painel e a variavel `API_KEY` da Railway.
> Trocar a chave e esquecer da VPS derruba a sincronizacao **em silencio**: o
> worker toma 401 na primeira chamada e nada e publicado. Foi o que aconteceu
> entre 24/07/2026 e 08/09/2026, seis semanas sem ninguem perceber. Ao trocar a
> chave, troque nos tres lugares.

## Trocar o banco de origem

O banco que o worker copia vem so do `GESTAGUA_AZURE_URL`. Em 09/2026 a origem
passou de `mvgi_stage` para `arvo_stage`, no mesmo servidor. Se mudar de novo so
o nome, na VPS, num PowerShell como administrador:

```powershell
[Environment]::SetEnvironmentVariable('GESTAGUA_AZURE_URL', ([Environment]::GetEnvironmentVariable('GESTAGUA_AZURE_URL','Machine') -replace 'arvo_stage','NOVO_BANCO'), 'Machine')
```

O usuario do dump (`arvo_dump`) precisa de leitura no banco novo, em **todos**
os schemas que o `pg_dump` copia (em 09/2026, `public` e `portal_stage`). Rode
no banco novo, logado com o dono das tabelas:

```sql
GRANT USAGE ON SCHEMA public, portal_stage TO arvo_dump;
GRANT SELECT ON ALL TABLES IN SCHEMA public, portal_stage TO arvo_dump;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public, portal_stage TO arvo_dump;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, portal_stage GRANT SELECT ON TABLES TO arvo_dump;
```

Sem isso o painel mostra so "pg_dump do Azure falhou (codigo 1)". O motivo real
(`permission denied for table ...`) so aparece rodando o worker na mao. Passe o
valor novo direto, porque uma janela aberta antes da troca ainda enxerga o antigo:

```powershell
& "C:\arvo-sync\sync-worker.ps1" -Force -AzureUrl ([Environment]::GetEnvironmentVariable('GESTAGUA_AZURE_URL','Machine'))
```

O teste que vale e o botao "Atualizar dados": ele roda pela tarefa agendada, o
mesmo caminho do sync diario. Na troca de 09/2026 a tarefa enxergou o valor novo
sem reiniciar a VPS.

## Tarefas agendadas

Duas tarefas, com papeis diferentes:

```powershell
schtasks /create /f /tn "GestaguaSyncWorker" /sc minute /mo 2 /ru SYSTEM /rl HIGHEST /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\arvo-sync\sync-worker.ps1"
```

```powershell
schtasks /create /f /tn "GestaguaSyncDiario" /sc daily /st 04:30 /ru SYSTEM /rl HIGHEST /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\arvo-sync\sync-worker.ps1 -Force"
```

- **GestaguaSyncWorker** roda a cada 2 minutos **sem** `-Force`. Sem `-Force` o
  worker so trabalha se encontrar um pedido `pending`, ou seja, se alguem clicou
  em "Atualizar dados" no painel. Nos outros ciclos ele faz um GET, ve `idle` e
  sai em um segundo. **E esta tarefa que faz o botao do painel funcionar.** Sem
  ela o clique fica em "Na fila" para sempre.
- **GestaguaSyncDiario** roda uma vez por dia **com** `-Force`, garantindo que o
  site atualiza mesmo que ninguem clique. 04:30 evita disputar rede com o
  `ArvoCloneBanco`, que roda por volta das 04:00.

Ambas rodam como `SYSTEM`, que enxerga as variaveis de escopo Machine.

Os horarios sao do relogio da VPS, que nao esta no horario de Brasilia (em
09/2026, 4h atras). As 04:30 do `GestaguaSyncDiario` caem as 08:30 de Brasilia,
em horario de expediente.

Conferir:

```powershell
Get-ScheduledTask -TaskName "Gestagua*" | Get-ScheduledTaskInfo | Select-Object TaskName, LastRunTime, LastTaskResult, NextRunTime | Format-Table -AutoSize
```

## Rodar na mao

```powershell
& "C:\arvo-sync\sync-worker.ps1" -Force     # roda agora, ignorando o botao
& "C:\arvo-sync\sync-worker.ps1"            # so roda se houver pedido pendente
& "C:\arvo-sync\sync-worker.ps1" -WhatIf    # mostra o que faria, sem tocar em nada
```

## Detalhes que confundem

- **A conferencia final diz "o Gestagua esta com N projetos ativos"** e usa a
  mesma regra da API (filtra `programId`, ignora deletados, cancelados e
  arquivados), entao o numero bate com o painel. Ate 09/2026 ela contava a
  tabela `projects` inteira e mostrava ~1500, o total de todos os clientes da
  ARVO. Se voce ainda ve esse numero, a VPS esta com a copia velha do script.
- **O espelho na Railway carrega o banco inteiro da ARVO.** O que separa um
  cliente do outro e o filtro `programId` em cada query. Rota nova sem esse
  filtro expoe dado de outro cliente.
- **Avisos do `pg_restore`** sobre owner e extensao sao normais e o script os
  ignora de proposito. Quem decide sucesso e a conferencia com `psql` no fim.
- **`--clean --if-exists`** deixa a Railway inconsistente por alguns segundos
  durante o restore. Com o volume atual e rapido, mas e a janela em que o site
  pode oscilar. Evite rodar com a prefeitura olhando.
- **`sync-state.json`** mora em disco efemero na Railway. Um redeploy zera o
  historico e o "atualizado em" do painel. O que se perde e so o indicador.
- **Nao existe alerta de falha.** Se o sync quebrar de madrugada, ninguem sabe
  ate abrir o painel. Melhoria pendente.

## O que e legado

Nao confundir com o fluxo acima:

- **`ArvoCloneBanco`** (tarefa agendada) clona o Azure para o Postgres **local**
  da VPS e atualiza o `banco_ativo.txt`. Nao encosta na Railway.
- **`scripts/sync-railway.ps1`** publicava do Postgres local da VPS para a
  Railway. Substituido pelo `sync-worker.ps1`, que vai direto na origem.
- **`banco_ativo.txt` e o `POINTER_FILE`** pertencem a esse fluxo antigo, em que
  a API lia o clone do dia na propria VPS.
