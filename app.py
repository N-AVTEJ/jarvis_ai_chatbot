import os
from flask import Flask, request, jsonify, send_from_directory
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print('Warning: GEMINI_API_KEY not set. Please add it to .env or environment variables.')
    client = None
else:
    # create the google-genai client for Gemini API
    client = genai.Client(api_key=GEMINI_API_KEY)


@app.route('/api/chat', methods=['POST'])
def chat():
    payload = request.get_json() or {}
    message = payload.get('message')
    if not message:
        return jsonify(error='No message provided'), 400

    if not client:
        return jsonify(error='API key not configured'), 500

    try:
        # use the google-genai client to create a chat and send message
        chat_session = client.chats.create(model='gemini-2.5-flash')
        response = chat_session.send_message(message)
        # response.text contains the model's reply
        text = response.text or 'Sorry, I could not process that.'
        return jsonify(response=text)
    except Exception as err:
        print('Chat API error', err)
        return jsonify(error=f'API error: {str(err)}'), 500


# serve static files from root directory; default to chat HTML
@app.route('/', defaults={'path': 'jarvis_chatbot.html'})
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('.', path)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=True)
