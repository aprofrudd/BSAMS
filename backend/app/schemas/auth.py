"""Authentication request and response schemas."""

from pydantic import BaseModel, EmailStr


class AuthRequest(BaseModel):
    """Login/signup request body."""

    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Authentication response with token and user info."""

    access_token: str
    user_id: str
    email: str
