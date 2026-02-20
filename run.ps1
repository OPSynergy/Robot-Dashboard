# Always run from the script's directory
Set-Location -Path $PSScriptRoot

Write-Host "Starting backend..."
Write-Host "Activating virtual environment..."

# Navigate to backend directory
Set-Location "backend" -ErrorAction Stop

# Activate virtual environment
$venvPath = ".\myenv\Scripts\Activate.ps1"
if (!(Test-Path $venvPath)) {
    Write-Host "Failed to activate virtual environment!"
    exit 1
}
. $venvPath

Write-Host "Installing Python dependencies..."
pip install -r requirements.txt

Write-Host "Starting Python backend..."
$backendProcess = Start-Process "python" "main.py" -PassThru
Write-Host "Backend started with PID $($backendProcess.Id)"

# Move to frontend directory
Set-Location "..\frontend" -ErrorAction Stop

Write-Host "Installing Node.js dependencies..."
npm install

Write-Host "Installing additional frontend dependencies..."
npm install react-icons

Write-Host "Starting frontend..."
npm run dev

# When frontend stops, kill the backend
Write-Host "Stopping backend..."
try {
    Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    Write-Host "Backend stopped."
} catch {
    Write-Host "Backend process already stopped."
}

Write-Host "Application stopped."
