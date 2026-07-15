# ============================================================
#  dump-vps.ps1  —  RODAR NA VPS
#  Gera um dump completo do banco do dia (clone) do Gestagua.
#  Uso:
#    .\dump-vps.ps1                      # senha padrao 0202, saida no Desktop
#    .\dump-vps.ps1 -Password "xxxx" -OutFile "C:\temp\gestagua.dump"
# ============================================================
param(
  [string]$Password = "0202",
  [string]$PointerFile = "C:\arvo-sync\banco_ativo.txt",
  [string]$OutFile = "$env:USERPROFILE\Desktop\gestagua_dump.dump",
  [string]$DbUser = "postgres",
  [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"

# acha o pg_dump (PATH ou instalacoes padrao do Postgres)
function Find-PgTool($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $hit = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\$name.exe" -ErrorAction SilentlyContinue |
         Sort-Object FullName -Descending | Select-Object -First 1
  if ($hit) { return $hit.FullName }
  throw "Nao encontrei $name. Instale o PostgreSQL ou ajuste o PATH."
}

if (-not (Test-Path $PointerFile)) { throw "Pointer file nao encontrado: $PointerFile" }
$banco = (Get-Content $PointerFile -Raw).Trim()
if (-not $banco) { throw "banco_ativo.txt esta vazio." }

$pgDump = Find-PgTool "pg_dump"
Write-Host "Banco do dia : $banco"
Write-Host "pg_dump      : $pgDump"
Write-Host "Saida        : $OutFile"
Write-Host "Gerando dump (formato custom, comprimido)..."

$env:PGPASSWORD = $Password
& $pgDump -U $DbUser -h $DbHost -d $banco -Fc -f $OutFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (codigo $LASTEXITCODE)." }

$size = [math]::Round((Get-Item $OutFile).Length / 1MB, 1)
Write-Host "OK. Dump gerado: $OutFile ($size MB)"
Write-Host "Agora copie esse arquivo para a sua maquina e rode restore-local.ps1."
