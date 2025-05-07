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
        
        // Add reference to the editor
        this.editor = null;
        
        // Track if canvas was resized
        this.canvasResized = true;
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

        if (!this.preloaded) {
            await this.preload();
        }
        
        // Call start on all game objects
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active && obj.modules) {
                obj.modules.forEach(module => {
                    if (module.enabled && module.start) {
                        module.start(obj);
                    }
                });
            }
        });
        
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
        
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

    gameLoop(timestamp) {
        if (!this.running) return;
        
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap at 100ms to prevent large jumps
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        // Begin loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active && obj.modules) {
                if (obj.beginLoop) obj.beginLoop();
                
                obj.modules.forEach(module => {
                    if (module.enabled && module.beginLoop) {
                        module.beginLoop(deltaTime, obj);
                    }
                });
            }
        });
        
        // Main loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active && obj.modules) {
                if (obj.loop) obj.loop(deltaTime);
                
                obj.modules.forEach(module => {
                    if (module.enabled && module.loop) {
                        module.loop(deltaTime, obj);
                    }
                });
            }
        });
        
        // End loop phase
        this.traverseGameObjects(this.gameObjects, obj => {
            if (obj.active && obj.modules) {
                if (obj.endLoop) obj.endLoop();
                
                obj.modules.forEach(module => {
                    if (module.enabled && module.endLoop) {
                        module.endLoop(deltaTime, obj);
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
        
        // Apply viewport scaling and centering if needed
        if (this.canvasResized && this.scene && this.scene.settings) {
            // Get actual viewport dimensions
            const viewportWidth = this.scene.settings.viewportWidth;
            const viewportHeight = this.scene.settings.viewportHeight;
            
            // Calculate scaling to fit viewport to canvas
            const canvasRatio = this.canvas.width / this.canvas.height;
            const viewportRatio = viewportWidth / viewportHeight;
            
            let scale, offsetX = 0, offsetY = 0;
            
            if (canvasRatio > viewportRatio) {
                // Canvas is wider than viewport
                scale = this.canvas.height / viewportHeight;
                offsetX = (this.canvas.width - viewportWidth * scale) / 2;
            } else {
                // Canvas is taller than viewport
                scale = this.canvas.width / viewportWidth;
                offsetY = (this.canvas.height - viewportHeight * scale) / 2;
            }
            
            this.ctx.translate(offsetX, offsetY);
            this.ctx.scale(scale, scale);
            
            // Store viewport transform for later use
            this.viewTransform = { offsetX, offsetY, scale };
            this.canvasResized = false;
            
            // Log that we've resized
            console.log(`Game canvas resized: ${this.canvas.width}x${this.canvas.height}, scale: ${scale}`);
        }
        
        // Adjust for viewport position
        if (this.scene && this.scene.settings) {
            this.ctx.translate(-this.scene.settings.viewportX || 0, -this.scene.settings.viewportY || 0);
        }
        
        // Draw all game objects, sorted by depth
        const allObjects = this.getAllObjects(this.gameObjects);
        
        // Log the number of objects being drawn
        console.log(`Drawing ${allObjects.length} game objects`);
        
        if (allObjects.length === 0) {
            // If no objects, draw a placeholder message
            this.ctx.save();
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = "20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("No objects in scene", this.viewport.width / 2, this.viewport.height / 2);
            this.ctx.restore();
        } else {
            allObjects.sort((a, b) => a.depth - b.depth).forEach(obj => {
                if (obj.active && obj.visible) {
                    try {
                        // Get world transform
                        const worldPos = obj.getWorldPosition();
                        const worldAngle = obj.getWorldRotation ? obj.getWorldRotation() : obj.angle;
                        const worldScale = obj.getWorldScale ? obj.getWorldScale() : obj.scale;
                        
                        this.ctx.save();
                        this.ctx.translate(worldPos.x, worldPos.y);
                        this.ctx.rotate(worldAngle * Math.PI / 180);
                        
                        if (typeof worldScale === 'object') {
                            this.ctx.scale(worldScale.x, worldScale.y);
                        }
                        
                        // Draw the object itself (fallback for objects without modules)
                        if (obj.draw) {
                            obj.draw(this.ctx);
                        }
                        
                        // Draw all modules
                        if (obj.modules && obj.modules.length > 0) {
                            obj.modules.forEach(module => {
                                if (module && module.enabled && module.draw) {
                                    module.draw(this.ctx, obj);
                                }
                            });
                        } else {
                            // No modules, draw a placeholder
                            this.ctx.fillStyle = obj.editorColor || "#4CAF50";
                            this.ctx.beginPath();
                            this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                        
                        this.ctx.restore();
                    } catch (err) {
                        console.error(`Error drawing object ${obj.name}:`, err);
                    }
                }
            });
        }
        
        this.ctx.restore();
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
            // Use GameObject's clone method
            const clonedObj = obj.clone();
            
            // Handle children separately since clone might not clone children correctly
            if (obj.children && obj.children.length > 0) {
                const clonedChildren = this.cloneGameObjects(obj.children);
                clonedChildren.forEach(child => {
                    // Update parent reference
                    child.parent = clonedObj;
                });
                clonedObj.children = clonedChildren;
            }
            
            return clonedObj;
        });
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.canvasResized = true;
    }
}