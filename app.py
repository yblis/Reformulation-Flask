from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
import json
from models import db, ReformulationHistory, EmailHistory
from openai import OpenAI
import anthropic
from anthropic import Anthropic
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

# Load and reload environment configuration
def reload_env_config():
    load_dotenv()
    
    class Config:
        def __init__(self):
            self.current_provider = os.getenv('AI_PROVIDER', 'ollama')
            self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
            self.ollama_model = os.getenv('OLLAMA_MODEL', 'llama2')
            self.openai_api_key = os.getenv('OPENAI_API_KEY')
            self.openai_model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
            self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
            self.anthropic_model = os.getenv('ANTHROPIC_MODEL', 'claude-3-opus-20240229')
            self.groq_api_key = os.getenv('GROQ_API_KEY')
            self.groq_model = os.getenv('GROQ_MODEL', 'mixtral-8x7b-32768')
            self.google_api_key = os.getenv('GOOGLE_API_KEY')
            self.gemini_model = os.getenv('GEMINI_MODEL', 'gemini-1.0-pro')
            self.system_prompt = os.getenv('SYSTEM_PROMPT', '')
            self.translation_prompt = os.getenv('TRANSLATION_PROMPT', '')
            self.email_prompt = os.getenv('EMAIL_PROMPT', '')
    
    return Config()

@app.route('/')
def index():
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).all()
    return render_template('index.html', reformulation_history=history)

@app.route('/api/status')
def check_status():
    preferences = reload_env_config()
    provider = preferences.current_provider
    
    if provider != 'ollama':
        return jsonify({
            "status": "connected",
            "provider": provider
        })
    
    try:
        ollama_url = request.args.get('url', preferences.ollama_url)
        response = requests.get(f"{ollama_url}/api/tags")
        
        if response.status_code == 200:
            return jsonify({
                "status": "connected",
                "provider": "ollama"
            })
        else:
            return jsonify({
                "status": "error",
                "provider": "ollama",
                "error": "Failed to get models"
            })
    except Exception as e:
        return jsonify({
            "status": "disconnected",
            "provider": "ollama",
            "error": str(e)
        })

