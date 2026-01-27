"""Create a test user for development."""
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

def create_test_user():
    """Create a test user with username 'test' and password 'test12345'."""
    db = SessionLocal()

    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == "test").first()
        if existing_user:
            print(f"User 'test' already exists with email: {existing_user.email}")
            return

        # Create new user
        user = User(
            username="test",
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("test12345"),
            is_active=True,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"✓ Test user created successfully!")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Password: test12345")
        print(f"  ID: {user.id}")

    except Exception as e:
        print(f"✗ Error creating user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
