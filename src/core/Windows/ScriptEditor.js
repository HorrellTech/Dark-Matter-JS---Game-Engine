class ScriptEditor {
    constructor() {
        this.isOpen = false;
        this.currentPath = null;
        this.originalContent = '';
        this.editor = null;
        this.aiPanel = null;

        this.aiSettings = this.loadAISettings();

        this.minimap = null;
        this.breadcrumbs = [];
        this.codeStats = {};
        this.selectedText = '';
        this.bookmarks = [];

        // Scripts panel references
        this.scriptsPanel = null;
        this.scriptsList = null;
        this.scriptsSearch = null;
        this.allScripts = [];

        // Window Properties
        const savedState = this.loadWindowState();
        this.isMinimized = false;
        this.isMaximized = savedState.isMaximized;
        this.lastPosition = savedState.position;
        this.lastSize = savedState.size;
        this.dragFriction = savedState.dragFriction;
    
        this.minWidth = Math.max(400, window.innerWidth * 0.3);
        this.minHeight = Math.max(300, window.innerHeight * 0.3);
        this.savedPanelStates = savedState.panels;
        this.hasRestoredPanels = false;

        this.createModal();
        this.setupEventListeners();
        this.setupWindowControls();
    }

    loadAISettings() {
        const saved = localStorage.getItem('scriptEditorAISettings');
        return saved ? JSON.parse(saved) : {
            provider: 'chatgpt',
            apiKeys: {
                chatgpt: '',
                gemini: '',
                claude: ''
            }
        };
    }

    saveAISettings() {
        localStorage.setItem('scriptEditorAISettings', JSON.stringify(this.aiSettings));
    }

    createModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'se-modal';
        this.modal.style.display = 'none';

        // Create modal content with AI panel
        this.modal.innerHTML = `
            <div class="se-modal-content">
                <div class="se-modal-header">
                    <div class="se-modal-title">Script Editor</div>
                    <div class="se-modal-path"></div>
                    <div class="se-modal-friction">
                        <label for="se-drag-friction" class="se-drag-friction-label">Friction:</label>
                        <input type="number" id="se-drag-friction" class="se-drag-friction-input" min="0.0" max="0.98" step="0.02" value="${this.dragFriction}">
                    </div>
                    <div class="se-modal-controls">
                        <button class="se-button se-icon-button" id="se-methods-toggle" title="Toggle Method List">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="se-button se-icon-button" id="se-scripts-toggle" title="Toggle Scripts List">
                            <i class="fas fa-folder-open"></i>
                        </button>
                        <button class="se-button se-icon-button" id="se-ai-toggle" title="Toggle AI Assistant">
                            <i class="fas fa-robot"></i>
                        </button>
                        <button class="se-button se-icon-button" id="se-ai-settings" title="AI Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <div class="se-modal-close"><i class="fas fa-times"></i></div>
                    </div>
                </div>
                <div class="se-modal-toolbar">
                    <button class="se-button" id="se-save" title="Save (Ctrl+S)">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button class="se-button" id="se-undo" title="Undo (Ctrl+Z)">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="se-button" id="se-redo" title="Redo (Ctrl+Y)">
                        <i class="fas fa-redo"></i>
                    </button>
                    <div class="se-separator"></div>
                    <button class="se-button" id="se-find" title="Find (Ctrl+F)">
                        <i class="fas fa-search"></i>
                    </button>
                    <button class="se-button" id="se-replace" title="Replace (Ctrl+H)">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <div class="se-separator"></div>
                    <button class="se-button" id="se-format" title="Format Code">
                        <i class="fas fa-indent"></i>
                    </button>
                    <div class="se-separator"></div>
                    <button class="se-button" id="se-docs" title="Documentation">
                        <i class="fas fa-book"></i>
                    </button>
                </div>
                <div class="se-editor-container">
                    <div class="se-modal-editor-container">
                        <textarea id="se-editor"></textarea>
                    </div>
                    <div class="se-ai-panel" id="se-ai-panel">
                        <div class="se-ai-header">
                            <div class="se-ai-title">
                                <i class="fas fa-robot"></i>
                                AI Assistant
                            </div>
                            <div class="se-ai-provider">
                                <select id="se-ai-provider-select">
                                    <option value="chatgpt">ChatGPT</option>
                                    <option value="gemini">Gemini</option>
                                    <option value="claude">Claude</option>
                                </select>
                            </div>
                        </div>
                        <div class="se-ai-chat">
                            <div class="se-ai-messages" id="se-ai-messages"></div>
                            <div class="se-ai-input-container">
                                <div class="se-ai-context-buttons">
                                    <button class="se-button se-small" id="se-include-current" title="Include current module">
                                        <i class="fas fa-file-code"></i> Current Module
                                    </button>
                                    <button class="se-button se-small" id="se-include-selection" title="Include selection">
                                        <i class="fas fa-selection"></i> Selection
                                    </button>
                                    <button class="se-button se-small" id="se-module-help" title="Module system help">
                                        <i class="fas fa-question-circle"></i> Module Help
                                    </button>
                                </div>
                                <div class="se-ai-input-row">
                                    <textarea id="se-ai-input" placeholder="Ask about your code, request modifications, or get help with the module system..."></textarea>
                                    <button class="se-button se-primary" id="se-ai-send">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="se-methods-panel" id="se-methods-panel">
                        <div class="se-methods-header">
                            <div class="se-methods-title">
                                <i class="fas fa-list"></i>
                                Methods & Functions
                            </div>
                            <input type="text" id="se-methods-search" placeholder="Filter methods..." class="se-methods-search">
                        </div>
                        <div class="se-methods-list" id="se-methods-list">
                            <div class="se-methods-empty">No methods found</div>
                        </div>
                    </div>
                    <div class="se-scripts-panel" id="se-scripts-panel">
                        <div class="se-scripts-header">
                            <div class="se-scripts-title">
                                <i class="fas fa-file-code"></i>
                                Files
                            </div>
                            <input type="text" id="se-scripts-search" placeholder="Filter files..." class="se-scripts-search">
                        </div>
                        <div class="se-scripts-list" id="se-scripts-list">
                            <div class="se-scripts-empty">No files found</div>
                        </div>
                    </div>
                </div>
               <div class="se-hint-resizer"></div>
                <div class="se-hint-box">
                    <div class="se-hint-tabs">
                        <button class="se-hint-tab active" data-tab="docs">Documentation</button>
                        <button class="se-hint-tab" data-tab="console">Console</button>
                    </div>
                    <div class="se-hint-tab-content se-hint-docs-tab">
                        <div class="se-hint-header">
                            <div class="se-hint-title">Documentation</div>
                            <div class="se-hint-close"><i class="fas fa-chevron-down"></i></div>
                        </div>
                        <div class="se-hint-content"></div>
                    </div>
                    <div class="se-hint-tab-content se-hint-console-tab" style="display:none;">
                        <div class="se-console-toolbar">
                            <button class="se-button se-console-play" title="Run Script"><i class="fas fa-play"></i></button>
                            <label style="margin-left:10px;">
                                <input type="checkbox" id="se-console-autocheck"> Check on Edit
                            </label>
                        </div>
                        <div class="se-console-errors"></div>
                    </div>
                </div>
                <div class="se-modal-status">
                    <span class="se-status-position">Ln 1, Col 1</span>
                    <span class="se-status-modified">No changes</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        console.log('Modal appended');
        console.log('Scripts panel:', this.modal.querySelector('#se-scripts-panel'));
        console.log('Scripts list:', this.modal.querySelector('#se-scripts-list'));
        console.log('Scripts search:', this.modal.querySelector('#se-scripts-search'));

        // Create AI settings dialog
        this.createAISettingsDialog();

        // Create save confirmation dialog
        this.confirmDialog = document.createElement('div');
        this.confirmDialog.className = 'se-confirm-dialog';
        this.confirmDialog.innerHTML = `
            <div class="se-confirm-content">
                <h3>Unsaved Changes</h3>
                <p>Do you want to save changes before closing?</p>
                <div class="se-confirm-buttons">
                    <button class="se-button" id="se-save-close">Save</button>
                    <button class="se-button" id="se-discard">Don't Save</button>
                    <button class="se-button" id="se-cancel">Cancel</button>
                </div>
            </div>
        `;
        this.confirmDialog.style.display = 'none';
        document.body.appendChild(this.confirmDialog);

        // Initialize AI panel
        this.aiPanel = this.modal.querySelector('#se-ai-panel');
        this.setupAIPanel();

        // Initialize panels
        this.methodsPanel = this.modal.querySelector('#se-methods-panel');
        this.methodsList = this.modal.querySelector('#se-methods-list');
        this.methodsSearch = this.modal.querySelector('#se-methods-search');

        // Initialize scripts panel
        this.scriptsPanel = this.modal.querySelector('#se-scripts-panel');
        this.scriptsList = this.modal.querySelector('#se-scripts-list');
        this.scriptsSearch = this.modal.querySelector('#se-scripts-search');

        // Set initial state: All panels closed, editor takes full width
        this.aiPanel.classList.remove('open');
        this.methodsPanel.classList.remove('open');
        this.scriptsPanel.classList.remove('open'); // Add this line
        this.modal.querySelector('.se-modal-editor-container').classList.add('fullwidth');
        this.modal.querySelector('#se-ai-toggle').classList.remove('active');
        this.modal.querySelector('#se-methods-toggle').classList.remove('active');
        this.modal.querySelector('#se-scripts-toggle').classList.remove('active'); // Add this line

        // Setup methods panel
        this.setupMethodsPanel();

        // Setup scripts panel
        this.setupScriptsPanel();

        // Setup tabs
        this.setupHintTabs();

        // Setup console
        this.setupConsole();
    }

    setupHintTabs() {
        const tabs = this.modal.querySelectorAll('.se-hint-tab');
        const docsTab = this.modal.querySelector('.se-hint-docs-tab');
        const consoleTab = this.modal.querySelector('.se-hint-console-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (tab.dataset.tab === 'docs') {
                    docsTab.style.display = '';
                    consoleTab.style.display = 'none';
                } else {
                    docsTab.style.display = 'none';
                    consoleTab.style.display = '';
                }
                this.editor?.refresh();
            });
        });
    }

    setupConsole() {
        this.consoleErrors = [];
        this.consoleErrorSet = new Set();
        this.consoleErrorsDiv = this.modal.querySelector('.se-console-errors');
        this.consolePlayBtn = this.modal.querySelector('.se-console-play');
        this.consoleAutoCheck = this.modal.querySelector('#se-console-autocheck');

        this.consolePlayBtn.addEventListener('click', () => this.checkScriptEval());
        this.consoleAutoCheck.addEventListener('change', () => {
            if (this.consoleAutoCheck.checked) {
                this.editor.on('change', this._autoCheckHandler = () => this.checkScriptEval(true));
            } else if (this._autoCheckHandler) {
                this.editor.off('change', this._autoCheckHandler);
            }
        });
    }

    checkScriptEval(isAuto = false) {
        if (!this.editor) return;
        const code = this.editor.getValue();

        // Clear previous error highlights
        if (this.editor) {
            for (let i = 0; i < this.editor.lineCount(); i++) {
                this.editor.removeLineClass(i, 'background', 'se-error-line');
            }
        }

        try {
            new Function(code);
            // Success - clear errors
            if (this.consoleErrors.length > 0) {
                this.consoleErrors = [];
                this.consoleErrorSet.clear();
                this.renderConsoleErrors();
            }
        } catch (e) {
            let mainError = e.message;
            let lineNum = null;
            let colNum = null;

            // Try multiple methods to extract line/column info
            if (e.stack) {
                // Method 1: Chrome/Edge format - "<anonymous>:3:10"
                let match = e.stack.match(/<anonymous>:(\d+):(\d+)/);

                // Method 2: Firefox format - "Function:3:10"
                if (!match) {
                    match = e.stack.match(/Function:(\d+):(\d+)/);
                }

                // Method 3: Try to find any "line X" pattern
                if (!match) {
                    match = e.stack.match(/line (\d+)/i);
                    if (match) {
                        lineNum = parseInt(match[1], 10);
                    }
                }

                if (match && match.length >= 2) {
                    lineNum = parseInt(match[1], 10);
                    if (match.length >= 3) {
                        colNum = parseInt(match[2], 10);
                    }
                }
            }

            // If we still don't have line info, try to parse from the error message itself
            if (!lineNum) {
                const msgMatch = mainError.match(/line (\d+)/i);
                if (msgMatch) {
                    lineNum = parseInt(msgMatch[1], 10);
                }
            }

            // Format error message with location
            let locationInfo = '';
            if (lineNum) {
                locationInfo = ` (Line ${lineNum}`;
                if (colNum) {
                    locationInfo += `, Column ${colNum}`;
                }
                locationInfo += ')';
            }

            const fullError = mainError + locationInfo;

            // Add error if not already present
            if (!this.consoleErrorSet.has(fullError)) {
                this.consoleErrors = []; // Replace old errors with new one
                this.consoleErrorSet.clear();
                this.consoleErrors.push(fullError);
                this.consoleErrorSet.add(fullError);
                this.renderConsoleErrors();

                // Highlight error line in editor
                if (lineNum && this.editor) {
                    // Line numbers in error are 1-based, CodeMirror uses 0-based
                    const editorLine = lineNum - 1;
                    if (editorLine >= 0 && editorLine < this.editor.lineCount()) {
                        this.editor.addLineClass(editorLine, 'background', 'se-error-line');

                        // Optional: Scroll to error line
                        this.editor.scrollIntoView({ line: editorLine, ch: 0 }, 100);
                    }
                }
            }
        }
    }

    renderConsoleErrors() {
        if (!this.consoleErrorsDiv) return;
        if (this.consoleErrors.length === 0) {
            this.consoleErrorsDiv.innerHTML = `<div class="se-console-ok">No errors detected.</div>`;
        } else {
            this.consoleErrorsDiv.innerHTML = this.consoleErrors.map(err =>
                `<div class="se-console-error"><i class="fas fa-exclamation-triangle"></i> ${err}</div>`
            ).join('');
        }
    }

    createAISettingsDialog() {
        this.aiSettingsDialog = document.createElement('div');
        this.aiSettingsDialog.className = 'se-ai-settings-dialog';
        this.aiSettingsDialog.innerHTML = `
            <div class="se-ai-settings-content">
                <div class="se-ai-settings-header">
                    <h3>AI Assistant Settings</h3>
                    <button class="se-close-settings"><i class="fas fa-times"></i></button>
                </div>
                <div class="se-ai-settings-body">
                    <div class="se-setting-group">
                        <label>Default AI Provider:</label>
                        <select id="se-default-provider">
                            <option value="chatgpt">ChatGPT (OpenAI)</option>
                            <option value="gemini">Gemini (Google)</option>
                            <option value="claude">Claude (Anthropic)</option>
                        </select>
                    </div>
                    
                    <div class="se-setting-group">
                        <label>ChatGPT API Key:</label>
                        <input type="password" id="se-chatgpt-key" placeholder="sk-...">
                        <small>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI</a></small>
                    </div>
                    
                    <div class="se-setting-group">
                        <label>Gemini API Key:</label>
                        <input type="password" id="se-gemini-key" placeholder="AI...">
                        <small>Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></small>
                    </div>
                    
                    <div class="se-setting-group">
                        <label>Claude API Key:</label>
                        <input type="password" id="se-claude-key" placeholder="sk-ant-...">
                        <small>Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a></small>
                    </div>
                </div>
                <div class="se-ai-settings-footer">
                    <button class="se-button" id="se-save-ai-settings">Save Settings</button>
                    <button class="se-button" id="se-cancel-ai-settings">Cancel</button>
                </div>
            </div>
        `;
        this.aiSettingsDialog.style.display = 'none';
        document.body.appendChild(this.aiSettingsDialog);
    }

    setupAIPanel() {
        // Set initial provider
        const providerSelect = this.modal.querySelector('#se-ai-provider-select');
        providerSelect.value = this.aiSettings.provider;

        // Provider change handler
        providerSelect.addEventListener('change', (e) => {
            this.aiSettings.provider = e.target.value;
            this.saveAISettings();
        });

        // Context buttons
        this.modal.querySelector('#se-include-current').addEventListener('click', () => {
            this.includeCurrentModule();
        });

        this.modal.querySelector('#se-include-selection').addEventListener('click', () => {
            this.includeSelection();
        });

        this.modal.querySelector('#se-module-help').addEventListener('click', () => {
            this.includeModuleHelp();
        });

        // Send button and input
        const sendButton = this.modal.querySelector('#se-ai-send');
        const inputArea = this.modal.querySelector('#se-ai-input');

        sendButton.addEventListener('click', () => this.sendAIMessage());

        inputArea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.sendAIMessage();
            }
        });
    }

    setupEventListeners() {
        // Close button
        this.modal.querySelector('.se-modal-close').addEventListener('click', () => this.promptCloseIfModified());

        // Save button
        document.getElementById('se-save').addEventListener('click', () => this.save());

        // Undo button
        document.getElementById('se-undo').addEventListener('click', () => {
            if (this.editor) this.editor.undo();
        });

        // Redo button
        document.getElementById('se-redo').addEventListener('click', () => {
            if (this.editor) this.editor.redo();
        });

        // Find button
        document.getElementById('se-find').addEventListener('click', () => {
            if (this.editor) this.editor.execCommand('find');
        });

        // Replace button
        document.getElementById('se-replace').addEventListener('click', () => {
            if (this.editor) {
                const selection = this.editor.getSelection();
                if (selection) {
                    // If there's selected text, prompt for find and replace within selection
                    const findText = prompt('Find text within selection:');
                    if (findText) {
                        const replaceText = prompt('Replace with:');
                        if (replaceText !== null) {
                            // Get selection range
                            const from = this.editor.getCursor('from');
                            const to = this.editor.getCursor('to');
                            
                            // Use search cursor to find and replace within selection
                            const cursor = this.editor.getSearchCursor(findText, from);
                            while (cursor.findNext()) {
                                // Check if the match is within the selection
                                if (cursor.to().line > to.line || (cursor.to().line === to.line && cursor.to().ch > to.ch)) {
                                    break;
                                }
                                cursor.replace(replaceText);
                            }
                        }
                    }
                } else {
                    // No selection, open the find-and-replace dialog
                    this.editor.execCommand('replace');
                }
            }
        });

        // Format button
        document.getElementById('se-format').addEventListener('click', () => this.formatCode());

        document.getElementById('se-docs').addEventListener('click', () => {
            window.scriptDocsModal.open();
        });

        this.modal.querySelector('#se-methods-toggle').addEventListener('click', () => {
            this.toggleMethodsPanel();
        });

        this.modal.querySelector('#se-scripts-toggle').addEventListener('click', () => {
            this.toggleScriptsPanel();
        });

        // AI Toggle button
        this.modal.querySelector('#se-ai-toggle').addEventListener('click', () => {
            this.toggleAIPanel();
        });

        // AI Settings button
        this.modal.querySelector('#se-ai-settings').addEventListener('click', () => {
            this.showAISettings();
        });

        // AI Settings dialog handlers
        this.aiSettingsDialog.querySelector('.se-close-settings').addEventListener('click', () => {
            this.hideAISettings();
        });

        this.aiSettingsDialog.querySelector('#se-save-ai-settings').addEventListener('click', () => {
            this.saveAISettingsFromDialog();
        });

        this.aiSettingsDialog.querySelector('#se-cancel-ai-settings').addEventListener('click', () => {
            this.hideAISettings();
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            // Save: Ctrl+S
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }

            // Close: Escape
            if (e.key === 'Escape') {
                //this.promptCloseIfModified();
            }
        });

        // Handle clicks outside the modal content to close
        /*this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.promptCloseIfModified();
            }
        });*/

        // Set up confirmation dialog buttons
        document.getElementById('se-save-close').addEventListener('click', async () => {
            await this.save();
            this.close();
            this.hideConfirmDialog();
        });

        document.getElementById('se-discard').addEventListener('click', () => {
            this.close();
            this.hideConfirmDialog();
        });

        document.getElementById('se-cancel').addEventListener('click', () => {
            this.hideConfirmDialog();
        });

        // Hint box resizing
        const resizer = this.modal.querySelector('.se-hint-resizer');
        const hintBox = this.modal.querySelector('.se-hint-box');

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = hintBox.offsetHeight;

            const onMouseMove = (moveEvent) => {
                const deltaY = startY - moveEvent.clientY;
                const newHeight = Math.max(32, Math.min(500, startHeight + deltaY));
                hintBox.style.height = `${newHeight}px`;
                this.editor?.refresh();
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Toggle hint box collapse
        const hintToggle = this.modal.querySelector('.se-hint-close');
        hintToggle.addEventListener('click', () => {
            hintBox.classList.toggle('collapsed');
            const isCollapsed = hintBox.classList.contains('collapsed');
            hintToggle.innerHTML = isCollapsed
                ? '<i class="fas fa-chevron-up"></i>'
                : '<i class="fas fa-chevron-down"></i>';
            this.editor?.refresh();
        });
    }

    async loadFile(path, content) {
        if (!path) return;

        // Save scroll position of current file before switching
        if (this.currentPath && this.editor) {
            const scrollInfo = this.editor.getScrollInfo();
            const cursor = this.editor.getCursor();
            this.saveFileScrollPosition(this.currentPath, {
                left: scrollInfo.left,
                top: scrollInfo.top,
                line: cursor.line,
                ch: cursor.ch
            });
        }

        this.currentPath = path;
        this.originalContent = content;

        // Set path in UI
        this.modal.querySelector('.se-modal-path').textContent = path;

        // Dispose of existing editor if it exists
        if (this.editor) {
            this.editor.toTextArea();
            this.editor = null;
        }

        // Always initialize a new CodeMirror instance for the new file
        await this.initCodeMirror(content);

        this.updateModifiedStatus(false);
        this.open();

        // Restore scroll position for this file
        const savedScroll = this.loadFileScrollPosition(path);
        if (savedScroll && this.editor) {
            setTimeout(() => {
                // Restore cursor position
                this.editor.setCursor({ line: savedScroll.line || 0, ch: savedScroll.ch || 0 });

                // Restore scroll position
                this.editor.scrollTo(savedScroll.left || 0, savedScroll.top || 0);

                // Focus editor
                this.editor.focus();
            }, 50);
        }

        this.loadWindowState();

        if (this.methodsPanel && this.methodsPanel.classList.contains('open')) {
            this.updateMethodsList();
        }

        this.reinitializePanelReferences();
    }

    reinitializePanelReferences() {
        this.scriptsPanel = this.modal.querySelector('#se-scripts-panel');
        this.scriptsList = this.modal.querySelector('#se-scripts-list');
        this.scriptsSearch = this.modal.querySelector('#se-scripts-search');
        this.methodsPanel = this.modal.querySelector('#se-methods-panel');
        this.methodsList = this.modal.querySelector('#se-methods-list');
        this.methodsSearch = this.modal.querySelector('#se-methods-search');
        this.aiPanel = this.modal.querySelector('#se-ai-panel');
    }

    async initCodeMirror(content) {
        // Dynamically load CodeMirror if not already loaded
        if (!window.CodeMirror) {
            await this.loadCodeMirrorDependencies();
        }

        const editorArea = document.getElementById('se-editor');

        this.editor = CodeMirror.fromTextArea(editorArea, {
            mode: "javascript",
            theme: "dracula",
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: {
                "Ctrl-S": () => this.save(),
                "Ctrl-F": "findPersistent",
                "Ctrl-H": "replace",
                "Ctrl-Space": "autocomplete"
            }
        });

        this.editor.setValue(content);
        this.editor.clearHistory();

        this.setupAdvancedFeatures();

        // Setup cursor activity for hint display
        this.editor.on("cursorActivity", () => {
            const position = this.editor.getCursor();
            const lineCol = `Ln ${position.line + 1}, Col ${position.ch + 1}`;
            this.modal.querySelector('.se-status-position').textContent = lineCol;

            // Update the hint box with documentation for word under cursor
            this.updateHintBox();
        });

        // Setup change event to track modifications
        this.editor.on("change", () => {
            const isModified = this.editor.getValue() !== this.originalContent;
            this.updateModifiedStatus(isModified);
        });

        // Setup cursor activity event to update line/column info
        this.editor.on("cursorActivity", () => {
            const position = this.editor.getCursor();
            const lineCol = `Ln ${position.line + 1}, Col ${position.ch + 1}`;
            this.modal.querySelector('.se-status-position').textContent = lineCol;
        });

        // Set initial size
        setTimeout(() => {
            this.editor.refresh();
        }, 10);
    }

    setupErrorHighlighting() {
        if (!this.editor) return;

        this.editor.on('change', () => {
            const code = this.editor.getValue();

            // Simple error detection - look for common patterns
            const lines = code.split('\n');
            lines.forEach((line, index) => {
                // Unclosed brackets/parentheses
                const openBrackets = (line.match(/[\[\{]/g) || []).length;
                const closeBrackets = (line.match(/[\]\}]/g) || []).length;

                if (openBrackets > closeBrackets) {
                    this.editor.addLineClass(index, 'background', 'se-warning-line');
                } else {
                    this.editor.removeLineClass(index, 'background', 'se-warning-line');
                }
            });
        });
    }

    async loadCodeMirrorDependencies() {
        // Create and load CodeMirror CSS
        const loadCSS = (url) => {
            return new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.onload = () => resolve();
                document.head.appendChild(link);
            });
        };

        // Create and load script
        const loadScript = (url) => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => resolve();
                document.body.appendChild(script);
            });
        };

        // Load required CSS files
        await Promise.all([
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/codemirror.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/theme/dracula.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldgutter.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/show-hint.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/dialog/dialog.min.css")
        ]);

        // Load required JS files
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/codemirror.min.js");

        // Load modes
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/mode/javascript/javascript.min.js");

        // Load addons
        await Promise.all([
            // Editing addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/closebrackets.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/matchbrackets.min.js"),

            // Search addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/search/search.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/search/searchcursor.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/dialog/dialog.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/search/jump-to-line.min.js"),

            // Fold addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldcode.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldgutter.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/brace-fold.min.js"),

            // Hint addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/show-hint.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/javascript-hint.min.js"),

            // Load token highlighter addon
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/selection/active-line.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/matchbrackets.min.js")
        ]);
    }

    updateModifiedStatus(isModified) {
        const statusEl = this.modal.querySelector('.se-status-modified');
        if (isModified) {
            statusEl.textContent = "Modified";
            statusEl.classList.add('modified');
        } else {
            statusEl.textContent = "No changes";
            statusEl.classList.remove('modified');
        }
    }

    updateHintBox() {
        const hintContent = this.modal.querySelector('.se-hint-content');
        const doc = this.getDocumentationForCursor();

        if (!doc) {
            hintContent.innerHTML = '<p>No documentation available for current selection.</p>';
            return;
        }

        let html = '';

        // If we have multiple matches (partial matches), show them as a list
        if (doc.matches && doc.matches.length > 0) {
            html += `<h3>Functions starting with "${doc.searchTerm}":</h3>`;
            html += '<div class="se-keyword-list">';

            doc.matches.forEach(match => {
                html += `<div class="se-keyword-item" onclick="window.scriptEditor.insertKeyword('${match.fullName}')">
                      <div class="se-keyword-name">${match.fullName}</div>
                      <div class="se-keyword-category">${match.category}</div>
                      <div class="se-keyword-desc">${match.description || 'No description available'}</div>
                    </div>`;
            });

            html += '</div>';

            // If there's also an exact match, show its details below
            if (doc.exact) {
                html += '<hr><h3>Exact Match:</h3>';
                html += this.formatDocumentation(doc.exact);
            }
        } else if (doc.exact) {
            // Only exact match found
            html += this.formatDocumentation(doc.exact);
        }

        hintContent.innerHTML = html;
    }

    formatDocumentation(doc) {
        let html = `<h3>${doc.name || 'Documentation'}</h3>`;

        if (doc.category) {
            html += `<div class="se-doc-category">${doc.category}</div>`;
        }

        if (doc.description) {
            html += `<p>${doc.description}</p>`;
        }

        if (doc.example) {
            html += `<p><strong>Example:</strong></p>
                 <pre><code>${doc.example}</code></pre>`;
        }

        if (doc.params && doc.params.length > 0) {
            html += `<p><strong>Parameters:</strong></p>`;
            doc.params.forEach(param => {
                html += `<div class="param">
                      <span class="param-name">${param.name}</span>
                      <span class="param-type">${param.type ? `: ${param.type}` : ''}</span>
                      <div>${param.description || ''}</div>
                    </div>`;
            });
        }

        if (doc.properties && doc.properties.length > 0) {
            html += `<p><strong>Properties:</strong></p>`;
            doc.properties.forEach(prop => {
                html += `<div class="param">
                      <span class="param-name">${prop.name}</span>
                      <span class="param-type">${prop.type ? `: ${prop.type}` : ''}</span>
                      <div>${prop.description || ''}</div>
                    </div>`;
            });
        }

        if (doc.methods && doc.methods.length > 0) {
            html += `<p><strong>Methods:</strong></p>`;
            doc.methods.forEach(method => {
                html += `<div class="param">
                      <span class="param-name">${method.name}</span>
                      <div>${method.description || ''}</div>
                    </div>`;
            });
        }

        if (doc.returns) {
            html += `<p><strong>Returns:</strong></p>
                <div class="param">
                  <span class="param-type">${doc.returns.type || ''}</span>
                  <div>${doc.returns.description || ''}</div>
                </div>`;
        }

        return html;
    }

    getDocumentationForCursor() {
        if (!this.editor) return null;

        const cursor = this.editor.getCursor();
        const line = this.editor.getLine(cursor.line);

        // Strategy 1: Check for "this." prefix
        const leftPart = line.substring(0, cursor.ch);
        const thisMatch = /this\.([a-zA-Z0-9_$]*)$/.exec(leftPart);

        if (thisMatch) {
            const partialProperty = thisMatch[1];
            return this.getThisPropertyDocumentation(partialProperty);
        }

        // Strategy 2: Check for "this.gameObject." prefix
        const gameObjectMatch = /this\.gameObject\.([a-zA-Z0-9_$]*)$/.exec(leftPart);

        if (gameObjectMatch) {
            const partialProperty = gameObjectMatch[1];
            return this.getGameObjectPropertyDocumentation(partialProperty);
        }

        // Strategy 3: Check for "this.gameObject.getModule(" pattern
        const getModuleMatch = /this\.gameObject\.getModule\s*\(\s*["']([a-zA-Z0-9_$]*)["']?\s*\)\.([a-zA-Z0-9_$]*)$/.exec(leftPart);

        if (getModuleMatch) {
            const moduleName = getModuleMatch[1];
            const partialProperty = getModuleMatch[2];
            return this.getModulePropertyDocumentation(moduleName, partialProperty);
        }

        // Strategy 4: Check for "matterMath." prefix
        const matterMathMatch = /matterMath\.([a-zA-Z0-9_$]*)$/.exec(leftPart);

        if (matterMathMatch) {
            const partialFunction = matterMathMatch[1];
            return this.getMatterMathDocumentation(partialFunction);
        }

        // Strategy 5: Check for "window.input." prefix
        const inputMatch = /window\.input\.([a-zA-Z0-9_$]*)$/.exec(leftPart);

        if (inputMatch) {
            const partialFunction = inputMatch[1];
            return this.getInputDocumentation(partialFunction);
        }

        // Strategy 6: Check for "window.engine." prefix
        const engineMatch = /window\.engine\.([a-zA-Z0-9_$]*)$/.exec(leftPart);

        if (engineMatch) {
            const partialFunction = engineMatch[1];
            return this.getEngineDocumentation(partialFunction);
        }

        // Strategy 7: Check word under cursor (existing functionality)
        const token = this.editor.getTokenAt(cursor);
        if (token && token.string && token.string.trim()) {
            const wordUnderCursor = token.string.trim();
            const result = this.searchDocumentation(wordUnderCursor);
            if (result.exact || result.matches.length > 0) {
                return result;
            }
        }

        // Strategy 8: Check if cursor is inside parentheses and get function name (existing)
        const rightPart = line.substring(cursor.ch);
        const insideParenMatch = /([a-zA-Z0-9_$\.]+)\s*\([^()]*$/.exec(leftPart);
        if (insideParenMatch && rightPart.match(/^[^()]*\)/)) {
            const functionCall = insideParenMatch[1];
            const parts = functionCall.split('.');
            const methodName = parts[parts.length - 1];

            let result = this.searchDocumentation(functionCall);
            if (!result.exact && !result.matches.length && parts.length > 1) {
                result = this.searchDocumentation(methodName);
            }

            if (result.exact || result.matches.length > 0) {
                return result;
            }
        }

        // Strategy 9: Check keyword at start of current line (existing)
        const lineStart = line.trim();
        const firstWordMatch = /^([a-zA-Z0-9_$\.]+)/.exec(lineStart);
        if (firstWordMatch) {
            const firstWord = firstWordMatch[1];
            const result = this.searchDocumentation(firstWord);
            if (result.exact || result.matches.length > 0) {
                return result;
            }
        }

        return null;
    }

    getMatterMathDocumentation(searchTerm) {
        const result = {
            searchTerm: `matterMath.${searchTerm}`,
            exact: null,
            matches: []
        };

        // Define all matterMath functions
        const matterMathFunctions = [
            {
                name: 'pi',
                description: 'Returns the value of PI (3.14159...)',
                type: 'function',
                example: 'const circumference = 2 * matterMath.pi() * radius;',
                returns: { type: 'number', description: 'The value of PI' }
            },
            {
                name: 'pi2',
                description: 'Returns 2 * PI (6.28318...)',
                type: 'function',
                example: 'const fullCircle = matterMath.pi2();',
                returns: { type: 'number', description: '2 * PI' }
            },
            {
                name: 'time',
                description: 'Returns current timestamp in milliseconds',
                type: 'function',
                example: 'const startTime = matterMath.time();',
                returns: { type: 'number', description: 'Current timestamp in ms' }
            },
            {
                name: 'dt',
                description: 'Returns delta time scaled by rate',
                type: 'function',
                example: 'const scaledDelta = matterMath.dt(0.5); // Half speed',
                params: [{ name: 'rate', type: 'number', description: 'Rate to scale delta time by' }],
                returns: { type: 'number', description: 'Scaled delta time' }
            },
            {
                name: 'setTimescale',
                description: 'Sets the timescale for calculations',
                type: 'function',
                example: 'matterMath.setTimescale(2.0); // Double speed',
                params: [{ name: 'timescale', type: 'number', description: 'New timescale value' }]
            },
            {
                name: 'getTimescale',
                description: 'Gets the current timescale',
                type: 'function',
                example: 'const currentScale = matterMath.getTimescale();',
                returns: { type: 'number', description: 'Current timescale' }
            },
            {
                name: 'ts',
                description: 'Alias for getTimescale()',
                type: 'function',
                example: 'const scale = matterMath.ts();',
                returns: { type: 'number', description: 'Current timescale' }
            },
            {
                name: 'listCreate',
                description: 'Creates a new array/list',
                type: 'function',
                example: 'const myList = matterMath.listCreate();',
                returns: { type: 'Array', description: 'New empty array' }
            },
            {
                name: 'listAdd',
                description: 'Adds a value to a list',
                type: 'function',
                example: 'matterMath.listAdd(myList, "item");',
                params: [
                    { name: 'id', type: 'Array', description: 'The list to add to' },
                    { name: 'value', type: 'any', description: 'Value to add' }
                ]
            },
            {
                name: 'listSet',
                description: 'Sets a value at a position in a list',
                type: 'function',
                example: 'matterMath.listSet(myList, 0, "new value");',
                params: [
                    { name: 'id', type: 'Array', description: 'The list to modify' },
                    { name: 'pos', type: 'number', description: 'Position to set' },
                    { name: 'value', type: 'any', description: 'Value to set' }
                ]
            },
            {
                name: 'listGet',
                description: 'Gets a value from a list at a position',
                type: 'function',
                example: 'const item = matterMath.listGet(myList, 0);',
                params: [
                    { name: 'id', type: 'Array', description: 'The list to get from' },
                    { name: 'pos', type: 'number', description: 'Position to get' }
                ],
                returns: { type: 'any', description: 'Value at position' }
            },
            {
                name: 'array2dCreate',
                description: 'Creates a 2D array initialized with a value',
                type: 'function',
                example: 'const grid = matterMath.array2dCreate(10, 10, 0);',
                params: [
                    { name: 'w', type: 'number', description: 'Width of array' },
                    { name: 'h', type: 'number', description: 'Height of array' },
                    { name: 'val', type: 'any', description: 'Initial value' }
                ],
                returns: { type: 'Array[]', description: '2D array' }
            },
            {
                name: 'array2dSet',
                description: 'Sets a value in a 2D array',
                type: 'function',
                example: 'matterMath.array2dSet(grid, 5, 3, 1);',
                params: [
                    { name: 'array', type: 'Array[]', description: '2D array' },
                    { name: 'x', type: 'number', description: 'X coordinate' },
                    { name: 'y', type: 'number', description: 'Y coordinate' },
                    { name: 'value', type: 'any', description: 'Value to set' }
                ]
            },
            {
                name: 'array2dGet',
                description: 'Gets a value from a 2D array',
                type: 'function',
                example: 'const value = matterMath.array2dGet(grid, 5, 3);',
                params: [
                    { name: 'array', type: 'Array[]', description: '2D array' },
                    { name: 'x', type: 'number', description: 'X coordinate' },
                    { name: 'y', type: 'number', description: 'Y coordinate' }
                ],
                returns: { type: 'any', description: 'Value at coordinates' }
            },
            {
                name: 'array3dCreate',
                description: 'Creates a 3D array initialized with a value',
                type: 'function',
                example: 'const cube = matterMath.array3dCreate(5, 5, 5, 0);',
                params: [
                    { name: 'w', type: 'number', description: 'Width of array' },
                    { name: 'h', type: 'number', description: 'Height of array' },
                    { name: 'd', type: 'number', description: 'Depth of array' },
                    { name: 'val', type: 'any', description: 'Initial value' }
                ],
                returns: { type: 'Array[][]', description: '3D array' }
            },
            {
                name: 'array3dSet',
                description: 'Sets a value in a 3D array',
                type: 'function',
                example: 'matterMath.array3dSet(cube, 2, 3, 1, 5);',
                params: [
                    { name: 'array', type: 'Array[][]', description: '3D array' },
                    { name: 'x', type: 'number', description: 'X coordinate' },
                    { name: 'y', type: 'number', description: 'Y coordinate' },
                    { name: 'z', type: 'number', description: 'Z coordinate' },
                    { name: 'value', type: 'any', description: 'Value to set' }
                ]
            },
            {
                name: 'array3dGet',
                description: 'Gets a value from a 3D array',
                type: 'function',
                example: 'const value = matterMath.array3dGet(cube, 2, 3, 1);',
                params: [
                    { name: 'array', type: 'Array[][]', description: '3D array' },
                    { name: 'x', type: 'number', description: 'X coordinate' },
                    { name: 'y', type: 'number', description: 'Y coordinate' },
                    { name: 'z', type: 'number', description: 'Z coordinate' }
                ],
                returns: { type: 'any', description: 'Value at coordinates' }
            },
            {
                name: 'arrayClear',
                description: 'Clears an array',
                type: 'function',
                example: 'matterMath.arrayClear(myArray);',
                params: [{ name: 'array', type: 'Array', description: 'Array to clear' }]
            },
            {
                name: 'dcos',
                description: 'Returns cosine of x degrees',
                type: 'function',
                example: 'const x = matterMath.dcos(45); // cos(45°)',
                params: [{ name: 'x', type: 'number', description: 'Angle in degrees' }],
                returns: { type: 'number', description: 'Cosine value' }
            },
            {
                name: 'degtorad',
                description: 'Converts degrees to radians',
                type: 'function',
                example: 'const radians = matterMath.degtorad(180); // π',
                params: [{ name: 'x', type: 'number', description: 'Angle in degrees' }],
                returns: { type: 'number', description: 'Angle in radians' }
            },
            {
                name: 'radtodeg',
                description: 'Converts radians to degrees',
                type: 'function',
                example: 'const degrees = matterMath.radtodeg(Math.PI); // 180',
                params: [{ name: 'x', type: 'number', description: 'Angle in radians' }],
                returns: { type: 'number', description: 'Angle in degrees' }
            },
            {
                name: 'snap',
                description: 'Snaps a position to grid size',
                type: 'function',
                example: 'const snapped = matterMath.snap(127, 32); // 128',
                params: [
                    { name: 'pos', type: 'number', description: 'Position to snap' },
                    { name: 'grid', type: 'number', description: 'Grid size' }
                ],
                returns: { type: 'number', description: 'Snapped position' }
            },
            {
                name: 'pointDistance',
                description: 'Distance between two points',
                type: 'function',
                example: 'const dist = matterMath.pointDistance(0, 0, 3, 4); // 5',
                params: [
                    { name: 'x1', type: 'number', description: 'First point X' },
                    { name: 'y1', type: 'number', description: 'First point Y' },
                    { name: 'x2', type: 'number', description: 'Second point X' },
                    { name: 'y2', type: 'number', description: 'Second point Y' }
                ],
                returns: { type: 'number', description: 'Distance between points' }
            },
            {
                name: 'pointDirection',
                description: 'Angle from one point to another',
                type: 'function',
                example: 'const angle = matterMath.pointDirection(0, 0, 1, 1);',
                params: [
                    { name: 'x1', type: 'number', description: 'First point X' },
                    { name: 'y1', type: 'number', description: 'First point Y' },
                    { name: 'x2', type: 'number', description: 'Second point X' },
                    { name: 'y2', type: 'number', description: 'Second point Y' }
                ],
                returns: { type: 'number', description: 'Angle in degrees' }
            },
            {
                name: 'angleDifference',
                description: 'Smallest difference between two angles',
                type: 'function',
                example: 'const diff = matterMath.angleDifference(350, 10); // 20',
                params: [
                    { name: 'a1', type: 'number', description: 'First angle' },
                    { name: 'a2', type: 'number', description: 'Second angle' }
                ],
                returns: { type: 'number', description: 'Angle difference' }
            },
            {
                name: 'lengthDirX',
                description: 'X offset for length/direction',
                type: 'function',
                example: 'const x = matterMath.lengthDirX(100, 45);',
                params: [
                    { name: 'len', type: 'number', description: 'Length/magnitude' },
                    { name: 'dir', type: 'number', description: 'Direction in degrees' }
                ],
                returns: { type: 'number', description: 'X component' }
            },
            {
                name: 'lengthDirY',
                description: 'Y offset for length/direction',
                type: 'function',
                example: 'const y = matterMath.lengthDirY(100, 45);',
                params: [
                    { name: 'len', type: 'number', description: 'Length/magnitude' },
                    { name: 'dir', type: 'number', description: 'Direction in degrees' }
                ],
                returns: { type: 'number', description: 'Y component' }
            },
            {
                name: 'lerp',
                description: 'Linear interpolation between two values',
                type: 'function',
                example: 'const middle = matterMath.lerp(0, 100, 0.5); // 50',
                params: [
                    { name: 'from', type: 'number', description: 'Start value' },
                    { name: 'to', type: 'number', description: 'End value' },
                    { name: 'amt', type: 'number', description: 'Amount (0-1)' }
                ],
                returns: { type: 'number', description: 'Interpolated value' }
            },
            {
                name: 'random',
                description: 'Random float between 1 and max',
                type: 'function',
                example: 'const num = matterMath.random(10); // 1-10',
                params: [{ name: 'max', type: 'number', description: 'Maximum value' }],
                returns: { type: 'number', description: 'Random float' }
            },
            {
                name: 'randomRange',
                description: 'Random float between min and max',
                type: 'function',
                example: 'const num = matterMath.randomRange(5, 15);',
                params: [
                    { name: 'min', type: 'number', description: 'Minimum value' },
                    { name: 'max', type: 'number', description: 'Maximum value' }
                ],
                returns: { type: 'number', description: 'Random float' }
            },
            {
                name: 'irandom',
                description: 'Random integer between 1 and max',
                type: 'function',
                example: 'const dice = matterMath.irandom(6); // 1-6',
                params: [{ name: 'max', type: 'number', description: 'Maximum value' }],
                returns: { type: 'number', description: 'Random integer' }
            },
            {
                name: 'irandomRange',
                description: 'Random integer between min and max',
                type: 'function',
                example: 'const num = matterMath.irandomRange(10, 20);',
                params: [
                    { name: 'min', type: 'number', description: 'Minimum value' },
                    { name: 'max', type: 'number', description: 'Maximum value' }
                ],
                returns: { type: 'number', description: 'Random integer' }
            },
            {
                name: 'randomBool',
                description: 'Random true or false',
                type: 'function',
                example: 'const coinFlip = matterMath.randomBool();',
                returns: { type: 'boolean', description: 'Random boolean' }
            },
            {
                name: 'choose',
                description: 'Randomly chooses one of the items',
                type: 'function',
                example: 'const item = matterMath.choose("red", "blue", "green");',
                params: [{ name: '...items', type: 'any', description: 'Items to choose from' }],
                returns: { type: 'any', description: 'Randomly chosen item' }
            },
            {
                name: 'stringReplaceAll',
                description: 'Replaces all occurrences in a string',
                type: 'function',
                example: 'const result = matterMath.stringReplaceAll("hello world", "l", "x");',
                params: [
                    { name: 'str', type: 'string', description: 'Original string' },
                    { name: 'find', type: 'string', description: 'String to find' },
                    { name: 'replace', type: 'string', description: 'Replacement string' }
                ],
                returns: { type: 'string', description: 'Modified string' }
            },
            {
                name: 'toString',
                description: 'Converts a value to string',
                type: 'function',
                example: 'const str = matterMath.toString(123);',
                params: [{ name: 'val', type: 'any', description: 'Value to convert' }],
                returns: { type: 'string', description: 'String representation' }
            },
            {
                name: 'toInt',
                description: 'Converts a value to integer',
                type: 'function',
                example: 'const num = matterMath.toInt("123");',
                params: [{ name: 'val', type: 'any', description: 'Value to convert' }],
                returns: { type: 'number', description: 'Integer value' }
            },
            {
                name: 'sine',
                description: 'Returns a pulsing value using sine',
                type: 'function',
                example: 'const pulse = matterMath.sine(1000, 10);',
                params: [
                    { name: 'delay', type: 'number', description: 'Delay/period' },
                    { name: 'max', type: 'number', description: 'Maximum value' }
                ],
                returns: { type: 'number', description: 'Sine wave value' }
            },
            {
                name: 'sinePositive',
                description: 'Returns a positive pulsing value',
                type: 'function',
                example: 'const pulse = matterMath.sinePositive(1000, 10);',
                params: [
                    { name: 'delay', type: 'number', description: 'Delay/period' },
                    { name: 'max', type: 'number', description: 'Maximum value' }
                ],
                returns: { type: 'number', description: 'Positive sine wave value' }
            },
            {
                name: 'sineNegative',
                description: 'Returns a negative pulsing value',
                type: 'function',
                example: 'const pulse = matterMath.sineNegative(1000, 10);',
                params: [
                    { name: 'delay', type: 'number', description: 'Delay/period' },
                    { name: 'max', type: 'number', description: 'Maximum value' }
                ],
                returns: { type: 'number', description: 'Negative sine wave value' }
            },
            {
                name: 'interpolate',
                description: 'Linear interpolation',
                type: 'function',
                example: 'const value = matterMath.interpolate(0, 100, 0.5);',
                params: [
                    { name: 'start', type: 'number', description: 'Start value' },
                    { name: 'end', type: 'number', description: 'End value' },
                    { name: 't', type: 'number', description: 'Interpolation factor (0-1)' }
                ],
                returns: { type: 'number', description: 'Interpolated value' }
            },
            {
                name: 'smoothstep',
                description: 'Smoothstep interpolation',
                type: 'function',
                example: 'const smooth = matterMath.smoothstep(0.5);',
                params: [{ name: 't', type: 'number', description: 'Input value (0-1)' }],
                returns: { type: 'number', description: 'Smoothed value' }
            },
            {
                name: 'sineInterpolation',
                description: 'Sine-based interpolation',
                type: 'function',
                example: 'const smooth = matterMath.sineInterpolation(0.5);',
                params: [{ name: 't', type: 'number', description: 'Input value (0-1)' }],
                returns: { type: 'number', description: 'Sine interpolated value' }
            },
            {
                name: 'clamp',
                description: 'Clamps a value between min and max',
                type: 'function',
                example: 'const clamped = matterMath.clamp(150, 0, 100); // 100',
                params: [
                    { name: 'val', type: 'number', description: 'Value to clamp' },
                    { name: 'min', type: 'number', description: 'Minimum value' },
                    { name: 'max', type: 'number', description: 'Maximum value' }
                ],
                returns: { type: 'number', description: 'Clamped value' }
            },
            {
                name: 'keepPositive',
                description: 'Returns absolute value',
                type: 'function',
                example: 'const positive = matterMath.keepPositive(-5); // 5',
                params: [{ name: 'x', type: 'number', description: 'Input value' }],
                returns: { type: 'number', description: 'Absolute value' }
            },
            {
                name: 'keepNegative',
                description: 'Returns negative absolute value',
                type: 'function',
                example: 'const negative = matterMath.keepNegative(5); // -5',
                params: [{ name: 'x', type: 'number', description: 'Input value' }],
                returns: { type: 'number', description: 'Negative absolute value' }
            },
            {
                name: 'rotateSmooth',
                description: 'Smoothly rotates an angle toward another',
                type: 'function',
                example: 'const newAngle = matterMath.rotateSmooth(currentAngle, targetAngle, 0.1);',
                params: [
                    { name: 'dir', type: 'number', description: 'Current direction' },
                    { name: 'target', type: 'number', description: 'Target direction' },
                    { name: 'speed', type: 'number', description: 'Rotation speed (0-1)' }
                ],
                returns: { type: 'number', description: 'New direction' }
            },
            {
                name: 'executeString',
                description: 'Executes JS code from a string',
                type: 'function',
                example: 'matterMath.executeString("console.log(\'Hello\')");',
                params: [{ name: 'str', type: 'string', description: 'JavaScript code to execute' }]
            },
            {
                name: 'rgb',
                description: 'Returns an RGB color string',
                type: 'function',
                example: 'const color = matterMath.rgb(255, 0, 0); // "rgb(255,0,0)"',
                params: [
                    { name: 'r', type: 'number', description: 'Red component (0-255)' },
                    { name: 'g', type: 'number', description: 'Green component (0-255)' },
                    { name: 'b', type: 'number', description: 'Blue component (0-255)' }
                ],
                returns: { type: 'string', description: 'RGB color string' }
            },
            {
                name: 'hsl',
                description: 'Returns an HSL color string',
                type: 'function',
                example: 'const color = matterMath.hsl(120, 100, 50); // "hsl(120,100%,50%)"',
                params: [
                    { name: 'h', type: 'number', description: 'Hue (0-360)' },
                    { name: 's', type: 'number', description: 'Saturation (0-100)' },
                    { name: 'l', type: 'number', description: 'Lightness (0-100)' }
                ],
                returns: { type: 'string', description: 'HSL color string' }
            }
        ];

        for (const func of matterMathFunctions) {
            if (func.name.toLowerCase() === searchTerm.toLowerCase()) {
                result.exact = {
                    name: `matterMath.${func.name}`,
                    category: 'MatterMath',
                    description: func.description,
                    type: func.type,
                    example: func.example,
                    params: func.params,
                    returns: func.returns
                };
            } else if (func.name.toLowerCase().startsWith(searchTerm.toLowerCase()) || searchTerm.length === 0) {
                // Changed this line: show ALL functions if searchTerm is empty, or partial matches
                result.matches.push({
                    fullName: `matterMath.${func.name}`,
                    category: 'MatterMath',
                    description: func.description
                });
            }
        }

        // Sort matches alphabetically for better user experience
        result.matches.sort((a, b) => a.fullName.localeCompare(b.fullName));

        // Limit to prevent UI overflow when showing all functions
        if (result.matches.length > 20) {
            result.matches = result.matches.slice(0, 20);
        }

        return result;
    }

    getInputDocumentation(searchTerm) {
        const result = {
            searchTerm: `window.input.${searchTerm}`,
            exact: null,
            matches: []
        };

        // Define common input functions
        const inputFunctions = [
            {
                name: 'keyDown',
                description: 'Check if a key is currently being held down',
                type: 'function',
                example: 'if (window.input.keyDown("w")) { /* move up */ }',
                params: [{ name: 'key', type: 'string', description: 'Key name to check' }],
                returns: { type: 'boolean', description: 'True if key is down' }
            },
            {
                name: 'keyPressed',
                description: 'Check if a key was just pressed this frame',
                type: 'function',
                example: 'if (window.input.keyPressed("Space")) { /* jump */ }',
                params: [{ name: 'key', type: 'string', description: 'Key name to check' }],
                returns: { type: 'boolean', description: 'True if key was just pressed' }
            },
            {
                name: 'keyReleased',
                description: 'Check if a key was just released this frame',
                type: 'function',
                example: 'if (window.input.keyReleased(" ")) { /* landed */ }',
                params: [{ name: 'key', type: 'string', description: 'Key name to check' }],
                returns: { type: 'boolean', description: 'True if key was just released' }
            },
            {
                name: 'mouseDown',
                description: 'Check if a mouse button is currently pressed',
                type: 'function',
                example: 'if (window.input.mouseDown("left")) { /* fire */ }',
                params: [{ name: 'button', type: 'string', description: 'Mouse button (left, right, middle)' }],
                returns: { type: 'boolean', description: 'True if button is down' }
            },
            {
                name: 'mousePressed',
                description: 'Check if a mouse button was just pressed this frame',
                type: 'function',
                example: 'if (window.input.mousePressed("left")) { /* click */ }',
                params: [{ name: 'button', type: 'string', description: 'Mouse button to check' }],
                returns: { type: 'boolean', description: 'True if button was just pressed' }
            },
            {
                name: 'mouseReleased',
                description: 'Check if a mouse button was just released this frame',
                type: 'function',
                example: 'if (window.input.mouseReleased("left")) { /* stop firing */ }',
                params: [{ name: 'button', type: 'string', description: 'Mouse button to check' }],
                returns: { type: 'boolean', description: 'True if button was just released' }
            },
            {
                name: 'mousePosition',
                description: 'Current mouse position in world coordinates',
                type: 'property',
                example: 'const pos = window.input.mousePosition;',
                returns: { type: 'Vector2', description: 'Mouse position' }
            },
            {
                name: 'getMousePosition',
                description: 'Get mouse position with optional world space conversion',
                type: 'function',
                example: 'const worldPos = window.input.getMousePosition(true);',
                params: [{ name: 'worldSpace', type: 'boolean', description: 'Convert to world coordinates' }],
                returns: { type: 'Vector2', description: 'Mouse position' }
            }
        ];

        for (const func of inputFunctions) {
            if (func.name.toLowerCase() === searchTerm.toLowerCase()) {
                result.exact = {
                    name: `window.input.${func.name}`,
                    category: 'Input',
                    description: func.description,
                    type: func.type,
                    example: func.example,
                    params: func.params,
                    returns: func.returns
                };
            } else if (func.name.toLowerCase().startsWith(searchTerm.toLowerCase()) || searchTerm.length === 0) {
                // Show all input functions if searchTerm is empty
                result.matches.push({
                    fullName: `window.input.${func.name}`,
                    category: 'Input',
                    description: func.description
                });
            }
        }

        return result;
    }

    getEngineDocumentation(searchTerm) {
        const result = {
            searchTerm: `window.engine.${searchTerm}`,
            exact: null,
            matches: []
        };

        // Define common engine functions and properties
        const engineMembers = [
            {
                name: 'viewport',
                description: 'Current viewport information',
                type: 'property',
                example: 'const centerX = window.engine.viewport.x;\nconst centerY = window.engine.viewport.y;',
                properties: [
                    { name: 'x', type: 'number', description: 'Viewport center X coordinate' },
                    { name: 'y', type: 'number', description: 'Viewport center Y coordinate' },
                    { name: 'width', type: 'number', description: 'Viewport width' },
                    { name: 'height', type: 'number', description: 'Viewport height' }
                ]
            },
            {
                name: 'instantiatePrefab',
                description: 'Create a new instance of a prefab',
                type: 'function',
                example: 'const enemy = window.engine.instantiatePrefab("Enemy", 100, 200);',
                params: [
                    { name: 'name', type: 'string', description: 'Prefab name' },
                    { name: 'x', type: 'number', description: 'X position (optional)' },
                    { name: 'y', type: 'number', description: 'Y position (optional)' }
                ],
                returns: { type: 'GameObject', description: 'Created prefab instance' }
            },
            {
                name: 'getMainCanvas',
                description: 'Get the main rendering canvas context',
                type: 'function',
                example: 'const ctx = window.engine.getMainCanvas();',
                returns: { type: 'CanvasRenderingContext2D', description: 'Main canvas context' }
            },
            {
                name: 'getGuiCanvas',
                description: 'Get the GUI canvas context',
                type: 'function',
                example: 'const ctx = window.engine.getGuiCanvas();',
                returns: { type: 'CanvasRenderingContext2D', description: 'GUI canvas context' }
            },
            {
                name: 'getBackgroundCanvas',
                description: 'Get the background canvas context',
                type: 'function',
                example: 'const ctx = window.engine.getBackgroundCanvas();',
                returns: { type: 'CanvasRenderingContext2D', description: 'Background canvas context' }
            }
        ];

        for (const member of engineMembers) {
            if (member.name.toLowerCase() === searchTerm.toLowerCase()) {
                result.exact = {
                    name: `window.engine.${member.name}`,
                    category: 'Engine',
                    description: member.description,
                    type: member.type,
                    example: member.example,
                    params: member.params,
                    returns: member.returns,
                    properties: member.properties
                };
            } else if (member.name.toLowerCase().startsWith(searchTerm.toLowerCase()) || searchTerm.length === 0) {
                // Show all engine members if searchTerm is empty
                result.matches.push({
                    fullName: `window.engine.${member.name}`,
                    category: 'Engine',
                    description: member.description
                });
            }
        }

        return result;
    }

    getEngineDocumentation(searchTerm) {
        const result = {
            searchTerm: `window.engine.${searchTerm}`,
            exact: null,
            matches: []
        };

        // Define common engine functions and properties
        const engineMembers = [
            {
                name: 'viewport',
                description: 'Current viewport information',
                type: 'property',
                example: 'const centerX = window.engine.viewport.x;\nconst centerY = window.engine.viewport.y;',
                properties: [
                    { name: 'x', type: 'number', description: 'Viewport center X coordinate' },
                    { name: 'y', type: 'number', description: 'Viewport center Y coordinate' },
                    { name: 'width', type: 'number', description: 'Viewport width' },
                    { name: 'height', type: 'number', description: 'Viewport height' }
                ]
            },
            {
                name: 'instantiatePrefab',
                description: 'Create a new instance of a prefab',
                type: 'function',
                example: 'const enemy = window.engine.instantiatePrefab("Enemy", 100, 200);',
                params: [
                    { name: 'name', type: 'string', description: 'Prefab name' },
                    { name: 'x', type: 'number', description: 'X position (optional)' },
                    { name: 'y', type: 'number', description: 'Y position (optional)' }
                ],
                returns: { type: 'GameObject', description: 'Created prefab instance' }
            },
            {
                name: 'getMainCanvas',
                description: 'Get the main rendering canvas context',
                type: 'function',
                example: 'const ctx = window.engine.getMainCanvas();',
                returns: { type: 'CanvasRenderingContext2D', description: 'Main canvas context' }
            },
            {
                name: 'getGuiCanvas',
                description: 'Get the GUI canvas context',
                type: 'function',
                example: 'const ctx = window.engine.getGuiCanvas();',
                returns: { type: 'CanvasRenderingContext2D', description: 'GUI canvas context' }
            },
            {
                name: 'getBackgroundCanvas',
                description: 'Get the background canvas context',
                type: 'function',
                example: 'const ctx = window.engine.getBackgroundCanvas();',
                returns: { type: 'CanvasRenderingContext2D', description: 'Background canvas context' }
            }
        ];

        for (const member of engineMembers) {
            if (member.name.toLowerCase() === searchTerm.toLowerCase()) {
                result.exact = {
                    name: `window.engine.${member.name}`,
                    category: 'Engine',
                    description: member.description,
                    type: member.type,
                    example: member.example,
                    params: member.params,
                    returns: member.returns,
                    properties: member.properties
                };
            } else if (member.name.toLowerCase().startsWith(searchTerm.toLowerCase()) && searchTerm.length >= 1) {
                result.matches.push({
                    fullName: `window.engine.${member.name}`,
                    category: 'Engine',
                    description: member.description
                });
            }
        }

        return result;
    }

    getThisPropertyDocumentation(searchTerm) {
        const result = {
            searchTerm: `this.${searchTerm}`,
            exact: null,
            matches: []
        };

        // Common module properties
        const moduleProperties = [
            {
                name: 'gameObject',
                description: 'Reference to the GameObject this module is attached to',
                type: 'GameObject',
                example: 'this.gameObject.position.x += 10;'
            },
            {
                name: 'enabled',
                description: 'Whether this module is currently enabled',
                type: 'boolean',
                example: 'this.enabled = false;'
            },
            {
                name: 'name',
                description: 'The name of this module',
                type: 'string',
                example: 'console.log(this.name);'
            }
        ];

        // Add custom properties based on common module patterns
        const commonModuleProps = [
            { name: 'speed', description: 'Movement speed property', type: 'number' },
            { name: 'health', description: 'Health value property', type: 'number' },
            { name: 'damage', description: 'Damage value property', type: 'number' },
            { name: 'force', description: 'Force value property', type: 'number' },
            { name: 'timer', description: 'Timer value property', type: 'number' },
            { name: 'target', description: 'Target reference property', type: 'GameObject' },
            { name: 'color', description: 'Color property', type: 'string' },
            { name: 'size', description: 'Size property', type: 'Vector2' },
            { name: 'offset', description: 'Offset property', type: 'Vector2' }
        ];

        const allProperties = [...moduleProperties, ...commonModuleProps];

        for (const prop of allProperties) {
            if (prop.name.toLowerCase() === searchTerm.toLowerCase()) {
                result.exact = {
                    name: `this.${prop.name}`,
                    category: 'Module Property',
                    description: prop.description,
                    type: prop.type,
                    example: prop.example
                };
            } else if (prop.name.toLowerCase().startsWith(searchTerm.toLowerCase()) && searchTerm.length >= 1) {
                result.matches.push({
                    fullName: `this.${prop.name}`,
                    category: 'Module Property',
                    description: prop.description
                });
            }
        }

        return result;
    }

    getGameObjectPropertyDocumentation(searchTerm) {
        const result = {
            searchTerm: `this.gameObject.${searchTerm}`,
            exact: null,
            matches: []
        };

        // GameObject properties and methods
        const gameObjectMembers = [
            {
                name: 'position',
                description: 'The local position of the GameObject as a Vector2',
                type: 'Vector2',
                example: 'this.gameObject.position.x += 10;\nthis.gameObject.position = new Vector2(100, 200);'
            },
            {
                name: 'scale',
                description: 'The scale of the GameObject as a Vector2',
                type: 'Vector2',
                example: 'this.gameObject.scale = new Vector2(2, 2);'
            },
            {
                name: 'angle',
                description: 'The rotation angle of the GameObject in degrees',
                type: 'number',
                example: 'this.gameObject.angle += 90;'
            },
            {
                name: 'size',
                description: 'The collision size of the GameObject as a Vector2',
                type: 'Vector2',
                example: 'this.gameObject.size = new Vector2(64, 64);'
            },
            {
                name: 'active',
                description: 'Whether the GameObject is active in the scene',
                type: 'boolean',
                example: 'this.gameObject.active = false;'
            },
            {
                name: 'visible',
                description: 'Whether the GameObject is visible',
                type: 'boolean',
                example: 'this.gameObject.visible = true;'
            },
            {
                name: 'name',
                description: 'The name of the GameObject',
                type: 'string',
                example: 'console.log(this.gameObject.name);'
            },
            {
                name: 'addModule',
                description: 'Add a module to the GameObject',
                type: 'function',
                example: 'const sprite = this.gameObject.addModule(new SpriteRenderer());',
                params: [{ name: 'module', type: 'Module', description: 'The module to add' }],
                returns: { type: 'Module', description: 'The added module' }
            },
            {
                name: 'getModule',
                description: 'Get a module by its type name',
                type: 'function',
                example: 'const sprite = this.gameObject.getModule("SpriteRenderer");',
                params: [{ name: 'type', type: 'string', description: 'The module type name' }],
                returns: { type: 'Module|null', description: 'The module or null if not found' }
            },
            {
                name: 'removeModule',
                description: 'Remove a module from the GameObject',
                type: 'function',
                example: 'this.gameObject.removeModule("SpriteRenderer");',
                params: [{ name: 'type', type: 'string', description: 'The module type name' }]
            },
            {
                name: 'hasTag',
                description: 'Check if the GameObject has a specific tag',
                type: 'function',
                example: 'if (this.gameObject.hasTag("enemy")) { /* damage player */ }',
                params: [{ name: 'tag', type: 'string', description: 'The tag to check' }],
                returns: { type: 'boolean', description: 'True if the tag exists' }
            },
            {
                name: 'addTag',
                description: 'Add a tag to the GameObject',
                type: 'function',
                example: 'this.gameObject.addTag("player");',
                params: [{ name: 'tag', type: 'string', description: 'The tag to add' }]
            },
            {
                name: 'setPosition',
                description: 'Set the position of the GameObject',
                type: 'function',
                example: 'this.gameObject.setPosition(new Vector2(100, 200));',
                params: [{ name: 'position', type: 'Vector2', description: 'The new position' }]
            },
            {
                name: 'getWorldPosition',
                description: 'Get the world position of the GameObject',
                type: 'function',
                example: 'const worldPos = this.gameObject.getWorldPosition();',
                returns: { type: 'Vector2', description: 'The world position' }
            },
            {
                name: 'checkForCollisions',
                description: 'Check for collisions with other GameObjects',
                type: 'function',
                example: 'const collisions = this.gameObject.checkForCollisions();\ncollisions.forEach(other => { /* handle collision */ });',
                returns: { type: 'Array<GameObject>', description: 'Array of collided GameObjects' }
            },
            {
                name: 'checkPolygonCollisions',
                description: 'Check for polygon-based collisions',
                type: 'function',
                example: 'const collisions = this.gameObject.checkPolygonCollisions();',
                returns: { type: 'Array<GameObject>', description: 'Array of collided GameObjects' }
            },
            {
                name: 'addChild',
                description: 'Add a child GameObject',
                type: 'function',
                example: 'this.gameObject.addChild(childObject);',
                params: [{ name: 'child', type: 'GameObject', description: 'The child to add' }]
            }
        ];

        for (const member of gameObjectMembers) {
            if (member.name.toLowerCase() === searchTerm.toLowerCase()) {
                result.exact = {
                    name: `this.gameObject.${member.name}`,
                    category: 'GameObject',
                    description: member.description,
                    type: member.type,
                    example: member.example,
                    params: member.params,
                    returns: member.returns,
                    methods: member.methods
                };
            } else if (member.name.toLowerCase().startsWith(searchTerm.toLowerCase()) && searchTerm.length >= 1) {
                result.matches.push({
                    fullName: `this.gameObject.${member.name}`,
                    category: 'GameObject',
                    description: member.description
                });
            }
        }

        return result;
    }

    getModulePropertyDocumentation(moduleName, searchTerm) {
        const result = {
            searchTerm: `${moduleName}.${searchTerm}`,
            exact: null,
            matches: []
        };

        // Common module properties and methods that most modules have
        const commonModuleMembers = [
            {
                name: 'enabled',
                description: 'Whether the module is enabled',
                type: 'boolean',
                example: `const module = this.gameObject.getModule("${moduleName}");\nmodule.enabled = false;`
            },
            {
                name: 'gameObject',
                description: 'Reference to the GameObject this module is attached to',
                type: 'GameObject',
                example: `const module = this.gameObject.getModule("${moduleName}");\nmodule.gameObject.position.x += 10;`
            }
        ];

        // Module-specific properties based on common module types
        const moduleSpecificMembers = this.getModuleSpecificMembers(moduleName);

        const allMembers = [...commonModuleMembers, ...moduleSpecificMembers];

        for (const member of allMembers) {
            if (member.name.toLowerCase() === searchTerm.toLowerCase()) {
                result.exact = {
                    name: `${moduleName}.${member.name}`,
                    category: `${moduleName} Module`,
                    description: member.description,
                    type: member.type,
                    example: member.example,
                    params: member.params,
                    returns: member.returns
                };
            } else if (member.name.toLowerCase().startsWith(searchTerm.toLowerCase()) && searchTerm.length >= 1) {
                result.matches.push({
                    fullName: `${moduleName}.${member.name}`,
                    category: `${moduleName} Module`,
                    description: member.description
                });
            }
        }

        return result;
    }

    getModuleSpecificMembers(moduleName) {
        const moduleMembers = {
            'SpriteRenderer': [
                { name: 'imageAsset', description: 'The image asset to render', type: 'AssetReference' },
                { name: 'width', description: 'Width of the sprite', type: 'number' },
                { name: 'height', description: 'Height of the sprite', type: 'number' },
                { name: 'scaleMode', description: 'How the image should be scaled', type: 'string' },
                { name: 'color', description: 'Tint color for the sprite', type: 'color' },
                { name: 'flipX', description: 'Flip sprite horizontally', type: 'boolean' },
                { name: 'flipY', description: 'Flip sprite vertically', type: 'boolean' }
            ],
            'RigidBody': [
                { name: 'bodyType', description: 'Type of physics body (dynamic, static, kinematic)', type: 'string' },
                { name: 'density', description: 'Density of the body', type: 'number' },
                { name: 'friction', description: 'Friction coefficient', type: 'number' },
                { name: 'restitution', description: 'Bounciness (0 to 1)', type: 'number' },
                {
                    name: 'setVelocity',
                    description: 'Set the linear velocity',
                    type: 'function',
                    params: [{ name: 'velocity', type: 'Vector2', description: 'The velocity vector' }],
                    example: 'rigidBody.setVelocity(new Vector2(0, -10));'
                },
                {
                    name: 'applyForce',
                    description: 'Apply a force to the body',
                    type: 'function',
                    params: [{ name: 'force', type: 'Vector2', description: 'The force vector' }],
                    example: 'rigidBody.applyForce(new Vector2(100, 0));'
                }
            ],
            'AudioPlayer': [
                { name: 'audioAsset', description: 'Audio file to play', type: 'AssetReference' },
                { name: 'volume', description: 'Playback volume (0-1)', type: 'number' },
                { name: 'loop', description: 'Loop the audio', type: 'boolean' },
                {
                    name: 'play',
                    description: 'Play the audio',
                    type: 'function',
                    example: 'audioPlayer.play();'
                },
                {
                    name: 'stop',
                    description: 'Stop audio playback',
                    type: 'function',
                    example: 'audioPlayer.stop();'
                }
            ],
            'KeyboardController': [
                { name: 'speed', description: 'Movement speed', type: 'number' },
                { name: 'useAcceleration', description: 'Enable smooth acceleration', type: 'boolean' },
                { name: 'upKey', description: 'Key for upward movement', type: 'string' },
                { name: 'downKey', description: 'Key for downward movement', type: 'string' },
                { name: 'leftKey', description: 'Key for leftward movement', type: 'string' },
                { name: 'rightKey', description: 'Key for rightward movement', type: 'string' }
            ],
            'SimpleHealth': [
                { name: 'maxHealth', description: 'Maximum health', type: 'number' },
                { name: 'currentHealth', description: 'Current health', type: 'number' },
                { name: 'showHealthBar', description: 'Display health bar', type: 'boolean' },
                {
                    name: 'applyDamage',
                    description: 'Apply damage to this object',
                    type: 'function',
                    params: [
                        { name: 'amount', type: 'number', description: 'Damage amount' },
                        { name: 'source', type: 'GameObject', description: 'Source of damage' }
                    ],
                    example: 'health.applyDamage(25, attackerObject);'
                },
                {
                    name: 'heal',
                    description: 'Heal this object',
                    type: 'function',
                    params: [{ name: 'amount', type: 'number', description: 'Heal amount' }],
                    example: 'health.heal(50);'
                }
            ]
        };

        return moduleMembers[moduleName] || [];
    }

    searchDocumentation(searchTerm) {
        const result = {
            searchTerm: searchTerm,
            exact: null,
            matches: []
        };

        if (!window.DarkMatterDocs) return result;

        // Search through all categories
        for (const category in window.DarkMatterDocs) {
            const categoryData = window.DarkMatterDocs[category];

            if (categoryData.functions) {
                for (const funcName in categoryData.functions) {
                    const funcData = categoryData.functions[funcName];

                    // Check for exact match
                    if (funcName.toLowerCase() === searchTerm.toLowerCase()) {
                        result.exact = {
                            name: funcName,
                            category: category,
                            ...funcData
                        };
                    }

                    // Check for partial match (starts with search term)
                    else if (funcName.toLowerCase().startsWith(searchTerm.toLowerCase()) && searchTerm.length >= 2) {
                        result.matches.push({
                            fullName: funcName,
                            category: category,
                            description: funcData.description || 'No description available'
                        });
                    }
                }
            }
        }

        // Sort matches alphabetically
        result.matches.sort((a, b) => a.fullName.localeCompare(b.fullName));

        // Limit matches to prevent overwhelming UI
        if (result.matches.length > 10) {
            result.matches = result.matches.slice(0, 10);
        }

        return result;
    }

    insertKeyword(keyword) {
        if (!this.editor) return;

        // Get current cursor position
        const cursor = this.editor.getCursor();
        const token = this.editor.getTokenAt(cursor);

        // If there's a partial word under cursor, replace it
        if (token && token.string && token.string.trim()) {
            const start = { line: cursor.line, ch: token.start };
            const end = { line: cursor.line, ch: token.end };
            this.editor.replaceRange(keyword, start, end);
        } else {
            // Otherwise just insert at cursor
            this.editor.replaceSelection(keyword);
        }

        // Focus back to editor
        this.editor.focus();
    }

    formatCode() {
        if (!this.editor) return;

        // Simple JavaScript code formatter using js-beautify if available
        if (window.js_beautify) {
            const formatted = js_beautify(this.editor.getValue(), {
                indent_size: 4,
                space_in_empty_paren: true
            });
            this.editor.setValue(formatted);
        } else {
            // Simple indentation if js-beautify isn't available
            this.editor.execCommand('selectAll');
            this.editor.execCommand('indentAuto');
            this.editor.setCursor(this.editor.getCursor());
        }
    }

    /**
     * Load code content directly (for inline editing, not tied to a file)
     * @param {string} content - The code to load
     * @param {function} onSaveCallback - Callback to call with updated code on save
     */
    loadInlineCode(content, onSaveCallback) {
        // Dispose of existing editor if it exists (prevents stacking multiple CodeMirror instances)
        if (this.editor) {
            this.editor.toTextArea();
            this.editor = null;
        }

        this.currentPath = null; // No file path for inline mode
        this.originalContent = content;
        this.onSaveCallback = onSaveCallback;

        // Update UI to indicate inline mode
        this.modal.querySelector('.se-modal-path').textContent = 'Inline Code Editor';

        // Initialize editor with content
        this.initCodeMirror(content);
        this.updateModifiedStatus(false);
        this.open();
    }

    async save() {
        if (!this.editor) return;

        const content = this.editor.getValue();

        if (this.currentPath) {
            // Existing file save logic
            try {
                if (window.fileBrowser) {
                    await window.fileBrowser.createFile(this.currentPath, content, true);
                    this.originalContent = content;
                    this.updateModifiedStatus(false);
                    this.showStatusMessage('File saved successfully');
                    this.reloadModuleIfNeeded(this.currentPath, content);
                    return true;
                } else {
                    console.error('FileBrowser instance not found');
                    this.showStatusMessage('Error: FileBrowser not found', true);
                    return false;
                }
            } catch (error) {
                console.error('Failed to save file:', error);
                this.showStatusMessage('Error saving file', true);
                return false;
            }
        } else if (this.onSaveCallback) {
            // Inline mode: Call the callback with the updated code
            this.onSaveCallback(content);
            this.originalContent = content;
            this.updateModifiedStatus(false);
            this.showStatusMessage('Code saved');
            return true;
        }
    }

    reloadModuleIfNeeded(filePath, content) {
        if (!filePath) return;

        // Check if this is a module script file
        if (!filePath.toLowerCase().endsWith('.js')) return;

        // Extract class name from file path
        const fileName = filePath.split('/').pop().split('\\').pop();
        const className = fileName.replace('.js', '');

        // Validate it looks like a module class
        if (!content.includes(`class ${className}`) && !content.includes(`class ${className} extends Module`)) {
            return;
        }

        console.log(`Attempting to reload module: ${className}`);

        // Use the ModuleReloader if available
        if (window.moduleReloader) {
            const success = window.moduleReloader.reloadModuleClass(className, content);

            if (success) {
                // Update all instances in the editor's scene
                let instancesUpdated = 0;

                if (window.editor && window.editor.activeScene) {
                    instancesUpdated = window.moduleReloader.updateModuleInstances(
                        className,
                        window.editor.activeScene.gameObjects
                    );

                    if (instancesUpdated > 0) {
                        this.showStatusMessage(`Updated ${instancesUpdated} instances of ${className}`);

                        // Refresh the inspector if visible and method exists
                        if (window.editor.inspector && typeof window.editor.inspector.refreshInspector === 'function') {
                            window.editor.inspector.refreshInspector();
                        }

                        // Refresh canvas
                        window.editor.refreshCanvas();
                    }
                }
            }
        } else {
            console.warn("ModuleReloader not available, modules won't be hot-reloaded");
        }
    }

    showStatusMessage(message, isError = false) {
        // Create or get message element
        let messageEl = this.modal.querySelector('.se-status-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'se-status-message';
            this.modal.querySelector('.se-modal-status').appendChild(messageEl);
        }

        // Set message and style
        messageEl.textContent = message;
        messageEl.classList.toggle('error', isError);

        // Show message
        messageEl.style.opacity = '0.9';

        // Hide after delay
        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            messageEl.style.opacity = '0';
        }, 700);
    }

    hasUnsavedChanges() {
        if (!this.editor) return false;
        return this.editor.getValue() !== this.originalContent;
    }

    showConfirmDialog() {
        this.confirmDialog.style.display = 'flex';
    }

    hideConfirmDialog() {
        this.confirmDialog.style.display = 'none';
    }

    promptCloseIfModified() {
        if (!this.editor) {
            this.close();
            return;
        }

        if (this.hasUnsavedChanges()) {
            this.showConfirmDialog();
        } else {
            this.close();
        }
    }

    setupWindowControls() {
        const header = this.modal.querySelector('.se-modal-header');
        const modalContent = this.modal.querySelector('.se-modal-content');

        // Add window control buttons to header controls
        const controls = this.modal.querySelector('.se-modal-controls');
        const closeButton = controls.querySelector('.se-modal-close');

        // Minimize button
        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'se-button se-icon-button';
        minimizeBtn.title = 'Minimize';
        minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
        minimizeBtn.addEventListener('click', () => this.toggleMinimize());

        // Maximize button
        const maximizeBtn = document.createElement('button');
        maximizeBtn.className = 'se-button se-icon-button';
        maximizeBtn.id = 'se-maximize-btn';
        maximizeBtn.title = 'Maximize';
        maximizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        maximizeBtn.addEventListener('click', () => this.toggleMaximize());

        controls.insertBefore(maximizeBtn, closeButton);
        controls.insertBefore(minimizeBtn, maximizeBtn);

        // Setup drag friction input
        const frictionInput = this.modal.querySelector('#se-drag-friction');

        // Ensure a sane default when nothing was loaded
        let initialFriction = this.dragFriction;
        if (typeof initialFriction !== 'number' || isNaN(initialFriction)) {
            initialFriction = 0.90; // sensible default
        }
        // Clamp to allowed range
        initialFriction = Math.max(0.0, Math.min(0.98, initialFriction));
        this.dragFriction = initialFriction;
        frictionInput.value = initialFriction;

        frictionInput.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            if (isNaN(value)) return;
            // Clamp and enforce max
            value = Math.max(0.0, Math.min(0.98, value));
            this.dragFriction = value;
            // reflect clamped value back to UI
            frictionInput.value = value.toFixed(2);
            this.saveWindowState();
            // ensure label visibility recalculated
            this.updateFrictionLabelVisibility();
        });

        // Make header draggable
        this.setupDragging(header, modalContent);

        // Make modal resizable
        this.setupResizing(modalContent);

        // Handle clicks on minimized bubble
        modalContent.addEventListener('click', (e) => {
            if (this.isMinimized && !e.target.closest('.se-modal-close')) {
                e.stopPropagation();
                this.toggleMinimize();
            }
        });

        // Set initial position and size
        this.centerModal();

        // Update friction label visibility on open and on window resize
        this.updateFrictionLabelVisibility();
        window.addEventListener('resize', this._frictionLabelResizeHandler = () => this.updateFrictionLabelVisibility());
    }

    updateFrictionLabelVisibility() {
        try {
            const header = this.modal.querySelector('.se-modal-header');
            const frag = header.querySelector('.se-modal-friction');
            const label = frag.querySelector('.se-drag-friction-label');
            const input = frag.querySelector('.se-drag-friction-input');
            const controls = header.querySelector('.se-modal-controls');
            const pathEl = header.querySelector('.se-modal-path');

            if (!label || !input || !controls || !pathEl) return;

            // space available between path and controls
            const headerWidth = header.clientWidth;
            const controlsWidth = controls.offsetWidth;
            const pathWidth = pathEl.offsetWidth;
            const available = headerWidth - (controlsWidth + pathWidth + 40); // padding cushion

            const needed = input.offsetWidth + label.offsetWidth + 8;

            if (available < needed || available < input.offsetWidth + 12) {
                // hide label to prevent wrapping under input
                label.style.display = 'none';
            } else {
                label.style.display = '';
            }
        } catch (err) {
            // Silent fail if elements not ready yet
        }
    }

    setupDragging(header, modalContent) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        let lastMoveTime = 0;
        let lastX = 0, lastY = 0;
        let velocityX = 0, velocityY = 0;

        // Physics properties
        const friction = 0.99; // Friction coefficient (0.98 = 2% speed loss per frame)
        const bounceDamping = 0.8; // Energy retained after bounce (80%)
        const minVelocity = 3.5; // Stop physics when velocity is below this threshold

        header.style.cursor = 'move';

        header.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on buttons
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
                return;
            }

            if (this.isMaximized || this.isMinimized) return;

            // Stop any ongoing physics animation
            if (this.physicsAnimationId) {
                cancelAnimationFrame(this.physicsAnimationId);
                this.physicsAnimationId = null;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = modalContent.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            lastX = e.clientX;
            lastY = e.clientY;
            lastMoveTime = performance.now();
            velocityX = 0;
            velocityY = 0;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const currentTime = performance.now();
            const deltaTime = currentTime - lastMoveTime;

            if (deltaTime > 0) {
                // Calculate velocity based on mouse movement
                velocityX = (e.clientX - lastX) / deltaTime * 16; // Normalize to 60fps
                velocityY = (e.clientY - lastY) / deltaTime * 16;
            }

            lastX = e.clientX;
            lastY = e.clientY;
            lastMoveTime = currentTime;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newX = initialX + deltaX;
            const newY = initialY + deltaY;

            // Keep window within viewport
            const maxX = window.innerWidth - modalContent.offsetWidth;
            const maxY = window.innerHeight - modalContent.offsetHeight;

            modalContent.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            modalContent.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
            modalContent.style.right = 'auto';
            modalContent.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                this.lastPosition = {
                    x: parseInt(modalContent.style.left),
                    y: parseInt(modalContent.style.top)
                };

                // Start physics animation if there's significant velocity
                const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
                if (speed > minVelocity) {
                    this.startPhysicsAnimation(modalContent, velocityX, velocityY, friction, bounceDamping, minVelocity);
                }
            }
            isDragging = false;
        });
    }

    startPhysicsAnimation(modalContent, vx, vy, friction, bounceDamping, minVelocity) {
        let velocityX = vx;
        let velocityY = vy;

        const animate = () => {
            // Get current position
            let x = parseInt(modalContent.style.left);
            let y = parseInt(modalContent.style.top);

            // Apply velocity
            x += velocityX;
            y += velocityY;

            // Apply friction
            velocityX *= this.dragFriction; // Use configurable friction
            velocityY *= this.dragFriction;

            // Get boundaries
            const maxX = window.innerWidth - modalContent.offsetWidth;
            const maxY = window.innerHeight - modalContent.offsetHeight;

            // Bounce off edges
            if (x <= 0) {
                x = 0;
                velocityX = Math.abs(velocityX) * bounceDamping;
            } else if (x >= maxX) {
                x = maxX;
                velocityX = -Math.abs(velocityX) * bounceDamping;
            }

            if (y <= 0) {
                y = 0;
                velocityY = Math.abs(velocityY) * bounceDamping;
            } else if (y >= maxY) {
                y = maxY;
                velocityY = -Math.abs(velocityY) * bounceDamping;
            }

            // Update position
            modalContent.style.left = `${x}px`;
            modalContent.style.top = `${y}px`;

            // Store position
            this.lastPosition = { x, y };

            // Check if we should continue animating
            const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            if (speed > minVelocity) {
                this.physicsAnimationId = requestAnimationFrame(animate);
            } else {
                this.physicsAnimationId = null;
            }
        };

        this.physicsAnimationId = requestAnimationFrame(animate);
    }

    setupResizing(modalContent) {
        // Create resize handles
        const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

        handles.forEach(handle => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = `se-resize-handle se-resize-${handle}`;
            modalContent.appendChild(resizeHandle);

            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;

            resizeHandle.addEventListener('mousedown', (e) => {
                if (this.isMaximized || this.isMinimized) return;

                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;

                const rect = modalContent.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                startLeft = rect.left;
                startTop = rect.top;

                e.preventDefault();
                e.stopPropagation();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;

                // Handle horizontal resizing
                if (handle.includes('e')) {
                    newWidth = Math.max(this.minWidth, startWidth + deltaX);
                } else if (handle.includes('w')) {
                    newWidth = Math.max(this.minWidth, startWidth - deltaX);
                    newLeft = startLeft + (startWidth - newWidth);
                }

                // Handle vertical resizing
                if (handle.includes('s')) {
                    newHeight = Math.max(this.minHeight, startHeight + deltaY);
                } else if (handle.includes('n')) {
                    newHeight = Math.max(this.minHeight, startHeight - deltaY);
                    newTop = startTop + (startHeight - newHeight);
                }

                modalContent.style.width = `${newWidth}px`;
                modalContent.style.height = `${newHeight}px`;
                modalContent.style.left = `${newLeft}px`;
                modalContent.style.top = `${newTop}px`;
                modalContent.style.right = 'auto';
                modalContent.style.bottom = 'auto';

                if (this.editor) {
                    this.editor.refresh();
                }
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    this.lastSize = {
                        width: parseInt(modalContent.style.width),
                        height: parseInt(modalContent.style.height)
                    };
                    this.lastPosition = {
                        x: parseInt(modalContent.style.left),
                        y: parseInt(modalContent.style.top)
                    };
                }
                isResizing = false;

                // Save state after toggling
                this.saveWindowState();
            });
        });
    }

    centerModal() {
        const modalContent = this.modal.querySelector('.se-modal-content');
        const width = this.lastSize.width;
        const height = this.lastSize.height;

        modalContent.style.width = `${width}px`;
        modalContent.style.height = `${height}px`;
        modalContent.style.left = `${(window.innerWidth - width) / 2}px`;
        modalContent.style.top = `${(window.innerHeight - height) / 2}px`;
        modalContent.style.right = 'auto';
        modalContent.style.bottom = 'auto';
        modalContent.style.transform = 'none';

        this.lastPosition = {
            x: parseInt(modalContent.style.left),
            y: parseInt(modalContent.style.top)
        };
    }

    toggleMinimize() {
        const modalContent = this.modal.querySelector('.se-modal-content');

        if (this.isMinimized) {
            // Restore from minimized bubble
            this.isMinimized = false;
            modalContent.classList.remove('minimized');

            // Restore size and position
            modalContent.style.width = `${this.lastSize.width}px`;
            modalContent.style.height = `${this.lastSize.height}px`;
            modalContent.style.left = `${this.lastPosition.x}px`;
            modalContent.style.top = `${this.lastPosition.y}px`;

            if (this.editor) {
                this.editor.refresh();
            }
        } else {
            // Minimize to bubble
            if (this.isMaximized) {
                this.toggleMaximize(); // Un-maximize first
            }

            this.isMinimized = true;
            modalContent.classList.add('minimized');

            // Store current position and size before minimizing
            this.lastPosition = {
                x: parseInt(modalContent.style.left) || this.lastPosition.x,
                y: parseInt(modalContent.style.top) || this.lastPosition.y
            };
            this.lastSize = {
                width: parseInt(modalContent.style.width) || this.lastSize.width,
                height: parseInt(modalContent.style.height) || this.lastSize.height
            };

            // Move to bottom-right corner as a small bubble
            modalContent.style.width = '200px';
            modalContent.style.height = '60px';
            modalContent.style.left = `${window.innerWidth - 220}px`;
            modalContent.style.top = `${window.innerHeight - 80}px`;
            modalContent.style.right = 'auto';
            modalContent.style.bottom = 'auto';
        }
    }

    toggleMaximize() {
        const modalContent = this.modal.querySelector('.se-modal-content');
        const maximizeBtn = this.modal.querySelector('#se-maximize-btn');

        if (this.isMaximized) {
            // Restore
            this.isMaximized = false;
            modalContent.classList.remove('maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
            maximizeBtn.title = 'Maximize';

            modalContent.style.width = `${this.lastSize.width}px`;
            modalContent.style.height = `${this.lastSize.height}px`;
            modalContent.style.left = `${this.lastPosition.x}px`;
            modalContent.style.top = `${this.lastPosition.y}px`;
            modalContent.style.right = 'auto';
            modalContent.style.bottom = 'auto';
        } else {
            // Maximize
            if (this.isMinimized) {
                this.toggleMinimize(); // Un-minimize first
            }

            this.isMaximized = true;
            modalContent.classList.add('maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-compress"></i>';
            maximizeBtn.title = 'Restore';

            // Store current position and size
            this.lastPosition = {
                x: parseInt(modalContent.style.left) || 0,
                y: parseInt(modalContent.style.top) || 0
            };
            this.lastSize = {
                width: parseInt(modalContent.style.width) || 800,
                height: parseInt(modalContent.style.height) || 600
            };

            modalContent.style.width = '100vw';
            modalContent.style.height = '100vh';
            modalContent.style.left = '0';
            modalContent.style.top = '0';
            modalContent.style.right = '0';
            modalContent.style.bottom = '0';
        }

        if (this.editor) {
            setTimeout(() => this.editor.refresh(), 50);
        }

        // Save state after toggling
        this.saveWindowState();
    }

    loadWindowState() {
        const saved = localStorage.getItem('dmscriptEditorWindowState');
        return saved ? JSON.parse(saved) : {
            size: { width: 800, height: 600 },
            position: { x: 0, y: 0 },
            isMaximized: false,
            panels: {
                ai: false,
                methods: false,
                scripts: true
            },
            dragFriction: 0.94
        };
    }

    saveWindowState() {
        const state = {
            size: this.lastSize,
            //position: this.lastPosition,
            isMaximized: this.isMaximized,
            panels: {
                ai: this.aiPanel?.classList.contains('open') || false,
                methods: this.methodsPanel?.classList.contains('open') || false,
                scripts: this.scriptsPanel?.classList.contains('open') || true
            },
            dragFriction: this.dragFriction || 0.94
        };
        localStorage.setItem('dmscriptEditorWindowState', JSON.stringify(state));
    }

    saveFileScrollPosition(filePath, scrollInfo) {
        if (!filePath) return;

        const scrollPositions = JSON.parse(localStorage.getItem('scriptEditorScrollPositions') || '{}');
        scrollPositions[filePath] = scrollInfo;
        localStorage.setItem('scriptEditorScrollPositions', JSON.stringify(scrollPositions));
    }

    loadFileScrollPosition(filePath) {
        if (!filePath) return null;

        const scrollPositions = JSON.parse(localStorage.getItem('scriptEditorScrollPositions') || '{}');
        return scrollPositions[filePath] || null;
    }

    open() {
        this.modal.style.display = 'flex';
        this.isOpen = true;

        // Restore saved state ONLY if panels haven't been opened yet
        const modalContent = this.modal.querySelector('.se-modal-content');
        
        if (this.isMaximized) {
            modalContent.classList.add('maximized');
            const maximizeBtn = this.modal.querySelector('#se-maximize-btn');
            if (maximizeBtn) {
                maximizeBtn.innerHTML = '<i class="fas fa-compress"></i>';
                maximizeBtn.title = 'Restore';
            }
            modalContent.style.width = '100vw';
            modalContent.style.height = '100vh';
            modalContent.style.left = '0';
            modalContent.style.top = '0';
        } else {
            this.centerModal();
        }

        // Only restore panel states on first open (not when switching files)
        if (this.savedPanelStates && !this.hasRestoredPanels) {
            if (this.savedPanelStates.ai && this.aiPanel && !this.aiPanel.classList.contains('open')) {
                this.toggleAIPanel();
            }
            if (this.savedPanelStates.methods && this.methodsPanel && !this.methodsPanel.classList.contains('open')) {
                this.toggleMethodsPanel();
            }
            if (this.savedPanelStates.scripts && this.scriptsPanel && !this.scriptsPanel.classList.contains('open')) {
                this.toggleScriptsPanel();
            }
            this.hasRestoredPanels = true;
        }

        if (this.scriptsPanel && this.scriptsPanel.classList.contains('open')) {
            this.updateScriptsList();
        }

        if (this.editor) {
            setTimeout(() => {
                this.editor.refresh();
                this.editor.focus();
            }, 10);
        }
    }

    close() {
        // Save scroll position before closing
        if (this.currentPath && this.editor) {
            const scrollInfo = this.editor.getScrollInfo();
            const cursor = this.editor.getCursor();
            this.saveFileScrollPosition(this.currentPath, {
                left: scrollInfo.left,
                top: scrollInfo.top,
                line: cursor.line,
                ch: cursor.ch
            });
        }

        // Save window state before closing
        this.saveWindowState();

        // If there are unsaved changes in inline mode, save automatically via callback
        if (this.hasUnsavedChanges() && !this.currentPath && this.onSaveCallback) {
            this.onSaveCallback(this.editor.getValue());
        }

        if (this.hasUnsavedChanges() && this.currentPath) {
            if (window.fileBrowser?.readFile) {
                window.fileBrowser.readFile(this.currentPath)
                    .then(content => {
                        this.reloadModuleIfNeeded(this.currentPath, content);
                    })
                    .catch(err => console.error("Couldn't reload module on close:", err));
            }
        } else if (this.currentPath) {
            if (window.fileBrowser?.readFile) {
                window.fileBrowser.readFile(this.currentPath)
                    .then(content => {
                        if (content && content.includes('extends Module')) {
                            this.reloadModuleIfNeeded(this.currentPath, content);
                        }
                    })
                    .catch(err => console.error("Couldn't check module on close:", err));
            }
        }

        // Proceed with normal close
        this.modal.style.display = 'none';
        this.isOpen = false;
        this.currentPath = null;
        this.onSaveCallback = null; // Clear callback
        this.hasRestoredPanels = false;
    }

    // AI STUFF
    toggleAIPanel() {
        const isOpening = !this.aiPanel.classList.contains('open');
        this.aiPanel.classList.toggle('open');
        const button = this.modal.querySelector('#se-ai-toggle');
        const editorContainer = this.modal.querySelector('.se-modal-editor-container');

        if (isOpening) {
            button.classList.add('active');
            editorContainer.classList.remove('fullwidth');
        } else {
            button.classList.remove('active');
            // Only add fullwidth if methods panel is also closed
            if (!this.methodsPanel.classList.contains('open')) {
                editorContainer.classList.add('fullwidth');
            }
        }

        // Force immediate layout recalculation and CodeMirror resize
        if (this.editor) {
            const cmWrapper = this.editor.getWrapperElement();
            void editorContainer.offsetHeight;

            this.editor.setSize(null, null);
            this.editor.refresh();

            let frameCount = 0;
            const maxFrames = 24;

            const animationLoop = () => {
                if (frameCount < maxFrames) {
                    this.editor.setSize(null, null);
                    this.editor.refresh();
                    frameCount++;
                    requestAnimationFrame(animationLoop);
                } else {
                    this.editor.setSize(null, null);
                    this.editor.refresh();

                    if (document.activeElement &&
                        (document.activeElement.closest('.se-modal-editor-container') ||
                            document.activeElement.closest('.CodeMirror'))) {
                        this.editor.focus();
                    }
                }
            };

            requestAnimationFrame(animationLoop);
        }
    }

    showAISettings() {
        // Populate current settings
        this.aiSettingsDialog.querySelector('#se-default-provider').value = this.aiSettings.provider;
        this.aiSettingsDialog.querySelector('#se-chatgpt-key').value = this.aiSettings.apiKeys.chatgpt;
        this.aiSettingsDialog.querySelector('#se-gemini-key').value = this.aiSettings.apiKeys.gemini;
        this.aiSettingsDialog.querySelector('#se-claude-key').value = this.aiSettings.apiKeys.claude;

        this.aiSettingsDialog.style.display = 'flex';
    }

    hideAISettings() {
        this.aiSettingsDialog.style.display = 'none';
    }

    saveAISettingsFromDialog() {
        this.aiSettings.provider = this.aiSettingsDialog.querySelector('#se-default-provider').value;
        this.aiSettings.apiKeys.chatgpt = this.aiSettingsDialog.querySelector('#se-chatgpt-key').value;
        this.aiSettings.apiKeys.gemini = this.aiSettingsDialog.querySelector('#se-gemini-key').value;
        this.aiSettings.apiKeys.claude = this.aiSettingsDialog.querySelector('#se-claude-key').value;

        this.saveAISettings();
        this.hideAISettings();

        // Update provider select
        this.modal.querySelector('#se-ai-provider-select').value = this.aiSettings.provider;

        this.showStatusMessage('AI settings saved');
    }

    includeCurrentModule() {
        if (!this.editor) return;

        const currentCode = this.editor.getValue();
        const inputArea = this.modal.querySelector('#se-ai-input');

        const contextText = `\n\n**Current Module Code:**\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\n`;
        inputArea.value = contextText + inputArea.value;
        inputArea.focus();
    }

    includeSelection() {
        if (!this.editor) return;

        const selection = this.editor.getSelection();
        if (!selection) {
            this.showStatusMessage('No text selected', true);
            return;
        }

        const inputArea = this.modal.querySelector('#se-ai-input');
        const contextText = `\n\n**Selected Code:**\n\`\`\`javascript\n${selection}\n\`\`\`\n\n`;
        inputArea.value = contextText + inputArea.value;
        inputArea.focus();
    }

    includeModuleHelp() {
        const inputArea = this.modal.querySelector('#se-ai-input');
        const moduleHelp = this.generateModuleSystemContext();
        inputArea.value = moduleHelp + inputArea.value;
        inputArea.focus();
    }

    setupScriptsPanel() {
        // Search functionality
        this.scriptsSearch.addEventListener('input', (e) => {
            this.filterScripts(e.target.value);
        });

        // Setup toolbar with create buttons
        this.setupScriptsToolbar();

        // Load scripts list on panel open
        this.updateScriptsList();
    }

    toggleScriptsPanel() {
        if (!this.scriptsPanel) {
            console.error('Scripts panel not initialized');
            return;
        }

        const isOpening = !this.scriptsPanel.classList.contains('open');
        this.scriptsPanel.classList.toggle('open');
        const button = this.modal.querySelector('#se-scripts-toggle');
        const editorContainer = this.modal.querySelector('.se-modal-editor-container');

        if (isOpening) {
            button.classList.add('active');
            editorContainer.classList.remove('fullwidth');
            this.updateScriptsList();
        } else {
            button.classList.remove('active');
            // Only add fullwidth if other panels are also closed
            if (!this.aiPanel.classList.contains('open') &&
                !this.methodsPanel.classList.contains('open')) {
                editorContainer.classList.add('fullwidth');
            }
        }

        // Refresh editor
        if (this.editor) {
            const cmWrapper = this.editor.getWrapperElement();
            void editorContainer.offsetHeight;

            this.editor.setSize(null, null);
            this.editor.refresh();

            let frameCount = 0;
            const maxFrames = 24;

            const animationLoop = () => {
                if (frameCount < maxFrames) {
                    this.editor.setSize(null, null);
                    this.editor.refresh();
                    frameCount++;
                    requestAnimationFrame(animationLoop);
                }
            };

            requestAnimationFrame(animationLoop);
        }
    }

    async updateScriptsList() {
        if (!window.fileBrowser || !window.fileBrowser.db) {
            this.scriptsList.innerHTML = '<div class="se-scripts-empty">File browser not available</div>';
            return;
        }

        try {
            // Get all editable files from the file browser
            const transaction = window.fileBrowser.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            const allFiles = await new Promise(resolve => {
                store.getAll().onsuccess = e => resolve(e.target.result);
            });

            // Include .js, .md, .txt, .doc, .json files
            const editableFiles = allFiles.filter(file =>
                file.type === 'file' &&
                (file.name.endsWith('.js') ||
                    file.name.endsWith('.md') ||
                    file.name.endsWith('.txt') ||
                    file.name.endsWith('.doc') ||
                    file.name.endsWith('.json'))
            );

            if (editableFiles.length === 0) {
                this.scriptsList.innerHTML = '<div class="se-scripts-empty">No scripts found</div>';
                return;
            }

            // Analyze each file to determine its type
            this.allScripts = await Promise.all(editableFiles.map(async file => {
                const content = await window.fileBrowser.readFile(file.path);
                let scriptType = 'utility';
                let fileType = this.getFileType(file.name);
                let icon = this.getFileIcon(file.name);

                if (fileType === 'js' && content) {
                    if (content.includes('extends Module')) {
                        scriptType = 'module';
                    } else if (content.includes('extends EditorWindow')) {
                        scriptType = 'editorwindow';
                    }
                } else if (fileType !== 'js') {
                    // For non-JS files, set type based on file extension
                    scriptType = fileType;
                }

                return {
                    name: file.name,
                    path: file.path,
                    type: scriptType,
                    fileType: fileType,
                    icon: icon
                };
            }));

            // Sort scripts: Module, EditorWindow, JS Utility, then other files
            this.allScripts.sort((a, b) => {
                const typeOrder = {
                    module: 0,
                    editorwindow: 1,
                    utility: 2,
                    js: 2,
                    json: 3,
                    md: 4,
                    txt: 5,
                    doc: 6
                };
                const typeCompare = typeOrder[a.type] - typeOrder[b.type];
                if (typeCompare !== 0) return typeCompare;
                return a.name.localeCompare(b.name);
            });

            this.renderScriptsList(this.allScripts);
        } catch (error) {
            console.error('Error loading scripts list:', error);
            this.scriptsList.innerHTML = '<div class="se-scripts-empty">Error loading scripts</div>';
        }
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ext;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'js': 'fa-file-code',
            'md': 'fa-file-alt',
            'txt': 'fa-file-alt',
            'doc': 'fa-book',
            'json': 'fa-file-code'
        };
        return iconMap[ext] || 'fa-file';
    }

    renderScriptsList(scripts) {
        if (scripts.length === 0) {
            this.scriptsList.innerHTML = '<div class="se-scripts-empty">No scripts found</div>';
            return;
        }

        this.scriptsList.innerHTML = scripts.map(script => {
            const isActive = this.currentPath === script.path;
            let typeLabel = '';
            let showTypeBadge = false;

            // Only show type badge for JS files
            if (script.fileType === 'js') {
                showTypeBadge = true;
                typeLabel = script.type === 'module' ? 'Module' :
                    script.type === 'editorwindow' ? 'EditorWindow' :
                        'Utility';
            }

            return `
            <div class="se-script-item ${isActive ? 'active' : ''}" data-path="${script.path}">
                <i class="fas ${script.icon}" style="margin-right: 8px; color: #888; font-size: 14px;"></i>
                <div class="se-script-info">
                    <div class="se-script-name">${script.name}</div>
                    <div class="se-script-path">${script.path}</div>
                </div>
                ${showTypeBadge ? `<span class="se-script-type ${script.type}">${typeLabel}</span>` : ''}
            </div>
        `;
        }).join('');

        // Add click handlers
        this.scriptsList.querySelectorAll('.se-script-item').forEach(item => {
            item.addEventListener('click', async () => {
                const path = item.dataset.path;
                await this.switchToScript(path);
            });
        });
    }

    filterScripts(searchTerm) {
        if (!this.allScripts) return;

        const filtered = this.allScripts.filter(script =>
            script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            script.path.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderScriptsList(filtered);
    }

    async switchToScript(path) {
        // Save scroll position of current file
        if (this.currentPath && this.editor) {
            const scrollInfo = this.editor.getScrollInfo();
            const cursor = this.editor.getCursor();
            this.saveFileScrollPosition(this.currentPath, {
                left: scrollInfo.left,
                top: scrollInfo.top,
                line: cursor.line,
                ch: cursor.ch
            });
        }

        this.saveWindowState();

        // Check if current file has unsaved changes
        if (this.hasUnsavedChanges()) {
            const result = await this.promptSaveChanges();
            if (result === 'cancel') return;
            if (result === 'save') {
                await this.save();
            }
        }

        // Load the new script
        const content = await window.fileBrowser.readFile(path);
        if (content) {
            await this.loadFile(path, content);

            // Update active state in scripts list
            this.scriptsList.querySelectorAll('.se-script-item').forEach(item => {
                item.classList.toggle('active', item.dataset.path === path);
            });

            this.loadWindowState();
        }
    }

    async promptSaveChanges() {
        return new Promise(resolve => {
            const dialog = document.createElement('div');
            dialog.className = 'se-confirm-dialog';
            dialog.style.display = 'flex';
            dialog.innerHTML = `
            <div class="se-confirm-content">
                <h3>Unsaved Changes</h3>
                <p>Do you want to save changes before switching scripts?</p>
                <div class="se-confirm-buttons">
                    <button class="se-button" id="se-save-switch">Save</button>
                    <button class="se-button" id="se-discard-switch">Don't Save</button>
                    <button class="se-button" id="se-cancel-switch">Cancel</button>
                </div>
            </div>
        `;
            document.body.appendChild(dialog);

            const cleanup = () => dialog.remove();

            dialog.querySelector('#se-save-switch').onclick = () => {
                cleanup();
                resolve('save');
            };

            dialog.querySelector('#se-discard-switch').onclick = () => {
                cleanup();
                resolve('discard');
            };

            dialog.querySelector('#se-cancel-switch').onclick = () => {
                cleanup();
                resolve('cancel');
            };
        });
    }

    setupMethodsPanel() {
        // Search functionality
        this.methodsSearch.addEventListener('input', (e) => {
            this.filterMethods(e.target.value);
        });

        // Update methods list when code changes
        if (this.editor) {
            this.editor.on('change', () => {
                clearTimeout(this.methodsUpdateTimeout);
                this.methodsUpdateTimeout = setTimeout(() => {
                    this.updateMethodsList();
                }, 500); // Debounce updates
            });
        }
    }

    toggleMethodsPanel() {
        const isOpening = !this.methodsPanel.classList.contains('open');
        this.methodsPanel.classList.toggle('open');
        const button = this.modal.querySelector('#se-methods-toggle');
        const editorContainer = this.modal.querySelector('.se-modal-editor-container');

        if (isOpening) {
            button.classList.add('active');
            editorContainer.classList.remove('fullwidth');
            this.updateMethodsList();
        } else {
            button.classList.remove('active');
            // Only add fullwidth if AI panel is also closed
            if (!this.aiPanel.classList.contains('open')) {
                editorContainer.classList.add('fullwidth');
            }
        }

        // Refresh editor
        if (this.editor) {
            setTimeout(() => {
                this.editor.refresh();
            }, 300);
        }
    }

    updateMethodsList() {
        if (!this.editor) return;

        const code = this.editor.getValue();
        const methods = this.parseMethodsFromCode(code);

        if (methods.length === 0) {
            this.methodsList.innerHTML = '<div class="se-methods-empty">No methods found</div>';
            return;
        }

        this.allMethods = methods; // Store for filtering
        this.renderMethodsList(methods);
    }

    parseMethodsFromCode(code) {
        const methods = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            // Match class methods - Updated regex to capture parameters
            const methodMatch = line.match(/^\s*(async\s+)?(\w+)\s*\(([^)]*)\)\s*{?/);
            if (methodMatch && !line.trim().startsWith('//')) {
                const isAsync = !!methodMatch[1];
                const name = methodMatch[2];
                const params = methodMatch[3] || ''; // Capture parameters inside parentheses

                // Skip common non-method keywords
                if (['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
                    return;
                }

                methods.push({
                    name: name,
                    params: params, // New: Store parameters
                    line: index,
                    isAsync: isAsync,
                    type: 'method'
                });
            }

            // Match function declarations - Updated regex to capture parameters
            const funcMatch = line.match(/^\s*(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
            if (funcMatch && !line.trim().startsWith('//')) {
                methods.push({
                    name: funcMatch[2],
                    params: funcMatch[3] || '', // New: Store parameters
                    line: index,
                    isAsync: !!funcMatch[1],
                    type: 'function'
                });
            }

            // Match arrow functions assigned to variables - Updated regex to capture parameters
            const arrowMatch = line.match(/^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/);
            if (arrowMatch && !line.trim().startsWith('//')) {
                methods.push({
                    name: arrowMatch[1],
                    params: arrowMatch[2] || '', // New: Store parameters
                    line: index,
                    isAsync: line.includes('async'),
                    type: 'arrow'
                });
            }
        });

        return methods;
    }

    renderMethodsList(methods) {
        this.methodsList.innerHTML = methods.map(method => {
            const icon = method.type === 'method' ? 'fa-cube' :
                method.type === 'function' ? 'fa-function' : 'fa-arrow-right';
            const asyncBadge = method.isAsync ? '<span class="se-method-async">async</span>' : '';
            // Updated: Append parameters to the method name for display
            const displayName = `${method.name}(${method.params || ''})`;

            return `
        <div class="se-method-item" data-line="${method.line}">
            <i class="fas ${icon}"></i>
            <span class="se-method-name">${displayName}</span>
            ${asyncBadge}
            <span class="se-method-line">:${method.line + 1}</span>
        </div>
    `;
        }).join('');

        // Add click handlers
        this.methodsList.querySelectorAll('.se-method-item').forEach(item => {
            item.addEventListener('dblclick', () => {
                const line = parseInt(item.dataset.line);
                this.jumpToLine(line);
            });
        });
    }

    filterMethods(searchTerm) {
        if (!this.allMethods) return;

        const filtered = this.allMethods.filter(method =>
            method.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderMethodsList(filtered);
    }

    jumpToLine(lineNumber) {
        if (!this.editor) return;

        this.editor.setCursor({ line: lineNumber, ch: 0 });
        this.editor.scrollIntoView({ line: lineNumber, ch: 0 }, 100);
        this.editor.focus();

        // Highlight the line briefly
        this.editor.addLineClass(lineNumber, 'background', 'se-highlight-line');
        setTimeout(() => {
            this.editor.removeLineClass(lineNumber, 'background', 'se-highlight-line');
        }, 1000);
    }

    generateModuleSystemContext() {
        return `
**Dark Matter JS Module System Quick Reference:**

**GameObject Properties:**
- position: Vector2 - Local position
- scale: Vector2 - Scale factors
- angle: number - Rotation in degrees  
- size: Vector2 - Collision size
- active: boolean - GameObject active state
- visible: boolean - Visibility state

**Module Lifecycle:**
- start() - Called once when game starts
- loop(deltaTime) - Called every frame
- draw(ctx) - Called for rendering

**Common Patterns:**
\`\`\`javascript
// Movement
this.gameObject.position.x += speed * deltaTime;

// Input checking
if (window.input.keyDown("w")) {
    // Move up
}

// Get other modules
const sprite = this.gameObject.getModule("SpriteRenderer");
const rigidbody = this.gameObject.getModule("RigidBody");

// Expose properties
this.exposeProperty("speed", "number", 200, {
    min: 0, max: 1000, 
    description: "Movement speed in pixels/sec"
});
\`\`\`

**Available Modules:** SpriteRenderer, RigidBody, Collider, KeyboardController, SimpleMovementController, AudioPlayer, 
SimpleHealth, BehaviorTrigger

Ask me to create, fix, or improve modules for your game!
`;
    }

    getAvailableModulesContext() {
        // Generate context about available modules from the attachment
        return `
**Controllers:**
- SimpleMovementController: Basic character movement
- KeyboardController: Keyboard input handling  
- CameraController: Camera control and following

**Colliders:**
- BoundingBoxCollider: Custom bounding box collision

**Drawing:**
- DrawCircle: Draws circles
- DrawRectangle: Draws rectangles
- DrawPolygon: Draws polygons

**Visual:**
- SpriteRenderer: Displays sprites
- SpriteSheetRenderer: Animated sprite sheets

**Logic:**
- BehaviorTrigger: Event-based actions and triggers
- SimpleHealth: Health and damage system

**Physics:**
- RigidBody: Physics body component
- Collider: physics-only collision detection

**Audio:**
- AudioPlayer: Audio playback with spatial audio
`;
    }

    async sendAIMessage() {
        const inputArea = this.modal.querySelector('#se-ai-input');
        const message = inputArea.value.trim();

        if (!message) return;

        const provider = this.aiSettings.provider;
        const apiKey = this.aiSettings.apiKeys[provider];

        if (!apiKey) {
            this.showStatusMessage(`Please set your ${provider.toUpperCase()} API key in settings`, true);
            this.showAISettings();
            return;
        }

        // Add user message to chat
        this.addMessageToChat('user', message);
        inputArea.value = '';

        // Show loading
        const loadingId = this.addMessageToChat('assistant', 'Thinking...', true);

        try {
            const response = await this.callAI(provider, apiKey, message);
            this.updateMessageInChat(loadingId, response);
        } catch (error) {
            console.error('AI request failed:', error);
            this.updateMessageInChat(loadingId, `Error: ${error.message}`);
        }
    }

    async callAI(provider, apiKey, message) {
        const systemPrompt = `# Dark Matter JS Game Engine - Module Creation Guide

You are an expert AI assistant for the **Dark Matter JS** browser-based 2D game engine with a component-based architecture similar to Unity.

## Core Concepts

### this.gameObject Structure
- **position**: Vector2 (x, y coordinates)
- **scale**: Vector2 (scale factors)
- **angle**: Number (rotation in degrees)
- **size**: Vector2 (bounding box dimensions)
- **Parent-child hierarchy**: Use \`addChild()\` for relationships
- **Tags**: Use \`addTag("tag")\`, \`hasTag("tag")\`

### Module System
Modules are components that extend GameObject behavior. All modules:
- Extend the \`Module\` base class
- Access GameObject via \`this.gameObject\`
- Can be enabled/disabled independently
- Support serialization (save/load)
- Can query other modules: \`this.gameObject.getModule("ModuleName")\`

## Module Template

\`\`\`javascript
class MyModule extends Module {
    static namespace = "Category";  // Optional: Groups modules in editor
    static description = "Brief description";  // Shown in module list
    static allowMultiple = false;  // true = multiple instances allowed
    static icon = "⭐";  // Optional: Emoji/icon in module list

    constructor() {
        super("MyModule");

        this.ignoreGameObjectTransform = false;  // true = drawing doesnt sync with GameObject transform

        this.require("RigidBody");  // Require another module on the same GameObject, if the module exists, it will be added automatically
        
        // Properties with defaults
        this.speed = 100;
        this.direction = new Vector2(1, 0);
        
        // Expose to inspector (CRITICAL: use onChange to update) (all other options are optional) (Keep property types together for organization)
        this.exposeProperty("speed", "number", 100, {
            min: 0, max: 500, step: 10,
            description: "Movement speed in pixels/sec",
            onChange: (val) => { this.speed = val; }  // REQUIRED for updates
        });
    }

    // Lifecycle methods (all optional)
    preload() { /* Load assets before start */ }
    start() { /* Initialize when game starts */ }
    beginLoop() { /* Called before loop() each frame */ }
    loop(deltaTime) { /* Main update (deltaTime in seconds) */ }
    endLoop() { /* Called after loop() each frame */ }
    draw(ctx) { /* Render custom graphics */ }
    drawGizmos(ctx) { /* Debug visualization (editor only) */ }
    onDestroy() { /* Cleanup on module removal */ }

    // Serialization (save/load properties)
    toJSON() {
        return { 
            ...super.toJSON(),  // Include base properties
            speed: this.speed, 
            direction: this.direction 
        };
    }
    fromJSON(data) {
        super.fromJSON(data);  // Load base properties
        this.speed = data.speed || 100;
        this.direction = data.direction || new Vector2(1, 0);
    }
}

window.MyModule = MyModule;  // REQUIRED: Register globally
\`\`\`

## Property Types & Options

### Basic Types
- \`"number"\`: Numeric values (options: min, max, step)
- \`"string"\`: Text input
- \`"boolean"\`: Checkbox
- \`"color"\`: Color picker (hex string)
- \`"vector2"\`: Vector2 editor (no static methods - use instance methods)

### Advanced Types
- \`"enum"\`: Dropdown (requires \`options: ["A", "B", "C"]\`)

## Common APIs

### Input System
\`\`\`javascript
// Keyboard
window.input.keyDown("w")  // Held down
window.input.keyPressed(" ")  // Just pressed this frame
window.input.keyReleased("escape")  // Just released

// Mouse
window.input.mouseDown("left")  // "left", "right", "middle"
window.input.mousePressed("left")
window.input.getMousePosition(true)  // true = world space, false = screen

// Touch (mobile)
window.input.isTapped()
window.input.getTouchCount()
\`\`\`

### Transform & Movement
\`\`\`javascript
// Position
this.gameObject.position.x += 10;
const worldPos = this.gameObject.getWorldPosition();  // With parent hierarchy

// Rotation
this.gameObject.angle += 90;  // Degrees

// Scale
this.gameObject.scale.x = 2;
\`\`\`

### Collision Detection
\`\`\`javascript
// Basic collisions (requires useCollisions = true on both objects)
const collisions = this.gameObject.checkForCollisions();
collisions.forEach(other => {
    if (other.gameObject.hasTag("enemy")) {
        // Handle collision
    }
});
\`\`\`

### Scene & GameObject Management
\`\`\`javascript
// Find objects
const player = this.findGameObject("Player");

// Create a new instance of a game object by name
const enemy = this.instanceCreate("Enemy", x, y, parent);

// Create objects dynamically
const obj = new GameObject("NewObject");
window.engine.gameObjects.push(obj);
\`\`\`

### Drawing & Canvas
\`\`\`javascript
draw(ctx) {
    // Main canvas (game layer)
    ctx = this.getMainCanvas();
    
    // GUI canvas (UI layer - draws on top of everything)
    ctx = this.getGuiCanvas();
    
    // Background canvas (draws behind everything)
    ctx = this..getBackgroundCanvas();
    
    ctx.save();
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(-50, -50, 100, 100);  // Centered on GameObject if ignoreGameObjectTransform = false
    ctx.restore();
}
\`\`\`

### Viewport (Camera)
\`\`\`javascript
// Access camera viewport
const vp = this.viewport; // { x, y, width, height, zoom }
console.log(vp.x, vp.y);  // Center viewport in world space
console.log(vp.width, vp.height);  // Viewport dimensions
\`\`\`

### Math Utilities (matterMath)
\`\`\`javascript
// Angles & directions
window.matterMath.degtorad(90)  // Convert degrees to radians
window.matterMath.pointDirection(x1, y1, x2, y2)  // Angle between points
window.matterMath.lengthDirX(length, angle)  // X component of vector
window.matterMath.lengthDirY(length, angle)  // Y component

// Interpolation
window.matterMath.lerp(start, end, t)  // Linear interpolation
window.matterMath.sine(period, amplitude)  // Oscillating value

// Random
window.matterMath.random(max)  // Float: 1 to max
window.matterMath.irandom(max)  // Integer: 1 to max
window.matterMath.randomRange(min, max)
window.matterMath.choose("a", "b", "c")  // Pick random argument

// Other
window.matterMath.clamp(value, min, max)
window.matterMath.pointDistance(x1, y1, x2, y2)
\`\`\`

### Vector2 Methods
\`\`\`javascript
const v = new Vector2(1, 0);
v.add(other)  // Instance method
v.subtract(other)
v.multiply(scalar)
v.divide(scalar)
v.normalize()  // Returns normalized vector
v.magnitude()  // Length
v.distance(other)  // Distance to another vector

// Static methods
Vector2.lerp(start, end, t)
Vector2.distance(v1, v2)
\`\`\`

## Built-in Modules (Reference)

### Physics
- **RigidBody**: Matter.js physics (bodyType, density, friction, restitution)
- **BasicPhysics**: Simple physics without Matter.js

### Rendering
- **SpriteRenderer**: Display images (imageAsset, width, height, scaleMode)

### Controllers
- **KeyboardController**: WASD/Arrow key movement
- **CameraController**: Camera following and zoom

### Logic
- **Timer**: Execute actions after delay

### UI
- **Button**: Interactive buttons with click actions
- **Text**: Display formatted text

### Animation
- **Tween**: Property animation with easing
- **ParticleSystem**: Particle effects

### Utility
- **FollowTarget**: Follow another GameObject
- **Spawner**: Spawn objects at intervals

## Best Practices

1. **Always use \`onChange\` in \`exposeProperty()\`** to update internal values
2. **Register modules globally**: \`window.ModuleName = ModuleName;\`
3. **Use deltaTime** for frame-rate independent movement
4. **Call \`ctx.save()\` and \`ctx.restore()\`** when drawing
5. **Check module existence** before accessing: \`if (module) { ... }\`
6. **Use Vector2 instance methods** (no static add/subtract)
7. **Implement toJSON/fromJSON** for properties that need persistence

Generate complete, functional modules that follow this architecture.`;

        switch (provider) {
            case 'chatgpt':
                return await this.callOpenAI(apiKey, systemPrompt, message);
            case 'gemini':
                return await this.callGemini(apiKey, systemPrompt, message);
            case 'claude':
                return await this.callClaude(apiKey, systemPrompt, message);
            default:
                throw new Error('Unknown AI provider');
        }
    }

    async callOpenAI(apiKey, systemPrompt, message) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callGemini(apiKey, systemPrompt, message) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }]
                }],
                generationConfig: {
                    maxOutputTokens: 2000,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async callClaude(apiKey, systemPrompt, message) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 2000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: message }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    addMessageToChat(role, content, isLoading = false) {
        const messagesContainer = this.modal.querySelector('#se-ai-messages');
        const messageId = 'msg-' + Date.now();

        const messageDiv = document.createElement('div');
        messageDiv.className = `se-ai-message ${role}`;
        messageDiv.id = messageId;

        const icon = role === 'user' ? 'fas fa-user' : 'fas fa-robot';
        const formattedContent = isLoading ? content : this.formatMessage(content);

        messageDiv.innerHTML = `
            <div class="se-message-icon">
                <i class="${icon}"></i>
            </div>
            <div class="se-message-content">${formattedContent}</div>
            ${role === 'assistant' && !isLoading ? '<div class="se-message-actions"><button class="se-button se-small" onclick="this.closest(\'.se-script-editor\').scriptEditor.insertCodeFromMessage(this)"><i class="fas fa-plus"></i> Insert</button></div>' : ''}
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        return messageId;
    }

    updateMessageInChat(messageId, content) {
        const messageEl = this.modal.querySelector(`#${messageId}`);
        if (messageEl) {
            const contentEl = messageEl.querySelector('.se-message-content');
            contentEl.innerHTML = this.formatMessage(content);

            // Add insert button for assistant messages
            if (!messageEl.querySelector('.se-message-actions')) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'se-message-actions';
                actionsDiv.innerHTML = '<button class="se-button se-small" onclick="this.closest(\'.se-modal\').parentElement.querySelector(\'.se-modal\').scriptEditor.insertCodeFromMessage(this)"><i class="fas fa-plus"></i> Insert</button>';
                messageEl.appendChild(actionsDiv);
            }
        }
    }

    setupScriptsToolbar() {
        if (!this.scriptsPanel) return;

        // Create toolbar container
        const toolbar = document.createElement('div');
        toolbar.className = 'se-scripts-toolbar';
        toolbar.style.cssText = `
        display: flex;
        gap: 4px;
        padding: 8px;
        background: #2d2d2d;
        border-bottom: 1px solid #555;
        flex-wrap: wrap;
    `;

        // Helper function to create toolbar button
        const createToolbarButton = (icon, title, onClick) => {
            const button = document.createElement('button');
            button.className = 'se-toolbar-button';
            button.title = title;
            button.innerHTML = `<i class="fas ${icon}"></i>`;
            button.style.cssText = `
            padding: 6px 10px;
            background: #3d3d3d;
            border: 1px solid #555;
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        `;

            button.addEventListener('mouseenter', () => {
                button.style.background = '#4d4d4d';
            });

            button.addEventListener('mouseleave', () => {
                button.style.background = '#3d3d3d';
            });

            button.addEventListener('click', onClick);
            return button;
        };

        // Add buttons for each script type
        const buttons = [
            {
                icon: 'fa-cube',
                title: 'New Module Script',
                onClick: () => this.createNewScript('module')
            },
            {
                icon: 'fa-window-maximize',
                title: 'New Editor Window Script',
                onClick: () => this.createNewScript('editorwindow')
            },
            {
                icon: 'fa-code',
                title: 'New Utility Script',
                onClick: () => this.createNewScript('utility')
            },
            {
                icon: 'fa-file-alt',
                title: 'New Text File',
                onClick: () => this.createNewScript('txt')
            },
            {
                icon: 'fa-book',
                title: 'New Documentation',
                onClick: () => this.createNewScript('doc')
            },
            // New: Add Clear Cache button
            {
                icon: 'fa-trash',
                title: 'Clear Cache (Delete All Local Files)',
                onClick: () => this.clearCache()
            }
        ];

        buttons.forEach(btn => {
            toolbar.appendChild(createToolbarButton(btn.icon, btn.title, btn.onClick));
        });

        // Insert toolbar before the header
        const header = this.scriptsPanel.querySelector('.se-scripts-header');
        this.scriptsPanel.insertBefore(toolbar, header);
    }

    // New method: Clear cache with confirmation
    async clearCache() {
        const confirmed = await this.promptClearCacheConfirmation();
        if (!confirmed) return;

        try {
            // Clear only Script Editor-specific localStorage keys
            localStorage.removeItem('scriptEditorAISettings');
            localStorage.removeItem('dmscriptEditorWindowState');
            localStorage.removeItem('scriptEditorScrollPositions');

            this.showStatusMessage('Cache cleared successfully');
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.showStatusMessage('Error clearing cache', true);
        }
    }

    // New helper method: Prompt for cache clear confirmation
    promptClearCacheConfirmation() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'se-confirm-dialog';
            dialog.style.display = 'flex';
            dialog.innerHTML = `
                <div class="se-confirm-content">
                    <h3>Clear Cache</h3>
                    <p>This will permanently delete local settings created by the editor. This action cannot be undone.</p>
                    <p>Are you sure you want to continue?</p>
                    <div class="se-confirm-buttons">
                        <button class="se-button" id="se-confirm-clear">Yes, Clear Cache</button>
                        <button class="se-button" id="se-cancel-clear">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);

            const cleanup = () => dialog.remove();

            dialog.querySelector('#se-confirm-clear').onclick = () => {
                cleanup();
                resolve(true);
            };

            dialog.querySelector('#se-cancel-clear').onclick = () => {
                cleanup();
                resolve(false);
            };
        });
    }

    async createNewScript(type) {
        // Prompt for filename
        const filename = await this.promptForFilename(type);
        if (!filename) return;

        // Validate filename
        const extension = this.getExtensionForType(type);
        const fullFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

        // Check if file already exists
        const scriptsDir = `scripts/${type}s`;
        const fullPath = `${scriptsDir}/${fullFilename}`;

        if (window.fileBrowser) {
            const exists = await window.fileBrowser.fileExists(fullPath);
            if (exists) {
                alert(`File "${fullFilename}" already exists!`);
                return;
            }

            // Generate template content
            const content = this.generateTemplate(type, filename);

            // Create the file
            try {
                await window.fileBrowser.createFile(fullPath, content);
                this.showStatusMessage(`Created ${fullFilename}`);

                // Refresh the scripts list
                await this.updateScriptsList();

                // Open the new file
                await this.switchToScript(fullPath);
            } catch (error) {
                console.error('Error creating file:', error);
                alert(`Failed to create file: ${error.message}`);
            }
        }
    }

    promptForFilename(type) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'se-confirm-dialog';
            dialog.style.display = 'flex';
            dialog.innerHTML = `
            <div class="se-confirm-content">
                <h3>Create New ${this.getTypeDisplayName(type)}</h3>
                <input type="text" id="se-new-filename" placeholder="Enter filename" style="
                    width: 100%;
                    padding: 8px;
                    margin: 12px 0;
                    background: #3d3d3d;
                    border: 1px solid #555;
                    border-radius: 4px;
                    color: #fff;
                    font-size: 14px;
                ">
                <div class="se-confirm-buttons">
                    <button class="se-button" id="se-create-file">Create</button>
                    <button class="se-button" id="se-cancel-create">Cancel</button>
                </div>
            </div>
        `;
            document.body.appendChild(dialog);

            const input = dialog.querySelector('#se-new-filename');
            input.focus();

            const cleanup = () => dialog.remove();

            dialog.querySelector('#se-create-file').onclick = () => {
                const filename = input.value.trim();
                cleanup();
                resolve(filename || null);
            };

            dialog.querySelector('#se-cancel-create').onclick = () => {
                cleanup();
                resolve(null);
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const filename = input.value.trim();
                    cleanup();
                    resolve(filename || null);
                } else if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                }
            });
        });
    }

    getExtensionForType(type) {
        const extensions = {
            'module': '.js',
            'editorwindow': '.js',
            'utility': '.js',
            'txt': '.txt',
            'doc': '.doc'
        };
        return extensions[type] || '.js';
    }

    getTypeDisplayName(type) {
        const names = {
            'module': 'Module Script',
            'editorwindow': 'Editor Window Script',
            'utility': 'Utility Script',
            'txt': 'Text File',
            'doc': 'Documentation File'
        };
        return names[type] || 'File';
    }

    generateTemplate(type, filename) {
        // Remove extension from filename for class names
        const baseName = filename.replace(/\.[^/.]+$/, "");
        const className = baseName;

        switch (type) {
            case 'module':
                return this.generateModuleTemplate(className);
            case 'editorwindow':
                return this.generateEditorWindowTemplate(className);
            case 'utility':
                return this.generateUtilityTemplate(className);
            case 'txt':
                return 'Jot down notes here...'; // Empty text file
            case 'doc':
                return this.generateDocTemplate(className);
            default:
                return '';
        }
    }

    generateModuleTemplate(className) {
        return `/**
 * ${className} Module
 * 
 * Description: Add a description of what this module does
 */
