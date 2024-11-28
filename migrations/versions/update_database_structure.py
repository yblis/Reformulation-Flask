"""Update database structure

Revision ID: update_database_structure
Revises: initial_migration
Create Date: 2024-11-28 10:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'update_database_structure'
down_revision = 'add_missing_columns'
branch_labels = None
depends_on = None

def upgrade():
    # Mettre à jour la table user_preferences
    with op.batch_alter_table('user_preferences', schema=None) as batch_op:
        # Ajouter les colonnes manquantes avec des valeurs par défaut
        batch_op.alter_column('syntax_rules',
               existing_type=postgresql.JSON(astext_type=sa.Text()),
               nullable=False,
               server_default='{"word_order": true, "subject_verb_agreement": true, "verb_tense": true, "gender_number": true, "relative_pronouns": true}')
        
        batch_op.alter_column('system_prompt',
               existing_type=sa.Text(),
               nullable=False,
               server_default='Tu es un expert en reformulation...')

        batch_op.alter_column('translation_prompt',
               existing_type=sa.Text(),
               nullable=False,
               server_default='Tu es un traducteur automatique...')

        batch_op.alter_column('email_prompt',
               existing_type=sa.Text(),
               nullable=False,
               server_default='Tu es un expert en rédaction d\'emails professionnels...')

        batch_op.alter_column('correction_prompt',
               existing_type=sa.Text(),
               nullable=False,
               server_default='Tu es un correcteur de texte professionnel...')

def downgrade():
    # Les opérations de downgrade ne sont pas nécessaires car nous ne supprimons rien
    pass
