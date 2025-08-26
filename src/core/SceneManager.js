class SceneManager {
    constructor(editor) {
        this.editor = editor;
        this.scenesFolder = 'Scenes';
        this.initializeToolbar();
    }

    initializeToolbar() {
        const toolbar = document.querySelector('.editor-toolbar') || this.createToolbar();

        const sceneControls = document.createElement('div');
        sceneControls.className = 'toolbar-group scene-controls';
        sceneControls.innerHTML = `
            <button class="toolbar-button" title="New Scene">
                <i class="fas fa-file"></i>
            </button>
            <button class="toolbar-button" title="Load Scene (Local)">
                <i class="fas fa-folder-open"></i>
            </button>
            <button class="toolbar-button" title="Save Scene (Local)">
                <i class="fas fa-save"></i>
            </button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-button" title="Export to File">
                <i class="fas fa-file-export"></i>
            </button>
            <button class="toolbar-button" title="Import from File">
                <i class="fas fa-file-import"></i>
            </button>
        `;

        toolbar.appendChild(sceneControls);
        this.setupToolbarListeners(sceneControls);
    }

    setupToolbarListeners(controls) {
        const [newBtn, loadBtn, saveBtn, exportBtn, importBtn] = controls.querySelectorAll('.toolbar-button');

        // Create new scene
        newBtn.addEventListener('click', () => this.createNewScene());

        // Load scene (prioritize file browser if available)
        loadBtn.addEventListener('click', () => {
            if (this.editor.fileBrowser) {
                this.openSceneDialog();
            } else {
                this.showLoadSceneDialog(); // Fallback to local storage
            }
        });

        // Save scene (prioritize file browser if available)
        saveBtn.addEventListener('click', () => {
            if (this.editor.fileBrowser) {
                this.saveCurrentScene();
            } else {
                this.saveToLocalStorage();
            }
        });

        // Export to file
        exportBtn.addEventListener('click', () => this.exportToFileSystem());

        // Import from file
        importBtn.addEventListener('click', () => this.importFromFileSystem());
    }

    async saveCurrentScene(forceSaveAs = false) {
        if (!this.editor.activeScene) return false;

        const scene = this.editor.activeScene;

        try {
            // Check if we have a file browser available
            if (!this.editor.fileBrowser) {
                console.warn('FileBrowser not available, falling back to local storage');
                return this.saveToLocalStorage();
            }

            // Ensure scenes folder exists (with correct capitalization)
            const scenesPath = await this.ensureScenesFolderExists();
            if (!scenesPath) {
                throw new Error('Could not create Scenes folder');
            }

            // Determine if we need to show save dialog
            if (!scene.path || forceSaveAs) {
                // Make sure the filename ends with .scene
                let fileName = scene.name;
                if (!fileName.endsWith('.scene')) {
                    fileName += '.scene';
                }

                // Show save dialog with scenes folder as default path
                const filePath = await this.editor.fileBrowser.showSaveDialog({
                    title: 'Save Scene',
                    defaultPath: `${scenesPath}/${fileName}`,
                    filters: [{ name: 'Scene Files', extensions: ['scene'] }]
                });

                if (!filePath) return false; // User cancelled
                scene.path = filePath;
            }

            // Save the scene to file
            const sceneData = JSON.stringify(scene.toJSON(), null, 2);
            const success = await this.editor.fileBrowser.writeFile(scene.path, sceneData);

            if (success) {
                scene.dirty = false;
                scene.isBuffered = false;

                // Update scene name from file name
                const fileName = scene.path.split('/').pop().split('\\').pop();
                scene.name = fileName.replace('.scene', '');

                this.updateSceneList();
                document.title = `Dark Matter JS - ${scene.name}`;

                // Show success notification
                if (this.editor.fileBrowser.showNotification) {
                    this.editor.fileBrowser.showNotification('Scene saved successfully');
                }

                return true;
            } else {
                throw new Error('Failed to write scene file');
            }
        } catch (error) {
            console.error('Error saving scene:', error);
            alert('Failed to save to file system. Falling back to local storage.');
            return this.saveToLocalStorage();
        }
    }

    async saveToLocalStorage() {
        if (!this.editor.activeScene) return;

        const scene = this.editor.activeScene;
        const name = scene.name;

        if (scene.isBuffered) {
            const newName = await this.promptSceneName(name);
            if (!newName) return;
            scene.name = newName;
        }

        SceneStorage.saveLocalScene(scene);
        scene.dirty = false;
        scene.isBuffered = false;
        scene.isLocal = true;

        this.updateSceneList();
        document.title = `Dark Matter JS - ${scene.name}`;
    }

    async openSceneDialog() {
        if (!await this.checkUnsavedChanges()) return;

        try {
            if (!this.editor.fileBrowser) {
                throw new Error('File browser not available');
            }

            const filePath = await this.editor.fileBrowser.showOpenDialog({
                title: 'Open Scene',
                filters: [{ name: 'Scene Files', extensions: ['scene'] }]
            });

            if (filePath) {
                await this.loadScene(filePath);
            }
        } catch (error) {
            console.error('Error opening scene dialog:', error);
            alert('Failed to open scene dialog');
        }
    }

    updateSceneList() {
        const dropdown = document.querySelector('.scene-dropdown');
        if (dropdown) {
            this.refreshSceneList(dropdown);
        }
    }

    async showLoadSceneDialog() {
        if (!await this.checkUnsavedChanges()) return;

        const sceneList = SceneStorage.getLocalSceneList();
        if (sceneList.length === 0) {
            alert('No saved scenes found');
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h2>Load Scene</h2>
                <div class="scene-list">
                    ${sceneList.map(scene => `
                        <div class="scene-item">
                            <span>${scene.name}</span>
                            <button class="delete-scene" data-name="${scene.name}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="dialog-buttons">
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Handle scene selection
        dialog.querySelectorAll('.scene-item').forEach(item => {
            const name = item.querySelector('span').textContent;
            item.addEventListener('click', () => {
                this.loadFromLocalStorage(name);
                dialog.remove();
            });
        });

        // Handle scene deletion
        dialog.querySelectorAll('.delete-scene').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = btn.dataset.name;
                if (confirm(`Delete scene "${name}"?`)) {
                    SceneStorage.deleteLocalScene(name);
                    btn.closest('.scene-item').remove();
                    if (dialog.querySelectorAll('.scene-item').length === 0) {
                        dialog.remove();
                    }
                }
            });
        });

        dialog.querySelector('.cancel-btn').onclick = () => dialog.remove();
    }

    /**
     * Load a scene from local storage
     * @param {string} name - The name of the scene to load
     */
    async loadFromLocalStorage(name) {
        try {
            const scene = SceneStorage.loadLocalScene(name);
            if (!scene) {
                throw new Error(`Scene "${name}" not found in local storage`);
            }

            // Remove any buffered scenes when loading a saved one
            this.editor.scenes = this.editor.scenes.filter(s => !s.isBuffered);
            this.editor.scenes.push(scene);
            this.editor.setActiveScene(scene);
            this.updateSceneList();
        } catch (error) {
            console.error('Error loading scene from local storage:', error);
            alert('Failed to load scene from local storage');
        }
    }

    /**
     * Load a scene from the file system
     * @param {string} filePath - The path to the scene file
     */
    async loadScene(filePath) {
        try {
            if (!filePath) {
                throw new Error('No file path provided');
            }

            if (!this.editor.fileBrowser) {
                throw new Error('FileBrowser not available');
            }

            // Read the file content
            const content = await this.editor.fileBrowser.readFile(filePath);
            if (!content) {
                throw new Error(`Could not read file: ${filePath}`);
            }

            // Parse the scene data
            const sceneData = JSON.parse(content);

            // Create a new scene from the data
            const scene = Scene.fromJSON(sceneData);
            scene.path = filePath;
            scene.dirty = false;
            scene.isBuffered = false;

            // Get name from file path
            const fileName = filePath.split('/').pop().split('\\').pop();
            scene.name = fileName.replace('.scene', '');

            // Remove any buffered scenes when loading a saved one
            this.editor.scenes = this.editor.scenes.filter(s => !s.isBuffered);
            this.editor.scenes.push(scene);
            this.editor.setActiveScene(scene);
            this.updateSceneList();

            // Update UI
            document.title = `Dark Matter JS - ${scene.name}`;
            if (this.editor.fileBrowser.showNotification) {
                this.editor.fileBrowser.showNotification(`Loaded scene: ${scene.name}`);
            }

            return scene;
        } catch (error) {
            console.error('Error loading scene:', error);
            alert(`Failed to load scene: ${error.message}`);
            return null;
        }
    }

    async exportToFileSystem() {
        if (!this.editor.activeScene) return;
        if (!this.editor.fileBrowser) {
            alert('File browser not available');
            return;
        }

        const scene = this.editor.activeScene;

        try {
            // Ensure scenes folder exists
            const scenesPath = await this.ensureScenesFolderExists();
            if (!scenesPath) {
                throw new Error('Could not ensure scenes folder exists');
            }

            // Get default file name
            const defaultFileName = scene.name.endsWith('.scene') ? scene.name : `${scene.name}.scene`;

            // Show save dialog
            const filePath = await this.editor.fileBrowser.showSaveDialog({
                title: 'Export Scene',
                defaultPath: `/${this.scenesFolder}/${defaultFileName}`,
                filters: [{ name: 'Scene Files', extensions: ['scene'] }]
            });

            if (!filePath) return;

            const sceneData = JSON.stringify(scene.toJSON(), null, 2);
            const success = await this.editor.fileBrowser.writeFile(filePath, sceneData);

            if (success) {
                scene.path = filePath;
                scene.dirty = false;
                scene.isBuffered = false;

                if (this.editor.fileBrowser.showNotification) {
                    this.editor.fileBrowser.showNotification('Scene exported successfully');
                } else {
                    alert('Scene exported successfully');
                }

                // Refresh the file browser to show the new file
                await this.editor.fileBrowser.refreshFiles();
            } else {
                throw new Error('Failed to write scene file');
            }
        } catch (error) {
            console.error('Error exporting scene:', error);
            alert('Failed to export scene: ' + error.message);
        }
    }

    async importFromFileSystem() {
        if (!await this.checkUnsavedChanges()) return;
        if (!this.editor.fileBrowser) return;

        const filePath = await this.editor.fileBrowser.showOpenDialog({
            title: 'Import Scene',
            filters: [{ name: 'Scene Files', extensions: ['scene'] }]
        });

        if (!filePath) return;

        try {
            const content = await this.editor.fileBrowser.readFile(filePath);
            const sceneData = JSON.parse(content);
            const scene = Scene.fromJSON(sceneData);
            scene.isLocal = false;

            this.editor.scenes = this.editor.scenes.filter(s => !s.isBuffered);
            this.editor.scenes.push(scene);
            this.editor.setActiveScene(scene);
            this.updateSceneList();
        } catch (error) {
            console.error('Error importing scene:', error);
            alert('Failed to import scene');
        }
    }

    async promptSceneName(defaultName = '') {
        return new Promise(resolve => {
            const dialog = document.createElement('div');
            dialog.className = 'dialog-overlay';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h2>Save Scene</h2>
                    <input type="text" class="scene-name-input" value="${defaultName}" placeholder="Enter scene name">
                    <div class="dialog-buttons">
                        <button class="save-btn">Save</button>
                        <button class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);
            const input = dialog.querySelector('.scene-name-input');
            input.select();

            dialog.querySelector('.save-btn').onclick = () => {
                const name = input.value.trim();
                if (name) {
                    dialog.remove();
                    resolve(name);
                }
            };
            dialog.querySelector('.cancel-btn').onclick = () => {
                dialog.remove();
                resolve(null);
            };
        });
    }

    async checkUnsavedChanges(promptUser = true) {
        const scene = this.editor.activeScene;
        if (scene && scene.dirty) {
            const result = await this.showUnsavedChangesDialog(promptUser);
            if (result === 'cancel') return false;
            if (result === 'save') {
                // Check if fileBrowser is available - if not, use local storage
                if (this.editor.fileBrowser) {
                    await this.saveCurrentScene();
                } else {
                    await this.saveToLocalStorage();
                }
            }
        }
        return true;
    }

    showUnsavedChangesDialog(promptUser = true) {
        if (!promptUser) return Promise.resolve('save');
        return new Promise(resolve => {
            const dialog = document.createElement('div');
            dialog.className = 'dialog-overlay';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h2>Unsaved Changes</h2>
                    <p>Do you want to save changes to the current scene?</p>
                    <div class="dialog-buttons">
                        <button class="save-btn">Save</button>
                        <button class="dont-save-btn">Don't Save</button>
                        <button class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('.save-btn').onclick = () => {
                dialog.remove();
                resolve('save');
            };
            dialog.querySelector('.dont-save-btn').onclick = () => {
                dialog.remove();
                resolve('dont-save');
            };
            dialog.querySelector('.cancel-btn').onclick = () => {
                dialog.remove();
                resolve('cancel');
            };
        });
    }

    initializeUI() {
        // Add scene manager UI to the hierarchy panel
        const sceneSelector = document.createElement('div');
        sceneSelector.className = 'scene-selector';
        sceneSelector.innerHTML = `
            <div class="scene-toolbar">
                <select class="scene-dropdown"></select>
                <button class="scene-button" title="Add Scene">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="scene-button" title="Scene Settings">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        `;

        // Wait for hierarchy to exist
        const hierarchy = document.querySelector('.hierarchy-container');
        if (hierarchy) {
            hierarchy.parentNode.insertBefore(sceneSelector, hierarchy);
            this.setupEventListeners(sceneSelector);
        } else {
            console.error('Hierarchy container not found');
        }
    }

    setupEventListeners(container) {
        const dropdown = container.querySelector('.scene-dropdown');
        const addButton = container.querySelector('.scene-button[title="Add Scene"]');
        const settingsButton = container.querySelector('.scene-button[title="Scene Settings"]');

        // Update dropdown when scenes change
        this.refreshSceneList(dropdown);

        // Handle scene selection
        dropdown.addEventListener('change', () => {
            const scene = this.editor.scenes.find(s => s.name === dropdown.value);
            if (scene) {
                this.editor.setActiveScene(scene);
            }
        });

        // Add new scene
        addButton.addEventListener('click', () => {
            this.createNewScene();
        });

        // Show settings dialog
        settingsButton.addEventListener('click', () => {
            this.showSceneSettings();
        });
    }

    async ensureScenesFolderExists() {
        if (!this.editor.fileBrowser) {
            console.error("File browser not available in editor");
            return null;
        }

        try {
            // Define the scenes folder path with capital S
            const scenesPath = '/Scenes';

            // Check if scenes folder exists
            const exists = await this.editor.fileBrowser.exists(scenesPath);

            if (!exists) {
                // Create scenes folder
                const result = await this.editor.fileBrowser.createDirectory(scenesPath);

                if (!result) {
                    console.error("Failed to create Scenes folder");
                    return null;
                }

                // Refresh file browser to show new folder
                await this.editor.fileBrowser.refreshFiles();
            }

            return scenesPath;
        } catch (error) {
            console.error('Error ensuring Scenes folder exists:', error);
            return null;
        }
    }

    refreshSceneList(dropdown) {
        dropdown.innerHTML = this.editor.scenes.map(scene =>
            `<option value="${scene.name}" ${scene === this.editor.activeScene ? 'selected' : ''}>
                ${scene.name}
            </option>`
        ).join('');
    }

    async createNewScene(promptUser = true) {
        // Check if there are unsaved changes in the current scene
        if (!(await this.checkUnsavedChanges())) return;

        // Create a new scene
        const scene = new Scene(this.getNextBufferName());
        scene.dirty = true;
        scene.isBuffered = true;

        // Clear hierarchy by setting the new scene as active
        this.editor.scenes = this.editor.scenes.filter(s => !s.isBuffered);
        this.editor.scenes.push(scene);
        this.editor.setActiveScene(scene);

        // Auto-save the scene if it's the first scene created or if the project is new
        await this.autoSaveSceneIfNeeded(scene);

        // Update UI
        this.updateSceneList();
        document.title = `Dark Matter JS - ${scene.name}`;

        return scene;
    }

    /**
 * Auto-save scene to file browser if needed
 */
    async autoSaveSceneIfNeeded(scene) {
        // Check if this is the first scene or if we should auto-save
        const shouldAutoSave = this.editor.scenes.length === 1 || // First scene
            scene.name.includes('Untitled Scene 1'); // Default first scene

        if (shouldAutoSave && this.editor.fileBrowser) {
            try {
                // Ensure Scenes folder exists
                const scenesPath = await this.ensureScenesFolderExists();
                if (scenesPath) {
                    // Generate a proper file name
                    const fileName = scene.name.replace(/\s+/g, '_') + '.scene';
                    const filePath = `${scenesPath}/${fileName}`;

                    // Save the scene data
                    const sceneData = JSON.stringify(scene.toJSON(), null, 2);
                    const success = await this.editor.fileBrowser.writeFile(filePath, sceneData);

                    if (success) {
                        // Update scene properties
                        scene.path = filePath;
                        scene.dirty = false;
                        scene.isBuffered = false;
                        scene.isLocal = false;

                        console.log(`Auto-saved default scene: ${fileName}`);

                        // Show notification
                        if (this.editor.fileBrowser.showNotification) {
                            this.editor.fileBrowser.showNotification(`Auto-saved scene: ${fileName}`, 'info');
                        }
                    } else {
                        console.warn('Failed to auto-save default scene');
                    }
                }
            } catch (error) {
                console.error('Error auto-saving scene:', error);
            }
        }
    }

    getNextBufferName() {
        // Create a unique untitled scene name
        const baseSceneName = "Untitled Scene";
        let counter = 1;

        // Find the next available number
        while (this.editor.scenes.some(s => s.name === `${baseSceneName} ${counter}`)) {
            counter++;
        }

        return `${baseSceneName} ${counter}`;
    }

    showSceneSettings() {
        if (!this.editor.activeScene) return;

        const settings = this.editor.activeScene.settings;
        const dialog = document.createElement('div');
        dialog.className = 'scene-settings-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h2>Scene Settings</h2>
                <div class="settings-grid">
                    <label>Viewport Width</label>
                    <input type="number" id="viewportWidth" value="${settings.viewportWidth}">
                    
                    <label>Viewport Height</label>
                    <input type="number" id="viewportHeight" value="${settings.viewportHeight}">
                    
                    <label>Background Color</label>
                    <input type="color" id="backgroundColor" value="${settings.backgroundColor}">
                    
                    <label>Grid Enabled</label>
                    <input type="checkbox" id="gridEnabled" ${settings.gridEnabled ? 'checked' : ''}>
                    
                    <label>Grid Size</label>
                    <input type="number" id="gridSize" value="${settings.gridSize}" min="1">
                    
                    <label>Snap to Grid</label>
                    <input type="checkbox" id="snapToGrid" ${settings.snapToGrid ? 'checked' : ''}>
                </div>
                <div class="dialog-buttons">
                    <button id="saveSettings">Save</button>
                    <button id="cancelSettings">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Handle save
        dialog.querySelector('#saveSettings').addEventListener('click', () => {
            settings.viewportWidth = parseInt(dialog.querySelector('#viewportWidth').value);
            settings.viewportHeight = parseInt(dialog.querySelector('#viewportHeight').value);
            settings.backgroundColor = dialog.querySelector('#backgroundColor').value;
            settings.gridEnabled = dialog.querySelector('#gridEnabled').checked;
            settings.gridSize = parseInt(dialog.querySelector('#gridSize').value);
            settings.snapToGrid = dialog.querySelector('#snapToGrid').checked;

            // Sync grid size with EditorGrid
            if (this.editor.grid) {
                this.editor.grid.gridSize = settings.gridSize;
            }

            this.editor.refreshCanvas();
            dialog.remove();
        });

        // Handle cancel
        dialog.querySelector('#cancelSettings').addEventListener('click', () => {
            dialog.remove();
        });
    }
}