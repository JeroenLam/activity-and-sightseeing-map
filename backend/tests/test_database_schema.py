import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.database import ensure_schema_compatibility


@pytest.mark.asyncio
async def test_ensure_schema_compatibility_adds_map_tile_set_column():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.execute(
            text(
                "CREATE TABLE users ("
                "id VARCHAR(36) PRIMARY KEY, "
                "email VARCHAR(255) NOT NULL, "
                "password_hash TEXT, "
                "display_name VARCHAR(255) NOT NULL, "
                "preferred_language VARCHAR(2) NOT NULL DEFAULT 'en', "
                "default_map_lat FLOAT, "
                "default_map_lng FLOAT, "
                "default_map_zoom INTEGER, "
                "created_at DATETIME"
                ")"
            )
        )
        await conn.run_sync(ensure_schema_compatibility)

        result = await conn.execute(text("PRAGMA table_info(users)"))
        column_names = {row[1] for row in result.fetchall()}
        assert "map_tile_set" in column_names

    await engine.dispose()
