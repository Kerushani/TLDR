import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()
API_KEY = os.getenv("API_KEY")

client = InferenceClient(
    provider="hf-inference",
    api_key=API_KEY
)

app = Flask(__name__)
CORS(app)

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.json
    text = data.get("text")

    if not text:
        return jsonify({"error": "Text is required"}), 400

    try:
        summary_response = client.summarization(
            text=text, 
            model="facebook/bart-large-cnn"
        )

        summary_text = summary_response.get("summary_text", "No summary available.")

        return jsonify({"summary": summary_text})

    except Exception as e:
        return jsonify({"error": "Summarization failed", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
