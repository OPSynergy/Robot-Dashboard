# Robot Fleet Dashboard

A modern, real-time robot fleet management dashboard built with React and FastAPI. Monitor, control, and manage multiple robots from a single interface.

![Robot Dashboard](frontend/src/img/storage.png)

## Features

- **Real-time Robot Monitoring** - Track robot positions, status, and battery levels via WebSocket
- **Interactive Map** - Click-to-navigate interface with waypoint support
- **Fleet Management** - Manage multiple robots from a centralized dashboard
- **Mission Control** - Create patrol routes, set waypoints, and assign goals to robots
- **User Management** - Role-based access control with authentication
- **Analytics Dashboard** - View operational metrics and performance data
- **Diagnostics** - Monitor system health and troubleshoot issues
- **Emergency Stop** - System-wide E-stop functionality for safety

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Material UI** - Component library
- **Recharts** - Data visualization
- **MQTT.js** - Real-time messaging
- **Axios** - HTTP client

### Backend
- **FastAPI** - Python web framework
- **Uvicorn** - ASGI server
- **WebSockets** - Real-time communication
- **SQLite** - Database
- **Paho MQTT** - MQTT client
- **Pydantic** - Data validation

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**

## Quick Start

### Option 1: Using the run script

```bash
# Make the script executable
chmod +x run.sh

# Run the application
./run.sh
```

### Option 2: Manual setup

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv myenv

# Activate virtual environment
source myenv/bin/activate  # Linux/Mac
# or
myenv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python main.py
```

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Project Structure

```
rfapp/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── auth.py              # Authentication logic
│   ├── config.py            # Backend configuration
│   ├── robot_publisher.py   # MQTT robot simulation
│   ├── statements.sql       # Database schema
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── RobotMap.jsx
│   │   │   ├── GoalInterface.jsx
│   │   │   ├── FleetManagement.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ...
│   │   ├── assets/          # Images and icons
│   │   ├── config.js        # Frontend configuration
│   │   ├── App.jsx          # Main application
│   │   └── main.jsx         # Entry point
│   ├── package.json
│   └── vite.config.js
├── run.sh                   # Quick start script
├── .gitignore
└── README.md
```

## Configuration

### Backend Configuration

Edit `backend/config.py` to configure:
- Database settings
- MQTT broker connection
- API settings

### Frontend Configuration

Edit `frontend/src/config.js` to configure:
- API base URL
- WebSocket URL
- Feature flags

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/robot-setup` | Get all robots |
| POST | `/robot-setup` | Add a new robot |
| GET | `/robot-setup/count` | Get enabled robot count |
| POST | `/goal/add` | Add a navigation goal |
| POST | `/goal/cancel` | Cancel current goal |
| WS | `/ws` | WebSocket for real-time updates |

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# The built files will be in frontend/dist/
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 8000
   lsof -ti:8000 | xargs kill -9
   
   # Kill process on port 5173
   lsof -ti:5173 | xargs kill -9
   ```

2. **Virtual environment issues on Linux**
   - If the venv was created on Windows, recreate it:
   ```bash
   rm -rf backend/myenv
   python3 -m venv backend/myenv
   ```

3. **MQTT connection errors**
   - Ensure Mosquitto broker is running or disable MQTT in config

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Material UI](https://mui.com/)
