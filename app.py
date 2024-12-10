from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_migrate import Migrate
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
from models import db, UserPreferences, ReformulationHistory, EmailHistory, CorrectionHistory, TranslationHistory
from openai import OpenAI
from anthropic import Anthropic
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)

# Use SQLite for development
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reformulator.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db)

with app.app_context():
    db.create_all()

def reload_env_config():
    load_dotenv(override=True)
    preferences = UserPreferences.get_or_create()
    preferences.ollama_url = os.getenv('OLLAMA_URL', preferences.ollama_url)
    preferences.openai_api_key = os.getenv('OPENAI_API_KEY', preferences.openai_api_key)
    preferences.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY', preferences.anthropic_api_key)
    preferences.google_api_key = os.getenv('GOOGLE_API_KEY', preferences.google_api_key)
    preferences.groq_api_key = os.getenv('GROQ_API_KEY', preferences.groq_api_key)
    db.session.commit()
    return preferences

@app.before_request
def before_request():
    reload_env_config()

@app.errorhandler(404)
@app.errorhandler(500)
def handle_error(error):
    return jsonify({"error": str(error), "status": error.code}), error.code

@app.route('/api/settings', methods=['GET'])
def get_settings():
    try:
        preferences = reload_env_config()
        return jsonify({
            "provider": preferences.current_provider,
            "settings": {
                "ollama_url": preferences.ollama_url,
                "openai_api_key": preferences.openai_api_key,
                "anthropic_api_key": preferences.anthropic_api_key,
                "google_api_key": preferences.google_api_key,
                "groq_api_key": preferences.groq_api_key
            },
            "prompts": {
                "system_prompt": preferences.system_prompt,
                "translation_prompt": preferences.translation_prompt,
                "correction_prompt": preferences.correction_prompt,
                "email_prompt": preferences.email_prompt
            }
        })
    except Exception as e:
        print(f"Error in get_settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/status')
def check_status():
    try:
        preferences = reload_env_config()
        provider = preferences.current_provider
        return jsonify({"status": "connected", "provider": provider})
    except Exception as e:
        print(f"Unexpected error checking status: {str(e)}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/models/gemini')
def get_gemini_models():
    try:
        preferences = reload_env_config()
        if not preferences.google_api_key:
            return jsonify({"error": "Clé API Google non configurée"}), 401
        try:
            genai.configure(api_key=preferences.google_api_key)
            models = genai.list_models()
            filtered_models = [{
                "id": model.name,
                "name": model.display_name
            } for model in models if 'gemini' in model.name]
            return jsonify({"models": filtered_models})
        except Exception as e:
            print(f"Erreur lors de la récupération des modèles Gemini : {str(e)}")
            return jsonify({"error": f"Erreur de l'API Gemini : {str(e)}"}), 500
    except Exception as e:
        print(f"Erreur dans get_gemini_models : {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/anthropic')
def get_anthropic_models():
    try:
        preferences = reload_env_config()
        if not preferences.anthropic_api_key:
            return jsonify({"error": "Clé API Anthropic non configurée"}), 401
        try:
            client = Anthropic(api_key=preferences.anthropic_api_key)
            models = [{
                "id": "claude-3-opus-20240229",
                "name": "Claude 3 Opus"
            }, {
                "id": "claude-3-sonnet-20240229",
                "name": "Claude 3 Sonnet"
            }, {
                "id": "claude-3-haiku-20240307",
                "name": "Claude 3 Haiku"
            }, {
                "id": "claude-2.1",
                "name": "Claude 2.1"
            }, {
                "id": "claude-2.0",
                "name": "Claude 2.0"
            }, {
                "id": "claude-instant-1.2",
                "name": "Claude Instant 1.2"
            }]
            return jsonify({"models": models})
        except Exception as e:
            print(f"Erreur lors de la récupération des modèles Anthropic : {str(e)}")
            return jsonify({"error": f"Erreur de l'API Anthropic : {str(e)}"}), 500
    except Exception as e:
        print(f"Erreur dans get_anthropic_models : {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/groq')
def get_groq_models():
    try:
        preferences = reload_env_config()
        if not preferences.groq_api_key:
            return jsonify({"error": "Groq API key not configured"}), 401
        try:
            response = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {preferences.groq_api_key}"})
            if response.status_code != 200:
                return jsonify({"error": response.text}), response.status_code
            data = response.json()
            return jsonify({
                "models": [{
                    "id": model["id"],
                    "name": model["id"]
                } for model in data["data"]]
            })
        except Exception as e:
            return jsonify({"error": f"Failed to fetch Groq models: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/openai')
def get_openai_models():
    try:
        preferences = reload_env_config()
        if not preferences.openai_api_key:
            return jsonify({"error": "Clé API OpenAI non configurée"}), 401
        try:
            client = OpenAI(api_key=preferences.openai_api_key)
            response = client.models.list()
            models = response.data
            filtered_models = [{
                "id": model.id,
                "name": model.id
            } for model in models if 'gpt' in model.id]
            return jsonify({"models": filtered_models})
        except Exception as e:
            print(f"Erreur lors de la récupération des modèles OpenAI : {str(e)}")
            return jsonify({"error": f"Erreur de l'API OpenAI : {str(e)}"}), 500
    except Exception as e:
        print(f"Erreur dans get_openai_models : {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/ollama')
def get_ollama_models():
    try:
        preferences = reload_env_config()
        url = request.args.get('url', preferences.ollama_url)
        if not url:
            return jsonify({"error": "Ollama URL not configured"}), 401
        try:
            response = requests.get(f"{url}/api/tags", timeout=5)
            if response.status_code != 200:
                return jsonify({"error": "Failed to fetch Ollama models"}), response.status_code
            data = response.json()
            models = [{
                "id": model["name"],
                "name": model["name"]
            } for model in data["models"]]
            return jsonify({"models": models})
        except requests.exceptions.RequestException as e:
            print(f"Error in get_ollama_models: {str(e)}")
            return jsonify({"error": f"Ollama connection error: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in get_ollama_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    preferences = reload_env_config()
    return render_template(
        'index.html',
        system_prompt=preferences.system_prompt,
        translation_prompt=preferences.translation_prompt,
        email_prompt=preferences.email_prompt,
        correction_prompt=preferences.correction_prompt)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"error": "Invalid request: No JSON data"}), 400
        preferences = reload_env_config()
        provider = data.get('provider', 'ollama')
        settings = data.get('settings', {})
        preferences.current_provider = provider
        if provider == 'ollama':
            if url := settings.get('url'):
                preferences.ollama_url = url
            if model := settings.get('model'):
                preferences.ollama_model = model
        elif provider == 'openai':
            if api_key := settings.get('apiKey'):
                preferences.openai_api_key = api_key
            if model := settings.get('model'):
                preferences.openai_model = model
        elif provider == 'anthropic':
            if api_key := settings.get('apiKey'):
                preferences.anthropic_api_key = api_key
            if model := settings.get('model'):
                preferences.anthropic_model = model
        elif provider == 'groq':
            if api_key := settings.get('apiKey'):
                preferences.groq_api_key = api_key
            if model := settings.get('model'):
                preferences.groq_model = model
        elif provider == 'gemini':
            if api_key := settings.get('apiKey'):
                preferences.google_api_key = api_key
            if model := settings.get('model'):
                preferences.gemini_model = model
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error in update_settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        preferences = reload_env_config()
        provider = preferences.current_provider
        text = data.get('text')
        context = data.get('context', '')
        tone = data.get('tone', 'Professionnel')  # Default to 'Professionnel' if not specified
        format = data.get('format', 'Paragraphe')
        length = data.get('length', 'Moyen')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Construction d'un prompt plus détaillé avec meilleure intégration du contexte
        preferences = UserPreferences.get_or_create()
        reformulation_prefs = preferences.reformulation_preferences

        style_preservation = reformulation_prefs.get('style_preservation', 0.7)
        context_importance = reformulation_prefs.get('context_importance', 0.8)
        advanced_options = reformulation_prefs.get('advanced_options', {})

        email_format_instructions = """
Structure OBLIGATOIRE pour le format mail:
1. Ligne "Objet: [sujet]" (OBLIGATOIRE en début d'email)
2. Formule de salutation appropriée et personnalisée
3. Corps du message structuré en paragraphes clairs
4. Formule de politesse adaptée au contexte
5. Signature professionnelle

Règles supplémentaires format mail:
- L'objet doit être concis et pertinent
- La salutation doit être adaptée au destinataire
- Les paragraphes doivent être courts et bien espacés
- La formule de politesse doit correspondre au ton choisi
- La signature doit inclure les informations essentielles
""" if format.lower() == 'mail' else ''

        formatted_prompt = f"""INSTRUCTIONS DE REFORMULATION :
Ce message est une réponse à un email reçu.

===EMAIL REÇU (NE PAS REFORMULER)=== 
{context}

===RÉPONSE À REFORMULER=== 
{text}

RÈGLES STRICTES :
1. REFORMULER UNIQUEMENT le texte sous "===RÉPONSE À REFORMULER==="
2. NE PAS reformuler ni inclure l'email reçu
3. Produire une réponse cohérente avec l'email reçu

Paramètres de reformulation :
- Ton désiré : {tone} (IMPORTANT: Adapter strictement le ton selon cette valeur)
- Format souhaité : {format}
- Longueur cible : {length}

Instructions spécifiques pour le ton {tone}:
- Si Professionnel : langage soutenu, formel et courtois
- Si Informatif : style clair, précis et factuel
- Si Décontracté : style plus relâché, familier tout en restant poli

{email_format_instructions}"""

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': preferences.system_prompt,
                        'stream': False
                    })
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[{
                        "role": "system",
                        "content": preferences.system_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.system_prompt,
                    messages=[{
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(
                    api_key=preferences.groq_api_key,
                    base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[{
                        "role": "system",
                        "content": preferences.system_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([{
                    "role": "user",
                    "parts": [preferences.system_prompt]
                }, {
                    "role": "user",
                    "parts": [formatted_prompt]
                }])
                response_text = response.text

            if not response_text:
                raise Exception(f"No response from {provider}")

            # L'historique est maintenant géré côté client via localStorage

            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Error reformulating text: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/correct', methods=['POST'])
def correct_text():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        preferences = reload_env_config()
        provider = preferences.current_provider
        text = data.get('text')
        options = data.get('options', {})

        if not text:
            return jsonify({"error": "Text is required"}), 400

        # Format the prompt with correction options
        correction_prompt = "Tu es un correcteur de texte professionnel. Corrige le texte suivant en respectant les options sélectionnées:\n"
        if options.get('grammar'):
            correction_prompt += "- Correction grammaticale\n"
        if options.get('spelling'):
            correction_prompt += "- Correction orthographique\n"
        if options.get('style'):
            correction_prompt += "- Amélioration du style\n"
        if options.get('punctuation'):
            correction_prompt += "- Correction de la ponctuation\n"
        if options.get('syntax'):
            correction_prompt += "- Correction syntaxique avec les règles suivantes:\n"
            syntax_rules = options.get('syntax_rules', {})
            if syntax_rules.get('word_order'):
                correction_prompt += "  • Vérification de l'ordre des mots\n"
            if syntax_rules.get('subject_verb_agreement'):
                correction_prompt += "  • Accord sujet-verbe\n"
            if syntax_rules.get('verb_tense'):
                correction_prompt += "  • Temps verbaux\n"
            if syntax_rules.get('gender_number'):
                correction_prompt += "  • Accord en genre et nombre\n"
            if syntax_rules.get('relative_pronouns'):
                correction_prompt += "  • Pronoms relatifs\n"

        if options.get('synonyms'):
            correction_prompt += """
Format de réponse avec synonymes:
===TEXTE CORRIGÉ===
[Le texte corrigé]
===SYNONYMES===
mot1: synonyme1, synonyme2, synonyme3
mot2: synonyme1, synonyme2, synonyme3"""
        else:
            correction_prompt += "\nRetourne UNIQUEMENT le texte corrigé, sans aucun autre commentaire."

        formatted_prompt = f"Texte à corriger: {text}"

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model':
                        preferences.ollama_model,
                        'prompt':
                        formatted_prompt,
                        'system':
                        correction_prompt +
                        ("\nVeuillez inclure des suggestions de synonymes."
                         if options.get('synonyms') else ""),
                        'stream':
                        False
                    })
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[{
                        "role": "system",
                        "content": correction_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=correction_prompt,
                    messages=[{
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                                base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[{
                        "role": "system",
                        "content": correction_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([{
                    "role": "user",
                    "parts": [correction_prompt]
                }, {
                    "role": "user",
                    "parts": [formatted_prompt]
                }])
                response_text = response.text

            if not response_text:
                raise Exception(f"No response from {provider}")

            # L'historique est maintenant géré côté client via localStorage

            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Error correcting text: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        preferences = reload_env_config()
        provider = preferences.current_provider
        text = data.get('text')
        target_language = data.get('language')
        if not text or not target_language:
            return jsonify({"error":
                            "Text and target language are required"}), 400
        translation_prompt = preferences.translation_prompt.format(
            target_language=target_language)
        formatted_prompt = f"Text: {text}"
        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': translation_prompt,
                        'stream': False
                    })
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[{
                        "role": "system",
                        "content": translation_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=translation_prompt,
                    messages=[{
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                                base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[{
                        "role": "system",
                        "content": translation_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([{
                    "role":
                    "user",
                    "parts": [translation_prompt]
                }, {
                    "role": "user",
                    "parts": [formatted_prompt]
                }])
                response_text = response.text
            if not response_text:
                raise Exception(f"No response from {provider}")
            
            # L'historique est maintenant géré côté client via localStorage
            
            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Translation error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-email', methods=['POST'])
def generate_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        preferences = reload_env_config()
        provider = preferences.current_provider
        email_type = data.get('type')
        content = data.get('content')
        sender = data.get('sender', '')
        if not email_type or not content:
            return jsonify({"error":
                            "Email type and content are required"}), 400
        # Enhanced prompt with tone-specific instructions
        formatted_prompt = f"""Type d'email: {email_type}
Contenu à inclure: {content}
Expéditeur: {sender}

Instructions spécifiques:
- Format: Email professionnel
- Type spécifique: {email_type}
- Ton désiré: {data.get('tone', 'Professionnel')} (IMPORTANT: Adapter strictement le ton)
- Structure: Objet, Salutation, Corps du message, Formule de politesse, Signature
- Contenu: Développer le contenu en incluant les points importants de "Contenu à inclure"
- Mise en forme: Paragraphes clairs, concis et espacés. L'objet doit être concis et informatif.

Instructions spécifiques pour le ton {data.get('tone', 'Professionnel')}:
- Si Professionnel : langage soutenu, formel et courtois
- Si Informatif : style clair, précis et factuel
- Si Décontracté : style plus relâché, familier tout en restant poli

Exemple de structure:

Objet: [Sujet clair et concis]

Cher/Chère [Nom du destinataire],

[Corps du message, bien structuré en paragraphes]

Cordialement,

[Nom de l'expéditeur]
"""
        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': preferences.email_prompt,
                        'stream': False
                    })
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[{
                        "role": "system",
                        "content": preferences.email_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.email_prompt,
                    messages=[{
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                                base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[{
                        "role": "system",
                        "content": preferences.email_prompt
                    }, {
                        "role": "user",
                        "content": formatted_prompt
                    }])
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([{
                    "role":
                    "user",
                    "parts": [preferences.email_prompt]
                }, {
                    "role": "user",
                    "parts": [formatted_prompt]
                }])
                response_text = response.text
            if not response_text:
                raise Exception(f"No response from {provider}")
            lines = response_text.split('\n')
            subject = None
            for line in lines:
                if line.lower().startswith('objet:'):
                    subject = line[6:].strip()
                    break
            # L'historique est maintenant géré côté client via localStorage
            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Error generating email: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/history/reset', methods=['POST'])
def reset_history():
    try:
        ReformulationHistory.query.delete()
        EmailHistory.query.delete()
        CorrectionHistory.query.delete()
        TranslationHistory.query.delete()
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500