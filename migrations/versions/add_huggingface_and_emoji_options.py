"""add huggingface and emoji options

Revision ID: add_huggingface_and_emoji
Revises: 16cd173acaf6
Create Date: 2024-12-10 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = 'add_huggingface_and_emoji'
down_revision = '16cd173acaf6'
branch_labels = None
depends_on = None

default_preferences = {
    'style_preservation': 0.7,
    'context_importance': 0.8,
    'keyword_preservation': True,
    'use_emojis': False,
    'advanced_options': {
        'preserve_technical_terms': True,
        'maintain_formal_level': True,
        'adapt_to_audience': True,
        'keep_sentence_boundaries': True,
        'smart_paragraph_breaks': True
    }
}

def upgrade():
    # Add Hugging Face columns
    with op.batch_alter_table('user_preferences') as batch_op:
        batch_op.add_column(sa.Column('huggingface_api_key', sa.String(255)))
        batch_op.add_column(sa.Column('huggingface_model', sa.String(100)))
    
    # Update reformulation_preferences to include use_emojis option
    op.execute(f"""
    UPDATE user_preferences
    SET reformulation_preferences = 
        CASE 
            WHEN reformulation_preferences IS NULL THEN '{json.dumps(default_preferences)}'
            ELSE json_patch(
                reformulation_preferences::jsonb, 
                '{{"use_emojis": false}}'::jsonb
            )::text
        END
    """)

def downgrade():
    # Remove Hugging Face columns
    with op.batch_alter_table('user_preferences') as batch_op:
        batch_op.drop_column('huggingface_api_key')
        batch_op.drop_column('huggingface_model')
    
    # Remove use_emojis from reformulation_preferences
    op.execute("""
    UPDATE user_preferences
    SET reformulation_preferences = 
        CASE 
            WHEN reformulation_preferences IS NOT NULL THEN 
                (SELECT json_object_agg(key, value)::text
                FROM json_each(reformulation_preferences::json)
                WHERE key != 'use_emojis')
        END
    """)
