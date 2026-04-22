"""Initial database schema."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260422130619"
down_revision = None
branch_labels = None
depends_on = None


task_status = postgresql.ENUM("TODO", "IN_PROGRESS", "DONE", name="TaskStatus")
priority = postgresql.ENUM("LOW", "MEDIUM", "HIGH", "URGENT", name="Priority")


def upgrade() -> None:
    bind = op.get_bind()
    if sa.inspect(bind).has_table("User"):
        return

    task_status.create(bind, checkfirst=True)
    priority.create(bind, checkfirst=True)

    op.create_table(
        "User",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("password", sa.Text(), nullable=False),
        sa.Column("phoneVerified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("fullName", sa.Text(), nullable=True),
        sa.Column("avatarUrl", sa.Text(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updatedAt", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("User_phone_key", "User", ["phone"], unique=True)

    op.create_table(
        "SmsCode",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("userId", sa.Text(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("expiresAt", sa.DateTime(), nullable=False),
        sa.Column("consumed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("sendCount", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["userId"], ["User.id"], ondelete="CASCADE", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("SmsCode_userId_idx", "SmsCode", ["userId"], unique=False)

    op.create_table(
        "Task",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("userId", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", task_status, server_default=sa.text("'TODO'"), nullable=False),
        sa.Column("priority", priority, server_default=sa.text("'MEDIUM'"), nullable=False),
        sa.Column("dueDate", sa.DateTime(), nullable=True),
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("ARRAY[]::TEXT[]"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updatedAt", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["userId"], ["User.id"], ondelete="CASCADE", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("Task_userId_idx", "Task", ["userId"], unique=False)

    op.create_table(
        "Subtask",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("taskId", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("estimateHours", sa.Float(), nullable=True),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updatedAt", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["taskId"], ["Task.id"], ondelete="CASCADE", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("Subtask_taskId_idx", "Subtask", ["taskId"], unique=False)

    op.create_table(
        "Preferences",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("userId", sa.Text(), nullable=False),
        sa.Column("theme", sa.Text(), server_default=sa.text("'light'"), nullable=False),
        sa.Column("language", sa.Text(), server_default=sa.text("'en'"), nullable=False),
        sa.Column("timezone", sa.Text(), server_default=sa.text("'UTC'"), nullable=False),
        sa.Column("timeFormat", sa.Text(), server_default=sa.text("'24h'"), nullable=False),
        sa.Column("weekStart", sa.Text(), server_default=sa.text("'mon'"), nullable=False),
        sa.Column("colorScheme", sa.Text(), server_default=sa.text("'blue'"), nullable=False),
        sa.Column("compactList", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("emailNotify", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["userId"], ["User.id"], ondelete="CASCADE", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("Preferences_userId_key", "Preferences", ["userId"], unique=True)

    op.create_table(
        "AiUsage",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("userId", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["userId"], ["User.id"], ondelete="CASCADE", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("AiUsage_userId_createdAt_idx", "AiUsage", ["userId", "createdAt"], unique=False)

    op.create_table(
        "AiCache",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("AiCache_key_key", "AiCache", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index("AiCache_key_key", table_name="AiCache")
    op.drop_table("AiCache")
    op.drop_index("AiUsage_userId_createdAt_idx", table_name="AiUsage")
    op.drop_table("AiUsage")
    op.drop_index("Preferences_userId_key", table_name="Preferences")
    op.drop_table("Preferences")
    op.drop_index("Subtask_taskId_idx", table_name="Subtask")
    op.drop_table("Subtask")
    op.drop_index("Task_userId_idx", table_name="Task")
    op.drop_table("Task")
    op.drop_index("SmsCode_userId_idx", table_name="SmsCode")
    op.drop_table("SmsCode")
    op.drop_index("User_phone_key", table_name="User")
    op.drop_table("User")
    priority.drop(op.get_bind(), checkfirst=True)
    task_status.drop(op.get_bind(), checkfirst=True)
