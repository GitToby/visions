"""rename to property

Revision ID: 3bc6df87d1c4
Revises: 1d1ead2645bb
Create Date: 2026-03-07 14:15:28.017515

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3bc6df87d1c4"
down_revision: str | None = "1d1ead2645bb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table(
        old_table_name="house",
        new_table_name="property",
    )
    op.alter_column(
        table_name="room",
        column_name="house_id",
        new_column_name="property_id",
    )


def downgrade() -> None:
    op.rename_table(
        old_table_name="property",
        new_table_name="house",
    )
    op.alter_column(
        table_name="room",
        column_name="property_id",
        new_column_name="house_id",
    )
