# Stops the backend and frontend started by scripts\start.ps1,
# removing their PID files from .run/.

param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root ".run"

foreach ($service in @("backend", "frontend")) {
  $pidFile = Join-Path $RunDir "$service.pid"
  if (-not (Test-Path $pidFile)) { continue }

  $processId = Get-Content $pidFile -ErrorAction SilentlyContinue
  $process = if ($processId) { Get-Process -Id $processId -ErrorAction SilentlyContinue } else { $null }
  if ($process) {
    # Guard against PID reuse: only kill processes that look like ours.
    if ($process.ProcessName -match "^(python|node|npm|cmd)$") {
      taskkill /PID $processId /T /F | Out-Null
      Write-Output "Stopped $service (PID $processId)."
    } else {
      Write-Warning "PID $processId is '$($process.ProcessName)', which does not look like $service; skipping."
    }
  } else {
    Write-Output "$service is not running (stale PID file)."
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Report anything still listening on our ports.
foreach ($port in @($BackendPort, $FrontendPort)) {
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($listener) {
    $owner = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($owner -and $owner.ProcessName -match "^(python|node|npm|cmd)$") {
      taskkill /PID $owner.Id /T /F | Out-Null
      Write-Output "Stopped leftover process on port $port (PID $($owner.Id))."
    } elseif ($owner) {
      Write-Warning "Port $port is still in use by PID $($owner.Id) ($($owner.ProcessName)); not touched."
    }
  }
}
