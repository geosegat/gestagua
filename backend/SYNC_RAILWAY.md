# Sincronizacao VPS -> Railway

O PostgreSQL da Railway e uma copia persistente e nao acompanha o clone diario
da VPS sozinho. O script `scripts/sync-railway.ps1` le o banco apontado por
`C:\arvo-sync\banco_ativo.txt`, gera um dump e restaura esse conteudo no banco
fixo da Railway.

## 1. Preparar os segredos na VPS

Abra PowerShell como administrador e defina duas variaveis de ambiente da
maquina. Use a `DATABASE_PUBLIC_URL` do servico Postgres da Railway, nunca a URL
privada `railway.internal`:

```powershell
[Environment]::SetEnvironmentVariable(
  "GESTAGUA_SOURCE_DB_PASSWORD",
  "SENHA_DO_POSTGRES_DA_VPS",
  "Machine"
)

[Environment]::SetEnvironmentVariable(
  "GESTAGUA_RAILWAY_DATABASE_PUBLIC_URL",
  "DATABASE_PUBLIC_URL_COPIADA_DA_RAILWAY",
  "Machine"
)
```

Feche e abra o PowerShell para carregar as variaveis. Nao coloque esses valores
no Git, no `.env.example` ou no comando da tarefa agendada.

## 2. Fazer a primeira carga

Na VPS, a partir da pasta do backend:

```powershell
.\scripts\sync-railway.ps1
```

O script valida a conexao, cria um dump temporario, restaura tudo em uma unica
transacao e confirma a quantidade de projetos. O log fica em:

```text
C:\arvo-sync\logs\sync-railway.log
```

## 3. Automatizar depois do clone diario

O melhor ponto para executar a sincronizacao e no final do script que atualiza
`banco_ativo.txt`, somente depois de o clone terminar com sucesso:

```powershell
& "C:\arvo-sync\api-prefeitura\scripts\sync-railway.ps1"
if ($LASTEXITCODE -ne 0) {
  throw "A sincronizacao com a Railway falhou."
}
```

Se o caminho real do backend na VPS for diferente, ajuste-o. Como alternativa,
crie uma tarefa diaria alguns minutos depois da tarefa do clone:

```powershell
schtasks /create /f /tn "GestaguaSyncRailway" /sc daily /st 03:30 /ru SYSTEM /rl HIGHEST /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\arvo-sync\api-prefeitura\scripts\sync-railway.ps1"
```

Altere `03:30` para um horario posterior ao clone. Teste a tarefa manualmente:

```powershell
schtasks /run /tn "GestaguaSyncRailway"
Get-Content C:\arvo-sync\logs\sync-railway.log -Tail 50
```

## Funcionamento em producao

- VPS -> Railway: usa `DATABASE_PUBLIC_URL`, porque a VPS esta fora da rede da
  Railway.
- Backend Railway -> Postgres Railway: continua usando `DATABASE_URL`, pela rede
  privada.
- Se dump ou restore falhar, `--single-transaction` impede uma restauracao
  parcial de ser confirmada.
- Durante a troca diaria, consultas podem aguardar locks por alguns instantes.
