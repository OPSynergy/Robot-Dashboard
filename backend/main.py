from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Path, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json
import asyncio
import uvicorn
import uuid
import math
import os
import shutil
from pydantic import ValidationError
import sqlite3
import contextlib
import subprocess
import time

UPLOAD_DIR = "uploads/maps"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Import auth router (make sure this file exists)
try:
    from auth import router as auth_router
    AUTH_AVAILABLE = True
except ImportError:
    print("Warning: auth.py not found. Authentication routes will be disabled.")
    AUTH_AVAILABLE = False

# Try to import MQTT, but don't fail if it's not available
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    print("Warning: paho-mqtt not installed. MQTT features will be disabled.")
    MQTT_AVAILABLE = False

try:
    import random
    RANDOM_AVAILABLE = True
except ImportError:
    RANDOM_AVAILABLE = False

app = FastAPI(title="Robot Dashboard")

# Configure CORS with specific origins
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",  # Vite dev server alternative
    "http://localhost:3000",  # React dev server (if needed)
    "http://127.0.0.1:3000",  # React dev server alternative
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files statically
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include auth router only if available
if AUTH_AVAILABLE:
    app.include_router(auth_router, prefix="/auth", tags=["authentication"])

# MQTT client setup (only if available)
mqtt_client = None
if MQTT_AVAILABLE:
    try:
        mqtt_client = mqtt.Client()
        mqtt_client.connect("localhost", 1883, 60)
        mqtt_client.loop_start()
        print("MQTT client connected successfully")
    except Exception as e:
        print(f"MQTT connection error (will continue without MQTT): {e}")
        mqtt_client = None

# Start Mosquitto broker if not already running
try:
    subprocess.Popen(['mosquitto', '-c', '/etc/mosquitto/mosquitto.conf'])
    print("Mosquitto broker started (if not already running).")
    time.sleep(1)  # Give Mosquitto a second to start
except Exception as e:
    print(f"Could not start Mosquitto automatically: {e}")

def initialize_robot_setup_db(db_path='robot_setup.db'):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS robot_setup (
        robot_id TEXT PRIMARY KEY,
        robot_name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        battery INTEGER NOT NULL,
        last_updated TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        icon TEXT
    )
    ''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS maps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        map_name TEXT NOT NULL,
        map_type TEXT NOT NULL,
        map_image TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()
    print(f"{db_path} created and tables initialized.")

class Command(BaseModel):
    type: str
    parameters: Dict[str, Any]

class Goal(BaseModel):
    id: str
    type: str = "click_goal"
    status: str
    time: str
    x: float
    y: float

class CreateGoal(BaseModel):
    x: float
    y: float
    robot_id: str

class RobotSetupModel(BaseModel):
    robot_id: str
    robot_name: str
    type: str
    status: str
    battery: int
    last_updated: str
    enabled: bool = True
    icon: Optional[str] = None

class MapModel(BaseModel):
    map_name: str
    map_type: str
    map_image: str

class MapUpdateModel(BaseModel):
    id: int
    map_name: Optional[str] = None
    map_type: Optional[str] = None
    map_image: Optional[str] = None

# Robot state management
robot_state = {
    "robots": {}
}

connected_clients: List[WebSocket] = []

def get_or_create_robot(robot_id):
    if robot_id not in robot_state["robots"]:
        robot_state["robots"][robot_id] = {
            "position": [150 + len(robot_state["robots"]) * 50, 200 + len(robot_state["robots"]) * 30],
            "orientation": 0,
            "battery": 100,
            "currentTask": "Idle",
            "lastUpdated": datetime.now().strftime("%H:%M:%S"),
            "goals": [],
            "target_goal": None,
            "speed": 0.5
        }
    if "speed" not in robot_state["robots"][robot_id]:
        robot_state["robots"][robot_id]["speed"] = 0.5
    return robot_state["robots"][robot_id]