class ${className} extends Module {
    static namespace = "Custom"; // Category in the Add Module menu
    static description = "Description of this module"; // Shown in module list
    static allowMultiple = false; // Allow multiple instances on same GameObject
    static icon = "⭐"; // Optional: Emoji/icon in module list

    constructor() {
        super("${className}");

        // If true, drawing won't be affected by GameObject transform
        this.ignoreGameObjectTransform = false;

        // Require other modules (optional)
        // this.require("RigidBody");

        // Initialize properties
        this.speed = 100;
        this.enabled = true;

        // Expose properties to Inspector
        this.exposeProperty("speed", "number", 100, {
            min: 0,
            max: 500,
            step: 10,
            description: "Movement speed",
            onChange: (val) => {
                this.speed = val;
            }
        });

        this.exposeProperty("enabled", "boolean", true, {
            description: "Enable/disable this module",
            onChange: (val) => {
                this.enabled = val;
            }
        });
    }

    /**
     * Called before the game starts - load assets here
     */
    async preload() {
        await super.preload();
        
        // Load assets here
        // Example:
        // this.sprite = await this.gameObject.loadAsset('path/to/sprite.png');
    }

    /**
     * Called once when the module is first activated
     */
    start() {
        super.start();
        
        // Initialize module here
    }

    /**
     * Called at the start of each frame
     */
    beginLoop() {
        // Pre-update logic
    }

