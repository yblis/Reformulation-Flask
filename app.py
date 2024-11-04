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

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    try:
        ReformulationHistory.query.delete()
        db.session.commit()
        return jsonify({"message": "History cleared successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/')
def index():
    preferences = reload_env_config()
    history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).limit(10).all()
    return render_template('index.html',
                         system_prompt=preferences.system_prompt,
                         translation_prompt=preferences.translation_prompt,
                         email_prompt=preferences.email_prompt,
                         history=[h.to_dict() for h in history])

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        preferences = reload_env_config()
        provider = preferences.current_provider
        
        text = data.get('text')
        context = data.get('context', '')
        tone = data.get('tone', 'Professional')
        format = data.get('format', 'Paragraph')
        length = data.get('length', 'Medium')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        formatted_prompt = f"Context: {context}\nText: {text}\nTone: {tone}\nFormat: {format}\nLength: {length}"
        
        try:
            response_text = None
            
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': preferences.system_prompt,
                        'stream': False
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')

            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": preferences.system_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content

            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.system_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text

            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": preferences.system_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content

            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [preferences.system_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if not response_text:
                raise Exception(f"No response from {provider}")

            # Save to history
            history = ReformulationHistory(
                original_text=text,
                context=context,
                reformulated_text=response_text,
                tone=tone,
                format=format,
                length=length
            )
            db.session.add(history)
            db.session.commit()

            return jsonify({"text": response_text})

        except Exception as e:
            return jsonify({"error": f"Error reformulating text: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        preferences = reload_env_config()
        provider = preferences.current_provider
        
        text = data.get('text')
        target_language = data.get('language')
        
        if not text or not target_language:
            return jsonify({"error": "Text and target language are required"}), 400
            
        translation_prompt = preferences.translation_prompt.format(target_language=target_language)
        formatted_prompt = f"Text: {text}"
        
        try:
            response_text = None
            
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': translation_prompt,
                        'stream': False
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')

            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": translation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content

            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=translation_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text

            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": translation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content

            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [translation_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if not response_text:
                raise Exception(f"No response from {provider}")

            return jsonify({"text": response_text})

        except Exception as e:
            return jsonify({"error": f"Translation error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-email', methods=['POST'])
def generate_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        preferences = reload_env_config()
        provider = preferences.current_provider

        email_type = data.get('type')
        content = data.get('content')
        sender = data.get('sender', '')

        if not email_type or not content:
            return jsonify({"error": "Email type and content are required"}), 400

        formatted_prompt = f"Type: {email_type}\nContent: {content}\nSignature: {sender}"
        
        try:
            response_text = None
            
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': preferences.email_prompt,
                        'stream': False
                    }
                )
                if response.status_code == 200:
                    response_text = response.json().get('response', '')

            elif provider == 'openai':
                client = OpenAI(api_key=preferences.openai_api_key)
                response = client.chat.completions.create(
                    model=preferences.openai_model,
                    messages=[
                        {"role": "system", "content": preferences.email_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content

            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.email_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text

            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": preferences.email_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content

            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [preferences.email_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if not response_text:
                raise Exception(f"No response from {provider}")

            return jsonify({"text": response_text})

        except Exception as e:
            return jsonify({"error": f"Error generating email: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500
