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
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    # Drop all tables and recreate them
    db.drop_all()
    db.create_all()
    # Initialize preferences
    preferences = UserPreferences.get_or_create()

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
