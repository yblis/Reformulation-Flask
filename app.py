from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import os
from requests.exceptions import ConnectionError, Timeout
from models import db, UserPreferences

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
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
    return render_template('index.html',
                         ollama_status=check_ollama_status(),
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt)

@app.route('/api/status')
def check_status():
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
            return jsonify(response.json())
        else:
            return jsonify({
                "error": "Failed to fetch models"
            }), response.status_code
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

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