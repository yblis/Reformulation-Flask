from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
import os
import requests
from openai import OpenAI
from anthropic import Anthropic
import google.generativeai as genai
from datetime import datetime
from models import db, UserPreferences, ReformulationHistory, EmailHistory

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///reformulateur.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

def reload_env_config():
    return UserPreferences.get_or_create()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400

            preferences = reload_env_config()
            provider = data.get('provider')
            settings = data.get('settings', {})

            if provider:
                preferences.current_provider = provider

            if provider == 'ollama' and 'url' in settings:
                preferences.ollama_url = settings['url']
            elif 'apiKey' in settings:
                if provider == 'openai':
                    preferences.openai_api_key = settings['apiKey']
                elif provider == 'anthropic':
                    preferences.anthropic_api_key = settings['apiKey']
                elif provider == 'groq':
                    preferences.groq_api_key = settings['apiKey']
                elif provider == 'gemini':
                    preferences.google_api_key = settings['apiKey']

            if 'model' in settings:
                if provider == 'ollama':
                    preferences.ollama_model = settings['model']
                elif provider == 'openai':
                    preferences.openai_model = settings['model']
                elif provider == 'anthropic':
                    preferences.anthropic_model = settings['model']
                elif provider == 'groq':
                    preferences.groq_model = settings['model']
                elif provider == 'gemini':
                    preferences.gemini_model = settings['model']

            db.session.commit()
            return jsonify({"status": "success"})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    try:
        preferences = reload_env_config()
        return jsonify({
            "provider": preferences.current_provider,
            "settings": {
                "ollama_url": preferences.ollama_url,
                "openai_api_key": preferences.openai_api_key,
                "anthropic_api_key": preferences.anthropic_api_key,
                "google_api_key": preferences.google_api_key,
                "groq_api_key": preferences.groq_api_key,
                "system_prompt": preferences.system_prompt,
                "translation_prompt": preferences.translation_prompt,
                "email_prompt": preferences.email_prompt
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/<provider>')
def get_models(provider):
    try:
        preferences = reload_env_config()
        if provider == 'ollama':
            url = request.args.get('url', preferences.ollama_url)
            response = requests.get(f"{url}/api/tags")
            if response.status_code == 200:
                models = response.json().get('models', [])
                return jsonify({
                    "models": [{"id": model['name'], "name": model['name']} for model in models]
                })
            else:
                return jsonify({"error": "Failed to fetch Ollama models"}), 500
        elif provider == 'openai':
            if not preferences.openai_api_key:
                return jsonify({"error": "OpenAI API key not configured"}), 400
            client = OpenAI(api_key=preferences.openai_api_key)
            models = client.models.list()
            return jsonify({
                "models": [{"id": model.id, "name": model.id} for model in models]
            })
        elif provider == 'anthropic':
            return jsonify({
                "models": [
                    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                    {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
                    {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
                    {"id": "claude-2.1", "name": "Claude 2.1"},
                    {"id": "claude-2.0", "name": "Claude 2.0"}
                ]
            })
        elif provider == 'groq':
            return jsonify({
                "models": [
                    {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B"},
                    {"id": "llama2-70b-4096", "name": "LLaMA2 70B"},
                    {"id": "gemma-7b-it", "name": "Gemma 7B"}
                ]
            })
        elif provider == 'gemini':
            return jsonify({
                "models": [
                    {"id": "gemini-pro", "name": "Gemini Pro"},
                    {"id": "gemini-pro-vision", "name": "Gemini Pro Vision"}
                ]
            })
        else:
            return jsonify({"error": "Invalid provider"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/status')
def check_status():
    try:
        preferences = reload_env_config()
        provider = preferences.current_provider
        
        if provider != 'ollama':
            return jsonify({"status": "connected", "provider": provider})
            
        url = request.args.get('url', preferences.ollama_url)
        response = requests.get(f"{url}/api/tags")
        
        if response.status_code == 200:
            return jsonify({"status": "connected", "provider": "ollama"})
        else:
            return jsonify({
                "status": "disconnected",
                "provider": "ollama",
                "error": f"Failed to connect to Ollama server at {url}"
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "provider": preferences.current_provider,
            "error": str(e)
        }), 500

@app.route('/api/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        preferences = reload_env_config()
        provider = preferences.current_provider
        text = data.get('text')
        target_language = data.get('language', 'Anglais')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        translation_prompt = preferences.translation_prompt.format(target_language=target_language)
        formatted_prompt = f"Texte à traduire: {text}"

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
                client = OpenAI(api_key=preferences.groq_api_key, base_url="https://api.groq.com/openai/v1")
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

            if not response_text:
                raise Exception(f"No response from {provider}")

            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Error translating text: {str(e)}"}), 500
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
        options = data.get('options', ['Orthographe'])

        if not text:
            return jsonify({"error": "No text provided"}), 400

        correction_prompt = f"""Tu es un assistant de correction de texte. Corrige le texte fourni en fonction des options sélectionnées: {', '.join(options)}.
Fournis uniquement le texte corrigé, sans commentaires ni explications. Assure-toi de préserver le format et la mise en forme du texte original."""

        formatted_prompt = f"Texte à corriger: {text}"

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': correction_prompt,
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
                        {"role": "system", "content": correction_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=correction_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key, base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": correction_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [correction_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if not response_text:
                raise Exception(f"No response from {provider}")

            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Error correcting text: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reformulate', methods=['POST'])
def reformulate_text():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        preferences = reload_env_config()
        provider = preferences.current_provider
        text = data.get('text')
        context = data.get('context', '')
        tone = data.get('tone', 'Professionnel')
        format_type = data.get('format', 'Mail')
        length = data.get('length', 'Moyen')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        formatted_prompt = f"""Texte à reformuler:
{text}

Ton: {tone}
Format: {format_type}
Longueur: {length}

{"Contexte:" + chr(10) + context if context else ""}"""

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
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')
            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": preferences.system_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.system_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key, base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": preferences.system_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [preferences.system_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if not response_text:
                raise Exception(f"No response from {provider}")

            history = ReformulationHistory(
                original_text=text,
                context=context,
                reformulated_text=response_text,
                tone=tone,
                format=format_type,
                length=length
            )
            db.session.add(history)
            db.session.commit()

            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Error reformulating text: {str(e)}"}), 500
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
                client = OpenAI(api_key=preferences.groq_api_key, base_url="https://api.groq.com/openai/v1")
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

            if not response_text:
                raise Exception(f"No response from {provider}")

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
        except Exception as e:
            return jsonify({"error": f"Error generating email: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history')
def get_history():
    try:
        reformulations = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
        emails = EmailHistory.query.order_by(EmailHistory.created_at.desc()).limit(10).all()

        return jsonify({
            "reformulations": [r.to_dict() for r in reformulations],
            "emails": [e.to_dict() for e in emails]
        })
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
    app.run(host='0.0.0.0', port=5000, debug=True)