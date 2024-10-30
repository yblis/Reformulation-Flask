from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import os
from requests.exceptions import ConnectionError, Timeout
from models import db, UserPreferences, ReformulationHistory

app = Flask(__name__)
app.secret_key = os.urandom(24)

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

def check_ollama_status(url=None):
    """Check if Ollama service is available"""
    test_url = url or OLLAMA_URL
    try:
        response = requests.get(f"{test_url}/api/tags", timeout=2)
        if response.status_code == 200:
            try:
                data = response.json()
                return bool(data.get('models'))
            except ValueError:
                return False
        return False
    except (ConnectionError, Timeout, Exception):
        return False

@app.route('/')
def index():
    preferences = UserPreferences.get_or_create()
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         ollama_status=check_ollama_status(),
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         history=[h.to_dict() for h in history])

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

@app.route('/api/models')
def get_models():
    url = request.args.get('url', OLLAMA_URL)
    try:
        response = requests.get(f"{url}/api/tags")
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({
                "error": "Failed to fetch models"
            }), response.status_code
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        prompt = f"""<|im_start|>system
{SYSTEM_PROMPT}
<|im_end|>
<|im_start|>user
Contexte: {data.get('context', '')}
Texte à reformuler: {data.get('text')}
Ton: {data.get('tone')}
Format: {data.get('format')}
Longueur: {data.get('length')}
<|im_end|>
<|im_start|>assistant"""

        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                "model": CURRENT_MODEL,
                "prompt": prompt,
                "stream": False
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            reformulated_text = result['response'].strip()
            
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
        else:
            return jsonify({"error": "Error calling Ollama API"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        prompt = f"""<|im_start|>system
{TRANSLATION_PROMPT.format(target_language=data.get('language', 'Anglais'))}
<|im_end|>
<|im_start|>user
{data.get('text')}
<|im_end|>
<|im_start|>assistant"""

        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                "model": CURRENT_MODEL,
                "prompt": prompt,
                "stream": False
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            return jsonify({"text": result['response'].strip()})
        else:
            return jsonify({"error": "Error calling Ollama API"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-email', methods=['POST'])
def generate_email():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        prompt = f"""<|im_start|>system
{EMAIL_PROMPT}
<|im_end|>
<|im_start|>user
Type d'email: {data.get('type')}
Contenu et contexte: {data.get('content')}
Signature: {data.get('sender')}
<|im_end|>
<|im_start|>assistant"""

        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                "model": CURRENT_MODEL,
                "prompt": prompt,
                "stream": False
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            return jsonify({"text": result['response'].strip()})
        else:
            return jsonify({"error": "Error calling Ollama API"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    global OLLAMA_URL, CURRENT_MODEL
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    preferences = UserPreferences.get_or_create()
    preferences.ollama_url = data.get('url', OLLAMA_URL).rstrip('/')
    preferences.current_model = data.get('model', CURRENT_MODEL)
    db.session.commit()

    OLLAMA_URL = preferences.ollama_url
    CURRENT_MODEL = preferences.current_model
    return jsonify({"status": "success"})

@app.route('/api/prompt', methods=['POST'])
def update_prompt():
    global SYSTEM_PROMPT
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    preferences = UserPreferences.get_or_create()
    preferences.system_prompt = data.get('prompt', SYSTEM_PROMPT)
    db.session.commit()

    SYSTEM_PROMPT = preferences.system_prompt
    return jsonify({"status": "success"})

@app.route('/api/translation_prompt', methods=['POST'])
def update_translation_prompt():
    global TRANSLATION_PROMPT
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    preferences = UserPreferences.get_or_create()
    preferences.translation_prompt = data.get('prompt', TRANSLATION_PROMPT)
    db.session.commit()

    TRANSLATION_PROMPT = preferences.translation_prompt
    return jsonify({"status": "success"})

@app.route('/api/email_prompt', methods=['POST'])
def update_email_prompt():
    global EMAIL_PROMPT
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    preferences = UserPreferences.get_or_create()
    preferences.email_prompt = data.get('prompt', EMAIL_PROMPT)
    db.session.commit()

    EMAIL_PROMPT = preferences.email_prompt
    return jsonify({"status": "success"})
