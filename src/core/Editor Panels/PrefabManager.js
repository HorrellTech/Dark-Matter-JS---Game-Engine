class PrefabManager {
    constructor(hierarchyManager = null) {
        this.hierarchy = hierarchyManager || null;
        this.editor = hierarchyManager.editor || null;
        this.prefabs = new Map(); // Store prefabs in memory
        this.initializePrefabStorage();
        //this.loadExistingPrefabs(); // Load prefabs on startup
    }

    /**
     * Initialize prefab storage in the file browser
     */
    async initializePrefabStorage() {
        // Create prefabs folder if it doesn't exist
        if (this.editor && this.editor.fileBrowser) {
            try {
                const prefabsPath = '/Prefabs';
                const exists = await this.editor.fileBrowser.exists(prefabsPath);
                if (!exists) {
                    await this.editor.fileBrowser.createDirectory(prefabsPath);
                    console.log('Created Prefabs directory');
                }
            } catch (error) {
                console.warn('Could not create Prefabs directory:', error);
            }
        }
    }

    /**
     * Load all existing prefabs into memory
     */
    async loadExistingPrefabs() {
        if (!this.editor || !this.editor.fileBrowser) return;

        try {
            const files = await this.editor.fileBrowser.getAllFiles();
            const prefabFiles = files.filter(file => file.name.endsWith('.prefab'));

            for (const file of prefabFiles) {
                try {
                    const content = file.content || await this.editor.fileBrowser.readFile(file.path);
                    if (!content) continue;
                    
                    const prefabData = JSON.parse(content);

                    // Store by metadata name or filename without extension
                    const prefabName = prefabData.metadata?.name || file.name.replace('.prefab', '');
                    this.prefabs.set(prefabName, prefabData);

                    console.log(`Loaded prefab: ${prefabName}`);
                } catch (error) {
                    console.error(`Error loading prefab ${file.name}:`, error);
                }
            }

            console.log(`Loaded ${this.prefabs.size} prefabs into memory`);
            
            // Also update the global prefab manager if it exists
            if (window.prefabManager && typeof window.prefabManager.loadPrefabs === 'function') {
                const prefabsData = {};
                for (const [name, data] of this.prefabs) {
                    prefabsData[name] = data;
                }
                window.prefabManager.loadPrefabs(prefabsData);
            }
        } catch (error) {
            console.error('Error loading existing prefabs:', error);
        }
    }

    exportPrefabs() {
    const exportData = {};
    
    // First load all prefabs from the file system if not already loaded
    if (this.prefabs.size === 0) {
        // Try to load prefabs synchronously from fileBrowser
        if (this.editor && this.editor.fileBrowser) {
            try {
                // Use a synchronous approach to get files
                const files = this.editor.fileBrowser.getAllFiles ? 
                    this.editor.fileBrowser.getAllFiles() : [];
                    
                if (files && files.then) {
                    // It's a promise, we can't wait here, but log a warning
                    console.warn('Prefabs not loaded - call loadExistingPrefabs() before export');
                } else if (Array.isArray(files)) {
                    // Synchronous file list
                    const prefabFiles = files.filter(file => file.name.endsWith('.prefab'));
                    for (const file of prefabFiles) {
                        try {
                            const content = file.content;
                            if (content) {
                                const prefabData = JSON.parse(content);
                                const prefabName = prefabData.metadata?.name || file.name.replace('.prefab', '');
                                this.prefabs.set(prefabName, prefabData);
                            }
                        } catch (error) {
                            console.error(`Error loading prefab ${file.name} for export:`, error);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading prefabs for export:', error);
            }
        }
    }
    
    // Export all loaded prefabs
    for (const [name, prefabData] of this.prefabs) {
        exportData[name] = prefabData;
    }
    
    console.log(`Exported ${Object.keys(exportData).length} prefabs:`, Object.keys(exportData));
    return exportData;
}

    /**
     * Find a prefab by name
     * @param {string} name - The name of the prefab to find
     * @returns {Object|null} The prefab data or null if not found
     */
    findPrefabByName(name) {
        if (!name) return null;

        // Try exact match first
        if (this.prefabs.has(name)) {
            return this.prefabs.get(name);
        }

        // Try case-insensitive search
        const lowerName = name.toLowerCase();
        for (const [key, value] of this.prefabs) {
            if (key.toLowerCase() === lowerName) {
                return value;
            }
        }

        // Try contains match
        for (const [key, value] of this.prefabs) {
            if (key.toLowerCase().includes(lowerName)) {
                return value;
            }
        }

        return null;
    }

    /**
     * Get all prefab names
     * @returns {Array<string>} Array of all prefab names
     */
    getAllPrefabNames() {
        return Array.from(this.prefabs.keys());
    }

    /**
     * Check if a prefab exists by name
     * @param {string} name - The name of the prefab to check
     * @returns {boolean} True if the prefab exists
     */
    hasPrefab(name) {
        return this.findPrefabByName(name) !== null;
    }

    /**
     * Instantiate a prefab by name
     * @param {string} name - The name of the prefab to instantiate
     * @param {Vector2} position - Position to instantiate at
     * @param {GameObject} parent - Optional parent GameObject
     * @returns {GameObject|null} The instantiated GameObject or null if prefab not found
     */
    instantiatePrefabByName(name, position = null, parent = null) {
        const prefabData = this.findPrefabByName(name);
        if (!prefabData) {
            console.error(`Prefab not found: ${name}`);
            //console.log('Available prefabs:', this.getAllPrefabNames());
            return null;
        }

        console.log(`Instantiating prefab: ${name}`, prefabData);
        return this.instantiatePrefab(prefabData, position, parent);
    }

    /**
     * Create a prefab from a GameObject
     * @param {GameObject} gameObject - The GameObject to turn into a prefab
     */
    async createPrefab(gameObject) {
        try {
            // Prompt for prefab name
            const prefabName = await this.promptPrefabName(gameObject.name);
            if (!prefabName) return; // User cancelled

            // Serialize the GameObject and all its children
            const prefabData = this.serializeGameObjectForPrefab(gameObject);

            // Add metadata
            prefabData.metadata = {
                name: prefabName,
                originalName: gameObject.name,
                created: Date.now(),
                version: "1.0"
            };

            // Save to file browser if available
            if (this.editor.fileBrowser) {
                const fileName = `${prefabName}.prefab`;
                const filePath = `/Prefabs/${fileName}`;
                const success = await this.editor.fileBrowser.createFile(
                    filePath,
                    JSON.stringify(prefabData, null, 2)
                );

                if (success) {
                    // Register file type for prefabs
                    this.editor.fileBrowser.fileTypes['.prefab'] = {
                        icon: 'fa-cube',
                        color: '#9C27B0',
                        onDoubleClick: (file) => this.instantiatePrefabFromFile(file)
                    };

                    this.hierarchy?.showNotification(`Prefab "${prefabName}" created successfully`, 'success');
                } else {
                    throw new Error('Failed to save prefab file');
                }
            }

            // Store in memory for quick access
            this.prefabs.set(prefabName, prefabData);

            console.log(`Prefab "${prefabName}" created:`, prefabData);

        } catch (error) {
            console.error('Error creating prefab:', error);
            throw error;
        }
    }

    /**
     * Serialize a GameObject for prefab storage
     * @param {GameObject} gameObject - The GameObject to serialize
     * @returns {Object} Serialized prefab data
     */
    serializeGameObjectForPrefab(gameObject) {
        return gameObject.toJSON();
    }

    /**
     * Instantiate a prefab at a specific position
     * @param {Object} prefabData - The prefab data
     * @param {Vector2} position - Position to instantiate at
     * @param {GameObject} parent - Optional parent GameObject
     * @returns {GameObject} The instantiated GameObject
     */
    instantiatePrefab(prefabData, position = null, parent = null) {
        try {
            // Create the main GameObject
            const cloned = GameObject.fromJSON(prefabData);

            // Generate a new unique ID for the cloned GameObject
            cloned.id = crypto.randomUUID ? crypto.randomUUID() : `go-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            cloned.position = position ? position.clone() : new Vector2(0, 0);
            if (parent) {
                parent.addChild(cloned);
            } else {
                window.engine.gameObjects.push(cloned);
            }

            return cloned;

        } catch (error) {
            console.error('Error instantiating prefab:', error);
            return null;
        }
    }

    /**
     * Instantiate a prefab from a file
     * @param {Object} file - File object from file browser
     */
    async instantiatePrefabFromFile(file) {
        try {
            if(!this.editor || !this.hierarchy) {
                console.error('Editor or HierarchyManager not available');
                return;
            }

            let prefabData;

            if (typeof file.content === 'string') {
                prefabData = JSON.parse(file.content);
            } else {
                // If content is not available, read from file browser
                const content = await this.editor.fileBrowser.readFile(file.path);
                prefabData = JSON.parse(content);
            }

            // Instantiate at center of view
            const centerPosition = this.editor.getWorldCenterOfView();
            const instantiated = this.instantiatePrefab(prefabData, centerPosition);

            // Refresh hierarchy and select the new object
            this.hierarchy.refreshHierarchy();
            this.hierarchy.selectGameObject(instantiated);
            this.editor.refreshCanvas();

            // Mark scene as dirty
            this.editor.activeScene.markDirty();

            // Trigger auto-save if available
            if (window.autoSaveManager) {
                window.autoSaveManager.autoSave();
            }

            this.hierarchy.showNotification(`Instantiated prefab: ${prefabData.metadata?.name || prefabData.name}`, 'success');

        } catch (error) {
            console.error('Error instantiating prefab from file:', error);
            this.hierarchy.showNotification(`Error instantiating prefab: ${error.message}`, 'error');
        }
    }

    /**
     * Prompt user for prefab name
     * @param {string} defaultName - Default name to suggest
     * @returns {Promise<string>} The entered name or null if cancelled
     */
    async promptPrefabName(defaultName) {
        return new Promise(resolve => {
            // Create modal dialog
            const modal = document.createElement('div');
            modal.className = 'prefab-name-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2a2a2a;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #555;
                min-width: 300px;
                color: white;
            `;

            dialog.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #fff;">Create Prefab</h3>
                <label style="display: block; margin-bottom: 8px; color: #ccc;">Prefab Name:</label>
                <input type="text" id="prefabNameInput" value="${defaultName} Prefab" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    background: #333;
                    color: white;
                    box-sizing: border-box;
                ">
                <div style="margin-top: 15px; text-align: right;">
                    <button id="prefabCancelBtn" style="
                        margin-right: 10px;
                        padding: 8px 16px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        background: #333;
                        color: white;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="prefabCreateBtn" style="
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        background: #4CAF50;
                        color: white;
                        cursor: pointer;
                    ">Create</button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            const input = dialog.querySelector('#prefabNameInput');
            const cancelBtn = dialog.querySelector('#prefabCancelBtn');
            const createBtn = dialog.querySelector('#prefabCreateBtn');

            // Focus and select text
            setTimeout(() => {
                input.focus();
                input.select();
            }, 10);

            const cleanup = () => {
                document.body.removeChild(modal);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            const handleCreate = () => {
                const value = input.value.trim();
                if (value) {
                    cleanup();
                    resolve(value);
                } else {
                    input.focus();
                }
            };

            // Event listeners
            cancelBtn.addEventListener('click', handleCancel);
            createBtn.addEventListener('click', handleCreate);

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleCreate();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            });

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            });
        });
    }

    /**
     * Get all available prefabs
     * @returns {Array} Array of prefab names
     */
    getAvailablePrefabs() {
        return Array.from(this.prefabs.keys());
    }
}

if(!window.prefabManager) {
    window.prefabManager = new PrefabManager();
}