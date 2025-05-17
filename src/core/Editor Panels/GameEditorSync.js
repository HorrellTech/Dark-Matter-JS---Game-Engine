/**
 * GameEditorSync - Handles synchronization between game and editor views
 */
class GameEditorSync {
    constructor(editor, engine) {
        console.log("GameEditorSync constructor called with:", 
            editor ? "Editor found" : "Editor missing",
            engine ? "Engine found" : "Engine missing");
            
        this.editor = editor;
        this.engine = engine;
        this.syncEnabled = true;
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.syncFrequency = 100; // ms, adjust for performance
        
        // Object cache for faster lookups
        this.editorToGameMap = new Map();
        this.gameToEditorMap = new Map();
        
        // Add initialization guard to prevent early sync attempts
        this.initialized = false;
        
        // Check for dependencies or try to find them
        if (!this.editor || !this.engine) {
            console.warn("GameEditorSync missing editor or engine reference, will try to find them later");
            // Schedule multiple retries with increasing delays
            this.retryCount = 0;
            this.scheduleRetry();
        } else {
            // Initialize immediately if we have both dependencies
            this.initialize();
        }
    }
    
    /**
     * Schedule retries with exponential backoff
     */
    scheduleRetry() {
        if (this.retryCount > 10) {
            console.error("Failed to find editor or engine after multiple retries");
            return;
        }
        
        // Calculate delay with exponential backoff (300ms, 600ms, 1200ms, etc)
        const delay = Math.min(300 * Math.pow(1.5, this.retryCount), 5000);
        
        console.log(`Scheduling GameEditorSync retry in ${delay}ms (attempt ${this.retryCount + 1})`);
        setTimeout(() => this.checkDependencies(), delay);
        this.retryCount++;
    }
    
    /**
     * Check if dependencies are available and initialize
     */
    checkDependencies() {
        // Try to find global references if not provided in constructor
        if (!this.editor && window.editor) {
            this.editor = window.editor;
            console.log("GameEditorSync found editor from global scope");
        }
        
        if (!this.engine && window.engine) {
            this.engine = window.engine;
            console.log("GameEditorSync found engine from global scope");
        }
        
        if (this.editor && this.engine) {
            this.initialize();
        } else {
            console.warn("GameEditorSync still missing dependencies, will retry");
            this.scheduleRetry();
        }
    }

    /**
     * Initialize the sync system
     */
    initialize() {
        if (!this.editor || !this.engine) {
            console.warn("Editor or Engine not available for sync initialization");
            return;
        }
        
        this.initialized = true;
        console.log("GameEditorSync initialized successfully");
    }
    
    /**
     * Enable automatic synchronization between game and editor
     */
    enable() {
        if (!this.initialized) {
            console.warn("Cannot enable sync - not initialized yet");
            return;
        }
        
        this.syncEnabled = true;
        this.startAutoSync();
        console.log("Game-Editor sync enabled");
    }
    
    /**
     * Disable automatic synchronization
     */
    disable() {
        this.syncEnabled = false;
        this.stopAutoSync();
        console.log("Game-Editor sync disabled");
    }
    
    /**
     * Start automatic sync at regular intervals
     */
    startAutoSync() {
        if (this.syncInterval) return;
        
        this.syncInterval = setInterval(() => {
            if (!this.initialized) return;
            
            if (this.syncEnabled && this.engine && this.engine.running) {
                try {
                    this.syncGameToEditor();
                    this.syncEditorToGame();
                } catch (error) {
                    console.warn("Sync error:", error);
                }
            }
        }, this.syncFrequency);
        
        console.log("Auto sync started");
    }
    
    /**
     * Stop automatic sync
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log("Auto sync stopped");
        }
    }
    
    /**
     * Build the object mapping cache to speed up future syncs
     */
    buildObjectMaps() {
        if (!this.initialized) return;
        
        this.editorToGameMap.clear();
        this.gameToEditorMap.clear();
        
        if (!this.editor.activeScene || !this.engine.activeScene) return;
        
        // Map all editor objects to their corresponding game objects
        const mapObjects = (editorObjs, gameObjs) => {
            if (!Array.isArray(editorObjs) || !Array.isArray(gameObjs)) return;
            
            editorObjs.forEach(editorObj => {
                if (!editorObj || !editorObj.id) return;
                
                const gameObj = gameObjs.find(g => g && g.id === editorObj.id);
                if (gameObj) {
                    this.editorToGameMap.set(editorObj, gameObj);
                    this.gameToEditorMap.set(gameObj, editorObj);
                    
                    // Map children recursively
                    if (editorObj.children?.length > 0 && gameObj.children?.length > 0) {
                        mapObjects(editorObj.children, gameObj.children);
                    }
                }
            });
        };
        
        try {
            mapObjects(this.editor.activeScene.gameObjects, this.engine.activeScene.gameObjects);
        } catch (error) {
            console.warn("Error building object maps:", error);
        }
    }
    
