"""empty message

Revision ID: 16cd173acaf6
Revises: add_reformulation_preferences_column, add_translation_correction_history
Create Date: 2024-12-10 13:03:01.664477

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '16cd173acaf6'
down_revision = ('add_reformulation_preferences_column', 'add_translation_correction_history')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
