"""BSAMS FastAPI Application."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import analysis, athletes, events, uploads

settings = get_settings()

app = FastAPI(
    title="BSAMS API",
    description="Boxing Science Athlete Management System",
    version="1.0.0",
)

# CORS configuration
# Allow frontend origins (Vercel production + localhost dev)
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production frontend URL from environment if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(athletes.router, prefix=settings.api_v1_prefix)
app.include_router(events.router, prefix=settings.api_v1_prefix)
app.include_router(uploads.router, prefix=settings.api_v1_prefix)
app.include_router(analysis.router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
