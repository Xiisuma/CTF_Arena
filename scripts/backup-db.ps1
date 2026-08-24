# Sauvegarde la base ctf_arena depuis le conteneur MySQL (équivalent PowerShell
# de backup-db.sh, pour une machine hôte Windows sans Git Bash).
#
# Usage :
#   .\scripts\backup-db.ps1 [-Destination .\backups]
#
# Planification toutes les 15 minutes pendant un événement :
#   $a = New-ScheduledTaskAction -Execute 'powershell.exe' `
#          -Argument '-File "C:\chemin\vers\scripts\backup-db.ps1"'
#   $t = New-ScheduledTaskTrigger -Once -At (Get-Date) `
#          -RepetitionInterval (New-TimeSpan -Minutes 15)
#   Register-ScheduledTask -TaskName 'CTF Arena backup' -Action $a -Trigger $t

param(
    [string]$Destination = ".\backups"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$running = docker compose ps --status running --services
if ($running -notcontains "db") {
    Write-Error "Le service 'db' n'est pas démarré."
}

if (-not (Test-Path $Destination)) {
    New-Item -ItemType Directory -Path $Destination | Out-Null
}

$stamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $Destination "ctf_arena_$stamp.sql"

# --single-transaction : dump cohérent sans bloquer les écritures des joueurs.
# Le mot de passe est lu dans l'environnement du conteneur, jamais en argument.
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers ctf_arena' |
    Out-File -FilePath $target -Encoding utf8

if ($LASTEXITCODE -ne 0) {
    Remove-Item $target -ErrorAction SilentlyContinue
    Write-Error "mysqldump a échoué (code $LASTEXITCODE) — aucune sauvegarde écrite."
}

Compress-Archive -Path $target -DestinationPath "$target.zip" -Force
Remove-Item $target

$sizeMb = [math]::Round((Get-Item "$target.zip").Length / 1MB, 2)
Write-Output "Sauvegarde écrite : $target.zip ($sizeMb Mo)"

# Rotation : on conserve les 48 archives les plus récentes.
$keep = 48
$all  = Get-ChildItem -Path $Destination -Filter "ctf_arena_*.sql.zip" |
        Sort-Object LastWriteTime -Descending
if ($all.Count -gt $keep) {
    $all | Select-Object -Skip $keep | ForEach-Object {
        Remove-Item $_.FullName
        Write-Output "Ancienne sauvegarde supprimée : $($_.Name)"
    }
}
