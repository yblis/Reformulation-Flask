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
        
        if provider == 'ollama':
            try:
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        "model": preferences.ollama_model,
                        "prompt": preferences.translation_prompt.format(target_language=target_language) + "\n\n" + text,
                        "stream": False
                    },
                    timeout=30
                )
                
                if response.status_code != 200:
                    return jsonify({"error": "Ollama API error"}), response.status_code
                    
                data = response.json()
                return jsonify({"text": data['response']})
                
            except requests.exceptions.RequestException as e:
                return jsonify({"error": f"Connection error: {str(e)}"}), 500
                
        elif provider == 'groq':
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

        elif provider == 'gemini':
            if not preferences.google_api_key:
                return jsonify({"error": "Google API key not configured"}), 401
                
            try:
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model or "gemini-1.5-flash")
                
                prompt = preferences.translation_prompt.format(target_language=target_language) + "\n\n" + text
                response = model.generate_content(prompt)
                
                return jsonify({"text": response.text})
                
            except Exception as e:
                return jsonify({"error": f"Gemini API error: {str(e)}"}), 500

        elif provider == 'anthropic':
            if not preferences.anthropic_api_key:
                return jsonify({"error": "Anthropic API key not configured"}), 401

            headers = {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': preferences.anthropic_api_key
            }

            try:
                client = Anthropic(api_key=preferences.anthropic_api_key)
                response = client.messages.create(
                    model=preferences.anthropic_model or "claude-3-haiku-20240307",
                    system=preferences.translation_prompt.format(target_language=target_language),
                    messages=[{"role": "user", "content": text}],
                    max_tokens=2000
                )
                return jsonify({"text": response.content[0].text})
            except Exception as e:
                return jsonify({"error": f"Anthropic API error: {str(e)}"}), 500
            
        return jsonify({"error": "Unsupported provider"}), 400
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        text = data.get('text')
        context = data.get('context', '')
        tone = data.get('tone')
        format = data.get('format')
        length = data.get('length')
        
        if not all([text, tone, format, length]):
            return jsonify({"error": "Missing required parameters"}), 400
            
        preferences = UserPreferences.get_or_create()
        provider = preferences.current_provider
        
        if provider == 'groq':
            if not preferences.groq_api_key:
                return jsonify({"error": "Groq API key not configured"}), 401
                
            prompt = preferences.system_prompt
            if context:
                prompt += f"\n\nContexte ou email reçu:\n{context}"
                
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
                            "content": prompt
                        },
                        {
                            "role": "user",
                            "content": f"Ton: {tone}\nFormat: {format}\nLongueur: {length}\n\nTexte à reformuler:\n{text}"
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                return jsonify({"error": response.text}), response.status_code
                
            response_data = response.json()
            reformulated_text = response_data['choices'][0]['message']['content']
            
            history = ReformulationHistory(
                original_text=text,
                context=context,
                reformulated_text=reformulated_text,
                tone=tone,
                format=format,
                length=length
            )
            db.session.add(history)
            db.session.commit()
            
            return jsonify({"text": reformulated_text})
            
        elif provider == 'ollama':
            if not preferences.ollama_url:
                return jsonify({"error": "Ollama URL not configured"}), 401
                
            prompt = preferences.system_prompt
            if context:
                prompt += f"\n\nContexte ou email reçu:\n{context}"
                
            response = requests.post(
                f"{preferences.ollama_url}/api/generate",
                json={
                    "model": preferences.ollama_model,
                    "prompt": f"{prompt}\n\nTon: {tone}\nFormat: {format}\nLongueur: {length}\n\nTexte à reformuler:\n{text}",
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code != 200:
                return jsonify({"error": "Ollama API error"}), response.status_code
                
            data = response.json()
            reformulated_text = data['response']
            
            history = ReformulationHistory(
                original_text=text,
                context=context,
                reformulated_text=reformulated_text,
                tone=tone,
                format=format,
                length=length
            )
            db.session.add(history)
            db.session.commit()
            
            return jsonify({"text": reformulated_text})

        elif provider == 'gemini':
            if not preferences.google_api_key:
                return jsonify({"error": "Google API key not configured"}), 401
                
            try:
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model or "gemini-1.5-flash")
                
                prompt = preferences.system_prompt
                if context:
                    prompt += f"\n\nContexte ou email reçu:\n{context}"
                    
                user_prompt = f"Ton: {tone}\nFormat: {format}\nLongueur: {length}\n\nTexte à reformuler:\n{text}"
                full_prompt = prompt + "\n\n" + user_prompt
                
                response = model.generate_content(full_prompt)
                reformulated_text = response.text
                
                history = ReformulationHistory(
                    original_text=text,
                    context=context,
                    reformulated_text=reformulated_text,
                    tone=tone,
                    format=format,
                    length=length
                )
                db.session.add(history)
                db.session.commit()
                
                return jsonify({"text": reformulated_text})
                
            except Exception as e:
                return jsonify({"error": f"Gemini API error: {str(e)}"}), 500

        elif provider == 'anthropic':
            if not preferences.anthropic_api_key:
                return jsonify({"error": "Anthropic API key not configured"}), 401

            prompt = preferences.system_prompt
            if context:
                prompt += f"\n\nContexte ou email reçu:\n{context}"

            try:
                client = Anthropic(api_key=preferences.anthropic_api_key)
                response = client.messages.create(
                    model=preferences.anthropic_model or "claude-3-haiku-20240307",
                    system=prompt,
                    messages=[{
                        "role": "user",
                        "content": f"Ton: {tone}\nFormat: {format}\nLongueur: {length}\n\nTexte à reformuler:\n{text}"
                    }],
                    max_tokens=2000
                )
                reformulated_text = response.content[0].text

                history = ReformulationHistory(
                    original_text=text,
                    context=context,
                    reformulated_text=reformulated_text,
                    tone=tone,
                    format=format,
                    length=length
                )
                db.session.add(history)
                db.session.commit()

                return jsonify({"text": reformulated_text})
            except Exception as e:
                return jsonify({"error": f"Anthropic API error: {str(e)}"}), 500
            
        return jsonify({"error": "Unsupported provider"}), 400
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-email', methods=['POST'])
def generate_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        email_type = data.get('type')
        content = data.get('content')
        sender = data.get('sender', '')
        
        if not all([email_type, content]):
            return jsonify({"error": "Missing required parameters"}), 400
            
        preferences = UserPreferences.get_or_create()
        provider = preferences.current_provider
        
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
                            "content": preferences.email_prompt
                        },
                        {
                            "role": "user",
                            "content": f"Type d'email: {email_type}\n\nContenu et contexte:\n{content}\n\nSignature: {sender}"
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                return jsonify({"error": response.text}), response.status_code
                
            response_data = response.json()
            email_text = response_data['choices'][0]['message']['content']
            return jsonify({"text": email_text})
            
        elif provider == 'ollama':
            if not preferences.ollama_url:
                return jsonify({"error": "Ollama URL not configured"}), 401
                
            response = requests.post(
                f"{preferences.ollama_url}/api/generate",
                json={
                    "model": preferences.ollama_model,
                    "prompt": f"{preferences.email_prompt}\n\nType d'email: {email_type}\n\nContenu et contexte:\n{content}\n\nSignature: {sender}",
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code != 200:
                return jsonify({"error": "Ollama API error"}), response.status_code
                
            data = response.json()
            return jsonify({"text": data['response']})

        elif provider == 'gemini':
            if not preferences.google_api_key:
                return jsonify({"error": "Google API key not configured"}), 401

            try:
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model or "gemini-1.5-flash")
                
                prompt = f"{preferences.email_prompt}\n\nType d'email: {email_type}\n\nContenu et contexte:\n{content}\n\nSignature: {sender}"
                response = model.generate_content(prompt)
                
                return jsonify({"text": response.text})
                
            except Exception as e:
                return jsonify({"error": f"Gemini API error: {str(e)}"}), 500

        elif provider == 'anthropic':
            if not preferences.anthropic_api_key:
                return jsonify({"error": "Anthropic API key not configured"}), 401

            try:
                client = Anthropic(api_key=preferences.anthropic_api_key)
                response = client.messages.create(
                    model=preferences.anthropic_model or "claude-3-haiku-20240307",
                    system=preferences.email_prompt,
                    messages=[{
                        "role": "user",
                        "content": f"Type d'email: {email_type}\n\nContenu et contexte:\n{content}\n\nSignature: {sender}"
                    }],
                    max_tokens=2000
                )
                return jsonify({"text": response.content[0].text})
            except Exception as e:
                return jsonify({"error": f"Anthropic API error: {str(e)}"}), 500
            
        return jsonify({"error": "Unsupported provider"}), 400
        
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

@app.route('/api/models/<provider>')
def get_provider_models(provider):
    try:
        preferences = UserPreferences.get_or_create()
        
        if provider == 'openai':
            if not preferences.openai_api_key:
                return jsonify({"error": "OpenAI API key not configured"}), 401
                
            client = OpenAI(api_key=preferences.openai_api_key)
            try:
                models = client.models.list()
                return jsonify({
                    "models": [
                        {"id": model.id, "name": model.id}
                        for model in models
                        if "gpt" in model.id
                    ]
                })
            except Exception as e:
                return jsonify({"error": f"Failed to fetch OpenAI models: {str(e)}"}), 500
                
        elif provider == 'anthropic':
            if not preferences.anthropic_api_key:
                return jsonify({"error": "Anthropic API key not configured"}), 401
                
            headers = {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': preferences.anthropic_api_key
            }
            
            models = [
                {"id": "claude-3-haiku-20240307", "name": "claude-3-haiku"},
                {"id": "claude-3-opus-20240229", "name": "claude-3-opus"},
                {"id": "claude-3-sonnet-20240229", "name": "claude-3-sonnet"},
                {"id": "claude-3-5-sonnet-20241022", "name": "claude-3.5-sonnet"}
            ]
            
            return jsonify({"models": models})
                
        elif provider == 'groq':
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
                    "models": [
                        {"id": model["id"], "name": model["id"]}
                        for model in data["data"]
                    ]
                })
            except Exception as e:
                return jsonify({"error": f"Failed to fetch Groq models: {str(e)}"}), 500
                
        elif provider == 'gemini':
            if not preferences.google_api_key:
                return jsonify({"error": "Google API key not configured"}), 401
            
            models = [
                {"id": "gemini-1.5-pro", "name": "gemini-1.5-pro"},
                {"id": "gemini-1.5-flash", "name": "gemini-1.5-flash"}
            ]
            return jsonify({"models": models})
                
        elif provider == 'ollama':
            url = request.args.get('url', preferences.ollama_url)
            try:
                response = requests.get(f"{url}/api/tags")
                
                if response.status_code != 200:
                    return jsonify({"error": "Failed to fetch Ollama models"}), response.status_code
                    
                data = response.json()
                return jsonify({
                    "models": [
                        {"id": model["name"], "name": model["name"]}
                        for model in data["models"]
                    ]
                })
            except Exception as e:
                return jsonify({"error": f"Failed to fetch Ollama models: {str(e)}"}), 500
                
        return jsonify({"error": "Unsupported provider"}), 400
        
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