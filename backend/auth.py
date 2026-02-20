from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
import sqlite3
from typing import Optional, List
import os

router = APIRouter()
security = HTTPBasic()

class LoginRequest(BaseModel):
    employee_id: str
    passcode: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None

# Add UserOut model for GET /users
class UserOut(BaseModel):
    id: int
    name: str
    emp_id: str
    role: str
    passcode: str

# Add UserCreate model for POST /users
class UserCreate(BaseModel):
    name: str
    emp_id: str
    role: str
    passcode: str

# Add UserUpdate model for PUT /users/{user_id}
class UserUpdate(BaseModel):
    name: str
    emp_id: str
    role: str
    passcode: str

def get_db():
    """FastAPI dependency to manage database connections with thread safety."""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'robot.db')
    conn = sqlite3.connect(db_path, check_same_thread=False)  # Added check_same_thread=False
    try:
        yield conn
    finally:
        conn.close()

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, conn: sqlite3.Connection = Depends(get_db)):
    """Login endpoint that validates user credentials against users table"""
    try:
        cursor = conn.cursor()
        # Always treat emp_id and passcode as strings
        emp_id_str = str(request.employee_id)
        passcode_str = str(request.passcode)
        
        print(f"Login attempt - Employee ID: {emp_id_str}")
        
        # Check if user exists and passcode matches in users table
        cursor.execute(
            "SELECT id, name, role FROM users WHERE emp_id = ? AND passcode = ?",
            (emp_id_str, passcode_str)
        )
        result = cursor.fetchone()
        
        if result:
            print(f"Login successful for user: {result[1]}")
            return LoginResponse(
                success=True,
                message="Login successful",
                user_id=str(result[0]),
                name=result[1],
                role=result[2]
            )
        else:
            print(f"Login failed - Invalid credentials for Employee ID: {emp_id_str}")
            raise HTTPException(
                status_code=401,
                detail="Invalid employee ID or passcode"
            )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Database error in login: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/users", response_model=List[UserOut])
async def get_users(conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, emp_id, role, passcode FROM users")
        users = [
            {"id": row[0], "name": row[1], "emp_id": row[2], "role": row[3], "passcode": str(row[4])}
            for row in cursor.fetchall()
        ]
        return users
    except Exception as e:
        print(f"Database error in get_users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add POST endpoint to create a new user
@router.post("/users", response_model=UserOut)
async def create_user(user: UserCreate, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, emp_id, role, passcode) VALUES (?, ?, ?, ?)",
            (user.name, user.emp_id, user.role, user.passcode)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "id": user_id,
            "name": user.name,
            "emp_id": user.emp_id,
            "role": user.role,
            "passcode": user.passcode
        }
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409, detail=f"Employee ID '{user.emp_id}' already exists."
        )
    except Exception as e:
        print(f"Database error in create_user: {e}")
        raise HTTPException(status_code=500, detail="Failed to add user")

# Add PUT endpoint to update a user
@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: int, user: UserUpdate, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET name = ?, emp_id = ?, role = ?, passcode = ? WHERE id = ?",
            (user.name, user.emp_id, user.role, user.passcode, user_id)
        )
        conn.commit()
        if conn.total_changes == 0:
            raise HTTPException(status_code=404, detail=f"User with id {user_id} not found")
        return {
            "id": user_id,
            "name": user.name,
            "emp_id": user.emp_id,
            "role": user.role,
            "passcode": user.passcode
        }
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409, detail=f"Employee ID '{user.emp_id}' already exists for another user."
        )
    except Exception as e:
        print(f"Database error in update_user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

# Add DELETE endpoint to delete a user
@router.delete("/users/{user_id}")
async def delete_user(user_id: int, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        if conn.total_changes == 0:
            raise HTTPException(status_code=404, detail=f"User with id {user_id} not found")
        return {"success": True}
    except Exception as e:
        print(f"Database error in delete_user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

# Initialize database with users table if it doesn't exist
def init_db():
    """Initialize the database with required tables"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'robot.db')
    conn = None
    try:
        # Use check_same_thread=False here too
        conn = sqlite3.connect(db_path, check_same_thread=False)
        cursor = conn.cursor()
        
        # Create users table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emp_id TEXT UNIQUE NOT NULL,
                passcode TEXT NOT NULL,
                name TEXT,
                role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Check if test user exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE emp_id = '1234'")
        if cursor.fetchone()[0] == 0:
            # Insert test user if not exists
            cursor.execute(
                "INSERT INTO users (emp_id, passcode, name, role) VALUES (?, ?, ?, ?)",
                ('1234', '5678', 'Omprakash', 'Admin')
            )
        
        conn.commit()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        if conn:
            conn.close()

# Initialize database when module is imported
init_db()