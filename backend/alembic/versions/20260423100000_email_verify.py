"""email verification

Revision ID: 20260423100000
Revises: 20260423000000
Create Date: 2026-04-23 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "20260423100000"
down_revision = "20260423000000"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("User", sa.Column("emailVerified", sa.Boolean(), nullable=False, server_default="false"))
    op.create_table(
        "EmailVerification",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("userId", sa.Text(), sa.ForeignKey("User.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("expiresAt", sa.DateTime(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_emailverification_userid", "EmailVerification", ["userId"])


def downgrade():
    op.drop_table("EmailVerification")
    op.drop_column("User", "emailVerified")
