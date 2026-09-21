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
    const subfoldersContainer = document.getElementById('subfolders-container');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const subfolderButtons = document.getElementById('subfolder-buttons');
    const addSubfolderBtn = document.getElementById('add-subfolder-btn');
    const deleteFolderBtn = document.getElementById('delete-folder-btn');
    const exportFolderBtn = document.getElementById('export-folder-btn');
    
    // Dialog Elements
    const customDialog = document.getElementById('custom-dialog-modal');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogInput = document.getElementById('dialog-input');
    const dialogCancelBtn = document.getElementById('dialog-cancel-btn');
    const dialogConfirmBtn = document.getElementById('dialog-confirm-btn');
    
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
    let aiDefinitions = JSON.parse(localStorage.getItem('ai-definitions')) || {};
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
    
    // Migration for aiDefinitions (string to object)
    Object.keys(aiDefinitions).forEach(key => {
        if (typeof aiDefinitions[key] === 'string') {
            aiDefinitions[key] = { text: aiDefinitions[key], img: null };
        }
    });
    localStorage.setItem('ai-definitions', JSON.stringify(aiDefinitions));

    function showCustomDialog({ title, message = '', isInput = false, confirmText = 'Confirm', danger = false }, callback) {
        dialogTitle.textContent = title;
        
        if (message) {
            dialogMessage.textContent = message;
            dialogMessage.classList.remove('hidden');
        } else {
            dialogMessage.classList.add('hidden');
        }
        
        if (isInput) {
            dialogInput.classList.remove('hidden');
            dialogInput.value = '';
            dialogInput.focus();
        } else {
            dialogInput.classList.add('hidden');
        }
        
        dialogConfirmBtn.textContent = confirmText;
        if (danger) {
            dialogConfirmBtn.className = 'btn-danger';
        } else {
            dialogConfirmBtn.className = 'btn-primary';
        }
        
        customDialog.classList.remove('hidden');
        
        // Remove old event listeners
        const newConfirmBtn = dialogConfirmBtn.cloneNode(true);
        dialogConfirmBtn.parentNode.replaceChild(newConfirmBtn, dialogConfirmBtn);
        const newCancelBtn = dialogCancelBtn.cloneNode(true);
        dialogCancelBtn.parentNode.replaceChild(newCancelBtn, dialogCancelBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            const val = isInput ? dialogInput.value : true;
            customDialog.classList.add('hidden');
            callback(val);
        });
        
        newCancelBtn.addEventListener('click', () => {
            customDialog.classList.add('hidden');
            callback(null);
        });
        
        // Setup Enter key for input
        if (isInput) {
            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    newConfirmBtn.click();
                    dialogInput.removeEventListener('keydown', handleEnter);
                }
            };
            dialogInput.addEventListener('keydown', handleEnter);
        }
    }

    // Initialize
    if (!vocabulary[currentSection]) {
        currentSection = Object.keys(vocabulary)[0] || 'maths';
        if (!vocabulary[currentSection]) vocabulary[currentSection] = [];
    }
    renderFolders();
    switchSection(currentSection); // initializes subfolders, breadcrumbs, vocabulary

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
    
    subfolderButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('subfolder-btn')) {
            const section = e.target.getAttribute('data-section');
            switchSection(section);
            sectionSelect.value = section;
        }
    });
    
    breadcrumbs.addEventListener('click', (e) => {
        if (e.target.classList.contains('breadcrumb-link')) {
            const section = e.target.getAttribute('data-section');
            switchSection(section);
            sectionSelect.value = section;
        }
    });

    addFolderBtn.addEventListener('click', () => {
        showCustomDialog({
            title: 'New Root Folder',
            isInput: true
        }, (folderName) => {
            if (folderName && folderName.trim()) {
                const safeId = folderName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
                if (!vocabulary[safeId]) {
                    vocabulary[safeId] = [];
                    saveVocabulary();
                    renderFolders();
                    switchSection(safeId);
                    sectionSelect.value = safeId;
                } else {
                    showCustomDialog({ title: 'Error', message: 'A folder with that name already exists!' }, () => {});
                }
            }
        });
    });
    
    addSubfolderBtn.addEventListener('click', () => {
        showCustomDialog({
            title: 'New Subfolder',
            isInput: true
        }, (folderName) => {
            if (folderName && folderName.trim()) {
                const safeId = folderName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
                const newPath = `${currentSection}/${safeId}`;
                if (!vocabulary[newPath]) {
                    vocabulary[newPath] = [];
                    saveVocabulary();
                    renderFolders();
                    switchSection(newPath);
                    sectionSelect.value = newPath;
                } else {
                    showCustomDialog({ title: 'Error', message: 'A subfolder with that name already exists here!' }, () => {});
                }
            }
        });
    });
    
    deleteFolderBtn.addEventListener('click', () => {
        showCustomDialog({
            title: 'Delete Folder',
            message: `Are you sure you want to delete "${formatSegmentToPrettyName(currentSection.split('/').pop())}" and ALL of its subfolders and words? This cannot be undone.`,
            confirmText: 'Delete',
            danger: true
        }, (confirmDelete) => {
            if (confirmDelete) {
                const pathsToDelete = Object.keys(vocabulary).filter(p => p === currentSection || p.startsWith(currentSection + '/'));
                pathsToDelete.forEach(p => delete vocabulary[p]);
                
                if (Object.keys(vocabulary).length === 0) {
                    vocabulary = { 'maths': [] };
                }
                
                saveVocabulary();
                renderFolders();
                currentSection = Object.keys(vocabulary)[0];
                switchSection(currentSection);
                sectionSelect.value = currentSection;
            }
        });
    });

    exportFolderBtn.addEventListener('click', () => {
        // Filter everything for current folder tree
        const folderVocab = {};
        const folderCustomDef = {};
        const folderAiDef = {};
        
        const pathsToExport = Object.keys(vocabulary).filter(p => p === currentSection || p.startsWith(currentSection + '/'));
        
        pathsToExport.forEach(p => {
            folderVocab[p] = vocabulary[p];
            vocabulary[p].forEach(word => {
                if (customDefinitions[word]) folderCustomDef[word] = customDefinitions[word];
                if (aiDefinitions[word]) folderAiDef[word] = aiDefinitions[word];
            });
        });
        
        const dataToExport = {
            vocabulary: folderVocab,
            customDefinitions: folderCustomDef,
            aiDefinitions: folderAiDef
        };
        
        const safeName = currentSection.replace(/\//g, '-');
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `vocab-vault-${safeName}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
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
            customDefinitions: customDefinitions,
            aiDefinitions: aiDefinitions
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "vocab-vault-backup.json");
        document.body.appendChild(downloadAnchorNode);
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
                if (importedData.aiDefinitions) {
                    aiDefinitions = importedData.aiDefinitions;
                    localStorage.setItem('ai-definitions', JSON.stringify(aiDefinitions));
                }
                renderFolders();
                currentSection = Object.keys(vocabulary)[0] || 'maths';
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
    
    function formatPathToPrettyName(path) {
        return path.split('/').map(segment => 
            segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        ).join(' > ');
    }
    
    function formatSegmentToPrettyName(segment) {
        return segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function renderFolders() {
        tabsContainer.innerHTML = '';
        sectionSelect.innerHTML = '';
        
        const paths = Object.keys(vocabulary);
        
        // Render top level tabs (no slashes)
        paths.filter(p => !p.includes('/')).forEach(section => {
            const prettyName = formatSegmentToPrettyName(section);
            const tabBtn = document.createElement('button');
            
            // Check if currentSection is this root or a child of this root
            const isActive = currentSection === section || currentSection.startsWith(section + '/');
            
            tabBtn.className = `tab-btn ${isActive ? 'active' : ''}`;
            tabBtn.setAttribute('data-section', section);
            tabBtn.textContent = prettyName;
            tabsContainer.appendChild(tabBtn);
        });
        
        // Render dropdown (all paths)
        paths.forEach(section => {
            const prettyName = formatPathToPrettyName(section);
            const option = document.createElement('option');
            option.value = section;
            option.textContent = prettyName;
            sectionSelect.appendChild(option);
        });
        sectionSelect.value = currentSection;
    }
    
    function renderSubfolders() {
        subfoldersContainer.classList.remove('hidden');
        breadcrumbs.innerHTML = '';
        subfolderButtons.innerHTML = '';
        
        // Generate breadcrumbs
        const parts = currentSection.split('/');
        let crumbPath = '';
        parts.forEach((part, index) => {
            crumbPath += (index === 0 ? part : '/' + part);
            const isLast = index === parts.length - 1;
            const prettyName = formatSegmentToPrettyName(part);
            
            if (isLast) {
                breadcrumbs.innerHTML += `<span>${prettyName}</span>`;
            } else {
                breadcrumbs.innerHTML += `<span class="breadcrumb-link" data-section="${crumbPath}">${prettyName}</span> <span>&gt;</span> `;
            }
        });
        
        // Find direct children
        const children = Object.keys(vocabulary).filter(p => p.startsWith(currentSection + '/') && p.split('/').length === parts.length + 1);
        
        if (children.length > 0) {
            children.forEach(child => {
                const childSegment = child.split('/').pop();
                const btn = document.createElement('button');
                btn.className = 'subfolder-btn';
                btn.setAttribute('data-section', child);
                
                // Check if it has its own children
                const hasGrandchildren = Object.keys(vocabulary).some(p => p.startsWith(child + '/'));
                const icon = hasGrandchildren ? '📁 ' : '📂 ';
                
                btn.textContent = icon + formatSegmentToPrettyName(childSegment);
                subfolderButtons.appendChild(btn);
            });
        } else {
            subfolderButtons.innerHTML = '<em style="color: var(--text-muted); font-size: 0.85rem;">No subfolders</em>';
        }
    }

    function switchSection(section) {
        currentSection = section;
        renderFolders(); // Updates active tab highlight
        renderSubfolders();
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                    </div>
                    
                    <button class="define-btn" data-word="${word}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Definition
                    </button>
                    
                    <div class="inline-def-container hidden" id="def-container-${word.replace(/\s+/g, '-')}">
                        <div class="def-toggles hidden">
                            <button class="def-toggle-btn ai-toggle-btn active">AI Definition</button>
                            <button class="def-toggle-btn custom-toggle-btn">Custom Definition</button>
                        </div>
                        
                        <div class="def-loading hidden"><div class="small-spinner"></div> Loading...</div>
                        
                        <div class="def-content-wrapper hidden">
                            <div class="ai-def-view">
                                <img class="inline-def-image hidden" src="" alt="${word}" style="width: 100%; max-width: 300px; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                                <div class="inline-def-content"></div>
                                <button class="btn-secondary tune-ai-btn" style="margin-top: 1rem; width: 100%; font-size: 0.85rem; padding: 0.5rem;">✨ Tune AI Definition</button>
                            </div>
                            
                            <div class="custom-def-view hidden" style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                                <div class="custom-def-display"></div>
                                <button class="btn-secondary toggle-manual-def-btn" style="margin-top: 1rem; margin-bottom: 1rem; width: 100%;">✎ Edit Custom Definition</button>
                                <div class="manual-def-form hidden">
                                    <textarea class="custom-textarea manual-def-input" placeholder="Type your own definition here..." rows="3"></textarea>
                                    <button class="btn-primary save-manual-def-btn" style="margin-top: 0.5rem; width: 100%;">Save Custom</button>
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
                const tuneAiBtn = card.querySelector('.tune-ai-btn');
                
                const aiToggleBtn = card.querySelector('.ai-toggle-btn');
                const customToggleBtn = card.querySelector('.custom-toggle-btn');
                const aiDefView = card.querySelector('.ai-def-view');
                const customDefView = card.querySelector('.custom-def-view');
                const customDefDisplay = card.querySelector('.custom-def-display');
                
                const setDefinitionHTML = (el, text, prefixHTML = '') => {
                    if (window.marked) {
                        el.innerHTML = prefixHTML + window.marked.parse(text);
                    } else {
                        el.innerHTML = prefixHTML + text;
                    }
                    if (window.MathJax) {
                        window.MathJax.typesetPromise([el]).catch(err => console.error(err));
                    }
                };
                
                // View switching
                const showCustomView = () => {
                    aiDefView.classList.add('hidden');
                    customDefView.classList.remove('hidden');
                    aiToggleBtn.classList.remove('active');
                    customToggleBtn.classList.add('active');
                    
                    if (customDefinitions[word]) {
                        setDefinitionHTML(customDefDisplay, customDefinitions[word]);
                    } else {
                        customDefDisplay.innerHTML = '<em style="color:var(--text-muted);">No custom definition saved yet.</em>';
                    }
                };
                
                const showAiView = () => {
                    aiDefView.classList.remove('hidden');
                    customDefView.classList.add('hidden');
                    aiToggleBtn.classList.add('active');
                    customToggleBtn.classList.remove('active');
                };
                
                aiToggleBtn.addEventListener('click', showAiView);
                customToggleBtn.addEventListener('click', showCustomView);
                
                tuneAiBtn.addEventListener('click', () => {
                    showCustomDialog({
                        title: 'Tune AI Definition',
                        message: 'Give Gemini some instructions (e.g. "Explain it like I am 5" or "Provide examples").',
                        isInput: true,
                        confirmText: 'Generate'
                    }, (instructions) => {
                        if (instructions) {
                            activeDefinitions[word] = false; // force re-fetch
                            toggleDefinition(word, currentSection, card, instructions);
                        }
                    });
                });
                
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
                    
                    showCustomView();
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

    async function toggleDefinition(word, section, cardEl, extraInstructions = null) {
        const safeWordId = word.replace(/\s+/g, '-');
        const container = cardEl.querySelector(`#def-container-${safeWordId}`);
        const loading = cardEl.querySelector('.def-loading');
        const contentWrapper = cardEl.querySelector('.def-content-wrapper');
        const contentDiv = cardEl.querySelector('.inline-def-content');
        const imgEl = cardEl.querySelector('.inline-def-image');
        const toggles = cardEl.querySelector('.def-toggles');
        const customDefView = cardEl.querySelector('.custom-def-view');
        const aiToggleBtn = cardEl.querySelector('.ai-toggle-btn');
        const customToggleBtn = cardEl.querySelector('.custom-toggle-btn');
        
        // If already open, just close it
        if (activeDefinitions[word]) {
            container.classList.add('hidden');
            activeDefinitions[word] = false;
            return;
        }
        
        // Open it
        container.classList.remove('hidden');
        activeDefinitions[word] = true;
        toggles.classList.remove('hidden'); // Show toggles immediately
        
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
        
        // Always make custom view accessible immediately
        customDefView.classList.add('hidden'); // hidden by default until toggle clicked
        
        // If we have cached AI definition and no extra instructions, use it
        if (aiDefinitions[word] && !extraInstructions) {
            contentWrapper.classList.remove('hidden');
            loading.classList.add('hidden');
            const aiBadge = `<span class="ai-badge" style="font-size: 0.7rem; margin-right: 0.5rem; padding: 0.1rem 0.4rem; vertical-align: top;">AI</span>`;
            setDefinitionHTML(aiDefinitions[word].text, aiBadge);
            if (aiDefinitions[word].img) {
                imgEl.src = aiDefinitions[word].img;
                imgEl.classList.remove('hidden');
            }
            return;
        }
        
        // Fetch from API
        loading.classList.remove('hidden');
        contentWrapper.classList.add('hidden');
        imgEl.classList.add('hidden');
        
        async function fetchGeminiDefinition(word, section, apiKey, extra = null) {
            const rootFolder = section.split('/')[0].toLowerCase();
            let languageInstruction = "English";
            if (rootFolder.includes('chinese')) languageInstruction = "Chinese (with pinyin if applicable)";
            else if (rootFolder.includes('french')) languageInstruction = "French";
            else if (rootFolder.includes('spanish')) languageInstruction = "Spanish";
            else if (rootFolder.includes('german')) languageInstruction = "German";
            else if (rootFolder.includes('japanese')) languageInstruction = "Japanese (with romaji if applicable)";
            else if (rootFolder.includes('korean')) languageInstruction = "Korean";

            let prompt = `Define the word '${word}' strictly in the context of the subject: ${section.replace(/\//g, ' > ')}. Use appropriate academic terminology and jargon for this subject. The definition MUST be written in ${languageInstruction}. Keep it clear and concise, maximum 2 sentences.`;
            if (extra) {
                prompt += ` Additionally, follow these instructions: ${extra}`;
            }
            
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
                const definitionText = await fetchGeminiDefinition(word, section, apiKey, extraInstructions);
                
                // Fetch wikipedia thumbnail asynchronously in background
                let wikiImg = null;
                try {
                    let lang = 'en';
                    const baseSection = section.split('/')[0];
                    if (baseSection === 'chinese') lang = 'zh';
                    if (baseSection === 'french') lang = 'fr';
                    
                    const wikiResp = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
                    if (wikiResp.ok) {
                        const wikiData = await wikiResp.json();
                        if (wikiData.thumbnail && wikiData.thumbnail.source) {
                            wikiImg = wikiData.thumbnail.source;
                        }
                    }
                } catch(e) {}
                
                // Cache it!
                aiDefinitions[word] = { text: definitionText, img: wikiImg };
                localStorage.setItem('ai-definitions', JSON.stringify(aiDefinitions));
                
                const aiBadge = `<span class="ai-badge" style="font-size: 0.7rem; margin-right: 0.5rem; padding: 0.1rem 0.4rem; vertical-align: top;">AI</span>`;
                setDefinitionHTML(definitionText, aiBadge);
                if (wikiImg) {
                    imgEl.src = wikiImg;
                    imgEl.classList.remove('hidden');
                }
            } else {
                // Fallback to Wikipedia API
                let lang = 'en';
                const baseSection = section.split('/')[0];
                if (baseSection === 'chinese') lang = 'zh';
                if (baseSection === 'french') lang = 'fr';

                const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
                
                if (!response.ok) {
                    throw new Error('Not found');
                }
                
                const data = await response.json();
                
                if (data.extract) {
                    let wikiImg = data.thumbnail ? data.thumbnail.source : null;
                    // Cache Wikipedia result as well to save network requests
                    aiDefinitions[word] = { text: data.extract, img: wikiImg };
                    localStorage.setItem('ai-definitions', JSON.stringify(aiDefinitions));
                    
                    setDefinitionHTML(data.extract);
                    
                    // Show image if available!
                    if (wikiImg) {
                        imgEl.src = wikiImg;
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
