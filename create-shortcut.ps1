# Get the desktop path
$desktopPath = [Environment]::GetFolderPath("Desktop")

# Get the current directory (where this script is located)
$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Path to the batch file
$batchFilePath = Join-Path $currentDir "launch-dashboard.bat"

# Create the shortcut
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$desktopPath\Portfolio Dashboard.lnk")
$Shortcut.TargetPath = $batchFilePath
$Shortcut.WorkingDirectory = $currentDir
$Shortcut.Description = "Launch Portfolio Dashboard"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,21"
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully!" -ForegroundColor Green
Write-Host "You can now double-click 'Portfolio Dashboard' on your desktop to launch the dashboard." -ForegroundColor Yellow 