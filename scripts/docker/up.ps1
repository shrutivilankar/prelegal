# Builds the images and starts Prelegal in Docker.
# Stop everything with scripts\docker\down.ps1.

param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 3001
)

$ErrorActionPreference = "Stop"

$compose = Join-Path $PSScriptRoot "compose.yml"
$env:BACKEND_PORT = $BackendPort
$env:FRONTEND_PORT = $FrontendPort

Write-Output "Building images and starting containers..."
docker compose -f $compose up -d --build --wait
if ($LASTEXITCODE -ne 0) {
  Write-Output "Containers did not become healthy. Recent logs:"
  docker compose -f $compose logs --tail 40
  exit 1
}

Write-Output ""
Write-Output "Prelegal is running in Docker:"
Write-Output "  Frontend:  http://localhost:$FrontendPort"
Write-Output "  Backend:   http://localhost:$BackendPort  (API docs: http://localhost:$BackendPort/docs)"
Write-Output "  Logs:      docker compose -f scripts\docker\compose.yml logs -f"
Write-Output "Stop with: scripts\docker\down.ps1"
