from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
from requests.exceptions import ConnectionError, Timeout
from models import db, UserPreferences, ReformulationHistory
import openai
from openai import OpenAI
import anthropic
from anthropic import Anthropic
import google.generativeai as genai

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reformulator.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    preferences = UserPreferences.get_or_create()

def reload_env_config():
    # Force reload environment variables
    load_dotenv(override=True)
    
    # Get current preferences
    preferences = UserPreferences.get_or_create()
    
    # Update preferences with environment variables
    preferences.ollama_url = os.getenv('OLLAMA_URL', preferences.ollama_url)
    preferences.openai_api_key = os.getenv('OPENAI_API_KEY', preferences.openai_api_key)
    preferences.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY', preferences.anthropic_api_key)
    preferences.google_api_key = os.getenv('GOOGLE_API_KEY', preferences.google_api_key)
    preferences.groq_api_key = os.getenv('GROQ_API_KEY', preferences.groq_api_key)
    
    # Save changes to database
    db.session.commit()
    return preferences

@app.before_request
def before_request():
    reload_env_config()

@app.errorhandler(404)
@app.errorhandler(500)
def handle_error(error):
    return jsonify({
        "error": str(error),
        "status": error.code
    }), error.code

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
        
        # Always return connected if not using Ollama
        if provider != 'ollama':
            return jsonify({"status": "connected"})
            
        url = request.args.get('url', preferences.ollama_url)
        if not url:
            return jsonify({"status": "disconnected"})
            
        try:
            response = requests.get(f"{url}/api/version", timeout=5)
            if response.status_code == 200:
                return jsonify({"status": "connected"})
            return jsonify({"status": "disconnected"})
            
        except requests.exceptions.RequestException:
            return jsonify({"status": "disconnected"})
            
    except Exception as e:
        print(f"Error checking status: {str(e)}")
        return jsonify({"status": "disconnected"})

@app.route('/api/models/gemini')
def get_gemini_models():
    try:
        preferences = reload_env_config()
        if not preferences.google_api_key:
            return jsonify({"error": "Google API key not configured"}), 401
            
        try:
            genai.configure(api_key=preferences.google_api_key)
            
            # Return the list of Gemini models
            models = [
                {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro"},
                {"id": "gemini-1.5-pro-latest", "name": "Gemini 1.5 Pro Latest"},
                {"id": "gemini-pro", "name": "Gemini 1.0 Pro"},
                {"id": "gemini-pro-vision", "name": "Gemini Pro Vision"}
            ]
            
            return jsonify({"models": models})
            
        except Exception as e:
            print(f"Error in get_gemini_models: {str(e)}")
            return jsonify({"error": f"Gemini API error: {str(e)}"}), 500
            
    except Exception as e:
        print(f"Error in get_gemini_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/anthropic')
def get_anthropic_models():
    try:
        preferences = reload_env_config()
        if not preferences.anthropic_api_key:
            return jsonify({"error": "Anthropic API key not configured"}), 401
            
        try:
            # Validate the API key by creating a client
            client = Anthropic(api_key=preferences.anthropic_api_key)
            
            # Return the list of supported Claude models
            models = [
                {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
                {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
                {"id": "claude-2.1", "name": "Claude 2.1"},
                {"id": "claude-2.0", "name": "Claude 2.0"}
            ]
            
            return jsonify({"models": models})
            
        except Exception as e:
            print(f"Error in get_anthropic_models: {str(e)}")
            return jsonify({"error": f"Anthropic API error: {str(e)}"}), 500
            
    except Exception as e:
        print(f"Error in get_anthropic_models: {str(e)}")
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
                headers={"Authorization": f"Bearer {preferences.groq_api_key}"}
            )
            
            if response.status_code != 200:
                return jsonify({"error": response.text}), response.status_code
                
            data = response.json()
            return jsonify({
                "models": [{"id": model["id"], "name": model["id"]} 
                    for model in data["data"]
                ]
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
            return jsonify({"error": "OpenAI API key not configured"}), 401
            
        try:
            # Validate the API key by creating a client
            client = OpenAI(api_key=preferences.openai_api_key)
            
            # Return the list of supported GPT models
            models = [
                {"id": "gpt-4-turbo-preview", "name": "GPT-4 Turbo"},
                {"id": "gpt-4", "name": "GPT-4"},
                {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"}
            ]
            
            return jsonify({"models": models})
            
        except Exception as e:
            print(f"Error in get_openai_models: {str(e)}")
            return jsonify({"error": f"OpenAI API error: {str(e)}"}), 500
            
    except Exception as e:
        print(f"Error in get_openai_models: {str(e)}")
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
            models = [{"id": model["name"], "name": model["name"]} for model in data["models"]]
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
