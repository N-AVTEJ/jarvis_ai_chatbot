# Jarvis Chatbot

This project contains a simple HTML/CSS/JavaScript chatbot front end and a python (flask ) backend for safely storing an API key and proxying requests to an AI service.
## Setup

1. **Install dependencies**
   ```bash
   cd "c:\Users\navtej\OneDrive\Documents\PROJECTS\jarvis chatbot htmlcss"
   python -m venv venv           # optional but recommended
   venv\Scripts\activate      # Windows
   pip install -r requirements.txt
   ```

2. **Configure your API key**
   - Open the `.env` file and replace `your_api_key_here` with your actual Gemini (or other service) API key.
   - Alternatively, set `GEMINI_API_KEY` as an environment variable.

3. **Run the server**
   ```bash
   python app.py
   ```
   The Flask app will listen on port 3000 by default, serving the frontend files and providing `/api/chat` as a proxy endpoint.

4. **Open in browser**
   Navigate to `http://localhost:3000/jarvis_chatbot.html` to access the chat UI.


## How it works

- The frontend (`script.js`) sends user messages to `/api/chat` using `fetch`.
- The backend (`server.js`) reads the API key from `.env` (or environment) and forwards the message to the AI provider.
- Responses from the AI provider are returned to the browser and displayed as bot replies.

> **Note:** The API key is never exposed in client-side code; it stays on the server.

Feel free to extend the backend with additional routes (image analysis, file processing, etc.).