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

        this.refreshModules();
    
        if (!this.preloaded) {
            await this.preload();
        }
        
        // Call start on all game objects
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active) {
                // Fix: Call the object's start method first
                if (obj.start) {
                    obj.start();
                }
                
                // Then call each module's start method
                /*obj.modules.forEach(module => {
                    if (module.enabled && module.start) {
                        try {
                            // Make sure the gameObject reference is properly set
                            if (!module.gameObject) module.gameObject = obj;
                            
                            // Call start() with no arguments
                            module.start();
                        } catch (error) {
                            console.error(`Error starting module ${module.type || module.constructor.name} on ${obj.name}:`, error);
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
        
        // Switch to game tab if we have a DOM reference
        const gameTab = document.querySelector('[data-canvas="game"]');
        if (gameTab) {
            gameTab.click();
        }
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
                        module.onDestroy(obj);
                    }
                });
            }
        });
        
        // Switch back to editor tab
        const editorTab = document.querySelector('[data-canvas="editor"]');
        if (editorTab) {
            editorTab.click();
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
            // Create a new GameObject with the same name
            const clonedObj = new GameObject(obj.name);
            
            // Copy basic properties
            clonedObj.id = crypto.randomUUID(); // Generate a new unique ID
            clonedObj.position = new Vector2(obj.position.x, obj.position.y);
            clonedObj.scale = new Vector2(obj.scale.x, obj.scale.y);
            clonedObj.angle = obj.angle;
            clonedObj.depth = obj.depth;
            clonedObj.active = obj.active;
            clonedObj.visible = obj.visible !== false; // Ensure visible is true unless explicitly false
            clonedObj.tags = [...obj.tags];
            clonedObj.editorColor = obj.editorColor;
            
            // Clone modules properly
            if (obj.modules && obj.modules.length > 0) {
                clonedObj.modules = [];
                
                for (const module of obj.modules) {
                    try {
                        // Use module's clone method if available
                        if (typeof module.clone === 'function') {
                            const clonedModule = module.clone();
                            clonedModule.gameObject = clonedObj; // Set the correct gameObject reference
                            clonedObj.modules.push(clonedModule);
                            continue;
                        } 
                        
                        // Create a new instance of the same module type
                        if (module.constructor) {
                            // Get module constructor name or use the module type
                            const constructorName = module.constructor.name || module.type;
                            
                            // Try to get the class from the window object
                            const ModuleClass = window[constructorName];
                            
                            if (ModuleClass) {
                                console.log(`Cloning module ${constructorName}`);
                                
                                // Create a new module instance
                                let newModule;
                                
                                // Special handling for SpriteRenderer which needs imageSrc
                                if (constructorName === 'SpriteRenderer' && module.imageSrc) {
                                    newModule = new ModuleClass(module.imageSrc);
                                } else {
                                    newModule = new ModuleClass();
                                }
                                
                                // Copy important properties
                                newModule.gameObject = clonedObj;
                                newModule.enabled = module.enabled !== false; // Ensure enabled is true unless explicitly false
                                newModule.id = crypto.randomUUID(); // New ID
                                
                                // Copy all other properties if module has them
                                for (const prop in module) {
                                    // Skip functions, gameObject reference, and already copied properties
                                    if (prop === 'gameObject' || prop === 'id' || prop === 'enabled' || 
                                        prop === 'constructor' || typeof module[prop] === 'function') {
                                        continue;
                                    }
                                    
                                    try {
                                        if (module[prop] !== undefined) {
                                            // Handle Vector2 objects
                                            if (module[prop] instanceof Vector2) {
                                                newModule[prop] = new Vector2(module[prop].x, module[prop].y);
                                            }
                                            // Handle image objects
                                            else if (prop === 'image' && module[prop]) {
                                                // Images will be reloaded in preload()
                                            } 
                                            // Handle simple objects and primitives
                                            else {
                                                newModule[prop] = JSON.parse(JSON.stringify(module[prop]));
                                            }
                                        }
                                    } catch (err) {
                                        console.warn(`Could not clone property ${prop} on module ${constructorName}:`, err);
                                    }
                                }
                                
                                clonedObj.modules.push(newModule);
                            } else {
                                console.error(`Module class ${constructorName} not found`);
                            }
                        }
                    } catch (error) {
                        console.error(`Error cloning module on ${obj.name}:`, error);
                    }
                }
            }
            
            // Handle children
            if (obj.children && obj.children.length > 0) {
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
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Store physical canvas dimensions
        let physicalWidth, physicalHeight;
        
        // Get the desired viewport dimensions from scene settings
        const viewportWidth = this.scene?.settings?.viewportWidth || 800;
        const viewportHeight = this.scene?.settings?.viewportHeight || 600;
        
        // Handle different scaling modes
        if (this.renderConfig.fullscreen) {
            // In fullscreen mode, use the container dimensions
            physicalWidth = containerWidth;
            physicalHeight = containerHeight;
            
            // Set canvas size based on scaling mode
            if (this.renderConfig.maintainAspectRatio && this.renderConfig.scaleMode === 'fit') {
                // Calculate scaling to maintain aspect ratio while fitting
                const scale = Math.min(
                    containerWidth / viewportWidth,
                    containerHeight / viewportHeight
                );
                
                this.canvas.style.width = `${viewportWidth * scale}px`;
                this.canvas.style.height = `${viewportHeight * scale}px`;
                this.canvas.style.marginTop = `${(containerHeight - viewportHeight * scale) / 2}px`;
                this.canvas.style.marginLeft = `${(containerWidth - viewportWidth * scale) / 2}px`;
            } else {
                // Stretch to fill container
                this.canvas.style.width = '100%';
                this.canvas.style.height = '100%';
                this.canvas.style.margin = '0';
            }
        } else {
            // Use defined viewport dimensions
            physicalWidth = viewportWidth;
            physicalHeight = viewportHeight;
            
            // Reset any styling
            this.canvas.style.width = `${viewportWidth}px`;
            this.canvas.style.height = `${viewportHeight}px`;
            this.canvas.style.margin = 'auto';
        }
        
        // Set the canvas dimensions based on pixel-perfect setting
        if (this.renderConfig.pixelPerfect) {
            // For pixel-perfect rendering, use viewport dimensions for drawing surface
            this.canvas.width = viewportWidth;
            this.canvas.height = viewportHeight;
        } else {
            // Otherwise use physical dimensions
            this.canvas.width = physicalWidth;
            this.canvas.height = physicalHeight;
        }
        
        // Configure image smoothing
        this.ctx.imageSmoothingEnabled = this.renderConfig.smoothing;
        
        // Apply appropriate CSS image rendering mode
        if (this.renderConfig.scaleMode === 'nearest-neighbor') {
            this.canvas.style.imageRendering = 'pixelated';
        } else {
            this.canvas.style.imageRendering = this.renderConfig.smoothing ? 'auto' : 'crisp-edges';
        }
        
        this.canvasResized = true;
    }
}