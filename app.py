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

@app.errorhandler(404)
@app.errorhandler(500)
def handle_error(error):
    return jsonify({
        "error": str(error),
        "status": error.code
    }), error.code

@app.route('/api/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        text = data.get('text')
        target_language = data.get('language')
        
        if not text or not target_language:
            return jsonify({"error": "Missing text or target language"}), 400
            
        preferences = UserPreferences.get_or_create()
        provider = preferences.current_provider
        
        # Use the configured AI provider to translate
        if provider == 'groq':
            if not preferences.groq_api_key:
                return jsonify({"error": "Groq API key not configured"}), 401
                
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {preferences.groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": preferences.groq_model or "mixtral-8x7b-32768",
                    "messages": [
                        {
                            "role": "system",
                            "content": preferences.translation_prompt.format(target_language=target_language)
                        },
                        {
                            "role": "user",
                            "content": text
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                return jsonify({"error": response.text}), response.status_code
                
            response_data = response.json()
            translated_text = response_data['choices'][0]['message']['content']
            return jsonify({"text": translated_text})
            
        return jsonify({"error": "Unsupported provider"}), 400
        
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/status')
def check_status():
    try:
        preferences = UserPreferences.get_or_create()
        url = request.args.get('url', preferences.ollama_url)
        
        if preferences.current_provider == 'ollama':
            try:
                response = requests.get(f"{url}/api/version", timeout=5)
                if response.status_code == 200:
                    return jsonify({"status": "connected"})
            except:
                pass
            return jsonify({"status": "disconnected"})
        else:
            return jsonify({"status": "connected"})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/<provider>')
def get_provider_models(provider):
    try:
        preferences = UserPreferences.get_or_create()
        
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
            if not preferences.anthropic_api_key:
                return jsonify({"error": "Anthropic API key not configured"}), 401
                
            models = [
                {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
                {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"}
            ]
            return jsonify({"models": models})
                
        elif provider == 'groq':
            if not preferences.groq_api_key:
                return jsonify({"error": "Groq API key not configured"}), 401
                
            response = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={
                    "Authorization": f"Bearer {preferences.groq_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                return jsonify({"error": response.text}), response.status_code
                
            data = response.json()
            return jsonify({
                "models": [
                    {"id": model["id"], "name": model["id"]}
                    for model in data["data"]
                ]
            })
                
        elif provider == 'gemini':
            if not preferences.google_api_key:
                return jsonify({"error": "Google API key not configured"}), 401
                
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
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    preferences = UserPreferences.get_or_create()
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         history=[h.to_dict() for h in history])

@app.route('/api/settings', methods=['POST'])
def update_settings():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"error": "Invalid request: No JSON data"}), 400

        preferences = UserPreferences.get_or_create()
        preferences.current_provider = data.get('provider', 'ollama')
        
        settings = data.get('settings', {})
        
        if preferences.current_provider == 'groq':
            api_key = settings.get('apiKey')
            if not api_key:
                return jsonify({"error": "Groq API key is required"}), 400
                
            preferences.groq_api_key = api_key
        elif preferences.current_provider == 'ollama':
            preferences.ollama_url = settings.get('url', preferences.ollama_url)
            preferences.ollama_model = settings.get('model', preferences.ollama_model)
        elif preferences.current_provider == 'openai':
            if api_key := settings.get('apiKey'):
                preferences.openai_api_key = api_key
            if model := settings.get('model'):
                preferences.openai_model = model
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
