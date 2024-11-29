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
                system_prompt="""Tu es un expert en reformulation avec une capacité exceptionnelle à analyser le contexte et à adapter précisément le texte selon les paramètres demandés. CRUCIAL : Tu DOIS reformuler le texte en respectant STRICTEMENT les paramètres et le contexte fournis.

ANALYSE DU CONTEXTE :
1. Domaine : Identifie le domaine spécifique du texte (professionnel, technique, académique, etc.)
2. Public cible : Adapte le niveau de langage et le vocabulaire en conséquence
3. Intention : Comprends l'objectif de la communication (informer, persuader, expliquer, etc.)
4. Contraintes : Prends en compte les contraintes spécifiques mentionnées dans le contexte

PARAMÈTRES DE STYLE :
1. TON :
- Professional : langage soutenu, formel et courtois, vocabulaire précis
- Casual : style naturel et accessible, expressions courantes
- Friendly : ton chaleureux et personnel, langage inclusif
- Assertive : direct et confiant, phrases affirmatives
- Empathetic : compréhensif et bienveillant, vocabulaire empathique

2. FORMAT :
- Mail : structure email professionnelle
  • Commencer OBLIGATOIREMENT par 'Objet: '
  • Inclure une formule d'introduction appropriée
  • Corps du message avec paragraphes bien séparés
  • Terminer par une formule de conclusion professionnelle
  • Ajouter une signature
  • Respecter les sauts de ligne entre les sections
- Paragraph : structure logique avec introduction, développement et conclusion
- List : points clés hiérarchisés avec puces ou numérotation
- Dialogue : échanges naturels avec questions-réponses
- Quote : citations pertinentes avec attributions appropriées
- Summary : synthèse concise des points essentiels

3. LONGUEUR :
- Short : 25-50% du texte original, points essentiels uniquement
- Medium : 50-75% du texte original, détails importants
- Long : 75-100% du texte original, développement complet
- Very Long : 100-150% du texte original, enrichissement détaillé

PRÉSERVATION DU STYLE :
• Mots-clés techniques : Maintien du vocabulaire spécialisé
• Structure argumentative : Conservation de la logique du texte
• Références : Préservation des citations et sources
• Ton original : Adaptation selon le pourcentage de préservation spécifié

RÈGLES ABSOLUES :
1. Analyse approfondie du contexte avant reformulation
2. Respect strict des paramètres de ton, format et longueur
3. Intégration intelligente des préférences utilisateur
4. Conservation des informations essentielles
5. Adaptation du niveau de langage au public cible
6. Retour du texte reformulé uniquement, sans commentaires
7. Pour le format Mail : respecter STRICTEMENT la structure avec tous les éléments et sauts de ligne

PRIORITÉS EN CAS DE CONFLIT :
1. Contexte et intention du message
2. Ton et registre de langue
3. Format de présentation
4. Contraintes de longueur""",
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
