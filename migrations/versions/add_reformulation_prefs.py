"""add reformulation preferences

Revision ID: add_reformulation_prefs
Revises: merge_reformulation_heads
Create Date: 2024-11-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = 'add_reformulation_prefs'
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
    with op.batch_alter_table('user_preferences') as batch_op:
        batch_op.add_column(
            sa.Column(
                'reformulation_preferences',
                sa.JSON(),
                nullable=False,
                server_default=json.dumps(default_preferences)
            )
        )

def downgrade():
    with op.batch_alter_table('user_preferences') as batch_op:
        batch_op.drop_column('reformulation_preferences')
