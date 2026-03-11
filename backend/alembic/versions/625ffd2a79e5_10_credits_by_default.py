"""10 credits by default

Revision ID: 625ffd2a79e5
Revises: f34df36e27e8
Create Date: 2026-03-11 12:39:38.871252

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "625ffd2a79e5"
down_revision: str | None = "f34df36e27e8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("user", "balance", server_default="10")


def downgrade() -> None:
    op.alter_column("user", "balance", server_default="0")
