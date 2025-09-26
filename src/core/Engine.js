class Engine {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.useWebGL = options.useWebGL || false; // New option to enable WebGLCanvas

        this.guiCanvas = document.createElement('canvas');
        this.guiCanvas.width = 800;
        this.guiCanvas.height = 600;
        this.guiCanvas.style.position = 'absolute';
        this.guiCanvas.style.left = '0px';
        this.guiCanvas.style.top = '0px';
        this.guiCanvas.style.pointerEvents = 'none';

        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = 800;
        this.backgroundCanvas.height = 600;
        this.backgroundCanvas.style.position = 'absolute';
        this.backgroundCanvas.style.left = '0px';
        this.backgroundCanvas.style.top = '0px';
        this.backgroundCanvas.style.pointerEvents = 'none';

        //this.ctx = canvas.getContext('2d');
        this.scene = null;
        this.gameObjects = [];
        this.lastTime = 0;
        this.running = false;
        this.preloaded = false;

        this.decalCanvas = document.createElement('canvas');
        this.decalCanvas.width = 800;
        this.decalCanvas.height = 600;
        this.decalCanvas.style.position = 'absolute';
        this.decalCanvas.style.left = '0px';
        this.decalCanvas.style.top = '0px';
        this.decalCanvas.style.pointerEvents = 'none';

        this.decalCtx = this.decalCanvas.getContext('2d');
        this.decalChunks = new Map(); // Map of chunks by key (e.g., "x_y")

        this.debugDecals = false;

        // Decal chunk settings
        this.chunkSize = 512; // World units per chunk (configurable)
        this.preloadChunkRadius = 1; // Number of chunks to preload in each direction around viewport

        this.usePixi = false; // Set to true to enable Pixi.js
        this.pixiRenderer = null;

        if (this.useWebGL && window.WebGLCanvas) {
            try {
                // Use WebGLCanvas for GPU-accelerated rendering
                this.ctx = new WebGLCanvas(this.canvas, {
                    enableFullscreen: false,
                    pixelWidth: this.canvas.width,
                    pixelHeight: this.canvas.height,
                    pixelScale: 1,
                    batchSize: 8000
                });

                // Check if WebGLCanvas actually initialized properly
                if (this.ctx) {
                    console.log("WebGLCanvas initialized successfully");
                    console.log("WebGLCanvas methods:", Object.getOwnPropertyNames(this.ctx));
                } else if (this.ctx && typeof this.ctx.init === 'function') {
                    // Some WebGL contexts need explicit initialization
                    //await this.ctx.init();
                    console.log("WebGLCanvas initialized after init() call");
                } else {
                    console.warn("WebGLCanvas created but may not be ready");
                    // Fallback to 2D context
                    this.useWebGL = false;
                    this.ctx = this.canvas.getContext('2d');
                    console.log("Falling back to Canvas 2D context");
                }
            } catch (error) {
                console.error("Failed to initialize WebGLCanvas:", error);
                this.useWebGL = false;
                this.ctx = this.canvas.getContext('2d');
                console.log("Falling back to Canvas 2D context due to error");
            }
        } else {
            // Fallback to standard 2D context
            this.ctx = this.canvas.getContext('2d');
            console.log("Using standard Canvas 2D context");
        }

        // Track viewport settings
        this.viewport = {
            width: 800,
            height: 600,
            x: 0,
            y: 0,
            zoom: 1,
            angle: 0,
            // Add bounds checking
            minZoom: 0.1,
            maxZoom: 10,
            // Track if viewport is dirty and needs updates
            dirty: true,
            // Add viewport shake for effects
            shake: { x: 0, y: 0, intensity: 0, duration: 0 }
        };

        this.viewportOriginalPosition = {
            width: 800,
            height: 600,
            x: 0,
            y: 0,
            zoom: 1,
            angle: 0 // Camera angle in degrees
        };

        this.renderConfig = {
            scaleMode: 'fit', // 'fit', 'stretch', 'pixel-perfect', 'nearest-neighbor'
            fullscreen: false,
            maintainAspectRatio: true,
            pixelPerfect: false,
            smoothing: true,
            // Add DPI awareness
            pixelRatio: window.devicePixelRatio || 1
        };

        // Add reference to the editor
        this.editor = null;

        // Track if canvas was resized
        this.canvasResized = true;

        // Add viewport change callbacks
        this.viewportCallbacks = [];

        // Set the input manager reference to this engine
        if (window.input) {
            window.input.setEngine(this);
            window.input.useCanvasTarget();
        }

        if (!window.viewport) {
            window.viewport = this.viewport;
        }

        //if(!window.prefabManager) {
        //    window.prefabManager = new PrefabManager();
        //}

        window.engine = this; // Global reference for easy access

        // Initialize MelodiCode if available
        if (window.MelodiCode) {
            this.melodicode = new window.MelodiCode();
        }

        // Set up resize observer to continuously monitor container size
        this.setupResizeObserver();

        // Also listen for window resize events
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // Listen for panel resize events
        window.addEventListener('panel-resized', () => {
            this.resizeCanvas();
        });

        // Initialize viewport properly
        this.initializeViewport();

        // Initialize prefab manager if not already available
        if (!window.prefabManager) {
            // Create a simple prefab manager for runtime
            window.prefabManager = {
                prefabs: new Map(),

                loadPrefabs: function (prefabsData) {
                    if (!prefabsData) return;

                    for (const [name, prefabData] of Object.entries(prefabsData)) {
                        this.prefabs.set(name, prefabData);
                        console.log('Loaded prefab:', name);
                    }

                    console.log('Total prefabs loaded:', this.prefabs.size);
                },

                findPrefabByName: function (name) {
                    if (!name) return null;

                    if (this.prefabs.has(name)) {
                        return this.prefabs.get(name);
                    }

                    const lowerName = name.toLowerCase();
                    for (const [key, value] of this.prefabs) {
                        if (key.toLowerCase() === lowerName) {
                            return value;
                        }
                    }

                    return null;
                },

                hasPrefab: function (name) {
                    return this.findPrefabByName(name) !== null;
                },

                getAllPrefabNames: function () {
                    return Array.from(this.prefabs.keys());
                },

                instantiatePrefabByName: function (name, position = null, parent = null) {
                    const prefabData = this.findPrefabByName(name);
                    if (!prefabData) {
                        console.error('Prefab not found:', name);
                        return null;
                    }

                    return this.instantiatePrefab(prefabData, position, parent);
                },

                instantiatePrefab: function (prefabData, position = null, parent = null) {
                    try {
                        const gameObject = GameObject.fromJSON(prefabData);

                        if (position) {
                            gameObject.position.x = position.x;
                            gameObject.position.y = position.y;
                        }

                        if (parent) {
                            parent.addChild(gameObject);
                        } else if (window.engine && window.engine.gameObjects) {
                            window.engine.gameObjects.push(gameObject);
                        }

                        return gameObject;
                    } catch (error) {
                        console.error('Error instantiating prefab:', error);
                        return null;
                    }
                }
            };
        }

        // Store reference in engine for easy access
        this.prefabManager = window.prefabManager;

        // Track dynamically created objects for cleanup
        this.dynamicObjects = new Set();
        this.originalGameObjects = [];

        this.objectsToCreate = new Map(); // Map to track objects to create by name

        this.maxFPS = 120; // Default, will be updated from settings
        this._minFrameInterval = 1000 / this.maxFPS;
        this._lastFrameTime = 0;
        this.fps = 0;

        this.enableVSync = true;

        this.frameCount = 0; // Tracks frames since last FPS update
        this.lastFpsUpdate = 0; // Timestamp of last FPS calculation

        this.prefabs = {}; // Store loaded prefabs by name or ID

        canvas.tabIndex = 0; // Makes canvas focusable
        canvas.focus(); // Give it focus
    }

    initializePixiRenderer() {
        if (this.usePixi && window.PixiRenderer) {
            this.pixiRenderer = new PixiRenderer(this.canvas, this.viewport.width, this.viewport.height, {
                backgroundColor: this.scene.settings.backgroundColor || 0x000000,
                antialias: true
            });

            this.pixiRenderer.Init().then(success => {
                if (success) {
                    console.log("PixiRenderer initialized");
                } else {
                    console.error("Failed to initialize PixiRenderer");
                    this.pixiRenderer = null;
                    this.usePixi = false;
                }
            });
        }
    }


    initializeViewport() {
        // Ensure viewport is properly initialized
        this.viewport.dirty = true;
        this.updateViewport();
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

    updateViewport() {
        // Add safety check for shake object
        if (!this.viewport.shake) {
            this.viewport.shake = { x: 0, y: 0, intensity: 0, duration: 0 };
        }

        // Clamp zoom within bounds
        this.viewport.zoom = Math.max(this.viewport.minZoom,
            Math.min(this.viewport.maxZoom, this.viewport.zoom));

        // Normalize angle to 0-360 range
        this.viewport.angle = ((this.viewport.angle % 360) + 360) % 360;

        // Update viewport shake
        if (this.viewport.shake.duration > 0) {
            this.viewport.shake.duration -= 16; // Assuming 60fps
            if (this.viewport.shake.duration <= 0) {
                this.viewport.shake.x = 0;
                this.viewport.shake.y = 0;
                this.viewport.shake.intensity = 0;
            } else {
                const intensity = this.viewport.shake.intensity * (this.viewport.shake.duration / 1000);
                this.viewport.shake.x = (Math.random() - 0.5) * intensity;
                this.viewport.shake.y = (Math.random() - 0.5) * intensity;
            }
        }

        // Preload decal chunks around the new viewport position
        this.preloadChunks();

        // Mark as clean
        this.viewport.dirty = false;

        // Notify callbacks
        this.viewportCallbacks.forEach(callback => {
            try {
                callback(this.viewport);
            } catch (error) {
                console.error('Error in viewport callback:', error);
            }
        });
    }

    setupResizeObserver() {
        if (this.canvas && this.canvas.parentElement && window.ResizeObserver) {
            // Create a ResizeObserver to monitor container size changes
            this.resizeObserver = new ResizeObserver(entries => {
                // Resize the canvas whenever the container size changes
                this.resizeCanvas();
            });

            // Start observing the canvas container
            this.resizeObserver.observe(this.canvas.parentElement);
        } else {
            // Fallback for browsers without ResizeObserver
            setInterval(() => this.resizeCanvas(), 1000); // Check every second
        }
    }

    // Set the canvas context for different drawing modes
    getBackgroundCanvas() {
        return this.backgroundCanvas.getContext('2d');
    }

    getGuiCanvas() {
        return this.guiCanvas.getContext('2d');
    }

    getMainCanvas() {
        return this.canvas.getContext('2d');
    }

    updateRenderConfig(settings) {
        // Update settings
        Object.assign(this.renderConfig, settings);

        // Force canvas resize to apply new settings
        this.resizeCanvas();
    }

    getGameObjectByName(name) {
        // Use a simple recursive search to find the first matching game object by name
        const findInObjects = (objects) => {
            for (const obj of objects) {
                if (obj.name === name) {
                    return obj;
                }
                if (obj.children && obj.children.length > 0) {
                    const found = findInObjects(obj.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findInObjects(this.gameObjects);
    }

    addGameObject(gameObject, parent = null, isDynamic = false) {
        if (parent) {
            parent.addChild(gameObject);
        } else {
            this.gameObjects.push(gameObject);
        }
        if (isDynamic) {
            this.dynamicObjects.add(gameObject);
            gameObject._isDynamic = true; // Mark for editor awareness
        }
        return gameObject;
    }

    getAllObjects(objects = this.gameObjects, visited = new Set()) {
        let result = [];
        objects.forEach(obj => {
            if (visited.has(obj)) return;
            visited.add(obj);
            result.push(obj);
            if (obj.children && obj.children.length) {
                result = result.concat(this.getAllObjects(obj.children, visited));
            }
        });
        return result;
    }

    /*
        Find the nearest object to x and y by name within a certain range
    */
    findNearestObjectByName(x, y, name, maxRange = Infinity) {
        let nearest = null;
        let nearestDist = maxRange;

        this.gameObjects.forEach(obj => {
            if (obj.name === name) {
                const dx = obj.position.x - x;
                const dy = obj.position.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = obj;
                }
            }
        });

        return nearest;
    }

    async preload() {
        console.log("Preloading game objects...");
        const preloadPromises = [];

        // Traverse all game objects and collect preload promises
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.preload) {
                preloadPromises.push(obj.preload());
            }
            if (obj.modules) {
                obj.modules.forEach(module => {
                    if (module.preload) {
                        preloadPromises.push(module.preload(obj));
                    }
                });
            }
            obj.engine = this; // Set engine reference for each object
        });

        // Wait for all resources to load
        await Promise.all(preloadPromises);
        this.preloaded = true;
        console.log("All resources preloaded.");
    }

    traverseGameObjects(objects, callback) {
        objects.forEach(obj => {
            callback(obj);
            if (obj.children && obj.children.length > 0) {
                this.traverseGameObjects(obj.children, callback);
            }
        });
    }

    setViewportPosition(x, y) {
        this.viewport.x = x;
        this.viewport.y = y;
        this.viewport.dirty = true;
    }

    moveViewport(deltaX, deltaY) {
        this.viewport.x += deltaX;
        this.viewport.y += deltaY;
        this.viewport.dirty = true;
    }

    setViewportZoom(zoom) {
        this.viewport.zoom = Math.max(this.viewport.minZoom,
            Math.min(this.viewport.maxZoom, zoom));
        this.viewport.dirty = true;
    }

    zoomViewport(factor) {
        this.setViewportZoom(this.viewport.zoom * factor);
    }

    setViewportAngle(angle) {
        this.viewport.angle = angle;
        this.viewport.dirty = true;
    }

    rotateViewport(deltaAngle) {
        this.viewport.angle += deltaAngle;
        this.viewport.dirty = true;
    }

    shakeViewport(intensity, duration) {
        this.viewport.shake.intensity = intensity;
        this.viewport.shake.duration = duration;
    }

    worldToScreen(worldX, worldY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Apply viewport transformations in reverse order
        let screenX = worldX - this.viewport.x + this.viewport.shake.x;
        let screenY = worldY - this.viewport.y + this.viewport.shake.y;

        // Apply zoom
        screenX = (screenX - centerX) * this.viewport.zoom + centerX;
        screenY = (screenY - centerY) * this.viewport.zoom + centerY;

        // Apply rotation if needed
        if (this.viewport.angle !== 0) {
            const radians = this.viewport.angle * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            const relX = screenX - centerX;
            const relY = screenY - centerY;

            screenX = centerX + (relX * cos - relY * sin);
            screenY = centerY + (relX * sin + relY * cos);
        }

        return { x: screenX, y: screenY };
    }

    screenToWorld(screenX, screenY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        let worldX = screenX;
        let worldY = screenY;

        // Reverse rotation
        if (this.viewport.angle !== 0) {
            const radians = -this.viewport.angle * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            const relX = worldX - centerX;
            const relY = worldY - centerY;

            worldX = centerX + (relX * cos - relY * sin);
            worldY = centerY + (relX * sin + relY * cos);
        }

        // Reverse zoom
        worldX = (worldX - centerX) / this.viewport.zoom + centerX;
        worldY = (worldY - centerY) / this.viewport.zoom + centerY;

        // Reverse position offset and shake
        worldX = worldX + this.viewport.x - this.viewport.shake.x;
        worldY = worldY + this.viewport.y - this.viewport.shake.y;

        return { x: worldX, y: worldY };
    }

    onViewportChange(callback) {
        this.viewportCallbacks.push(callback);
    }

    removeViewportCallback(callback) {
        const index = this.viewportCallbacks.indexOf(callback);
        if (index > -1) {
            this.viewportCallbacks.splice(index, 1);
        }
    }

    async start() {
        if (this.usePixi && !this.pixiRenderer) {
            this.initializePixiRenderer();
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null; // Ensure no stale frame
        }

        if (!this.scene) {
            console.error('No scene loaded');
            return;
        }

        // Make sure InputManager has the engine reference
        if (window.input) {
            window.input.setEngine(this);
        }

        console.log("Starting game...");

        this.viewportOriginalPosition = {
            width: this.viewport.width,
            height: this.viewport.height,
            x: this.viewport.x,
            y: this.viewport.y,
            zoom: this.viewport.zoom,
            angle: this.viewport.angle
        };

        // Perform any pre-start setup
        this.refreshModules();

        if (!this.preloaded) {
            await this.preload();
        }

        // Call start on all game objects
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active) {
                // Call the object's start method
                if (obj.start) {
                    obj.start();
                }

                // Call each module's start method
                /*obj.modules.forEach(module => {
                    if (module.enabled && module.start) {
                        try {
                            module.start();
                        } catch (error) {
                            console.error(`Error starting module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });*/
            }
        });

        // Initialize touch controls
        this.initTouchControls();

        this.running = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));

        //await window.prefabManager.loadExistingPrefabs()
    }

    pause() {
        if (this.running) {
            this.wasRunning = true;
            this.running = false;
            cancelAnimationFrame(this.animationFrameId);
            console.log("Game paused");
        }
    }

    resume() {
        if (this.wasRunning && !this.running) {
            this.running = true;
            this.wasRunning = false;
            this.lastFrameTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
            console.log("Game resumed");
        }
    }

    stop() {
        console.log("Stopping game...");
        this.running = false;
        this.wasRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null; // Ensure no stale frame
        }

        // Stop all melodicode audio
        if (this.melodicode && typeof this.melodicode.stop === 'function') {
            this.melodicode.stop();
        }

        this.clearDecals();

        // Preserve shake object structure when resetting viewport
        this.viewport = {
            width: this.viewportOriginalPosition.width,
            height: this.viewportOriginalPosition.height,
            x: this.viewportOriginalPosition.x,
            y: this.viewportOriginalPosition.y,
            zoom: this.viewportOriginalPosition.zoom,
            angle: this.viewportOriginalPosition.angle,
            // Preserve all viewport properties
            minZoom: this.viewport.minZoom,
            maxZoom: this.viewport.maxZoom,
            dirty: this.viewport.dirty,
            shake: { x: 0, y: 0, intensity: 0, duration: 0 }
        };

        // Call onDestroy on all game objects
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.modules) {
                obj.modules.forEach(module => {
                    if (module.onDestroy) {
                        try {
                            module.onDestroy();
                        } catch (error) {
                            console.error(`Error in onDestroy for module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });
            }
        });

        // Clean up dynamically created prefab instances
        this.cleanupDynamicObjects();

        // Reset physics after calling onDestroy to properly restore positions
        if (window.physicsManager) {
            window.physicsManager.reset();
        }

        // NEW: Restore the original objects to the editor and fix selection
        if (window.editor && window.editor.activeScene) {
            // Restore original objects to the scene
            window.editor.activeScene.gameObjects = [...this.originalGameObjects];
            window.editor.scene.gameObjects = [...this.originalGameObjects];

            // If there was a selected object, try to find its original counterpart
            if (window.editor.hierarchy && window.editor.hierarchy.selectedObject) {
                const selectedClone = window.editor.hierarchy.selectedObject;

                // Find the original object by matching name and position
                const originalObject = this.findOriginalObject(selectedClone, this.originalGameObjects);

                if (originalObject) {
                    // Deselect the clone
                    selectedClone.setSelected(false);

                    // Select the original object
                    originalObject.setSelected(true);
                    window.editor.hierarchy.selectedObject = originalObject;

                    // Update the inspector to show the original object
                    if (window.editor.inspector) {
                        window.editor.inspector.inspectObject(originalObject);
                    }

                    // Update hierarchy UI to show proper selection
                    window.editor.hierarchy.refreshHierarchy();

                    // Make sure the hierarchy item is selected
                    const hierarchyItem = document.querySelector(`.hierarchy-item[data-id="${originalObject.id}"]`);
                    if (hierarchyItem) {
                        // Remove selection from all items first
                        document.querySelectorAll('.hierarchy-item').forEach(item => {
                            item.classList.remove('selected');
                        });
                        // Add selection to the correct item
                        hierarchyItem.classList.add('selected');
                    }
                } else {
                    // If we can't find the original, just clear the selection
                    selectedClone.setSelected(false);
                    window.editor.hierarchy.selectedObject = null;

                    // Update hierarchy UI
                    document.querySelectorAll('.hierarchy-item').forEach(item => {
                        item.classList.remove('selected');
                    });

                    // Show "no object selected" in inspector
                    if (window.editor.inspector) {
                        window.editor.inspector.showNoObjectMessage();
                    }
                }
            }

            // Refresh the hierarchy to show original objects
            if (window.editor.hierarchy) {
                window.editor.hierarchy.refreshHierarchy();
            }

            // Refresh the editor canvas to show restored objects
            window.editor.refreshCanvas();
        }
    }

    /**
     * Find the original object that corresponds to a cloned object
     * @param {GameObject} clonedObject - The cloned object to find the original for
     * @param {Array} originalObjects - Array of original objects to search in
     * @returns {GameObject|null} - The original object or null if not found
     */
    findOriginalObject(clonedObject, originalObjects) {
        // Helper function to search recursively through objects and their children
        const searchInObjects = (objects) => {
            for (const obj of objects) {
                // Match by name and original position (before any runtime changes)
                if (obj.name === clonedObject.name &&
                    obj._originalPosition && clonedObject._originalPosition &&
                    Math.abs(obj._originalPosition.x - clonedObject._originalPosition.x) < 0.01 &&
                    Math.abs(obj._originalPosition.y - clonedObject._originalPosition.y) < 0.01) {
                    return obj;
                }

                // If no original position stored, fall back to ID matching if available
                if (!obj._originalPosition && obj.id === clonedObject.id) {
                    return obj;
                }

                // Search in children
                if (obj.children && obj.children.length > 0) {
                    const found = searchInObjects(obj.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return searchInObjects(originalObjects);
    }

    /**
     * Remove a dynamically created object
     * @param {GameObject} gameObject - The object to remove
     */
    removeDynamicObject(gameObject) {
        if (!gameObject) return false;

        // Remove from dynamic objects tracking
        this.dynamicObjects.delete(gameObject);

        // Remove from game objects array
        const index = this.gameObjects.indexOf(gameObject);
        if (index > -1) {
            this.gameObjects.splice(index, 1);
        }

        // Also remove from parent if it has one
        if (gameObject.parent) {
            gameObject.parent.removeChild(gameObject);
        }

        // Remove from editor's scene if available
        if (window.editor && window.editor.activeScene) {
            const editorIndex = window.editor.activeScene.gameObjects.indexOf(gameObject);
            if (editorIndex > -1) {
                window.editor.activeScene.gameObjects.splice(editorIndex, 1);
            }

            // Also remove from editor's scene reference
            const sceneIndex = window.editor.scene.gameObjects.indexOf(gameObject);
            if (sceneIndex > -1) {
                window.editor.scene.gameObjects.splice(sceneIndex, 1);
            }
        }

        // Check if this object is currently selected in the editor
        if (window.editor && window.editor.hierarchy && window.editor.hierarchy.selectedObject === gameObject) {
            gameObject.setSelected(false);
            window.editor.hierarchy.selectedObject = null;

            // Update hierarchy UI
            document.querySelectorAll('.hierarchy-item').forEach(item => {
                item.classList.remove('selected');
            });

            // Show "no object selected" in inspector
            if (window.editor.inspector) {
                window.editor.inspector.showNoObjectMessage();
            }
        }

        // Call onDestroy on the object and its modules
        if (gameObject.modules) {
            gameObject.modules.forEach(module => {
                if (module.onDestroy) {
                    try {
                        module.onDestroy();
                    } catch (error) {
                        console.error(`Error in onDestroy for module ${module.type || module.constructor.name}:`, error);
                    }
                }
            });
        }

        console.log(`Removed dynamic object: ${gameObject.name || 'Unnamed'}`);
        return true;
    }

    /**
     * Clean up all dynamically created objects
     */
    cleanupDynamicObjects() {
        console.log(`Cleaning up ${this.dynamicObjects.size} dynamic objects...`);

        // Convert to array to avoid modification during iteration
        const objectsToRemove = Array.from(this.dynamicObjects);

        objectsToRemove.forEach(obj => {
            this.removeDynamicObject(obj);
        });

        // Restore original game objects
        this.gameObjects = [...this.originalGameObjects];
        this.dynamicObjects.clear();

        // Update the editor if available
        if (window.editor) {
            // Update the editor's scene gameObjects reference
            if (window.editor.activeScene) {
                window.editor.activeScene.gameObjects = [...this.originalGameObjects];
                window.editor.scene.gameObjects = [...this.originalGameObjects];
            }

            // Clear any selected object if it was dynamic
            if (window.editor.hierarchy && window.editor.hierarchy.selectedObject) {
                const selectedObj = window.editor.hierarchy.selectedObject;
                if (selectedObj._isDynamic) {
                    selectedObj.setSelected(false);
                    window.editor.hierarchy.selectedObject = null;

                    // Update hierarchy UI
                    document.querySelectorAll('.hierarchy-item').forEach(item => {
                        item.classList.remove('selected');
                    });

                    // Show "no object selected" in inspector
                    if (window.editor.inspector) {
                        window.editor.inspector.showNoObjectMessage();
                    }
                }
            }

            // Refresh the hierarchy to remove dynamic objects from the UI
            if (window.editor.hierarchy) {
                window.editor.hierarchy.refreshHierarchy();
            }

            // Refresh the editor canvas
            window.editor.refreshCanvas();
        }

        console.log('Dynamic object cleanup complete');
    }

    refreshModules() {
        if (!window.moduleReloader || !window.moduleRegistry) {
            console.warn("Cannot refresh modules: ModuleReloader or ModuleRegistry not available");
            return false;
        }

        console.log("Refreshing all module instances before game start...");

        let totalUpdated = 0;

        // Get all registered module types
        const moduleTypes = Array.from(window.moduleRegistry.modules.keys());

        // Update instances of each module type
        moduleTypes.forEach(className => {
            const updated = window.moduleReloader.updateModuleInstances(
                className,
                this.gameObjects
            );

            if (updated > 0) {
                totalUpdated += updated;
                console.log(`Updated ${updated} instances of ${className}`);
            }
        });

        console.log(`Total module instances refreshed: ${totalUpdated}`);
        return totalUpdated > 0;
    }

    updateFPSLimit(newMaxFPS) {
        this.maxFPS = newMaxFPS;
        this._minFrameInterval = this.maxFPS > 0 ? 1000 / this.maxFPS : 0;
    }

    setVSync(enabled) {
        this.enableVSync = enabled;
        console.log(`VSync ${enabled ? 'enabled' : 'disabled'}`);
    }

    gameLoop(timestamp) {
        if (!this.running) return;

        // FPS limiting logic - only apply when VSync is disabled
        if (!this.enableVSync && this.maxFPS > 0) {
            if (timestamp - this._lastFrameTime < this._minFrameInterval) {
                this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
                return;
            }
        }
        this._lastFrameTime = timestamp;

        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.frameCount++;
        if (timestamp - this.lastFpsUpdate >= 1000) { // Update every 1 second
            this.fps = this.frameCount; // Set FPS to frames in the last second
            this.frameCount = 0; // Reset frame count
            this.lastFpsUpdate = timestamp; // Update timestamp
        }

        // Update input manager at the start of the frame
        if (window.input) {
            window.input.beginFrame();
        }

        // Update viewport if dirty
        if (this.viewport.dirty) {
            this.updateViewport();
        }

        // Update decal chunks for fading
        this.decalChunks.forEach(chunk => chunk.update(deltaTime));

        this.update(deltaTime);
        this.draw();

        // Update input manager at the end of the frame
        if (window.input) {
            window.input.endFrame();
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Begin loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active) {
                // Call object's beginLoop method
                if (obj.beginLoop) obj.beginLoop(deltaTime);

                // Call modules' beginLoop methods
                /*obj.modules.forEach(module => {
                    if (module.enabled && module.beginLoop) {
                        try {
                            // Only pass deltaTime parameter, not the object reference
                            module.beginLoop(deltaTime);
                        } catch (error) {
                            console.error(`Error in beginLoop for module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });*/
            }
        });

        // Update collision system
        /*if (window.collisionSystem) {
            // Get all active objects
            const allObjects = this.getAllObjects(this.gameObjects).filter(obj => obj.active);

            // Update collision detection
            window.collisionSystem.update(allObjects);
        }*/

        // Main loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active) {
                // Call object's loop method
                if (obj.loop) obj.loop(deltaTime);

                // Call modules' loop methods
                /*obj.modules.forEach(module => {
                    if (module.enabled && module.loop) {
                        try {
                            // Only pass deltaTime parameter, not the object reference
                            module.loop(deltaTime);
                        } catch (error) {
                            console.error(`Error in loop for module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });*/
            }
        });

        // End loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active) {
                // Call object's endLoop method
                if (obj.endLoop) obj.endLoop(deltaTime);

                // Call modules' endLoop methods
                /*obj.modules.forEach(module => {
                    if (module.enabled && module.endLoop) {
                        try {
                            // Only pass deltaTime parameter, not the object reference
                            module.endLoop(deltaTime);
                        } catch (error) {
                            console.error(`Error in endLoop for module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });*/
            }
        });
    }

    draw() {
        if (!this.canvas || !this.ctx || !this.running) return;

        if (this.usePixi && this.pixiRenderer) {
            // Sync GameObjects to Pixi
            const allObjects = this.getAllObjects(this.gameObjects);
            allObjects.forEach(obj => {
                if (!obj.pixiDisplayObject) {
                    const pixiObj = obj.createPixiDisplayObject();
                    this.pixiRenderer.addDisplayObject(pixiObj);
                }
                obj.updatePixiDisplayObject();
            });

            // Draw each active and visible object using pixiRenderer as context
            allObjects
                .filter(obj => obj.active && obj.visible !== false)
                .sort((a, b) => b.depth - a.depth)
                .forEach(obj => {
                    try {
                        obj.draw(this.pixiRenderer); // Pass pixiRenderer as context
                    } catch (error) {
                        console.error(`Error drawing object ${obj.name}:`, error);
                    }
                });

            this.pixiRenderer.render();
            return;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Always fill with a solid color to prevent transparency issues
        // Use scene background color if available, otherwise default to black
        const fillColor = (this.scene && this.scene.settings && this.scene.settings.backgroundColor)
            ? this.scene.settings.backgroundColor
            : '#000000'; // Default fallback
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.backgroundCanvas) {
            const bgCtx = this.backgroundCanvas.getContext('2d');
            bgCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        }
        if (this.guiCanvas) {
            const guiCtx = this.guiCanvas.getContext('2d');
            guiCtx.clearRect(0, 0, this.guiCanvas.width, this.guiCanvas.height);
        }
        if (this.decalCanvas) {
            const decalCtx = this.decalCanvas.getContext('2d');
            decalCtx.clearRect(0, 0, this.decalCanvas.width, this.decalCanvas.height);
        }

        // Fill with scene background color
        if (this.scene && this.scene.settings && this.scene.settings.backgroundColor) {
            this.ctx.fillStyle = this.scene.settings.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Apply viewport transformation
        this.ctx.save();

        // Apply any camera transformations
        this.applyViewportTransform();

        // Draw background canvas if available
        if (this.backgroundCanvas) {
            this.ctx.save();
            this.ctx.globalAlpha = 1.0;
            // Apply proper background positioning
            this.ctx.drawImage(this.backgroundCanvas, 0, 0);
            this.ctx.restore();
        }

        // Draw decal canvas (in world space, before objects)
        if (this.decalCanvas) {
            this.ctx.save();
            this.ctx.globalAlpha = 1.0;
            // Render only visible chunks
            this.decalChunks.forEach(chunk => {
                if (chunk.isVisible(this.viewport)) {
                    this.ctx.save();
                    this.ctx.translate(chunk.x, chunk.y); // Position chunk in world space
                    chunk.draw(this.ctx, this.viewport, this.debugDecals); // Pass debug flag
                    this.ctx.restore();
                }
            });
            this.ctx.restore();
        }

        // Draw all game objects, sorted by depth
        const allObjects = this.getAllObjects(this.gameObjects);

        // Make sure we actually have objects to draw
        if (allObjects.length === 0) {
            // If no objects, draw a placeholder message
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = "20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("No objects in scene... What is a game without objects?", this.canvas.width / 2, this.canvas.height / 2);
        } else {
            // Draw each active and visible object
            allObjects
                .filter(obj => obj.active && obj.visible !== false)
                .sort((a, b) => b.depth - a.depth)
                .forEach(obj => {
                    try {
                        obj.draw(this.ctx);
                    } catch (error) {
                        console.error(`Error drawing object ${obj.name}:`, error);
                    }
                });
        }

        if (window.physicsManager && window.physicsManager.debugDraw) {
            window.physicsManager.drawDebug(this.ctx);
        }

        this.ctx.restore();

        // Draw GUI canvas AFTER restoring transform (GUI should not be affected by viewport)
        if (this.guiCanvas) {
            this.ctx.save();
            this.ctx.globalAlpha = 1.0;
            this.ctx.drawImage(this.guiCanvas, 0, 0);
            this.ctx.restore();
        }

        if (this.ctx.flush) this.ctx.flush(); // Ensure all drawing commands are executed
    }

    applyViewportTransform() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        /*if (this.useWebGL && this.ctx.setTransform && typeof this.ctx.setTransform === 'function') {
            // For WebGLCanvas, use the matrix-based transform
            const radians = this.viewport.angle * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            // Create transformation matrix
            const a = this.viewport.zoom * cos;
            const b = -this.viewport.zoom * sin;
            const c = this.viewport.zoom * sin;
            const d = this.viewport.zoom * cos;
            const e = centerX - this.viewport.x + this.viewport.shake.x;
            const f = centerY - this.viewport.y + this.viewport.shake.y;

            this.ctx.setTransform(a, b, c, d, e, f);
        } else {*/
        // Standard 2D canvas transforms
        this.ctx.translate(centerX, centerY);

        if (this.viewport.angle && this.viewport.angle !== 0) {
            const radians = this.viewport.angle * Math.PI / 180;
            this.ctx.rotate(radians);
        }

        if (this.viewport.zoom && this.viewport.zoom !== 1) {
            this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
        }

        this.ctx.translate(
            -centerX - this.viewport.x + this.viewport.shake.x,
            -centerY - this.viewport.y + this.viewport.shake.y
        );
        //}
    }

    loadScene(scene) {
        // Stop current scene if running
        if (this.running) {
            this.stop();
        } else if (window.physicsManager) {
            // Ensure physics is reset even if not currently running
            window.physicsManager.reset();
        }

        console.log(`Loading scene: ${scene.name}`);
        console.log(`Scene has ${scene.gameObjects.length} game objects`);

        // Clone the scene to avoid modifying the editor version
        this.scene = scene;
        this.clearDecals();

        // Copy viewport settings and validate them
        if (scene.settings) {
            this.viewport.width = Math.max(1, scene.settings.viewportWidth || 800);
            this.viewport.height = Math.max(1, scene.settings.viewportHeight || 600);
            this.viewport.x = scene.settings.viewportX || 0;
            this.viewport.y = scene.settings.viewportY || 0;
            this.viewport.zoom = Math.max(0.1, scene.settings.viewportZoom || 1);
            this.viewport.angle = scene.settings.viewportAngle || 0;
        }

        // Load chunk settings from scene if available
        if (scene.settings) {
            this.chunkSize = scene.settings.chunkSize || this.chunkSize;
            this.preloadChunkRadius = scene.settings.preloadChunkRadius || this.preloadChunkRadius;
        }

        // Mark viewport as dirty to force update
        this.viewport.dirty = true;

        // Deep clone only in editor. In exported/runtime builds, use objects as-built
        // so embedded assets (like SpriteRenderer.imageData) are preserved.
        if (window.editor) {
            // Store original positions before cloning
            this.storeOriginalPositions(scene.gameObjects);
            this.gameObjects = this.cloneGameObjects(scene.gameObjects, false);
        } else {
            this.gameObjects = scene.gameObjects;
        }

        // Store original objects for cleanup purposes
        this.originalGameObjects = [...scene.gameObjects]; // Use the original scene objects
        this.dynamicObjects.clear();

        this.preloaded = false;
        this.canvasResized = true;

        // Force canvas resize with new viewport settings
        this.resizeCanvas();
    }

    /**
 * Load scene by index (useful for exported games)
 */
    loadSceneByIndex(scenes, index) {
        if (!scenes || !Array.isArray(scenes) || index < 0 || index >= scenes.length) {
            console.error('Invalid scene index or scenes array');
            return false;
        }

        const scene = scenes[index];
        this.loadScene(scene);
        return true;
    }

    /**
     * Enhanced prefab instantiation
     */
    async instantiatePrefab(prefabName, x = 0, y = 0) {
        console.log(`Attempting to instantiate prefab: ${prefabName}`);

        let instantiated = null;

        // Method 1: Use engine's own prefab manager first
        if (this.prefabManager && typeof this.prefabManager.instantiatePrefabByName === 'function') {
            const position = new Vector2(x, y);
            instantiated = this.prefabManager.instantiatePrefabByName(prefabName, position);

            if (instantiated) {
                // Add to the current scene's gameObjects if not already added
                if (!this.gameObjects.includes(instantiated)) {
                    this.gameObjects.push(instantiated);
                }
                console.log(`Successfully instantiated prefab via engine prefab manager: ${prefabName}`);
            }
        }

        // Method 2: Check if we're in the editor - use the hierarchy's prefab manager
        if (!instantiated && window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
            const position = new Vector2(x, y);
            instantiated = window.editor.hierarchy.prefabManager.instantiatePrefabByName(prefabName, position);

            if (instantiated) {
                // Add to the current scene's gameObjects if not already added
                if (!this.gameObjects.includes(instantiated)) {
                    this.gameObjects.push(instantiated);
                }
                console.log(`Successfully instantiated prefab via editor: ${prefabName}`);
            }
        }

        // Method 3: Try the global prefab manager (for exported games)
        if (!instantiated && window.prefabManager) {
            console.log('Using global prefab manager for instantiation');

            if (typeof window.prefabManager.instantiatePrefabByName === 'function') {
                const position = new Vector2(x, y);
                instantiated = window.prefabManager.instantiatePrefabByName(prefabName, position);

                if (instantiated) {
                    // Add to the current scene's gameObjects if not already added
                    if (!this.gameObjects.includes(instantiated)) {
                        this.gameObjects.push(instantiated);
                    }
                    console.log(`Successfully instantiated prefab via global manager: ${prefabName}`);
                }
            }
        }

        // Method 4: Try loading from file browser (editor fallback)
        if (!instantiated && window.editor && window.editor.fileBrowser) {
            const variations = [
                `${prefabName}.prefab`,
                `Prefabs/${prefabName}.prefab`,
                `/Prefabs/${prefabName}.prefab`
            ];

            for (const variation of variations) {
                try {
                    const content = await window.editor.fileBrowser.readFile(variation);
                    if (content) {
                        const prefabData = JSON.parse(content);
                        instantiated = this.createGameObjectFromPrefab(prefabData, x, y);

                        if (instantiated) {
                            if (!this.gameObjects.includes(instantiated)) {
                                this.gameObjects.push(instantiated);
                            }
                            console.log(`Successfully instantiated prefab from file: ${variation}`);
                            break;
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load prefab from ${variation}:`, error);
                }
            }
        }

        // Track the instantiated object for cleanup
        if (instantiated) {
            this.dynamicObjects.add(instantiated);
            // Mark it as dynamically created for identification
            instantiated._isDynamic = true;
            console.log(`Tracked dynamic object: ${instantiated.name || 'Unnamed'}`);
        } else {
            console.error(`Prefab not found: ${prefabName}`);
            console.log('Available prefabs in global manager:', window.prefabManager ? window.prefabManager.getAllPrefabNames() : 'None');
            console.log('Available prefabs in engine:', this.getAvailablePrefabs());
        }

        return instantiated;
    }

    /**
     * Create GameObject from prefab data
     */
    createGameObjectFromPrefab(prefabData, x = 0, y = 0) {
        if (!prefabData) return null;

        try {
            // Create GameObject
            const gameObject = GameObject.fromJSON(prefabData);
            gameObject.position = new Vector2(x, y);
            return gameObject;

        } catch (error) {
            console.error(`Error creating GameObject from prefab:`, error);
            return null;
        }
    }

    /**
     * Check if a prefab exists by name
     * @param {string} prefabName - Name of the prefab to check
     * @returns {boolean} True if the prefab exists
     */
    hasPrefab(prefabName) {
        if (!prefabName) return false;

        // Check if we're in the editor - use the hierarchy's prefab manager
        if (window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
            return window.editor.hierarchy.prefabManager.hasPrefab(prefabName);
        }

        // Check if we're in an exported game with embedded prefabs
        if (window.prefabManager && typeof window.prefabManager.hasPrefab === 'function') {
            return window.prefabManager.hasPrefab(prefabName);
        }

        // Also check if prefabs are available through the file browser
        if (window.editor && window.editor.fileBrowser) {
            // Try to find a prefab file that matches
            const variations = [
                `${prefabName}.prefab`,
                `Prefabs/${prefabName}.prefab`,
                `/Prefabs/${prefabName}.prefab`
            ];

            for (const variation of variations) {
                if (window.editor.fileBrowser.exists && window.editor.fileBrowser.exists(variation)) {
                    return true;
                }
            }
        }

        return false;
    }

    findGameObjectByName(name) {
        // Use a simple recursive search to find the first matching game object by name
        const findInObjects = (objects) => {
            for (const obj of objects) {
                if (obj.name === name) {
                    return obj;
                }
                if (obj.children && obj.children.length > 0) {
                    const found = findInObjects(obj.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findInObjects(this.gameObjects);
    }

    /**
     * Add a decal at world coordinates (x, y)
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {Image|Function} imageOrDrawFunction - The decal image or a function(ctx) to draw custom graphics
     * @param {Object} options - Optional: {rotation, scale, alpha, width, height} (width/height for drawing functions)
     */
    addDecal(x, y, imageOrDrawFunction, options = {}) {
        const chunkX = Math.floor(x / this.chunkSize) * this.chunkSize;
        const chunkY = Math.floor(y / this.chunkSize) * this.chunkSize;
        const key = `${chunkX}_${chunkY}`;

        // Validate chunk bounds (ensure decal is within chunk)
        const localX = x - chunkX;
        const localY = y - chunkY;
        if (localX < 0 || localX >= this.chunkSize || localY < 0 || localY >= this.chunkSize) {
            console.warn(`Decal at (${x}, ${y}) is outside chunk bounds (${chunkX}, ${chunkY}) - adjusting.`);
            // Optional: Adjust position to fit within chunk (or skip addition)
        }

        if (!this.decalChunks.has(key)) {
            this.decalChunks.set(key, new DecalChunk(chunkX, chunkY, this.chunkSize));
        }

        if (this.debugDecals) {
            console.log(`Adding decal to chunk: ${key} at local (${localX}, ${localY})`);
        }

        this.decalChunks.get(key).addDecal(x, y, imageOrDrawFunction, options);
    }

    /**
     * Clear all decals or decals in a specific chunk
     * @param {number} x - Optional: World X to clear chunk
     * @param {number} y - Optional: World Y to clear chunk
     */
    clearDecals(x = null, y = null) {
        if (x !== null && y !== null) {
            const chunkX = Math.floor(x / this.chunkSize) * this.chunkSize;
            const chunkY = Math.floor(y / this.chunkSize) * this.chunkSize;
            const key = `${chunkX}_${chunkY}`;
            if (this.decalChunks.has(key)) {
                this.decalChunks.get(key).clear();
            }
        } else {
            this.decalChunks.forEach(chunk => chunk.clear());
        }
    }

    /**
     * Get or create a chunk for a world position
     * @param {number} x - World X
     * @param {number} y - World Y
     * @returns {DecalChunk}
     */
    getChunk(x, y) {
        const chunkX = Math.floor(x / this.chunkSize) * this.chunkSize;
        const chunkY = Math.floor(y / this.chunkSize) * this.chunkSize;
        const key = `${chunkX}_${chunkY}`;
        if (!this.decalChunks.has(key)) {
            this.decalChunks.set(key, new DecalChunk(chunkX, chunkY, this.chunkSize));
        }
        return this.decalChunks.get(key);
    }

    /**
     * Preload decal chunks around the viewport to ensure persistence
     */
    preloadChunks() {
        // Calculate viewport bounds in world space correctly
        // Visible world width/height is viewport dimensions divided by zoom
        const halfVisibleWidth = (this.viewport.width / 2) / this.viewport.zoom;
        const halfVisibleHeight = (this.viewport.height / 2) / this.viewport.zoom;

        const viewLeft = this.viewport.x - halfVisibleWidth;
        const viewRight = this.viewport.x + halfVisibleWidth;
        const viewTop = this.viewport.y - halfVisibleHeight;
        const viewBottom = this.viewport.y + halfVisibleHeight;

        // Add buffer chunks around the viewport for safety
        const buffer = this.preloadChunkRadius * this.chunkSize; // Use preloadChunkRadius as buffer distance
        const minChunkX = Math.floor((viewLeft - buffer) / this.chunkSize) * this.chunkSize;
        const maxChunkX = Math.floor((viewRight + buffer) / this.chunkSize) * this.chunkSize;
        const minChunkY = Math.floor((viewTop - buffer) / this.chunkSize) * this.chunkSize;
        const maxChunkY = Math.floor((viewBottom + buffer) / this.chunkSize) * this.chunkSize;

        if (this.debugDecals) {
            console.log(`Preloading chunks: view bounds (${viewLeft}, ${viewTop}) to (${viewRight}, ${viewBottom}), buffer: ${buffer}`);
        }

        // Preload all chunks that intersect or are near the viewport
        for (let x = minChunkX; x <= maxChunkX; x += this.chunkSize) {
            for (let y = minChunkY; y <= maxChunkY; y += this.chunkSize) {
                const key = `${x}_${y}`;
                if (!this.decalChunks.has(key)) {
                    this.decalChunks.set(key, new DecalChunk(x, y, this.chunkSize));
                    if (this.debugDecals) {
                        console.log(`Preloaded chunk: ${key}`);
                    }
                }
            }
        }

        // Optional: Unload distant chunks to prevent memory bloat
        const unloadBuffer = buffer * 2; // Unload beyond 2x the buffer
        const unloadMinX = minChunkX - unloadBuffer;
        const unloadMaxX = maxChunkX + unloadBuffer;
        const unloadMinY = minChunkY - unloadBuffer;
        const unloadMaxY = maxChunkY + unloadBuffer;

        for (const [key, chunk] of this.decalChunks) {
            const [cx, cy] = key.split('_').map(Number);
            if (cx < unloadMinX || cx > unloadMaxX || cy < unloadMinY || cy > unloadMaxY) {
                if (this.debugDecals) {
                    console.log(`Unloading distant chunk: ${key}`);
                }
                this.decalChunks.delete(key);
            }
        }
    }

    /**
     * Store original positions on objects before cloning for runtime
     * @param {Array} gameObjects - Array of game objects to process
     */
    storeOriginalPositions(gameObjects) {
        const storeForObject = (obj) => {
            // Store the original position
            obj._originalPosition = { x: obj.position.x, y: obj.position.y };

            // Store for children too
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(storeForObject);
            }
        };

        gameObjects.forEach(storeForObject);
    }

    cloneGameObjects(objects, addNameCopySuffix = true) {
        return objects.map(obj => {
            // Use the GameObject's built-in clone method
            const clonedObj = obj.clone(addNameCopySuffix);

            // Copy the original position to the clone for tracking
            if (obj._originalPosition) {
                clonedObj._originalPosition = { x: obj._originalPosition.x, y: obj._originalPosition.y };
            }

            // Handle the cloning of children separately to maintain proper hierarchy
            if (obj.children && obj.children.length > 0) {
                // Remove any existing children that were cloned
                clonedObj.children = [];

                // Clone all children recursively and add them properly
                const clonedChildren = this.cloneGameObjects(obj.children, addNameCopySuffix);
                clonedChildren.forEach(child => {
                    clonedObj.addChild(child);
                });
            }

            return clonedObj;
        });
    }

    /**
     * Save the current game state
     * @param {string} saveFileName - Name for the save file
     * @param {boolean} saveLocal - If true, save to localStorage; else, download as file
     */
    saveGame(saveFileName = 'savegame', saveLocal = true) {
        const state = {
            scene: this.scene ? this.scene.name : null,
            gameObjects: this.gameObjects.map(obj => obj.toJSON ? obj.toJSON() : obj),
            viewport: this.viewport,
            timestamp: Date.now()
        };
        const saveData = JSON.stringify(state);

        if (saveLocal) {
            localStorage.setItem(`dmjs_save_${saveFileName}`, saveData);
            alert(`Game saved locally as "${saveFileName}"`);
        } else {
            const blob = new Blob([saveData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${saveFileName}.dmjs-save.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Load a game state from localStorage or file
     * @param {string|File} source - Save file name (local) or File object
     * @returns {Promise<boolean>}
     */
    async loadGame(source) {
        let saveData = null;
        if (typeof source === 'string') {
            saveData = localStorage.getItem(`dmjs_save_${source}`);
        } else if (source instanceof File) {
            saveData = await source.text();
        }
        if (!saveData) {
            alert('Save file not found.');
            return false;
        }
        try {
            const state = JSON.parse(saveData);
            // Load scene by name if available
            if (state.scene && window.editor && window.editor.scenes) {
                const scene = window.editor.scenes.find(s => s.name === state.scene);
                if (scene) this.loadScene(scene);
            }
            // Restore game objects
            if (state.gameObjects) {
                this.gameObjects = state.gameObjects.map(objData =>
                    window.GameObject && window.GameObject.fromJSON
                        ? window.GameObject.fromJSON(objData)
                        : objData
                );
            }
            // Restore viewport
            if (state.viewport) {
                Object.assign(this.viewport, state.viewport);
            }
            alert('Game loaded!');
            return true;
        } catch (e) {
            alert('Failed to load game: ' + e.message);
            return false;
        }
    }

    /**
     * Load prefabs into the engine's prefab manager
     * @param {Object} prefabsData - Object containing prefab data
     */
    loadPrefabs(prefabsData) {
        if (!prefabsData) return;

        console.log('Loading prefabs into engine:', Object.keys(prefabsData));

        // Ensure we have a prefab manager
        if (!this.prefabManager && window.prefabManager) {
            this.prefabManager = window.prefabManager;
        }

        if (this.prefabManager && typeof this.prefabManager.loadPrefabs === 'function') {
            this.prefabManager.loadPrefabs(prefabsData);
            console.log(`Engine loaded ${Object.keys(prefabsData).length} prefabs`);
        } else {
            console.warn('No prefab manager available in engine');
        }
    }

    /**
     * Get all available prefab names from the engine's prefab manager
     * @returns {Array<string>} Array of prefab names
     */
    getAvailablePrefabs() {
        if (this.prefabManager && typeof this.prefabManager.getAllPrefabNames === 'function') {
            return this.prefabManager.getAllPrefabNames();
        }

        // Fallback to global prefab manager
        if (window.prefabManager && typeof window.prefabManager.getAllPrefabNames === 'function') {
            return window.prefabManager.getAllPrefabNames();
        }

        return [];
    }

    initTouchControls() {
        if (!this.canvas) return;

        // Prevent default touch actions on the canvas
        this.canvas.addEventListener('touchstart', (e) => {
            //e.preventDefault();

            // Convert touch to mouse events for simplicity
            if (window.input) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                window.input.handleMouseDown({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0, // Simulate left click
                    offsetX: x,
                    offsetY: y
                });
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            //e.preventDefault();

            // Convert touch to mouse events
            if (window.input) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                window.input.handleMouseMove({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    offsetX: x,
                    offsetY: y
                });
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            //e.preventDefault();

            // Convert touch to mouse events
            if (window.input) {
                window.input.handleMouseUp({
                    button: 0 // Simulate left click
                });
            }
        }, { passive: false });
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const container = this.canvas.parentElement;
        if (!container) return;

        // Get container dimensions - force a reflow to get the latest size
        container.offsetHeight; // Trigger reflow
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Ensure we have positive dimensions to work with
        if (containerWidth <= 0 || containerHeight <= 0) {
            return;
        }

        // Get the desired viewport dimensions from scene settings
        const viewportWidth = this.viewport.width || 800;
        const viewportHeight = this.viewport.height || 600;
        const aspectRatio = viewportWidth / viewportHeight;

        const pixelRatio = this.renderConfig.pixelRatio;

        // Set physical dimensions based on scaling mode
        let physicalWidth, physicalHeight;

        if (this.renderConfig.fullscreen) {
            if (this.renderConfig.maintainAspectRatio) {
                // Calculate dimensions to maintain aspect ratio within the container
                const containerRatio = containerWidth / containerHeight;

                if (containerRatio > aspectRatio) {
                    // Container is wider than needed - height is the limiting factor
                    physicalHeight = containerHeight;
                    physicalWidth = containerHeight * aspectRatio;
                } else {
                    // Container is taller than needed - width is the limiting factor
                    physicalWidth = containerWidth;
                    physicalHeight = containerWidth / aspectRatio;
                }
            } else {
                // Stretch to fill container without maintaining aspect ratio
                physicalWidth = containerWidth;
                physicalHeight = containerHeight;
            }
        } else {
            // Fixed size mode - calculate scale to fit in container
            const scale = Math.min(
                containerWidth / viewportWidth,
                containerHeight / viewportHeight
            );

            physicalWidth = viewportWidth * scale;
            physicalHeight = viewportHeight * scale;
        }

        // Ensure we don't have zero dimensions
        physicalWidth = Math.max(1, Math.floor(physicalWidth));
        physicalHeight = Math.max(1, Math.floor(physicalHeight));

        // Calculate centering position
        const left = Math.floor((containerWidth - physicalWidth) / 2);
        const top = Math.floor((containerHeight - physicalHeight) / 2);

        // Set canvas styles for proper display
        this.canvas.style.width = `${physicalWidth}px`;
        this.canvas.style.height = `${physicalHeight}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `${left}px`;
        this.canvas.style.top = `${top}px`;

        // Remove size constraints that might prevent proper scaling
        this.canvas.style.minWidth = '0';
        this.canvas.style.minHeight = '0';
        this.canvas.style.maxWidth = 'none';
        this.canvas.style.maxHeight = 'none';

        // Set the drawing surface size (use viewport dimensions)
        this.canvas.width = viewportWidth * pixelRatio;
        this.canvas.height = viewportHeight * pixelRatio;

        // Reset transform before scaling
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (pixelRatio !== 1) {
            this.ctx.scale(pixelRatio, pixelRatio);
        }

        // Update GUI and background canvas sizes to match main canvas
        if (this.guiCanvas) {
            this.guiCanvas.width = this.canvas.width;
            this.guiCanvas.height = this.canvas.height;
            const guiCtx = this.guiCanvas.getContext('2d');
            if (pixelRatio !== 1) {
                guiCtx.scale(pixelRatio, pixelRatio);
            }
        }
        if (this.backgroundCanvas) {
            this.backgroundCanvas.width = this.canvas.width;
            this.backgroundCanvas.height = this.canvas.height;
            const bgCtx = this.backgroundCanvas.getContext('2d');
            if (pixelRatio !== 1) {
                bgCtx.scale(pixelRatio, pixelRatio);
            }
        }

        // Update decal canvas size to match main canvas
        if (this.decalCanvas) {
            this.decalCanvas.width = this.canvas.width;
            this.decalCanvas.height = this.canvas.height;
            const decalCtx = this.decalCanvas.getContext('2d');
            if (pixelRatio !== 1) {
                decalCtx.scale(pixelRatio, pixelRatio);
            }
        }

        // Remove transform scaling which can cause positioning issues
        this.canvas.style.transform = 'none';

        // Configure image smoothing
        this.ctx.imageSmoothingEnabled = this.renderConfig.smoothing;

        // Apply appropriate CSS image rendering mode based on scale mode
        if (this.renderConfig.scaleMode === 'nearest-neighbor') {
            this.canvas.style.imageRendering = 'pixelated';
        } else {
            this.canvas.style.imageRendering = this.renderConfig.smoothing ? 'auto' : 'crisp-edges';
        }

        // If using WebGLCanvas, call its resize method
        if (this.useWebGL && this.ctx.resize) {
            this.ctx.resize(viewportWidth * pixelRatio, viewportHeight * pixelRatio);

            if (pixelRatio !== 1) {
                this.ctx.scale(pixelRatio, pixelRatio); // Ensure scaling is applied
            }
            return;
        }

        this.canvasResized = true;
        this.viewport.dirty = true; // Mark viewport as dirty after resize
    }

    cleanup() {
        // Clean up resources when engine is destroyed
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this._resizeHandler = this.resizeCanvas.bind(this);
        window.addEventListener('resize', this._resizeHandler);
        window.addEventListener('panel-resized', this._resizeHandler);

        // Clear viewport callbacks
        this.viewportCallbacks = [];
    }
}

window.Engine = Engine; // Make available globally