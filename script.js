class JarvisChat {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.imageBtn = document.getElementById('imageBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.fileInput = document.getElementById('fileInput');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.welcomeOverlay = document.getElementById('welcomeOverlay');
        
        // Stats
        this.msgCountVal = document.getElementById('msgCount');
        this.uptimeVal = document.getElementById('uptimeVal');
        this.sessionIdVal = document.getElementById('sessionId');
        this.neuralFill = document.getElementById('neuralFill');
        this.memFill = document.getElementById('memFill');
        this.hudTime = document.getElementById('hudTime');
        this.hudDate = document.getElementById('hudDate');
        
        this.isRecording = false;
        this.recognition = null;
        this.messages = [];
        this.startTime = Date.now();
        
        this.initHUD();
        this.initBackgroundEffects();
        this.initEventListeners();
        this.initSpeechRecognition();
        this.addWelcomeMessage();
    }
    
    initHUD() {
        // Generate random session ID
        const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
        if (this.sessionIdVal) this.sessionIdVal.textContent = randId;

        // Update clock
        const updateClock = () => {
            const now = new Date();
            if (this.hudTime) this.hudTime.textContent = now.toTimeString().split(' ')[0];
            if (this.hudDate) {
                const options = { day: '2-digit', month: 'short', year: 'numeric' };
                this.hudDate.textContent = now.toLocaleDateString('en-US', options).toUpperCase();
            }
            
            // Update uptime
            const diffMs = Date.now() - this.startTime;
            const diffHrs = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
            const diffMins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
            const diffSecs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
            if (this.uptimeVal) this.uptimeVal.textContent = `${diffHrs}:${diffMins}:${diffSecs}`;

            // Randomly fluctuate Neural & Memory load slightly to feel active
            if (this.neuralFill && Math.random() > 0.8) {
                const newWidth = Math.floor(65 + Math.random() * 20);
                this.neuralFill.style.width = newWidth + '%';
                this.neuralFill.parentElement.nextElementSibling.textContent = newWidth + '%';
            }
            if (this.memFill && Math.random() > 0.9) {
                const newWidth = Math.floor(40 + Math.random() * 10);
                this.memFill.style.width = newWidth + '%';
                this.memFill.parentElement.nextElementSibling.textContent = newWidth + '%';
            }
        };
        setInterval(updateClock, 1000);
        updateClock();
    }

    initBackgroundEffects() {
        // Particle Background
        const canvas = document.getElementById('particleCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.radius = Math.random() * 1.5;
                this.alpha = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                    this.reset();
                }
            }
            draw() {
                ctx.fillStyle = `rgba(0, 212, 255, ${this.alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 60; i++) {
            particles.push(new Particle());
        }

        const animateParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animateParticles);
        };
        animateParticles();

        // Radar simulation
        const radar = document.getElementById('radarCanvas');
        if (radar) {
            const rCtx = radar.getContext('2d');
            let angle = 0;
            const drawRadar = () => {
                const w = radar.width;
                const h = radar.height;
                rCtx.clearRect(0, 0, w, h);
                
                // Draw background circle
                rCtx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
                rCtx.lineWidth = 1;
                rCtx.beginPath();
                rCtx.arc(w/2, h/2, w/2 - 2, 0, Math.PI * 2);
                rCtx.stroke();
                
                rCtx.beginPath();
                rCtx.arc(w/2, h/2, w/4, 0, Math.PI * 2);
                rCtx.stroke();

                // Draw sweep line
                rCtx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
                rCtx.beginPath();
                rCtx.moveTo(w/2, h/2);
                rCtx.lineTo(
                    w/2 + (w/2 - 2) * Math.cos(angle),
                    h/2 + (h/2 - 2) * Math.sin(angle)
                );
                rCtx.stroke();

                angle += 0.04;
                requestAnimationFrame(drawRadar);
            };
            drawRadar();
        }
    }
    
    initEventListeners() {
        this.sendBtn.addEventListener('click', (e) => {
            this.createRipple(e);
            this.sendMessage();
        });
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.messageInput.addEventListener('focus', () => {
            this.messageInput.closest('.input-bar').classList.add('focused');
        });
        this.messageInput.addEventListener('blur', () => {
            this.messageInput.closest('.input-bar').classList.remove('focused');
        });
        this.imageBtn.addEventListener('click', (e) => {
            this.createRipple(e);
            this.fileInput.click();
        });
        this.voiceBtn.addEventListener('click', (e) => {
            this.createRipple(e);
            this.toggleVoiceRecording();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    createRipple(event) {
        const btn = event.currentTarget;
        const ripple = btn.querySelector('.btn-ripple');
        if (!ripple) return;
        
        const rect = btn.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.classList.remove('animate');
        // trigger reflow
        void ripple.offsetWidth;
        ripple.classList.add('animate');
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
            this.addMessage('System online. Awaiting core instruction matrix.', 'bot');
        }, 800);
    }
    
    toggleVoiceRecording() {
        if (!this.recognition) {
            this.addMessage('Voice diagnostics offline. Web speech API unsupported.', 'bot');
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
        }, 800 + Math.random() * 1000);
    }
    
    addMessage(content, sender, imageUrl = null) {
        if (this.welcomeOverlay && !this.welcomeOverlay.classList.contains('hidden')) {
            this.welcomeOverlay.classList.add('hidden');
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Avatar
        const avatar = document.createElement('div');
        if (sender === 'bot') {
            avatar.className = 'bot-avatar';
            avatar.textContent = 'J';
        } else {
            avatar.className = 'user-avatar';
            avatar.textContent = 'U';
        }
        
        const contentWrap = document.createElement('div');
        contentWrap.style.display = 'flex';
        contentWrap.style.flexDirection = 'column';
        contentWrap.style.maxWidth = '100%';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'image-preview';
            bubble.appendChild(img);
        }
        
        if (content) {
            const textDiv = document.createElement('div');
            textDiv.textContent = content;
            bubble.appendChild(textDiv);
        }

        const time = document.createElement('div');
        time.className = 'msg-time';
        time.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        contentWrap.appendChild(bubble);
        contentWrap.appendChild(time);
        
        if (sender === 'bot') {
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(contentWrap);
        } else {
            messageDiv.appendChild(contentWrap);
            messageDiv.appendChild(avatar);
        }
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        this.messages.push({ content, sender, imageUrl, timestamp: new Date() });
        if (this.msgCountVal) this.msgCountVal.textContent = this.messages.length;
    }
    
    async processMessage(message) {
        this.hideTypingIndicator();
        
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
                const fallback = this.generateResponse(message);
                this.addMessage(fallback, 'bot');
            }
        } catch (error) {
            console.error('Error contacting backend:', error);
            const fallback = this.generateResponse(message);
            this.addMessage(fallback, 'bot');
        }
    }
    
    processImageMessage(filename) {
        this.hideTypingIndicator();
        this.addMessage(`Analyzing image file: "${filename}". Connecting to computer vision module...`, 'bot');
    }
    
    generateResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Greetings. JARVIS mainframe initialized and fully responsive. How can I assist you?";
        }
        if (lowerMessage.includes('weather')) {
            return "Connecting to global atmospheric grids... Complete. Please specify a location coordinates.";
        }
        if (lowerMessage.includes('time') || lowerMessage.includes('date')) {
            const now = new Date();
            return `System chronometer reads ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`;
        }
        if (lowerMessage.includes('code') || lowerMessage.includes('programming')) {
            return "Compiler modules ready. Ready to process Python, JavaScript, and other syntax blocks.";
        }
        if (lowerMessage.includes('jarvis') || lowerMessage.includes('who are you')) {
            return "I am J.A.R.V.I.S: Just A Rather Very Intelligent System. An AI designed to optimize tasks.";
        }
        
        const defaultResponses = [
            "Processing query through neural arrays. Awaiting final data packet validation.",
            "Analyzing target parameter details... Standing by with response compilation.",
            "System telemetry looks optimal. Gemini integrations verified.",
            "Data recorded. Running advanced algorithmic processing."
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    
    showTypingIndicator() {
        if (this.typingIndicator) this.typingIndicator.classList.add('visible');
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        if (this.typingIndicator) this.typingIndicator.classList.remove('visible');
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 50);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new JarvisChat();
});