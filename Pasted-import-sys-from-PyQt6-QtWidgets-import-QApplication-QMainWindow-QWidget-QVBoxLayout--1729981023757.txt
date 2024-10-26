import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                             QHBoxLayout, QTextEdit, QPushButton, QLabel,
                             QDialog, QLineEdit, QComboBox, QListWidget)
from PyQt6.QtCore import Qt
import requests
import os

# Suppression des messages de debug
os.environ['QT_LOGGING_RULES'] = '*.debug=false;qt.qpa.*=false'
# Suppression du message IMK
import warnings

warnings.filterwarnings("ignore")
# Configuration pour macOS
os.environ['QT_MAC_WANTS_LAYER'] = '1'


class PromptDialog(QDialog):

    def __init__(self, current_prompt, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Configuration du Prompt")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QTextEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
                font-size: 13px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        prompt_label = QLabel("Prompt système:")
        layout.addWidget(prompt_label)

        self.prompt_text = QTextEdit()
        self.prompt_text.setMinimumSize(400, 300)
        self.prompt_text.setText(current_prompt)
        layout.addWidget(self.prompt_text)

        buttons_layout = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Annuler")
        ok_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        buttons_layout.addWidget(ok_button)
        buttons_layout.addWidget(cancel_button)
        layout.addLayout(buttons_layout)


class SettingsDialog(QDialog):

    def __init__(self, current_url, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Configuration Ollama")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QLineEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
            }
            QComboBox {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QComboBox::drop-down {
                border: none;
            }
            QComboBox::down-arrow {
                image: none;
                border: none;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # URL d'Ollama
        url_label = QLabel("URL d'Ollama:")
        self.url_input = QLineEdit()
        self.url_input.setText(current_url)
        layout.addWidget(url_label)
        layout.addWidget(self.url_input)

        # Liste des modèles
        models_label = QLabel("Modèle:")
        self.models_combo = QComboBox()
        layout.addWidget(models_label)
        layout.addWidget(self.models_combo)

        # Bouton pour rafraîchir la liste des modèles
        refresh_button = QPushButton("Rafraîchir les modèles")
        refresh_button.clicked.connect(self.refresh_models)
        layout.addWidget(refresh_button)

        # Boutons OK/Annuler
        buttons_layout = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Annuler")
        ok_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        buttons_layout.addWidget(ok_button)
        buttons_layout.addWidget(cancel_button)
        layout.addLayout(buttons_layout)

        self.setMinimumWidth(400)
        self.refresh_models()

    def refresh_models(self):
        try:
            response = requests.get(f"{self.url_input.text()}/api/tags")
            if response.status_code == 200:
                data = response.json()
                self.models_combo.clear()
                for model in data.get('models', []):
                    self.models_combo.addItem(model['name'], model)
        except Exception as e:
            print(f"Erreur lors de la récupération des modèles: {e}")


class TagButton(QPushButton):

    def __init__(self, text, parent=None):
        super().__init__(text, parent)
        self.setCheckable(True)
        self.setMinimumHeight(35)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.updateStyle()

    def updateStyle(self):
        if self.isChecked():
            style = """
                QPushButton {
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 17px;
                    padding: 5px 20px;
                    font-size: 13px;
                }
                QPushButton:hover {
                    background-color: #45a049;
                }
            """
        else:
            style = """
                QPushButton {
                    background-color: #424242;
                    color: white;
                    border: none;
                    border-radius: 17px;
                    padding: 5px 20px;
                    font-size: 13px;
                }
                QPushButton:hover {
                    background-color: #484848;
                }
            """
        self.setStyleSheet(style)

    def mouseReleaseEvent(self, event):
        super().mouseReleaseEvent(event)
        self.updateStyle()


class TagManagementDialog(QDialog):

    def __init__(self, current_tags, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Gestion des tags")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QLineEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
            }
            QListWidget {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # Liste des tags existants
        self.tags_list = QListWidget()
        for tag in current_tags:
            self.tags_list.addItem(tag)
        layout.addWidget(self.tags_list)

        # Champ pour ajouter un nouveau tag
        input_layout = QHBoxLayout()
        self.new_tag_input = QLineEdit()
        self.new_tag_input.setPlaceholderText("Nouveau tag...")
        add_button = QPushButton("Ajouter")
        add_button.clicked.connect(self.add_tag)
        input_layout.addWidget(self.new_tag_input)
        input_layout.addWidget(add_button)
        layout.addLayout(input_layout)

        # Bouton pour supprimer le tag sélectionné
        delete_button = QPushButton("Supprimer le tag sélectionné")
        delete_button.clicked.connect(self.delete_tag)
        layout.addWidget(delete_button)

        # Boutons OK/Annuler
        buttons = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Annuler")
        ok_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        buttons.addWidget(ok_button)
        buttons.addWidget(cancel_button)
        layout.addLayout(buttons)

    def add_tag(self):
        new_tag = self.new_tag_input.text().strip()
        if new_tag:
            self.tags_list.addItem(new_tag)
            self.new_tag_input.clear()

    def delete_tag(self):
        current_item = self.tags_list.currentItem()
        if current_item:
            self.tags_list.takeItem(self.tags_list.row(current_item))

    def get_tags(self):
        return [
            self.tags_list.item(i).text()
            for i in range(self.tags_list.count())
        ]


class TagSection(QWidget):

    def __init__(self, title, tags, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QWidget {
                background-color: #3d3d3d;
                border-radius: 8px;
            }
            QLabel {
                color: white;
                font-size: 13px;
                padding: 5px;
                background-color: transparent;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(10)
        layout.setContentsMargins(15, 15, 15, 15)

        title_label = QLabel(title)
        layout.addWidget(title_label)

        tags_container = QWidget()
        tags_container.setStyleSheet("background-color: transparent;")
        tags_layout = QHBoxLayout(tags_container)
        tags_layout.setSpacing(8)
        tags_layout.setContentsMargins(0, 0, 0, 0)

        self.buttons = []
        for tag in tags:
            btn = TagButton(tag)
            btn.clicked.connect(lambda checked, b=btn: self.handleTagClick(b))
            self.buttons.append(btn)
            tags_layout.addWidget(btn)

        # Ajouter le bouton + juste après les tags
        manage_button = QPushButton("+")
        manage_button.setFixedSize(30, 30)
        manage_button.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        manage_button.clicked.connect(self.manage_tags)
        tags_layout.addWidget(manage_button)

        tags_layout.addStretch()
        layout.addWidget(tags_container)

        # Sélectionner le premier tag par défaut
        if self.buttons:
            self.buttons[0].setChecked(True)
            self.buttons[0].updateStyle()

    def manage_tags(self):
        current_tags = [btn.text() for btn in self.buttons]
        dialog = TagManagementDialog(current_tags, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            new_tags = dialog.get_tags()
            # Supprimer les anciens boutons
            for btn in self.buttons:
                btn.deleteLater()
            self.buttons.clear()

            # Créer les nouveaux boutons
            tags_layout = self.findChild(QHBoxLayout)
            for tag in new_tags:
                btn = TagButton(tag)
                btn.clicked.connect(
                    lambda checked, b=btn: self.handleTagClick(b))
                self.buttons.append(btn)
                tags_layout.addWidget(btn)

            # Sélectionner le premier tag par défaut
            if self.buttons:
                self.buttons[0].setChecked(True)
                self.buttons[0].updateStyle()

    def handleTagClick(self, clicked_button):
        for button in self.buttons:
            if button != clicked_button:
                button.setChecked(False)
                button.updateStyle()
        clicked_button.setChecked(True)
        clicked_button.updateStyle()

    def getSelectedTag(self):
        for button in self.buttons:
            if button.isChecked():
                return button.text()
        return ""


class ReformulatorApp(QMainWindow):

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Reformulateur")
        self.ollama_url = "http://localhost:11434"
        self.current_model = "qwen2.5:3b"
        self.system_prompt = """Tu es un expert en reformulation. Tu dois reformuler le texte selon les paramètres spécifiés par l'utilisateur: ton, format et longueur. IMPORTANT : retourne UNIQUEMENT le texte reformulé, sans aucune mention des paramètres. 
Respecte scrupuleusement le format demandé, la longueur et le ton. Ne rajoute aucun autre commentaire."""

        self.setStyleSheet("""
            QMainWindow {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QTextEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
                font-size: 13px;
            }
            QPushButton#mainButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 12px;
                font-size: 14px;
                min-height: 45px;
            }
            QPushButton#mainButton:hover {
                background-color: #45a049;
            }
        """)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # Boutons de configuration
        config_layout = QHBoxLayout()

        settings_button = QPushButton("⚙️ Configuration Ollama")
        settings_button.setObjectName("mainButton")
        settings_button.clicked.connect(self.open_settings)

        prompt_button = QPushButton("📝 Configuration Prompt")
        prompt_button.setObjectName("mainButton")
        prompt_button.clicked.connect(self.open_prompt_config)

        translate_button = QPushButton("🌐 Traduction")
        translate_button.setObjectName("mainButton")
        translate_button.clicked.connect(self.open_translation)

        config_layout.addWidget(settings_button)
        config_layout.addWidget(prompt_button)
        config_layout.addWidget(translate_button)
        layout.addLayout(config_layout)

        # Zone de texte d'entrée
        input_label = QLabel("Entre ton texte à reformuler:")
        layout.addWidget(input_label)

        self.input_text = QTextEdit()
        self.input_text.setMinimumHeight(100)
        self.input_text.setPlaceholderText("Entrez votre texte ici...")
        layout.addWidget(self.input_text)

        # Sections de tags
        self.tone_section = TagSection("Ton:", [
            "Professionnel", "Informatif", "Décontracté", "Enthousiaste",
            "Drôle", "Sarcastique"
        ])
        layout.addWidget(self.tone_section)

        self.format_section = TagSection(
            "Format:", ["Mail", "Paragraphe", "Idées", "Article de blog"])
        layout.addWidget(self.format_section)

        self.length_section = TagSection("Longueur:",
                                         ["Court", "Moyen", "Long"])
        layout.addWidget(self.length_section)

        # Bouton Reformuler
        self.reformulate_button = QPushButton("Reformuler")
        self.reformulate_button.setObjectName("mainButton")
        self.reformulate_button.clicked.connect(self.reformulate_text)
        layout.addWidget(self.reformulate_button)

        # Zone de réponse
        response_label = QLabel("Réponse:")
        layout.addWidget(response_label)

        self.output_text = QTextEdit()
        self.output_text.setMinimumHeight(120)
        self.output_text.setReadOnly(True)
        layout.addWidget(self.output_text)

        # Boutons Copier/Effacer
        buttons_layout = QHBoxLayout()
        buttons_layout.setSpacing(10)

        copy_button = QPushButton("Copier")
        copy_button.setObjectName("mainButton")
        clear_button = QPushButton("Effacer")
        clear_button.setObjectName("mainButton")

        copy_button.clicked.connect(self.copy_to_clipboard)
        clear_button.clicked.connect(self.clear_output)

        buttons_layout.addWidget(copy_button)
        buttons_layout.addWidget(clear_button)
        layout.addLayout(buttons_layout)

        self.setMinimumSize(900, 1000)
        self.resize(900, 1000)

    def open_settings(self):
        dialog = SettingsDialog(self.ollama_url, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.ollama_url = dialog.url_input.text()
            selected_model = dialog.models_combo.currentText()
            print(f"Modèle sélectionné: {selected_model}")  # Debug
            if selected_model:
                self.current_model = selected_model
                print(f"Modèle sauvegardé: {self.current_model}")  # Debug

    def open_prompt_config(self):
        dialog = PromptDialog(self.system_prompt, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.system_prompt = dialog.prompt_text.toPlainText()

    def open_translation(self):
        dialog = TranslationDialog(self)
        dialog.exec()

    def reformulate_text(self):
        input_text = self.input_text.toPlainText().strip()
        if not input_text:
            return

        prompt = f"""<|im_start|>system
{self.system_prompt}
<|im_end|>
<|im_start|>user
Texte à reformuler: {input_text}
Ton: {self.tone_section.getSelectedTag()}
Format: {self.format_section.getSelectedTag()}
Longueur: {self.length_section.getSelectedTag()}
<|im_end|>
<|im_start|>assistant"""

        try:
            self.reformulate_button.setEnabled(False)
            self.reformulate_button.setText("En cours...")

            response = requests.post(f'{self.ollama_url}/api/generate',
                                     json={
                                         "model": self.current_model,
                                         "prompt": prompt,
                                         "stream": False
                                     })

            if response.status_code == 200:
                result = response.json()
                reformulated_text = result['response']

                # Nettoyage du texte
                lines = reformulated_text.split('\n')
                cleaned_lines = [
                    line for line in lines
                    if not any(x in line.lower() for x in [
                        'paramètre', 'ton:', 'format:', 'longueur:', 'voici',
                        'reformulation'
                    ])
                ]
                cleaned_text = '\n'.join(cleaned_lines).strip()

                self.output_text.setText(cleaned_text)
            else:
                self.output_text.setText(
                    "Erreur lors de la reformulation. Veuillez réessayer.")

        except Exception as e:
            self.output_text.setText(
                f"Erreur lors de la reformulation: {str(e)}")
        finally:
            self.reformulate_button.setEnabled(True)
            self.reformulate_button.setText("Reformuler")

    def copy_to_clipboard(self):
        clipboard = QApplication.clipboard()
        clipboard.setText(self.output_text.toPlainText())

    def clear_output(self):
        self.output_text.clear()


class TranslationDialog(QDialog):

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Traduction")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QTextEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
                font-size: 13px;
            }
            QComboBox {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # Zone de texte d'entrée
        input_label = QLabel("Texte à traduire:")
        self.input_text = QTextEdit()
        self.input_text.setPlaceholderText("Entrez votre texte ici...")
        layout.addWidget(input_label)
        layout.addWidget(self.input_text)

        # Sélecteur de langue
        lang_layout = QHBoxLayout()
        lang_label = QLabel("Traduire vers:")
        self.lang_combo = QComboBox()
        self.lang_combo.addItems([
            "Anglais", "Français", "Espagnol", "Allemand", "Italien",
            "Portugais"
        ])
        lang_layout.addWidget(lang_label)
        lang_layout.addWidget(self.lang_combo)
        layout.addLayout(lang_layout)

        # Bouton traduire
        self.translate_button = QPushButton("Traduire")
        self.translate_button.clicked.connect(self.translate_text)
        layout.addWidget(self.translate_button)

        # Zone de texte de sortie
        output_label = QLabel("Traduction:")
        self.output_text = QTextEdit()
        self.output_text.setReadOnly(True)
        layout.addWidget(output_label)
        layout.addWidget(self.output_text)

        # Boutons copier/fermer
        buttons_layout = QHBoxLayout()
        copy_button = QPushButton("Copier")
        close_button = QPushButton("Fermer")
        copy_button.clicked.connect(self.copy_translation)
        close_button.clicked.connect(self.close)
        buttons_layout.addWidget(copy_button)
        buttons_layout.addWidget(close_button)
        layout.addLayout(buttons_layout)

        self.setMinimumSize(800, 900)  # Définit la taille minimale
        self.resize(800, 900)  # Définit la taille par défaut

        # Ajustez aussi la taille des zones de texte
        self.input_text.setMinimumHeight(
            200)  # Zone de texte d'entrée plus grande
        self.output_text.setMinimumHeight(200)  # Zone de texte de sortie plus

    def translate_text(self):
        input_text = self.input_text.toPlainText().strip()
        target_lang = self.lang_combo.currentText()
        if not input_text:
            return
        prompt = f"""<|im_start|>system
    Tu es un traducteur automatique. Détecte automatiquement la langue source du texte et traduis-le en {target_lang}. Retourne UNIQUEMENT la traduction, sans aucun autre commentaire.
    <|im_end|>
    <|im_start|>user
    {input_text}
    <|im_end|>
    <|im_start|>assistant"""
        try:
            self.translate_button.setEnabled(False)
            self.translate_button.setText("En cours...")
            response = requests.post(
                f'{self.parent().ollama_url}/api/generate',
                json={
                    "model": self.parent().current_model,
                    "prompt": prompt,
                    "stream": False
                })

            if response.status_code == 200:
                result = response.json()
                translated_text = result['response'].strip()
                self.output_text.setText(translated_text)
            else:
                self.output_text.setText(
                    "Erreur lors de la traduction. Veuillez réessayer.")

        except Exception as e:
            self.output_text.setText(f"Erreur lors de la traduction: {str(e)}")
        finally:
            self.translate_button.setEnabled(True)
            self.translate_button.setText("Traduire")

    def copy_translation(self):
        clipboard = QApplication.clipboard()
        clipboard.setText(self.output_text.toPlainText())


def main():
    app = QApplication(sys.argv)
    window = ReformulatorApp()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()

import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                             QHBoxLayout, QTextEdit, QPushButton, QLabel,
                             QDialog, QLineEdit, QComboBox, QListWidget)
from PyQt6.QtCore import Qt
import requests
import os

# Suppression des messages de debug
os.environ['QT_LOGGING_RULES'] = '*.debug=false;qt.qpa.*=false'
# Suppression du message IMK
import warnings

warnings.filterwarnings("ignore")
# Configuration pour macOS
os.environ['QT_MAC_WANTS_LAYER'] = '1'


class PromptDialog(QDialog):

    def __init__(self, current_prompt, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Configuration du Prompt")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QTextEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
                font-size: 13px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        prompt_label = QLabel("Prompt système:")
        layout.addWidget(prompt_label)

        self.prompt_text = QTextEdit()
        self.prompt_text.setMinimumSize(400, 300)
        self.prompt_text.setText(current_prompt)
        layout.addWidget(self.prompt_text)

        buttons_layout = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Annuler")
        ok_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        buttons_layout.addWidget(ok_button)
        buttons_layout.addWidget(cancel_button)
        layout.addLayout(buttons_layout)


class SettingsDialog(QDialog):

    def __init__(self, current_url, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Configuration Ollama")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QLineEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
            }
            QComboBox {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QComboBox::drop-down {
                border: none;
            }
            QComboBox::down-arrow {
                image: none;
                border: none;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # URL d'Ollama
        url_label = QLabel("URL d'Ollama:")
        self.url_input = QLineEdit()
        self.url_input.setText(current_url)
        layout.addWidget(url_label)
        layout.addWidget(self.url_input)

        # Liste des modèles
        models_label = QLabel("Modèle:")
        self.models_combo = QComboBox()
        layout.addWidget(models_label)
        layout.addWidget(self.models_combo)

        # Bouton pour rafraîchir la liste des modèles
        refresh_button = QPushButton("Rafraîchir les modèles")
        refresh_button.clicked.connect(self.refresh_models)
        layout.addWidget(refresh_button)

        # Boutons OK/Annuler
        buttons_layout = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Annuler")
        ok_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        buttons_layout.addWidget(ok_button)
        buttons_layout.addWidget(cancel_button)
        layout.addLayout(buttons_layout)

        self.setMinimumWidth(400)
        self.refresh_models()

    def refresh_models(self):
        try:
            response = requests.get(f"{self.url_input.text()}/api/tags")
            if response.status_code == 200:
                data = response.json()
                self.models_combo.clear()
                for model in data.get('models', []):
                    self.models_combo.addItem(model['name'], model)
        except Exception as e:
            print(f"Erreur lors de la récupération des modèles: {e}")


class TagButton(QPushButton):

    def __init__(self, text, parent=None):
        super().__init__(text, parent)
        self.setCheckable(True)
        self.setMinimumHeight(35)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.updateStyle()

    def updateStyle(self):
        if self.isChecked():
            style = """
                QPushButton {
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 17px;
                    padding: 5px 20px;
                    font-size: 13px;
                }
                QPushButton:hover {
                    background-color: #45a049;
                }
            """
        else:
            style = """
                QPushButton {
                    background-color: #424242;
                    color: white;
                    border: none;
                    border-radius: 17px;
                    padding: 5px 20px;
                    font-size: 13px;
                }
                QPushButton:hover {
                    background-color: #484848;
                }
            """
        self.setStyleSheet(style)

    def mouseReleaseEvent(self, event):
        super().mouseReleaseEvent(event)
        self.updateStyle()


class TagManagementDialog(QDialog):

    def __init__(self, current_tags, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Gestion des tags")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QLineEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
            }
            QListWidget {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # Liste des tags existants
        self.tags_list = QListWidget()
        for tag in current_tags:
            self.tags_list.addItem(tag)
        layout.addWidget(self.tags_list)

        # Champ pour ajouter un nouveau tag
        input_layout = QHBoxLayout()
        self.new_tag_input = QLineEdit()
        self.new_tag_input.setPlaceholderText("Nouveau tag...")
        add_button = QPushButton("Ajouter")
        add_button.clicked.connect(self.add_tag)
        input_layout.addWidget(self.new_tag_input)
        input_layout.addWidget(add_button)
        layout.addLayout(input_layout)

        # Bouton pour supprimer le tag sélectionné
        delete_button = QPushButton("Supprimer le tag sélectionné")
        delete_button.clicked.connect(self.delete_tag)
        layout.addWidget(delete_button)

        # Boutons OK/Annuler
        buttons = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Annuler")
        ok_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        buttons.addWidget(ok_button)
        buttons.addWidget(cancel_button)
        layout.addLayout(buttons)

    def add_tag(self):
        new_tag = self.new_tag_input.text().strip()
        if new_tag:
            self.tags_list.addItem(new_tag)
            self.new_tag_input.clear()

    def delete_tag(self):
        current_item = self.tags_list.currentItem()
        if current_item:
            self.tags_list.takeItem(self.tags_list.row(current_item))

    def get_tags(self):
        return [
            self.tags_list.item(i).text()
            for i in range(self.tags_list.count())
        ]


class TagSection(QWidget):

    def __init__(self, title, tags, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QWidget {
                background-color: #3d3d3d;
                border-radius: 8px;
            }
            QLabel {
                color: white;
                font-size: 13px;
                padding: 5px;
                background-color: transparent;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(10)
        layout.setContentsMargins(15, 15, 15, 15)

        title_label = QLabel(title)
        layout.addWidget(title_label)

        tags_container = QWidget()
        tags_container.setStyleSheet("background-color: transparent;")
        tags_layout = QHBoxLayout(tags_container)
        tags_layout.setSpacing(8)
        tags_layout.setContentsMargins(0, 0, 0, 0)

        self.buttons = []
        for tag in tags:
            btn = TagButton(tag)
            btn.clicked.connect(lambda checked, b=btn: self.handleTagClick(b))
            self.buttons.append(btn)
            tags_layout.addWidget(btn)

        # Ajouter le bouton + juste après les tags
        manage_button = QPushButton("+")
        manage_button.setFixedSize(30, 30)
        manage_button.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        manage_button.clicked.connect(self.manage_tags)
        tags_layout.addWidget(manage_button)

        tags_layout.addStretch()
        layout.addWidget(tags_container)

        # Sélectionner le premier tag par défaut
        if self.buttons:
            self.buttons[0].setChecked(True)
            self.buttons[0].updateStyle()

    def manage_tags(self):
        current_tags = [btn.text() for btn in self.buttons]
        dialog = TagManagementDialog(current_tags, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            new_tags = dialog.get_tags()
            # Supprimer les anciens boutons
            for btn in self.buttons:
                btn.deleteLater()
            self.buttons.clear()

            # Créer les nouveaux boutons
            tags_layout = self.findChild(QHBoxLayout)
            for tag in new_tags:
                btn = TagButton(tag)
                btn.clicked.connect(
                    lambda checked, b=btn: self.handleTagClick(b))
                self.buttons.append(btn)
                tags_layout.addWidget(btn)

            # Sélectionner le premier tag par défaut
            if self.buttons:
                self.buttons[0].setChecked(True)
                self.buttons[0].updateStyle()

    def handleTagClick(self, clicked_button):
        for button in self.buttons:
            if button != clicked_button:
                button.setChecked(False)
                button.updateStyle()
        clicked_button.setChecked(True)
        clicked_button.updateStyle()

    def getSelectedTag(self):
        for button in self.buttons:
            if button.isChecked():
                return button.text()
        return ""


class ReformulatorApp(QMainWindow):

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Reformulateur")
        self.ollama_url = "http://localhost:11434"
        self.current_model = "qwen2.5:3b"
        self.system_prompt = """Tu es un expert en reformulation. Tu dois reformuler le texte selon les paramètres spécifiés par l'utilisateur: ton, format et longueur. IMPORTANT : retourne UNIQUEMENT le texte reformulé, sans aucune mention des paramètres. 
Respecte scrupuleusement le format demandé, la longueur et le ton. Ne rajoute aucun autre commentaire."""

        self.setStyleSheet("""
            QMainWindow {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QTextEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
                font-size: 13px;
            }
            QPushButton#mainButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 12px;
                font-size: 14px;
                min-height: 45px;
            }
            QPushButton#mainButton:hover {
                background-color: #45a049;
            }
        """)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # Boutons de configuration
        config_layout = QHBoxLayout()

        settings_button = QPushButton("⚙️ Configuration Ollama")
        settings_button.setObjectName("mainButton")
        settings_button.clicked.connect(self.open_settings)

        prompt_button = QPushButton("📝 Configuration Prompt")
        prompt_button.setObjectName("mainButton")
        prompt_button.clicked.connect(self.open_prompt_config)

        translate_button = QPushButton("🌐 Traduction")
        translate_button.setObjectName("mainButton")
        translate_button.clicked.connect(self.open_translation)

        config_layout.addWidget(settings_button)
        config_layout.addWidget(prompt_button)
        config_layout.addWidget(translate_button)
        layout.addLayout(config_layout)

        # Zone de texte d'entrée
        input_label = QLabel("Entre ton texte à reformuler:")
        layout.addWidget(input_label)

        self.input_text = QTextEdit()
        self.input_text.setMinimumHeight(100)
        self.input_text.setPlaceholderText("Entrez votre texte ici...")
        layout.addWidget(self.input_text)

        # Sections de tags
        self.tone_section = TagSection("Ton:", [
            "Professionnel", "Informatif", "Décontracté", "Enthousiaste",
            "Drôle", "Sarcastique"
        ])
        layout.addWidget(self.tone_section)

        self.format_section = TagSection(
            "Format:", ["Mail", "Paragraphe", "Idées", "Article de blog"])
        layout.addWidget(self.format_section)

        self.length_section = TagSection("Longueur:",
                                         ["Court", "Moyen", "Long"])
        layout.addWidget(self.length_section)

        # Bouton Reformuler
        self.reformulate_button = QPushButton("Reformuler")
        self.reformulate_button.setObjectName("mainButton")
        self.reformulate_button.clicked.connect(self.reformulate_text)
        layout.addWidget(self.reformulate_button)

        # Zone de réponse
        response_label = QLabel("Réponse:")
        layout.addWidget(response_label)

        self.output_text = QTextEdit()
        self.output_text.setMinimumHeight(120)
        self.output_text.setReadOnly(True)
        layout.addWidget(self.output_text)

        # Boutons Copier/Effacer
        buttons_layout = QHBoxLayout()
        buttons_layout.setSpacing(10)

        copy_button = QPushButton("Copier")
        copy_button.setObjectName("mainButton")
        clear_button = QPushButton("Effacer")
        clear_button.setObjectName("mainButton")

        copy_button.clicked.connect(self.copy_to_clipboard)
        clear_button.clicked.connect(self.clear_output)

        buttons_layout.addWidget(copy_button)
        buttons_layout.addWidget(clear_button)
        layout.addLayout(buttons_layout)

        self.setMinimumSize(900, 1000)
        self.resize(900, 1000)

    def open_settings(self):
        dialog = SettingsDialog(self.ollama_url, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.ollama_url = dialog.url_input.text()
            selected_model = dialog.models_combo.currentText()
            print(f"Modèle sélectionné: {selected_model}")  # Debug
            if selected_model:
                self.current_model = selected_model
                print(f"Modèle sauvegardé: {self.current_model}")  # Debug

    def open_prompt_config(self):
        dialog = PromptDialog(self.system_prompt, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.system_prompt = dialog.prompt_text.toPlainText()

    def open_translation(self):
        dialog = TranslationDialog(self)
        dialog.exec()

    def reformulate_text(self):
        input_text = self.input_text.toPlainText().strip()
        if not input_text:
            return

        prompt = f"""<|im_start|>system
{self.system_prompt}
<|im_end|>
<|im_start|>user
Texte à reformuler: {input_text}
Ton: {self.tone_section.getSelectedTag()}
Format: {self.format_section.getSelectedTag()}
Longueur: {self.length_section.getSelectedTag()}
<|im_end|>
<|im_start|>assistant"""

        try:
            self.reformulate_button.setEnabled(False)
            self.reformulate_button.setText("En cours...")

            response = requests.post(f'{self.ollama_url}/api/generate',
                                     json={
                                         "model": self.current_model,
                                         "prompt": prompt,
                                         "stream": False
                                     })

            if response.status_code == 200:
                result = response.json()
                reformulated_text = result['response']

                # Nettoyage du texte
                lines = reformulated_text.split('\n')
                cleaned_lines = [
                    line for line in lines
                    if not any(x in line.lower() for x in [
                        'paramètre', 'ton:', 'format:', 'longueur:', 'voici',
                        'reformulation'
                    ])
                ]
                cleaned_text = '\n'.join(cleaned_lines).strip()

                self.output_text.setText(cleaned_text)
            else:
                self.output_text.setText(
                    "Erreur lors de la reformulation. Veuillez réessayer.")

        except Exception as e:
            self.output_text.setText(
                f"Erreur lors de la reformulation: {str(e)}")
        finally:
            self.reformulate_button.setEnabled(True)
            self.reformulate_button.setText("Reformuler")

    def copy_to_clipboard(self):
        clipboard = QApplication.clipboard()
        clipboard.setText(self.output_text.toPlainText())

    def clear_output(self):
        self.output_text.clear()


class TranslationDialog(QDialog):

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Traduction")
        self.setStyleSheet("""
            QDialog {
                background-color: #323232;
            }
            QLabel {
                color: white;
                font-size: 13px;
            }
            QTextEdit {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
                font-size: 13px;
            }
            QComboBox {
                background-color: #3d3d3d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-size: 13px;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # Zone de texte d'entrée
        input_label = QLabel("Texte à traduire:")
        self.input_text = QTextEdit()
        self.input_text.setPlaceholderText("Entrez votre texte ici...")
        layout.addWidget(input_label)
        layout.addWidget(self.input_text)

        # Sélecteur de langue
        lang_layout = QHBoxLayout()
        lang_label = QLabel("Traduire vers:")
        self.lang_combo = QComboBox()
        self.lang_combo.addItems([
            "Anglais", "Français", "Espagnol", "Allemand", "Italien",
            "Portugais"
        ])
        lang_layout.addWidget(lang_label)
        lang_layout.addWidget(self.lang_combo)
        layout.addLayout(lang_layout)

        # Bouton traduire
        self.translate_button = QPushButton("Traduire")
        self.translate_button.clicked.connect(self.translate_text)
        layout.addWidget(self.translate_button)

        # Zone de texte de sortie
        output_label = QLabel("Traduction:")
        self.output_text = QTextEdit()
        self.output_text.setReadOnly(True)
        layout.addWidget(output_label)
        layout.addWidget(self.output_text)

        # Boutons copier/fermer
        buttons_layout = QHBoxLayout()
        copy_button = QPushButton("Copier")
        close_button = QPushButton("Fermer")
        copy_button.clicked.connect(self.copy_translation)
        close_button.clicked.connect(self.close)
        buttons_layout.addWidget(copy_button)
        buttons_layout.addWidget(close_button)
        layout.addLayout(buttons_layout)

        self.setMinimumSize(800, 900)  # Définit la taille minimale
        self.resize(800, 900)  # Définit la taille par défaut

        # Ajustez aussi la taille des zones de texte
        self.input_text.setMinimumHeight(
            200)  # Zone de texte d'entrée plus grande
        self.output_text.setMinimumHeight(200)  # Zone de texte de sortie plus

    def translate_text(self):
        input_text = self.input_text.toPlainText().strip()
        target_lang = self.lang_combo.currentText()
        if not input_text:
            return
        prompt = f"""<|im_start|>system
    Tu es un traducteur automatique. Détecte automatiquement la langue source du texte et traduis-le en {target_lang}. Retourne UNIQUEMENT la traduction, sans aucun autre commentaire.
    <|im_end|>
    <|im_start|>user
    {input_text}
    <|im_end|>
    <|im_start|>assistant"""
        try:
            self.translate_button.setEnabled(False)
            self.translate_button.setText("En cours...")
            response = requests.post(
                f'{self.parent().ollama_url}/api/generate',
                json={
                    "model": self.parent().current_model,
                    "prompt": prompt,
                    "stream": False
                })

            if response.status_code == 200:
                result = response.json()
                translated_text = result['response'].strip()
                self.output_text.setText(translated_text)
            else:
                self.output_text.setText(
                    "Erreur lors de la traduction. Veuillez réessayer.")

        except Exception as e:
            self.output_text.setText(f"Erreur lors de la traduction: {str(e)}")
        finally:
            self.translate_button.setEnabled(True)
            self.translate_button.setText("Traduire")

    def copy_translation(self):
        clipboard = QApplication.clipboard()
        clipboard.setText(self.output_text.toPlainText())


def main():
    app = QApplication(sys.argv)
    window = ReformulatorApp()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