    /**
     * Called every frame - main update logic
     * @param {number} deltaTime - Time in seconds since last frame
     */
    loop(deltaTime) {
        if (!this.enabled) return;

        // Main game logic here
        // Example: Move the object
        // this.gameObject.position.x += this.speed * deltaTime;
    }

    /**
     * Called at the end of each frame
     */
    endLoop() {
        // Post-update logic
    }

    /**
     * Called when the module should render
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.enabled) return;

        // Custom rendering here
        // Note: If ignoreGameObjectTransform is false, 
        // drawing is relative to GameObject position
    }

    /**
     * Called when GameObject is selected in editor (editor only)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawGizmos(ctx) {
        // Debug visualization here
        // Example: Draw a circle around the object
        // ctx.strokeStyle = "#00ff00";
        // ctx.beginPath();
        // ctx.arc(0, 0, 50, 0, Math.PI * 2);
        // ctx.stroke();
    }

    /**
     * Called when the module is destroyed
     */
    onDestroy() {
        // Cleanup resources here
    }

    /**
     * Serialize module data for saving
     */
    toJSON() {
        return {
            ...super.toJSON(),
            speed: this.speed
        };
    }

    /**
     * Deserialize module data when loading
     */
    fromJSON(data) {
        super.fromJSON(data);
        if (data.speed !== undefined) this.speed = data.speed;
        return this;
    }
}

