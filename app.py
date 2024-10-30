from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import os
from requests.exceptions import ConnectionError, Timeout
from models import db, UserPreferences, ReformulationHistory
import openai
import asyncio
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.urandom(24)

@app.template_filter('datetime')
def format_datetime(value):
    if not value:
        return ''
    return value.strftime('%d/%m/%Y %H:%M')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reformulator.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    preferences = UserPreferences.get_or_create()
    OLLAMA_URL = preferences.ollama_url
    CURRENT_MODEL = preferences.current_model
    SYSTEM_PROMPT = preferences.system_prompt
    TRANSLATION_PROMPT = preferences.translation_prompt
    EMAIL_PROMPT = preferences.email_prompt
    USE_OPENAI = preferences.use_openai
    OPENAI_MODEL = preferences.openai_model
    if preferences.openai_api_key:
        openai.api_key = preferences.openai_api_key

def check_ollama_status(url=None):
    """Check if Ollama service is available"""
    if USE_OPENAI:
        return openai.api_key is not None
    test_url = url or OLLAMA_URL
    try:
        response = requests.get(f"{test_url}/api/tags", timeout=2)
        return response.status_code == 200
    except (ConnectionError, Timeout):
        return False
    except Exception:
        return False

@app.route('/')
def index():
    preferences = UserPreferences.get_or_create()
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         ollama_url=preferences.ollama_url,
                         ollama_status=check_ollama_status(),
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         use_openai=preferences.use_openai,
                         openai_model=preferences.openai_model,
                         history=history)

@app.route('/api/status')
def check_status():
    if USE_OPENAI:
        return jsonify({"status": "connected" if openai.api_key else "disconnected"})
    url = request.args.get('url')
    status = check_ollama_status(url)
    return jsonify({
        "status": "connected" if status else "disconnected"
    })

@app.route('/api/models')
def get_models():
    url = request.args.get('url', OLLAMA_URL)
    try:
        response = requests.get(f"{url}/api/tags")
        if response.status_code == 200:
            data = response.json()
            return jsonify({"models": data.get('models', [])})
        return jsonify({"error": "Failed to fetch models"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/openai_models', methods=['GET'])
def get_openai_models():
    try:
        if not openai.api_key:
            return jsonify({"error": "OpenAI API key not configured"}), 400
            
        models = [
            {"id": "gpt-4", "name": "GPT-4"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"},
            {"id": "gpt-3.5-turbo-16k", "name": "GPT-3.5 Turbo 16K"}
        ]
        return jsonify({"models": models})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    global OLLAMA_URL, CURRENT_MODEL, USE_OPENAI, OPENAI_MODEL
    data = request.get_json()
    if data is None:
        return jsonify({
            "error": "Le corps de la requête est invalide ou manquant."
        }), 400

    try:
        preferences = UserPreferences.get_or_create()
        
        # Update OpenAI settings
        preferences.use_openai = data.get('use_openai', False)
        if preferences.use_openai:
            if 'openai_api_key' in data and data['openai_api_key']:
                # Validate API key format
                if not data['openai_api_key'].startswith('sk-'):
                    return jsonify({"error": "Invalid OpenAI API key format"}), 400
                preferences.openai_api_key = data['openai_api_key']
                openai.api_key = data['openai_api_key']
            preferences.openai_model = data.get('openai_model', OPENAI_MODEL)
        
        # Update Ollama settings
        if not preferences.use_openai:
            preferences.ollama_url = data.get('url', OLLAMA_URL).rstrip('/')
            preferences.current_model = data.get('model', CURRENT_MODEL)
        
        db.session.commit()

        # Update global variables
        OLLAMA_URL = preferences.ollama_url
        CURRENT_MODEL = preferences.current_model
        USE_OPENAI = preferences.use_openai
        OPENAI_MODEL = preferences.openai_model
        
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

async def generate_with_openai(prompt):
    """Generate text using OpenAI API with proper error handling"""
    if not openai.api_key:
        raise Exception("OpenAI API key not configured")
    
    try:
        completion = await openai.ChatCompletion.acreate(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": SYSTEM_PROMPT},
                     {"role": "user", "content": prompt}],
            timeout=30
        )
        return completion.choices[0].message.content
    except openai.error.AuthenticationError:
        raise Exception("Invalid OpenAI API key")
    except openai.error.RateLimitError:
        raise Exception("OpenAI API rate limit exceeded")
    except openai.error.Timeout:
        raise Exception("OpenAI API request timed out")
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")

async def generate_with_ollama(prompt):
    """Generate text using Ollama with error handling"""
    try:
        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                "model": CURRENT_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['response'].strip()
        else:
            raise Exception("Error calling Ollama API")
    except requests.exceptions.Timeout:
        raise Exception("Ollama API request timed out")
    except Exception as e:
        raise Exception(f"Ollama error: {str(e)}")

@app.route('/api/reformulate', methods=['POST'])
async def reformulate():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        prompt = f"""Context: {data.get('context', '')}
Text to reformulate: {data.get('text')}
Tone: {data.get('tone')}
Format: {data.get('format')}
Length: {data.get('length')}"""

        # Try OpenAI first if enabled
        if USE_OPENAI and openai.api_key:
            try:
                reformulated_text = await generate_with_openai(prompt)
            except Exception as e:
                # Fallback to Ollama if OpenAI fails
                if check_ollama_status():
                    reformulated_text = await generate_with_ollama(prompt)
                else:
                    raise Exception(f"Both OpenAI and Ollama failed: {str(e)}")
        else:
            reformulated_text = await generate_with_ollama(prompt)
        
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
