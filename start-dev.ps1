#run by calling .\start-dev.ps1

# Starts frontend and backend dev servers in separate terminals.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"

Start-Process cmd.exe -ArgumentList @("/k", "cd /d `"$frontend`" && npm run dev")
Start-Process cmd.exe -ArgumentList @("/k", "cd /d `"$backend`" && python api.py")
