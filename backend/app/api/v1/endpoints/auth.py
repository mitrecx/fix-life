"""Authentication endpoints for user registration and login."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.schemas.user import (
    UserRegister,
    UserRegisterWithCode,
    UserLogin,
    TokenResponse,
    SendVerificationCodeRequest,
    SendVerificationCodeResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
    ResetPasswordRequest
)
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.core.security import create_access_token, get_password_hash, authenticate_user

router = APIRouter()


@router.post("/send-verification-code", response_model=SendVerificationCodeResponse)
def send_verification_code(
    request: SendVerificationCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Send a verification code to the given email.

    The code is valid for 10 minutes. For development purposes, the code
    is also returned in the response.
    """
    service = AuthService(db)

    # For password reset, verify email exists first
    if request.purpose == "reset_password":
        if not service.check_email_exists(request.email):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="该邮箱未注册"
            )

    email_service = EmailService(db)
    success, message, code = email_service.send_verification_email(request.email, request.purpose)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=message
        )

    return SendVerificationCodeResponse(message=message, code=code)


@router.post("/verify-code", response_model=VerifyCodeResponse)
def verify_code(
    request: VerifyCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Verify a code for the given email and purpose.

    Returns whether the code is valid and marks it as used if valid.
    """
    email_service = EmailService(db)
    valid, message = email_service.verify_code(request.email, request.code, request.purpose)

    return VerifyCodeResponse(valid=valid, message=message)


@router.get("/check-email")
def check_email_exists(
    email: str,
    db: Session = Depends(get_db),
):
    """
    Check if an email is already registered.

    Returns whether the email exists in the database.
    """
    service = AuthService(db)
    exists = service.check_email_exists(email)
    return {"exists": exists}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserRegisterWithCode,
    db: Session = Depends(get_db),
):
    """
    Register a new user with email verification.

    Requires a valid email verification code. Validates that email and username
    are unique, creates user with hashed password, and returns JWT token for
    immediate login.
    """
    service = AuthService(db)
    email_service = EmailService(db)

    # Verify the email verification code
    valid, message = email_service.verify_code(user_in.email, user_in.verification_code, "register")
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

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


@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset password with email verification code.

    Verifies the email verification code and updates the user's password.
    """
    service = AuthService(db)
    email_service = EmailService(db)

    # Verify the email verification code
    valid, message = email_service.verify_code(request.email, request.code, "reset_password")
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    # Check if email exists
    user = service.get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )

    # Update password
    hashed_password = get_password_hash(request.new_password)
    user.hashed_password = hashed_password
    db.commit()

    return {"message": "密码重置成功"}


@router.get("/me")
def get_current_user_info(
    current_user = Depends(get_current_user),
):
    """
    Get current authenticated user information.

    Requires valid JWT token in Authorization header.
    """
    return current_user
