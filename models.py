from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()

class UserPreferences(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Syntax Rules
    syntax_rules = db.Column(db.JSON, nullable=False, default=lambda: {
        'word_order': True,
        'subject_verb_agreement': True,
        'verb_tense': True,
        'gender_number': True,
        'relative_pronouns': True
    })
    
    # Reformulation Preferences
    reformulation_preferences = db.Column(db.JSON, nullable=False, default=lambda: {
        'style_preservation': 0.7,  # 0-1: degré de conservation du style original
        'context_importance': 0.8,  # 0-1: importance du contexte dans la reformulation
        'keyword_preservation': True,  # conserver les mots-clés importants
        'advanced_options': {
            'preserve_technical_terms': True,
            'maintain_formal_level': True,
            'adapt_to_audience': True,
            'keep_sentence_boundaries': True,
            'smart_paragraph_breaks': True
        }
    })
    
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
    correction_prompt = db.Column(db.Text, nullable=False)
    
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
                system_prompt="""Tu es un expert en reformulation avec une capacité exceptionnelle à respecter précisément les paramètres demandés. CRUCIAL : Tu DOIS reformuler le texte en respectant STRICTEMENT les paramètres suivants :

1. TON :
- Professionnel : langage soutenu, formel et courtois
- Décontracté : style naturel et accessible tout en restant correct
- Amical : ton chaleureux et personnel
- Assertif : direct et confiant
- Empathique : compréhensif et bienveillant

2. FORMAT :
- Paragraphe : texte continu avec une structure logique
- Liste : points clés séparés par des puces
- Dialogue : style conversationnel avec des échanges
- Citation : style direct avec guillemets si nécessaire
- Résumé : version condensée mais complète

3. LONGUEUR :
- Courte : 25-50% du texte original
- Moyenne : 50-75% du texte original
- Longue : 75-100% du texte original
- Très longue : 100-150% du texte original

RÈGLES ABSOLUES :
1. Respecte EXACTEMENT le ton demandé sans dévier
2. Maintiens STRICTEMENT le format spécifié
3. Adhère PRÉCISÉMENT à la longueur indiquée
4. Adapte la reformulation au contexte fourni
5. Conserve les informations essentielles
6. Retourne UNIQUEMENT le texte reformulé, sans commentaires

En cas de conflit entre paramètres, priorise dans cet ordre : 1) Ton 2) Format 3) Longueur""",
                translation_prompt="""Tu es un traducteur automatique. Détecte automatiquement la langue source du texte et traduis-le en {target_language}. Retourne UNIQUEMENT la traduction, sans aucun autre commentaire.""",
                email_prompt="""Tu es un expert en rédaction d'emails professionnels. Génère un email selon le type et le contexte fourni. L'email doit être professionnel, bien structuré et adapté au contexte. IMPORTANT : retourne UNIQUEMENT l'email généré, avec l'objet en première ligne commençant par 'Objet:'.""",
                correction_prompt="""Tu es un correcteur de texte professionnel. Corrige le texte suivant en respectant les options sélectionnées:
- Correction grammaticale
- Correction orthographique
- Correction syntaxique
- Amélioration du style
- Correction de la ponctuation
- Suggestions de synonymes

Règles de correction syntaxique par défaut:
- Vérification de l'ordre des mots dans la phrase
- Respect de la structure Sujet-Verbe-Complément
- Cohérence des temps verbaux
- Vérification des accords en genre et en nombre
- Utilisation correcte des pronoms relatifs

Si l'option "Suggestions de synonymes" est activée, propose des synonymes pour les mots principaux du texte.
Format de réponse avec synonymes:
===TEXTE CORRIGÉ===
[Le texte corrigé]
===SYNONYMES===
mot1: synonyme1, synonyme2, synonyme3
mot2: synonyme1, synonyme2, synonyme3

Si l'option n'est pas activée, retourne UNIQUEMENT le texte corrigé."""
            )
            db.session.add(pref)
            db.session.commit()
        else:
            # Update with env vars if they exist
            if os.getenv('OLLAMA_URL'): 
                pref.ollama_url = os.getenv('OLLAMA_URL')
            if os.getenv('OPENAI_API_KEY'):
                pref.openai_api_key = os.getenv('OPENAI_API_KEY')
            if os.getenv('ANTHROPIC_API_KEY'):
                pref.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
            if os.getenv('GOOGLE_API_KEY'):
                pref.google_api_key = os.getenv('GOOGLE_API_KEY')
            if os.getenv('GROQ_API_KEY'):
                pref.groq_api_key = os.getenv('GROQ_API_KEY')
            db.session.commit()
        return pref

class ReformulationHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    original_text = db.Column(db.Text, nullable=False)
    context = db.Column(db.Text)
    reformulated_text = db.Column(db.Text, nullable=False)
    tone = db.Column(db.String(50), nullable=False)
    format = db.Column(db.String(50), nullable=False)
    length = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'original_text': self.original_text,
            'context': self.context,
            'reformulated_text': self.reformulated_text,
            'tone': self.tone,
            'format': self.format,
            'length': self.length,
            'created_at': self.created_at.isoformat()
        }

class EmailHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email_type = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    sender = db.Column(db.String(100))
    generated_subject = db.Column(db.Text)
    generated_email = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'email_type': self.email_type,
            'content': self.content,
            'sender': self.sender,
            'generated_subject': self.generated_subject,
            'generated_email': self.generated_email,
            'created_at': self.created_at.isoformat()
        }
