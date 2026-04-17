from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL
from app.routes import chat, reminders, location, health
from app.services import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle app startup and shutdown events."""
    # Startup: Start the reminder scheduler
    scheduler.start_scheduler()
    yield
    # Shutdown: Stop the scheduler
    scheduler.stop_scheduler()


app = FastAPI(
    title="Healthcare Chatbot API",
    description="AI-powered healthcare assistant with symptom analysis, emotion detection, and health tracking.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(chat.router)
app.include_router(reminders.router)
app.include_router(location.router)
app.include_router(health.router)


@app.get("/")
async def root():
    return {
        "message": "Healthcare Chatbot API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/api/health-check")
async def health_check():
    return {"status": "ok"}