@app.route('/api/settings', methods=['GET', 'POST'])
def manage_settings():
    if request.method == 'POST':
        try:
            data = request.get_json()
            provider = data.get('provider')
            settings = data.get('settings', {})
            
            if not provider:
                return jsonify({"error": "Provider is required"}), 400
            
            # Update environment variables
            with open('.env', 'r') as f:
                env_lines = f.readlines()
            
            new_env = []
            updated_keys = set()
            
            # Update AI provider
            new_env.append(f"AI_PROVIDER={provider}\n")
            updated_keys.add('AI_PROVIDER')
            
            # Map settings to environment variables
            settings_mapping = {
                'url': 'OLLAMA_URL',
                'apiKey': f"{provider.upper()}_API_KEY",
                'model': f"{provider.upper()}_MODEL"
            }
            
            # Add or update settings
            for key, value in settings.items():
                if key in settings_mapping:
                    env_key = settings_mapping[key]
                    new_env.append(f"{env_key}={value}\n")
                    updated_keys.add(env_key)
            
            # Keep other existing variables
            for line in env_lines:
                if line.strip() and not line.startswith('#'):
                    key = line.split('=')[0]
                    if key not in updated_keys:
                        new_env.append(line)
            
            # Write back to .env file
            with open('.env', 'w') as f:
                f.writelines(new_env)
            
            # Reload environment
            load_dotenv()
            
            return jsonify({"status": "success"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        try:
            preferences = reload_env_config()
            return jsonify({
                "provider": preferences.current_provider,
                "settings": {
                    "ollama_url": preferences.ollama_url,
                    "openai_api_key": preferences.openai_api_key,
                    "anthropic_api_key": preferences.anthropic_api_key,
                    "groq_api_key": preferences.groq_api_key,
                    "google_api_key": preferences.google_api_key
                }
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/models/<provider>')
def get_models(provider):
    preferences = reload_env_config()
    try:
        if provider == 'ollama':
            ollama_url = request.args.get('url', preferences.ollama_url)
            response = requests.get(f"{ollama_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get('models', [])
                return jsonify({
                    "models": [{"id": model["name"], "name": model["name"]} for model in models]
                })
            else:
                return jsonify({"error": "Failed to fetch Ollama models"}), 500
        elif provider == 'openai':
            client = OpenAI(api_key=preferences.openai_api_key)
            models = client.models.list()
            chat_models = [
                {"id": model.id, "name": model.id}
                for model in models
                if model.id.startswith(("gpt-"))
            ]
            return jsonify({"models": chat_models})
        elif provider == 'anthropic':
            return jsonify({
                "models": [
                    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                    {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
                    {"id": "claude-2.1", "name": "Claude 2.1"}
                ]
            })
        elif provider == 'groq':
            return jsonify({
                "models": [
                    {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B"},
                    {"id": "llama2-70b-4096", "name": "LLaMA2 70B"}
                ]
            })
        elif provider == 'gemini':
            return jsonify({
                "models": [
                    {"id": "gemini-1.0-pro", "name": "Gemini 1.0 Pro"},
                    {"id": "gemini-1.0-pro-vision", "name": "Gemini 1.0 Pro Vision"}
                ]
            })
        else:
            return jsonify({"error": "Invalid provider"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        preferences = reload_env_config()
        provider = preferences.current_provider
        
        text = data.get('text', '').strip()
        context = data.get('context', '').strip()
        tone = data.get('tone', '')
        format_type = data.get('format', '')
        length = data.get('length', '')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        formatted_prompt = f"Texte à reformuler:\n{text}\n\n"
        if context:
            formatted_prompt += f"Contexte:\n{context}\n\n"
        if tone:
            formatted_prompt += f"Ton: {tone}\n"
        if format_type:
            formatted_prompt += f"Format: {format_type}\n"
        if length:
            formatted_prompt += f"Longueur: {length}\n"
        
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
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
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
                reformulated_text=response_text,
                context=context,
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

@app.route('/api/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        preferences = reload_env_config()
        provider = preferences.current_provider
        translation_prompt = preferences.translation_prompt
        
        text = data.get('text', '').strip()
        target_language = data.get('language', '')
        
        if not text or not target_language:
            return jsonify({"error": "Text and target language are required"}), 400
        
        formatted_prompt = f"Texte à traduire:\n{text}\n\nLangue cible: {target_language}"
        
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

@app.route('/api/correct', methods=['POST'])
def correct_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text'].strip()
        if not text:
            return jsonify({"error": "Empty text"}), 400

        # Use the current AI provider to correct the text
        preferences = reload_env_config()
        provider = preferences.current_provider
        
        formatted_prompt = f"""Veuillez corriger ce texte en conservant la langue d'origine. 
        Corrigez uniquement les fautes d'orthographe, de grammaire et de ponctuation.
        
        Texte à corriger:
        {text}"""
        
        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
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
                        {"role": "system", "content": "Vous êtes un assistant spécialisé dans la correction de texte."},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system="Vous êtes un assistant spécialisé dans la correction de texte.",
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": "Vous êtes un assistant spécialisé dans la correction de texte."},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": ["Vous êtes un assistant spécialisé dans la correction de texte."]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text
            
            if not response_text:
                raise Exception(f"No response from {provider}")
            
            return jsonify({
                "corrected_text": response_text,
                "detected_language": "Détection automatique"  # Default message
            })
            
        except Exception as e:
            return jsonify({"error": f"Error correcting text: {str(e)}"}), 500
        matches = tool.check(text)
        corrected_text = language_tool_python.utils.correct(text, matches)
        
        # Close the LanguageTool instance
        tool.close()

        return jsonify({
            "detected_language": detected_language,
            "corrected_text": corrected_text
        })

    except Exception as e:
        print(f"Error in correct_text: {str(e)}")
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
