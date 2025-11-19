from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import cv2
import asyncio
import aiofiles
import json
from urllib.parse import urlparse
import threading
import time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'nvr-cctv-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Directories
RECORDINGS_DIR = ROOT_DIR / 'recordings'
UPLOADS_DIR = ROOT_DIR / 'uploads'
RECORDINGS_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Recording manager
active_recordings = {}

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime

class Camera(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    stream_url: str
    location: Optional[str] = None
    status: str = "offline"  # online, offline, recording
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CameraCreate(BaseModel):
    name: str
    stream_url: str
    location: Optional[str] = None

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    stream_url: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None

class Recording(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    camera_id: str
    camera_name: str
    filename: str
    filepath: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[int] = None  # in seconds
    file_size: Optional[int] = None  # in bytes
    user_id: str

class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_settings"
    app_name: str = "NVR CCTV System"
    app_logo: Optional[str] = None
    recording_duration: int = 3600  # default 1 hour in seconds
    motion_detection_enabled: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    app_name: Optional[str] = None
    recording_duration: Optional[int] = None
    motion_detection_enabled: Optional[bool] = None

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    camera_id: Optional[str] = None
    title: str
    message: str
    type: str  # info, warning, error, motion
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    token = jwt.encode(
        {"user_id": user_id, "exp": expiration},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    return token

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# ============= RECORDING MANAGER =============

class RecordingManager:
    def __init__(self, camera_id: str, stream_url: str, duration: int, output_path: str):
        self.camera_id = camera_id
        self.stream_url = stream_url
        self.duration = duration
        self.output_path = output_path
        self.stop_flag = threading.Event()
        self.thread = None

    def start(self):
        self.thread = threading.Thread(target=self._record)
        self.thread.start()

    def stop(self):
        self.stop_flag.set()
        if self.thread:
            self.thread.join(timeout=5)

    def _record(self):
        try:
            cap = cv2.VideoCapture(self.stream_url)
            if not cap.isOpened():
                logging.error(f"Failed to open stream: {self.stream_url}")
                return

            fps = int(cap.get(cv2.CAP_PROP_FPS)) or 20
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(self.output_path, fourcc, fps, (width, height))

            start_time = time.time()
            while not self.stop_flag.is_set():
                if self.duration and (time.time() - start_time) > self.duration:
                    break

                ret, frame = cap.read()
                if not ret:
                    break

                out.write(frame)

            cap.release()
            out.release()
        except Exception as e:
            logging.error(f"Recording error: {str(e)}")

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )

    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at
    )

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt_token(user_doc['id'])
    return {
        "token": token,
        "user": {
            "id": user_doc['id'],
            "username": user_doc['username'],
            "email": user_doc['email']
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])

    return UserResponse(**user_doc)

# ============= CAMERA ROUTES =============

@api_router.get("/cameras", response_model=List[Camera])
async def get_cameras(user_id: str = Depends(get_current_user)):
    cameras = await db.cameras.find({"user_id": user_id}, {"_id": 0}).to_list(1000)

    for camera in cameras:
        if isinstance(camera['created_at'], str):
            camera['created_at'] = datetime.fromisoformat(camera['created_at'])
        if isinstance(camera['updated_at'], str):
            camera['updated_at'] = datetime.fromisoformat(camera['updated_at'])

    return cameras

@api_router.post("/cameras", response_model=Camera)
async def create_camera(camera_data: CameraCreate, user_id: str = Depends(get_current_user)):
    camera = Camera(
        name=camera_data.name,
        stream_url=camera_data.stream_url,
        location=camera_data.location,
        user_id=user_id
    )

    doc = camera.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.cameras.insert_one(doc)

    # Create notification
    notif = Notification(
        user_id=user_id,
        camera_id=camera.id,
        title="Camera Added",
        message=f"Camera '{camera.name}' has been added successfully",
        type="info"
    )
    notif_doc = notif.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    await db.notifications.insert_one(notif_doc)

    return camera

@api_router.get("/cameras/{camera_id}", response_model=Camera)
async def get_camera(camera_id: str, user_id: str = Depends(get_current_user)):
    camera = await db.cameras.find_one({"id": camera_id, "user_id": user_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    if isinstance(camera['created_at'], str):
        camera['created_at'] = datetime.fromisoformat(camera['created_at'])
    if isinstance(camera['updated_at'], str):
        camera['updated_at'] = datetime.fromisoformat(camera['updated_at'])

    return camera

@api_router.put("/cameras/{camera_id}", response_model=Camera)
async def update_camera(camera_id: str, update_data: CameraUpdate, user_id: str = Depends(get_current_user)):
    camera = await db.cameras.find_one({"id": camera_id, "user_id": user_id})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

    await db.cameras.update_one({"id": camera_id}, {"$set": update_dict})

    updated_camera = await db.cameras.find_one({"id": camera_id}, {"_id": 0})
    if isinstance(updated_camera['created_at'], str):
        updated_camera['created_at'] = datetime.fromisoformat(updated_camera['created_at'])
    if isinstance(updated_camera['updated_at'], str):
        updated_camera['updated_at'] = datetime.fromisoformat(updated_camera['updated_at'])

    return updated_camera

@api_router.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str, user_id: str = Depends(get_current_user)):
    result = await db.cameras.delete_one({"id": camera_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Delete related recordings
    await db.recordings.delete_many({"camera_id": camera_id})

    return {"message": "Camera deleted successfully"}

@api_router.get("/cameras/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: str, user_id: str = Depends(get_current_user)):
    camera = await db.cameras.find_one({"id": camera_id, "user_id": user_id})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    try:
        cap = cv2.VideoCapture(camera['stream_url'])
        ret, frame = cap.read()
        cap.release()

        if not ret:
            raise HTTPException(status_code=500, detail="Failed to capture snapshot")

        _, buffer = cv2.imencode('.jpg', frame)
        return StreamingResponse(iter([buffer.tobytes()]), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error capturing snapshot: {str(e)}")

# ============= RECORDING ROUTES =============

@api_router.post("/recordings/start/{camera_id}")
async def start_recording(camera_id: str, user_id: str = Depends(get_current_user)):
    camera = await db.cameras.find_one({"id": camera_id, "user_id": user_id})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    if camera_id in active_recordings:
        raise HTTPException(status_code=400, detail="Recording already in progress")

    # Get settings
    settings = await db.settings.find_one({"id": "app_settings"})
    duration = settings['recording_duration'] if settings else 3600

    # Create recording entry
    recording_id = str(uuid.uuid4())
    filename = f"{camera['name']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
    filepath = str(RECORDINGS_DIR / filename)

    recording = Recording(
        id=recording_id,
        camera_id=camera_id,
        camera_name=camera['name'],
        filename=filename,
        filepath=filepath,
        start_time=datetime.now(timezone.utc),
        user_id=user_id
    )

    # Start recording
    manager = RecordingManager(camera_id, camera['stream_url'], duration, filepath)
    manager.start()
    active_recordings[camera_id] = {
        "manager": manager,
        "recording_id": recording_id
    }

    # Update camera status
    await db.cameras.update_one(
        {"id": camera_id},
        {"$set": {"status": "recording", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Save recording to database
    rec_doc = recording.model_dump()
    rec_doc['start_time'] = rec_doc['start_time'].isoformat()
    await db.recordings.insert_one(rec_doc)

    return {"message": "Recording started", "recording_id": recording_id}

@api_router.post("/recordings/stop/{camera_id}")
async def stop_recording(camera_id: str, user_id: str = Depends(get_current_user)):
    if camera_id not in active_recordings:
        raise HTTPException(status_code=400, detail="No active recording")

    rec_data = active_recordings[camera_id]
    rec_data["manager"].stop()
    del active_recordings[camera_id]

    # Update recording
    end_time = datetime.now(timezone.utc)
    recording = await db.recordings.find_one({"id": rec_data["recording_id"]})

    if recording:
        start_time = datetime.fromisoformat(recording['start_time'])
        duration = int((end_time - start_time).total_seconds())

        file_size = 0
        if os.path.exists(recording['filepath']):
            file_size = os.path.getsize(recording['filepath'])

        await db.recordings.update_one(
            {"id": rec_data["recording_id"]},
            {"$set": {
                "end_time": end_time.isoformat(),
                "duration": duration,
                "file_size": file_size
            }}
        )

    # Update camera status
    await db.cameras.update_one(
        {"id": camera_id},
        {"$set": {"status": "online", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": "Recording stopped"}

@api_router.get("/recordings", response_model=List[Recording])
async def get_recordings(user_id: str = Depends(get_current_user)):
    recordings = await db.recordings.find({"user_id": user_id}, {"_id": 0}).to_list(1000)

    for rec in recordings:
        if isinstance(rec['start_time'], str):
            rec['start_time'] = datetime.fromisoformat(rec['start_time'])
        if rec.get('end_time') and isinstance(rec['end_time'], str):
            rec['end_time'] = datetime.fromisoformat(rec['end_time'])

    return recordings

@api_router.get("/recordings/{recording_id}")
async def get_recording(recording_id: str, user_id: str = Depends(get_current_user)):
    recording = await db.recordings.find_one({"id": recording_id, "user_id": user_id}, {"_id": 0})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    if not os.path.exists(recording['filepath']):
        raise HTTPException(status_code=404, detail="Recording file not found")

    return FileResponse(recording['filepath'], media_type="video/mp4", filename=recording['filename'])

@api_router.delete("/recordings/{recording_id}")
async def delete_recording(recording_id: str, user_id: str = Depends(get_current_user)):
    recording = await db.recordings.find_one({"id": recording_id, "user_id": user_id})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Delete file
    if os.path.exists(recording['filepath']):
        os.remove(recording['filepath'])

    # Delete from database
    await db.recordings.delete_one({"id": recording_id})

    return {"message": "Recording deleted successfully"}

# ============= SETTINGS ROUTES =============

@api_router.get("/settings", response_model=AppSettings)
async def get_settings(user_id: str = Depends(get_current_user)):
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = AppSettings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings

    if isinstance(settings['updated_at'], str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])

    return settings

@api_router.put("/settings", response_model=AppSettings)
async def update_settings(update_data: SettingsUpdate, user_id: str = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": update_dict},
        upsert=True
    )

    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if isinstance(settings['updated_at'], str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])

    return settings

@api_router.post("/settings/upload-logo")
async def upload_logo(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Save file
    filename = f"logo_{uuid.uuid4()}{Path(file.filename).suffix}"
    filepath = UPLOADS_DIR / filename

    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)

    logo_url = f"/api/uploads/{filename}"

    # Update settings
    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": {"app_logo": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {"logo_url": logo_url}

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(filepath)

# ============= NOTIFICATIONS ROUTES =============

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(user_id: str = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    for notif in notifications:
        if isinstance(notif['created_at'], str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])

    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_id: str = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user_id},
        {"$set": {"is_read": True}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification marked as read"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    # Stop all active recordings
    for camera_id, rec_data in active_recordings.items():
        rec_data["manager"].stop()
    client.close()