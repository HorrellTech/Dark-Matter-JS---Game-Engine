/**
 * AutoSaveManager - Handles automatic saving and restoration of project state
 */
class AutoSaveManager {
    constructor(editor) {
        this.editor = editor;
        this.autoSaveKey = 'dmjs-autosave-state';
        this.moduleSourcesKey = 'dmjs-module-sources';
        this.moduleDefinitionsKey = 'dmjs-module-definitions';
        this.autoSaveInterval = 30000; // Save every 30 seconds
        this.intervalId = null;
        this.lastSaveTimestamp = 0;
        this.isInitialLoad = true;
        
        // Bind methods
        this.autoSave = this.autoSave.bind(this);
        this.saveState = this.saveState.bind(this);
        this.loadState = this.loadState.bind(this);
        
        // Setup handlers for window close/unload events
       // window.addEventListener('beforeunload', this.saveState);
        
        // Setup periodic auto-save
       // this.startAutoSave();

       // Create a new project instead of restoring auto-saved state
       this.createNewProject();
        
        console.log("AutoSaveManager initialized");
    }

    /**
     * Create a new project instead of loading auto-saved state
     */
    async createNewProject() {
        try {
            console.log("Creating new project on startup...");
            
            // Check if we can use the ProjectManager
            if (this.editor.projectManager && typeof this.editor.projectManager.newProject === 'function') {
                await this.editor.projectManager.newProject();
                console.log("Created new project using ProjectManager");
            } else {
                // Fallback if no ProjectManager available
                // Clear existing scenes
                this.editor.scenes = [];
                
                // Create a default scene
                if (typeof this.editor.createDefaultScene === 'function') {
                    this.editor.createDefaultScene();
                } else if (window.Scene) {
                    const defaultScene = new Scene("Default Scene");
                    this.editor.scenes.push(defaultScene);
                    this.editor.setActiveScene(defaultScene);
                }
                
                // Reset camera and other settings
                if (this.editor.camera) {
                    if (typeof this.editor.camera.position.set === 'function') {
                        this.editor.camera.position.set(0, 0);
                    } else {
                        this.editor.camera.position = { x: 0, y: 0 };
                    }
                    this.editor.camera.zoom = 1.0;
                }
                
                // Reset grid settings
                if (this.editor.grid) {
                    this.editor.grid.showGrid = true;
                    this.editor.grid.gridSize = 32;
                    this.editor.grid.snapToGrid = false;
                }
                
                // Reset UI elements
                if (this.editor.updateZoomLevelDisplay) {
                    this.editor.updateZoomLevelDisplay();
                }
                
                // Update UI controls
                document.getElementById('showGrid')?.setAttribute('checked', this.editor.grid?.showGrid);
                document.getElementById('gridSize')?.setAttribute('value', this.editor.grid?.gridSize);
                document.getElementById('snapToGrid')?.setAttribute('checked', this.editor.grid?.snapToGrid);
                
                // Refresh UI
                if (this.editor.refreshCanvas) {
                    this.editor.refreshCanvas();
                }
                
                // Reset hierarchy
                if (this.editor.hierarchy) {
                    this.editor.hierarchy.selectedObject = null;
                    this.editor.hierarchy.refreshHierarchy();
                }
                
                console.log("Created new project using fallback method");
            }
            
            // Clear auto-saved data (optional - you can comment this out if you want to keep it)
            this.clearSavedState();
            
            return true;
        } catch (error) {
            console.error("Error creating new project:", error);
            return false;
        }
    }
    
    /**
     * Start the auto-save interval timer
     */
    startAutoSave() {
        if (!this.intervalId) {
            this.intervalId = setInterval(this.autoSave, this.autoSaveInterval);
            console.log(`Auto-save started (every ${this.autoSaveInterval/1000} seconds)`);
        }
    }
    
