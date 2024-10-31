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

@app.route('/api/models/openai')
def get_openai_models():
    try:
        preferences = UserPreferences.get_or_create()
        print("Fetching OpenAI models...")
        
        # First check environment variable
        api_key = os.getenv('OPENAI_API_KEY')
        print("OpenAI API key source: environment" if api_key else "OpenAI API key not found in environment")
        
        # If not in environment, use from preferences
        if not api_key:
            api_key = preferences.openai_api_key
            print("Using OpenAI API key from database")
            
        if not api_key:
            print("No OpenAI API key configured")
            return jsonify({"error": "OpenAI API key not configured"}), 401
            
        # Initialize client
        client = OpenAI(api_key=api_key)
        print("OpenAI client initialized")
        
        try:
            print("Requesting models from OpenAI API...")
            models = client.models.list()
            
            # Filter for GPT models
            gpt_models = [
                {"id": model.id, "name": model.id}
                for model in models
                if "gpt" in model.id.lower()
            ]
            print(f"Successfully retrieved {len(gpt_models)} GPT models")
            
            return jsonify({"models": gpt_models})
            
        except Exception as e:
            error_message = str(e)
            print(f"OpenAI API error: {error_message}")
            if "401" in error_message:
                return jsonify({"error": "Invalid OpenAI API key"}), 401
            return jsonify({"error": f"API request failed: {error_message}"}), 500
            
    except Exception as e:
        print(f"Error in get_openai_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def save_settings():
    try:
        print("Received settings update request")
        data = request.get_json()
        if not data:
            print("No data provided in request")
            return jsonify({"error": "No data provided"}), 400
            
        preferences = UserPreferences.get_or_create()
        provider = data.get('provider')
        settings = data.get('settings', {})
        
        print(f"Processing settings for provider: {provider}")
        
        if provider == 'openai':
            api_key = settings.get('apiKey')
            if not api_key:
                print("OpenAI API key missing in request")
                return jsonify({"error": "OpenAI API key is required"}), 400
                
            # Save API key to preferences and environment
            preferences.openai_api_key = api_key
            os.environ['OPENAI_API_KEY'] = api_key
            print('OpenAI API key saved successfully')
            
            # Save model if provided
            if 'model' in settings:
                preferences.openai_model = settings['model']
                print(f"OpenAI model updated to: {settings['model']}")
            
            # Commit changes
            db.session.commit()
            print("Database changes committed successfully")
            
            return jsonify({"message": "OpenAI settings saved successfully"})
            
        elif provider == 'anthropic':
            api_key = settings.get('apiKey')
            if not api_key:
                return jsonify({"error": "Anthropic API key is required"}), 400
            preferences.anthropic_api_key = api_key
            if 'model' in settings:
                preferences.anthropic_model = settings['model']
                
        elif provider == 'groq':
            api_key = settings.get('apiKey')
            if not api_key:
                return jsonify({"error": "Groq API key is required"}), 400
            preferences.groq_api_key = api_key
            if 'model' in settings:
                preferences.groq_model = settings['model']
                
        elif provider == 'gemini':
            api_key = settings.get('apiKey')
            if not api_key:
                return jsonify({"error": "Google API key is required"}), 400
            preferences.google_api_key = api_key
            if 'model' in settings:
                preferences.gemini_model = settings['model']
                
        elif provider == 'ollama':
            if 'url' in settings:
                preferences.ollama_url = settings['url']
            if 'model' in settings:
                preferences.ollama_model = settings['model']
        
        preferences.current_provider = provider
        db.session.commit()
        print(f"{provider} settings saved successfully")
        
        return jsonify({"message": "Settings saved successfully"})
        
    except Exception as e:
        print(f"Error saving settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/anthropic')
def get_anthropic_models():
    try:
        preferences = UserPreferences.get_or_create()
        print("Fetching Anthropic models...")
        
        # First check environment variable
        api_key = os.getenv('ANTHROPIC_API_KEY')
        print("Anthropic API key source: environment" if api_key else "Anthropic API key not found in environment")
        
        # If not in environment, use from preferences
        if not api_key:
            api_key = preferences.anthropic_api_key
            print("Using Anthropic API key from database")
            
        if not api_key:
            print("No Anthropic API key configured")
            return jsonify({"error": "Anthropic API key not configured"}), 401

        # Static list of Claude models
        models = [
            {"id": "claude-3-haiku-20240307", "name": "claude-3-haiku"},
            {"id": "claude-3-opus-20240229", "name": "claude-3-opus"},
            {"id": "claude-3-sonnet-20240229", "name": "claude-3-sonnet"},
            {"id": "claude-3-5-sonnet-20241022", "name": "claude-3.5-sonnet"}
        ]
        print(f"Retrieved {len(models)} Anthropic models")
        return jsonify({"models": models})

    except Exception as e:
        print(f"Error in get_anthropic_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/groq')
def get_groq_models():
    try:
        preferences = UserPreferences.get_or_create()
        print("Fetching Groq models...")
        
        # First check environment variable
        api_key = os.getenv('GROQ_API_KEY')
        print("Groq API key source: environment" if api_key else "Groq API key not found in environment")
        
        # If not in environment, use from preferences
        if not api_key:
            api_key = preferences.groq_api_key
            print("Using Groq API key from database")
            
        if not api_key:
            print("No Groq API key configured")
            return jsonify({"error": "Groq API key not configured"}), 401

        try:
            print("Requesting models from Groq API...")
            response = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"}
            )

            if response.status_code != 200:
                return jsonify({"error": response.text}), response.status_code

            data = response.json()
            models = [
                {"id": model["id"], "name": model["id"]}
                for model in data["data"]
            ]
            print(f"Successfully retrieved {len(models)} Groq models")
            return jsonify({"models": models})
            
        except Exception as e:
            print(f"Groq API error: {str(e)}")
            if "401" in str(e):
                return jsonify({"error": "Invalid Groq API key"}), 401
            return jsonify({"error": f"API request failed: {str(e)}"}), 500

    except Exception as e:
        print(f"Error in get_groq_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/gemini')
def get_gemini_models():
    try:
        preferences = UserPreferences.get_or_create()
        print("Fetching Gemini models...")
        
        # First check environment variable
        api_key = os.getenv('GOOGLE_API_KEY')
        print("Google API key source: environment" if api_key else "Google API key not found in environment")
        
        # If not in environment, use from preferences
        if not api_key:
            api_key = preferences.google_api_key
            print("Using Google API key from database")
            
        if not api_key:
            print("No Google API key configured")
            return jsonify({"error": "Google API key not configured"}), 401

        # Static list of Gemini models
        models = [
            {"id": "gemini-1.5-pro", "name": "gemini-1.5-pro"},
            {"id": "gemini-1.5-flash", "name": "gemini-1.5-flash"}
        ]
        print(f"Retrieved {len(models)} Gemini models")
        return jsonify({"models": models})

    except Exception as e:
        print(f"Error in get_gemini_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/ollama')
def get_ollama_models():
    try:
        preferences = UserPreferences.get_or_create()
        print("Fetching Ollama models...")
        url = request.args.get('url', preferences.ollama_url)
        print(f"Using Ollama URL: {url}")

        try:
            print("Requesting models from Ollama API...")
            response = requests.get(f"{url}/api/tags", timeout=5)
            
            if response.status_code != 200:
                print("Failed to fetch Ollama models")
                return jsonify({"error": "Failed to fetch Ollama models"}), response.status_code

            data = response.json()
            models = [
                {"id": model["name"], "name": model["name"]}
                for model in data["models"]
            ]
            print(f"Successfully retrieved {len(models)} Ollama models")
            return jsonify({"models": models})
            
        except requests.exceptions.RequestException as e:
            print(f"Ollama API error: {str(e)}")
            return jsonify({"error": f"Connection error: {str(e)}"}), 500

    except Exception as e:
        print(f"Error in get_ollama_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/status')
def get_status():
    try:
        url = request.args.get('url', preferences.ollama_url)
        response = requests.get(f"{url}/api/tags", timeout=5)
        return jsonify({"status": "connected" if response.status_code == 200 else "disconnected"})
    except:
        return jsonify({"status": "disconnected"})

@app.route('/')
def index():
    preferences = UserPreferences.get_or_create()
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         history=[h.to_dict() for h in history])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
