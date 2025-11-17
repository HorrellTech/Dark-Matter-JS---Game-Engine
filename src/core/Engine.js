/**
     * ============================================================================
     * PIXEL-PERFECT RENDERING SYSTEM
     * ============================================================================
     * 
     * This system ensures that all rendered graphics snap to exact canvas pixels,
     * preventing size inconsistencies, blurriness, and gaps between sprites.
     * 
     * KEY CONCEPTS:
     * 
     * 1. Effective Pixel Scale = (Canvas Resolution / Viewport Size) × Zoom
     *    - This is the multiplier from world coordinates to canvas pixels
     *    - Example: 400px canvas / 800px viewport × 2 zoom = 1.0 scale
     *    - At scale 1.0, one world unit = one canvas pixel
     * 
     * 2. Pixel Rounding Strategy:
     *    - POSITIONS: Round to nearest pixel (Math.round) to snap to grid
     *    - SIZES: Round up (Math.ceil) to ensure full pixel coverage, no gaps
     *    - RECTANGLES: Round start position, then round end position, calculate size
     * 
     * 3. Why This Matters:
     *    - Without rounding: A 16px sprite at fractional position (10.3, 5.7) 
     *      renders blurry and can vary in size (15-17px) depending on position
     *    - With rounding: Same sprite always renders as exactly 16px, sharp edges
     * 
     * USAGE IN MODULES:
     * 
     * Instead of:
     *   ctx.drawImage(image, x, y, width, height);
     *   ctx.fillRect(x, y, width, height);
     * 
     * Use:
     *   window.engine.drawImagePixelPerfect(ctx, image, x, y, width, height);
     *   window.engine.fillRectPixelPerfect(ctx, x, y, width, height);
     * 
     * Or manually round:
     *   const pos = window.engine.roundPositionToPixel(x, y);
     *   const size = window.engine.roundSizeToPixel(width);
     *   ctx.drawImage(image, pos.x, pos.y, size, size);
     * 
     * PERFORMANCE:
     * - Rounding operations are very fast (just multiply + Math.round + divide)
     * - The scale factor is cached per frame in getEffectivePixelScale()
     * - Consider caching results if drawing the same object many times per frame
     * 
     * ============================================================================
*/
class Engine {
    constructor(canvas, options = { useOffscreenRendering: true, makeGlobal: true, useWebGL: false }) {
        this.canvas = canvas;
        this.useWebGL = options.useWebGL || false; // New option to enable WebGLCanvas

        // Create offscreen rendering canvas for pixel-perfect rendering
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = 800;
        this.offscreenCanvas.height = 600;
        this.offscreenCanvas.style.imageRendering = "pixelated";
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
            willReadFrequently: true,
            alpha: false  // Opaque canvas for better performance
        });

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

        this.shadowCanvas = document.createElement('canvas');
        this.shadowCanvas.width = 800;
        this.shadowCanvas.height = 600;
        this.shadowCanvas.style.position = 'absolute';
        this.shadowCanvas.style.left = '0px';
        this.shadowCanvas.style.top = '0px';
        this.shadowCanvas.style.pointerEvents = 'none';

        this.useOffscreenRendering = options.useOffscreenRendering !== false; // Enable by default

        /*
            // USING MULTIPLAYER MANAGER
            // Connect to server
            engine.multiplayer.connect('ws://localhost:8080');

            // Register networked objects
            engine.multiplayer.registerNetworkedObject(player, true);
        */

        this.enableMultiplayer = options.enableMultiplayer || false;

        if (this.enableMultiplayer) {
            // Initialize Multiplayer Manager
            this.multiplayer = new MultiplayerManager(this);
        }

        //this.ctx = canvas.getContext('2d');
        this.scene = null;
        this.gameObjects = [];
        this.lastTime = 0;
        this.running = false;
        this.preloaded = false;

        this.timeScale = 1.0; // Global time scale for the engine, to be used in physics operations
        this.paused = false; // Global pause state for the engine

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

        if (!this.useWebGL) {
            this.displayCtx = this.canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false
            });
            // When offscreen rendering is enabled, rendering operations use offscreenCtx
            // Otherwise use the display context directly
            this.ctx = this.useOffscreenRendering ? this.offscreenCtx : this.displayCtx;

            // CRITICAL: Disable all image smoothing variants on offscreen context
            if (this.useOffscreenRendering) {
                this.offscreenCtx.imageSmoothingEnabled = false;
                this.offscreenCtx.mozImageSmoothingEnabled = false;
                this.offscreenCtx.webkitImageSmoothingEnabled = false;
                this.offscreenCtx.msImageSmoothingEnabled = false;
            }
        } else if (this.useWebGL && window.WebGLCanvas) {
            try {
                console.log("Attempting to initialize WebGLCanvas...");

                // Use WebGLCanvas for GPU-accelerated rendering
                this.ctx = new WebGLCanvas(this.canvas, {
                    enableFullscreen: false,
                    pixelWidth: this.canvas.width || 800,
                    pixelHeight: this.canvas.height || 600,
                    pixelScale: 1,
                    batchSize: 8000
                });

                // Check if WebGLCanvas actually initialized properly
                if (this.ctx) {
                    console.log("WebGLCanvas initialized successfully");

                    // Check for essential methods
                    const essentialMethods = ['addShader', 'drawWithShader', 'gl'];
                    const availableMethods = Object.getOwnPropertyNames(this.ctx);
                    console.log("WebGLCanvas available methods:", availableMethods.filter(m => essentialMethods.includes(m)));

                    // Check if WebGL context is available
                    if (this.ctx.gl) {
                        console.log("WebGL context available");
                    } else {
                        console.warn("WebGL context not available in WebGLCanvas");
                        this.useWebGL = false;
                        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
                        console.log("Falling back to Canvas 2D context");
                    }
                } else {
                    console.warn("WebGLCanvas constructor returned null/undefined");
                    this.useWebGL = false;
                    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
                    console.log("Falling back to Canvas 2D context");
                }
            } catch (error) {
                console.error("Failed to initialize WebGLCanvas:", error);
                console.error("Error stack:", error.stack);
                this.useWebGL = false;
                this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
                console.log("Falling back to Canvas 2D context due to error");
            }
        } else {
            if (this.useWebGL && !window.WebGLCanvas) {
                console.warn("WebGLCanvas not available - falling back to 2D context");
            }
            // Fallback to standard 2D context
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
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
            shake: { x: 0, y: 0, intensity: 0, duration: 0 },
            pixelScale: 1  // 1 = no scaling, 2 = 2x pixels, 3 = 3x pixels, etc.
        };

        this.viewportOriginalPosition = {
            width: 800,
            height: 600,
            x: 0,
            y: 0,
            zoom: 1,
            angle: 0, // Camera angle in degrees
            pixelScale: 1
        };

        this.renderConfig = {
            scaleMode: 'fit', // 'fit', 'stretch', 'pixel-perfect', 'nearest-neighbor'
            fullscreen: false,
            maintainAspectRatio: true,
            pixelPerfect: false,
            smoothing: false,
            // Add DPI awareness
            pixelRatio: window.devicePixelRatio || 1,
            // Add pixel scale option - this scales down the internal resolution
            usePixelScaling: true  // Enable to use pixelScale for retro rendering
        };

        this.contextPatch = patchContextForPixelPerfect(this.ctx, { pixelScale: this.viewport.pixelScale });

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

        if (options.makeGlobal) {
            window.engine = this; // Global reference for easy access
        }

        // Initialize MelodiCode if available
        if (window.MelodiCode) {
            this.melodicode = new window.MelodiCode();
        }

        // Initialize AssetManager integration
        this.setupAssetManager();

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
     * Setup AssetManager integration
     */
    setupAssetManager() {
        // Ensure AssetManager is available
        if (!window.assetManager) {
            console.warn('AssetManager not available, creating new instance...');
            window.assetManager = new AssetManager(window.fileBrowser || null);
        }

        // Store reference for easy access
        this.assetManager = window.assetManager;

        // Initialize assets on engine start if not already done
        if (this.assetManager && !this.assetManager.initialized) {
            // Initialize assets asynchronously
            setTimeout(() => {
                this.assetManager.initializeAssetsOnStart().then(() => {
                    console.log('Asset Pipeline ready for modules');
                }).catch(error => {
                    console.error('Failed to initialize Asset Pipeline:', error);
                });
            }, 100);
        }
    }

    /**
     * Get asset by name (simple API for modules)
     * @param {string} assetName - Asset name (e.g., "player.png", "music.mp3")
     * @returns {any} - The asset or null if not found
     */
    getAsset(assetName) {
        if (!this.assetManager) {
            console.warn('AssetManager not available');
            return null;
        }

        return this.assetManager.getAsset(assetName);
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

    getShadowCanvas() {
        return this.shadowCanvas.getContext('2d');
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

        // Recursive helper function to traverse all objects (including children)
        const traverse = (objects) => {
            objects.forEach(obj => {
                if (obj.name === name) {
                    const dx = obj.position.x - x;
                    const dy = obj.position.y - y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = obj;
                    }
                }
                // Recursively check children if they exist
                if (obj.children && obj.children.length > 0) {
                    traverse(obj.children);
                }
            });
        };

        // Start traversal from the top-level gameObjects
        traverse(this.gameObjects);

        return nearest;
    }

    findNearestObjectsByName(x, y, name, maxRange = Infinity) {
        let nearestObjects = [];

        // Recursive helper function to traverse all objects (including children)
        const traverse = (objects) => {
            objects.forEach(obj => {
                if (obj.name === name) {
                    const dx = obj.position.x - x;
                    const dy = obj.position.y - y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxRange) {
                        nearestObjects.push(obj);
                    }
                }
                // Recursively check children if they exist
                if (obj.children && obj.children.length > 0) {
                    traverse(obj.children);
                }
            });
        };

        // Start traversal from the top-level gameObjects
        traverse(this.gameObjects);

        if (nearestObjects.length > 0) {
            return nearestObjects;
        }

        //console.log(`Found ${nearestObjects.length} objects named "${name}" within range ${maxRange}`);

        return null;
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

    getObjectByID(id, objects = this.gameObjects) {
        for (const obj of objects) {
            if (obj.id === id) {
                return obj;
            }
            // Recursively search in children
            const found = this.getObjectByID(id, obj.children);
            if (found) return found;
        }
        return null;
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

        if (!this.paused) {
            // Update decal chunks for fading
            this.decalChunks.forEach(chunk => chunk.update(deltaTime));

            this.update(deltaTime);
        }

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

        // Update multiplayer
        if (this.multiplayer && this.enableMultiplayer) {
            this.multiplayer.update(deltaTime);
        }
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

        // WebGL rendering path
        if (this.useWebGL && this.ctx) {
            // WebGL context handles its own clearing and rendering
            if (this.ctx.clear) {
                this.ctx.clear();
            }

            // Get background color
            const fillColor = (this.scene && this.scene.settings && this.scene.settings.backgroundColor)
                ? this.scene.settings.backgroundColor
                : '#000000';

            // Set clear color if WebGL context supports it
            if (this.ctx.setClearColor) {
                this.ctx.setClearColor(fillColor);
            }

            // Apply viewport transformation for WebGL
            this.applyViewportTransformToContext(this.ctx);

            // Draw 3D cameras first
            this.draw3DCamerasToContext(this.ctx);

            // Draw all game objects
            const allObjects = this.getAllObjects(this.gameObjects);

            if (allObjects.length === 0) {
                // Note: Drawing text with WebGL context might not work the same way
                // This would need a proper text rendering implementation for WebGL
            } else {
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

            // Draw physics debug
            if (window.physicsManager && window.physicsManager.debugDraw) {
                window.physicsManager.drawDebug(this.ctx);
            }

            // Flush WebGL commands
            if (this.ctx.flush) {
                this.ctx.flush();
            }

            return;
        }

        // Canvas 2D rendering path
        // Determine which context to render to
        const renderCtx = this.useOffscreenRendering ? this.offscreenCtx : this.ctx;
        const renderCanvas = this.useOffscreenRendering ? this.offscreenCanvas : this.canvas;

        // Clear the render canvas
        renderCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);

        // Fill with background color
        const fillColor = (this.scene && this.scene.settings && this.scene.settings.backgroundColor)
            ? this.scene.settings.backgroundColor
            : '#000000';
        renderCtx.fillStyle = fillColor;
        renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

        // Clear auxiliary canvases
        if (this.backgroundCanvas) {
            const bgCtx = this.backgroundCanvas.getContext('2d');
            bgCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        }
        if (this.shadowCanvas) {
            const shadowCtx = this.shadowCanvas.getContext('2d');
            shadowCtx.clearRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);
        }
        if (this.guiCanvas) {
            const guiCtx = this.guiCanvas.getContext('2d');
            guiCtx.clearRect(0, 0, this.guiCanvas.width, this.guiCanvas.height);
        }
        if (this.decalCanvas) {
            const decalCtx = this.decalCanvas.getContext('2d');
            decalCtx.clearRect(0, 0, this.decalCanvas.width, this.decalCanvas.height);
        }

        // Apply viewport transformation
        renderCtx.save();

        // Apply camera transformations - but use renderCtx instead of this.ctx
        this.applyViewportTransformToContext(renderCtx);

        // Draw background canvas
        if (this.backgroundCanvas) {
            renderCtx.save();
            renderCtx.globalAlpha = 1.0;
            renderCtx.drawImage(this.backgroundCanvas, 0, 0);
            renderCtx.restore();
        }

        // Draw shadow canvas (after background, before main objects)
        if (this.shadowCanvas) {
            renderCtx.save();
            renderCtx.globalAlpha = 1.0;
            renderCtx.drawImage(this.shadowCanvas, 0, 0);
            renderCtx.restore();
        }

        // Draw decal chunks
        if (this.decalCanvas) {
            renderCtx.save();
            renderCtx.globalAlpha = 1.0;
            this.decalChunks.forEach(chunk => {
                if (chunk.isVisible(this.viewport)) {
                    renderCtx.save();
                    renderCtx.translate(chunk.x, chunk.y);
                    chunk.draw(renderCtx, this.viewport, this.debugDecals);
                    renderCtx.restore();
                }
            });
            renderCtx.restore();
        }

        // Draw 3D cameras first
        this.draw3DCamerasToContext(renderCtx);

        // Draw all game objects
        const allObjects = this.getAllObjects(this.gameObjects);

        if (allObjects.length === 0) {
            renderCtx.fillStyle = "#ffffff";
            renderCtx.font = "20px Arial";
            renderCtx.textAlign = "center";
            renderCtx.fillText("No objects in scene... What is a game without objects?",
                renderCanvas.width / 2, renderCanvas.height / 2);
        } else {
            allObjects
                .filter(obj => obj.active && obj.visible !== false)
                .sort((a, b) => b.depth - a.depth)
                .forEach(obj => {
                    try {
                        obj.draw(renderCtx);
                    } catch (error) {
                        console.error(`Error drawing object ${obj.name}:`, error);
                    }
                });
        }

        // Draw physics debug
        if (window.physicsManager && window.physicsManager.debugDraw) {
            window.physicsManager.drawDebug(renderCtx);
        }

        renderCtx.restore();

        // Draw paused overlay
        if (this.paused) {
            renderCtx.save();
            renderCtx.globalAlpha = 0.8;
            renderCtx.fillStyle = "#000000";
            renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
            renderCtx.globalAlpha = 1.0;
            renderCtx.fillStyle = "#ffffff";
            renderCtx.font = "10px Arial";
            renderCtx.fillText("Paused", 5, 15);
            renderCtx.restore();
        }

        // Draw GUI canvas (not affected by viewport)
        if (this.guiCanvas) {
            renderCtx.save();
            renderCtx.globalAlpha = 1.0;
            renderCtx.drawImage(this.guiCanvas, 0, 0);
            renderCtx.restore();
        }

        // If using offscreen rendering, now draw the offscreen canvas to the display canvas
        if (this.useOffscreenRendering && this.displayCtx) {
            this.displayCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Disable image smoothing for pixel-perfect rendering
            this.displayCtx.imageSmoothingEnabled = false;
            this.displayCtx.mozImageSmoothingEnabled = false;
            this.displayCtx.webkitImageSmoothingEnabled = false;
            this.displayCtx.msImageSmoothingEnabled = false;

            // Draw the offscreen canvas scaled to the display canvas
            this.displayCtx.drawImage(
                this.offscreenCanvas,
                0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height,
                0, 0, this.canvas.width, this.canvas.height
            );
        }

        if (this.ctx.flush) this.ctx.flush();
    }

    draw3DCamerasToContext(renderCtx) {
        if (!this.gameObjects) return;

        const activeCameras = [];

        const findActiveCameras = (objects) => {
            objects.forEach(obj => {
                if (obj.active !== false) {
                    const camera3D = obj.getModule("Camera3DRasterizer") || obj.getModule("Camera3D");
                    if (camera3D && camera3D.isActive && camera3D.getRenderedTexture) {
                        activeCameras.push(camera3D);
                    }

                    const wolfCamera = obj.getModule("Wolf3DCamera");
                    if (wolfCamera && wolfCamera.isActive && wolfCamera.getRenderedTexture) {
                        activeCameras.push(wolfCamera);
                    }

                    if (obj.children && obj.children.length > 0) {
                        findActiveCameras(obj.children);
                    }
                }
            });
        };

        findActiveCameras(this.gameObjects);

        const targetCanvas = this.useOffscreenRendering ? this.offscreenCanvas : this.canvas;

        activeCameras.forEach(camera => {
            try {
                if (!camera._isActive) return;

                const renderCanvas = camera.getRenderedTexture(false);
                if (!renderCanvas || renderCanvas.width === 0 || renderCanvas.height === 0) {
                    console.warn('3D camera render texture is not valid');
                    return;
                }

                const viewportWidth = camera.viewportWidth || 800;
                const viewportHeight = camera.viewportHeight || 600;

                const scaleX = targetCanvas.width / viewportWidth;
                const scaleY = targetCanvas.height / viewportHeight;
                const scale = Math.min(scaleX, scaleY);

                const drawWidth = viewportWidth * scale;
                const drawHeight = viewportHeight * scale;
                const drawX = (targetCanvas.width - drawWidth) / 2;
                const drawY = (targetCanvas.height - drawHeight) / 2;

                renderCtx.imageSmoothingEnabled = camera._renderTextureSmoothing !== false;
                renderCtx.drawImage(renderCanvas, drawX, drawY, drawWidth, drawHeight);
            } catch (error) {
                console.error('Error drawing 3D camera:', error);
            }
        });
    }

    // Update the old method to use the new one
    draw3DCameras() {
        this.draw3DCamerasToContext(this.ctx);
    }

    // Helper method to create shader program for textured quads
    createTexturedQuadShader(gl) {
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoord;

            void main() {
                gl_FragColor = texture2D(u_texture, v_texCoord);
            }
        `;

        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
            return null;
        }

        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
            return null;
        }

        // Link program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader program linking error:', gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    create3DCameraShader() {
        if (!this.ctx.addShader) {
            console.error('WebGLCanvas does not have addShader method');
            return;
        }

        const vertexShader = `
        precision mediump float;
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        uniform vec2 u_resolution;
        varying vec2 v_texCoord;

        void main() {
            // Convert from pixel coordinates to clip space (-1 to 1)
            vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
            clipSpace.y = -clipSpace.y;

            gl_Position = vec4(clipSpace, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

        const fragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_texCoord;

        void main() {
            gl_FragColor = texture2D(u_texture, v_texCoord);
        }
    `;

        try {
            this.ctx.addShader('camera3D', vertexShader, fragmentShader);
            console.log('Camera3D shader created successfully');
        } catch (error) {
            console.error('Failed to create Camera3D shader:', error);
        }
    }

    /**
     * Calculate the current canvas scale (ratio of canvas pixels to viewport units)
     * This accounts for both the viewport dimensions and pixel scale
     * @returns {number} - The scale factor
     */
    getCanvasScale() {
        // Get the internal resolution (accounting for pixel scale)
        const internalResolution = this.getInternalResolution();
        const internalWidth = internalResolution.width;
        const internalHeight = internalResolution.height;

        // Calculate scale as ratio of internal resolution to viewport dimensions
        const scaleX = internalWidth / this.viewport.width;
        const scaleY = internalHeight / this.viewport.height;

        // Return the average scale (both should be equal if aspect ratio is maintained)
        return (scaleX + scaleY) / 2;
    }

    /**
     * Get the pixel scale factor that includes zoom
     * This is the actual multiplier from world space to canvas pixels
     * @returns {number} - The effective pixel scale
     */
    getEffectivePixelScale() {
        // Only return pixelScale if usePixelScaling is enabled
        // This quantizes transforms without scaling the viewport resolution
        if (this.renderConfig.usePixelScaling) {
            return this.viewport.pixelScale || 1;
        }
        return 1;
    }

    /**
     * Round a value to the nearest pixel at the current scale
     * This ensures values align to actual canvas pixels
     * @param {number} value - The value to round (in world space)
     * @returns {number} - The pixel-aligned value (in world space)
     */
    roundToPixel(value) {
        const scale = this.getEffectivePixelScale();
        const zoom = this.viewport.zoom || 1;
        if (scale === 0) return value;
        // IMPROVED: Account for zoom when rounding
        const effectiveScale = scale * zoom;
        return Math.round(value * effectiveScale) / effectiveScale;
    }

    /**
     * Round X and Y coordinates to pixel boundaries
     * @param {number} x - X coordinate in world space
     * @param {number} y - Y coordinate in world space
     * @returns {{x: number, y: number}} - Pixel-aligned coordinates
     */
    roundPositionToPixel(x, y) {
        const scale = this.getEffectivePixelScale();
        const zoom = this.viewport.zoom || 1;
        if (scale === 0) return { x, y };
        // IMPROVED: Account for zoom and use smoother rounding
        const effectiveScale = scale * zoom;
        return {
            x: Math.round(x * effectiveScale) / effectiveScale,
            y: Math.round(y * effectiveScale) / effectiveScale
        };
    }

    /**
     * Round a size value to ensure it covers full pixels (no fractional pixels)
     * @param {number} size - The size value in world space
     * @returns {number} - The pixel-aligned size
     */
    roundSizeToPixel(size) {
        const scale = this.getEffectivePixelScale();
        const zoom = this.viewport.zoom || 1;
        if (scale === 0 || size === 0) return size;
        // IMPROVED: Account for zoom when rounding sizes
        const effectiveScale = scale * zoom;
        // Use ceil to ensure full pixel coverage (prevents gaps)
        return Math.ceil(Math.abs(size) * effectiveScale) / effectiveScale * Math.sign(size);
    }

    /**
     * Get pixel-perfect position for drawing, considering zoom and canvas scale
     * This ensures no gaps between tiles at any zoom level or pixel scale
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate  
     * @returns {{x: number, y: number}} - Pixel-perfect screen coordinates
     */
    getPixelPerfectPosition(worldX, worldY) {
        return this.roundPositionToPixel(worldX, worldY);
    }

    /**
     * Get pixel-perfect size for drawing
     * @param {number} size - The size value
     * @returns {number} - Pixel-perfect size
     */
    getPixelPerfectSize(size) {
        return this.roundSizeToPixel(size);
    }

    /**
     * Round a rectangle to pixel boundaries
     * Ensures the rectangle starts and ends on pixel boundaries
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    roundRectToPixel(x, y, width, height) {
        const scale = this.getEffectivePixelScale();
        if (scale === 0) return { x, y, width, height };

        // Round position to pixel boundary
        const x1 = Math.round(x * scale) / scale;
        const y1 = Math.round(y * scale) / scale;

        // Calculate end position and round it
        const x2 = Math.round((x + width) * scale) / scale;
        const y2 = Math.round((y + height) * scale) / scale;

        // Width and height are the difference (ensures exact pixel coverage)
        return {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1
        };
    }

    /**
     * Draw an image with pixel-perfect positioning
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Image|Canvas} image - Image to draw
     * @param {number} x - X position in world space
     * @param {number} y - Y position in world space
     * @param {number} width - Width in world space
     * @param {number} height - Height in world space
     */
    drawImagePixelPerfect(ctx, image, x, y, width, height) {
        const rect = this.roundRectToPixel(x, y, width, height);
        ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    }

    /**
     * Draw a filled rectangle with pixel-perfect positioning
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position in world space
     * @param {number} y - Y position in world space
     * @param {number} width - Width in world space
     * @param {number} height - Height in world space
     */
    fillRectPixelPerfect(ctx, x, y, width, height) {
        const rect = this.roundRectToPixel(x, y, width, height);
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    /**
     * Draw a stroked rectangle with pixel-perfect positioning
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position in world space
     * @param {number} y - Y position in world space
     * @param {number} width - Width in world space
     * @param {number} height - Height in world space
     */
    strokeRectPixelPerfect(ctx, x, y, width, height) {
        const rect = this.roundRectToPixel(x, y, width, height);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    /**
     * Begin a path at a pixel-perfect position
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position in world space
     * @param {number} y - Y position in world space
     */
    moveToPixelPerfect(ctx, x, y) {
        const pos = this.roundPositionToPixel(x, y);
        ctx.moveTo(pos.x, pos.y);
    }

    /**
     * Draw a line to a pixel-perfect position
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position in world space
     * @param {number} y - Y position in world space
     */
    lineToPixelPerfect(ctx, x, y) {
        const pos = this.roundPositionToPixel(x, y);
        ctx.lineTo(pos.x, pos.y);
    }

    applyViewportTransformToContext(ctx) {
        // Use viewport dimensions directly (no internal resolution scaling)
        const centerX = this.viewport.width / 2;
        const centerY = this.viewport.height / 2;
        const zoom = this.viewport.zoom || 1;
        const pixelScale = this.getEffectivePixelScale();

        // Calculate world-space offset
        const viewportX = this.viewport.x;
        const viewportY = this.viewport.y;
        const shakeX = this.viewport.shake ? this.viewport.shake.x : 0;
        const shakeY = this.viewport.shake ? this.viewport.shake.y : 0;

        // Step 1: Translate to center
        // FIXED: Don't round center - keep it precise for proper viewport centering
        ctx.translate(centerX, centerY);

        // Step 2: Apply rotation if needed
        if (this.viewport.angle && this.viewport.angle !== 0) {
            const radians = this.viewport.angle * Math.PI / 180;
            ctx.rotate(radians);
        }

        // Step 3: Apply zoom
        // FIXED: Don't quantize zoom - apply it directly for smooth scaling
        if (zoom !== 1) {
            ctx.scale(zoom, zoom);
        }

        // Step 4: Calculate offset in world space
        const offsetX = -centerX - viewportX + shakeX;
        const offsetY = -centerY - viewportY + shakeY;

        // FIXED: Pixel snapping should happen at the final draw call, not here
        // This allows smooth camera movement without jitter
        if (pixelScale > 1 && this.renderConfig.usePixelScaling) {
            // For pixel art: snap to world-space grid that aligns with screen pixels
            // after zoom is applied
            const worldPixelSize = 1 / (pixelScale * zoom);
            const snappedX = Math.round(offsetX / worldPixelSize) * worldPixelSize;
            const snappedY = Math.round(offsetY / worldPixelSize) * worldPixelSize;
            ctx.translate(snappedX, snappedY);
        } else {
            // For smooth rendering: use exact sub-pixel positioning
            ctx.translate(offsetX, offsetY);
        }
    }

    /*applyViewportTransformToContext(ctx) {
        const centerX = this.viewport.width / 2;
        const centerY = this.viewport.height / 2;
        const zoom = this.viewport.zoom || 1;

        // Calculate world-space offset
        const viewportX = this.viewport.x;
        const viewportY = this.viewport.y;
        const shakeX = this.viewport.shake ? this.viewport.shake.x : 0;
        const shakeY = this.viewport.shake ? this.viewport.shake.y : 0;

        // Step 1: Translate to center
        ctx.translate(centerX, centerY);

        // Step 2: Apply rotation if needed
        if (this.viewport.angle && this.viewport.angle !== 0) {
            const radians = this.viewport.angle * Math.PI / 180;
            ctx.rotate(radians);
        }

        // Step 3: Apply zoom
        if (zoom !== 1) {
            ctx.scale(zoom, zoom);
        }

        // Step 4: Calculate and apply offset
        // Round to integers for pixel-perfect positioning
        const offsetX = Math.floor(-centerX - viewportX + shakeX);
        const offsetY = Math.floor(-centerY - viewportY + shakeY);

        ctx.translate(offsetX, offsetY);
    }*/

    applyViewportTransform() {
        this.applyViewportTransformToContext(this.ctx);
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
            this.viewport.pixelScale = Math.max(1, Math.floor(scene.settings.pixelScale || 1));

            // Enable pixel scaling if scale > 1
            if (this.viewport.pixelScale > 1) {
                this.renderConfig.usePixelScaling = true;
            }
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
            gameObject.id =
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

    /**
     * Set the pixel scale for retro/pixel art rendering
     * @param {number} scale - Pixel scale (1 = no scaling, 2 = 2x pixels, etc.)
     */
    setPixelScale(scale) {
        scale = Math.max(1, Math.floor(scale)); // Ensure integer >= 1
        if (this.viewport.pixelScale !== scale) {
            this.viewport.pixelScale = scale;
            this.renderConfig.usePixelScaling = scale > 1;
            this.viewport.dirty = true;

            // Update the context patch with the new pixel scale
            if (this.contextPatch && this.contextPatch.updatePixelScale) {
                this.contextPatch.updatePixelScale(scale);
            }

            this.resizeCanvas();
            console.log(`Pixel scale set to ${scale}x`);
        }
    }

    /**
     * Get the current pixel scale
     * @returns {number} Current pixel scale
     */
    getPixelScale() {
        return this.viewport.pixelScale || 1;
    }

    /**
     * Get the effective rendering resolution (accounting for pixel scale)
     * @returns {{width: number, height: number}}
     */
    getInternalResolution() {
        return {
            width: this.viewport.width,
            height: this.viewport.height
        };
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const container = this.canvas.parentElement;
        if (!container) return;

        container.offsetHeight;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        if (containerWidth <= 0 || containerHeight <= 0) {
            return;
        }

        const viewportWidth = this.viewport.width || 800;
        const viewportHeight = this.viewport.height || 600;
        const aspectRatio = viewportWidth / viewportHeight;

        let physicalWidth, physicalHeight;

        if (this.renderConfig.fullscreen) {
            if (this.renderConfig.maintainAspectRatio) {
                const containerRatio = containerWidth / containerHeight;

                if (containerRatio > aspectRatio) {
                    physicalHeight = containerHeight;
                    physicalWidth = containerHeight * aspectRatio;
                } else {
                    physicalWidth = containerWidth;
                    physicalHeight = containerWidth / aspectRatio;
                }
            } else {
                physicalWidth = containerWidth;
                physicalHeight = containerHeight;
            }
        } else {
            const scale = Math.min(
                containerWidth / viewportWidth,
                containerHeight / viewportHeight
            );

            physicalWidth = viewportWidth * scale;
            physicalHeight = viewportHeight * scale;
        }

        physicalWidth = Math.max(1, Math.floor(physicalWidth));
        physicalHeight = Math.max(1, Math.floor(physicalHeight));

        const left = Math.floor((containerWidth - physicalWidth) / 2);
        const top = Math.floor((containerHeight - physicalHeight) / 2);

        // Set display canvas styles - this is the CSS size that will be scaled up
        this.canvas.style.width = `${physicalWidth}px`;
        this.canvas.style.height = `${physicalHeight}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `${left}px`;
        this.canvas.style.top = `${top}px`;
        this.canvas.style.minWidth = '0';
        this.canvas.style.minHeight = '0';
        this.canvas.style.maxWidth = 'none';
        this.canvas.style.maxHeight = 'none';

        // CHANGED: Canvas resolution always matches viewport dimensions
        // Pixel scale only affects transform snapping, not viewport resolution
        const canvasWidth = viewportWidth;
        const canvasHeight = viewportHeight;

        // CRITICAL: For pixel-perfect rendering, disable smoothing
        if (this.useOffscreenRendering && !this.useWebGL) {
            // Set offscreen canvas to viewport resolution
            this.offscreenCanvas.width = canvasWidth;
            this.offscreenCanvas.height = canvasHeight;

            // CRITICAL: Re-disable smoothing after canvas resize (resize resets context)
            this.offscreenCtx.imageSmoothingEnabled = false;
            this.offscreenCtx.mozImageSmoothingEnabled = false;
            this.offscreenCtx.webkitImageSmoothingEnabled = false;
            this.offscreenCtx.msImageSmoothingEnabled = false;

            // Set display canvas to match viewport dimensions
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;

            // Configure display canvas for pixel-perfect scaling (only if displayCtx exists)
            if (this.displayCtx) {
                this.displayCtx.imageSmoothingEnabled = false;
                this.displayCtx.mozImageSmoothingEnabled = false;
                this.displayCtx.webkitImageSmoothingEnabled = false;
                this.displayCtx.msImageSmoothingEnabled = false;
            }

            // Force pixel-perfect CSS rendering if pixel scaling is enabled
            if (this.renderConfig.usePixelScaling) {
                this.canvas.style.imageRendering = 'pixelated';
                this.canvas.style.imageRendering = '-moz-crisp-edges';
                this.canvas.style.imageRendering = 'crisp-edges';
            }
        } else if (!this.useWebGL) {
            // For direct rendering: canvas resolution = viewport resolution
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;

            this.ctx.setTransform(1, 0, 0, 1, 0, 0);

            // Disable smoothing for pixel-perfect rendering (only for 2D context)
            if (this.ctx && typeof this.ctx.imageSmoothingEnabled !== 'undefined') {
                this.ctx.imageSmoothingEnabled = false;
                this.ctx.mozImageSmoothingEnabled = false;
                this.ctx.webkitImageSmoothingEnabled = false;
                this.ctx.msImageSmoothingEnabled = false;
            }

            // Force pixel-perfect CSS rendering if pixel scaling is enabled
            if (this.renderConfig.usePixelScaling) {
                this.canvas.style.imageRendering = 'pixelated';
                this.canvas.style.imageRendering = '-moz-crisp-edges';
                this.canvas.style.imageRendering = 'crisp-edges';
            }
        }

        // Update auxiliary canvas sizes to match internal resolution
        if (this.guiCanvas) {
            this.guiCanvas.width = canvasWidth;
            this.guiCanvas.height = canvasHeight;
        }
        if (this.backgroundCanvas) {
            this.backgroundCanvas.width = canvasWidth;
            this.backgroundCanvas.height = canvasHeight;
        }
        if (this.decalCanvas) {
            this.decalCanvas.width = canvasWidth;
            this.decalCanvas.height = canvasHeight;
        }

        this.canvas.style.transform = 'none';

        if (this.useWebGL && this.ctx.resize) {
            this.ctx.resize(canvasWidth, canvasHeight);
            return;
        }

        this.canvasResized = true;
        this.viewport.dirty = true;
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

/**
 * Patch a CanvasRenderingContext2D so drawing commands snap to the nearest canvas pixel.
 * This is canvas-resolution-aware (uses canvas.width/height, not devicePixelRatio).
 *
 * Returns an object with a `restore()` method and `updatePixelScale(newScale)` method.
 *
 * Options:
 *  - pixelScale: number (multiplier for rounding granularity, e.g., engine's pixelScale)
 *  - methods: array of method names to patch (optional)
 */
function patchContextForPixelPerfect(ctx, options = {}) {
    if (!ctx || !ctx.canvas) {
        console.warn('patchContextForPixelPerfect: invalid context');
        return { restore: () => { }, updatePixelScale: () => { } };
    }

    // Prevent double-patching
    if (ctx.__pixelPerfectPatched) return ctx.__pixelPerfectRestore;

    const canvas = ctx.canvas;
    let pixelScale = options.pixelScale ?? 1;
    const epsilon = 1e-10; // Add epsilon for floating point precision

    // Save originals
    const orig = {};
    const methodsToPatch = options.methods ?? [
        'fillRect', 'strokeRect', 'clearRect',
        'drawImage',
        'fillText', 'strokeText',
        'rect',
        'moveTo', 'lineTo',
        'bezierCurveTo', 'quadraticCurveTo',
    ];

    methodsToPatch.forEach((name) => {
        if (typeof ctx[name] === 'function') orig[name] = ctx[name].bind(ctx);
    });

    // Helper: transform point to canvas bitmap space, round with pixelScale, then back to user space
    function snapPoint(x, y) {
        const m = ctx.getTransform();

        // Transform to canvas bitmap coordinates
        const cx = m.a * x + m.c * y + m.e;
        const cy = m.b * x + m.d * y + m.f;

        // Round to nearest canvas pixel, accounting for pixelScale
        // FIXED: Add epsilon to prevent floating point errors
        const rcx = Math.round(cx / pixelScale + epsilon) * pixelScale;
        const rcy = Math.round(cy / pixelScale + epsilon) * pixelScale;

        // Transform back to user space
        const inv = m.inverse();
        const nx = inv.a * rcx + inv.c * rcy + inv.e;
        const ny = inv.b * rcx + inv.d * rcy + inv.f;
        return { x: nx, y: ny };
    }

    // Snap rectangle corners independently to preserve pixel alignment
    function snapRect(x, y, w, h) {
        const p1 = snapPoint(x, y);
        const p2 = snapPoint(x + w, y + h);
        return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
    }

    // Wrap rect operations
    if (orig.fillRect) {
        ctx.fillRect = function (x, y, w, h) {
            const r = snapRect(x, y, w, h);
            return orig.fillRect(r.x, r.y, r.w, r.h);
        };
    }
    if (orig.strokeRect) {
        ctx.strokeRect = function (x, y, w, h) {
            const r = snapRect(x, y, w, h);
            return orig.strokeRect(r.x, r.y, r.w, r.h);
        };
    }
    if (orig.clearRect) {
        ctx.clearRect = function (x, y, w, h) {
            const r = snapRect(x, y, w, h);
            return orig.clearRect(r.x, r.y, r.w, r.h);
        };
    }

    // Wrap text
    if (orig.fillText) {
        ctx.fillText = function (text, x, y, maxWidth) {
            const p = snapPoint(x, y);
            if (arguments.length === 3) return orig.fillText(text, p.x, p.y);
            return orig.fillText(text, p.x, p.y, maxWidth);
        };
    }
    if (orig.strokeText) {
        ctx.strokeText = function (text, x, y, maxWidth) {
            const p = snapPoint(x, y);
            if (arguments.length === 3) return orig.strokeText(text, p.x, p.y);
            return orig.strokeText(text, p.x, p.y, maxWidth);
        };
    }

    // Wrap drawImage (common overloads)
    if (orig.drawImage) {
        ctx.drawImage = function (...args) {
            if (args.length === 3) {
                // (image, dx, dy)
                const p = snapPoint(args[1], args[2]);
                return orig.drawImage(args[0], p.x, p.y);
            } else if (args.length === 5) {
                // (image, dx, dy, dw, dh)
                const { x, y, w, h } = snapRect(args[1], args[2], args[3], args[4]);
                return orig.drawImage(args[0], x, y, w, h);
            } else if (args.length === 9) {
                // (image, sx, sy, sw, sh, dx, dy, dw, dh)
                const { x: dx, y: dy, w: dw, h: dh } = snapRect(args[5], args[6], args[7], args[8]);
                return orig.drawImage(args[0], args[1], args[2], args[3], args[4], dx, dy, dw, dh);
            } else {
                return orig.drawImage.apply(ctx, args);
            }
        };
    }

    // Wrap path commands
    if (orig.rect) {
        ctx.rect = function (x, y, w, h) {
            const r = snapRect(x, y, w, h);
            return orig.rect(r.x, r.y, r.w, r.h);
        };
    }
    if (orig.moveTo) {
        ctx.moveTo = function (x, y) {
            const p = snapPoint(x, y);
            return orig.moveTo(p.x, p.y);
        };
    }
    if (orig.lineTo) {
        ctx.lineTo = function (x, y) {
            const p = snapPoint(x, y);
            return orig.lineTo(p.x, p.y);
        };
    }
    if (orig.bezierCurveTo) {
        ctx.bezierCurveTo = function (cp1x, cp1y, cp2x, cp2y, x, y) {
            const p1 = snapPoint(cp1x, cp1y);
            const p2 = snapPoint(cp2x, cp2y);
            const p3 = snapPoint(x, y);
            return orig.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        };
    }
    if (orig.quadraticCurveTo) {
        ctx.quadraticCurveTo = function (cpx, cpy, x, y) {
            const p1 = snapPoint(cpx, cpy);
            const p2 = snapPoint(x, y);
            return orig.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
        };
    }

    // Store restore function
    function restore() {
        Object.keys(orig).forEach((name) => {
            ctx[name] = orig[name];
        });
        delete ctx.__pixelPerfectPatched;
        delete ctx.__pixelPerfectRestore;
    }

    // Update pixelScale dynamically
    function updatePixelScale(newScale) {
        pixelScale = newScale ?? 1;
    }

    ctx.__pixelPerfectPatched = true;
    ctx.__pixelPerfectRestore = { restore, updatePixelScale };

    return { restore, updatePixelScale };
}

/**
 * Restore a patched context to its original methods.
 */
function restoreContext(ctx) {
    if (ctx && ctx.__pixelPerfectRestore) ctx.__pixelPerfectRestore.restore();
}

/**
 * Update the pixelScale on an already-patched context.
 */
function updateContextPixelScale(ctx, newScale) {
    if (ctx && ctx.__pixelPerfectRestore) ctx.__pixelPerfectRestore.updatePixelScale(newScale);
}

window.Engine = Engine; // Make available globally