    /**
     * Stop the auto-save interval timer
     */
    stopAutoSave() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("Auto-save stopped");
        }
    }
    
    /**
     * Perform auto-save if any changes have been made
     */
    autoSave() {
        // Check if any scene is dirty
        if (this.editor.scenes.some(scene => scene.dirty)) {
            this.saveState();
        }
    }

    manualSave() {
        console.log("Manual save triggered");
        this.saveState();
    }
    
    /**
     * Save the current editor state to localStorage
     */
    async saveState() {
        try {
            if (!this.editor) return;
            
            console.log("Auto-saving project state...");
            
            // Save module definitions and sources
            await this.saveModuleDefinitions();
            
            // Gather project data (reuse existing gathering mechanism)
            let projectData;
            if (this.editor.projectManager && this.editor.projectManager.gatherProjectData) {
                projectData = await this.editor.projectManager.gatherProjectData();
            } else {
                // Fallback to minimal data collection
                projectData = {
                    autoSave: true,
                    timestamp: Date.now(),
                    scenes: this.editor.scenes.map(scene => {
                        // Make sure game objects are fully serialized with all properties
                        const sceneJSON = scene.toJSON();
                        
                        // Verify game objects have modules and color info
                        if (sceneJSON.gameObjects) {
                            this.ensureGameObjectsFullySerialized(sceneJSON.gameObjects);
                        }
                        
                        return sceneJSON;
                    }),
                    editorSettings: {
                        activeSceneName: this.editor.activeScene ? this.editor.activeScene.name : null,
                        camera: {
                            x: this.editor.camera.position.x,
                            y: this.editor.camera.position.y,
                            zoom: this.editor.camera.zoom,
                        },
                        grid: {
                            showGrid: this.editor.grid.showGrid,
                            gridSize: this.editor.grid.gridSize,
                            snapToGrid: this.editor.grid.snapToGrid,
                        },
                        selectedObjectId: this.editor.hierarchy && this.editor.hierarchy.selectedObject ? 
                            this.editor.hierarchy.selectedObject.id : null
                    }
                };
            }
            
            // Compress project data before storing (if larger than a certain threshold)
            const jsonData = JSON.stringify(projectData);
            localStorage.setItem(this.autoSaveKey, jsonData);
            
            this.lastSaveTimestamp = Date.now();
            console.log(`Auto-save completed at ${new Date(this.lastSaveTimestamp).toLocaleTimeString()}`);
            
            return true;
        } catch (error) {
            console.error("Auto-save failed:", error);
            return false;
        }
    }
    
    /**
     * Save all module definitions to localStorage
     * This allows us to rebuild module classes when loading a project
     */
    async saveModuleDefinitions() {
        try {
            // Get all module classes
            const moduleClasses = window.moduleRegistry ? 
                window.moduleRegistry.getAllModules() : 
                this.findAllModuleClasses();
            
            // Save information about each module class
            const moduleDefinitions = {};
            
            // Also store module source code if available from FileBrowser
            const moduleSources = {};
            
            for (const moduleClass of moduleClasses) {
                const name = moduleClass.name;
                
                // Skip built-in modules
                if (this.isBuiltInModule(name)) continue;
                
                // Store essential definition data
                moduleDefinitions[name] = {
                    name,
                    namespace: moduleClass.namespace || 'General',
                    description: moduleClass.description || '',
                    allowMultiple: moduleClass.allowMultiple !== false,
                    iconClass: moduleClass.iconClass || null
                };
                
                // Try to retrieve source if we have a FileBrowser
                if (window.fileBrowser) {
                    // First, try to find the module file in the project
                    try {
                        const possiblePaths = await this.findModuleFilePaths(name);
                        
                        for (const path of possiblePaths) {
                            try {
                                const source = await window.fileBrowser.readFile(path);
                                if (source && source.includes(`class ${name}`)) {
                                    moduleSources[name] = {
                                        path,
                                        source
                                    };
                                    break;
                                }
                            } catch (e) {
                                // Ignore, try next path
                            }
                        }
                    } catch (e) {
                        console.warn(`Could not find source for module ${name}:`, e);
                    }
                }
            }
            
            // Save to localStorage
            localStorage.setItem(this.moduleDefinitionsKey, JSON.stringify(moduleDefinitions));
            localStorage.setItem(this.moduleSourcesKey, JSON.stringify(moduleSources));
            
            console.log(`Saved ${Object.keys(moduleDefinitions).length} module definitions and ${Object.keys(moduleSources).length} module sources`);
            
            return true;
        } catch (error) {
            console.error("Failed to save module definitions:", error);
            return false;
        }
    }
    
    /**
     * Find all paths to possible module files
     * @param {string} moduleName - Name of the module to find
     * @returns {Promise<string[]>} - Array of possible file paths
     */
    async findModuleFilePaths(moduleName) {
        if (!window.fileBrowser) return [];
        
        const possiblePaths = [
            `src/core/Modules/${moduleName}.js`,
            `src/modules/${moduleName}.js`,
            `modules/${moduleName}.js`,
            `${moduleName}.js`
        ];
        
        // If FileBrowser has a search function, use it
        if (typeof window.fileBrowser.searchFiles === 'function') {
            try {
                const results = await window.fileBrowser.searchFiles(`${moduleName}.js`);
                if (results && results.length > 0) {
                    possiblePaths.unshift(...results.map(r => r.path));
                }
            } catch (e) {
                console.warn('File search failed:', e);
            }
        }
        
        return [...new Set(possiblePaths)]; // Remove duplicates
    }
    
    /**
     * Check if a module is a built-in core module
     * @param {string} name - Module name
     * @returns {boolean} True if it's a built-in module
     */
    isBuiltInModule(name) {
        const builtInModules = [
            'Module', 'SpriteRenderer', 'RigidBody', 'Collider',
            'DrawCircle', 'DrawRectangle', 'Transform', 'Camera'
        ];
        return builtInModules.includes(name);
    }
    
    /**
     * Find all module classes in the window object
     * @returns {Array<Class>} Array of module classes
     */
    findAllModuleClasses() {
        const moduleClasses = [];
        
        if (typeof Module !== 'undefined') {
            for (const key in window) {
                try {
                    const obj = window[key];
                    if (typeof obj === 'function' &&
                        obj.prototype instanceof Module &&
                        obj !== Module) {
                        moduleClasses.push(obj);
                    }
                } catch (e) { /* Ignore access errors */ }
            }
        }
        
        return moduleClasses;
    }
    
    /**
     * Load the saved state from localStorage
     */
    async loadState() {
        try {
            const savedData = localStorage.getItem(this.autoSaveKey);
            if (!savedData) {
                console.log("No auto-saved state found");
                return false;
            }
            
            console.log("Restoring auto-saved project...");
            
            // First try to restore module definitions
            await this.restoreModuleDefinitions();
            
            // Parse the saved data
            const projectData = JSON.parse(savedData);
            
            // Use the project manager if available to restore the state
            if (this.editor.projectManager) {
                // Create a method to restore state using the project manager
                await this.restoreStateWithProjectManager(projectData);
            } else {
                // Fallback to manual restoration
                await this.restoreStateManually(projectData);
            }
            
            console.log("Auto-saved project restored successfully");
            this.isInitialLoad = false;
            return true;
        } catch (error) {
            console.error("Failed to restore auto-saved state:", error);
            return false;
        }
    }
    
    /**
     * Restore module definitions and source code from localStorage
     */
    async restoreModuleDefinitions() {
        try {
            // Get saved module definitions and sources
            const definitionsJson = localStorage.getItem(this.moduleDefinitionsKey);
            const sourcesJson = localStorage.getItem(this.moduleSourcesKey);
            
            if (!definitionsJson && !sourcesJson) {
                console.log("No module definitions or sources found in localStorage");
                return false;
            }
            
            // Parse the data
            const definitions = definitionsJson ? JSON.parse(definitionsJson) : {};
            const sources = sourcesJson ? JSON.parse(sourcesJson) : {};
            
            console.log(`Restoring ${Object.keys(definitions).length} module definitions`);
            
            // For each module definition
            for (const moduleName in definitions) {
                // Skip if the module is already defined
                if (window[moduleName] && typeof window[moduleName] === 'function' && 
                    window[moduleName].prototype instanceof Module) {
                    console.log(`Module ${moduleName} is already defined, skipping restoration`);
                    continue;
                }
                
                // If we have the source code, try to restore from source
                if (sources[moduleName] && sources[moduleName].source) {
                    try {
                        await this.restoreModuleFromSource(moduleName, sources[moduleName].source);
                        console.log(`Restored module ${moduleName} from source code`);
                        continue;
                    } catch (e) {
                        console.warn(`Failed to restore module ${moduleName} from source:`, e);
                    }
                }
                
                // If source restoration failed or no source available, create a placeholder module
                try {
                    this.createPlaceholderModule(moduleName, definitions[moduleName]);
                    console.log(`Created placeholder for module ${moduleName}`);
                } catch (e) {
                    console.error(`Failed to create placeholder for module ${moduleName}:`, e);
                }
            }
            
            return true;
        } catch (error) {
            console.error("Failed to restore module definitions:", error);
            return false;
        }
    }
    
    /**
     * Restore a module from its source code
     * @param {string} moduleName - Name of the module
     * @param {string} sourceCode - Source code of the module
     * @returns {Promise<boolean>} True if successful
     */
    async restoreModuleFromSource(moduleName, sourceCode) {
        return new Promise((resolve, reject) => {
            try {
                // Create a script element to execute the source code
                const scriptId = `restored-module-${moduleName}-${Date.now()}`;
                const script = document.createElement('script');
                script.id = scriptId;
                script.textContent = sourceCode;
                
                // Set up event handlers
                script.onload = () => {
                    if (window[moduleName] && typeof window[moduleName] === 'function') {
                        // Register with module registry if available
                        if (window.moduleRegistry) {
                            window.moduleRegistry.register(window[moduleName]);
                        }
                        resolve(true);
                    } else {
                        reject(new Error(`Module ${moduleName} not found after script execution`));
                    }
                };
                
                script.onerror = (error) => {
                    reject(new Error(`Error executing script for ${moduleName}: ${error.message}`));
                };
                
                // Add to DOM and execute
                document.head.appendChild(script);
                
                // Check immediately in case the script has already executed
                if (window[moduleName] && typeof window[moduleName] === 'function') {
                    // Register with module registry if available
                    if (window.moduleRegistry) {
                        window.moduleRegistry.register(window[moduleName]);
                    }
                    resolve(true);
                } else {
                    // Wait a short time for script execution
                    setTimeout(() => {
                        if (window[moduleName] && typeof window[moduleName] === 'function') {
                            // Register with module registry if available
                            if (window.moduleRegistry) {
                                window.moduleRegistry.register(window[moduleName]);
                            }
                            resolve(true);
                        } else {
                            reject(new Error(`Module ${moduleName} not found after waiting`));
                        }
                    }, 200);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Create a placeholder module class that preserves data
     * @param {string} moduleName - Name of the module
     * @param {Object} definition - Module definition data
     */
    createPlaceholderModule(moduleName, definition) {
        // Skip if already defined
        if (window[moduleName] && typeof window[moduleName] === 'function') return;
        
        // Create a placeholder class that extends Module
        const PlaceholderClass = class extends Module {
            constructor() {
                super(moduleName);
                this.isPlaceholder = true;
                this._originalData = null;
                this.type = moduleName;
            }
            
            // Store original data for later reconstruction
            setOriginalData(data) {
                this._originalData = data;
                // Copy properties from original data
                Object.keys(data).forEach(key => {
                    if (key !== 'gameObject' && key !== 'type' && key !== 'name') {
                        try {
                            this[key] = data[key];
                        } catch (e) {
                            console.warn(`Could not restore property ${key} on ${moduleName}`);
                        }
                    }
                });
            }
            
            // Override toJSON to preserve original data
            toJSON() {
                if (this._originalData) {
                    return {...this._originalData, isPlaceholder: true, type: moduleName};
                }
                return super.toJSON();
            }
        };
        
        // Add static properties from the definition
        PlaceholderClass.name = moduleName;
        PlaceholderClass.namespace = definition.namespace || 'General';
        PlaceholderClass.description = definition.description || 'Placeholder for missing module';
        PlaceholderClass.allowMultiple = definition.allowMultiple !== false;
        PlaceholderClass.iconClass = definition.iconClass || 'fa-puzzle-piece';
        PlaceholderClass.isPlaceholder = true;
        
        // Add a warning to the description
        const originalDesc = PlaceholderClass.description;
        PlaceholderClass.description = `[PLACEHOLDER] ${originalDesc}`;
        
        // Register the class globally
        window[moduleName] = PlaceholderClass;
        
        // Register with moduleRegistry if available
        if (window.moduleRegistry) {
            window.moduleRegistry.register(PlaceholderClass);
        }
        
        console.log(`Created placeholder module class for ${moduleName}`);
    }

    /**
     * Manually restore state from saved data
     */
    async restoreStateManually(projectData) {
        // [First part of the existing method...]
        
        try {
            // Ensure all modules are registered before loading
            this.ensureModulesRegistered();
            
            // Clear current state
            this.editor.scenes = [];
            
            // Load scenes
            if (projectData.scenes && Array.isArray(projectData.scenes)) {
                for (const sceneJSON of projectData.scenes) {
                    try {
                        const scene = Scene.fromJSON(sceneJSON);
                        scene.dirty = false; // Don't mark restored scenes as dirty
                        this.editor.scenes.push(scene);
                        
                        // Make sure game objects are loaded if delayed
                        if (scene.gameObjectsJSON && scene.completeLoading) {
                            try {
                                scene.completeLoading();
                                
                                // Fix any broken DrawPolygon modules
                                this.fixDrawPolygonModules(scene.gameObjects);
                                
                                // Fix any modules that didn't load properly
                                this.reconstructMissingModules(scene.gameObjects);
                                
                                // Verify all modules were restored properly
                                this.verifyGameObjectsFullyRestored(scene.gameObjects);
                            } catch (error) {
                                console.error("Error completing scene loading:", error);
                            }
                        }
                    } catch (error) {
                        console.error("Error loading scene:", error);
                    }
                }
            }
            
            // Restore editor settings
            const settings = projectData.editorSettings;
            if (settings) {
                // Restore camera
                if (settings.camera) {
                    if (this.editor.camera.position && typeof this.editor.camera.position.set === 'function') {
                        this.editor.camera.position.set(settings.camera.x, settings.camera.y);
                    } else {
                        this.editor.camera.position = { 
                            x: settings.camera.x, 
                            y: settings.camera.y 
                        };
                    }
                    this.editor.camera.zoom = settings.camera.zoom;
                    if (this.editor.updateZoomLevelDisplay) {
                        this.editor.updateZoomLevelDisplay();
                    }
                }
                
                // Restore grid settings
                if (settings.grid) {
                    this.editor.grid.showGrid = settings.grid.showGrid;
                    this.editor.grid.gridSize = settings.grid.gridSize;
                    this.editor.grid.snapToGrid = settings.grid.snapToGrid;
                    
                    // Update UI elements if they exist
                    const showGridCheckbox = document.getElementById('showGrid');
                    if (showGridCheckbox) showGridCheckbox.checked = settings.grid.showGrid;
                    
                    const gridSizeInput = document.getElementById('gridSize');
                    if (gridSizeInput) gridSizeInput.value = settings.grid.gridSize;
                    
                    const snapToGridCheckbox = document.getElementById('snapToGrid');
                    if (snapToGridCheckbox) snapToGridCheckbox.checked = settings.grid.snapToGrid;
                }
                
                // Set active scene
                const activeScene = settings.activeSceneName ? 
                    this.editor.scenes.find(s => s.name === settings.activeSceneName) : 
                    (this.editor.scenes.length > 0 ? this.editor.scenes[0] : null);
                    
                if (activeScene) {
                    this.editor.setActiveScene(activeScene);
                } else if (this.editor.scenes.length > 0) {
                    this.editor.setActiveScene(this.editor.scenes[0]);
                }
                
                // Restore selected object
                if (settings.selectedObjectId && this.editor.hierarchy && this.editor.activeScene) {
                    const findObjectById = (id, gameObjects) => {
                        for (const obj of gameObjects) {
                            if (obj.id === id) return obj;
                            if (obj.children) {
                                const found = findObjectById(id, obj.children);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    
                    const selectedObj = findObjectById(settings.selectedObjectId, this.editor.activeScene.gameObjects);
                    if (selectedObj && this.editor.hierarchy) {
                        this.editor.hierarchy.selectGameObject(selectedObj);
                    }
                }
            }
            
            // Refresh UI
            if (this.editor.refreshCanvas) {
                this.editor.refreshCanvas();
            }
            
            // Update UI if needed
            if (this.editor.fileBrowser && this.editor.fileBrowser.showNotification) {
                this.editor.fileBrowser.showNotification("Last session restored", "info");
            }
        } catch (error) {
            console.error("Error in restoreStateManually:", error);
        }
    }

    /**
     * Fix any existing but broken DrawPolygon modules 
     * @param {Array} gameObjects - Array of game objects to process
     */
    fixDrawPolygonModules(gameObjects) {
        if (!gameObjects || !Array.isArray(gameObjects)) return;
        
        for (const gameObj of gameObjects) {
            // Check if the object has modules
            if (!gameObj.modules || !Array.isArray(gameObj.modules)) continue;
            
            // Look for DrawPolygon modules
            for (let i = 0; i < gameObj.modules.length; i++) {
                const mod = gameObj.modules[i];
                
                // Check if it's a DrawPolygon module but has issues
                if ((mod.name === 'DrawPolygon' || mod.type === 'DrawPolygon') && 
                    (!mod.vertices || !Array.isArray(mod.vertices) || 
                    mod.vertices.length === 0 || 
                    !(mod.vertices[0] instanceof Vector2))) {
                    
                    console.log(`Found broken DrawPolygon in ${gameObj.name}, fixing...`);
                    
                    // Get serialized data if available
                    const moduleData = (typeof mod.toJSON === 'function') ? mod.toJSON() : mod;
                    
                    // Remove the broken module
                    gameObj.modules.splice(i, 1);
                    i--; // Adjust index after removal
                    
                    // Create a fresh DrawPolygon module
                    if (window.DrawPolygon) {
                        const newPolygon = new DrawPolygon();
                        
                        // Copy basic properties
                        if (moduleData) {
                            if (moduleData.color) newPolygon.color = moduleData.color;
                            if (moduleData.fill !== undefined) newPolygon.fill = moduleData.fill;
                            if (moduleData.outline !== undefined) newPolygon.outline = moduleData.outline;
                            if (moduleData.outlineColor) newPolygon.outlineColor = moduleData.outlineColor;
                            if (moduleData.outlineWidth !== undefined) newPolygon.outlineWidth = moduleData.outlineWidth;
                            
                            // Try to reconstruct vertices if possible
                            if (moduleData.vertices && Array.isArray(moduleData.vertices)) {
                                newPolygon.vertices = moduleData.vertices.map(v => 
                                    new Vector2(v.x || 0, v.y || 0)
                                );
                            } else if (moduleData.exposedValues && 
                                    moduleData.exposedValues.vertices && 
                                    Array.isArray(moduleData.exposedValues.vertices)) {
                                newPolygon.vertices = moduleData.exposedValues.vertices.map(v => 
                                    new Vector2(v.x || 0, v.y || 0)
                                );
                            }
                            
                            // Reconstruct offset if needed
                            if (moduleData.offset) {
                                if (moduleData.offset instanceof Vector2) {
                                    newPolygon.offset = moduleData.offset;
                                } else {
                                    newPolygon.offset = new Vector2(
                                        moduleData.offset.x || 0, 
                                        moduleData.offset.y || 0
                                    );
                                }
                            } else if (moduleData.exposedValues && moduleData.exposedValues.offset) {
                                newPolygon.offset = new Vector2(
                                    moduleData.exposedValues.offset.x || 0,
                                    moduleData.exposedValues.offset.y || 0
                                );
                            }
                        }
                        
                        // Add the new module to the game object
                        gameObj.addModule(newPolygon);
                        console.log(`Fixed DrawPolygon module for ${gameObj.name}`);
                    }
                }
            }
            
            // Process children recursively
            if (gameObj.children && Array.isArray(gameObj.children)) {
                this.fixDrawPolygonModules(gameObj.children);
            }
        }
    }
    
    /**
     * Ensure all modules are registered and available for loading
     */
    ensureModulesRegistered() {
        // Check if we have a module registry
        if (!this.editor.moduleRegistry && window.ModuleRegistry) {
            this.editor.moduleRegistry = new ModuleRegistry();
        }
        
        // Force reloading of core drawing modules
        const coreModules = [
            "DrawPolygon", "DrawCircle", "DrawRect", "DrawSprite", 
            "RigidBody", "Transform", "Camera"
        ];
        
        // Get module classes from window object
        coreModules.forEach(moduleName => {
            if (window[moduleName]) {
                // Re-register the module in the registry
                if (this.editor.moduleRegistry) {
                    this.editor.moduleRegistry.registerModule(window[moduleName]);
                    console.log(`Re-registered module: ${moduleName}`);
                }
            } else {
                console.warn(`Module ${moduleName} not available in global scope`);
                
                // For critical modules like DrawPolygon, attempt to reload
                if (moduleName === 'DrawPolygon') {
                    this.attemptToReloadModule(moduleName);
                }
            }
        });
    }

    /**
     * Attempt to reload a module by creating an element to load its script
     * @param {string} moduleName - Name of the module to reload
     */
    attemptToReloadModule(moduleName) {
        // Try to determine the path based on known module patterns
        let scriptPath = '';
        
        switch(moduleName) {
            case 'DrawPolygon':
                scriptPath = 'src/core/Modules/Drawing/DrawPolygon.js';
                break;
            case 'DrawCircle':
                scriptPath = 'src/core/Modules/Drawing/DrawCircle.js';
                break;
            case 'DrawRect':
                scriptPath = 'src/core/Modules/Drawing/DrawRect.js';
                break;
            case 'DrawSprite':
                scriptPath = 'src/core/Modules/Drawing/DrawSprite.js';
                break;
            case 'RigidBody':
                scriptPath = 'src/core/Modules/Physics/RigidBody.js';
                break;
            default:
                console.warn(`No known path for module: ${moduleName}`);
                return;
        }
        
        if (scriptPath) {
            console.log(`Attempting to reload module: ${moduleName} from ${scriptPath}`);
            
            // Create a script element to reload the module
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = () => {
                console.log(`Successfully reloaded module: ${moduleName}`);
                
                // Re-register after loading
                if (window[moduleName] && this.editor.moduleRegistry) {
                    this.editor.moduleRegistry.registerModule(window[moduleName]);
                }
            };
            script.onerror = () => {
                console.error(`Failed to reload module: ${moduleName}`);
            };
            
            document.head.appendChild(script);
        }
    }

    /**
     * Reconstruct missing modules by using the stored JSON data
     * @param {Array} gameObjects - Array of game objects to process
     */
    reconstructMissingModules(gameObjects) {
        if (!gameObjects || !Array.isArray(gameObjects)) return;
        
        for (const gameObj of gameObjects) {
            // Get the modules array
            if (!gameObj.modules) continue;
            
            // Check each module and make sure it's a proper instance
            const originalModules = [...gameObj.modules];
            for (let i = 0; i < originalModules.length; i++) {
                const moduleData = originalModules[i];
                
                // Skip if module is already an instance (not just data)
                if (typeof moduleData === 'object' && moduleData instanceof Module) {
                    continue;
                }
                
                // If we just have module data, try to reconstruct it
                if (typeof moduleData === 'object' && moduleData !== null) {
                    const moduleName = moduleData.type || moduleData.name;
                    
                    // Remove the problematic module first
                    const modIndex = gameObj.modules.indexOf(moduleData);
                    if (modIndex !== -1) {
                        gameObj.modules.splice(modIndex, 1);
                    }
                    
                    // Try to create a new instance of this module
                    const restoredModule = this.reconstructModuleFromData(gameObj, moduleName, moduleData);
                    
                    // If this is a placeholder, store the original data
                    if (restoredModule && restoredModule.isPlaceholder && 
                        typeof restoredModule.setOriginalData === 'function') {
                        restoredModule.setOriginalData(moduleData);
                    }
                }
            }
            
            // Process children recursively
            if (gameObj.children && Array.isArray(gameObj.children)) {
                this.reconstructMissingModules(gameObj.children);
            }
        }
    }

    /**
     * Attempt to create a new module instance from serialized data
     * @param {GameObject} gameObj - Parent game object
     * @param {string} moduleName - Name of the module class to create
     * @param {Object} moduleData - Serialized module data
     */
    reconstructModuleFromData(gameObj, moduleName, moduleData) {
        try {
            console.log(`Reconstructing module ${moduleName} for ${gameObj.name}`);
            
            // First try to get module class from registry
            let ModuleClass = null;
            
            // Try from registry first
            if (this.editor.moduleRegistry) {
                ModuleClass = this.editor.moduleRegistry.getModuleClass(moduleName);
            }
            
            // Fall back to global scope
            if (!ModuleClass && window[moduleName]) {
                ModuleClass = window[moduleName];
            }
            
            // If module class still not found and we have a placeholder system,
            // create a new placeholder for it
            if (!ModuleClass && typeof this.createPlaceholderModule === 'function') {
                this.createPlaceholderModule(moduleName, {
                    namespace: moduleData.namespace || 'General',
                    description: moduleData.description || '',
                    allowMultiple: moduleData.allowMultiple !== false
                });
                
                // Try to get the placeholder class
                if (window[moduleName]) {
                    ModuleClass = window[moduleName];
                }
            }
            
            if (ModuleClass) {
                // Create a new instance
                const newModule = new ModuleClass();
                
                // Handle placeholder modules
                if (newModule.isPlaceholder && typeof newModule.setOriginalData === 'function') {
                    newModule.setOriginalData(moduleData);
                } else {
                    // Special handling for DrawPolygon vertices
                    if (moduleName === 'DrawPolygon' && moduleData.exposedValues && 
                        moduleData.exposedValues.vertices && Array.isArray(moduleData.exposedValues.vertices)) {
                        // Make sure vertices are properly reconstructed as Vector2 objects
                        const vertices = moduleData.exposedValues.vertices.map(v => 
                            new Vector2(v.x || 0, v.y || 0)
                        );
                        newModule.vertices = vertices;
                        
                        // Call the vertices changed handler
                        if (typeof newModule._onVerticesChanged === 'function') {
                            newModule._onVerticesChanged();
                        }
                    }
                    
                    // Process exposed values first
                    if (moduleData.exposedValues) {
                        for (const key in moduleData.exposedValues) {
                            if (key === 'vertices' && moduleName === 'DrawPolygon') {
                                // Skip vertices for DrawPolygon, we already handled it
                                continue;
                            }
                            
                            const value = moduleData.exposedValues[key];
                            if (key === 'offset' || (key.includes('offset') && value && typeof value === 'object' && 'x' in value && 'y' in value)) {
                                // Vector2 property
                                if (newModule[key] instanceof Vector2) {
                                    newModule[key].x = value.x || 0;
                                    newModule[key].y = value.y || 0;
                                } else {
                                    newModule[key] = new Vector2(value.x || 0, value.y || 0);
                                }
                            } else {
                                // Regular property
                                newModule[key] = value;
                            }
                        }
                    }
                    
                    // Copy remaining properties from moduleData
                    for (const key in moduleData) {
                        if (key !== 'type' && key !== 'name' && key !== 'gameObject' && 
                            key !== 'exposedValues' && key !== 'exposedProperties') {
                            try {
                                newModule[key] = moduleData[key];
                            } catch (err) {
                                console.warn(`Failed to set property ${key} on module ${moduleName}:`, err);
                            }
                        }
                    }
                }
                
                // Add to game object
                gameObj.addModule(newModule);
                console.log(`Successfully reconstructed module ${moduleName} for ${gameObj.name}`);
                
                return newModule;
            } else {
                console.warn(`Module class ${moduleName} not found for reconstruction`);
                return null;
            }
        } catch (error) {
            console.error(`Error reconstructing module ${moduleName}:`, error);
            return null;
        }
    }
    
    /**
     * Check if there's a saved state available
     */
    hasSavedState() {
        return !!localStorage.getItem(this.autoSaveKey);
    }
    
    /**
     * Clear the saved state
     */
    clearSavedState() {
        localStorage.removeItem(this.autoSaveKey);
        console.log("Auto-saved state cleared");
    }
}