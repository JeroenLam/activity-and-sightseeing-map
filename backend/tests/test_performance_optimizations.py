"""Tests for the backend performance work.

Covers the behaviour the optimizations must preserve or introduce:

- child-table indexes exist on new and on pre-existing databases,
- SQLite connections are tuned (WAL, synchronous=NORMAL, busy timeout),
- large responses are gzip-compressed,
- the row-based ``get_locations`` returns full features (type, years, tags)
  and still honours all list filters,
- statistics ignore soft-deleted locations.
"""

import pytest
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.database import (
    CHILD_TABLE_INDEXES,
    configure_sqlite_connection,
    ensure_schema_compatibility,
)
from app.models import Base

POINT = {"type": "Point", "coordinates": [4.9, 52.37]}


async def _create(client, **properties) -> dict:
    response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": POINT,
            "properties": {"name": "Place", **properties},
        },
    )
    assert response.status_code == 201
    return response.json()


async def _index_names(conn, table: str) -> set[str]:
    result = await conn.execute(text(f"PRAGMA index_list({table})"))
    return {row[1] for row in result.fetchall()}


@pytest.mark.asyncio
async def test_metadata_defines_child_table_indexes():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for index_name, table, _column in CHILD_TABLE_INDEXES:
            assert index_name in await _index_names(conn, table)
    await engine.dispose()


@pytest.mark.asyncio
async def test_ensure_schema_compatibility_adds_missing_child_indexes():
    """Existing databases created before the indexes get them at startup."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for index_name, _table, _column in CHILD_TABLE_INDEXES:
            await conn.execute(text(f"DROP INDEX {index_name}"))

        await conn.run_sync(ensure_schema_compatibility)
        # Running it again must be a no-op rather than an error.
        await conn.run_sync(ensure_schema_compatibility)

        for index_name, table, _column in CHILD_TABLE_INDEXES:
            assert index_name in await _index_names(conn, table)
    await engine.dispose()


@pytest.mark.asyncio
async def test_child_queries_use_the_location_id_index():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for query in (
            "EXPLAIN QUERY PLAN SELECT * FROM location_visits WHERE location_id = 'x'",
            "EXPLAIN QUERY PLAN SELECT * FROM location_tags WHERE location_id = 'x'",
        ):
            plan = await conn.execute(text(query))
            detail = " ".join(str(row[-1]) for row in plan.fetchall())
            assert "USING INDEX" in detail, detail
    await engine.dispose()


@pytest.mark.asyncio
async def test_sqlite_connections_are_tuned(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'app.db'}")
    event.listen(engine.sync_engine, "connect", configure_sqlite_connection)
    async with engine.connect() as conn:
        journal_mode = (await conn.execute(text("PRAGMA journal_mode"))).scalar()
        synchronous = (await conn.execute(text("PRAGMA synchronous"))).scalar()
        busy_timeout = (await conn.execute(text("PRAGMA busy_timeout"))).scalar()
    await engine.dispose()

    assert journal_mode == "wal"
    assert synchronous == 1  # NORMAL
    assert busy_timeout == 5000


@pytest.mark.asyncio
async def test_large_responses_are_gzip_compressed(authenticated_client):
    client, _ = authenticated_client
    for i in range(15):
        await _create(client, name=f"Location {i}", comments="x" * 50)

    response = await client.get("/api/locations", headers={"Accept-Encoding": "gzip"})

    assert response.status_code == 200
    assert response.headers["content-encoding"] == "gzip"
    assert response.num_bytes_downloaded < len(response.content)
    assert len(response.json()["features"]) == 15


@pytest.mark.asyncio
async def test_small_responses_are_not_compressed(authenticated_client):
    client, _ = authenticated_client
    response = await client.get("/api/health", headers={"Accept-Encoding": "gzip"})
    assert "content-encoding" not in response.headers


@pytest.mark.asyncio
async def test_list_returns_type_years_and_tags(authenticated_client):
    client, _ = authenticated_client
    museum = (
        await client.post(
            "/api/types", json={"name": "Museum", "color": "#FF0000", "icon": "bank"}
        )
    ).json()
    created = await _create(
        client,
        type_id=museum["id"],
        years_visited=[2024, 2019],
        tags=["art", "indoor"],
        rating=4,
        link="https://example.com",
    )
    await _create(client, name="Untyped")

    response = await client.get("/api/locations")
    features = {f["id"]: f for f in response.json()["features"]}

    props = features[created["id"]]["properties"]
    assert props["type"] == {
        "id": museum["id"],
        "name": "Museum",
        "color": "#FF0000",
        "icon": "bank",
    }
    assert props["years_visited"] == [2019, 2024]
    assert sorted(props["tags"]) == ["art", "indoor"]
    assert props["rating"] == 4
    assert props["link"] == "https://example.com"
    assert features[created["id"]]["geometry"]["coordinates"] == POINT["coordinates"]

    untyped = next(f for f in features.values() if f["properties"]["name"] == "Untyped")
    assert untyped["properties"]["type"] is None
    assert untyped["properties"]["years_visited"] == []
    assert untyped["properties"]["tags"] == []


@pytest.mark.asyncio
async def test_list_filters(authenticated_client):
    client, _ = authenticated_client
    museum = (
        await client.post("/api/types", json={"name": "M", "color": "#FF0000"})
    ).json()
    old = await _create(client, name="Old", years_visited=[2001], type_id=museum["id"])
    new = await _create(client, name="New", years_visited=[2023])
    unknown = await _create(client, name="Unknown", visited_unknown_year=True)
    never = await _create(client, name="Never")

    async def ids(**params) -> set[str]:
        response = await client.get("/api/locations", params=params)
        return {f["id"] for f in response.json()["features"]}

    assert await ids(unvisited="true") == {never["id"]}
    assert await ids(year_from=2020) == {new["id"]}
    assert await ids(year_to=2010) == {old["id"]}
    assert await ids(type_id=museum["id"]) == {old["id"]}
    assert await ids() == {old["id"], new["id"], unknown["id"], never["id"]}


@pytest.mark.asyncio
async def test_list_excludes_soft_deleted_locations(authenticated_client):
    auth_client, _ = authenticated_client
    keep = await _create(auth_client, name="Keep", years_visited=[2020])
    gone = await _create(auth_client, name="Gone", years_visited=[2020])
    await auth_client.delete(f"/api/locations/{gone['id']}")

    response = await auth_client.get("/api/locations")

    assert [f["id"] for f in response.json()["features"]] == [keep["id"]]