def sync_robots_from_db():
    """Sync enabled robots from database to robot_state"""
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('SELECT robot_id FROM robot_setup WHERE enabled = 1')
        rows = cursor.fetchall()
        conn.close()
        
        for idx, row in enumerate(rows):
            robot_id = row[0]
            if robot_id not in robot_state["robots"]:
                robot_state["robots"][robot_id] = {
                    "position": [150 + idx * 60, 200 + idx * 40],
                    "orientation": 0,
                    "battery": 100,
                    "currentTask": "Idle",
                    "lastUpdated": datetime.now().strftime("%H:%M:%S"),
                    "goals": [],
                    "target_goal": None,
                    "speed": 0.5
                }
        print(f"Synced {len(rows)} robots from database to robot_state")
    except Exception as e:
        print(f"Error syncing robots from database: {e}")

def get_next_goal(robot):
    """Get the next queued goal for a specific robot"""
    for goal in robot["goals"]:
        if goal["status"] == "queued":
            return goal
    return None

async def broadcast_state():
    """Broadcast robot state to all connected WebSocket clients"""
    if not connected_clients:
        return
    
    state_copy = robot_state.copy()
    state_copy["lastUpdated"] = datetime.now().strftime("%H:%M:%S")
    
    disconnected_clients = []
    for client in connected_clients:
        try:
            await client.send_json(state_copy)
        except Exception as e:
            print(f"Error broadcasting to client: {e}")
            disconnected_clients.append(client)
    
    for client in disconnected_clients:
        try:
            connected_clients.remove(client)
        except ValueError:
            pass

async def robot_movement_task():
    print("Robot movement task started.")
    while True:
        try:
            for robot_id, robot in robot_state["robots"].items():
                # Update goal queue for this robot
                current_goals = [g for g in robot["goals"] if g["status"] == "current"]
                if not current_goals and not robot["target_goal"]:
                    next_goal = get_next_goal(robot)
                    if next_goal:
                        next_goal["status"] = "current"
                        next_goal["time"] = datetime.now().strftime("%H:%M:%S")
                        robot["target_goal"] = next_goal

                # Move toward target goal
                if robot["target_goal"]:
                    target_x = robot["target_goal"]["x"]
                    target_y = robot["target_goal"]["y"]
                    current_x, current_y = robot["position"]
                    distance = math.sqrt((target_x - current_x)**2 + (target_y - current_y)**2)
                    tolerance = 5
                    movement_step = 5

                    if distance < tolerance:
                        robot["position"] = [target_x, target_y]
                        for goal in robot["goals"]:
                            if goal["id"] == robot["target_goal"]["id"]:
                                goal["status"] = "completed"
                                goal["time"] = datetime.now().strftime("%H:%M:%S")
                                break
                        robot["currentTask"] = "Idle"
                        robot["target_goal"] = None
                        
                        # Start next goal in queue
                        next_goal = get_next_goal(robot)
                        if next_goal:
                            next_goal["status"] = "current"
                            next_goal["time"] = datetime.now().strftime("%H:%M:%S")
                            robot["target_goal"] = next_goal
                    else:
                        angle = math.atan2(target_y - current_y, target_x - current_x)
                        move_x = movement_step * math.cos(angle)
                        move_y = movement_step * math.sin(angle)
                        robot["position"][0] += move_x
                        robot["position"][1] += move_y
                        robot["currentTask"] = "Navigating"
                        robot["orientation"] = math.degrees(angle) % 360

                    robot["lastUpdated"] = datetime.now().strftime("%H:%M:%S")

            await broadcast_state()
            await asyncio.sleep(0.1)
        except Exception as e:
            print(f"Error in robot movement task: {e}")
            await asyncio.sleep(1)

async def robot_publisher_task():
    """Task to publish robot sensor data via MQTT"""
    print("Robot publisher task started.")
    while True:
        try:
            for robot_id, robot in robot_state["robots"].items():
                # Generate random sensor data (only if random is available)
                if RANDOM_AVAILABLE:
                    battery = random.randint(20, 100)
                    sensors = {
                        "Lidar": random.randint(0, 100),
                        "Camera": random.randint(0, 100),
                        "Ultrasonic": random.randint(0, 100)
                    }
                    temperature = round(random.uniform(25, 30), 2)
                else:
                    battery = 75
                    sensors = {"Lidar": 50, "Camera": 50, "Ultrasonic": 50}
                    temperature = 27.5

                robot["battery"] = battery
                robot["sensors"] = sensors

                # Publish data if MQTT client is available
                if mqtt_client:
                    try:
                        mqtt_client.publish(f"robot/{robot_id}/speed", robot.get("speed", 0.5))
                        mqtt_client.publish(f"robot/{robot_id}/battery", battery)
                        mqtt_client.publish(f"robot/{robot_id}/sensors", json.dumps(sensors))
                        mqtt_client.publish(f"robot/{robot_id}/temperature", temperature)
                        print(f"Published for {robot_id}: battery={battery}, speed={robot.get('speed', 0.5)}, temp={temperature}, sensors={sensors}")
                    except Exception as e:
                        print(f"MQTT publish error for {robot_id}: {e}")

            await asyncio.sleep(2)
        except Exception as e:
            print(f"Error in robot publisher task: {e}")
            await asyncio.sleep(1)