// Register the module globally
window.${className} = ${className};
`;
    }

    generateEditorWindowTemplate(className) {
        return `/**
 * ${className} - Custom Editor Window App
 * 
 * Description: Add a description of what this window does
 */
class ${className}Window extends EditorWindow {
    constructor() {
        super("${className}Window", {
            width: 600,
            height: 400,
            resizable: true,
            modal: false,
            closable: true
        });

        // Initialize properties
        this.setupUI();
    }

    /**
     * Setup the UI components
     */
    setupUI() {
        // Clear any existing content
        this.clearContent();

        // Add a title
        const title = document.createElement('h2');
        title.textContent = '${className}';
        title.style.cssText = \`
            margin: 0 0 16px 0;
            color: #ffffff;
            font-size: 18px;
        \`;
        this.addContent(title);

        // Add a description
        const description = document.createElement('p');
        description.textContent = 'Add a description of what this window does here.';
        description.style.cssText = \`
            margin: 0 0 16px 0;
            color: #cccccc;
        \`;
        this.addContent(description);

        // Example: Add an input field
        const input = this.addInput('myInput', 'Input Label:', {
            type: 'text',
            placeholder: 'Enter text here',
            onChange: (value) => {
                console.log('Input changed:', value);
            }
        });
        this.addContent(input.parentElement);

        // Example: Add a button
        const button = this.addButton('myButton', 'Click Me', {
            onClick: () => {
                alert('Button clicked!');
            }
        });
        this.addContent(button);

        // Expose properties for inspector integration
        this.exposeProperty('myProperty', 'string', 'default value', {
            description: 'A custom property',
            onChange: (value) => {
                console.log('Property changed:', value);
            }
        });
    }

    /**
     * Called when the window is shown
     */
    onShow() {
        console.log(\`\${this.title} window shown\`);
    }

    /**
     * Called when the window is hidden
     */
    onHide() {
        console.log(\`\${this.title} window hidden\`);
    }

    /**
     * Called before the window is closed (return false to cancel)
     */
    onBeforeClose() {
        // Add any confirmation logic here
        return true;
    }

    /**
     * Called when the window is closed
     */
    onClose() {
        console.log(\`\${this.title} window closed\`);
    }

    /**
     * Called when the window is resized
     */
    onResize(width, height) {
        console.log(\`Window resized to \${width}x\${height}\`);
    }

    /**
     * Serialize window data
     */
    serialize() {
        return {
            ...super.serialize(),
            // Add custom data here
            myProperty: this.myProperty
        };
    }

    /**
     * Deserialize window data
     */
    deserialize(data) {
        super.deserialize(data);
        // Restore custom data here
        if (data.myProperty) {
            this.myProperty = data.myProperty;
        }
    }
}

// Register the window globally
window.${className}Window = ${className}Window;

// Optional: Create a global instance
// window.global${className} = new ${className}();
`;
    }

