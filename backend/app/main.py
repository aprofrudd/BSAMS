"""BSAMS FastAPI Application."""

from fastapi import FastAPI

from app.core.config import get_settings
from app.routers import analysis, athletes, events, uploads

settings = get_settings()

app = FastAPI(
    title="BSAMS API",
    description="Boxing Science Athlete Management System",
    version="1.0.0",
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
