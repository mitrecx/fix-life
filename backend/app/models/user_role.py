from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    )

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_links")

    def __repr__(self):
        return f"<UserRole user_id={self.user_id} role_id={self.role_id}>"
