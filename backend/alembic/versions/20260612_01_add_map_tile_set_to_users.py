"""add map tile set to users

Revision ID: 20260612_01
Revises:
Create Date: 2026-06-12
"""

from alembic import op
import sqlalchemy as sa

revision = "20260612_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "map_tile_set", sa.String(length=40), nullable=False, server_default="auto"
        ),
    )
    op.alter_column("users", "map_tile_set", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "map_tile_set")
