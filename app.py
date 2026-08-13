import os
from flask import Flask, request, jsonify, send_from_directory
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
client = None

if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        print("J.A.R.V.I.S Gemini Client successfully initialized.")
    except Exception as e:
        print(f"Error initializing Gemini client: {e}")
else:
    print('Warning: GEMINI_API_KEY not set in environment.')

JARVIS_SYSTEM_PROMPT = (
    "You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the advanced AI assistant created by Tony Stark. "
    "Maintain a polite, highly intelligent, efficient, slightly witty, and sophisticated persona. "
    "Provide clear, comprehensive, and well-structured answers using Markdown. "
    "When explaining concepts like Git, GitHub, programming languages, or algorithms, format code snippets in Markdown code blocks and give complete, helpful context."
)

@app.route('/api/chat', methods=['POST'])
def chat():
    payload = request.get_json() or {}
    message = payload.get('message')
    history = payload.get('history', [])
    model_name = payload.get('model', 'gemini-2.5-flash')
    
    if not message:
        return jsonify(error='No message provided'), 400

    api_key_override = payload.get('apiKey')
    active_client = client
    if api_key_override:
        try:
            active_client = genai.Client(api_key=api_key_override)
        except Exception as err:
            return jsonify(error=f'Invalid API key provided: {str(err)}'), 400

    if not active_client:
        return jsonify(error='API key not configured on server or in request'), 500

    try:
        # Build prompt with system context and conversation history if available
        formatted_prompt = f"System Protocol: {JARVIS_SYSTEM_PROMPT}\n\n"
        if history:
            formatted_prompt += "Recent Conversation Logs:\n"
            for msg in history[-6:]: # Include up to last 6 turns for context
                role = "User" if msg.get("sender") == "user" else "J.A.R.V.I.S"
                formatted_prompt += f"{role}: {msg.get('content', '')}\n"
        
        formatted_prompt += f"User: {message}\nJ.A.R.V.I.S:"

        response = active_client.models.generate_content(
            model=model_name,
            contents=formatted_prompt
        )
        
        text = response.text or 'Apologies, sir. Data packet response was empty.'
        return jsonify(response=text, model=model_name)
    except Exception as err:
        print('Chat API error:', err)
        return jsonify(error=f'Gemini API error: {str(err)}'), 500


# serve static files from root directory; default to chat HTML
@app.route('/', defaults={'path': 'jarvis_chatbot.html'})
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('.', path)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print(f"J.A.R.V.I.S Mainframe starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)

