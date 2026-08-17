"""
Seed script — creates demo users for testing.
Run: python -m seed
"""
import asyncio
import logging

from app.core.database import async_session_factory, init_pgvector, engine
from app.core.security import hash_password
from app.models import Base
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEMO_USERS = [
    {
        "email": "admin@helpdesk.edu",
        "password": "admin1234",
        "full_name": "Admin User",
        "role": UserRole.admin,
        "department": "IT Services",
    },
    {
        "email": "student@helpdesk.edu",
        "password": "student1234",
        "full_name": "Jane Student",
        "role": UserRole.student,
        "department": "Computer Science",
    },
    {
        "email": "faculty@helpdesk.edu",
        "password": "faculty1234",
        "full_name": "Dr. Smith",
        "role": UserRole.faculty,
        "department": "Computer Science",
    },
    {
        "email": "support@helpdesk.edu",
        "password": "support1234",
        "full_name": "Support Agent",
        "role": UserRole.support,
        "department": "Student Affairs",
    },
]


async def seed():
    """Create demo users."""
    # Init pgvector extension
    await init_pgvector()

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        for user_data in DEMO_USERS:
            from sqlalchemy import select
            existing = await db.execute(
                select(User).where(User.email == user_data["email"])
            )
            if existing.scalar_one_or_none():
                logger.info(f"User already exists: {user_data['email']}")
                continue

            user = User(
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"],
                department=user_data["department"],
            )
            db.add(user)
            logger.info(f"Created user: {user_data['email']} (role: {user_data['role'].value})")

        await db.commit()

    logger.info("✅ Seed complete!")
    logger.info("")
    logger.info("Demo accounts:")
    for u in DEMO_USERS:
        logger.info(f"  {u['role'].value:10s} | {u['email']:25s} | password: {u['password']}")


if __name__ == "__main__":
    asyncio.run(seed())
