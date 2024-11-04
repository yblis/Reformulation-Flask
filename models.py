from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()

class UserPreferences(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Current AI Provider
    current_provider = db.Column(db.String(50), nullable=False, default="ollama")
    
    # Ollama Settings
    ollama_url = db.Column(db.String(255), nullable=False, default="http://localhost:11434")
    ollama_model = db.Column(db.String(100), nullable=False, default="qwen2.5:3b")
    
    # OpenAI Settings
    openai_api_key = db.Column(db.String(255))
    openai_model = db.Column(db.String(100))
    
    # Groq Settings
    groq_api_key = db.Column(db.String(255))
    groq_model = db.Column(db.String(100))
    
    # Anthropic Settings
    anthropic_api_key = db.Column(db.String(255))
    anthropic_model = db.Column(db.String(100))
    
    # Google Gemini Settings
    google_api_key = db.Column(db.String(255))
    gemini_model = db.Column(db.String(100))
    
    # Prompts
    system_prompt = db.Column(db.Text, nullable=False)
    translation_prompt = db.Column(db.Text, nullable=False)
    email_prompt = db.Column(db.Text, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def get_or_create():
        pref = UserPreferences.query.first()
        if not pref:
            pref = UserPreferences(
                ollama_url=os.getenv('OLLAMA_URL', 'http://localhost:11434'),
                openai_api_key=os.getenv('OPENAI_API_KEY', ''),
                anthropic_api_key=os.getenv('ANTHROPIC_API_KEY', ''),
                google_api_key=os.getenv('GOOGLE_API_KEY', ''),
                groq_api_key=os.getenv('GROQ_API_KEY', ''),
                system_prompt="""Tu es un expert en reformulation. Tu dois reformuler le texte selon les paramètres spécifiés par l'utilisateur: ton, format et longueur. IMPORTANT : retourne UNIQUEMENT le texte reformulé, sans aucune mention des paramètres. 
Respecte scrupuleusement le format demandé, la longueur et le ton. Ne rajoute aucun autre commentaire.
Si un contexte ou un email reçu est fourni, utilise-le pour mieux adapter la reformulation.""",
                translation_prompt="""Tu es un traducteur automatique. Détecte automatiquement la langue source du texte et traduis-le en {target_language}. Retourne UNIQUEMENT la traduction, sans aucun autre commentaire.""",
                email_prompt="""Tu es un expert en rédaction d'emails professionnels. Génère un email selon le type et le contexte fourni. L'email doit être professionnel, bien structuré et adapté au contexte. IMPORTANT : retourne UNIQUEMENT l'email généré, avec l'objet en première ligne commençant par 'Objet:'."""
            )
            db.session.add(pref)
            db.session.commit()
        return pref

class ReformulationHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False, default='reformulation')  # 'reformulation', 'translation', 'email'
    original_text = db.Column(db.Text, nullable=False)
    reformulated_text = db.Column(db.Text, nullable=False)
    context = db.Column(db.Text)
    
    # Fields for reformulation
    tone = db.Column(db.String(50))
    format = db.Column(db.String(50))
    length = db.Column(db.String(50))
    
    # Fields for translation
    target_language = db.Column(db.String(50))
    
    # Fields for email
    email_type = db.Column(db.String(100))
    sender_name = db.Column(db.String(100))
    email_subject = db.Column(db.String(255))
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'original_text': self.original_text,
            'reformulated_text': self.reformulated_text,
            'context': self.context,
            'tone': self.tone,
            'format': self.format,
            'length': self.length,
            'target_language': self.target_language,
            'email_type': self.email_type,
            'sender_name': self.sender_name,
            'email_subject': self.email_subject,
            'created_at': self.created_at.isoformat()
        }
