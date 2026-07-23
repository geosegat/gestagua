# ============================================================
#  sync-worker.ps1 - RODAR NA VPS
#
#  Atualiza o site: baixa os dados do Azure e publica na Railway.
#  Dois passos, e é isso: nao passa pelo banco local da VPS.
#
#      Azure (mvgi_stage)  --pg_dump-->  arquivo  --pg_restore-->  Railway
#
#  A cada etapa ele avisa a API (POST /admin/sync event=log), e o painel
#  mostra o progresso ao vivo. A VPS so faz chamadas de SAIDA.
#
#  Uso:
#    .\sync-worker.ps1            # so roda se o botao tiver pedido (pending)
#    .\sync-worker.ps1 -Force     # roda sempre (usar no agendador diario)
#    .\sync-worker.ps1 -WhatIf    # mostra o que faria, sem tocar em nada
#
#  Variaveis de ambiente (definir com setx /M, uma vez):
#    GESTAGUA_API_URL     https://gestagua-production.up.railway.app
#    GESTAGUA_API_KEY     a mesma chave do x-api-key
#    GESTAGUA_AZURE_URL   connection string do Postgres do Azure (origem)
#    GESTAGUA_TARGET_URL  connection string PUBLICA do Postgres da Railway
# ============================================================
param(
  [switch]$Force,
  [switch]$WhatIf,
  [string]$ApiUrl    = $env:GESTAGUA_API_URL,
  [string]$ApiKey    = $env:GESTAGUA_API_KEY,
  [string]$AzureUrl  = $env:GESTAGUA_AZURE_URL,
  [string]$TargetUrl = $env:GESTAGUA_TARGET_URL,
  [string]$WorkDir   = "C:\arvo-sync\tmp"
)

$ErrorActionPreference = "Stop"

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

# Escreve no console E manda pro painel. E assim que o site mostra "qual
# processo esta rodando" enquanto voce espera.
function Step($message) {
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $message"
  try { Invoke-Api "POST" @{ event = "log"; message = $message } | Out-Null } catch {}
}

# ---------- validacao de configuracao ----------
foreach ($pair in @(
  @{ Name = "GESTAGUA_API_URL";    Value = $ApiUrl },
  @{ Name = "GESTAGUA_API_KEY";    Value = $ApiKey },
  @{ Name = "GESTAGUA_AZURE_URL";  Value = $AzureUrl },
  @{ Name = "GESTAGUA_TARGET_URL"; Value = $TargetUrl }
)) {
  if (-not $pair.Value) { throw "Faltou definir $($pair.Name)." }
}

# ---------- tem trabalho a fazer? ----------
$trigger = if ($Force) { "schedule" } else { "manual" }
$state = Invoke-Api "GET" $null
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Estado atual da API: $($state.status)"

if ($state.status -eq "running") {
  Write-Host "Ja existe uma atualizacao em andamento. Saindo."
  exit 0
}
if (-not $Force -and $state.status -ne "pending") {
  Write-Host "Nenhum pedido pendente e -Force nao foi usado. Nada a fazer."
  exit 0
}

if ($WhatIf) {
  Write-Host "-WhatIf ligado: baixaria do Azure e publicaria na Railway. Parando aqui."
  exit 0
}

# ---------- executa ----------
$pgDump    = Find-PgTool "pg_dump"
$pgRestore = Find-PgTool "pg_restore"
$psql      = Find-PgTool "psql"
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
$dumpFile = Join-Path $WorkDir "gestagua_sync.dump"

Invoke-Api "POST" @{ event = "start"; trigger = $trigger } | Out-Null

try {
  Step "Baixando os dados do sistema (Azure)…"
  & $pgDump --dbname=$AzureUrl -Fc -f $dumpFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump do Azure falhou (codigo $LASTEXITCODE)." }
  $sizeMb = [math]::Round((Get-Item $dumpFile).Length / 1MB, 1)
  if ($sizeMb -lt 0.1) { throw "o download veio vazio ($sizeMb MB)." }
  Step "Download concluido ($sizeMb MB). Publicando no site (Railway)…"

  # --clean --if-exists deixa a Railway inconsistente por alguns segundos; com o
  # volume atual e rapido, mas e a janela em que o site pode oscilar.
  & $pgRestore --dbname=$TargetUrl --no-owner --no-privileges --clean --if-exists $dumpFile
  # pg_restore sai != 0 por avisos de owner/extensao mesmo dando certo; quem
  # decide de verdade e a conferencia abaixo
  Step "Publicacao concluida. Conferindo…"

  $projetos = (& $psql --dbname=$TargetUrl -tAc "SELECT count(*) FROM projects" 2>$null | Select-Object -First 1)
  if (-not $projetos) { throw "nao consegui ler a tabela projects na Railway apos publicar." }
  Step "Tudo certo: o site esta com $projetos projetos."

  Invoke-Api "POST" @{ event = "finish"; ok = $true } | Out-Null
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Atualizacao concluida com sucesso."
}
catch {
  $mensagem = $_.Exception.Message
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] FALHA: $mensagem"
  try { Invoke-Api "POST" @{ event = "finish"; ok = $false; error = $mensagem } | Out-Null } catch {}
  exit 1
}
finally {
  if (Test-Path $dumpFile) { Remove-Item $dumpFile -Force -ErrorAction SilentlyContinue }
}
