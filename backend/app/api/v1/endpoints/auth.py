"""Authentication endpoints for user registration and login."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.schemas.user import UserRegister, UserLogin, TokenResponse
from app.services.auth_service import AuthService
from app.core.security import create_access_token, get_password_hash, authenticate_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserRegister,
    db: Session = Depends(get_db),
):
    """
    Register a new user.

    Validates that email and username are unique, creates user with hashed password,
    and returns JWT token for immediate login.
    """
    service = AuthService(db)

    # Check if email already exists
    if service.check_email_exists(user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    if service.check_username_exists(user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Hash password and create user
    hashed_password = get_password_hash(user_in.password)
    user = service.create_user(user_in, hashed_password)

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@router.post("/login", response_model=TokenResponse)
def login(
    user_in: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Login user with email or username.

    Accepts either email or username in login_identifier field.
    Returns JWT token on successful authentication.
    """
    user = authenticate_user(db, user_in.login_identifier, user_in.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@router.get("/me")
def get_current_user_info(
    current_user = Depends(get_current_user),
):
    """
    Get current authenticated user information.

    Requires valid JWT token in Authorization header.
    """
    return current_user
