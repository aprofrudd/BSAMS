"""BSAMS FastAPI Application."""

import logging
import os
import time
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.supabase_client import get_supabase_client
from app.routers import admin, analysis, athletes, auth, consent, events, exercises, training, uploads, wellness

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bsams")

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="BSAMS API",
    description="Boxing Science Athlete Management System",
    version="1.0.0",
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions. Log full traceback, return generic message in production."""
    logger.error(
        "Unhandled exception on %s %s: %s\n%s",
        request.method,
        request.url.path,
        str(exc),
        traceback.format_exc(),
    )
    if settings.environment == "development":
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        "%s %s %d %.0fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


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
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(athletes.router, prefix=settings.api_v1_prefix)
app.include_router(events.router, prefix=settings.api_v1_prefix)
app.include_router(uploads.router, prefix=settings.api_v1_prefix)
app.include_router(analysis.router, prefix=settings.api_v1_prefix)
app.include_router(training.router, prefix=settings.api_v1_prefix)
app.include_router(exercises.router, prefix=settings.api_v1_prefix)
app.include_router(wellness.router, prefix=settings.api_v1_prefix)
app.include_router(consent.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    """Health check endpoint. Pings database to verify connectivity."""
    client = get_supabase_client()
    if not client:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "reason": "Database not configured"},
        )
    try:
        # Lightweight query to verify DB connectivity
        client.table("profiles").select("id").limit(1).execute()
        return {"status": "healthy"}
    except Exception as e:
        logger.error("Health check failed: %s", str(e))
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "reason": "Database unreachable"},
        )
