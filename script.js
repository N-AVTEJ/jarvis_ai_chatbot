class JarvisChat {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.imageBtn = document.getElementById('imageBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.fileInput = document.getElementById('fileInput');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        this.isRecording = false;
        this.recognition = null;
        this.messages = [];
        
        this.initEventListeners();
        this.initSpeechRecognition();
        this.addWelcomeMessage();
    }
    
    initEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.imageBtn.addEventListener('click', () => this.fileInput.click());
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }
    
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.sendMessage();
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                this.voiceBtn.classList.remove('recording');
            };
        }
    }
    
    addWelcomeMessage() {
        setTimeout(() => {
            this.addMessage('Hello! I am JARVIS, your advanced AI assistant. I can help you with various tasks, analyze images, and respond to voice commands. How may I assist you today?', 'bot');
        }, 1000);
    }
    
    toggleVoiceRecording() {
        if (!this.recognition) {
            this.addMessage('Sorry, speech recognition is not supported in your browser.', 'bot');
            return;
        }
        
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.isRecording = true;
            this.voiceBtn.classList.add('recording');
            this.recognition.start();
        }
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addMessage('', 'user', e.target.result);
                this.processImageMessage(file.name);
            };
            reader.readAsDataURL(file);
        }
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        
        this.showTypingIndicator();
        setTimeout(() => {
            this.processMessage(message);
        }, 1000 + Math.random() * 2000);
    }
    
    addMessage(content, sender, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'image-preview';
            messageContent.appendChild(img);
        }
        
        if (content) {
            const textDiv = document.createElement('div');
            textDiv.textContent = content;
            messageContent.appendChild(textDiv);
        }
        
        messageDiv.appendChild(messageContent);
        
        // Remove welcome message if it exists
        const welcomeMessage = this.chatContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        this.messages.push({ content, sender, imageUrl, timestamp: new Date() });
    }
    
    async processMessage(message) {
        this.hideTypingIndicator();
        
        // send message to backend API
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            if (data && data.response) {
                this.addMessage(data.response, 'bot');
            } else {
                // fallback to local responses if backend did not return anything
                const fallback = this.generateResponse(message);
                this.addMessage(fallback, 'bot');
            }
        } catch (error) {
            console.error('Error contacting backend:', error);
            // use local generator as fallback
            const fallback = this.generateResponse(message);
            this.addMessage(fallback, 'bot');
        }
    }
    
    processImageMessage(filename) {
        this.hideTypingIndicator();
        this.addMessage(`I can see you've uploaded an image: ${filename}. I'm analyzing the visual content. In a real implementation, this would connect to computer vision APIs to describe the image content, detect objects, read text, or answer questions about what's shown in the image.`, 'bot');
    }
    
    generateResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm JARVIS, ready to assist you with any questions or tasks you have.";
        }
        
        if (lowerMessage.includes('weather')) {
            return "I'd be happy to help with weather information. In a full implementation, I would connect to weather APIs to provide current conditions and forecasts for your location.";
        }
        
        if (lowerMessage.includes('time') || lowerMessage.includes('date')) {
            const now = new Date();
            return `The current time is ${now.toLocaleTimeString()} and today's date is ${now.toLocaleDateString()}.`;
        }
        
        if (lowerMessage.includes('code') || lowerMessage.includes('programming')) {
            return "I can help you with coding and programming questions. I'm capable of working with various programming languages including JavaScript, Python, HTML, CSS, and many others.";
        }
        
        if (lowerMessage.includes('jarvis') || lowerMessage.includes('who are you')) {
            return "I am JARVIS - Just A Rather Very Intelligent System. I'm an advanced AI assistant designed to help you with various tasks, answer questions, and provide intelligent responses.";
        }
        
        // Default responses
        const defaultResponses = [
            "That's an interesting question. In a full AI implementation, I would process your query using advanced natural language understanding and provide detailed, contextual responses.",
            "I understand your request. This demo shows the interface capabilities - in production, I would connect to advanced AI models to provide comprehensive assistance.",
            "Thank you for your message. A complete JARVIS system would analyze your input using machine learning algorithms and respond with relevant, helpful information.",
            "I'm processing your request. In a real-world deployment, I would leverage multiple AI services to give you the most accurate and useful response possible."
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    
    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 100);
    }
}

// Initialize the chat when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new JarvisChat();
});