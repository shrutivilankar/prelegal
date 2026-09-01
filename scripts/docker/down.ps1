# Stops and removes the Prelegal containers started by scripts\docker\up.ps1.

param(
  [switch]$RemoveImages
)

$ErrorActionPreference = "Stop"

$compose = Join-Path $PSScriptRoot "compose.yml"
if ($RemoveImages) {
  docker compose -f $compose down --rmi local
} else {
  docker compose -f $compose down
}
