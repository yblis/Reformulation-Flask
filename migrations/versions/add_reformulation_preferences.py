"""Add reformulation preferences column

Revision ID: add_reformulation_preferences
Revises: 
Create Date: 2024-11-29 09:32:10.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic
revision = 'add_reformulation_preferences'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # SQLite doesn't support ALTER TABLE ADD COLUMN with JSON type directly
    # We need to use TEXT type and handle JSON serialization in the application
    with op.batch_alter_table('user_preferences') as batch_op:
        batch_op.add_column(sa.Column('reformulation_preferences', sa.Text(), nullable=True))
    
    # Set default value for existing rows
    op.execute("""
        UPDATE user_preferences 
        SET reformulation_preferences = '{"style_preservation": 0.7, "context_importance": 0.8, "keyword_preservation": true, "advanced_options": {"preserve_technical_terms": true, "maintain_formal_level": true, "adapt_to_audience": true, "keep_sentence_boundaries": true, "smart_paragraph_breaks": true}}'
        WHERE reformulation_preferences IS NULL
    """)

def downgrade():
    with op.batch_alter_table('user_preferences') as batch_op:
        batch_op.drop_column('reformulation_preferences')
