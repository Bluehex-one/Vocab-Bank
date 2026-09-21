document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('add-word-form');
    const wordInput = document.getElementById('word-input');
    const sectionSelect = document.getElementById('section-select');
    const vocabList = document.getElementById('vocab-list');
    const emptyState = document.getElementById('empty-state');
    const tabsNav = document.getElementById('tabs-nav');
    
    // Settings Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const settingsStatus = document.getElementById('settings-status');

    // DOM Elements Additions
    const tabsContainer = document.getElementById('tabs-container');
    const addFolderBtn = document.getElementById('add-folder-btn');
    
    // Backup Elements
    const exportBtn = document.getElementById('export-backup-btn');
    const importBtn = document.getElementById('import-backup-btn');
    const importFileInput = document.getElementById('import-file-input');

    // Default sections structure
    const defaultStructure = {
        'maths': [],
        'chinese': [],
        'french': [],
        'humanities': [],
        'science': [],
        'digital-technology': []
    };

    // State
    let currentSection = 'maths';
    let vocabulary = JSON.parse(localStorage.getItem('vocabulary-v2'));
    let customDefinitions = JSON.parse(localStorage.getItem('custom-definitions')) || {};
    let activeDefinitions = {}; // Track which cards have definitions open

    // Migration from old array-based storage to object-based storage
    if (!vocabulary) {
        const oldVocab = JSON.parse(localStorage.getItem('vocabulary'));
        if (oldVocab && Array.isArray(oldVocab)) {
            vocabulary = { ...defaultStructure, 'maths': oldVocab };
        } else {
            vocabulary = defaultStructure;
        }
        saveVocabulary();
    } else {
        vocabulary = { ...defaultStructure, ...vocabulary };
    }

    // Initialize
    if (!vocabulary[currentSection]) {
        currentSection = Object.keys(vocabulary)[0];
    }
    renderFolders();
    renderVocabulary();

    // Event Listeners
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const word = wordInput.value.trim().toLowerCase();
        const section = sectionSelect.value;
        
        if (word && !vocabulary[section].includes(word)) {
            vocabulary[section].unshift(word);
            saveVocabulary();
            
            // Switch to the section where the word was added
            switchSection(section);
            wordInput.value = '';
        } else if (vocabulary[section].includes(word)) {
            wordInput.style.animation = 'shake 0.5s';
            setTimeout(() => wordInput.style.animation = '', 500);
        }
    });

    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            const section = e.target.getAttribute('data-section');
            switchSection(section);
            sectionSelect.value = section;
        }
    });

    addFolderBtn.addEventListener('click', () => {
        const folderName = prompt('Enter the name for the new folder:');
        if (folderName && folderName.trim()) {
            const safeId = folderName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
            if (!vocabulary[safeId]) {
                vocabulary[safeId] = [];
                saveVocabulary();
                renderFolders();
                switchSection(safeId);
                sectionSelect.value = safeId;
            } else {
                alert('A folder with that name already exists!');
            }
        }
    });

    sectionSelect.addEventListener('change', (e) => {
        switchSection(e.target.value);
    });

    // Settings logic
    settingsBtn.addEventListener('click', () => {
        apiKeyInput.value = localStorage.getItem('gemini-api-key') || '';
        settingsStatus.classList.add('hidden');
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini-api-key', key);
        } else {
            localStorage.removeItem('gemini-api-key');
        }
        settingsStatus.classList.remove('hidden');
        setTimeout(() => {
            settingsModal.classList.add('hidden');
        }, 1500);
    });

    // Backup & Restore Logic
    exportBtn.addEventListener('click', () => {
        const dataToExport = {
            vocabulary: vocabulary,
            customDefinitions: customDefinitions
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "vocab-vault-backup.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.vocabulary) {
                    vocabulary = importedData.vocabulary;
                    saveVocabulary();
                }
                if (importedData.customDefinitions) {
                    customDefinitions = importedData.customDefinitions;
                    localStorage.setItem('custom-definitions', JSON.stringify(customDefinitions));
                }
                renderFolders();
                currentSection = Object.keys(vocabulary)[0];
                switchSection(currentSection);
                alert("Backup restored successfully!");
                settingsModal.classList.add('hidden');
            } catch (err) {
                alert("Error parsing backup file. Make sure it is a valid Vocab Vault JSON file.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    });

    // Functions
    function saveVocabulary() {
        localStorage.setItem('vocabulary-v2', JSON.stringify(vocabulary));
    }

    function renderFolders() {
        tabsContainer.innerHTML = '';
        sectionSelect.innerHTML = '';
        
        Object.keys(vocabulary).forEach(section => {
            const prettyName = section.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            // Add to tabs
            const tabBtn = document.createElement('button');
            tabBtn.className = `tab-btn ${section === currentSection ? 'active' : ''}`;
            tabBtn.setAttribute('data-section', section);
            tabBtn.textContent = prettyName;
            tabsContainer.appendChild(tabBtn);
            
            // Add to dropdown
            const option = document.createElement('option');
            option.value = section;
            option.textContent = prettyName;
            sectionSelect.appendChild(option);
        });
        sectionSelect.value = currentSection;
    }

    function switchSection(section) {
        currentSection = section;
        
        // Update active tab styling
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-section') === section) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        renderVocabulary();
    }

    function renderVocabulary() {
        vocabList.innerHTML = '';
        const currentWords = vocabulary[currentSection];
        
        if (!currentWords || currentWords.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            currentWords.forEach(word => {
                const card = document.createElement('div');
                card.className = 'word-card glass-panel';
                card.id = `card-${word.replace(/\s+/g, '-')}`;
                
                card.innerHTML = `
                    <div class="word-header">
                        <h3 class="word-title">${word}</h3>
                        <button class="delete-btn" data-word="${word}" title="Delete word">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <button class="define-btn" data-word="${word}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Definition
                    </button>
                    
                    <div class="inline-def-container hidden" id="def-container-${word.replace(/\s+/g, '-')}">
                        <div class="def-loading hidden"><div class="small-spinner"></div> Loading...</div>
                        
                        <div class="def-content-wrapper hidden">
                            <img class="inline-def-image hidden" src="" alt="${word}">
                            <div class="inline-def-content"></div>
                            
                            <div class="manual-def-container" style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                                <button class="btn-secondary toggle-manual-def-btn" style="margin-bottom: 1rem; width: 100%;">✎ Edit Definition</button>
                                <div class="manual-def-form hidden">
                                    <textarea class="custom-textarea manual-def-input" placeholder="Type your own definition here..." rows="3"></textarea>
                                    <button class="btn-primary save-manual-def-btn" style="margin-top: 0.5rem; width: 100%;">Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                const deleteBtn = card.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', () => deleteWord(word));
                
                const defineBtn = card.querySelector('.define-btn');
                defineBtn.addEventListener('click', () => toggleDefinition(word, currentSection, card));
                
                // Manual definition logic within card
                const toggleManualDefBtn = card.querySelector('.toggle-manual-def-btn');
                const manualDefForm = card.querySelector('.manual-def-form');
                const manualDefInput = card.querySelector('.manual-def-input');
                const saveManualDefBtn = card.querySelector('.save-manual-def-btn');
                const contentDiv = card.querySelector('.inline-def-content');
                const imgEl = card.querySelector('.inline-def-image');
                
                toggleManualDefBtn.addEventListener('click', () => {
                    manualDefForm.classList.toggle('hidden');
                    if (!manualDefForm.classList.contains('hidden')) {
                        manualDefInput.value = customDefinitions[word] || '';
                        manualDefInput.focus();
                    }
                });
                
                saveManualDefBtn.addEventListener('click', () => {
                    const def = manualDefInput.value.trim();
                    if (def) {
                        customDefinitions[word] = def;
                    } else {
                        delete customDefinitions[word];
                    }
                    localStorage.setItem('custom-definitions', JSON.stringify(customDefinitions));
                    
                    if (def) {
                        contentDiv.innerHTML = `<strong>(Custom Definition)</strong><br><br>${def}`;
                        imgEl.classList.add('hidden'); // Hide auto image if custom def
                    } else {
                        // Re-fetch automatically
                        activeDefinitions[word] = false; // Force re-fetch
                        toggleDefinition(word, currentSection, card);
                    }
                    manualDefForm.classList.add('hidden');
                });
                
                vocabList.appendChild(card);
            });
        }
    }

    function deleteWord(wordToDelete) {
        vocabulary[currentSection] = vocabulary[currentSection].filter(w => w !== wordToDelete);
        saveVocabulary();
        renderVocabulary();
    }

    async function toggleDefinition(word, section, cardEl) {
        const safeWordId = word.replace(/\s+/g, '-');
        const container = cardEl.querySelector(`#def-container-${safeWordId}`);
        const loading = cardEl.querySelector('.def-loading');
        const contentWrapper = cardEl.querySelector('.def-content-wrapper');
        const contentDiv = cardEl.querySelector('.inline-def-content');
        const imgEl = cardEl.querySelector('.inline-def-image');
        
        // If already open, just close it
        if (activeDefinitions[word]) {
            container.classList.add('hidden');
            activeDefinitions[word] = false;
            return;
        }
        
        // Open it
        container.classList.remove('hidden');
        activeDefinitions[word] = true;
        
        // Helper to set markdown/math HTML
        const setDefinitionHTML = (text, prefixHTML = '') => {
            if (window.marked) {
                contentDiv.innerHTML = prefixHTML + window.marked.parse(text);
            } else {
                contentDiv.innerHTML = prefixHTML + text;
            }
            if (window.MathJax) {
                window.MathJax.typesetPromise([contentDiv]).catch(err => console.error(err));
            }
        };
        
        // If there's a custom definition, show it immediately
        if (customDefinitions[word]) {
            contentWrapper.classList.remove('hidden');
            loading.classList.add('hidden');
            setDefinitionHTML(customDefinitions[word], '<strong>(Custom Definition)</strong><br><br>');
            imgEl.classList.add('hidden');
            return;
        }
        
        // Fetch from API
        loading.classList.remove('hidden');
        contentWrapper.classList.add('hidden');
        imgEl.classList.add('hidden');
        
        async function fetchGeminiDefinition(word, section, apiKey) {
            const prompt = `Write a short dictionary definition for the word '${word}' in the context of ${section}. Make it clear and concise, maximum 2 sentences.`;
            const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
            
            let modelName = localStorage.getItem('gemini-model-name-v2') || 'models/gemini-3.6-flash';
            if (!modelName.startsWith('models/')) modelName = 'models/' + modelName;

            let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            });

            if (!response.ok) {
                let errorData = {};
                try { errorData = await response.clone().json(); } catch(e){}
                
                const isNotFound = response.status === 404 || (errorData.error && errorData.error.message && errorData.error.message.includes('not found'));
                
                if (isNotFound) {
                    // Auto-discover models
                    const modelsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    if (modelsResp.ok) {
                        const modelsData = await modelsResp.json();
                        const validModel = modelsData.models.find(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent') && m.name.includes('gemini'));
                        
                        if (validModel) {
                            modelName = validModel.name;
                            localStorage.setItem('gemini-model-name-v2', modelName);
                            // Retry with valid model
                            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: body
                            });
                        } else {
                            const available = modelsData.models ? modelsData.models.map(m=>m.name).join(', ') : 'None';
                            throw new Error(`No compatible text-generation models found for your API key. Available models: ${available}`);
                        }
                    }
                }
            }

            if (!response.ok) {
                let errorMessage = 'API Error';
                try {
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.message) {
                        errorMessage = errorData.error.message;
                    }
                } catch (e) {
                    errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('No valid response from model');
            }
        }

        try {
            const apiKey = localStorage.getItem('gemini-api-key');
            
            if (apiKey) {
                // Use auto-discovering Gemini API
                const definitionText = await fetchGeminiDefinition(word, section, apiKey);
                const aiBadge = `<span class="ai-badge" style="font-size: 0.7rem; margin-right: 0.5rem; padding: 0.1rem 0.4rem; vertical-align: top;">AI</span>`;
                setDefinitionHTML(definitionText, aiBadge);
            } else {
                // Fallback to Wikipedia API
                let lang = 'en';
                if (section === 'chinese') lang = 'zh';
                if (section === 'french') lang = 'fr';

                const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
                
                if (!response.ok) {
                    throw new Error('Not found');
                }
                
                const data = await response.json();
                
                if (data.extract) {
                    setDefinitionHTML(data.extract);
                    
                    // Show image if available!
                    if (data.thumbnail && data.thumbnail.source) {
                        imgEl.src = data.thumbnail.source;
                        imgEl.classList.remove('hidden');
                    }
                } else {
                    throw new Error('No extract');
                }
            }

        } catch (error) {
            console.error(error);
            const apiKey = localStorage.getItem('gemini-api-key');
            if (apiKey) {
                setDefinitionHTML(`The Gemini API failed to respond properly. Error: ${error.message}. Please double check your API key in the settings.`, `<em style="color: #ef4444;">(API Error)</em> <br><br>`);
            } else {
                setDefinitionHTML(`As an AI, I understand that **"${word}"** is a vocabulary term in your ${section} studies, but I couldn't find a good automatic definition for it. You can manually edit the definition below!`, `<em>(No automatic definition found)</em> <br><br>`);
            }
        } finally {
            loading.classList.add('hidden');
            contentWrapper.classList.remove('hidden');
        }
    }
});
