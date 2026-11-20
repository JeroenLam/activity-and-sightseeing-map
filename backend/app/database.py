from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import event, inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False},
)

#: Indexes added after the initial schema. ``Base.metadata.create_all`` only
#: creates indexes together with *new* tables, so existing databases get them
#: from :func:`ensure_schema_compatibility` (mirrors Alembic 20261120_01).
CHILD_TABLE_INDEXES = (
    ("ix_location_visits_location_id", "location_visits", "location_id"),
    ("ix_location_tags_location_id", "location_tags", "location_id"),
)


def configure_sqlite_connection(dbapi_connection: Any, _record: Any) -> None:
    """Apply per-connection SQLite tuning.

    - ``journal_mode=WAL`` lets readers proceed while a write is in progress
      instead of blocking on the database lock, and makes commits cheaper.
    - ``synchronous=NORMAL`` is the recommended, still crash-safe setting for
      WAL: it skips an fsync on every commit (only a power loss can roll back
      the most recent transactions; the database cannot be corrupted).
    - ``busy_timeout`` waits briefly for a lock instead of failing at once
      with "database is locked" when two requests write concurrently.

    In-memory databases (used by the tests) do not support WAL; SQLite
    silently keeps their journal mode, so the pragma is harmless there.
    """
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
    finally:
        cursor.close()


if engine.dialect.name == "sqlite":
    event.listen(engine.sync_engine, "connect", configure_sqlite_connection)

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

    existing_tables = set(inspector.get_table_names())
    for index_name, table, column in CHILD_TABLE_INDEXES:
        if table not in existing_tables:
            continue
        existing_indexes = {index["name"] for index in inspector.get_indexes(table)}
        if index_name not in existing_indexes:
            connection.execute(text(f"CREATE INDEX {index_name} ON {table} ({column})"))


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
