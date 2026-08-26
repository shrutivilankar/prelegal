# Sync OpenCode skills into Cursor skill directories (junctions).
# Re-run after opencode plugin cache changes or on a new machine.
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$CursorSkills = Join-Path $Root ".cursor\skills"
$OpenCodeSkills = Join-Path $Root ".opencode\skills"

function Ensure-Junction {
    param(
        [string]$Link,
        [string]$Target
    )

    if (-not (Test-Path $Target)) {
        Write-Warning "Target missing, skipping junction: $Target"
        return
    }

    $parent = Split-Path $Link -Parent
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    if (Test-Path $Link) {
        if ($Force) {
            Remove-Item $Link -Force -Recurse
        } else {
            Write-Host "Already exists: $Link"
            return
        }
    }

    New-Item -ItemType Junction -Path $Link -Target $Target | Out-Null
    Write-Host "Linked $Link -> $Target"
}

New-Item -ItemType Directory -Path $CursorSkills -Force | Out-Null

# Project OpenCode skills
Ensure-Junction -Link (Join-Path $CursorSkills "opencode") -Target $OpenCodeSkills

# Power-pack plugin skills from OpenCode cache
$PowerPackRoot = Get-ChildItem "$env:USERPROFILE\.cache\opencode\packages" -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "opencode-power-pack@git+*" } |
    Select-Object -First 1

if ($PowerPackRoot) {
    $PowerPackSkills = Get-ChildItem $PowerPackRoot.FullName -Recurse -Directory -Filter "skills" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like "*\opencode-power-pack\skills" } |
        Select-Object -First 1

    if ($PowerPackSkills) {
        Ensure-Junction -Link (Join-Path $CursorSkills "opencode-power-pack") -Target $PowerPackSkills.FullName
    } else {
        Write-Warning "Could not locate opencode-power-pack skills folder in cache."
    }
} else {
    Write-Warning "opencode-power-pack not found in OpenCode cache. Run 'opencode debug config' once to install plugins."
}

Write-Host "Done. Restart Cursor or reload the window to pick up new skills."
