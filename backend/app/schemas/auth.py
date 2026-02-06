"""Authentication request and response schemas."""

from pydantic import BaseModel, EmailStr


class AuthRequest(BaseModel):
    """Login/signup request body."""

    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Authentication response with user info (token sent via HttpOnly cookie only)."""

    user_id: str
    email: str
