# ============================================================
#  sync-agent.ps1  -  RODAR NA VPS (Agendador de Tarefas)
#
#  Leva o banco do dia da VPS para o Postgres da Railway.
#
#  Roda em dois casos:
#    1. Agendado (ex.: 1x por dia e/ou a cada 5 min), atendendo o botão
#       "Atualizar dados" do painel quando houver pedido pendente.
#    2. Na mão, com -Force, pra sincronizar na hora.
#
#  A VPS só faz chamadas de SAIDA (HTTPS pra API, Postgres pra Railway).
#  Nenhuma porta precisa ser aberta aqui.
#
#  Uso:
#    .\sync-agent.ps1                 # só sincroniza se houver pedido pendente
#    .\sync-agent.ps1 -Force          # sincroniza sempre (use no job diário)
#    .\sync-agent.ps1 -WhatIf         # mostra o que faria, sem tocar em nada
#
#  Variáveis de ambiente esperadas (defina na conta que roda a tarefa):
#    GESTAGUA_API_URL     https://sua-api.up.railway.app
#    GESTAGUA_API_KEY     a mesma chave do x-api-key
#    GESTAGUA_TARGET_URL  connection string PUBLICA do Postgres da Railway
#                         (a privada só funciona de dentro da Railway)
#    GESTAGUA_DB_PASSWORD senha do Postgres LOCAL da VPS (origem do dump)
# ============================================================
param(
  [switch]$Force,
  [switch]$WhatIf,
  [string]$ApiUrl        = $env:GESTAGUA_API_URL,
  [string]$ApiKey        = $env:GESTAGUA_API_KEY,
  [string]$TargetUrl     = $env:GESTAGUA_TARGET_URL,
  [string]$SourcePassword = $env:GESTAGUA_DB_PASSWORD,
  [string]$PointerFile   = "C:\arvo-sync\banco_ativo.txt",
  [string]$DbUser        = "postgres",
  [string]$DbHost        = "localhost",
  [string]$WorkDir       = "C:\arvo-sync\tmp"
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $message"
}

function Find-PgTool($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $hit = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\$name.exe" -ErrorAction SilentlyContinue |
         Sort-Object FullName -Descending | Select-Object -First 1
  if ($hit) { return $hit.FullName }
  throw "Nao encontrei $name. Instale o PostgreSQL ou ajuste o PATH."
}

function Invoke-Api($method, $body) {
  $headers = @{ "x-api-key" = $ApiKey }
  $uri = "$($ApiUrl.TrimEnd('/'))/admin/sync"
  if ($body) {
    return Invoke-RestMethod -Method $method -Uri $uri -Headers $headers `
      -ContentType "application/json" -Body ($body | ConvertTo-Json -Compress)
  }
  return Invoke-RestMethod -Method $method -Uri $uri -Headers $headers
}

# ---------- validação de configuração ----------
foreach ($pair in @(
  @{ Name = "GESTAGUA_API_URL";    Value = $ApiUrl },
  @{ Name = "GESTAGUA_API_KEY";    Value = $ApiKey },
  @{ Name = "GESTAGUA_TARGET_URL"; Value = $TargetUrl }
)) {
  if (-not $pair.Value) { throw "Faltou definir $($pair.Name)." }
}

if (-not (Test-Path $PointerFile)) { throw "Pointer file nao encontrado: $PointerFile" }
$banco = (Get-Content $PointerFile -Raw).Trim()
if (-not $banco) { throw "banco_ativo.txt esta vazio." }

# ---------- tem trabalho a fazer? ----------
$trigger = if ($Force) { "schedule" } else { "manual" }
$state = Invoke-Api "GET" $null
Write-Step "Estado atual da API: $($state.status)"

if ($state.status -eq "running") {
  Write-Step "Ja existe uma sincronizacao em andamento. Saindo."
  exit 0
}

if (-not $Force -and $state.status -ne "pending") {
  Write-Step "Nenhum pedido pendente e -Force nao foi usado. Nada a fazer."
  exit 0
}

Write-Step "Banco de origem: $banco"
Write-Step "Destino        : $([regex]::Replace($TargetUrl, '://[^@]+@', '://***@'))"

if ($WhatIf) {
  Write-Step "-WhatIf ligado: pararia aqui, sem dump nem restore."
  exit 0
}

# ---------- executa ----------
$pgDump    = Find-PgTool "pg_dump"
$pgRestore = Find-PgTool "pg_restore"
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
$dumpFile = Join-Path $WorkDir "gestagua_sync.dump"

Invoke-Api "POST" @{ event = "start"; trigger = $trigger } | Out-Null
Write-Step "Sincronizacao marcada como em andamento."

try {
  Write-Step "Gerando dump de '$banco'..."
  $env:PGPASSWORD = $SourcePassword
  & $pgDump -U $DbUser -h $DbHost -d $banco -Fc -f $dumpFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (codigo $LASTEXITCODE)." }

  $size = [math]::Round((Get-Item $dumpFile).Length / 1MB, 1)
  Write-Step "Dump gerado ($size MB). Restaurando na Railway..."

  # --clean --if-exists deixa o banco de destino inconsistente por alguns
  # segundos; com o volume atual isso é rápido, mas é a janela em que o painel
  # e o portal público podem responder erro.
  & $pgRestore --dbname=$TargetUrl --no-owner --no-privileges --clean --if-exists $dumpFile
  # pg_restore sai != 0 por avisos de owner/extensao mesmo quando deu certo,
  # então a verificação real é a consulta abaixo
  Write-Step "Restore concluido. Conferindo o destino..."

  $psql = Find-PgTool "psql"
  $projetos = (& $psql --dbname=$TargetUrl -tAc "SELECT count(*) FROM projects" 2>$null | Select-Object -First 1)
  if (-not $projetos) { throw "Nao consegui ler a tabela projects no destino apos o restore." }
  Write-Step "Destino respondeu: $projetos projetos."

  Invoke-Api "POST" @{ event = "finish"; ok = $true } | Out-Null
  Write-Step "Sincronizacao concluida com sucesso."
}
catch {
  $mensagem = $_.Exception.Message
  Write-Step "FALHA: $mensagem"
  try {
    Invoke-Api "POST" @{ event = "finish"; ok = $false; error = $mensagem } | Out-Null
  } catch {
    Write-Step "Nao consegui reportar a falha para a API."
  }
  exit 1
}
finally {
  $env:PGPASSWORD = $null
  if (Test-Path $dumpFile) { Remove-Item $dumpFile -Force -ErrorAction SilentlyContinue }
}
