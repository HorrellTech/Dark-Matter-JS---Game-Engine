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

        // Set initial state: AI panel closed, editor takes full width
        this.aiPanel.classList.remove('open');
        this.modal.querySelector('.se-modal-editor-container').classList.add('fullwidth');
        this.modal.querySelector('#se-ai-toggle').classList.remove('active');

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
            window.scriptDocsModal.open();
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

        // Dispose of existing editor if it exists
        if (this.editor) {
            this.editor.toTextArea();
            this.editor = null;
        }

        // Always initialize a new CodeMirror instance for the new file
        await this.initCodeMirror(content);

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
            // Refresh after modal is visible and layout is applied
            setTimeout(() => {
                this.editor.refresh();
                this.editor.focus();
            }, 10);
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
        const isOpening = !this.aiPanel.classList.contains('open');
        this.aiPanel.classList.toggle('open');
        const button = this.modal.querySelector('#se-ai-toggle');
        const editorContainer = this.modal.querySelector('.se-modal-editor-container');

        if (isOpening) {
            button.classList.add('active');
            editorContainer.classList.remove('fullwidth');
        } else {
            button.classList.remove('active');
            editorContainer.classList.add('fullwidth');
        }

        // Refresh CodeMirror after layout changes with proper timing for spring animation
        // Match the CSS transition duration (0.4s = 400ms) for smooth animation
        setTimeout(() => {
            if (this.editor) {
                this.editor.refresh();
                // Ensure focus is maintained if it was focused
                if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.se-modal-editor-container')) {
                    this.editor.focus();
                }
            }
        }, 400); // Match CSS transition duration for perfect synchronization
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
- Viewport x and y is viewport top left, and width and height is overall width/height

**Module Template:**
\`\`\`javascript
class MyModule extends Module {
    static namespace = "Category";
    static description = "Brief description";
    static allowMultiple = false; // or true to allow multiple

    constructor() {
        super("MyModule");

        this.speed = 100; // Default speed
        
        // Expose properties for inspector
        this.exposeProperty("speed", "number", 100, {
            description: "Movement speed",
            onChange: (val) => { // IMPORTANT TO UPDATE VARIABLES
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
- "vector2" (for Vector2 objects, does NOT have static methods for add / subtract etc)

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