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

def check_ollama_status(url=None):
    """Check if Ollama service is available"""
    test_url = url or preferences.ollama_url
    try:
        response = requests.get(f"{test_url}/api/tags", timeout=5)
        if response.status_code == 200:
            try:
                data = response.json()
                return bool(data.get('models'))
            except ValueError:
                return False
        return False
    except (ConnectionError, Timeout, Exception):
        return False

def generate_text_openai(prompt):
    preferences = UserPreferences.get_or_create()
    if not preferences.openai_api_key:
        raise Exception("OpenAI API key not configured")
    client = OpenAI(api_key=preferences.openai_api_key)
    response = client.chat.completions.create(
        model=preferences.openai_model or "gpt-3.5-turbo",
        messages=[{"role": "system", "content": prompt}]
    )
    return response.choices[0].message.content

def generate_text_anthropic(prompt):
    preferences = UserPreferences.get_or_create()
    if not preferences.anthropic_api_key:
        raise Exception("Anthropic API key not configured")
    client = Anthropic(api_key=preferences.anthropic_api_key)
    response = client.messages.create(
        model=preferences.anthropic_model or "claude-3-opus-20240229",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

def generate_text_groq(prompt):
    preferences = UserPreferences.get_or_create()
    if not preferences.groq_api_key:
        raise Exception("Groq API key not configured")
    headers = {
        "Authorization": f"Bearer {preferences.groq_api_key}",
        "Content-Type": "application/json"
    }
    response = requests.post(
        "https://api.groq.com/v1/chat/completions",
        headers=headers,
        json={
            "model": preferences.groq_model or "mixtral-8x7b-32768",
            "messages": [{"role": "user", "content": prompt}]
        }
    )
    if response.status_code != 200:
        raise Exception(f"Error from Groq API: {response.text}")
    return response.json()["choices"][0]["message"]["content"]

def generate_text_gemini(prompt):
    preferences = UserPreferences.get_or_create()
    if not preferences.google_api_key:
        raise Exception("Google API key not configured")
    genai.configure(api_key=preferences.google_api_key)
    model = genai.GenerativeModel(preferences.gemini_model or "gemini-pro")
    response = model.generate_content(prompt)
    return response.text

def generate_text_ollama(prompt):
    preferences = UserPreferences.get_or_create()
    try:
        response = requests.post(
            f'{preferences.ollama_url}/api/generate',
            json={
                "model": preferences.ollama_model or "llama2",
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        if response.status_code == 200:
            return response.json()['response'].strip()
        raise Exception(f"Ollama API error: {response.status_code}")
    except (requests.exceptions.RequestException, Exception) as e:
        raise Exception(f"Error calling Ollama API: {str(e)}")

def generate_text(prompt):
    preferences = UserPreferences.get_or_create()
    provider = preferences.current_provider

    try:
        if provider == 'openai':
            return generate_text_openai(prompt)
        elif provider == 'anthropic':
            return generate_text_anthropic(prompt)
        elif provider == 'groq':
            return generate_text_groq(prompt)
        elif provider == 'gemini':
            return generate_text_gemini(prompt)
        else:  # Default to Ollama
            return generate_text_ollama(prompt)
    except Exception as e:
        raise Exception(f"Error generating text with {provider}: {str(e)}")

@app.route('/')
def index():
    """Main route to serve the index page"""
    preferences = UserPreferences.get_or_create()
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         ollama_status=check_ollama_status(),
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         history=[h.to_dict() for h in history])

@app.route('/api/models/<provider>')
def get_provider_models(provider):
    preferences = UserPreferences.get_or_create()
    
    try:
        if provider == 'openai':
            try:
                if not preferences.openai_api_key:
                    return jsonify({"error": "OpenAI API key not configured"}), 401
                    
                headers = {
                    "Authorization": f"Bearer {preferences.openai_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = requests.get(
                    "https://api.openai.com/v1/models",
                    headers=headers
                )
                
                if response.status_code != 200:
                    return jsonify({"error": f"OpenAI API error: {response.text}"}), response.status_code
                    
                models = response.json()
                return jsonify({
                    "models": [
                        {
                            "id": model["id"],
                            "name": model.get("name", model["id"])
                        }
                        for model in models["data"]
                        if "gpt" in model["id"]
                    ]
                })
            except Exception as e:
                return jsonify({"error": str(e)}), 500
                
        elif provider == 'anthropic':
            models = [
                {"id": "claude-3-haiku-20240307", "name": "claude-3-haiku"},
                {"id": "claude-3-opus-20240229", "name": "claude-3-opus"},
                {"id": "claude-3-sonnet-20240229", "name": "claude-3-sonnet"},
                {"id": "claude-3-5-sonnet-20241022", "name": "claude-3.5-sonnet"}
            ]
            return jsonify({"models": models})
                
        elif provider == 'groq':
            try:
                if not preferences.groq_api_key:
                    return jsonify({"error": "Groq API key not configured"}), 401
                    
                headers = {
                    "Authorization": f"Bearer {preferences.groq_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = requests.get(
                    "https://api.groq.com/openai/v1/models",
                    headers=headers
                )
                
                if response.status_code != 200:
                    return jsonify({"error": f"Groq API error: {response.text}"}), response.status_code
                    
                models = response.json()
                return jsonify({
                    "models": [
                        {
                            "id": model["id"],
                            "name": model.get("name", model["id"])
                        }
                        for model in models["data"]
                    ]
                })
            except Exception as e:
                return jsonify({"error": str(e)}), 500
            
        elif provider == 'gemini':
            models = [
                {"id": "gemini-1.5-pro-001", "name": "Gemini 1.5 Pro"},
                {"id": "gemini-1.5-flash-001", "name": "Gemini 1.5 Flash"},
                {"id": "gemini-pro-experimental", "name": "Gemini 1.5 Pro Experimental"},
                {"id": "gemini-flash-experimental", "name": "Gemini 1.5 Flash Experimental"}
            ]
            return jsonify({"models": models})
                
        elif provider == 'ollama':
            url = request.args.get('url', preferences.ollama_url)
            try:
                response = requests.get(f"{url}/api/tags", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    return jsonify({"models": [{"id": model["name"], "name": model["name"]} for model in data.get("models", [])]})
                return jsonify({"error": f"Failed to fetch models: HTTP {response.status_code}"}), response.status_code
            except requests.exceptions.RequestException as e:
                return jsonify({"error": f"Connection error: {str(e)}"}), 500
        
        return jsonify({"error": "Invalid provider"}), 400
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/status')
def check_status():
    url = request.args.get('url')
    status = check_ollama_status(url)
    return jsonify({
        "status": "connected" if status else "disconnected"
    })

@app.route('/api/history')
def get_history():
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return jsonify([h.to_dict() for h in history])

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

        reformulated_text = generate_text(prompt)
            
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

        translated_text = generate_text(prompt)
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

        email_text = generate_text(prompt)
        return jsonify({"text": email_text})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Invalid request body",
            "error": "INVALID_REQUEST"
        }), 400

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
            preferences.openai_model = settings.get('model', preferences.openai_model)
        elif preferences.current_provider == 'groq':
            if api_key := settings.get('apiKey'):
                preferences.groq_api_key = api_key
            preferences.groq_model = settings.get('model', preferences.groq_model)
        elif preferences.current_provider == 'anthropic':
            if api_key := settings.get('apiKey'):
                preferences.anthropic_api_key = api_key
            preferences.anthropic_model = settings.get('model', preferences.anthropic_model)
        elif preferences.current_provider == 'gemini':
            if api_key := settings.get('apiKey'):
                preferences.google_api_key = api_key
            preferences.gemini_model = settings.get('model', preferences.gemini_model)
        
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/prompt', methods=['POST'])
def update_prompt():
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    preferences = UserPreferences.get_or_create()
    preferences.system_prompt = data.get('prompt', preferences.system_prompt)
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/api/translation_prompt', methods=['POST'])
def update_translation_prompt():
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    preferences = UserPreferences.get_or_create()
    preferences.translation_prompt = data.get('prompt', preferences.translation_prompt)
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/api/email_prompt', methods=['POST'])
def update_email_prompt():
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    preferences = UserPreferences.get_or_create()
    preferences.email_prompt = data.get('prompt', preferences.email_prompt)
    db.session.commit()
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
