from collections.abc import AsyncGenerator

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def ensure_schema_compatibility(connection: Connection) -> None:
    inspector = inspect(connection)

    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "map_tile_set" not in user_columns:
        connection.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN map_tile_set VARCHAR(40) NOT NULL DEFAULT 'auto'"
            )
        )
    if "sync_version" not in user_columns:
        connection.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1"
            )
        )

    if "locations" in inspector.get_table_names():
        location_columns = {
            column["name"] for column in inspector.get_columns("locations")
        }
        if "sync_version" not in location_columns:
            connection.execute(
                text(
                    "ALTER TABLE locations "
                    "ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1"
                )
            )
        if "deleted_at" not in location_columns:
            connection.execute(
                text("ALTER TABLE locations " "ADD COLUMN deleted_at DATETIME NULL")
            )

    if "location_types" in inspector.get_table_names():
        type_columns = {
            column["name"] for column in inspector.get_columns("location_types")
        }
        if "sync_version" not in type_columns:
            connection.execute(
                text(
                    "ALTER TABLE location_types "
                    "ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1"
                )
            )
        if "deleted_at" not in type_columns:
            connection.execute(
                text(
                    "ALTER TABLE location_types " "ADD COLUMN deleted_at DATETIME NULL"
                )
            )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
