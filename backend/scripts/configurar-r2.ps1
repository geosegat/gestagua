<#
.SYNOPSIS
  Grava as credenciais do R2 no .env do backend sem exibi-las na tela.

.DESCRIPTION
  O token do R2 e mostrado uma unica vez pelo Cloudflare. Este script le os
  dois segredos como SecureString (nao ecoa, nao vai para o historico do
  shell) e atualiza o .env preservando o resto do arquivo.

  Uso:
    cd backend
    .\scripts\configurar-r2.ps1
#>

$ErrorActionPreference = 'Stop'

$backendDir = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $backendDir '.env'

if (-not (Test-Path -LiteralPath $envPath)) {
  Write-Error "nao encontrei $envPath"
  exit 1
}

# Endpoint da conta: nao e segredo, aparece na URL do dashboard.
$contaId = 'a7188a479ae221b23b0f31625d92b804'
$endpoint = "https://$contaId.r2.cloudflarestorage.com"

Write-Host ''
Write-Host 'Configuracao do R2' -ForegroundColor Cyan
Write-Host "  endpoint: $endpoint"
Write-Host ''

$bucket = Read-Host 'Nome do bucket (enter = gestagua-propostas)'
if ([string]::IsNullOrWhiteSpace($bucket)) { $bucket = 'gestagua-propostas' }

Write-Host ''
Write-Host 'Cole os valores do token (R2 > Manage API Tokens).' -ForegroundColor Yellow
Write-Host 'A digitacao fica oculta.' -ForegroundColor Yellow

$accessKeySecure = Read-Host 'Access Key ID' -AsSecureString
$secretKeySecure = Read-Host 'Secret Access Key' -AsSecureString

function ConvertFrom-Secure([System.Security.SecureString] $s) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$accessKey = ConvertFrom-Secure $accessKeySecure
$secretKey = ConvertFrom-Secure $secretKeySecure

if ([string]::IsNullOrWhiteSpace($accessKey) -or [string]::IsNullOrWhiteSpace($secretKey)) {
  Write-Error 'access key e secret key sao obrigatorios'
  exit 1
}

$valores = [ordered]@{
  R2_ENDPOINT          = $endpoint
  R2_BUCKET            = $bucket
  R2_PREFIX            = 'propostas'
  R2_ACCESS_KEY_ID     = $accessKey
  R2_SECRET_ACCESS_KEY = $secretKey
}

# Substitui a chave se ja existir; senao acrescenta no fim.
$linhas = [System.Collections.Generic.List[string]](Get-Content -LiteralPath $envPath -Encoding UTF8)

foreach ($chave in $valores.Keys) {
  $linha = "$chave=$($valores[$chave])"
  $indice = -1
  for ($i = 0; $i -lt $linhas.Count; $i++) {
    if ($linhas[$i] -match "^\s*$chave\s*=") { $indice = $i; break }
  }
  if ($indice -ge 0) { $linhas[$indice] = $linha } else { $linhas.Add($linha) }
}

Set-Content -LiteralPath $envPath -Value $linhas -Encoding UTF8

Write-Host ''
Write-Host "ok: 5 variaveis gravadas em $envPath" -ForegroundColor Green
Write-Host '  (os segredos nao foram exibidos nem registrados)'
Write-Host ''
Write-Host 'Proximo passo:' -ForegroundColor Cyan
Write-Host '  node scripts/upload-propostas-r2.js          # simula'
Write-Host '  node scripts/upload-propostas-r2.js --apply  # envia'
Write-Host ''
