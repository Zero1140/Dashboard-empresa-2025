# WARNING: This script bypasses Row-Level Security (RLS) and requires a superuser
# database connection. Do NOT run in production without explicit authorization.
"""Fix demo user passwords in the database."""
import asyncio
from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


async def fix() -> None:
    new_hash = hash_password("dev123")
    print(f"New hash: {new_hash}")
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User)
            .where(User.email.in_(["admin@dev.saludos.ar", "medico@dev.saludos.ar"]))
            .values(hashed_password=new_hash)
        )
        await db.commit()
        print("Done — passwords updated.")


if __name__ == "__main__":
    asyncio.run(fix())
