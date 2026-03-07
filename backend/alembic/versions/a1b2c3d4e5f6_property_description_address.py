"""property description and address columns

Revision ID: a1b2c3d4e5f6
Revises: 3bc6df87d1c4
Create Date: 2026-03-07 14:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "3bc6df87d1c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("property", sa.Column("description", sqlmodel.AutoString(), nullable=True))
    op.add_column("property", sa.Column("address", sqlmodel.AutoString(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("property", "address")
    op.drop_column("property", "description")
