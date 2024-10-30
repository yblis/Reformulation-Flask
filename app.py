from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
from requests.exceptions import ConnectionError, Timeout
from models import db, UserPreferences, ReformulationHistory
import openai
from openai import OpenAI
import anthropic
from anthropic import Anthropic
import google.generativeai as genai

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reformulator.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    preferences = UserPreferences.get_or_create()

@app.route('/api/models/<provider>')
def get_provider_models(provider):
    preferences = UserPreferences.get_or_create()
    print(f"Fetching models for provider: {provider}")  # Debug log
    
    try:
        if provider == 'openai':
            if not preferences.openai_api_key:
                return jsonify({"error": "OpenAI API key not configured"}), 401
                
            client = OpenAI(api_key=preferences.openai_api_key)
            models = client.models.list()
            
            return jsonify({
                "models": [
                    {"id": model.id, "name": model.id}
                    for model in models
                    if "gpt" in model.id
                ]
            })
                
        elif provider == 'anthropic':
            models = [
                {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
                {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"}
            ]
            return jsonify({"models": models})
                
        elif provider == 'groq':
            if not preferences.groq_api_key:
                print("Groq API key missing")  # Debug log
                return jsonify({"error": "Groq API key not configured"}), 401
                
            # Return static list of supported Groq models
            models = [
                {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B"},
                {"id": "llama2-70b-4096", "name": "LLaMA2 70B"}
            ]
            print(f"Returning Groq models: {models}")  # Debug log
            return jsonify({"models": models})
            
        elif provider == 'gemini':
            models = [
                {"id": "gemini-1.5-pro-001", "name": "Gemini 1.5 Pro"},
                {"id": "gemini-1.5-flash-001", "name": "Gemini 1.5 Flash"}
            ]
            return jsonify({"models": models})
                
        elif provider == 'ollama':
            url = request.args.get('url', preferences.ollama_url)
            try:
                response = requests.get(f"{url}/api/tags", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    return jsonify({
                        "models": [{"id": model["name"], "name": model["name"]} 
                                 for model in data.get("models", [])]
                    })
                return jsonify({"error": f"Failed to fetch models: HTTP {response.status_code}"}), response.status_code
            except requests.exceptions.RequestException as e:
                return jsonify({"error": f"Connection error: {str(e)}"}), 500
        
        return jsonify({"error": "Invalid provider"}), 400
        
    except Exception as e:
        print(f"Error in get_provider_models: {str(e)}")  # Debug log
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    """Main route to serve the index page"""
    preferences = UserPreferences.get_or_create()
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         history=[h.to_dict() for h in history])

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.get_json()
    if data is None:
        return jsonify({"error": "Invalid request"}), 400

    try:
        preferences = UserPreferences.get_or_create()
        preferences.current_provider = data.get('provider', 'ollama')

        settings = data.get('settings', {})

        if preferences.current_provider == 'ollama':
            preferences.ollama_url = settings.get('url', preferences.ollama_url)
            preferences.ollama_model = settings.get('model', preferences.ollama_model)
        elif preferences.current_provider == 'openai':
            if api_key := settings.get('apiKey'):
                preferences.openai_api_key = api_key
            if model := settings.get('model'):
                preferences.openai_model = model
        elif preferences.current_provider == 'groq':
            if api_key := settings.get('apiKey'):
                preferences.groq_api_key = api_key
            if model := settings.get('model'):
                preferences.groq_model = model
        elif preferences.current_provider == 'anthropic':
            if api_key := settings.get('apiKey'):
                preferences.anthropic_api_key = api_key
            if model := settings.get('model'):
                preferences.anthropic_model = model
        elif preferences.current_provider == 'gemini':
            if api_key := settings.get('apiKey'):
                preferences.google_api_key = api_key
            if model := settings.get('model'):
                preferences.gemini_model = model

        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Rest of the routes...
@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        preferences = UserPreferences.get_or_create()
        prompt = f"""<|im_start|>system
{preferences.system_prompt}
<|im_end|>
<|im_start|>user
Contexte: {data.get('context', '')}
Texte à reformuler: {data.get('text')}
Ton: {data.get('tone')}
Format: {data.get('format')}
Longueur: {data.get('length')}
<|im_end|>
<|im_start|>assistant"""

        # Call the appropriate AI provider
        if preferences.current_provider == 'openai':
            client = OpenAI(api_key=preferences.openai_api_key)
            response = client.chat.completions.create(
                model=preferences.openai_model or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            reformulated_text = response.choices[0].message.content
        elif preferences.current_provider == 'anthropic':
            client = Anthropic(api_key=preferences.anthropic_api_key)
            response = client.messages.create(
                model=preferences.anthropic_model or "claude-3-opus-20240229",
                messages=[{"role": "user", "content": prompt}]
            )
            reformulated_text = response.content[0].text
        elif preferences.current_provider == 'groq':
            headers = {
                "Authorization": f"Bearer {preferences.groq_api_key}",
                "Content-Type": "application/json"
            }
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json={
                    "model": preferences.groq_model or "mixtral-8x7b-32768",
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            if response.status_code != 200:
                raise Exception(f"Error from Groq API: {response.text}")
            reformulated_text = response.json()["choices"][0]["message"]["content"]
        elif preferences.current_provider == 'gemini':
            genai.configure(api_key=preferences.google_api_key)
            model = genai.GenerativeModel(preferences.gemini_model or "gemini-1.5-pro-001")
            response = model.generate_content(prompt)
            reformulated_text = response.text
        else:  # Default to Ollama
            response = requests.post(
                f'{preferences.ollama_url}/api/generate',
                json={
                    "model": preferences.ollama_model or "qwen2.5:3b",
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code != 200:
                raise Exception(f"Error from Ollama API: {response.status_code}")
            reformulated_text = response.json()['response'].strip()

        # Save to history
        history = ReformulationHistory(
            original_text=data.get('text'),
            context=data.get('context', ''),
            reformulated_text=reformulated_text,
            tone=data.get('tone'),
            format=data.get('format'),
            length=data.get('length')
        )
        db.session.add(history)
        db.session.commit()

        return jsonify({"text": reformulated_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        preferences = UserPreferences.get_or_create()
        prompt = f"""<|im_start|>system
{preferences.translation_prompt.format(target_language=data.get('language', 'Anglais'))}
<|im_end|>
<|im_start|>user
{data.get('text')}
<|im_end|>
<|im_start|>assistant"""

        if preferences.current_provider == 'openai':
            client = OpenAI(api_key=preferences.openai_api_key)
            response = client.chat.completions.create(
                model=preferences.openai_model or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            translated_text = response.choices[0].message.content
        elif preferences.current_provider == 'anthropic':
            client = Anthropic(api_key=preferences.anthropic_api_key)
            response = client.messages.create(
                model=preferences.anthropic_model or "claude-3-opus-20240229",
                messages=[{"role": "user", "content": prompt}]
            )
            translated_text = response.content[0].text
        elif preferences.current_provider == 'groq':
            headers = {
                "Authorization": f"Bearer {preferences.groq_api_key}",
                "Content-Type": "application/json"
            }
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json={
                    "model": preferences.groq_model or "mixtral-8x7b-32768",
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            if response.status_code != 200:
                raise Exception(f"Error from Groq API: {response.text}")
            translated_text = response.json()["choices"][0]["message"]["content"]
        elif preferences.current_provider == 'gemini':
            genai.configure(api_key=preferences.google_api_key)
            model = genai.GenerativeModel(preferences.gemini_model or "gemini-1.5-pro-001")
            response = model.generate_content(prompt)
            translated_text = response.text
        else:  # Default to Ollama
            response = requests.post(
                f'{preferences.ollama_url}/api/generate',
                json={
                    "model": preferences.ollama_model or "qwen2.5:3b",
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code != 200:
                raise Exception(f"Error from Ollama API: {response.status_code}")
            translated_text = response.json()['response'].strip()

        return jsonify({"text": translated_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-email', methods=['POST'])
def generate_email():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        preferences = UserPreferences.get_or_create()
        prompt = f"""<|im_start|>system
{preferences.email_prompt}
<|im_end|>
<|im_start|>user
Type d'email: {data.get('type')}
Contenu et contexte: {data.get('content')}
Signature: {data.get('sender')}
<|im_end|>
<|im_start|>assistant"""

        if preferences.current_provider == 'openai':
            client = OpenAI(api_key=preferences.openai_api_key)
            response = client.chat.completions.create(
                model=preferences.openai_model or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            email_text = response.choices[0].message.content
        elif preferences.current_provider == 'anthropic':
            client = Anthropic(api_key=preferences.anthropic_api_key)
            response = client.messages.create(
                model=preferences.anthropic_model or "claude-3-opus-20240229",
                messages=[{"role": "user", "content": prompt}]
            )
            email_text = response.content[0].text
        elif preferences.current_provider == 'groq':
            headers = {
                "Authorization": f"Bearer {preferences.groq_api_key}",
                "Content-Type": "application/json"
            }
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json={
                    "model": preferences.groq_model or "mixtral-8x7b-32768",
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            if response.status_code != 200:
                raise Exception(f"Error from Groq API: {response.text}")
            email_text = response.json()["choices"][0]["message"]["content"]
        elif preferences.current_provider == 'gemini':
            genai.configure(api_key=preferences.google_api_key)
            model = genai.GenerativeModel(preferences.gemini_model or "gemini-1.5-pro-001")
            response = model.generate_content(prompt)
            email_text = response.text
        else:  # Default to Ollama
            response = requests.post(
                f'{preferences.ollama_url}/api/generate',
                json={
                    "model": preferences.ollama_model or "qwen2.5:3b",
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code != 200:
                raise Exception(f"Error from Ollama API: {response.status_code}")
            email_text = response.json()['response'].strip()

        return jsonify({"text": email_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
