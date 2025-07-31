class ScriptEditor {
    constructor() {
        this.isOpen = false;
        this.currentPath = null;
        this.originalContent = '';
        this.editor = null;
        this.aiPanel = null;
        this.aiSettings = this.loadAISettings();
        this.createModal();
        this.setupEventListeners();
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
                    <div class="se-modal-controls">
                        <button class="se-button se-icon-button" id="se-ai-settings" title="AI Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="se-button se-icon-button" id="se-ai-toggle" title="Toggle AI Assistant">
                            <i class="fas fa-robot"></i>
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

        // Set initial editor width state
        this.modal.querySelector('.se-modal-editor-container').classList.add('fullwidth');

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
        let error = null;
        try {
            new Function(code);
            if (this.consoleErrors.length > 0) {
                this.consoleErrors = [];
                this.consoleErrorSet.clear();
                this.renderConsoleErrors();
            }
        } catch (e) {
            // Extract line/column from stack if possible
            let mainError = e.message;
            let lineInfo = '';
            let lineNum = null;
            let colNum = null;
            if (e.stack) {
                // Chrome/Edge: "at new Function (<anonymous>:3:10)"
                const match = e.stack.match(/<anonymous>:(\d+):(\d+)/);
                if (match) {
                    lineNum = parseInt(match[1], 10);
                    colNum = parseInt(match[2], 10);
                    lineInfo = ` (Line ${lineNum}${colNum ? `, Col ${colNum}` : ''})`;
                }
            }
            mainError += lineInfo;
            if (!this.consoleErrorSet.has(mainError)) {
                this.consoleErrors.push(mainError);
                this.consoleErrorSet.add(mainError);
                this.renderConsoleErrors();
                // Optionally highlight the error line in CodeMirror
                if (lineNum && this.editor) {
                    this.editor.addLineClass(lineNum - 1, 'background', 'se-error-line');
                }
            }
        }
        // Remove error if fixed
        if (!error && this.consoleErrors.length > 0) {
            try {
                new Function(code);
                this.consoleErrors = [];
                this.consoleErrorSet.clear();
                this.renderConsoleErrors();
                // Remove error highlights
                if (this.editor) {
                    for (let i = 0; i < this.editor.lineCount(); i++) {
                        this.editor.removeLineClass(i, 'background', 'se-error-line');
                    }
                }
            } catch { }
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
            if (this.editor) this.editor.execCommand('replace');
        });

        // Format button
        document.getElementById('se-format').addEventListener('click', () => this.formatCode());

        document.getElementById('se-docs').addEventListener('click', () => {
            if (window.docModal) {
                window.docModal.toggle();
            }
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
                this.promptCloseIfModified();
            }
        });

        // Handle clicks outside the modal content to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.promptCloseIfModified();
            }
        });

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

        this.currentPath = path;
        this.originalContent = content;

        // Set path in UI
        this.modal.querySelector('.se-modal-path').textContent = path;

        if (this.editor) {
            this.editor.toTextArea();
            this.editor = null;
        }

        // Reset undo history when opening a new file
        if (this.editor) {
            this.editor.setValue(content);
            this.editor.clearHistory();
            this.editor.focus();
            // Initialize the hint box
            this.updateHintBox();
        } else {
            await this.initCodeMirror(content);
            // Initialize the hint box once CodeMirror is ready
            this.updateHintBox();
        }

        this.updateModifiedStatus(false);
        this.open();
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

        let html = `<h3>${doc.name || 'Documentation'}</h3>`;

        if (doc.description) {
            html += `<p>${doc.description}</p>`;
        }

        if (doc.example) {
            html += `<p><strong>Example:</strong></p>
                     <code>${doc.example}</code>`;
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

        if (doc.returns) {
            html += `<p><strong>Returns:</strong></p>
                    <div class="param">
                      <span class="param-type">${doc.returns.type || ''}</span>
                      <div>${doc.returns.description || ''}</div>
                    </div>`;
        }

        hintContent.innerHTML = html;
    }

    getDocumentationForCursor() {
        if (!this.editor) return null;

        const cursor = this.editor.getCursor();
        const line = this.editor.getLine(cursor.line);

        // Check if the cursor is inside a function call parentheses
        const leftPart = line.substring(0, cursor.ch);
        const rightPart = line.substring(cursor.ch);

        // If we're inside parentheses, check for a function name before them
        const insideParenMatch = /([a-zA-Z0-9_$]+)\s*\([^()]*$/.exec(leftPart);
        if (insideParenMatch && rightPart.match(/^[^()]*\)/)) {
            const functionName = insideParenMatch[1];

            // Try to find documentation for this function
            for (const category in window.DarkMatterDocs) {
                if (window.DarkMatterDocs[category].functions &&
                    window.DarkMatterDocs[category].functions[functionName]) {
                    return {
                        name: functionName,
                        ...window.DarkMatterDocs[category].functions[functionName]
                    };
                }
            }
        }

        // If not in parentheses, or function not found, check word under cursor
        const token = this.editor.getTokenAt(cursor);
        if (token && token.type && (token.type.includes('variable') || token.type.includes('property'))) {
            const word = token.string;

            // Look for the word in the documentation
            for (const category in window.DarkMatterDocs) {
                if (window.DarkMatterDocs[category].functions &&
                    window.DarkMatterDocs[category].functions[word]) {
                    return {
                        name: word,
                        ...window.DarkMatterDocs[category].functions[word]
                    };
                }
            }
        }

        return null;
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

    async save() {
        if (!this.editor || !this.currentPath) return;

        const content = this.editor.getValue();

        try {
            // Save the file
            if (window.fileBrowser) {
                await window.fileBrowser.createFile(this.currentPath, content, true); // true to overwrite
                this.originalContent = content;
                this.updateModifiedStatus(false);

                // Show brief success message
                this.showStatusMessage('File saved successfully');

                // Check if this is a module file and reload it
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
        messageEl.style.opacity = '1';

        // Hide after delay
        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            messageEl.style.opacity = '0';
        }, 2000);
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

    open() {
        this.modal.style.display = 'flex';
        this.isOpen = true;
        if (this.editor) {
            setTimeout(() => {
                this.editor.refresh();
                this.editor.focus();
            }, 0);
        }
    }

    close() {
        // If there are unsaved changes and they might be module changes,
        // still attempt to reload from the last saved version
        if (this.hasUnsavedChanges() && this.currentPath) {
            // Try to reload from the last saved file
            window.fileBrowser?.readFile(this.currentPath)
                .then(content => {
                    this.reloadModuleIfNeeded(this.currentPath, content);
                })
                .catch(err => console.error("Couldn't reload module on close:", err));
        } else if (this.currentPath) {
            // Even if no unsaved changes, ensure module is registered when closing
            window.fileBrowser?.readFile(this.currentPath)
                .then(content => {
                    if (content && content.includes('extends Module')) {
                        this.reloadModuleIfNeeded(this.currentPath, content);
                    }
                })
                .catch(err => console.error("Couldn't check module on close:", err));
        }

        // Proceed with normal close
        this.modal.style.display = 'none';
        this.isOpen = false;
        this.currentPath = null;
    }

    // AI STUFF
    toggleAIPanel() {
        this.aiPanel.classList.toggle('open');
        const button = this.modal.querySelector('#se-ai-toggle');
        const editorContainer = this.modal.querySelector('.se-modal-editor-container');
        if (this.aiPanel.classList.contains('open')) {
            button.classList.add('active');
            editorContainer.classList.remove('fullwidth');
        } else {
            button.classList.remove('active');
            editorContainer.classList.add('fullwidth');
        }
        setTimeout(() => this.editor?.refresh(), 200); // Ensure CodeMirror resizes after animation
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
        const systemPrompt = `You are an AI assistant specialized expert in the Dark Matter JS game engine module system.

**Module System Basics:**
- Modules extend GameObject functionality
- GameObjects have: position (Vector2), scale (Vector2), angle (degrees), size (Vector2)
- All modules extend the Module base class
- Use this.gameObject to access the GameObject
- Access other modules: this.gameObject.getModule("ModuleName")
- Access viewport through 'window.engine.viewport.x', 'window.engine.viewport.y', 'window.engine.viewport.width', 'window.engine.viewport.height'

**Module Template:**
\`\`\`javascript
class MyModule extends Module {
    static namespace = "Category";
    static description = "Brief description";
    static allowMultiple = false; // or true

    constructor() {
        super("MyModule");

        this.speed = 100; // Default speed
        
        // Expose properties for inspector
        this.exposeProperty("speed", "number", 100, {
            description: "Movement speed",
            onChange: (val) => {
                this.speed = val; // Update speed when property changes
            }
        });
    }

    start() {
        // Initialize when game starts
    }

    loop(deltaTime) {
        // Update logic every frame
        // deltaTime is in seconds
        this.gameObject.position.x += this.speed * deltaTime;
    }

    draw(ctx) {
        // Render to canvas
    }

    drawGizmos(ctx) {
        // Draw debug gizmos (optional)
    }

    toJSON() { // Serialize module state
        return {
            speed: this.speed
        };
    }

    fromJSON(data) { // Deserialize module state
        this.speed = data.speed || 100; // Default to 100 if not provided
    }
}

window.MyModule = MyModule; // Register globally
\`\`\`

**Common Property Types:**
- "number", "string", "boolean", "color"
- "enum" (needs options: ["A", "B", "C"])
- "vector2" (for Vector2 objects)

**Available Input:**
- window.input.keyDown("w") - check if key held
- window.input.keyPressed("space") - check if key just pressed
- window.input.mouseDown("left") - mouse button states

**Transform Access:**
- this.gameObject.position (Vector2)
- this.gameObject.angle (degrees)
- this.gameObject.scale (Vector2)
- this.gameObject.getWorldPosition()

Provide working, complete modules. Keep code concise but functional.`;

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
}

// Export the class
window.ScriptEditor = ScriptEditor;