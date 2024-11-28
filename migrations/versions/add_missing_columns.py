"""Add missing columns

Revision ID: add_missing_columns
Revises: initial_migration
Create Date: 2024-11-28 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_missing_columns'
down_revision = 'initial_migration'
branch_labels = None
depends_on = None

def upgrade():
    # Add missing columns to user_preferences table
    with op.batch_alter_table('user_preferences', schema=None) as batch_op:
        # Add syntax_rules if it doesn't exist
        try:
            batch_op.add_column(sa.Column('syntax_rules', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{"word_order": true, "subject_verb_agreement": true, "verb_tense": true, "gender_number": true, "relative_pronouns": true}'))
        except Exception:
            pass

        # Add correction_prompt if it doesn't exist
        try:
            batch_op.add_column(sa.Column('correction_prompt', sa.Text(), nullable=False, server_default="""Tu es un correcteur de texte professionnel. Corrige le texte suivant en respectant les options sélectionnées:
- Correction grammaticale
- Correction orthographique
- Amélioration du style
- Correction de la ponctuation

Retourne UNIQUEMENT le texte corrigé, sans aucun autre commentaire."""))
        except Exception:
            pass

def downgrade():
    with op.batch_alter_table('user_preferences', schema=None) as batch_op:
        batch_op.drop_column('syntax_rules')
        batch_op.drop_column('correction_prompt')
