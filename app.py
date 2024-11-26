from datetime import datetime
from flask import Flask, request, jsonify, render_template
import requests
import os
from openai import OpenAI
from anthropic import Anthropic
import google.generativeai as genai
from models import db, UserPreferences, ReformulationHistory, EmailHistory

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

def reload_env_config():
    return UserPreferences.get_or_create()

@app.route('/')
def index():
    return render_template('index.html')

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
            return jsonify({"error": "No text provided"}), 400
            
        # Format the correction options
        correction_types = []
        if options.get('grammar'): correction_types.append('grammaire')
        if options.get('spelling'): correction_types.append('orthographe')
        if options.get('style'): correction_types.append('style')
        if options.get('punctuation'): correction_types.append('ponctuation')
        
        correction_prompt = f"Corrige le texte suivant en te concentrant sur les aspects suivants: {', '.join(correction_types)}. Retourne uniquement le texte corrigé, sans explication ni commentaire.\n\nTexte à corriger: {text}"
        
        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': correction_prompt,
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
                        {"role": "user", "content": correction_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    messages=[{"role": "user", "content": correction_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "user", "content": correction_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content(correction_prompt)
                response_text = response.text
                
            if not response_text:
                raise Exception(f"No response from {provider}")
                
            return jsonify({"text": response_text})
        except Exception as e:
            return jsonify({"error": f"Error correcting text: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        preferences = reload_env_config()
        provider = preferences.current_provider
        translation_prompt = preferences.translation_prompt
        
        text = data.get('text')
        target_language = data.get('language', 'Anglais')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        formatted_prompt = f"Texte à traduire: {text}"
        translation_prompt = translation_prompt.format(target_language=target_language)
        
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
                
            if not response_text:
                raise Exception(f"No response from {provider}")
                
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

@app.route('/api/history/reset', methods=['POST'])
def reset_history():
    try:
        ReformulationHistory.query.delete()
        EmailHistory.query.delete()
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history')
def get_history():
    try:
        reformulations = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).all()
        emails = EmailHistory.query.order_by(EmailHistory.created_at.desc()).all()
        
        return jsonify({
            "reformulations": [r.to_dict() for r in reformulations],
            "emails": [e.to_dict() for e in emails]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'GET':
        try:
            preferences = reload_env_config()
            return jsonify({
                "provider": preferences.current_provider,
                "settings": {
                    "ollama_url": preferences.ollama_url,
                    "ollama_model": preferences.ollama_model,
                    "openai_api_key": preferences.openai_api_key,
                    "openai_model": preferences.openai_model,
                    "anthropic_api_key": preferences.anthropic_api_key,
                    "anthropic_model": preferences.anthropic_model,
                    "google_api_key": preferences.google_api_key,
                    "gemini_model": preferences.gemini_model,
                    "groq_api_key": preferences.groq_api_key,
                    "groq_model": preferences.groq_model
                }
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            preferences = reload_env_config()
            
            if 'provider' in data:
                preferences.current_provider = data['provider']
                
            if 'settings' in data:
                settings = data['settings']
                if 'url' in settings:
                    preferences.ollama_url = settings['url']
                if 'apiKey' in settings:
                    if data['provider'] == 'openai':
                        preferences.openai_api_key = settings['apiKey']
                    elif data['provider'] == 'anthropic':
                        preferences.anthropic_api_key = settings['apiKey']
                    elif data['provider'] == 'gemini':
                        preferences.google_api_key = settings['apiKey']
                    elif data['provider'] == 'groq':
                        preferences.groq_api_key = settings['apiKey']
                if 'model' in settings:
                    if data['provider'] == 'ollama':
                        preferences.ollama_model = settings['model']
                    elif data['provider'] == 'openai':
                        preferences.openai_model = settings['model']
                    elif data['provider'] == 'anthropic':
                        preferences.anthropic_model = settings['model']
                    elif data['provider'] == 'gemini':
                        preferences.gemini_model = settings['model']
                    elif data['provider'] == 'groq':
                        preferences.groq_model = settings['model']
                        
            db.session.commit()
            return jsonify({"status": "success"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/models/<provider>')
def get_models(provider):
    try:
        preferences = reload_env_config()
        
        if provider == 'ollama':
            ollama_url = request.args.get('url', preferences.ollama_url)
            response = requests.get(f"{ollama_url}/api/tags")
            
            if response.status_code == 200:
                models = response.json().get('models', [])
                return jsonify({
                    "models": [{"id": model['name'], "name": model['name']} for model in models]
                })
            else:
                return jsonify({"error": "Failed to fetch Ollama models"}), 500
        elif provider == 'openai':
            client = OpenAI(api_key=preferences.openai_api_key)
            models = [
                {"id": "gpt-4", "name": "GPT-4"},
                {"id": "gpt-4-turbo-preview", "name": "GPT-4 Turbo"},
                {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"}
            ]
            return jsonify({"models": models})
        elif provider == 'anthropic':
            models = [
                {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
                {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
                {"id": "claude-2.1", "name": "Claude 2.1"}
            ]
            return jsonify({"models": models})
        elif provider == 'groq':
            models = [
                {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B"},
                {"id": "llama2-70b-4096", "name": "LLaMA2 70B"}
            ]
            return jsonify({"models": models})
        elif provider == 'gemini':
            models = [
                {"id": "gemini-1.0-pro", "name": "Gemini 1.0 Pro"},
                {"id": "gemini-1.0-pro-latest", "name": "Gemini 1.0 Pro Latest"}
            ]
            return jsonify({"models": models})
        else:
            return jsonify({"error": "Unknown provider"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/status')
def check_status():
    try:
        preferences = reload_env_config()
        provider = preferences.current_provider
        
        if provider != 'ollama':
            return jsonify({
                "status": "connected",
                "provider": provider
            })
            
        ollama_url = request.args.get('url', preferences.ollama_url)
        response = requests.get(f"{ollama_url}/api/tags")
        
        if response.status_code == 200:
            return jsonify({
                "status": "connected",
                "provider": "ollama"
            })
        else:
            return jsonify({
                "status": "disconnected",
                "provider": "ollama",
                "error": "Failed to connect to Ollama server"
            })
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "disconnected",
            "provider": "ollama",
            "error": str(e)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "provider": "unknown",
            "error": str(e)
        })