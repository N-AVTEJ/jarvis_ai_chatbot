/* ================================================================
   J.A.R.V.I.S MAINFRAME HUD – Core Logic & Dual Engine Controller
   ================================================================ */

class JarvisAudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playBeep(freq = 880, duration = 0.08, type = 'sine', gainVal = 0.05) {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio Context error:', e);
        }
    }

    playChirp() {
        if (!this.enabled) return;
        this.playBeep(600, 0.04, 'sine', 0.04);
        setTimeout(() => this.playBeep(1200, 0.06, 'sine', 0.04), 40);
    }

    playPulse() {
        if (!this.enabled) return;
        this.playBeep(320, 0.12, 'triangle', 0.06);
    }
}

class JarvisChat {
    constructor() {
        // UI Elements
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.imageBtn = document.getElementById('imageBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.fileInput = document.getElementById('fileInput');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.welcomeOverlay = document.getElementById('welcomeOverlay');
        
        // HUD Stats
        this.msgCountVal = document.getElementById('msgCount');
        this.uptimeVal = document.getElementById('uptimeVal');
        this.sessionIdVal = document.getElementById('sessionId');
        this.neuralFill = document.getElementById('neuralFill');
        this.neuralVal = document.getElementById('neuralVal');
        this.memFill = document.getElementById('memFill');
        this.memVal = document.getElementById('memVal');
        this.hudTime = document.getElementById('hudTime');
        this.hudDate = document.getElementById('hudDate');
        this.apiStatusText = document.getElementById('apiStatusText');
        this.modelDisplayVal = document.getElementById('modelDisplayVal');
        
        // Settings Modal
        this.settingsBtn = document.getElementById('settingsBtn');
        this.soundToggleBtn = document.getElementById('soundToggleBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.modelSelect = document.getElementById('modelSelect');
        this.sfxToggle = document.getElementById('sfxToggle');
        this.voiceSynthToggle = document.getElementById('voiceSynthToggle');

        // Audio Engine & Speech
        this.audio = new JarvisAudioEngine();
        this.speechSynth = window.speechSynthesis || null;
        this.isRecording = false;
        this.recognition = null;

        // App State
        this.messages = [];
        this.startTime = Date.now();
        this.apiKey = localStorage.getItem('jarvis_api_key') || '';
        this.model = localStorage.getItem('jarvis_model') || 'gemini-2.5-flash';
        this.enableVoiceSynth = localStorage.getItem('jarvis_voice_synth') !== 'false';

        this.initMarkdown();
        this.initHUD();
        this.initBackgroundCanvas();
        this.initAudioVisualizer();
        this.initEventListeners();
        this.initSpeechRecognition();
        this.loadSettings();

        // Welcome greeting
        setTimeout(() => this.audio.playChirp(), 600);
    }

    initMarkdown() {
        if (window.marked) {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (window.hljs) {
                        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                        return hljs.highlight(code, { language }).value;
                    }
                    return code;
                },
                breaks: true
            });
        }
    }

    initHUD() {
        const randId = 'JVR-' + Math.floor(1000 + Math.random() * 9000);
        if (this.sessionIdVal) this.sessionIdVal.textContent = randId;

        const updateClock = () => {
            const now = new Date();
            if (this.hudTime) this.hudTime.textContent = now.toTimeString().split(' ')[0];
            if (this.hudDate) {
                const options = { day: '2-digit', month: 'short', year: 'numeric' };
                this.hudDate.textContent = 'SYS ' + now.toLocaleDateString('en-US', options).toUpperCase();
            }

            const diffMs = Date.now() - this.startTime;
            const diffHrs = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
            const diffMins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
            const diffSecs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
            if (this.uptimeVal) this.uptimeVal.textContent = `${diffHrs}:${diffMins}:${diffSecs}`;

            // Subtle neural telemetry fluctuation
            if (Math.random() > 0.82) {
                const load = Math.floor(70 + Math.random() * 22);
                if (this.neuralFill) this.neuralFill.style.width = load + '%';
                if (this.neuralVal) this.neuralVal.textContent = load + '%';
            }
            if (Math.random() > 0.90) {
                const mem = Math.floor(38 + Math.random() * 12);
                if (this.memFill) this.memFill.style.width = mem + '%';
                if (this.memVal) this.memVal.textContent = mem + '%';
            }
        };
        setInterval(updateClock, 1000);
        updateClock();
    }

    initBackgroundCanvas() {
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

        class CyberParticle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 1.8 + 0.5;
                this.alpha = Math.random() * 0.4 + 0.1;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                    this.reset();
                }
            }
            draw() {
                ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#00f0ff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 70; i++) particles.push(new CyberParticle());

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(render);
        };
        render();

        // Radar Canvas Sweep
        const radar = document.getElementById('radarCanvas');
        if (radar) {
            const rCtx = radar.getContext('2d');
            let angle = 0;
            const drawRadar = () => {
                const w = radar.width;
                const h = radar.height;
                const cx = w / 2;
                const cy = h / 2;
                rCtx.clearRect(0, 0, w, h);

                // Grid circles
                rCtx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
                rCtx.lineWidth = 1;
                rCtx.beginPath(); rCtx.arc(cx, cy, cx - 4, 0, Math.PI * 2); rCtx.stroke();
                rCtx.beginPath(); rCtx.arc(cx, cy, cx / 2, 0, Math.PI * 2); rCtx.stroke();

                // Crosshairs
                rCtx.beginPath(); rCtx.moveTo(0, cy); rCtx.lineTo(w, cy); rCtx.stroke();
                rCtx.beginPath(); rCtx.moveTo(cx, 0); rCtx.lineTo(cx, h); rCtx.stroke();

                // Sweep cone line
                rCtx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
                rCtx.lineWidth = 2;
                rCtx.beginPath();
                rCtx.moveTo(cx, cy);
                rCtx.lineTo(cx + (cx - 4) * Math.cos(angle), cy + (cy - 4) * Math.sin(angle));
                rCtx.stroke();

                angle += 0.035;
                requestAnimationFrame(drawRadar);
            };
            drawRadar();
        }
    }

    initAudioVisualizer() {
        const canvas = document.getElementById('audioVisualizerCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let phase = 0;

        const animateWave = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
            ctx.beginPath();

            const isComputing = this.typingIndicator && this.typingIndicator.classList.contains('visible');
            const amp = isComputing ? 8 : 2;

            for (let x = 0; x < w; x += 4) {
                const y = h / 2 + Math.sin(x * 0.05 + phase) * Math.cos(x * 0.02) * amp;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            phase += isComputing ? 0.15 : 0.04;
            requestAnimationFrame(animateWave);
        };
        animateWave();
    }

    initEventListeners() {
        this.sendBtn.addEventListener('click', () => {
            this.audio.playBeep(900, 0.05);
            this.sendMessage();
        });
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.audio.playBeep(900, 0.05);
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('focus', () => {
            const bar = document.getElementById('inputBar');
            if (bar) bar.classList.add('focused');
        });
        this.messageInput.addEventListener('blur', () => {
            const bar = document.getElementById('inputBar');
            if (bar) bar.classList.remove('focused');
        });

        this.imageBtn.addEventListener('click', () => {
            this.audio.playPulse();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        this.voiceBtn.addEventListener('click', () => {
            this.audio.playBeep(750, 0.06);
            this.toggleVoiceRecording();
        });

        this.clearBtn.addEventListener('click', () => {
            this.audio.playPulse();
            this.clearChat();
        });

        // Prompt Chips Click Handlers
        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.currentTarget.getAttribute('data-prompt');
                if (prompt) {
                    this.audio.playChirp();
                    this.messageInput.value = prompt;
                    this.sendMessage();
                }
            });
        });

        // Settings Modal Listeners
        this.settingsBtn.addEventListener('click', () => {
            this.audio.playPulse();
            this.openSettings();
        });
        this.closeSettingsModal.addEventListener('click', () => {
            this.audio.playBeep(500, 0.05);
            this.closeSettings();
        });
        this.saveSettingsBtn.addEventListener('click', () => {
            this.audio.playChirp();
            this.saveSettings();
        });
        this.resetSettingsBtn.addEventListener('click', () => {
            this.audio.playBeep(440, 0.08);
            this.resetSettings();
        });
        this.soundToggleBtn.addEventListener('click', () => {
            this.audio.enabled = !this.audio.enabled;
            this.sfxToggle.checked = this.audio.enabled;
            this.soundToggleBtn.classList.toggle('muted', !this.audio.enabled);
            this.audio.playChirp();
        });
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRec();
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

    toggleVoiceRecording() {
        if (!this.recognition) {
            this.addMessage('Speech recognition is not supported on this browser context.', 'bot');
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
                this.addMessage(`[IMAGE ATTACHMENT: ${file.name}]`, 'user', e.target.result);
                this.processMessage(`Analyze this image file: ${file.name}`);
            };
            reader.readAsDataURL(file);
        }
    }

    clearChat() {
        this.chatContainer.innerHTML = '';
        this.messages = [];
        if (this.msgCountVal) this.msgCountVal.textContent = '0';
        if (this.welcomeOverlay) this.welcomeOverlay.classList.remove('hidden');
    }

    loadSettings() {
        if (this.apiKeyInput) this.apiKeyInput.value = this.apiKey;
        if (this.modelSelect) this.modelSelect.value = this.model;
        if (this.voiceSynthToggle) this.voiceSynthToggle.checked = this.enableVoiceSynth;
        if (this.modelDisplayVal) this.modelDisplayVal.textContent = this.model.toUpperCase();
    }

    openSettings() {
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    saveSettings() {
        this.apiKey = this.apiKeyInput.value.trim();
        this.model = this.modelSelect.value;
        this.audio.enabled = this.sfxToggle.checked;
        this.enableVoiceSynth = this.voiceSynthToggle.checked;

        localStorage.setItem('jarvis_api_key', this.apiKey);
        localStorage.setItem('jarvis_model', this.model);
        localStorage.setItem('jarvis_voice_synth', this.enableVoiceSynth);

        if (this.modelDisplayVal) this.modelDisplayVal.textContent = this.model.toUpperCase();
        this.soundToggleBtn.classList.toggle('muted', !this.audio.enabled);

        this.closeSettings();
        this.addMessage('Mainframe settings updated. All protocols configured to new parameters.', 'bot');
    }

    resetSettings() {
        this.apiKey = '';
        this.model = 'gemini-2.5-flash';
        this.audio.enabled = true;
        this.enableVoiceSynth = true;

        localStorage.removeItem('jarvis_api_key');
        localStorage.removeItem('jarvis_model');
        localStorage.removeItem('jarvis_voice_synth');

        this.loadSettings();
    }

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');
        this.messageInput.value = '';

        this.showTypingIndicator();
        this.processMessage(text);
    }

    addMessage(content, sender, imageUrl = null) {
        if (this.welcomeOverlay && !this.welcomeOverlay.classList.contains('hidden')) {
            this.welcomeOverlay.classList.add('hidden');
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = sender === 'bot' ? 'bot-avatar' : 'user-avatar';
        avatar.textContent = sender === 'bot' ? 'J' : 'U';

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'message-body';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.maxWidth = '240px';
            img.style.borderRadius = '8px';
            img.style.margin = '6px 0';
            img.style.border = '1px solid var(--cyan-border)';
            bubble.appendChild(img);
        }

        if (content) {
            const textContentDiv = document.createElement('div');
            if (sender === 'bot' && window.marked) {
                textContentDiv.innerHTML = marked.parse(content);
                this.attachCodeCopyButtons(textContentDiv);
            } else {
                textContentDiv.textContent = content;
            }
            bubble.appendChild(textContentDiv);
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'msg-time';
        timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bodyDiv.appendChild(bubble);
        bodyDiv.appendChild(timeDiv);

        if (sender === 'bot') {
            msgDiv.appendChild(avatar);
            msgDiv.appendChild(bodyDiv);
        } else {
            msgDiv.appendChild(bodyDiv);
            msgDiv.appendChild(avatar);
        }

        this.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();

        this.messages.push({ content, sender, timestamp: new Date() });
        if (this.msgCountVal) this.msgCountVal.textContent = this.messages.length;

        // Play sound and optionally speak response
        if (sender === 'bot') {
            this.audio.playChirp();
            if (this.enableVoiceSynth && this.speechSynth) {
                this.speakText(content);
            }
        }
    }

    attachCodeCopyButtons(container) {
        const preBlocks = container.querySelectorAll('pre');
        preBlocks.forEach((pre) => {
            const codeEl = pre.querySelector('code');
            if (!codeEl) return;

            const header = document.createElement('div');
            header.className = 'code-header';
            
            const langName = codeEl.className.replace('language-', '') || 'code';
            header.innerHTML = `<span>${langName.toUpperCase()}</span>`;

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.textContent = 'COPY CODE';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeEl.textContent);
                copyBtn.textContent = 'COPIED!';
                this.audio.playChirp();
                setTimeout(() => (copyBtn.textContent = 'COPY CODE'), 2000);
            });

            header.appendChild(copyBtn);
            pre.insertBefore(header, codeEl);
        });
    }

    speakText(text) {
        try {
            this.speechSynth.cancel(); // Stop ongoing speech
            // Clean markdown tags for spoken audio
            const plainText = text.replace(/```[\s\S]*?```/g, 'Code block snippet omitted.')
                                  .replace(/[#*`_~]/g, '');
            const utterance = new SpeechSynthesisUtterance(plainText.substring(0, 250)); // Limit speak duration
            utterance.rate = 1.05;
            utterance.pitch = 0.95;
            this.speechSynth.speak(utterance);
        } catch (e) {
            console.warn('Speech synth error:', e);
        }
    }

    async processMessage(userMessage) {
        // DUAL ENGINE ROUTING ARCHITECTURE:
        // 1. Try Flask Backend (/api/chat)
        // 2. Try Direct Client Gemini REST API (if user set apiKey in HUD settings)
        // 3. Intelligent Cyber Knowledge Base Fallback for offline tech queries (Git, Python, AI, etc.)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: this.messages,
                    model: this.model,
                    apiKey: this.apiKey
                })
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (response.ok && data.response) {
                if (this.apiStatusText) this.apiStatusText.textContent = 'GEMINI API CONNECTED';
                this.addMessage(data.response, 'bot');
                return;
            } else if (data.error) {
                console.warn('Backend returned error:', data.error);
            }
        } catch (error) {
            console.warn('Backend server connection unreached. Falling back to direct API or local engine.', error);
        }

        // FALLBACK 1: Direct Client Gemini API call if apiKey is set
        if (this.apiKey) {
            try {
                const apiRes = await this.callGeminiDirect(userMessage);
                this.hideTypingIndicator();
                if (apiRes) {
                    if (this.apiStatusText) this.apiStatusText.textContent = 'GEMINI CLIENT ACTIVE';
                    this.addMessage(apiRes, 'bot');
                    return;
                }
            } catch (err) {
                console.warn('Direct Gemini API error:', err);
            }
        }

        // FALLBACK 2: Intelligent Cyber Core Knowledge Engine for offline tech queries
        this.hideTypingIndicator();
        if (this.apiStatusText) this.apiStatusText.textContent = 'OFFLINE CYBER ENGINE';
        const offlineReply = this.generateIntelligentResponse(userMessage);
        this.addMessage(offlineReply, 'bot');
    }

    async callGeminiDirect(prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const body = {
            contents: [{
                parts: [{ text: `System Protocol: You are J.A.R.V.I.S, an advanced AI assistant created by Tony Stark. Be sophisticated, precise, helpful, and format code clearly with Markdown.\n\nUser: ${prompt}` }]
            }]
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const json = await res.json();
        if (json.candidates && json.candidates[0].content.parts[0].text) {
            return json.candidates[0].content.parts[0].text;
        }
        return null;
    }

    generateIntelligentResponse(message) {
        const msg = message.toLowerCase();

        // 1. Git and GitHub Detailed Explanation
        if (msg.includes('git') || msg.includes('github')) {
            return `### ⚡ J.A.R.V.I.S Knowledge Matrix: Git vs GitHub

Sir, here is a complete architectural comparison of **Git** and **GitHub**:

#### 1. What is Git?
**Git** is a free, open-source **Distributed Version Control System (DVCS)** installed locally on your machine. It tracks changes in your code codebase over time, allowing you to create snapshots (*commits*), manage feature branches, and rollback history whenever necessary.

*Key Git Commands:*
\`\`\`bash
# Initialize a new repository
git init

# Stage modified files for commit
git add .

# Create a snapshot with message
git commit -m "feat: implement futuristic JARVIS HUD UI"

# Create and switch to a new branch
git checkout -b feature/cyber-hud

# Check status of changed files
git status
\`\`\`

---

#### 2. What is GitHub?
**GitHub** is a cloud-based web hosting service for Git repositories. While Git operates on your computer locally, GitHub allows teams to collaborate remotely, review Pull Requests (PRs), run automated CI/CD pipelines, track issues, and deploy web applications.

*Key Commands to sync with GitHub:*
\`\`\`bash
# Link local repo to remote GitHub repository
git remote add origin https://github.com/username/repository-name.git

# Upload local commits to GitHub remote
git push -u origin main

# Download latest changes from GitHub
git pull origin main
\`\`\`

---

#### Summary Protocol:
- **Git** = The local tool that tracks your code history.
- **GitHub** = The cloud platform where you host, share, and collaborate on Git repositories with others.`;
        }

        // 2. Greetings
        if (msg.includes('hello') || msg.includes('hi') || msg.includes('greetings') || msg.includes('hey')) {
            return "Greetings, Sir. All mainframes are online, telemetry is optimal, and neural link arrays are standing by. How may I assist your operations today?";
        }

        // 3. Programming & Code
        if (msg.includes('python') || msg.includes('code') || msg.includes('programming') || msg.includes('script')) {
            return `### 💻 J.A.R.V.I.S Code Diagnostic Blueprint

Here is a clean Python modular architecture snippet for processing asynchronous streams:

\`\`\`python
import asyncio
import time

class JarvisStreamProcessor:
    def __init__(self, core_id: str):
        self.core_id = core_id
        self.active = True

    async def process_telemetry(self, data_packet: dict):
        """Asynchronously process incoming telemetry data."""
        print(f"[{self.core_id}] Processing packet ID: {data_packet.get('id')}")
        await asyncio.sleep(0.5)
        return {"status": "OPTIMAL", "latency_ms": 12.4}

async def main():
    processor = JarvisStreamProcessor("JARVIS-CORE-01")
    result = await processor.process_telemetry({"id": "PKT-9904", "type": "NEURAL"})
    print("Execution Result:", result)

if __name__ == "__main__":
    asyncio.run(main())
\`\`\`

Feel free to ask me to write, debug, or optimize code in any language!`;
        }

        // 4. Quantum Computing
        if (msg.includes('quantum') || msg.includes('physics')) {
            return `### ⚛️ Quantum Computing Overview

Classical computers encode information into binary **bits** (0 or 1). Quantum computers leverage quantum mechanical phenomena:

1. **Qubits**: Unlike classical bits, qubits can exist in a **superposition** of both |0⟩ and |1⟩ states simultaneously.
2. **Entanglement**: Qubits can be linked such that the state of one instantly influences another, regardless of distance.
3. **Quantum Speedup**: Ideal for complex matrix operations, cryptography factorization, and chemical molecular simulation.`;
        }

        // 5. System Info & Identity
        if (msg.includes('who are you') || msg.includes('jarvis') || msg.includes('system status')) {
            return "I am **J.A.R.V.I.S** (*Just A Rather Very Intelligent System*). Designed to assist Tony Stark and now operating on your local mainframe to streamline development, solve algorithmic problems, and automate operations.";
        }

        // Default Comprehensive Technical Answer
        return `### 🛡️ J.A.R.V.I.S Mainframe Analysis

Sir, I have recorded your query:
> *"_${message}_"*

**System Status Update:**
- **Flask Server Connection:** To enable full live Gemini 2.5 Flash responses, run \`python app.py\` in your terminal or enter your Gemini API Key in the **HUD Settings Modal** (⚙️ button top right).
- **Core Processor:** Ready to execute code generation, debugging, data manipulation, or natural conversational queries.

Please let me know if you would like me to assist with code, system configuration, or general technical questions!`;
    }

    showTypingIndicator() {
        if (this.typingIndicator) this.typingIndicator.classList.add('visible');
        const reactor = document.getElementById('arcReactor');
        if (reactor) reactor.style.filter = 'drop-shadow(0 0 25px #00f0ff)';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (this.typingIndicator) this.typingIndicator.classList.remove('visible');
        const reactor = document.getElementById('arcReactor');
        if (reactor) reactor.style.filter = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 50);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.jarvisApp = new JarvisChat();
});