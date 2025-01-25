"""add translation and correction history

Revision ID: add_translation_correction_history
Revises: add_reformulation_prefs
Create Date: 2024-12-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_translation_correction_history'
down_revision = 'add_reformulation_prefs'
branch_labels = None
depends_on = None


def upgrade():
    # Create translation history table
    op.create_table('translation_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=False),
        sa.Column('translated_text', sa.Text(), nullable=False),
        sa.Column('source_language', sa.String(length=50), nullable=True),
        sa.Column('target_language', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create correction history table
    op.create_table('correction_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=False),
        sa.Column('corrected_text', sa.Text(), nullable=False),
        sa.Column('corrections', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('correction_history')
    op.drop_table('translation_history')
