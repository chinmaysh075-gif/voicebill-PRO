import os
import tempfile
from flask import Flask, jsonify, request, send_file, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
from speech_to_text import SpeechToText

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__, template_folder='templates')
origins = os.getenv("ALLOWED_ORIGINS", "*")
CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

@app.route('/speech-to-text-demo')
def speech_to_text_demo():
    return render_template('test_speech_to_text.html')

@app.get("/products")
def get_products():
    if supabase is None:
        return jsonify({"error": "Supabase is not configured"}), 500
    try:
        limit_param = request.args.get("limit", default=None, type=int)
        query = supabase.table("products").select("*")
        if limit_param:
            query = query.limit(limit_param)
        resp = query.execute()
        return jsonify({"data": resp.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/speech-to-text")
def speech_to_text():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    language = request.form.get('language', 'english').lower()
    
    # Save the uploaded file to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        audio_file.save(temp_file.name)
        temp_path = temp_file.name
    
    try:
        stt = SpeechToText()
        result = stt.transcribe_audio(temp_path, language)
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        return jsonify({
            "status": "success",
            "language": language,
            "text": result
        })
    except Exception as e:
        # Make sure to clean up the temporary file in case of error
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
