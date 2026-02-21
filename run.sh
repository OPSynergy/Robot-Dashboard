#!/bin/bash

# Always run from your project root
cd ~/Documents/rfapp || { echo "Project root not found!"; exit 1; }

echo "Starting backend..."
echo "Activating virtual environment..."

# Navigate to backend directory
cd backend || { echo "Backend directory not found!"; exit 1; }

# Activate virtual environment
source myenv/bin/activate || { echo "Failed to activate virtual environment!"; exit 1; }

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Starting Python backend..."
python3 main.py &
BACKEND_PID=$!

echo "Backend started with PID $BACKEND_PID"

# Move to frontend directory (go up one level, then into frontend)
cd ../frontend || { echo "Frontend directory not found!"; exit 1; }

echo "Installing Node.js dependencies..."
npm install

echo "Installing additional frontend dependencies..."
npm install react-icons

echo "Starting frontend..."
npm run dev

# When frontend stops, kill the backend
echo "Stopping backend..."
kill $BACKEND_PID 2>/dev/null || echo "Backend process already stopped"

echo "Application stopped."