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

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reformulator.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    preferences = UserPreferences.get_or_create()

@app.errorhandler(404)
@app.errorhandler(500)
def handle_error(error):
    return jsonify({"error": str(error), "status": error.code}), error.code

@app.route('/api/models/openai')
def get_openai_models():
    try:
        preferences = UserPreferences.get_or_create()
        
        # Use API key from preferences or environment
        api_key = os.getenv('OPENAI_API_KEY', preferences.openai_api_key)
        if not api_key:
            return jsonify({"error": "OpenAI API key not configured"}), 401
            
        # Use the exact headers format
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        # Make request to OpenAI API
        response = requests.get("https://api.openai.com/v1/models", headers=headers)
        
        if response.status_code != 200:
            return jsonify({"error": response.text}), response.status_code
            
        data = response.json()
        gpt_models = []
        
        # Filter only GPT models
        for model in data["data"]:
            if "gpt" in model["id"]:
                gpt_models.append({
                    "id": model["id"],
                    "name": model["id"]
                })
                
        return jsonify({"models": gpt_models})
        
    except Exception as e:
        print(f"Error in get_openai_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/anthropic')
def get_anthropic_models():
    try:
        preferences = UserPreferences.get_or_create()
        api_key = os.getenv('ANTHROPIC_API_KEY', preferences.anthropic_api_key)
        if not api_key:
            return jsonify({"error": "Anthropic API key not configured"}), 401

        models = [
            {"id": "claude-3-haiku-20240307", "name": "claude-3-haiku"},
            {"id": "claude-3-opus-20240229", "name": "claude-3-opus"},
            {"id": "claude-3-sonnet-20240229", "name": "claude-3-sonnet"}
        ]

        return jsonify({"models": models})

    except Exception as e:
        print(f"Error in get_anthropic_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/groq')
def get_groq_models():
    try:
        preferences = UserPreferences.get_or_create()
        api_key = os.getenv('GROQ_API_KEY', preferences.groq_api_key)
        if not api_key:
            return jsonify({"error": "Groq API key not configured"}), 401

        response = requests.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"}
        )

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
        print(f"Error in get_groq_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/gemini')
def get_gemini_models():
    try:
        preferences = UserPreferences.get_or_create()
        api_key = os.getenv('GOOGLE_API_KEY', preferences.google_api_key)
        if not api_key:
            return jsonify({"error": "Google API key not configured"}), 401

        models = [
            {"id": "gemini-1.5-pro", "name": "gemini-1.5-pro"},
            {"id": "gemini-1.5-flash", "name": "gemini-1.5-flash"}
        ]
        return jsonify({"models": models})

    except Exception as e:
        print(f"Error in get_gemini_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/ollama')
def get_ollama_models():
    try:
        preferences = UserPreferences.get_or_create()
        url = request.args.get('url', preferences.ollama_url)
        
        try:
            response = requests.get(f"{url}/api/tags")
            if response.status_code != 200:
                return jsonify({"error": "Failed to fetch Ollama models"}), response.status_code

            data = response.json()
            return jsonify({
                "models": [{
                    "id": model["name"],
                    "name": model["name"]
                } for model in data["models"]]
            })
        except requests.exceptions.RequestException as e:
            return jsonify({"error": f"Failed to fetch Ollama models: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    try:
        preferences = UserPreferences.get_or_create()
        history = ReformulationHistory.query.order_by(
            ReformulationHistory.created_at.desc()).limit(10).all()
        return render_template('index.html',
                           system_prompt=preferences.system_prompt,
                           translation_prompt=preferences.translation_prompt,
                           email_prompt=preferences.email_prompt,
                           history=[h.to_dict() for h in history])
    except Exception as e:
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
            except requests.exceptions.RequestException as e:
                return jsonify({"status": "disconnected", "error": str(e)})
            return jsonify({"status": "disconnected"})
        else:
            return jsonify({"status": "connected"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
            if model := settings.get('model'):
                preferences.groq_model = model
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
