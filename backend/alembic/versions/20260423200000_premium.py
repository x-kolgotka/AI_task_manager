"""add isPremium to User

Revision ID: 20260423200000
Revises: 20260423100000
Create Date: 2026-04-23 20:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20260423200000'
down_revision = '20260423100000'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('User', sa.Column('isPremium', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('User', 'isPremium')
