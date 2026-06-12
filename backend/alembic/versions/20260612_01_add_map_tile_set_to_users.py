"""add map tile set to users

Revision ID: 20260612_01
Revises:
Create Date: 2026-06-12
"""

import sqlalchemy as sa

from alembic import op

revision = "20260612_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if the column already exists before adding
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("users")]

    if "map_tile_set" not in columns:
        op.add_column(
            "users",
            sa.Column(
                "map_tile_set",
                sa.String(length=40),
                nullable=False,
                server_default="auto",
            ),
        )
        op.alter_column("users", "map_tile_set", server_default=None)


def downgrade() -> None:
    # Check if the column exists before dropping
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("users")]

    if "map_tile_set" in columns:
        op.drop_column("users", "map_tile_set")
