"""index location_id on location_visits and location_tags

Loading locations fetches their visits and tags with
``WHERE location_id IN (...)``. Without these indexes every such query is a
full table scan over all users' rows.

Revision ID: 20261120_01
Revises: 20260711_01
Create Date: 2026-11-20
"""

import sqlalchemy as sa

from alembic import op

revision = "20261120_01"
down_revision = "20260711_01"
branch_labels = None
depends_on = None

INDEXES = (
    ("ix_location_visits_location_id", "location_visits"),
    ("ix_location_tags_location_id", "location_tags"),
)


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    for index_name, table in INDEXES:
        if table not in tables:
            continue
        existing = {ix["name"] for ix in inspector.get_indexes(table)}
        if index_name not in existing:
            op.create_index(index_name, table, ["location_id"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    for index_name, table in INDEXES:
        if table not in tables:
            continue
        existing = {ix["name"] for ix in inspector.get_indexes(table)}
        if index_name in existing:
            op.drop_index(index_name, table_name=table)
