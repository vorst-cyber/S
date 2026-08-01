class AIPribadi {
    constructor() {
        // DOM Elements
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.menuToggle = document.getElementById('menuToggle');
        this.sidebar = document.getElementById('sidebar');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.historyList = document.getElementById('historyList');
        this.apiStatus = document.getElementById('apiStatus');
        this.modelBadge = document.getElementById('modelBadge');
        this.clearChatBtn = document.getElementById('clearChatBtn');

        // Modal Elements
        this.settingsModal = document.getElementById('settingsModal');
        this.modalClose = document.getElementById('modalClose');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalSave = document.getElementById('modalSave');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.customPromptInput = document.getElementById('customPromptInput');
        this.modelSelect = document.getElementById('modelSelect');
        this.temperatureInput = document.getElementById('temperatureInput');
        this.temperatureValue = document.getElementById('temperatureValue');
        this.toggleVisibility = document.getElementById('toggleVisibility');
        this.useProxyCheck = document.getElementById('useProxyCheck');
        this.maxTokensInput = document.getElementById('maxTokensInput');
        this.maxTokensValue = document.getElementById('maxTokensValue');
        this.clearAllDataBtn = document.getElementById('clearAllDataBtn');

        // State
        this.apiKey = localStorage.getItem('ai_api_key') || '';
        this.customPrompt = localStorage.getItem('ai_custom_prompt') || 'Kamu adalah asisten AI yang ramah, profesional, dan membantu. Berikan jawaban yang jelas dan informatif.';
        this.model = localStorage.getItem('ai_model') || 'gemini-1.5-flash';
        this.temperature = parseFloat(localStorage.getItem('ai_temperature')) || 0.7;
        this.maxTokens = parseInt(localStorage.getItem('ai_max_tokens')) || 2048;
        this.useProxy = localStorage.getItem('use_proxy') === 'true' || true;
        this.messages = [];
        this.isProcessing = false;
        this.currentChatId = Date.now().toString();
        this.chatHistory = JSON.parse(localStorage.getItem('chat_history')) || {};

        this.init();
    }

    init() {
        this.loadSettings();
        this.loadChatHistory();
        this.bindEvents();
        this.updateAPIStatus();
        this.updateModelBadge();
        this.adjustTextareaHeight();
        this.checkAPIHealth();
    }

    bindEvents() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.userInput.addEventListener('input', () => this.adjustTextareaHeight());

        // New chat
        this.newChatBtn.addEventListener('click', () => this.newChat());

        // Clear chat
        this.clearChatBtn.addEventListener('click', () => this.clearCurrentChat());

        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.modalClose.addEventListener('click', () => this.closeSettings());
        this.modalCancel.addEventListener('click', () => this.closeSettings());
        this.modalSave.addEventListener('click', () => this.saveSettings());

        // Clear all data
        this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());

        // Toggle visibility
        this.toggleVisibility.addEventListener('click', () => {
            const input = this.apiKeyInput;
            if (input.type === 'password') {
                input.type = 'text';
                this.toggleVisibility.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                input.type = 'password';
                this.toggleVisibility.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });

        // Temperature slider
        this.temperatureInput.addEventListener('input', () => {
            this.temperatureValue.textContent = this.temperatureInput.value;
        });

        // Max tokens slider
        this.maxTokensInput.addEventListener('input', () => {
            this.maxTokensValue.textContent = this.maxTokensInput.value;
        });

        // Menu toggle
        this.menuToggle.addEventListener('click', () => {
            this.sidebar.classList.toggle('open');
        });

        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!this.sidebar.contains(e.target) && e.target !== this.menuToggle) {
                    this.sidebar.classList.remove('open');
                }
            }
        });

        // Close modal on overlay click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
    }

    async checkAPIHealth() {
        if (this.apiKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
                const response = await fetch(url);
                if (response.ok) {
                    this.updateAPIStatus(true);
                } else if (response.status === 403) {
                    this.updateAPIStatus(false, 'blocked');
                    this.showToast('⚠️ API Gemini terblokir. Aktifkan proxy atau gunakan VPN.', 'warning');
                }
            } catch (error) {
                console.log('API health check failed:', error);
            }
        }
    }

    async sendMessage() {
        const text = this.userInput.value.trim();
        if (!text || this.isProcessing) return;

        if (!this.apiKey) {
            this.showToast('Silakan masukkan API Key di pengaturan terlebih dahulu', 'warning');
            this.openSettings();
            return;
        }

        this.addMessage('user', text);
        this.userInput.value = '';
        this.adjustTextareaHeight();

        this.showTyping(true);
        this.isProcessing = true;
        this.sendBtn.disabled = true;
        this.sendBtn.classList.add('loading');

        try {
            let response;
            if (this.useProxy) {
                response = await this.callGeminiAPIWithProxy(text);
            } else {
                response = await this.callGeminiAPI(text);
            }
            this.addMessage('bot', response);
            this.saveChatToHistory(text, response);
        } catch (error) {
            console.error('Error:', error);
            let errorMessage = '❌ Maaf, terjadi kesalahan. ';
            
            if (error.message.includes('blocked') || error.message.includes('403')) {
                errorMessage += 'API Gemini terblokir di wilayah Anda. ';
                errorMessage += 'Silakan aktifkan "CORS Proxy" di pengaturan atau gunakan VPN.';
            } else if (error.message.includes('API key')) {
                errorMessage += 'API Key tidak valid. Periksa kembali API Key Anda.';
            } else if (error.message.includes('fetch')) {
                errorMessage += 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
            } else {
                errorMessage += error.message;
            }
            
            this.addMessage('bot', this.formatResponse(errorMessage));
        } finally {
            this.showTyping(false);
            this.isProcessing = false;
            this.sendBtn.disabled = false;
            this.sendBtn.classList.remove('loading');
            this.userInput.focus();
        }
    }

    async callGeminiAPI(userMessage) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const contents = this.buildMessages(userMessage);

        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: this.temperature,
                maxOutputTokens: this.maxTokens,
                topK: 40,
                topP: 0.95,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        if (this.customPrompt) {
            requestBody.system_instruction = {
                parts: [{ text: this.customPrompt }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error?.message || 'API request failed';
            
            if (response.status === 403 || errorMsg.includes('blocked')) {
                throw new Error('API blocked - Please enable proxy or use VPN');
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak bisa memberikan jawaban.';
        return this.formatResponse(responseText);
    }

    async callGeminiAPIWithProxy(userMessage) {
        const proxyUrls = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/'
        ];

        for (const proxyUrl of proxyUrls) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
                const contents = this.buildMessages(userMessage);

                const requestBody = {
                    contents: contents,
                    generationConfig: {
                        temperature: this.temperature,
                        maxOutputTokens: this.maxTokens,
                        topK: 40,
                        topP: 0.95,
                    }
                };

                if (this.customPrompt) {
                    requestBody.system_instruction = {
                        parts: [{ text: this.customPrompt }]
                    };
                }

                const response = await fetch(proxyUrl + encodeURIComponent(url), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const data = await response.json();
                    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak bisa memberikan jawaban.';
                    return this.formatResponse(responseText);
                }
            } catch (error) {
                console.log(`Proxy ${proxyUrl} failed:`, error);
                continue;
            }
        }

        // If all proxies fail, try direct as fallback
        try {
            return await this.callGeminiAPI(userMessage);
        } catch (error) {
            return this.generateOfflineResponse(userMessage);
        }
    }

    buildMessages(userMessage) {
        const contents = [
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

        const historyMessages = this.messages.slice(-10);
        for (const msg of historyMessages) {
            if (msg.role === 'user' || msg.role === 'bot') {
                contents.unshift({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            }
        }

        return contents;
    }

    generateOfflineResponse(userMessage) {
        const responses = [
            "⚠️ **API Tidak Tersedia**\n\n" +
            "Maaf, API Gemini sedang tidak dapat diakses. 🔒\n\n" +
            "💡 **Solusi:**\n" +
            "1. Aktifkan **CORS Proxy** di pengaturan\n" +
            "2. Gunakan **VPN**\n" +
            "3. Periksa **koneksi internet**\n\n" +
            "Saya siap membantu Anda segera setelah koneksi pulih! 🙏",

            "🌐 **Koneksi Gagal**\n\n" +
            "Tidak dapat terhubung ke server AI. Kemungkinan API diblokir.\n\n" +
            "**Cara Mengatasi:**\n" +
            "• Nyalakan VPN\n" +
            "• Aktifkan proxy di pengaturan\n" +
            "• Coba gunakan jaringan lain\n\n" +
            "Mohon tunggu dan coba lagi! 😊"
        ];

        return this.formatResponse(responses[Math.floor(Math.random() * responses.length)]);
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = content;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        this.messages.push({ role, content });

        // Add copy buttons to code blocks
        setTimeout(() => {
            this.addCopyButtonsToCodeBlocks();
        }, 100);
    }

    formatResponse(text) {
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, (match, code) => {
                return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
            })
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>')
            .replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        formatted = formatted.replace(/(<li>.*?<\/li>)/gs, (match) => {
            return `<ul>${match}</ul>`;
        });
        formatted = formatted.replace(/<\/ul><ul>/g, '');

        if (!formatted.startsWith('<')) {
            formatted = `<p>${formatted}</p>`;
        }

        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addCopyButtonsToCodeBlocks() {
        document.querySelectorAll('pre').forEach(pre => {
            if (!pre.querySelector('.copy-code-btn')) {
                const btn = document.createElement('button');
                btn.className = 'copy-code-btn';
                btn.innerHTML = '📋 Salin';
                btn.onclick = () => this.copyCodeBlock(btn);
                pre.style.position = 'relative';
                pre.appendChild(btn);
            }
        });
    }

    copyCodeBlock(button) {
        const pre = button.closest('pre');
        const code = pre.querySelector('code');
        if (code) {
            navigator.clipboard.writeText(code.textContent).then(() => {
                button.textContent = '✅ Disalin';
                setTimeout(() => {
                    button.textContent = '📋 Salin';
                }, 2000);
            }).catch(() => {
                const range = document.createRange();
                range.selectNode(code);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                document.execCommand('copy');
                button.textContent = '✅ Disalin';
                setTimeout(() => {
                    button.textContent = '📋 Salin';
                }, 2000);
            });
        }
    }

    showTyping(show) {
        this.typingIndicator.classList.toggle('active', show);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    adjustTextareaHeight() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }

    newChat() {
        if (this.messages.length > 0 && !confirm('Buat chat baru? Chat saat ini akan tersimpan.')) {
            return;
        }
        
        this.saveChatToHistory();
        this.chatMessages.innerHTML = `
            <div class="message bot-message welcome-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <p>Halo! Saya adalah AI Pribadi Anda. 👋</p>
                    <p>Saya siap membantu Anda dengan berbagai pertanyaan. Silakan tanyakan apa saja!</p>
                    <p class="hint-text">💡 Tips: Anda bisa mengatur prompt custom di pengaturan.</p>
                    <p class="hint-text">🔑 Masukkan API Key di pengaturan untuk memulai.</p>
                    <p class="hint-text">🌐 Jika API diblokir, aktifkan proxy di pengaturan.</p>
                </div>
            </div>
        `;
        this.messages = [];
        this.currentChatId = Date.now().toString();
        this.userInput.focus();
        this.renderHistory();
    }

    clearCurrentChat() {
        if (this.messages.length === 0) return;
        if (confirm('Hapus semua pesan di chat ini?')) {
            this.newChat();
            this.showToast('Chat dibersihkan', 'info');
        }
    }

    clearAllData() {
        if (confirm('⚠️ Yakin ingin menghapus SEMUA data?\n\nIni akan menghapus:\n- Semua riwayat chat\n- API Key\n- Custom Prompt\n- Semua pengaturan')) {
            localStorage.clear();
            this.chatHistory = {};
            this.apiKey = '';
            this.customPrompt = 'Kamu adalah asisten AI yang ramah, profesional, dan membantu. Berikan jawaban yang jelas dan informatif.';
            this.model = 'gemini-1.5-flash';
            this.temperature = 0.7;
            this.maxTokens = 2048;
            this.useProxy = true;
            this.messages = [];
            this.currentChatId = Date.now().toString();
            
            this.newChat();
            this.updateAPIStatus();
            this.updateModelBadge();
            this.showToast('✅ Semua data berhasil dihapus', 'success');
            this.closeSettings();
        }
    }

    saveChatToHistory(userMessage, botResponse) {
        if (!userMessage && !botResponse) return;

        let chat = this.chatHistory[this.currentChatId];
        if (!chat) {
            chat = {
                id: this.currentChatId,
                title: userMessage ? userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '') : 'Chat Baru',
                messages: [],
                timestamp: Date.now()
            };
        }

        if (userMessage) {
            chat.messages.push({ role: 'user', content: userMessage });
        }
        if (botResponse) {
            chat.messages.push({ role: 'bot', content: botResponse });
        }

        if (chat.messages.length === 2 && userMessage) {
            chat.title = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
        }

        this.chatHistory[this.currentChatId] = chat;
        localStorage.setItem('chat_history', JSON.stringify(this.chatHistory));
        this.renderHistory();
    }

    loadChatHistory() {
        this.chatHistory = JSON.parse(localStorage.getItem('chat_history')) || {};
        this.renderHistory();

        const chatIds = Object.keys(this.chatHistory);
        if (chatIds.length > 0) {
            const lastChat = this.chatHistory[chatIds[chatIds.length - 1]];
            this.loadChat(lastChat.id);
        }
    }

    loadChat(chatId) {
        const chat = this.chatHistory[chatId];
        if (!chat) return;

        this.currentChatId = chatId;
        this.messages = [];
        this.chatMessages.innerHTML = '';

        for (const msg of chat.messages) {
            const content = msg.role === 'bot' ? this.formatResponse(msg.content) : msg.content;
            this.addMessage(msg.role, content);
        }

        if (chat.messages.length === 0) {
            this.chatMessages.innerHTML = `
                <div class="message bot-message welcome-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>Halo! Saya adalah AI Pribadi Anda. 👋</p>
                        <p>Saya siap membantu Anda dengan berbagai pertanyaan. Silakan tanyakan apa saja!</p>
                    </div>
                </div>
            `;
        }

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        this.renderHistory();
    }

    deleteChat(chatId, event) {
        event.stopPropagation();
        if (confirm('Hapus chat ini?')) {
            delete this.chatHistory[chatId];
            localStorage.setItem('chat_history', JSON.stringify(this.chatHistory));
            this.renderHistory();

            if (this.currentChatId === chatId) {
                const chatIds = Object.keys(this.chatHistory);
                if (chatIds.length > 0) {
                    this.loadChat(chatIds[chatIds.length - 1]);
                } else {
                    this.newChat();
                }
            }
        }
    }

    renderHistory() {
        const chatIds = Object.keys(this.chatHistory).sort((a, b) => {
            return this.chatHistory[b].timestamp - this.chatHistory[a].timestamp;
        });

        if (chatIds.length === 0) {
            this.historyList.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px 0;">
                    <i class="fas fa-comment" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    Belum ada chat
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = chatIds.map(id => {
            const chat = this.chatHistory[id];
            const isActive = id === this.currentChatId;
            return `
                <div class="history-item ${isActive ? 'active' : ''}" 
                     style="${isActive ? 'background: var(--bg-input);' : ''}"
                     data-chat-id="${id}">
                    <i class="fas fa-comment history-icon"></i>
                    <span class="history-text">${chat.title || 'Chat Baru'}</span>
                    <button class="history-delete" data-chat-id="${id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        this.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                this.loadChat(chatId);
                this.sidebar.classList.remove('open');
            });

            const deleteBtn = item.querySelector('.history-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    const chatId = deleteBtn.dataset.chatId;
                    this.deleteChat(chatId, e);
                });
            }
        });
    }

    openSettings() {
        this.apiKeyInput.value = this.apiKey;
        this.customPromptInput.value = this.customPrompt;
        this.modelSelect.value = this.model;
        this.temperatureInput.value = this.temperature;
        this.temperatureValue.textContent = this.temperature;
        this.useProxyCheck.checked = this.useProxy;
        this.maxTokensInput.value = this.maxTokens;
        this.maxTokensValue.textContent = this.maxTokens;
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    saveSettings() {
        const apiKey = this.apiKeyInput.value.trim();
        const customPrompt = this.customPromptInput.value.trim();
        const model = this.modelSelect.value;
        const temperature = parseFloat(this.temperatureInput.value);
        const useProxy = this.useProxyCheck.checked;
        const maxTokens = parseInt(this.maxTokensInput.value);

        if (apiKey) {
            this.apiKey = apiKey;
            localStorage.setItem('ai_api_key', apiKey);
        }

        this.customPrompt = customPrompt || 'Kamu adalah asisten AI yang ramah, profesional, dan membantu. Berikan jawaban yang jelas dan informatif.';
        localStorage.setItem('ai_custom_prompt', this.customPrompt);

        this.model = model;
        localStorage.setItem('ai_model', model);

        this.temperature = temperature;
        localStorage.setItem('ai_temperature', temperature.toString());

        this.useProxy = useProxy;
        localStorage.setItem('use_proxy', useProxy.toString());

        this.maxTokens = maxTokens;
        localStorage.setItem('ai_max_tokens', maxTokens.toString());

        this.updateAPIStatus();
        this.updateModelBadge();
        this.closeSettings();
        this.showToast('✅ Pengaturan berhasil disimpan!', 'success');
    }

    loadSettings() {
        this.apiKey = localStorage.getItem('ai_api_key') || '';
        this.customPrompt = localStorage.getItem('ai_custom_prompt') || 'Kamu adalah asisten AI yang ramah, profesional, dan membantu. Berikan jawaban yang jelas dan informatif.';
        this.model = localStorage.getItem('ai_model') || 'gemini-1.5-flash';
        this.temperature = parseFloat(localStorage.getItem('ai_temperature')) || 0.7;
        this.useProxy = localStorage.getItem('use_proxy') === 'true' || true;
        this.maxTokens = parseInt(localStorage.getItem('ai_max_tokens')) || 2048;
    }

    updateAPIStatus(connected = false, status = '') {
        const statusEl = this.apiStatus;
        if (connected) {
            statusEl.className = 'api-status connected';
            statusEl.innerHTML = '<i class="fas fa-circle"></i> API: Terhubung';
        } else if (status === 'blocked') {
            statusEl.className = 'api-status blocked';
            statusEl.innerHTML = '<i class="fas fa-circle"></i> API: Diblokir ⚠️';
        } else if (this.apiKey) {
            statusEl.className = 'api-status connected';
            statusEl.innerHTML = '<i class="fas fa-circle"></i> API: Terhubung';
        } else {
            statusEl.className = 'api-status disconnected';
            statusEl.innerHTML = '<i class="fas fa-circle"></i> API: Belum Terhubung';
        }
    }

    updateModelBadge() {
        const modelNames = {
            'gemini-1.5-flash': '⚡ Gemini 1.5 Flash',
            'gemini-1.5-pro': '🎯 Gemini 1.5 Pro',
            'gemini-1.0-pro': '📊 Gemini 1.0 Pro'
        };
        this.modelBadge.textContent = modelNames[this.model] || this.model;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new AIPribadi();
});