    /**
     * Find matching game object for an editor object
     */
    findGameObject(editorObj) {
        // Try cache first
        if (this.editorToGameMap.has(editorObj)) {
            return this.editorToGameMap.get(editorObj);
        }
        
        // Fallback to search
        return this.findObjectById(editorObj.id, this.engine.activeScene.gameObjects);
    }
    
    /**
     * Find matching editor object for a game object
     */
    findEditorObject(gameObj) {
        // Try cache first
        if (this.gameToEditorMap.has(gameObj)) {
            return this.gameToEditorMap.get(gameObj);
        }
        
        // Fallback to search
        return this.findObjectById(gameObj.id, this.editor.activeScene.gameObjects);
    }
    
    /**
     * Find object by ID in an object collection (recursive search)
     */
    findObjectById(id, objects) {
        for (const obj of objects) {
            if (obj.id === id) return obj;
            
            // Check children
            if (obj.children && obj.children.length > 0) {
                const found = this.findObjectById(id, obj.children);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Check if we can safely perform sync operations
     */
    canSync() {
        if (!this.initialized) return false;
        
        const editorReady = this.editor && this.editor.activeScene;
        const engineReady = this.engine && this.engine.activeScene && this.engine.running;
        
        return editorReady && engineReady;
    }
    
    /**
     * Sync game object data to editor objects
     */
    syncGameToEditor() {
        if (!this.canSync() || !this.engine.running) return;
        
        // Rebuild maps occasionally to catch new objects
        const now = performance.now();
        if (now - this.lastSyncTime > 1000) {
            this.buildObjectMaps();
            this.lastSyncTime = now;
        }
        
        // Function to sync a single object and its children recursively
        const syncObject = (gameObj) => {
            const editorObj = this.findEditorObject(gameObj);
            if (editorObj) {
                // Sync basic transform properties
                editorObj.position.x = gameObj.position.x;
                editorObj.position.y = gameObj.position.y;
                editorObj.angle = gameObj.angle;
                if (gameObj.scale && editorObj.scale) {
                    editorObj.scale.x = gameObj.scale.x;
                    editorObj.scale.y = gameObj.scale.y;
                }
                
                // Sync properties and modules
                if (gameObj.properties) {
                    editorObj.properties = JSON.parse(JSON.stringify(gameObj.properties));
                }
                
                // Sync modules
                if (gameObj.modules && editorObj.modules) {
                    gameObj.modules.forEach((gameModule, index) => {
                        const editorModule = editorObj.modules.find(m => m.id === gameModule.id);
                        if (editorModule) {
                            // Copy over all non-function properties
                            Object.keys(gameModule).forEach(key => {
                                if (typeof gameModule[key] !== 'function') {
                                    editorModule[key] = JSON.parse(JSON.stringify(gameModule[key]));
                                }
                            });
                        }
                    });
                }
                
                // Sync children recursively
                if (gameObj.children && gameObj.children.length > 0) {
                    gameObj.children.forEach(child => syncObject(child));
                }
            }
        };
        
        // Start with root objects
        this.engine.activeScene.gameObjects.forEach(gameObj => {
            syncObject(gameObj);
        });
        
        // Refresh editor view
        this.editor.refreshCanvas();
        
        // Update inspector if object is selected
        if (this.editor.inspector && this.editor.inspector.currentObject) {
            this.editor.inspector.showObjectInspector();
        }
    }
    
    /**
     * Sync editor object data to game objects
     */
    syncEditorToGame() {
        if (!this.canSync() || !this.engine.running) return;
        
        // Function to sync a single object and its children recursively
        const syncObject = (editorObj) => {
            const gameObj = this.findGameObject(editorObj);
            if (gameObj) {
                // Sync basic transform properties
                gameObj.position.x = editorObj.position.x;
                gameObj.position.y = editorObj.position.y;
                gameObj.angle = editorObj.angle;
                if (editorObj.scale && gameObj.scale) {
                    gameObj.scale.x = editorObj.scale.x;
                    gameObj.scale.y = editorObj.scale.y;
                }
                
                // Sync properties
                if (editorObj.properties) {
                    gameObj.properties = JSON.parse(JSON.stringify(editorObj.properties));
                }
                
                // Sync modules
                if (editorObj.modules && gameObj.modules) {
                    editorObj.modules.forEach((editorModule) => {
                        const gameModule = gameObj.modules.find(m => m.id === editorModule.id);
                        if (gameModule) {
                            // Copy over all non-function properties
                            Object.keys(editorModule).forEach(key => {
                                if (typeof editorModule[key] !== 'function') {
                                    gameModule[key] = JSON.parse(JSON.stringify(editorModule[key]));
                                }
                            });
                        }
                    });
                }
                
                // Sync children recursively
                if (editorObj.children && editorObj.children.length > 0) {
                    editorObj.children.forEach(child => syncObject(child));
                }
            }
        };
        
        // Start with root objects
        this.editor.activeScene.gameObjects.forEach(editorObj => {
            syncObject(editorObj);
        });
    }
}

// Export the class
window.GameEditorSync = GameEditorSync;