from flask import Flask, render_template, request, jsonify
import requests
import os
from requests.exceptions import ConnectionError, Timeout

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Global configuration
OLLAMA_URL = "http://localhost:11434"
CURRENT_MODEL = "qwen2.5:3b"
SYSTEM_PROMPT = """Tu es un expert en reformulation. Tu dois reformuler le texte selon les paramètres spécifiés par l'utilisateur: ton, format et longueur. IMPORTANT : retourne UNIQUEMENT le texte reformulé, sans aucune mention des paramètres. 
Respecte scrupuleusement le format demandé, la longueur et le ton. Ne rajoute aucun autre commentaire."""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/reformulate', methods=['POST'])
def reformulate():
    data = request.json
    input_text = data.get('text')
    tone = data.get('tone')
    format_type = data.get('format')
    length = data.get('length')

    prompt = f"""<|im_start|>system
{SYSTEM_PROMPT}
<|im_end|>
<|im_start|>user
Texte à reformuler: {input_text}
Ton: {tone}
Format: {format_type}
Longueur: {length}
<|im_end|>
<|im_start|>assistant"""

    try:
        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                "model": CURRENT_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            reformulated_text = result['response'].strip()
            return jsonify({"text": reformulated_text})
        else:
            return jsonify({"error": "Erreur lors de la reformulation"}), 500
            
    except (ConnectionError, Timeout) as e:
        return jsonify({"error": "Impossible de se connecter à Ollama. Assurez-vous qu'Ollama est en cours d'exécution et accessible."}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    data = request.json
    input_text = data.get('text')
    target_lang = data.get('language')

    prompt = f"""<|im_start|>system
Tu es un traducteur automatique. Détecte automatiquement la langue source du texte et traduis-le en {target_lang}. Retourne UNIQUEMENT la traduction, sans aucun autre commentaire.
<|im_end|>
<|im_start|>user
{input_text}
<|im_end|>
<|im_start|>assistant"""

    try:
        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                "model": CURRENT_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            translated_text = result['response'].strip()
            return jsonify({"text": translated_text})
        else:
            return jsonify({"error": "Erreur lors de la traduction"}), 500
            
    except (ConnectionError, Timeout) as e:
        return jsonify({"error": "Impossible de se connecter à Ollama. Assurez-vous qu'Ollama est en cours d'exécution et accessible."}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        return jsonify({
            "error": "Impossible de récupérer les modèles. Vérifiez que le serveur Ollama répond correctement."
        }), 500
    except ConnectionError:
        return jsonify({
            "error": "Impossible de se connecter à Ollama. Assurez-vous qu'Ollama est en cours d'exécution et accessible à l'adresse configurée."
        }), 503
    except Timeout:
        return jsonify({
            "error": "Le serveur Ollama ne répond pas dans le délai imparti. Vérifiez son état."
        }), 504
    except Exception as e:
        return jsonify({
            "error": f"Une erreur inattendue s'est produite: {str(e)}"
        }), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    global OLLAMA_URL, CURRENT_MODEL
    data = request.json
    OLLAMA_URL = data.get('url', OLLAMA_URL)
    CURRENT_MODEL = data.get('model', CURRENT_MODEL)
    return jsonify({"status": "success"})

@app.route('/api/prompt', methods=['POST'])
def update_prompt():
    global SYSTEM_PROMPT
    data = request.json
    SYSTEM_PROMPT = data.get('prompt', SYSTEM_PROMPT)
    return jsonify({"status": "success"})
