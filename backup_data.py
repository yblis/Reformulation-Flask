from app import app
from models import db, UserPreferences, ReformulationHistory, CorrectionHistory, EmailHistory
import json
from datetime import datetime

def datetime_handler(x):
    if isinstance(x, datetime):
        return x.isoformat()
    raise TypeError(f"Object of type {type(x)} is not JSON serializable")

def backup_data():
    with app.app_context():
        # Backup UserPreferences
        # SECURITE : Les données sensibles suivantes ne sont jamais incluses dans les sauvegardes:
        # - openai_api_key : Clé API OpenAI
        # - anthropic_api_key : Clé API Anthropic
        # - google_api_key : Clé API Google/Gemini
        # - groq_api_key : Clé API Groq
        # Ces clés sont gérées exclusivement via le fichier .env pour des raisons de sécurité
        preferences = UserPreferences.query.all()
        with open('backup_preferences.json', 'w', encoding='utf-8') as f:
            json.dump([{
                # Configuration non-sensible uniquement
                'syntax_rules': p.syntax_rules,
                'current_provider': p.current_provider,
                'ollama_url': p.ollama_url,
                'ollama_model': p.ollama_model,
                'openai_model': p.openai_model,
                'groq_model': p.groq_model,
                'anthropic_model': p.anthropic_model,
                'gemini_model': p.gemini_model,
                'system_prompt': p.system_prompt,
                'translation_prompt': p.translation_prompt,
                'email_prompt': p.email_prompt,
                'correction_prompt': p.correction_prompt,
                'created_at': p.created_at,
                'updated_at': p.updated_at
            } for p in preferences], f, default=datetime_handler, ensure_ascii=False, indent=2)

        # Backup ReformulationHistory
        reformulations = ReformulationHistory.query.all()
        with open('backup_reformulations.json', 'w', encoding='utf-8') as f:
            json.dump([r.to_dict() for r in reformulations], f, default=datetime_handler, ensure_ascii=False, indent=2)

        # Backup CorrectionHistory
        corrections = CorrectionHistory.query.all()
        with open('backup_corrections.json', 'w', encoding='utf-8') as f:
            json.dump([c.to_dict() for c in corrections], f, default=datetime_handler, ensure_ascii=False, indent=2)

        # Backup EmailHistory
        emails = EmailHistory.query.all()
        with open('backup_emails.json', 'w', encoding='utf-8') as f:
            json.dump([e.to_dict() for e in emails], f, default=datetime_handler, ensure_ascii=False, indent=2)

        print("Backup completed successfully")

if __name__ == '__main__':
    backup_data()
