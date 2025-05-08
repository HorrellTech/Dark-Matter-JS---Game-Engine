class ScriptEditor {
    constructor() {
        this.isOpen = false;
        this.currentPath = null;
        this.originalContent = '';
        this.editor = null;
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'se-modal';
        this.modal.style.display = 'none';

        // Create modal content
        this.modal.innerHTML = `
            <div class="se-modal-content">
                <div class="se-modal-header">
                    <div class="se-modal-title">Script Editor</div>
                    <div class="se-modal-path"></div>
                    <div class="se-modal-close"><i class="fas fa-times"></i></div>
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
                </div>
                <div class="se-modal-editor-container">
                    <textarea id="se-editor"></textarea>
                </div>
                <div class="se-modal-status">
                    <span class="se-status-position">Ln 1, Col 1</span>
                    <span class="se-status-modified">No changes</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        
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
    }

    async loadFile(path, content) {
        if (!path) return;

        this.currentPath = path;
        this.originalContent = content;
        
        // Set path in UI
        this.modal.querySelector('.se-modal-path').textContent = path;
        
        // Reset undo history when opening a new file
        if (this.editor) {
            this.editor.setValue(content);
            this.editor.clearHistory();
            this.editor.focus();
        } else {
            await this.initCodeMirror(content);
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
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/javascript-hint.min.js")
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
                        
                        // Refresh the inspector if visible
                        if (window.editor.inspector) {
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
        }
        
        // Proceed with normal close
        this.modal.style.display = 'none';
        this.isOpen = false;
        this.currentPath = null;
    }
}

// Export the class
window.ScriptEditor = ScriptEditor;