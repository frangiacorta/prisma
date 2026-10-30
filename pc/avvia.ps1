$ErrorActionPreference = 'Stop'
$prismaURL = 'http://127.0.0.1:8242/'
$prismaReady = $false
try { $prismaReady = (Invoke-RestMethod -Uri ($prismaURL + 'health') -TimeoutSec 2).director -eq $true } catch {}
if (-not $prismaReady) {
 $prismaNode = (Get-Command node.exe -ErrorAction Stop).Source
 New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'local') | Out-Null
 Start-Process -FilePath $prismaNode -ArgumentList ('"' + (Join-Path $PSScriptRoot 'server.mjs') + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'local/server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'local/error.log')
 for ($prismaAttempt=0; $prismaAttempt -lt 20; $prismaAttempt++) { Start-Sleep -Milliseconds 250; try { if ((Invoke-RestMethod -Uri ($prismaURL + 'health') -TimeoutSec 1).director) { $prismaReady=$true; break } } catch {} }
}
if (-not $prismaReady) { throw 'Avvio non riuscito. Se una versione precedente occupa la porta 8242, chiudila e riprova. Vedi pc/local/error.log.' }
Start-Process ($prismaURL + '?playground=1&engine=solid')
