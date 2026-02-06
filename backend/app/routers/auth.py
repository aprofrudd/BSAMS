"""Authentication API router."""

import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from uuid import UUID

from app.core.supabase_client import get_supabase_client
from app.core.security import AuthenticatedUser, get_current_user
from app.schemas.auth import AuthRequest, AuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Cookie settings
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = "lax"


def _set_auth_cookie(response: Response, token: str) -> None:
    """Set HttpOnly auth cookie on response."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    """Clear auth cookie from response."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )


def _ensure_profile_exists(client, user_id: str, email: str) -> None:
    """Create a profiles row if one doesn't already exist."""
    client.table("profiles").upsert(
        {"id": user_id, "email": email, "role": "coach"},
        on_conflict="id",
    ).execute()


@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup(request: Request, body: AuthRequest, response: Response):
    """Sign up a new user with email and password."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service not configured",
        )

    try:
        result = client.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not result.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup failed. Check if email confirmation is required.",
        )

    # Ensure profile row exists (fallback if DB trigger didn't fire)
    _ensure_profile_exists(client, str(result.user.id), result.user.email)

    _set_auth_cookie(response, result.session.access_token)

    return AuthResponse(
        access_token=result.session.access_token,
        user_id=result.user.id,
        email=result.user.email,
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: AuthRequest, response: Response):
    """Log in with email and password."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service not configured",
        )

    try:
        result = client.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Ensure profile row exists (fallback for users created before trigger)
    _ensure_profile_exists(client, str(result.user.id), result.user.email)

    _set_auth_cookie(response, result.session.access_token)

    return AuthResponse(
        access_token=result.session.access_token,
        user_id=result.user.id,
        email=result.user.email,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Log out the current user (invalidate session server-side)."""
    client = get_supabase_client()
    if client:
        try:
            client.auth.sign_out()
        except Exception:
            pass

    _clear_auth_cookie(response)
    return None


@router.get("/me")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Return current authenticated user info."""
    return {"user_id": str(current_user.id), "role": current_user.role}
