"""Authentication API router."""

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.core.supabase_client import get_supabase_client
from app.core.security import get_current_user
from app.schemas.auth import AuthRequest, AuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(body: AuthRequest):
    """Sign up a new user with email and password."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service not configured",
        )

    try:
        response = client.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup failed. Check if email confirmation is required.",
        )

    return AuthResponse(
        access_token=response.session.access_token,
        user_id=response.user.id,
        email=response.user.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: AuthRequest):
    """Log in with email and password."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service not configured",
        )

    try:
        response = client.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return AuthResponse(
        access_token=response.session.access_token,
        user_id=response.user.id,
        email=response.user.email,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: UUID = Depends(get_current_user)):
    """Log out the current user (invalidate session server-side)."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        client.auth.sign_out()
    except Exception:
        pass

    return None


@router.get("/me")
async def get_me(current_user: UUID = Depends(get_current_user)):
    """Return current authenticated user info."""
    return {"user_id": str(current_user)}