# Database helper functions
def ensure_icon_column():
    conn = sqlite3.connect('robot_setup.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(robot_setup)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'icon' not in columns:
        cursor.execute("ALTER TABLE robot_setup ADD COLUMN icon TEXT")
        conn.commit()
    conn.close()

def ensure_enabled_column():
    conn = sqlite3.connect('robot_setup.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(robot_setup)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'enabled' not in columns:
        cursor.execute("ALTER TABLE robot_setup ADD COLUMN enabled INTEGER DEFAULT 1")
        conn.commit()
        print("Enabled column added to robot_setup table")
    conn.close()

# Startup event
@app.on_event("startup")
async def startup_event():
    try:
        initialize_robot_setup_db()
        ensure_icon_column()
        ensure_enabled_column()
        print("Database initialized successfully")
        
        # Sync robots from database to robot_state
        sync_robots_from_db()
        
        # Start background tasks
        asyncio.create_task(robot_movement_task())
        asyncio.create_task(robot_publisher_task())
        print("Background tasks started")
        print("FastAPI server startup complete!")
    except Exception as e:
        print(f"Error during startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down application...")
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()

# API Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to the Robot Dashboard FastAPI backend!", "status": "running"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "connected_clients": len(connected_clients),
        "robots": len(robot_state["robots"])
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print(f"WebSocket connection attempt from: {websocket.client}")
    
    try:
        await websocket.accept()
        connected_clients.append(websocket)
        print(f"WebSocket connected. Total clients: {len(connected_clients)}")
        
        # Send initial state
        await websocket.send_json(robot_state)
        print("Initial state sent to new client")
        
        while True:
            try:
                data = await websocket.receive_text()
                print(f"Received WebSocket message: {data}")
                
                try:
                    command = json.loads(data)
                    if command.get("type") == "get_status":
                        await websocket.send_json(robot_state)
                    elif command.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except json.JSONDecodeError:
                    print(f"Invalid JSON received: {data}")
                    
            except WebSocketDisconnect:
                print("WebSocket client disconnected normally")
                break
            except Exception as e:
                print(f"Error in WebSocket message loop: {e}")
                break
                
    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
            print(f"WebSocket client removed. Remaining clients: {len(connected_clients)}")

@app.get("/status")
def get_status():
    return robot_state

@app.get("/goals")
def get_goals():
    return {
        robot_id: robot["goals"]
        for robot_id, robot in robot_state["robots"].items()
    }

@app.post("/command")
async def send_command(command: Command):
    try:
        target_robot_id = command.parameters.get("robot_id")
        
        if target_robot_id:
            # Apply command to specific robot
            if target_robot_id not in robot_state["robots"]:
                raise HTTPException(status_code=404, detail=f"Robot {target_robot_id} not found")
            robots_to_update = [(target_robot_id, robot_state["robots"][target_robot_id])]
        else:
            # Apply command to all robots (fallback behavior)
            robots_to_update = list(robot_state["robots"].items())
        
        for robot_id, robot in robots_to_update:
            if command.type == "move":
                robot["position"][0] += command.parameters.get("x", 0)
                robot["position"][1] += command.parameters.get("y", 0)
            elif command.type == "rotate":
                robot["orientation"] = (robot["orientation"] + command.parameters.get("angle", 0)) % 360
            elif command.type == "set_speed":
                robot["speed"] = command.parameters.get("speed", robot["speed"])
            
            robot["lastUpdated"] = datetime.now().strftime("%H:%M:%S")
        
        await broadcast_state()
        return {"status": "success", "message": f"Command {command.type} executed successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/goal/add")
async def add_goal(request: Request):
    try:
        raw_data = await request.json()
        print(f"Received raw goal data: {raw_data}")
        new_goal = CreateGoal(**raw_data)
        robot_id = new_goal.robot_id
        robot = get_or_create_robot(robot_id)
        
        goal_id = f"goal_{uuid.uuid4().hex[:4]}"
        goal_data = new_goal.dict()
        goal_data["id"] = goal_id
        goal_data["time"] = datetime.now().strftime("%H:%M:%S")
        goal_data["type"] = "click_goal"
        
        current_goals = [g for g in robot["goals"] if g["status"] == "current"]
        if not current_goals and not robot["target_goal"]:
            goal_data["status"] = "current"
            robot["target_goal"] = goal_data
            print(f"New goal added as current: {goal_data}")
        else:
            goal_data["status"] = "queued"
            print(f"New goal added to queue: {goal_data}")
        
        robot["goals"].append(goal_data)
        await broadcast_state()
        
        return {"status": "success", "message": f"Goal {goal_id} added successfully", "goal_id": goal_id}
    except ValidationError as e:
        print(f"Validation error: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        print(f"Error in add_goal: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/goal/update")
async def update_goal(goal: Goal):
    try:
        goal_found = False
        for robot_id, robot in robot_state["robots"].items():
            for g in robot["goals"]:
                if g["id"] == goal.id:
                    goal_found = True
                    
                    if goal.status == "current":
                        for other_goal in robot["goals"]:
                            if other_goal["id"] != goal.id and other_goal["status"] == "current":
                                other_goal["status"] = "queued"
                        robot["target_goal"] = g
                    
                    g["status"] = goal.status
                    if goal.status in ["completed", "current"]:
                        g["time"] = datetime.now().strftime("%H:%M:%S")
                    
                    if goal.status == "completed" and robot["target_goal"] and robot["target_goal"]["id"] == goal.id:
                        robot["target_goal"] = None
                        robot["currentTask"] = "Idle"
                    
                    break
            if goal_found:
                break
        
        if not goal_found:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        await broadcast_state()
        return {"status": "success", "message": f"Goal {goal.id} updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/goal/cancel")
async def cancel_goal(request: Request = None):
    try:
        robot_id = None
        if request:
            try:
                body = await request.json()
                robot_id = body.get("robot_id")
            except:
                pass
        
        for rid, robot in robot_state["robots"].items():
            if robot_id and rid != robot_id:
                continue
            
            robot["target_goal"] = None
            robot["currentTask"] = "Idle"
            
            for goal in robot["goals"]:
                if goal["status"] == "current":
                    goal["status"] = "cancelled"
                    goal["time"] = datetime.now().strftime("%H:%M:%S")
            
            for goal in robot["goals"]:
                if goal["status"] == "queued":
                    goal["status"] = "cancelled"
        
        await broadcast_state()
        return {"status": "success", "message": "Goals cancelled, robot stopped"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Robot setup endpoints
@app.post("/robot-setup")
async def add_robot_setup(robot: RobotSetupModel):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO robot_setup (robot_id, robot_name, type, status, battery, last_updated, enabled, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            robot.robot_id,
            robot.robot_name,
            robot.type,
            robot.status,
            robot.battery,
            robot.last_updated,
            1 if robot.enabled else 0,
            robot.icon
        ))
        conn.commit()
        conn.close()
        
        # Add robot to robot_state if enabled
        if robot.enabled:
            get_or_create_robot(robot.robot_id)
            await broadcast_state()
        
        return {"status": "success", "message": f"Robot {robot.robot_id} added successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Robot ID already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/robot-setup")
def get_all_robots():
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('SELECT robot_id, robot_name, type, status, battery, last_updated, enabled, icon FROM robot_setup')
        rows = cursor.fetchall()
        conn.close()
        
        robots = []
        for row in rows:
            robots.append({
                "robot_id": row[0],
                "robot_name": row[1],
                "type": row[2],
                "status": row[3],
                "battery": row[4],
                "last_updated": row[5],
                "enabled": bool(row[6]),
                "icon": row[7]
            })
        return robots
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/robot-setup/count")
def get_robot_count():
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM robot_setup WHERE enabled = 1')
        db_count = cursor.fetchone()[0]
        conn.close()
        return {"count": db_count}
    except Exception as e:
        return {"count": 0}

@app.put("/robot-setup/{robot_id}")
async def update_robot(robot_id: str, robot: RobotSetupModel):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE robot_setup SET robot_name=?, type=?, status=?, battery=?, last_updated=?, enabled=?, icon=?
            WHERE robot_id=?
        ''', (
            robot.robot_name,
            robot.type,
            robot.status,
            robot.battery,
            robot.last_updated,
            1 if robot.enabled else 0,
            robot.icon,
            robot_id
        ))
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Robot not found")
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Robot {robot_id} updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/robot-setup/{robot_id}")
async def delete_robot(robot_id: str = Path(...)):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM robot_setup WHERE robot_id=?', (robot_id,))
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Robot not found")
        conn.commit()
        conn.close()
        
        # Remove from robot_state
        if robot_id in robot_state["robots"]:
            del robot_state["robots"][robot_id]
        await broadcast_state()
        
        return {"status": "success", "message": f"Robot {robot_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/robot-setup/{robot_id}/toggle")
async def toggle_robot(robot_id: str):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('SELECT enabled FROM robot_setup WHERE robot_id=?', (robot_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail="Robot not found")
        
        current_enabled = result[0]
        new_enabled = 0 if current_enabled else 1
        cursor.execute('UPDATE robot_setup SET enabled=? WHERE robot_id=?', (new_enabled, robot_id))
        conn.commit()
        conn.close()
        
        # Update robot_state
        if new_enabled:
            get_or_create_robot(robot_id)
        else:
            if robot_id in robot_state["robots"]:
                del robot_state["robots"][robot_id]
        
        await broadcast_state()
        return {"status": "success", "message": f"Robot {robot_id} toggled successfully", "enabled": bool(new_enabled)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Maps API endpoints
@app.post("/maps")
async def add_map(map_data: MapModel):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO maps (map_name, map_type, map_image)
            VALUES (?, ?, ?)
        ''', (map_data.map_name, map_data.map_type, map_data.map_image))
        map_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Map added successfully", "id": map_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/maps/upload")
async def upload_map(
    map_name: str = Form(...),
    map_type: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        map_image_url = f"/uploads/maps/{unique_filename}"
        
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO maps (map_name, map_type, map_image)
            VALUES (?, ?, ?)
        ''', (map_name, map_type, map_image_url))
        map_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {"status": "success", "message": "Map uploaded successfully", "id": map_id, "image_url": map_image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/maps")
def get_maps():
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id, map_name, map_type, map_image FROM maps')
        rows = cursor.fetchall()
        conn.close()
        
        maps = []
        for row in rows:
            maps.append({
                "id": row[0],
                "map_name": row[1],
                "map_type": row[2],
                "map_image": row[3]
            })
        return maps
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/maps/{map_id}")
def get_map(map_id: int):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id, map_name, map_type, map_image FROM maps WHERE id=?', (map_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Map not found")
        
        return {
            "id": row[0],
            "map_name": row[1],
            "map_type": row[2],
            "map_image": row[3]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/maps/{map_id}")
async def update_map(map_id: int, map_data: MapUpdateModel):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM maps WHERE id=?', (map_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Map not found")
        
        updates = []
        values = []
        if map_data.map_name is not None:
            updates.append("map_name=?")
            values.append(map_data.map_name)
        if map_data.map_type is not None:
            updates.append("map_type=?")
            values.append(map_data.map_type)
        if map_data.map_image is not None:
            updates.append("map_image=?")
            values.append(map_data.map_image)
        
        if updates:
            values.append(map_id)
            cursor.execute(f'UPDATE maps SET {", ".join(updates)} WHERE id=?', values)
            conn.commit()
        
        conn.close()
        return {"status": "success", "message": "Map updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/maps/{map_id}")
async def delete_map(map_id: int):
    try:
        conn = sqlite3.connect('robot_setup.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM maps WHERE id=?', (map_id,))
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Map not found")
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Map deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoints
@app.get("/ws-test")
def websocket_test():
    return {
        "message": "WebSocket endpoint is available at ws://localhost:8000/ws",
        "connected_clients": len(connected_clients),
        "instructions": "Connect using a WebSocket client to test the connection"
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Robot Dashboard server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)