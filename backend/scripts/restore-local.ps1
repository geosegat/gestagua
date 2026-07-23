# ============================================================
#  restore-local.ps1  -  RODAR NA SUA MAQUINA (dev)
#  Cria o banco gestagua_teste e restaura o dump da VPS.
#  Uso:
#    .\restore-local.ps1 -DumpFile "C:\Users\voce\Desktop\gestagua_dump.dump"
#    .\restore-local.ps1 -DumpFile ".\gestagua_dump.dump" -Password "0202"
# ============================================================
param(
  [Parameter(Mandatory = $true)][string]$DumpFile,
  [string]$Password = "0202",
  [string]$DbName = "gestagua_teste",
  [string]$DbUser = "postgres",
  [string]$DbHost = "localhost"
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

if (-not (Test-Path $DumpFile)) { throw "Dump nao encontrado: $DumpFile" }
$DumpFile = (Resolve-Path $DumpFile).Path

$psql      = Find-PgTool "psql"
$pgRestore = Find-PgTool "pg_restore"
$env:PGPASSWORD = $Password

# cria o banco se ainda nao existir (createdb falha se ja existe; usamos psql)
Write-Host "Garantindo que o banco '$DbName' existe..."
$exists = & $psql -U $DbUser -h $DbHost -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" postgres
if ($exists -ne "1") {
  & $psql -U $DbUser -h $DbHost -c "CREATE DATABASE `"$DbName`"" postgres | Out-Null
  Write-Host "Banco criado."
} else {
  Write-Host "Banco ja existia (o restore vai sobrepor os dados)."
}

Write-Host "Restaurando dump em '$DbName'..."
& $pgRestore -U $DbUser -h $DbHost -d $DbName --no-owner --clean --if-exists $DumpFile
# pg_restore pode retornar codigo !=0 por avisos (owners/extensoes); nao tratamos como fatal
Write-Host "`nTabelas restauradas:"
& $psql -U $DbUser -h $DbHost -d $DbName -c "\dt"

Write-Host "`nPronto. Confirme que o banco_ativo.txt do backend contem: $DbName"
Write-Host "Depois recarregue o frontend e clique num filtro."