    generateUtilityTemplate(className) {
        return `/**
 * ${className} Utility
 * 
 * Description: Add a description of what this utility does
 */

// Option 1: Standalone functions
function f${className}() {
    // Add your utility function logic here
    console.log('f${className} function called');
}

// Export function globally (the f is how we can separate it from modules)
window.f${className} = f${className};

// Option 2: Utility class with static methods
//class ${className} {
    /**
     * Example static method
     */
    /*static exampleMethod(param) {
        console.log('Example method called with:', param);
        return param;
    }*/

    /**
     * Another utility method
     */
    /*static processData(data) {
        // Process data here
        return data;
    }*/

    /**
     * Helper function
     */
    /*static helperFunction() {
        // Add helper logic
    }*/
//}

// Export class globally
/*window.${className} = ${className};

// Option 3: Object with utility methods
const ${className}Utils = {
    method1: function() {
        // Method 1 logic
    },

    method2: function(param) {
        // Method 2 logic
        return param;
    },

    helperMethod: function() {
        // Helper logic
    }
};

// Export utilities object globally
window.${className}Utils = ${className}Utils;*/

// Example usage:
// ${className.toLowerCase()}Function();
// ${className}.exampleMethod('test');
// ${className}Utils.method1();
`;
    }

    generateDocTemplate(className) {
        return JSON.stringify({
            "Overview": {
                "Introduction": `# ${className} Documentation\n\nAdd introduction here.`,
                "Quick Start": `## Quick Start\n\nAdd quick start guide here.`
            },
            "Properties": {
                "Basic Properties": "## Basic Properties\n\nList and describe properties here."
            },
            "API Reference": {
                "Methods": "## Methods\n\nDocument methods here."
            },
            "Usage Examples": {
                "Basic Usage": "## Basic Usage\n\nAdd usage examples here."
            },
            "Technical Information": {
                "Implementation Details": "## Implementation Details\n\nAdd technical details here."
            }
        }, null, 2);
    }

