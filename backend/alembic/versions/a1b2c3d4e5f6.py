"""datetime columns to timestamptz

Revision ID: a1b2c3d4e5f6
Revises: d629062358aa
Create Date: 2026-03-02 22:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "d629062358aa"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLUMNS: list[tuple[str, str, bool]] = [
    ("users", "created_at", False),
    ("design_styles", "created_at", False),
    ("houses", "created_at", False),
    ("houses", "updated_at", False),
    ("rooms", "created_at", False),
    ("generation_jobs", "created_at", False),
    ("generation_jobs", "completed_at", True),
]


def upgrade() -> None:
    for table, column, nullable in _COLUMNS:
        op.alter_column(
            table,
            column,
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=nullable,
            postgresql_using=f"{column} AT TIME ZONE 'UTC'",
        )


def downgrade() -> None:
    for table, column, nullable in reversed(_COLUMNS):
        op.alter_column(
            table,
            column,
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=nullable,
            postgresql_using=f"{column} AT TIME ZONE 'UTC'",
        )
