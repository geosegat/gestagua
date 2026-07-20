# Sincroniza o banco ativo da VPS com o PostgreSQL da Railway.
#
# Segredos esperados no ambiente da maquina (nao versionar):
#   GESTAGUA_SOURCE_DB_PASSWORD
#   GESTAGUA_RAILWAY_DATABASE_PUBLIC_URL
#
# A API na Railway continua usando DATABASE_URL (rede privada). Somente este
# script, executado fora da Railway, usa a URL publica/TCP proxy.

[CmdletBinding()]
param(
  [string]$PointerFile = "C:\arvo-sync\banco_ativo.txt",
  [string]$SourceHost = "localhost",
  [int]$SourcePort = 5432,
  [string]$SourceUser = "postgres",
  [string]$SourcePassword = $env:GESTAGUA_SOURCE_DB_PASSWORD,
  [string]$RailwayDatabaseUrl = $env:GESTAGUA_RAILWAY_DATABASE_PUBLIC_URL,
  [string]$WorkDirectory = "$env:TEMP\gestagua-railway-sync",
  [string]$LogFile = "C:\arvo-sync\logs\sync-railway.log"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Find-PgTool([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $match = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\$Name.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1

  if ($match) { return $match.FullName }
  throw "Nao encontrei $Name. Instale o cliente PostgreSQL ou ajuste o PATH."
}

function Write-SyncLog([string]$Message) {
  $line = "$(Get-Date -Format o)  $Message"
  Write-Host $line
  try { Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8 } catch {}
}

function Set-PgEnvironment(
  [string]$HostName,
  [int]$Port,
  [string]$User,
  [string]$Password,
  [string]$Database,
  [string]$SslMode
) {
  $env:PGHOST = $HostName
  $env:PGPORT = "$Port"
  $env:PGUSER = $User
  $env:PGPASSWORD = $Password
  $env:PGDATABASE = $Database
  $env:PGSSLMODE = $SslMode
}

$pgEnvironmentNames = @(
  "PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE"
)
$previousPgEnvironment = @{}
foreach ($name in $pgEnvironmentNames) {
  $previousPgEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

$mutex = New-Object System.Threading.Mutex($false, "Global\GestaguaRailwaySync")
$hasLock = $false
$dumpFile = $null

try {
  $hasLock = $mutex.WaitOne(0)
  if (-not $hasLock) { throw "Ja existe uma sincronizacao em andamento." }

  if (-not (Test-Path -LiteralPath $PointerFile)) {
    throw "Pointer file nao encontrado: $PointerFile"
  }
  if ([string]::IsNullOrWhiteSpace($SourcePassword)) {
    throw "Defina GESTAGUA_SOURCE_DB_PASSWORD no ambiente da maquina."
  }
  if ([string]::IsNullOrWhiteSpace($RailwayDatabaseUrl)) {
    throw "Defina GESTAGUA_RAILWAY_DATABASE_PUBLIC_URL no ambiente da maquina."
  }

  $sourceDatabase = (Get-Content -LiteralPath $PointerFile -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($sourceDatabase)) {
    throw "O pointer file esta vazio: $PointerFile"
  }

  $railwayUri = [Uri]$RailwayDatabaseUrl
  if ($railwayUri.Scheme -notin @("postgres", "postgresql")) {
    throw "A URL da Railway precisa comecar com postgres:// ou postgresql://."
  }

  $userInfo = $railwayUri.UserInfo -split ":", 2
  if ($userInfo.Count -ne 2) { throw "Usuario ou senha ausente na URL da Railway." }

  $railwayUser = [Uri]::UnescapeDataString($userInfo[0])
  $railwayPassword = [Uri]::UnescapeDataString($userInfo[1])
  $railwayDatabase = [Uri]::UnescapeDataString($railwayUri.AbsolutePath.TrimStart("/"))
  $railwayPort = if ($railwayUri.Port -gt 0) { $railwayUri.Port } else { 5432 }

  if ([string]::IsNullOrWhiteSpace($railwayDatabase)) {
    throw "Nome do banco ausente na URL da Railway."
  }

  $pgDump = Find-PgTool "pg_dump"
  $pgRestore = Find-PgTool "pg_restore"
  $psql = Find-PgTool "psql"

  New-Item -ItemType Directory -Path $WorkDirectory -Force | Out-Null
  $logDirectory = Split-Path -Parent $LogFile
  if ($logDirectory) { New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null }

  Write-SyncLog "Iniciando sincronizacao do banco ativo: $sourceDatabase"

  Set-PgEnvironment `
    -HostName $railwayUri.Host `
    -Port $railwayPort `
    -User $railwayUser `
    -Password $railwayPassword `
    -Database $railwayDatabase `
    -SslMode "require"

  $connectionCheck = & $psql --no-psqlrc --tuples-only --no-align --command "SELECT 1;" 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Nao foi possivel conectar na Railway: $connectionCheck"
  }
  Write-SyncLog "Conexao com a Railway validada."

  $dumpFile = Join-Path $WorkDirectory "gestagua-$((Get-Date).ToString('yyyyMMdd-HHmmss')).dump"
  Set-PgEnvironment `
    -HostName $SourceHost `
    -Port $SourcePort `
    -User $SourceUser `
    -Password $SourcePassword `
    -Database $sourceDatabase `
    -SslMode "disable"

  $dumpOutput = & $pgDump `
    --format=custom `
    --compress=6 `
    --no-owner `
    --no-privileges `
    --file $dumpFile 2>&1
  $dumpExitCode = $LASTEXITCODE
  foreach ($line in @($dumpOutput)) { Write-SyncLog "pg_dump: $line" }
  if ($dumpExitCode -ne 0) { throw "pg_dump falhou com codigo $dumpExitCode." }

  $dumpSizeMb = [Math]::Round((Get-Item -LiteralPath $dumpFile).Length / 1MB, 1)
  Write-SyncLog "Dump criado com sucesso ($dumpSizeMb MB)."

  Set-PgEnvironment `
    -HostName $railwayUri.Host `
    -Port $railwayPort `
    -User $railwayUser `
    -Password $railwayPassword `
    -Database $railwayDatabase `
    -SslMode "require"

  $restoreOutput = & $pgRestore `
    --dbname $railwayDatabase `
    --clean `
    --if-exists `
    --no-owner `
    --no-privileges `
    --single-transaction `
    --exit-on-error `
    $dumpFile 2>&1
  $restoreExitCode = $LASTEXITCODE
  foreach ($line in @($restoreOutput)) { Write-SyncLog "pg_restore: $line" }
  if ($restoreExitCode -ne 0) { throw "pg_restore falhou com codigo $restoreExitCode." }

  $projectCount = & $psql `
    --no-psqlrc `
    --tuples-only `
    --no-align `
    --command "SELECT COUNT(*) FROM public.projects;" 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Restore terminou, mas a validacao da tabela projects falhou: $projectCount"
  }

  $projectCountText = ($projectCount | Out-String).Trim()
  Write-SyncLog "Sincronizacao concluida. Projetos na Railway: $projectCountText"
} catch {
  Write-SyncLog "FALHA: $($_.Exception.Message)"
  throw
} finally {
  if ($dumpFile -and (Test-Path -LiteralPath $dumpFile)) {
    Remove-Item -LiteralPath $dumpFile -Force -ErrorAction SilentlyContinue
  }

  foreach ($name in $pgEnvironmentNames) {
    $previousValue = $previousPgEnvironment[$name]
    if ($null -eq $previousValue) {
      Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
    } else {
      Set-Item -Path "Env:$name" -Value $previousValue
    }
  }

  if ($hasLock) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
