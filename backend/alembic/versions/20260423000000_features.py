"""roadmap features: 2fa, email prefs, achievements, comments

Revision ID: 20260423000000
Revises: 20260422130619
Create Date: 2026-04-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


revision = "20260423000000"
down_revision = "20260422130619"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("User", sa.Column("email", sa.Text(), nullable=True))
    op.add_column("User", sa.Column("totpSecret", sa.Text(), nullable=True))
    op.add_column("User", sa.Column("totpEnabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("User", sa.Column("totpBackupCodes", ARRAY(sa.Text()), nullable=False, server_default="{}"))
    op.add_column("User", sa.Column("points", sa.Integer(), nullable=False, server_default="0"))

    op.add_column("Preferences", sa.Column("deadlineReminder", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("Preferences", sa.Column("weeklyReportEmail", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("Preferences", sa.Column("dailyDigest", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "Achievement",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("userId", sa.Text(), sa.ForeignKey("User.id", ondelete="CASCADE"), nullable=False),
        sa.Column("badge", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unlockedAt", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("Achievement_userId_idx", "Achievement", ["userId"])

    op.create_table(
        "TaskComment",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("taskId", sa.Text(), sa.ForeignKey("Task.id", ondelete="CASCADE"), nullable=False),
        sa.Column("userId", sa.Text(), sa.ForeignKey("User.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("TaskComment_taskId_idx", "TaskComment", ["taskId"])


def downgrade():
    op.drop_index("TaskComment_taskId_idx", "TaskComment")
    op.drop_table("TaskComment")
    op.drop_index("Achievement_userId_idx", "Achievement")
    op.drop_table("Achievement")
    op.drop_column("Preferences", "dailyDigest")
    op.drop_column("Preferences", "weeklyReportEmail")
    op.drop_column("Preferences", "deadlineReminder")
    op.drop_column("User", "points")
    op.drop_column("User", "totpBackupCodes")
    op.drop_column("User", "totpEnabled")
    op.drop_column("User", "totpSecret")
    op.drop_column("User", "email")
