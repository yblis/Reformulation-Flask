"""Initial migration

Revision ID: initial_migration
Revises: 
Create Date: 2024-11-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'initial_migration'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create UserPreferences table
    op.create_table('user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('syntax_rules', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('current_provider', sa.String(length=50), nullable=False),
        sa.Column('ollama_url', sa.String(length=255), nullable=False),
        sa.Column('ollama_model', sa.String(length=100), nullable=False),
        sa.Column('openai_api_key', sa.String(length=255), nullable=True),
        sa.Column('openai_model', sa.String(length=100), nullable=True),
        sa.Column('groq_api_key', sa.String(length=255), nullable=True),
        sa.Column('groq_model', sa.String(length=100), nullable=True),
        sa.Column('anthropic_api_key', sa.String(length=255), nullable=True),
        sa.Column('anthropic_model', sa.String(length=100), nullable=True),
        sa.Column('google_api_key', sa.String(length=255), nullable=True),
        sa.Column('gemini_model', sa.String(length=100), nullable=True),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('translation_prompt', sa.Text(), nullable=False),
        sa.Column('email_prompt', sa.Text(), nullable=False),
        sa.Column('correction_prompt', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create ReformulationHistory table
    op.create_table('reformulation_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=False),
        sa.Column('context', sa.Text(), nullable=True),
        sa.Column('reformulated_text', sa.Text(), nullable=False),
        sa.Column('tone', sa.String(length=50), nullable=False),
        sa.Column('format', sa.String(length=50), nullable=False),
        sa.Column('length', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create CorrectionHistory table
    op.create_table('correction_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=False),
        sa.Column('corrected_text', sa.Text(), nullable=False),
        sa.Column('options', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create EmailHistory table
    op.create_table('email_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email_type', sa.String(length=100), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('sender', sa.String(length=100), nullable=True),
        sa.Column('generated_subject', sa.Text(), nullable=True),
        sa.Column('generated_email', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('email_history')
    op.drop_table('correction_history')
    op.drop_table('reformulation_history')
    op.drop_table('user_preferences')
