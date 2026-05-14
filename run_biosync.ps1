# =====================================================
# BIOSYNC DAILY CONTROLLER — FINAL FIXED VERSION
# =====================================================

$basePath      = "C:\AttendanceAutomation"
$extractScript = "$basePath\extract_biometric_data.py"
$combineScript = "$basePath\combine_all_sheets.py"

# ======== TIME SETTINGS ========
$extractStart = "8:30"
$extractStop  = "9:30"
$combineTime  = "9:33"
# ===============================

$extractShell = $null

Write-Host "BIOSYNC scheduler running"
Write-Host "-------------------------------------"

while ($true) {

    $now = Get-Date
    $today = $now.Date

    $startTime  = $today.Add([TimeSpan]::Parse($extractStart))
    $stopTime   = $today.Add([TimeSpan]::Parse($extractStop))
    $combineRun = $today.Add([TimeSpan]::Parse($combineTime))

    # Shift to next day if today's cycle passed
    if ($now -ge $combineRun) {
        $startTime  = $startTime.AddDays(1)
        $stopTime   = $stopTime.AddDays(1)
        $combineRun = $combineRun.AddDays(1)
    }

    Write-Host "Waiting for BIOSYNC start at $($startTime.ToString('yyyy-MM-dd HH:mm'))"

    while ((Get-Date) -lt $startTime) {
        Start-Sleep -Seconds 5
    }

    # --------------------------------------------------
    # START EXTRACT (VISIBLE NORMAL POWERSHELL)
    # --------------------------------------------------
    Write-Host "Starting extract_biometric_data.py"

    $extractShell = Start-Process cmd.exe `
        "/c start powershell -NoProfile -Command `"cd '$basePath'; python '$extractScript'`"" `
        -PassThru

    Write-Host "Extract running until $($stopTime.ToString('yyyy-MM-dd HH:mm'))"

    while ((Get-Date) -lt $stopTime) {
        Start-Sleep -Seconds 5
    }

    # --------------------------------------------------
    # STOP EXTRACT (CLOSE POWERSHELL WINDOW COMPLETELY)
    # --------------------------------------------------
    Write-Host "Stopping extract_biometric_data.py"

    # Kill python launched during extract window
    Get-Process python -ErrorAction SilentlyContinue |
        Where-Object { $_.StartTime -ge $startTime } |
        Stop-Process -Force

    # Kill the PowerShell window that launched it
    if ($extractShell -and !$extractShell.HasExited) {
        Stop-Process -Id $extractShell.Id -Force
    }

    $extractShell = $null

    # --------------------------------------------------
    # WAIT FOR COMBINE
    # --------------------------------------------------
    Write-Host "Waiting for combine at $($combineRun.ToString('yyyy-MM-dd HH:mm'))"

    while ((Get-Date) -lt $combineRun) {
        Start-Sleep -Seconds 5
    }

    # --------------------------------------------------
    # RUN COMBINE
    # --------------------------------------------------
    Write-Host "Running combine_all_sheets.py"

    Set-Location $basePath
    python $combineScript

    Write-Host "Daily BIOSYNC cycle completed"
    Write-Host "-------------------------------------"

    Start-Sleep -Seconds 15
}