    formatMessage(content) {
        // Convert markdown-style code blocks to HTML
        return content
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    insertCodeFromMessage(button) {
        if (!this.editor) return;

        const messageContent = button.closest('.se-ai-message').querySelector('.se-message-content');
        const codeBlocks = messageContent.querySelectorAll('code, pre code');

        if (codeBlocks.length === 1) {
            // Single code block - insert directly
            const code = codeBlocks[0].textContent;
            this.editor.replaceSelection(code);
        } else if (codeBlocks.length > 1) {
            // Multiple code blocks - show selection dialog
            this.showCodeSelectionDialog(codeBlocks);
        } else {
            this.showStatusMessage('No code found in message', true);
        }
    }

    showCodeSelectionDialog(codeBlocks) {
        // Create a simple selection dialog for multiple code blocks
        const dialog = document.createElement('div');
        dialog.className = 'se-code-selection-dialog';
        dialog.innerHTML = `
            <div class="se-code-selection-content">
                <h3>Select code to insert:</h3>
                <div class="se-code-options">
                    ${Array.from(codeBlocks).map((block, index) => `
                        <div class="se-code-option" data-index="${index}">
                            <pre><code>${block.textContent.substring(0, 100)}${block.textContent.length > 100 ? '...' : ''}</code></pre>
                        </div>
                    `).join('')}
                </div>
                <div class="se-code-selection-buttons">
                    <button class="se-button" id="se-cancel-code-selection">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Handle selection
        dialog.querySelectorAll('.se-code-option').forEach(option => {
            option.addEventListener('click', () => {
                const index = parseInt(option.dataset.index);
                const code = codeBlocks[index].textContent;
                this.editor.replaceSelection(code);
                document.body.removeChild(dialog);
            });
        });

        dialog.querySelector('#se-cancel-code-selection').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    setupAdvancedFeatures() {
        if (!this.editor) return;

        // Quick peek - Ctrl+Alt+P
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.ctrlKey && e.altKey && e.code === 'KeyP') {
                e.preventDefault();
                this.toggleMinimap();
            }
        });

        // Bookmark toggle - Ctrl+B
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen || !this.editor) return;
            if (e.ctrlKey && e.code === 'KeyB' && !e.shiftKey) {
                e.preventDefault();
                this.toggleBookmark();
            }
        });

        // Copy qualified name - Ctrl+Shift+C
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
                e.preventDefault();
                this.copyQualifiedName();
            }
        });

        // Delete line - Ctrl+Shift+K
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen || !this.editor) return;
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyK') {
                e.preventDefault();
                const cursor = this.editor.getCursor();
                this.editor.replaceRange('', { line: cursor.line, ch: 0 }, { line: cursor.line + 1, ch: 0 });
            }
        });

        // Duplicate line - Ctrl+D
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen || !this.editor) return;
            if (e.ctrlKey && e.code === 'KeyD') {
                e.preventDefault();
                const cursor = this.editor.getCursor();
                const line = this.editor.getLine(cursor.line);
                this.editor.replaceRange(line + '\n', { line: cursor.line, ch: 0 });
            }
        });

        // Move line up - Alt+Up
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen || !this.editor) return;
            if (e.altKey && e.code === 'ArrowUp') {
                e.preventDefault();
                this.moveLineUp();
            }
        });

        // Move line down - Alt+Down
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen || !this.editor) return;
            if (e.altKey && e.code === 'ArrowDown') {
                e.preventDefault();
                this.moveLineDown();
            }
        });

        // Update code stats on change
        this.editor.on('change', () => {
            this.updateCodeStats();
            this.updateBreadcrumbs();
        });
    }

    toggleMinimap() {
        if (!this.minimap) {
            this.createMinimap();
        }
        this.minimap.classList.toggle('visible');
    }

    createMinimap() {
        const editorContainer = this.modal.querySelector('.se-modal-editor-container');
        this.minimap = document.createElement('div');
        this.minimap.className = 'se-minimap';
        this.minimap.innerHTML = '<canvas id="se-minimap-canvas"></canvas>';
        editorContainer.appendChild(this.minimap);
    }

    toggleBookmark() {
        if (!this.editor) return;
        const cursor = this.editor.getCursor();
        const line = cursor.line;

        const existingIndex = this.bookmarks.indexOf(line);
        if (existingIndex > -1) {
            this.bookmarks.splice(existingIndex, 1);
            this.editor.removeLineClass(line, 'background', 'se-bookmarked-line');
        } else {
            this.bookmarks.push(line);
            this.editor.addLineClass(line, 'background', 'se-bookmarked-line');
        }
    }

    moveLineUp() {
        const cursor = this.editor.getCursor();
        if (cursor.line === 0) return;

        const line = this.editor.getLine(cursor.line);
        const prevLine = this.editor.getLine(cursor.line - 1);

        this.editor.replaceRange(line + '\n' + prevLine + '\n',
            { line: cursor.line - 1, ch: 0 },
            { line: cursor.line + 1, ch: 0 }
        );

        this.editor.setCursor({ line: cursor.line - 1, ch: cursor.ch });
    }

    moveLineDown() {
        const cursor = this.editor.getCursor();
        if (cursor.line === this.editor.lineCount() - 1) return;

        const line = this.editor.getLine(cursor.line);
        const nextLine = this.editor.getLine(cursor.line + 1);

        this.editor.replaceRange(nextLine + '\n' + line + '\n',
            { line: cursor.line, ch: 0 },
            { line: cursor.line + 2, ch: 0 }
        );

        this.editor.setCursor({ line: cursor.line + 1, ch: cursor.ch });
    }

    updateCodeStats() {
        if (!this.editor) return;

        const code = this.editor.getValue();
        const lines = code.split('\n').length;
        const chars = code.length;
        const functions = (code.match(/(?:function|async\s+function|\w+\s*\()/g) || []).length;
        const classes = (code.match(/class\s+\w+/g) || []).length;

        this.codeStats = { lines, chars, functions, classes };
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const statusEl = this.modal.querySelector('.se-modal-status');
        let statsDiv = statusEl.querySelector('.se-code-stats');

        if (!statsDiv) {
            statsDiv = document.createElement('span');
            statsDiv.className = 'se-code-stats';
            statusEl.appendChild(statsDiv);
        }

        const { lines, chars, functions, classes } = this.codeStats;
        statsDiv.innerHTML = `| Lines: ${lines} | Chars: ${chars} | Functions: ${functions} | Classes: ${classes}`;
    }

    updateBreadcrumbs() {
        if (!this.editor) return;

        const code = this.editor.getValue();
        const cursor = this.editor.getCursor();
        const lineNum = cursor.line;

        // Simple breadcrumb extraction (class and function names)
        const classMatch = code.substring(0, this.editor.getRange({ line: 0, ch: 0 }, { line: lineNum, ch: 0 }).length).match(/class\s+(\w+)/g);
        const funcMatch = code.substring(0, this.editor.getRange({ line: 0, ch: 0 }, { line: lineNum, ch: 0 }).length).match(/(?:async\s+)?(?:function|\w+\s*\()/g);

        this.breadcrumbs = [];
        if (classMatch && classMatch.length > 0) {
            const lastClass = classMatch[classMatch.length - 1].match(/\w+$/)[0];
            this.breadcrumbs.push(lastClass);
        }
        if (funcMatch && funcMatch.length > 0) {
            this.breadcrumbs.push('...');
        }
    }

    copyQualifiedName() {
        if (this.breadcrumbs.length === 0) {
            this.showStatusMessage('No qualified name found', true);
            return;
        }

        const qualified = this.breadcrumbs.join('.');
        navigator.clipboard.writeText(qualified);
        this.showStatusMessage(`Copied: ${qualified}`);
    }
}

// Export the class
window.ScriptEditor = ScriptEditor;