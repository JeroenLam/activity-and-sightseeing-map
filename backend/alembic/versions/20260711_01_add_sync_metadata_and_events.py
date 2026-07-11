"""add sync metadata and events

Revision ID: 20260711_01
Revises: 20260612_01
Create Date: 2026-07-11
"""

import sqlalchemy as sa

from alembic import op

revision = "20260711_01"
down_revision = "20260612_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "locations" in inspector.get_table_names():
        location_columns = {col["name"] for col in inspector.get_columns("locations")}
        if "sync_version" not in location_columns:
            op.add_column(
                "locations",
                sa.Column(
                    "sync_version",
                    sa.Integer(),
                    nullable=False,
                    server_default="1",
                ),
            )
            op.alter_column("locations", "sync_version", server_default=None)
        if "deleted_at" not in location_columns:
            op.add_column(
                "locations",
                sa.Column("deleted_at", sa.DateTime(), nullable=True),
            )

    if "location_types" in inspector.get_table_names():
        type_columns = {col["name"] for col in inspector.get_columns("location_types")}
        if "sync_version" not in type_columns:
            op.add_column(
                "location_types",
                sa.Column(
                    "sync_version",
                    sa.Integer(),
                    nullable=False,
                    server_default="1",
                ),
            )
            op.alter_column("location_types", "sync_version", server_default=None)
        if "deleted_at" not in type_columns:
            op.add_column(
                "location_types",
                sa.Column("deleted_at", sa.DateTime(), nullable=True),
            )

    if "sync_events" not in inspector.get_table_names():
        op.create_table(
            "sync_events",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("entity_type", sa.String(length=40), nullable=False),
            sa.Column("entity_id", sa.String(length=36), nullable=False),
            sa.Column("operation", sa.String(length=20), nullable=False),
            sa.Column("entity_version", sa.Integer(), nullable=False),
            sa.Column("changed_fields", sa.JSON(), nullable=True),
            sa.Column("payload", sa.JSON(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )
        op.create_index("ix_sync_events_user_id", "sync_events", ["user_id"])
        op.create_index("ix_sync_events_entity_type", "sync_events", ["entity_type"])
        op.create_index("ix_sync_events_entity_id", "sync_events", ["entity_id"])

    if "sync_conflicts" not in inspector.get_table_names():
        op.create_table(
            "sync_conflicts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("entity_type", sa.String(length=40), nullable=False),
            sa.Column("entity_id", sa.String(length=36), nullable=False),
            sa.Column("operation", sa.String(length=20), nullable=False),
            sa.Column("base_sync_version", sa.Integer(), nullable=True),
            sa.Column("client_version", sa.Integer(), nullable=True),
            sa.Column("server_version", sa.Integer(), nullable=False),
            sa.Column("client_payload", sa.JSON(), nullable=True),
            sa.Column("server_payload", sa.JSON(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("resolution_payload", sa.JSON(), nullable=True),
            sa.Column("resolution_mode", sa.String(length=20), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_sync_conflicts_user_id", "sync_conflicts", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "sync_events" in inspector.get_table_names():
        op.drop_index("ix_sync_events_entity_id", table_name="sync_events")
        op.drop_index("ix_sync_events_entity_type", table_name="sync_events")
        op.drop_index("ix_sync_events_user_id", table_name="sync_events")
        op.drop_table("sync_events")

    if "sync_conflicts" in inspector.get_table_names():
        op.drop_index("ix_sync_conflicts_user_id", table_name="sync_conflicts")
        op.drop_table("sync_conflicts")

    if "location_types" in inspector.get_table_names():
        type_columns = {col["name"] for col in inspector.get_columns("location_types")}
        if "sync_version" in type_columns:
            op.drop_column("location_types", "sync_version")

    if "locations" in inspector.get_table_names():
        location_columns = {col["name"] for col in inspector.get_columns("locations")}
        if "deleted_at" in location_columns:
            op.drop_column("locations", "deleted_at")
        if "sync_version" in location_columns:
            op.drop_column("locations", "sync_version")

    if "location_types" in inspector.get_table_names():
        type_columns = {col["name"] for col in inspector.get_columns("location_types")}
        if "deleted_at" in type_columns:
            op.drop_column("location_types", "deleted_at")
        if "sync_version" in type_columns:
            op.drop_column("location_types", "sync_version")
