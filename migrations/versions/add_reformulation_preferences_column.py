"""add reformulation preferences column

Revision ID: add_reformulation_preferences_column
Revises: merge_reformulation_heads
Create Date: 2024-11-29 09:33:40.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = 'add_reformulation_preferences_column'
down_revision = 'merge_reformulation_heads'
branch_labels = None
depends_on = None

default_preferences = {
    'style_preservation': 0.7,
    'context_importance': 0.8,
    'keyword_preservation': True,
    'advanced_options': {
        'preserve_technical_terms': True,
        'maintain_formal_level': True,
        'adapt_to_audience': True,
        'keep_sentence_boundaries': True,
        'smart_paragraph_breaks': True
    }
}

def upgrade():
    # SQLite doesn't support adding columns with JSON type directly
    # First add the column as TEXT
    op.add_column('user_preferences', 
        sa.Column('reformulation_preferences', sa.Text(), 
                  nullable=False, 
                  server_default=json.dumps(default_preferences)))

def downgrade():
    op.drop_column('user_preferences', 'reformulation_preferences')
