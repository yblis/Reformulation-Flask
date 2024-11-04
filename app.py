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

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    # Initialize preferences
    preferences = UserPreferences.get_or_create()

@app.route('/api/settings', methods=['GET'])
def get_settings():
    try:
        preferences = UserPreferences.get_or_create()
        return jsonify({
            'provider': preferences.current_provider,
            'settings': {
                'ollama_url': preferences.ollama_url,
                'openai_api_key': preferences.openai_api_key,
                'anthropic_api_key': preferences.anthropic_api_key,
                'google_api_key': preferences.google_api_key,
                'groq_api_key': preferences.groq_api_key,
                'system_prompt': preferences.system_prompt,
                'translation_prompt': preferences.translation_prompt,
                'email_prompt': preferences.email_prompt
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def save_settings():
    try:
        data = request.get_json()
        preferences = UserPreferences.get_or_create()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        preferences.current_provider = data.get('provider', preferences.current_provider)
        
        if 'settings' in data:
            settings = data['settings']
            if 'url' in settings:
                preferences.ollama_url = settings['url']
            if 'apiKey' in settings:
                if data['provider'] == 'openai':
                    preferences.openai_api_key = settings['apiKey']
                elif data['provider'] == 'anthropic':
                    preferences.anthropic_api_key = settings['apiKey']
                elif data['provider'] == 'groq':
                    preferences.groq_api_key = settings['apiKey']
                elif data['provider'] == 'gemini':
                    preferences.google_api_key = settings['apiKey']
            if 'model' in settings:
                if data['provider'] == 'ollama':
                    preferences.ollama_model = settings['model']
                elif data['provider'] == 'openai':
                    preferences.openai_model = settings['model']
                elif data['provider'] == 'anthropic':
                    preferences.anthropic_model = settings['model']
                elif data['provider'] == 'groq':
                    preferences.groq_model = settings['model']
                elif data['provider'] == 'gemini':
                    preferences.gemini_model = settings['model']
        
        db.session.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<provider>', methods=['GET'])
def get_models(provider):
    try:
        models = []
        if provider == 'ollama':
            url = request.args.get('url', 'http://localhost:11434')
            response = requests.get(f"{url}/api/tags")
            if response.ok:
                models = [{'id': model['name'], 'name': model['name']} for model in response.json()['models']]
        elif provider == 'openai':
            client = OpenAI()
            models = [{'id': model.id, 'name': model.id} for model in client.models.list().data if 'gpt' in model.id]
        elif provider == 'anthropic':
            models = [
                {'id': 'claude-3-opus-20240229', 'name': 'Claude 3 Opus'},
                {'id': 'claude-3-sonnet-20240229', 'name': 'Claude 3 Sonnet'},
                {'id': 'claude-2.1', 'name': 'Claude 2.1'},
                {'id': 'claude-instant-1.2', 'name': 'Claude Instant'}
            ]
        elif provider == 'groq':
            models = [
                {'id': 'mixtral-8x7b-32768', 'name': 'Mixtral 8x7B'},
                {'id': 'llama2-70b-4096', 'name': 'LLaMA2 70B'}
            ]
        elif provider == 'gemini':
            genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
            models = [
                {'id': 'gemini-pro', 'name': 'Gemini Pro'},
                {'id': 'gemini-pro-vision', 'name': 'Gemini Pro Vision'}
            ]
        
        return jsonify({'models': models})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['POST'])
def save_history():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        history = ReformulationHistory(
            type=data.get('type', 'reformulation'),
            original_text=data.get('original_text'),
            reformulated_text=data.get('reformulated_text'),
            context=data.get('context'),
            tone=data.get('tone'),
            format=data.get('format'),
            length=data.get('length'),
            target_language=data.get('target_language'),
            email_type=data.get('email_type'),
            sender_name=data.get('sender_name'),
            email_subject=data.get('email_subject')
        )
        
        db.session.add(history)
        db.session.commit()
        
        return jsonify({"status": "success", "id": history.id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history/reset', methods=['POST'])
def reset_history():
    try:
        ReformulationHistory.query.delete()
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    preferences = UserPreferences.get_or_create()
    history = ReformulationHistory.query.order_by(
        ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         history=[h.to_dict() for h in history])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
