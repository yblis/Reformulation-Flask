from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class UserPreferences(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ollama_url = db.Column(db.String(255), nullable=False, default="http://localhost:11434")
    current_model = db.Column(db.String(100), nullable=False, default="qwen2.5:3b")
    system_prompt = db.Column(db.Text, nullable=False)
    translation_prompt = db.Column(db.Text, nullable=False)
    email_prompt = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def get_or_create():
        pref = UserPreferences.query.first()
        if not pref:
            pref = UserPreferences(
                system_prompt="""Tu es un expert en reformulation. Tu dois reformuler le texte selon les paramètres spécifiés par l'utilisateur: ton, format et longueur. IMPORTANT : retourne UNIQUEMENT le texte reformulé, sans aucune mention des paramètres. 
Respecte scrupuleusement le format demandé, la longueur et le ton. Ne rajoute aucun autre commentaire.
Si un contexte ou un email reçu est fourni, utilise-le pour mieux adapter la reformulation.""",
                translation_prompt="""Tu es un traducteur automatique. Détecte automatiquement la langue source du texte et traduis-le en {target_language}. Retourne UNIQUEMENT la traduction, sans aucun autre commentaire.""",
                email_prompt="""Tu es un expert en rédaction d'emails professionnels. Génère un email selon le type et le contexte fourni. L'email doit être professionnel, bien structuré et adapté au contexte. IMPORTANT : retourne UNIQUEMENT l'email généré, avec l'objet en première ligne commençant par 'Objet:'."""
            )
            db.session.add(pref)
            db.session.commit()
        return pref
