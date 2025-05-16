class Engine {
    constructor(canvas) {
        this.canvas = canvas;
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
            y: 0
        };

        this.renderConfig = {
            scaleMode: 'fit', // 'fit', 'stretch', 'pixel-perfect', 'nearest-neighbor'
            fullscreen: false,
            maintainAspectRatio: true,
            pixelPerfect: false,
            smoothing: true    // Image smoothing
        };
        
        // Add reference to the editor
        this.editor = null;
        
        // Track if canvas was resized
        this.canvasResized = true;

        // Set the input manager reference to this engine
        if (window.input) {
            window.input.setEngine(this);
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

    updateRenderConfig(settings) {
        // Update settings
        Object.assign(this.renderConfig, settings);
        
        // Force canvas resize to apply new settings
        this.resizeCanvas();
    }

    async preload() {
        console.log("Preloading game objects...");
        const preloadPromises = [];
        
        // Traverse all game objects and collect preload promises
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.modules) {
                obj.modules.forEach(module => {
                    if (module.preload) {
                        preloadPromises.push(module.preload(obj));
                    }
                });
            }
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

    async start() {
        if (!this.scene) {
            console.error('No scene loaded');
            return;
        }
    
        console.log("Starting game...");
    
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
        
        // Draw all game objects, sorted by depth
        const allObjects = this.getAllObjects(this.gameObjects);
        
        // Make sure we actually have objects to draw
        if (allObjects.length === 0) {
            // If no objects, draw a placeholder message
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = "20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("No objects in scene", this.canvas.width / 2, this.canvas.height / 2);
        } else {
            // Debug: Log objects being drawn
            //console.log(`Drawing ${allObjects.length} objects`);
            
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
    }
    
    applyViewportTransform() {
        if (!this.scene || !this.scene.settings) return;
        
        const settings = this.scene.settings;
        
        // Apply viewport offset
        if (settings.viewportX || settings.viewportY) {
            this.ctx.translate(-settings.viewportX || 0, -settings.viewportY || 0);
        }
        
        // Apply camera zoom if available
        if (settings.cameraZoom) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(settings.cameraZoom, settings.cameraZoom);
            this.ctx.translate(-centerX, -centerY);
        }
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
        
        // Copy viewport settings
        if (scene.settings) {
            this.viewport.width = scene.settings.viewportWidth;
            this.viewport.height = scene.settings.viewportHeight;
            this.viewport.x = scene.settings.viewportX || 0;
            this.viewport.y = scene.settings.viewportY || 0;
        }
        
        // Deep clone the game objects to avoid modifying editor objects
        this.gameObjects = this.cloneGameObjects(scene.gameObjects);
        
        this.preloaded = false;
        this.canvasResized = true;
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
            console.warn('Container has invalid dimensions:', containerWidth, containerHeight);
            return;
        }
        
        // Get the desired viewport dimensions from scene settings
        const viewportWidth = this.scene?.settings?.viewportWidth || 800;
        const viewportHeight = this.scene?.settings?.viewportHeight || 600;
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
        
        // IMPORTANT: Always use the viewport dimensions for the drawing surface
        this.canvas.width = viewportWidth;
        this.canvas.height = viewportHeight;
        
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
        
        // Debug info
        console.log(`Canvas resized: ${this.canvas.width}x${this.canvas.height} (physical display: ${physicalWidth}x${physicalHeight})`);
    }
    
    cleanup() {
        // Clean up resources when engine is destroyed
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        window.removeEventListener('resize', this.resizeCanvas);
        window.removeEventListener('panel-resized', this.resizeCanvas);
    }
}