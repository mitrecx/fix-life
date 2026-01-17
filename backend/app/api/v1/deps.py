# Re-export dependencies for convenience
from app.core.deps import get_db, get_current_user

__all__ = ["get_db", "get_current_user"]
