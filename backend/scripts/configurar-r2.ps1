<#
.SYNOPSIS
  Grava as credenciais do R2 no .env do backend sem exibi-las na tela.

.DESCRIPTION
  O token do R2 e mostrado uma unica vez pelo Cloudflare. Este script le os
  dois segredos pela area de transferencia e atualiza o .env preservando o
  resto do arquivo.

  Por que clipboard e nao Read-Host -AsSecureString: em varios consoles do
  Windows o -AsSecureString ignora o Ctrl+V e registra um caractere so, e o
  erro passa despercebido porque a digitacao fica oculta. Colar no clipboard
  e ler dali e confiavel, e continua sem exibir nada.

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

<#
  Le um valor pela area de transferencia. Nao imprime o conteudo: so o
  tamanho, para dar para conferir que o paste veio inteiro.
#>
function Read-FromClipboard {
  param(
    [string] $Rotulo,
    [int] $TamanhoEsperado
  )

  while ($true) {
    Write-Host ''
    Write-Host "Copie o $Rotulo (Ctrl+C no dashboard) e aperte Enter aqui." -ForegroundColor Yellow
    Read-Host ' pronto? (Enter)' | Out-Null

    $valor = (Get-Clipboard -Raw)
    if ($null -ne $valor) { $valor = $valor.Trim() }

    if ([string]::IsNullOrWhiteSpace($valor)) {
      Write-Host '  area de transferencia vazia - copie o valor e tente de novo' -ForegroundColor Red
      continue
    }

    if ($valor -match '\s') {
      Write-Host '  o valor copiado tem espaco ou quebra de linha - copie so a chave' -ForegroundColor Red
      continue
    }

    Write-Host "  recebido: $($valor.Length) caracteres" -ForegroundColor Green

    if ($valor.Length -ne $TamanhoEsperado) {
      Write-Host "  ATENCAO: o esperado para $Rotulo sao $TamanhoEsperado caracteres." -ForegroundColor Red
      $resposta = Read-Host '  usar assim mesmo? (s/N)'
      if ($resposta -notmatch '^[sS]') { continue }
    }

    return $valor
  }
}

# Formato do R2: Access Key ID com 32 hex, Secret com 64 hex.
$accessKey = Read-FromClipboard -Rotulo 'Access Key ID' -TamanhoEsperado 32
$secretKey = Read-FromClipboard -Rotulo 'Secret Access Key' -TamanhoEsperado 64

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

# Limpa a area de transferencia para o segredo nao ficar rondando.
try { Set-Clipboard -Value '' } catch { }

Write-Host ''
Write-Host "ok: 5 variaveis gravadas em $envPath" -ForegroundColor Green
Write-Host '  (os segredos nao foram exibidos; area de transferencia limpa)'
Write-Host ''
Write-Host 'Proximo passo:' -ForegroundColor Cyan
Write-Host '  node scripts/upload-propostas-r2.js          # simula'
Write-Host '  node scripts/upload-propostas-r2.js --apply  # envia'
Write-Host ''
