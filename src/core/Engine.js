class Engine {
    constructor(canvas) {
        this.canvas = canvas;

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

        this.ctx = canvas.getContext('2d');
        this.scene = null;
        this.gameObjects = [];
        this.lastTime = 0;
        this.running = false;
        this.preloaded = false;

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
        }

        if (!window.viewport) {
            window.viewport = this.viewport;
        }

        window.engine = this; // Global reference for easy access

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
    }

    // Add viewport management methods
    initializeViewport() {
        // Ensure viewport is properly initialized
        this.viewport.dirty = true;
        this.updateViewport();
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
        if (!this.scene) {
            console.error('No scene loaded');
            return;
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
                obj.modules.forEach(module => {
                    if (module.enabled && module.start) {
                        try {
                            module.start();
                        } catch (error) {
                            console.error(`Error starting module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });
            }
        });

        // Initialize touch controls
        this.initTouchControls();

        this.running = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
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
        cancelAnimationFrame(this.animationFrameId);

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

        // Reset physics after calling onDestroy to properly restore positions
        if (window.physicsManager) {
            window.physicsManager.reset();
        }

        // Sync positions back to editor if available
        if (window.editor && window.editor.activeScene) {
            // Refresh the editor canvas to show restored positions
            window.editor.refreshCanvas();
        }
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

    gameLoop(timestamp) {
        if (!this.running) return;

        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap at 100ms to prevent large jumps
        this.lastTime = timestamp;

        // Update input manager at the start of the frame
        if (window.input) {
            window.input.beginFrame();
        }

        // Update viewport if dirty
        if (this.viewport.dirty) {
            this.updateViewport();
        }

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
                obj.modules.forEach(module => {
                    if (module.enabled && module.beginLoop) {
                        try {
                            // Only pass deltaTime parameter, not the object reference
                            module.beginLoop(deltaTime);
                        } catch (error) {
                            console.error(`Error in beginLoop for module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });
            }
        });

        // Update collision system
        if (window.collisionSystem) {
            // Get all active objects
            const allObjects = this.getAllObjects(this.gameObjects).filter(obj => obj.active);

            // Update collision detection
            window.collisionSystem.update(allObjects);
        }

        // Main loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active) {
                // Call object's loop method
                if (obj.loop) obj.loop(deltaTime);

                // Call modules' loop methods
                obj.modules.forEach(module => {
                    if (module.enabled && module.loop) {
                        try {
                            // Only pass deltaTime parameter, not the object reference
                            module.loop(deltaTime);
                        } catch (error) {
                            console.error(`Error in loop for module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });
            }
        });

        // End loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active) {
                // Call object's endLoop method
                if (obj.endLoop) obj.endLoop(deltaTime);

                // Call modules' endLoop methods
                obj.modules.forEach(module => {
                    if (module.enabled && module.endLoop) {
                        try {
                            // Only pass deltaTime parameter, not the object reference
                            module.endLoop(deltaTime);
                        } catch (error) {
                            console.error(`Error in endLoop for module ${module.type || module.constructor.name}:`, error);
                        }
                    }
                });
            }
        });
    }

    draw() {
        if (!this.canvas || !this.ctx || !this.running) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
                .sort((a, b) => a.depth - b.depth)
                .forEach(obj => {
                    try {
                        obj.draw(this.ctx);
                    } catch (error) {
                        console.error(`Error drawing object ${obj.name}:`, error);
                    }
                });
        }

        this.ctx.restore();

        // Draw GUI canvas AFTER restoring transform (GUI should not be affected by viewport)
        if (this.guiCanvas) {
            this.ctx.save();
            this.ctx.globalAlpha = 1.0;
            this.ctx.drawImage(this.guiCanvas, 0, 0);
            this.ctx.restore();
        }
    }

    applyViewportTransform() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Apply viewport transformations in the correct order

        // 1. Translate to center for zoom and rotation
        this.ctx.translate(centerX, centerY);

        // 2. Apply rotation
        if (this.viewport.angle && this.viewport.angle !== 0) {
            const radians = this.viewport.angle * Math.PI / 180;
            this.ctx.rotate(radians);
        }

        // 3. Apply zoom
        if (this.viewport.zoom && this.viewport.zoom !== 1) {
            this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
        }

        // 4. Translate back and apply position offset + shake
        this.ctx.translate(
            -centerX - this.viewport.x + this.viewport.shake.x,
            -centerY - this.viewport.y + this.viewport.shake.y
        );
    }

    getAllObjects(objects) {
        let result = [];
        objects.forEach(obj => {
            result.push(obj);
            if (obj.children && obj.children.length) {
                result = result.concat(this.getAllObjects(obj.children));
            }
        });
        return result;
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

        // Copy viewport settings and validate them
        if (scene.settings) {
            this.viewport.width = Math.max(1, scene.settings.viewportWidth || 800);
            this.viewport.height = Math.max(1, scene.settings.viewportHeight || 600);
            this.viewport.x = scene.settings.viewportX || 0;
            this.viewport.y = scene.settings.viewportY || 0;
            this.viewport.zoom = Math.max(0.1, scene.settings.viewportZoom || 1);
            this.viewport.angle = scene.settings.viewportAngle || 0;
        }

        // Mark viewport as dirty to force update
        this.viewport.dirty = true;

        // Deep clone only in editor. In exported/runtime builds, use objects as-built
        // so embedded assets (like SpriteRenderer.imageData) are preserved.
        if (window.editor) {
            this.gameObjects = this.cloneGameObjects(scene.gameObjects);
        } else {
            this.gameObjects = scene.gameObjects;
        }

        this.preloaded = false;
        this.canvasResized = true;

        // Force canvas resize with new viewport settings
        this.resizeCanvas();
    }

    /**
     * Instantiate a prefab by name at a specific position
     * @param {string} prefabName - Name of the prefab to instantiate
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {GameObject} parent - Optional parent GameObject
     * @returns {GameObject|null} The instantiated GameObject or null if prefab not found
     */
    instantiatePrefab(prefabName, x = 0, y = 0, parent = null) {
        // Check if we're in the editor
        if (window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
            const position = new Vector2(x, y);
            return window.editor.hierarchy.prefabManager.instantiatePrefabByName(prefabName, position, parent);
        }

        // Check if we're in an exported game
        if (window.prefabManager) {
            const position = { x: x, y: y };
            return window.prefabManager.instantiatePrefabByName(prefabName, position, parent);
        }

        console.error('No prefab manager available');
        return null;
    }

    /**
     * Check if a prefab exists by name
     * @param {string} prefabName - Name of the prefab to check
     * @returns {boolean} True if the prefab exists
     */
    hasPrefab(prefabName) {
        // Check if we're in the editor
        if (window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
            return window.editor.hierarchy.prefabManager.hasPrefab(prefabName);
        }

        // Check if we're in an exported game
        if (window.prefabManager) {
            return window.prefabManager.hasPrefab(prefabName);
        }

        return false;
    }

    /**
     * Get all available prefab names
     * @returns {Array<string>} Array of prefab names
     */
    getAvailablePrefabs() {
        // Check if we're in the editor
        if (window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
            return window.editor.hierarchy.prefabManager.getAvailablePrefabs();
        }

        // Check if we're in an exported game
        if (window.prefabManager) {
            return window.prefabManager.getAllPrefabNames();
        }

        return [];
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

    cloneGameObjects(objects) {
        return objects.map(obj => {
            // Use the GameObject's built-in clone method
            const clonedObj = obj.clone();

            // Handle the cloning of children separately to maintain proper hierarchy
            if (obj.children && obj.children.length > 0) {
                // Remove any existing children that were cloned
                clonedObj.children = [];

                // Clone all children recursively and add them properly
                const clonedChildren = this.cloneGameObjects(obj.children);
                clonedChildren.forEach(child => {
                    clonedObj.addChild(child);
                });
            }

            return clonedObj;
        });
    }

    initTouchControls() {
        if (!this.canvas) return;

        // Prevent default touch actions on the canvas
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();

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
            e.preventDefault();

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
            e.preventDefault();

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

        // Apply pixel ratio for high-DPI displays
        const pixelRatio = this.renderConfig.pixelRatio;

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

        // Scale the context for high-DPI displays
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

        this.canvasResized = true;
        this.viewport.dirty = true; // Mark viewport as dirty after resize
    }

    cleanup() {
        // Clean up resources when engine is destroyed
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        window.removeEventListener('resize', this.resizeCanvas);
        window.removeEventListener('panel-resized', this.resizeCanvas);

        // Clear viewport callbacks
        this.viewportCallbacks = [];
    }
}