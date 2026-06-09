"""Authentication service for user management."""
import secrets
from typing import Optional
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserRegister
from app.services.rbac_service import assign_community_role
from app.services.user_seed_service import try_seed_new_user
from app.services.wechat_service import (
    build_wechat_placeholder_email,
    build_wechat_username,
    random_password_hash_seed,
)


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        return self.db.query(User).filter(User.username == username).first()

    def get_user_by_wechat_openid(self, openid: str) -> Optional[User]:
        """Get user bound to a WeChat mini program openid."""
        return self.db.query(User).filter(User.wechat_openid == openid).first()

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID (UUID)."""
        return self.db.query(User).filter(User.id == user_id).first()

    def check_email_exists(self, email: str) -> bool:
        """Check if email already exists."""
        return self.db.query(User).filter(User.email == email).first() is not None

    def check_username_exists(self, username: str) -> bool:
        """Check if username already exists."""
        return self.db.query(User).filter(User.username == username).first() is not None

    def create_user(self, user_in: UserRegister, hashed_password: str) -> User:
        """
        Create a new user.

        Args:
            user_in: User registration data
            hashed_password: Bcrypt hashed password

        Returns:
            Created User object
        """
        user = User(
            email=user_in.email,
            username=user_in.username,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            is_active=True
        )
        self.db.add(user)
        self.db.flush()
        assign_community_role(self.db, user.id)
        self.db.commit()
        self.db.refresh(user)
        try_seed_new_user(self.db, str(user.id))
        return user

    def get_or_create_wechat_user(self, openid: str, unionid: str | None = None) -> User:
        """Find or create a user for a WeChat mini program login."""
        user = self.get_user_by_wechat_openid(openid)
        if user:
            if unionid and not user.wechat_unionid:
                user.wechat_unionid = unionid
                self.db.commit()
                self.db.refresh(user)
            return user

        username = build_wechat_username(openid)
        while self.check_username_exists(username):
            username = build_wechat_username(openid + secrets.token_hex(2))

        email = build_wechat_placeholder_email(openid)
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(random_password_hash_seed()),
            full_name=None,
            is_active=True,
            wechat_openid=openid,
            wechat_unionid=unionid,
        )
        self.db.add(user)
        self.db.flush()
        assign_community_role(self.db, user.id)
        self.db.commit()
        self.db.refresh(user)
        try_seed_new_user(self.db, str(user.id))
        return user
