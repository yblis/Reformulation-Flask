from flask import Flask, request, jsonify, render_template
from models import db, ReformulationHistory, EmailHistory
from openai import OpenAI
from anthropic import Anthropic
import google.generativeai as genai
import requests
import json
import os
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

class EnvConfig:
    def __init__(self):
        self.current_provider = os.getenv('CURRENT_PROVIDER', 'ollama')
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.ollama_model = os.getenv('OLLAMA_MODEL', 'mistral')
        self.openai_api_key = os.getenv('OPENAI_API_KEY', '')
        self.openai_model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY', '')
        self.anthropic_model = os.getenv('ANTHROPIC_MODEL', 'claude-2')
        self.google_api_key = os.getenv('GOOGLE_API_KEY', '')
        self.gemini_model = os.getenv('GEMINI_MODEL', 'gemini-pro')
        self.groq_api_key = os.getenv('GROQ_API_KEY', '')
        self.groq_model = os.getenv('GROQ_MODEL', 'mixtral-8x7b-32768')
        self.reformulation_prompt = os.getenv('REFORMULATION_PROMPT', 'Tu es un assistant spécialisé dans la reformulation de texte.')
        self.translation_prompt = os.getenv('TRANSLATION_PROMPT', 'Tu es un traducteur professionnel.')
        self.email_prompt = os.getenv('EMAIL_PROMPT', 'Tu es un assistant spécialisé dans la rédaction d\'emails professionnels.')

def reload_env_config():
    return EnvConfig()

@app.route('/')
def index():
    reformulation_history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).all()
    return render_template('index.html', reformulation_history=reformulation_history)

@app.route('/api/status')
def check_status():
    preferences = reload_env_config()
    provider = preferences.current_provider
    if provider != 'ollama':
        return jsonify({"status": "connected", "provider": provider})
    
    ollama_url = request.args.get('url', preferences.ollama_url)
    try:
        response = requests.get(f"{ollama_url}/api/tags")
        if response.status_code == 200:
            return jsonify({"status": "connected", "provider": "ollama"})
        return jsonify({"status": "error", "provider": "ollama", "error": "Failed to connect to Ollama"})
    except Exception as e:
        return jsonify({"status": "disconnected", "provider": "ollama", "error": str(e)})

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        preferences = reload_env_config()
        provider = preferences.current_provider

        context = data.get('context', '')
        text = data.get('text', '')
        tone = data.get('tone', '')
        format = data.get('format', '')
        length = data.get('length', '')

        if not text:
            return jsonify({"error": "Text is required"}), 400

        formatted_prompt = f"""Contexte: {context if context else 'Aucun'}
Texte: {text}
Ton souhaité: {tone}
Format souhaité: {format}
Longueur souhaitée: {length}"""

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': preferences.reformulation_prompt,
                        'stream': False
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": preferences.reformulation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.reformulation_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": preferences.reformulation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [preferences.reformulation_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if response_text:
                history = ReformulationHistory(
                    context=context,
                    original_text=text,
                    reformulated_text=response_text,
                    tone=tone,
                    format=format,
                    length=length
                )
                db.session.add(history)
                db.session.commit()
                return jsonify({"text": response_text})
            return jsonify({"error": f"No response from {provider}"}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500
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
        target_language = data.get('target_language')

        if not text or not target_language:
            return jsonify({"error": "Text and target language are required"}), 400

        formatted_prompt = f"Texte à traduire: {text}\nLangue cible: {target_language}"
        translation_prompt = preferences.translation_prompt

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
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": translation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=translation_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": translation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [translation_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if response_text:
                return jsonify({"text": response_text})
            return jsonify({"error": f"No response from {provider}"}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-grammar', methods=['POST'])
def check_grammar():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text']
        preferences = reload_env_config()
        provider = preferences.current_provider

        grammar_prompt = """Tu es un correcteur grammatical expert. Analyse le texte suivant et identifie toutes les erreurs grammaticales, orthographiques et de style. Pour chaque erreur:
- Indique le type d'erreur (grammaire, orthographe, style, etc.)
- Fournis une explication claire de l'erreur
- Propose une correction
Format de réponse: Liste d'objets JSON avec les propriétés suivantes:
{
    "errors": [
        {
            "type": "Type d'erreur",
            "position": "Position dans le texte",
            "message": "Explication de l'erreur",
            "suggestion": "Suggestion de correction"
        }
    ]
}"""

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': text,
                        'system': grammar_prompt,
                        'stream': False
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": grammar_prompt},
                        {"role": "user", "content": text}
                    ],
                    response_format={ "type": "json_object" }
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=grammar_prompt,
                    messages=[{"role": "user", "content": text}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": grammar_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [grammar_prompt]},
                    {"role": "user", "parts": [text]}
                ])
                response_text = response.text

            if response_text:
                try:
                    errors = json.loads(response_text)
                    if not isinstance(errors.get('errors'), list):
                        errors = {"errors": []}
                    return jsonify(errors), 200
                except json.JSONDecodeError:
                    return jsonify({"errors": []}), 200
            return jsonify({"error": f"No response from {provider}"}), 500

        except Exception as e:
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fix-grammar', methods=['POST'])
def fix_grammar():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text']
        preferences = reload_env_config()
        provider = preferences.current_provider

        fix_prompt = """Tu es un correcteur grammatical expert. Corrige toutes les erreurs grammaticales, orthographiques et de style dans le texte suivant. Retourne uniquement le texte corrigé, sans explications ni commentaires."""

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': text,
                        'system': fix_prompt,
                        'stream': False
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": fix_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=fix_prompt,
                    messages=[{"role": "user", "content": text}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": fix_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [fix_prompt]},
                    {"role": "user", "parts": [text]}
                ])
                response_text = response.text

            if response_text:
                return jsonify({"text": response_text})
            return jsonify({"error": f"No response from {provider}"}), 500

        except Exception as e:
            return jsonify({"error": str(e)}), 500
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
            return jsonify({"error": "Email type and content are required"}), 400

        formatted_prompt = f"Type d'email: {email_type}\nContenu: {content}\nExpéditeur: {sender}"

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
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": preferences.email_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.email_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": preferences.email_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [preferences.email_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if response_text:
                lines = response_text.split('\n')
                subject = None
                for line in lines:
                    if line.lower().startswith('objet:'):
                        subject = line[6:].strip()
                        break
                history = EmailHistory(
                    email_type=email_type,
                    content=content,
                    sender=sender,
                    generated_subject=subject,
                    generated_email=response_text
                )
                db.session.add(history)
                db.session.commit()
                return jsonify({"text": response_text})
            return jsonify({"error": f"No response from {provider}"}), 500

        except Exception as e:
            return jsonify({"error": f"Error generating email: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history/reset', methods=['POST'])
def reset_history():
    try:
        ReformulationHistory.query.delete()
        EmailHistory.query.delete()
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)