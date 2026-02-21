# Fix workstore-atract: make it a normal folder in atract (not a separate repo)
# Run from repo root: .\fix-workstore-merge.ps1

$repoRoot = $PSScriptRoot
Set-Location $repoRoot

# 1. Unstage workstore-atract if it was added as embedded repo
git rm --cached -f workstore-atract 2>$null

# 2. Remove the inner .git so it's no longer a separate repository
if (Test-Path "workstore-atract\.git") {
    Remove-Item -Recurse -Force "workstore-atract\.git"
    Write-Host "Removed workstore-atract\.git"
}

# 3. Add workstore-atract as normal files
git add workstore-atract/
Write-Host "Added workstore-atract as normal folder"
git status --short
