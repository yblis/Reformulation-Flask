"""merge heads

Revision ID: merge_reformulation_heads
Revises: 0d7d75428d76, add_reformulation_preferences
Create Date: 2024-11-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_reformulation_heads'
down_revision = ('0d7d75428d76', 'add_reformulation_preferences')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
