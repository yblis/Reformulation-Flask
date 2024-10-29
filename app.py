from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import os
from requests.exceptions import ConnectionError, Timeout
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///preferences.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Models
class UserPreferences(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ollama_url = db.Column(db.String(200), nullable=False, default="http://localhost:11434")
    current_model = db.Column(db.String(100), nullable=False, default="qwen2.5:3b")
    system_prompt = db.Column(db.Text, nullable=False)
    translation_prompt = db.Column(db.Text, nullable=False)

# Initialize default preferences
def init_preferences():
    with app.app_context():
        db.create_all()
        if not UserPreferences.query.first():
            default_prefs = UserPreferences(
                ollama_url="http://localhost:11434",
                current_model="qwen2.5:3b",
                system_prompt="""Tu es un expert en reformulation. Tu dois reformuler le texte selon les paramètres spécifiés par l'utilisateur: ton, format et longueur. IMPORTANT : retourne UNIQUEMENT le texte reformulé, sans aucune mention des paramètres. 
Respecte scrupuleusement le format demandé, la longueur et le ton. Ne rajoute aucun autre commentaire.
Si un contexte ou un email reçu est fourni, utilise-le pour mieux adapter la reformulation.""",
                translation_prompt="""Tu es un traducteur automatique. Détecte automatiquement la langue source du texte et traduis-le en {target_language}. Retourne UNIQUEMENT la traduction, sans aucun autre commentaire."""
            )
            db.session.add(default_prefs)
            db.session.commit()

# Initialize preferences
init_preferences()

# Get current preferences
def get_preferences():
    prefs = UserPreferences.query.first()
    if not prefs:
        init_preferences()
        prefs = UserPreferences.query.first()
    return prefs

# Global configuration - now loaded from database
@property
def OLLAMA_URL():
    return get_preferences().ollama_url

@property
def CURRENT_MODEL():
    return get_preferences().current_model

@property
def SYSTEM_PROMPT():
    return get_preferences().system_prompt

@property
def TRANSLATION_PROMPT():
    return get_preferences().translation_prompt

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
    except (ConnectionError, Timeout):
        return False
    except Exception:
        return False

@app.route('/')
def index():
    prefs = get_preferences()
    return render_template('index.html', 
                         ollama_status=check_ollama_status(),
                         system_prompt=prefs.system_prompt,
                         translation_prompt=prefs.translation_prompt)

@app.route('/sw.js')
def service_worker():
    return app.send_static_file('sw.js'), 200, {'Content-Type': 'application/javascript'}

@app.route('/manifest.json')
def manifest():
    return app.send_static_file('manifest.json'), 200, {'Content-Type': 'application/json'}

@app.route('/api/preferences', methods=['GET'])
def get_user_preferences():
    """Get current user preferences"""
    prefs = get_preferences()
    return jsonify({
        'ollama_url': prefs.ollama_url,
        'current_model': prefs.current_model,
        'system_prompt': prefs.system_prompt,
        'translation_prompt': prefs.translation_prompt
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get the current status of Ollama service"""
    url = request.args.get('url')
    return jsonify({"status": "connected" if check_ollama_status(url) else "disconnected"})

@app.route('/api/models', methods=['GET'])
def get_models():
    prefs = get_preferences()
    test_url = request.args.get('url', prefs.ollama_url)
    
    if not check_ollama_status(test_url):
        return jsonify({
            "message": f"Le service Ollama n'est pas accessible à l'URL {test_url}. Vérifiez qu'il est en cours d'exécution et que l'URL est correcte.",
            "error": "SERVICE_UNAVAILABLE"
        }), 503

    try:
        response = requests.get(f"{test_url}/api/tags", timeout=5)
        if response.status_code == 200:
            try:
                data = response.json()
                if not data.get('models'):
                    return jsonify({
                        "message": f"Aucun modèle n'est disponible sur le serveur Ollama à l'URL {test_url}.",
                        "error": "NO_MODELS_FOUND"
                    }), 404
                
                models = []
                for model in data['models']:
                    if isinstance(model, dict) and 'name' in model:
                        models.append({
                            'name': model['name'],
                            'model': model.get('model', model['name'])
                        })
                
                return jsonify({"models": models})
            except ValueError:
                return jsonify({
                    "message": f"Le serveur Ollama à l'URL {test_url} a renvoyé une réponse invalide.",
                    "error": "INVALID_RESPONSE"
                }), 500
        elif response.status_code == 404:
            return jsonify({
                "message": f"L'API Ollama n'est pas accessible à l'URL {test_url}.",
                "error": "ENDPOINT_NOT_FOUND"
            }), 404
        else:
            return jsonify({
                "message": f"Le serveur Ollama à l'URL {test_url} a répondu avec une erreur (code {response.status_code}).",
                "error": "SERVER_ERROR"
            }), response.status_code
            
    except ConnectionError:
        return jsonify({
            "message": f"Impossible de se connecter au serveur Ollama à l'URL {test_url}. Vérifiez l'URL et que le service est démarré.",
            "error": "CONNECTION_ERROR"
        }), 503
    except Timeout:
        return jsonify({
            "message": f"Le serveur Ollama à l'URL {test_url} ne répond pas dans le délai imparti.",
            "error": "TIMEOUT_ERROR"
        }), 504
    except Exception as e:
        return jsonify({
            "message": f"Une erreur inattendue s'est produite lors de la connexion à {test_url}: {str(e)}",
            "error": "UNEXPECTED_ERROR"
        }), 500

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    prefs = get_preferences()
    if not check_ollama_status():
        return jsonify({
            "message": "Le service Ollama n'est pas accessible. Vérifiez la configuration.",
            "error": "SERVICE_UNAVAILABLE"
        }), 503

    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    input_text = data.get('text')
    context = data.get('context', '').strip()
    tone = data.get('tone')
    format_type = data.get('format')
    length = data.get('length')

    if not all([input_text, tone, format_type, length]):
        return jsonify({
            "message": "Tous les champs sont requis (texte, ton, format, longueur).",
            "error": "MISSING_FIELDS"
        }), 400

    context_section = f"Contexte / Email reçu:\n{context}\n\n" if context else ""
    
    prompt = f"""<|im_start|>system
{prefs.system_prompt}
<|im_end|>
<|im_start|>user
{context_section}Texte à reformuler: {input_text}
Ton: {tone}
Format: {format_type}
Longueur: {length}
<|im_end|>
<|im_start|>assistant"""

    try:
        response = requests.post(
            f'{prefs.ollama_url}/api/generate',
            json={
                "model": prefs.current_model,
                "prompt": prompt,
                "stream": False
            },
            timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            reformulated_text = result['response'].strip()
            return jsonify({"text": reformulated_text})
        else:
            return jsonify({
                "message": "Erreur lors de la reformulation du texte.",
                "error": "REFORMULATION_ERROR"
            }), 500
            
    except (ConnectionError, Timeout):
        return jsonify({
            "message": "Le service Ollama n'est pas accessible. Vérifiez la configuration.",
            "error": "CONNECTION_ERROR"
        }), 503
    except Exception as e:
        return jsonify({
            "message": f"Une erreur inattendue s'est produite: {str(e)}",
            "error": "UNEXPECTED_ERROR"
        }), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    prefs = get_preferences()
    if not check_ollama_status():
        return jsonify({
            "error": "Le service Ollama n'est pas accessible. Vérifiez la configuration."
        }), 503

    data = request.get_json()
    if not data or 'text' not in data or 'language' not in data:
        return jsonify({
            "error": "Le texte et la langue cible sont requis."
        }), 400

    prompt = f'''<|im_start|>system
{prefs.translation_prompt.format(target_language=data['language'])}
<|im_end|>
<|im_start|>user
{data['text']}
<|im_end|>
<|im_start|>assistant'''

    try:
        response = requests.post(
            f'{prefs.ollama_url}/api/generate',
            json={
                "model": prefs.current_model,
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            translated_text = result['response'].strip()
            return jsonify({"text": translated_text})
        else:
            return jsonify({
                "error": "Erreur lors de la traduction du texte."
            }), 500

    except Exception as e:
        return jsonify({
            "error": f"Erreur lors de la traduction: {str(e)}"
        }), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    prefs = get_preferences()
    prefs.ollama_url = data.get('url', prefs.ollama_url).rstrip('/')  # Remove trailing slash if present
    prefs.current_model = data.get('model', prefs.current_model)
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/api/prompt', methods=['POST'])
def update_prompt():
    data = request.get_json()
    if data is None:
        return jsonify({
            "message": "Le corps de la requête est invalide ou manquant.",
            "error": "INVALID_REQUEST"
        }), 400

    prefs = get_preferences()
    prefs.system_prompt = data.get('prompt', prefs.system_prompt)
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

    prefs = get_preferences()
    prefs.translation_prompt = data.get('prompt', prefs.translation_prompt)
    db.session.commit()
    return jsonify({"status": "success"})
