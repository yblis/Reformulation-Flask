from flask import Flask, request, jsonify, render_template
from config import reload_env_config
import requests
from openai import OpenAI
from anthropic import Anthropic
import google.generativeai as genai
from models import db, ReformulationHistory, EmailHistory

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///reformulator.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    reformulation_history = ReformulationHistory.query.order_by(ReformulationHistory.created_at.desc()).all()
    email_history = EmailHistory.query.order_by(EmailHistory.created_at.desc()).all()
    return render_template('index.html', reformulation_history=reformulation_history, email_history=email_history)

@app.route('/api/status')
def check_status():
    preferences = reload_env_config()
    provider = preferences.current_provider
    
    if provider != 'ollama':
        return jsonify({"status": "connected", "provider": provider})
        
    ollama_url = request.args.get('url', preferences.ollama_url)
    try:
        response = requests.get(f"{ollama_url}/api/tags")
        if response.status_code == 200:
            return jsonify({"status": "connected", "provider": "ollama"})
        return jsonify({"status": "disconnected", "provider": "ollama", "error": "Failed to connect to Ollama"})
    except Exception as e:
        return jsonify({"status": "disconnected", "provider": "ollama", "error": str(e)})

@app.route('/api/models/<provider>')
def get_models(provider):
    preferences = reload_env_config()
    try:
        if provider == 'ollama':
            ollama_url = request.args.get('url', preferences.ollama_url)
            response = requests.get(f"{ollama_url}/api/tags")
            if response.status_code == 200:
                models = [{"id": model["name"], "name": model["name"]} for model in response.json()["models"]]
                return jsonify({"models": models})
            return jsonify({"error": "Failed to fetch Ollama models"}), 500
        elif provider == 'openai':
            return jsonify({"models": [
                {"id": "gpt-4", "name": "GPT-4"},
                {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"}
            ]})
        elif provider == 'anthropic':
            return jsonify({"models": [
                {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
                {"id": "claude-2.1", "name": "Claude 2.1"}
            ]})
        elif provider == 'groq':
            return jsonify({"models": [
                {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B"},
                {"id": "llama2-70b-4096", "name": "LLaMA2 70B"}
            ]})
        elif provider == 'gemini':
            return jsonify({"models": [
                {"id": "gemini-pro", "name": "Gemini Pro"}
            ]})
        return jsonify({"error": "Invalid provider"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['GET'])
def get_settings():
    preferences = reload_env_config()
    return jsonify({
        "current_provider": preferences.current_provider,
        "ollama_url": preferences.ollama_url,
        "ollama_model": preferences.ollama_model,
        "openai_model": preferences.openai_model,
        "anthropic_model": preferences.anthropic_model,
        "gemini_model": preferences.gemini_model,
        "groq_model": preferences.groq_model,
        "reformulation_prompt": preferences.reformulation_prompt,
        "translation_prompt": preferences.translation_prompt,
        "email_prompt": preferences.email_prompt
    })

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
        tone = data.get('tone', '')
        format_type = data.get('format', '')
        length = data.get('length', '')

        if not text:
            return jsonify({"error": "Text is required"}), 400

        formatted_prompt = f"""Texte à reformuler: {text}
Context/Email reçu: {context}
Ton souhaité: {tone}
Format souhaité: {format_type}
Longueur souhaitée: {length}"""

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': formatted_prompt,
                        'system': preferences.reformulation_prompt,
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
                        {"role": "system", "content": preferences.reformulation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=preferences.reformulation_prompt,
                    messages=[{"role": "user", "content": formatted_prompt}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": preferences.reformulation_prompt},
                        {"role": "user", "content": formatted_prompt}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [preferences.reformulation_prompt]},
                    {"role": "user", "parts": [formatted_prompt]}
                ])
                response_text = response.text

            if response_text:
                history = ReformulationHistory(
                    context=context,
                    original_text=text,
                    reformulated_text=response_text,
                    tone=tone,
                    format=format_type,
                    length=length
                )
                db.session.add(history)
                db.session.commit()
                return jsonify({"text": response_text})
            return jsonify({"error": f"No response from {provider}"}), 500

        except Exception as e:
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-grammar', methods=['POST'])
def check_grammar():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text']
        preferences = reload_env_config()
        provider = preferences.current_provider
        check_prompt = """Tu es un correcteur grammatical expert. Analyse le texte fourni et retourne une liste d'erreurs grammaticales, orthographiques et stylistiques.
Pour chaque erreur, indique:
- Le type d'erreur
- La position dans le texte
- Une explication claire
- Une suggestion de correction

Format de réponse attendu:
[
  {
    "type": "Type d'erreur (grammaticale/orthographique/syntaxique/style)",
    "position": "Position dans le texte",
    "message": "Explication de l'erreur",
    "suggestion": "Suggestion de correction"
  }
]"""

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': text,
                        'system': check_prompt,
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
                        {"role": "system", "content": check_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=check_prompt,
                    messages=[{"role": "user", "content": text}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": check_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [check_prompt]},
                    {"role": "user", "parts": [text]}
                ])
                response_text = response.text

            if response_text:
                # Try to parse the response as a list of errors
                try:
                    import json
                    errors = json.loads(response_text)
                    return jsonify({"errors": errors})
                except json.JSONDecodeError:
                    # If parsing fails, return the raw response
                    return jsonify({"errors": [{"type": "Format", "position": "N/A", 
                                              "message": response_text, "suggestion": None}]})
            return jsonify({"error": f"No response from {provider}"}), 500

        except Exception as e:
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fix-grammar', methods=['POST'])
def fix_grammar():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text']
        preferences = reload_env_config()
        provider = preferences.current_provider
        fix_prompt = """Tu es un correcteur grammatical expert. Corrige toutes les erreurs grammaticales, orthographiques et stylistiques dans le texte fourni.
Retourne uniquement le texte corrigé, sans commentaires ni explications."""

        try:
            response_text = None
            if provider == 'ollama':
                response = requests.post(
                    f"{preferences.ollama_url}/api/generate",
                    json={
                        'model': preferences.ollama_model,
                        'prompt': text,
                        'system': fix_prompt,
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
                        {"role": "system", "content": fix_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'anthropic':
                client = Anthropic(api_key=preferences.anthropic_api_key)
                message = client.messages.create(
                    model=preferences.anthropic_model,
                    system=fix_prompt,
                    messages=[{"role": "user", "content": text}]
                )
                response_text = message.content[0].text
            elif provider == 'groq':
                client = OpenAI(api_key=preferences.groq_api_key,
                             base_url="https://api.groq.com/openai/v1")
                response = client.chat.completions.create(
                    model=preferences.groq_model,
                    messages=[
                        {"role": "system", "content": fix_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                response_text = response.choices[0].message.content
            elif provider == 'gemini':
                genai.configure(api_key=preferences.google_api_key)
                model = genai.GenerativeModel(preferences.gemini_model)
                response = model.generate_content([
                    {"role": "user", "parts": [fix_prompt]},
                    {"role": "user", "parts": [text]}
                ])
                response_text = response.text

            if response_text:
                return jsonify({"text": response_text})
            return jsonify({"error": f"No response from {provider}"}), 500

        except Exception as e:
            return jsonify({"error": str(e)}), 500
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

        formatted_prompt = f"Type d'email: {email_type}\nContenu: {content}\nExpéditeur: {sender}"

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

            if response_text:
                lines = response_text.split('\n')
                subject = None
                for line in lines:
                    if line.lower().startswith('objet:'):
                        subject = line[6:].strip()
                        break
                history = EmailHistory(
                    email_type=email_type,
                    content=content,
                    sender=sender,
                    generated_subject=subject,
                    generated_email=response_text
                )
                db.session.add(history)
                db.session.commit()
                return jsonify({"text": response_text})
            return jsonify({"error": f"No response from {provider}"}), 500

        except Exception as e:
            return jsonify({"error": f"Error generating email: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history/reset', methods=['POST'])
def reset_history():
    try:
        ReformulationHistory.query.delete()
        EmailHistory.query.delete()
        db.session.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)