# Starts the FastAPI backend and Next.js frontend.
# Logs and PID files are written to .run/ at the repository root.
# Stop everything with scripts\stop.ps1.

param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$RunDir = Join-Path $Root ".run"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

# --- Locate Python ---
$pythonCmd = $null
$pythonArgs = @()
foreach ($candidate in @(
    @{ Cmd = "py"; Args = @("-3") },
    @{ Cmd = "python"; Args = @() }
  )) {
  try {
    $versionOutput = & $candidate.Cmd @($candidate.Args + @("--version")) 2>$null
    if ($LASTEXITCODE -eq 0) {
      if ($versionOutput -match "(\d+)\.(\d+)") {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        if ($major -gt 3 -or ($major -eq 3 -and $minor -ge 10)) {
          $pythonCmd = $candidate.Cmd
          $pythonArgs = $candidate.Args
          break
        }
      }
    }
  } catch {
    continue
  }
}
if (-not $pythonCmd) {
  Write-Error "Python 3.10 or newer is required but was not found on PATH."
  exit 1
}

# --- Ensure virtual environment and dependencies ---
if (-not (Test-Path (Join-Path $Root ".venv"))) {
  Write-Output "Creating Python virtual environment..."
  & $pythonCmd @pythonArgs -m venv (Join-Path $Root ".venv")
}

$venvPython = Join-Path $Root ".venv\Scripts\python.exe"
$markerFile = Join-Path $Root ".venv\.deps-installed"
$requirements = Join-Path $Root "backend\requirements.txt"
if ((-not (Test-Path $markerFile)) -or
    ((Get-Item $requirements).LastWriteTime -gt (Get-Item $markerFile).LastWriteTime)) {
  Write-Output "Installing backend dependencies..."
  & $venvPython -m pip install -q -r $requirements
  if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install backend dependencies."; exit 1 }
  New-Item -ItemType File -Path $markerFile -Force | Out-Null
}

# --- Ensure frontend dependencies ---
if (-not (Test-Path (Join-Path $Root "frontend\node_modules"))) {
  Write-Output "Installing frontend dependencies..."
  Push-Location (Join-Path $Root "frontend")
  try { npm install; if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed."; exit 1 } }
  finally { Pop-Location }
}

# --- Port hygiene: reuse our own leftovers, refuse foreign listeners ---
foreach ($service in @(
    @{ Name = "backend"; Port = $BackendPort },
    @{ Name = "frontend"; Port = $FrontendPort }
  )) {
  $pidFile = Join-Path $RunDir "$($service.Name).pid"
  $alreadyRunning = $false
  if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
      $alreadyRunning = $true
    }
  }
  if ($alreadyRunning) {
    Write-Output "$($service.Name) is already running; stopping it first..."
    & (Join-Path $PSScriptRoot "stop.ps1")
  } else {
    $listener = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($listener) {
      Write-Error ("Port {0} is already in use by PID {1}. Run scripts\stop.ps1 or free the port." -f `
        $service.Port, $listener.OwningProcess)
      exit 1
    }
  }
}

# --- Start backend ---
# The browser's origin is the frontend port, so CORS has to follow it.
$env:PRELEGAL_ALLOWED_ORIGINS = "http://localhost:$FrontendPort,http://127.0.0.1:$FrontendPort"
Write-Output "Starting backend on http://127.0.0.1:$BackendPort ..."
$backendProc = Start-Process -FilePath $venvPython `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$BackendPort" `
  -WorkingDirectory (Join-Path $Root "backend") `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $RunDir "backend.log") `
  -RedirectStandardError (Join-Path $RunDir "backend.err.log")
Set-Content -Path (Join-Path $RunDir "backend.pid") -Value $backendProc.Id

$backendReady = $false
foreach ($attempt in 1..30) {
  if ($backendProc.HasExited) { break }
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/api/health" -TimeoutSec 2
    if ($health.status -eq "ok") { $backendReady = $true; break }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}
if (-not $backendReady) {
  Write-Output "Backend did not become healthy. Last log lines:"
  Get-Content (Join-Path $RunDir "backend.err.log") -Tail 20 -ErrorAction SilentlyContinue
  Get-Content (Join-Path $RunDir "backend.log") -Tail 20 -ErrorAction SilentlyContinue
  & (Join-Path $PSScriptRoot "stop.ps1")
  exit 1
}
Write-Output "Backend healthy (PID $($backendProc.Id))."

# --- Start frontend ---
Write-Output "Starting frontend on http://localhost:$FrontendPort ..."
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) { Write-Error "npm was not found on PATH."; exit 1 }
$frontendProc = Start-Process -FilePath $npmCmd `
  -ArgumentList "run", "dev", "--", "-p", "$FrontendPort" `
  -WorkingDirectory (Join-Path $Root "frontend") `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $RunDir "frontend.log") `
  -RedirectStandardError (Join-Path $RunDir "frontend.err.log")
Set-Content -Path (Join-Path $RunDir "frontend.pid") -Value $frontendProc.Id

$frontendReady = $false
foreach ($attempt in 1..120) {
  if ($frontendProc.HasExited) { break }
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200) { $frontendReady = $true; break }
  } catch {
    Start-Sleep -Milliseconds 750
  }
}
if (-not $frontendReady) {
  if ($frontendProc.HasExited) {
    Write-Warning "Frontend process exited early. Last log lines:"
    Get-Content (Join-Path $RunDir "frontend.log") -Tail 20 -ErrorAction SilentlyContinue
    Get-Content (Join-Path $RunDir "frontend.err.log") -Tail 20 -ErrorAction SilentlyContinue
  } else {
    Write-Warning "Frontend did not respond within the timeout; it may still be compiling."
    Write-Warning "Check .run\frontend.log for progress."
  }
} else {
  Write-Output "Frontend ready (PID $($frontendProc.Id))."
}

Write-Output ""
Write-Output "Prelegal is running:"
Write-Output "  Frontend:  http://localhost:$FrontendPort"
Write-Output "  Backend:   http://127.0.0.1:$BackendPort  (API docs: http://127.0.0.1:$BackendPort/docs)"
Write-Output "  Logs/PIDs: $RunDir"
Write-Output "Stop with: scripts\stop.ps1"
