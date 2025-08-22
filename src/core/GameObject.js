class GameObject {
    constructor(name = "GameObject") {
        this.name = name;
        this.position = new Vector2();
        this.size = new Vector2(32, 32); // Default size in pixels for collision detection
        this.origin = new Vector2(0.5, 0.5); // Centered by default
        this.scale = new Vector2(1, 1);
        this.angle = 0;
        this.depth = 0;
        this.visible = true;
        this.modules = [];
        this.children = [];
        this.parent = null;
        this.active = true;
        this.tags = [];
        this.selected = false; // Track if selected in editor
        this.expanded = false; // Track if expanded in hierarchy
        this.editorColor = this.generateRandomColor(); // Color in editor view
        this.id = crypto.randomUUID(); // Generate unique ID

        this.xd = 0; // X Position for drawing (for viewport offsets)
        this.yd = 0; // Y Position for drawing (for viewport offsets)

        this.collisionEnabled = true;  // Flag to enable/disable collision
        this.collisionLayer = 0;       // Collision layer for filtering
        this.collisionMask = 0xFFFF;   // Collision mask for filtering

        // Keep track of original position and rotation
        this.originalPosition = this.position.clone();
        this.originalRotation = this.angle;

        this.previousPosition = this.position.clone(); // For movement tracking
    }

    generateRandomColor() {
        // Generate a semi-bright color for better visibility on dark backgrounds
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 60%)`;
    }

    // Track original position (useful when cloning)
    getOriginalPosition() {
        return this.originalPosition || this.position.clone();
    }

    async preload() {
        for (const module of this.modules) {
            if (module.enabled && module.preload) await module.preload();
        }
        for (const child of this.children) {
            await child.preload();
        }
    }

    start() {
        if (!this.active) return;
        // Save initial position and rotation when the game starts
        this.originalPosition = this.position.clone();
        this.originalRotation = this.angle;

        // Initialize modules and children
        this.modules.forEach(module => {
            if (module.enabled && module.start) module.start();
        });
        this.children.forEach(child => child.start());
    }

    beginLoop() {
        if (!this.active) return;

        this.previousPosition = this.position.clone(); // For movement tracking

        this.modules.forEach(module => {
            if (module.enabled && module.beginLoop) module.beginLoop();
        });
        this.children.forEach(child => child.beginLoop());
    }

    loop(deltaTime) {
        if (!this.active) return;
        this.modules.forEach(module => {
            if (module.enabled && module.loop) module.loop(deltaTime);
        });
        this.children.forEach(child => child.loop(deltaTime));
    }

    endLoop() {
        if (!this.active) return;
        this.modules.forEach(module => {
            if (module.enabled && module.endLoop) module.endLoop();
        });
        this.children.forEach(child => child.endLoop());
    }

    /**
     * Draw this GameObject and its modules during runtime
     * @param {CanvasRenderingContext2D} ctx - The rendering context
     */
    draw(ctx) {
        if (!this.active || !this.visible) return;
        
        ctx.save();
        
        // Apply local transform
        const worldPos = this.getWorldPosition();
        const worldAngle = this.getWorldRotation();
        const worldScale = this.getWorldScale();

        // Calculate xd and yd relative to viewport/camera
        /*let camera = this.engine?.viewport || window.viewport;
        if (camera) {
            // Adjust for camera position and zoom
            this.xd = (worldPos.x - camera.position.x) * (camera.zoom || 1);
            this.yd = (worldPos.y - camera.position.y) * (camera.zoom || 1);
        } else {
            // Fallback: use world position directly
            this.xd = worldPos.x;
            this.yd = worldPos.y;
        }*/

        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(worldAngle * Math.PI / 180);
        ctx.scale(worldScale.x, worldScale.y);
        
        // Track if any module actually drew something
        let moduleDidDraw = false;
        
        // Always draw the fallback shape first to ensure object visibility
        //this.drawFallbackShape(ctx);
        
        // Draw modules
        for (const module of this.modules) {
            if (module.enabled && typeof module.draw === 'function') {
                try {
                    module.draw(ctx);
                    moduleDidDraw = true;
                } catch (error) {
                    console.error(`Error in module ${module.type || module.constructor.name} draw on ${this.name}:`, error);
                }
            }
        }
        
        ctx.restore();
        
        // Draw all children
        this.children.forEach(child => {
            if (child.active && child.visible) {
                child.draw(ctx);
            }
        });
    }

    /**
     * Draw representation of this GameObject in the editor
     * @param {CanvasRenderingContext2D} ctx - The rendering context
     */
    drawInEditor(ctx) {
        if (!this.active) return;
        
        // Draw this object
        ctx.save();
        
        // Apply transformations
        const worldPos = this.getWorldPosition();
        const worldAngle = this.getWorldRotation();
        const worldScale = this.getWorldScale();
        
        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(worldAngle * Math.PI / 180);
        ctx.scale(worldScale.x, worldScale.y);
        
        // Check if any module has a draw method and can be drawn in editor
        let moduleDidDraw = false;
        
        // Draw modules that support rendering
        for (const module of this.modules) {
            // Check for modules that should draw in editor
            if (module.enabled && typeof module.draw === 'function') {
                try {
                    // Instead of trying to analyze the function code, let's use a pattern
                    // where modules can explicitly indicate if they should be drawn in editor
                    
                    // Option 1: Check for module.drawInEditor flag
                    if (module.drawInEditor === false) {
                        continue;
                    }
                    
                    // Option 2: Use a canvas measuring approach - detect if anything was drawn
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 100;
                    tempCanvas.height = 100;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Clear the temp canvas and save its state
                    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                    tempCtx.save();
                    tempCtx.translate(50, 50); // Center for drawing
                    
                    // Get image data before drawing
                    const beforeData = tempCtx.getImageData(0, 0, 100, 100).data;
                    
                    // Try to draw
                    module.draw(tempCtx);
                    
                    // Get image data after drawing
                    const afterData = tempCtx.getImageData(0, 0, 100, 100).data;
                    
                    // Check if anything changed
                    let hasDrawnSomething = false;
                    for (let i = 0; i < beforeData.length; i += 4) {
                        if (beforeData[i] !== afterData[i] || 
                            beforeData[i+1] !== afterData[i+1] || 
                            beforeData[i+2] !== afterData[i+2] || 
                            beforeData[i+3] !== afterData[i+3]) {
                            hasDrawnSomething = true;
                            break;
                        }
                    }
                    
                    // Restore temp context
                    tempCtx.restore();
                    
                    if (!hasDrawnSomething) {
                        continue; // Module's draw didn't change anything visually
                    }
                    
                    // Now we know the module actually draws something, so use it in the main context
                    module.draw(ctx);
                    moduleDidDraw = true;
                } catch (error) {
                    console.error(`Error drawing module ${module.type || module.constructor.name} in editor:`, error);
                }
            }
        }
        
        // If no module drew anything, draw the default representation
        if (!moduleDidDraw) {
            // Draw square representation
            const size = 20; // Base size
            ctx.beginPath();
            ctx.rect(-size/2, -size/2, size, size);
            ctx.fillStyle = this.selected ? '#ffffff' : this.editorColor;
            ctx.fill();
            
            // Draw origin point
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0000';
            ctx.fill();
        }
        
        // Always draw the angle indicator line for better orientation
        const size = 20; // Base size for consistency with default representation
        const lineLength = size * 1.5; // Length of the line - 1.5x the size
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(lineLength, 0);
        ctx.strokeStyle = '#ffcc00'; // Distinct yellow color for angle line
        ctx.lineWidth = 2 / (this.editor?.camera?.zoom || 1);
        ctx.stroke();
        
        // Add arrowhead to angle line
        ctx.beginPath();
        ctx.moveTo(lineLength, 0);
        ctx.lineTo(lineLength - 5, -3);
        ctx.lineTo(lineLength - 5, 3);
        ctx.closePath();
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
        
        // Draw selection outline if selected
        if (this.selected) {
            // Draw either around the module bounds or the default square
            if (moduleDidDraw) {
                // Draw a slightly larger selection outline
                ctx.strokeStyle = '#00aaff';
                ctx.lineWidth = 2 / (this.editor?.camera?.zoom || 1);
                // A slightly larger rectangle than the typical module would draw
                // This is an approximation - ideally modules would report their bounds
                ctx.strokeRect(-size/2, -size/2, size, size);
            } else {
                ctx.strokeStyle = '#00aaff';
                ctx.lineWidth = 2 / (this.editor?.camera?.zoom || 1);
                ctx.strokeRect(-size/2, -size/2, size, size);
            }
        }
        
        ctx.restore();
        
        // Draw name (always upright)
        if (this.selected) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(this.name, worldPos.x, worldPos.y - 25);
        }
        
        // Draw children
        this.children.forEach(child => {
            if (child.active) {
                child.drawInEditor(ctx);
            }
        });
    }

    /**
     * Get the bounding box of this GameObject in world coordinates
     * @returns {Object} The bounding box with x, y, width, height properties
     */
    getBoundingBox() {
        const worldPos = this.getWorldPosition();
        const worldScale = this.getWorldScale();
        const worldAngle = this.getWorldRotation();
        
        // Calculate the effective width and height
        const effectiveWidth = this.width * worldScale.x;
        const effectiveHeight = this.height * worldScale.y;
        
        // If there's no rotation, return a simple axis-aligned box
        if (worldAngle % 360 === 0) {
            return {
                x: worldPos.x - effectiveWidth / 2,
                y: worldPos.y - effectiveHeight / 2,
                width: effectiveWidth,
                height: effectiveHeight,
                rotation: 0
            };
        }
        
        // For rotated objects, return an oriented bounding box
        return {
            x: worldPos.x,
            y: worldPos.y,
            width: effectiveWidth,
            height: effectiveHeight,
            rotation: worldAngle
        };
    }

    /**
     * Draw a simple shape to represent the GameObject when no modules are drawing
     * @param {CanvasRenderingContext2D} ctx - The rendering context
     */
    drawFallbackShape(ctx) {
        // Draw circle representation
        const size = 10;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fillStyle = this.editorColor || '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    onDestroy() {
        this.modules.forEach(module => {
            if (module.onDestroy) module.onDestroy();
        });
        this.children.forEach(child => child.onDestroy());
    }

    /**
     * Check collision with any nearby GameObjects of a given name within a set range
     * @param {string} name - The name of GameObjects to check against
     * @param {number} range - The range (in pixels) to search for nearby objects
     * @param {Array<GameObject>} [gameObjects] - Optional array of all game objects to search (defaults to window.gameObjects)
     * @returns {GameObject|null} The first colliding GameObject found, or null if none
     */
    collidesWithNearby(name, range, gameObjects) {
        // Use global gameObjects array if not provided
        const allObjects = gameObjects || window.gameObjects || [];
        const myPos = this.getWorldPosition();

        for (const obj of allObjects) {
            if (
                obj !== this &&
                obj.name === name &&
                obj.active &&
                obj.visible &&
                obj.collisionEnabled
            ) {
                // Quick distance check
                const objPos = obj.getWorldPosition();
                const dx = objPos.x - myPos.x;
                const dy = objPos.y - myPos.y;
                if ((dx * dx + dy * dy) <= range * range) {
                    // Check collision
                    if (this.collidesWith(obj)) {
                        return obj;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Check if this GameObject collides with another GameObject
     * @param {GameObject} other - The other GameObject to check collision with
     * @returns {boolean} True if colliding
     */
    collidesWith(other) {
        // Skip collision check if either object has collisions disabled
        if (!this.collisionEnabled || !other.collisionEnabled) {
            return false;
        }
        
        // Skip collision check if collision layers don't match
        if ((this.collisionLayer & other.collisionMask) === 0 && 
            (other.collisionLayer & this.collisionMask) === 0) {
            return false;
        }
        
        // Get bounding boxes
        const thisBox = this.getBoundingBox();
        const otherBox = other.getBoundingBox();
        
        // Check for collision using the CollisionSystem
        return window.collisionSystem.checkCollision(thisBox, otherBox);
    }

    /**
     * Set collision layer and mask
     * @param {number} layer - The collision layer this object belongs to
     * @param {number} mask - Bitmask of layers this object should collide with
     */
    setCollision(layer, mask = 0xFFFF) {
        this.collisionLayer = layer;
        this.collisionMask = mask;
    }

    /**
     * Enable or disable collision for this GameObject
     * @param {boolean} enabled - Whether collision should be enabled
     */
    setCollisionEnabled(enabled) {
        this.collisionEnabled = enabled;
    }

    /**
     * Add a module to this GameObject
     * @param {Module} module - The module to add
     * @returns {Module} The added module
     */
    addModule(module) {
        if (!module) return null;
    
        // Check if this type of module is already attached
        const cls = module.constructor;
        if (cls.allowMultiple === false) {
            const already = this.getModuleByType(cls.name);
            if (already) {
                console.warn(`Only one ${cls.name} allowed on a GameObject.`);
                return already;
            }
        }
    
        // Generate a unique ID for the module if it doesn't have one
        if (!module.id) {
            module.id = crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
    
        // Add required modules first
        const requirements = module.getRequirements ? module.getRequirements() : [];
        for (const requiredName of requirements) {
            // Check if we already have this module
            const existingReq = this.getModuleByType(requiredName);
            if (!existingReq) {
                console.log(`Adding required module: ${requiredName} for ${module.constructor.name}`);
                
                // Try to get the module class
                let ModuleClass = null;
                
                // First try to get from registry
                if (window.moduleRegistry) {
                    ModuleClass = window.moduleRegistry.getModuleClass(requiredName);
                }
                
                // Fall back to global scope
                if (!ModuleClass && window[requiredName]) {
                    ModuleClass = window[requiredName];
                }
                
                if (ModuleClass) {
                    // Create a new instance and add it
                    const requiredModule = new ModuleClass();
                    this.addModule(requiredModule); // Recursive to handle nested requirements
                } else {
                    console.warn(`Required module ${requiredName} not found`);
                }
            }
        }
    
        // Set the gameObject reference
        module.gameObject = this;
        
        // Add to modules array
        this.modules.push(module);
        
        // Call onAttach
        if (typeof module.onAttach === 'function') {
            module.onAttach(this);
        }
        
        return module;
    }

    /**
     * Check for and add required modules
     * @param {Module} module - The module to check requirements for
     * @private
     */
    addRequiredModules(module) {
        // Get the requirements
        const requirements = module.getRequirements ? module.getRequirements() : [];
        
        // Process each requirement
        for (const requiredName of requirements) {
            // Check if we already have this required module
            const existing = this.getModuleByType(requiredName);
            
            if (!existing) {
                console.log(`Module ${module.constructor.name} requires ${requiredName}, adding it automatically`);
                
                // Find the module class from registry or global scope
                let ModuleClass = null;
                
                // Try to get from registry first
                if (window.moduleRegistry) {
                    ModuleClass = window.moduleRegistry.getModuleClass(requiredName);
                }
                
                // Fall back to global namespace
                if (!ModuleClass && window[requiredName]) {
                    ModuleClass = window[requiredName];
                }
                
                if (ModuleClass) {
                    // Create and add the required module
                    const requiredModule = new ModuleClass();
                    
                    // Check if this required module itself has requirements
                    this.addRequiredModules(requiredModule);
                    
                    // Add the module normally
                    requiredModule.gameObject = this;
                    requiredModule.id = crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    this.modules.push(requiredModule);
                    
                    // Call onAttach
                    if (typeof requiredModule.onAttach === 'function') {
                        requiredModule.onAttach(this);
                    }
                } else {
                    console.warn(`Required module ${requiredName} not found, cannot add automatically`);
                }
            }
        }
    }

    /**
     * Get a module by type
     * @param {class} moduleType - The class/type of module to find
     * @returns {Module} The found module or null
     */
    getModule(moduleType) {
        // Handle module type as string
        if (typeof moduleType === 'string') {
            return this.modules.find(module => 
                module.constructor.name === moduleType || 
                module.type === moduleType
            );
        }
        
        // Handle module type as class
        if (typeof moduleType === 'function') {
            return this.modules.find(module => module instanceof moduleType);
        }
        
        // If moduleType is neither string nor function, return null
        return null;
    }

    /**
     * Reorder modules based on an array of module IDs
     * @param {Array<string>} moduleIds - Ordered array of module IDs
     */
    reorderModules(moduleIds) {
        if (!moduleIds || !moduleIds.length) return;
        
        // Create a new ordered modules array
        const orderedModules = [];
        
        // First add modules in the specified order
        for (const moduleId of moduleIds) {
            const module = this.getModuleById(moduleId);
            if (module) {
                orderedModules.push(module);
            }
        }
        
        // Add any remaining modules that weren't in the moduleIds array
        for (const module of this.modules) {
            if (!orderedModules.includes(module)) {
                orderedModules.push(module);
            }
        }
        
        // Replace the modules array with the ordered one
        this.modules = orderedModules;
    }

    /**
     * Get a module by type name
     * @param {string} typeName - The name of the module type to find
     * @returns {Module} The found module or null
     */
    getModuleByType(typeName) {
        return this.modules.find(module => 
            module.constructor.name === typeName || 
            module.type === typeName
        );
    }

    /**
     * Get a module by its ID
     * @param {string} id - The module ID
     * @returns {Module|null} The found module or null
     */
    getModuleById(id) {
        return this.modules.find(module => module.id === id) || null;
    }

    /**
     * Remove a module by reference
     * @param {Module} module - The module to remove
     * @returns {boolean} True if the module was removed
     */
    removeModule(module) {
        const index = this.modules.indexOf(module);
        if (index !== -1) {
            module.gameObject = null;
            this.modules.splice(index, 1);
            if (module.onDestroy) module.onDestroy();
            return true;
        }
        return false;
    }

    /**
     * Remove a module by type
     * @param {class} moduleType - The class/type of module to remove
     * @returns {boolean} True if a module was removed
     */
    removeModuleByType(moduleType) {
        const module = this.getModule(moduleType);
        if (module) {
            return this.removeModule(module);
        }
        return false;
    }

    /**
     * Add a child GameObject
     * @param {GameObject} child - The child to add
     * @returns {GameObject} The added child
     */
    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        return child;
    }

    /**
     * Remove a child GameObject
     * @param {GameObject} child - The child to remove
     * @returns {boolean} True if the child was removed
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            return true;
        }
        return false;
    }

    /**
     * Set the active state of this GameObject
     * @param {boolean} value - Whether the GameObject should be active
     */
    setActive(value) {
        this.active = value;
    }

    /**
     * Toggle the active state of this GameObject
     */
    toggleActive() {
        this.active = !this.active;
    }

    /**
     * Add a tag to this GameObject
     * @param {string} tag - The tag to add
     */
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }

    /**
     * Check if this GameObject has a specific tag
     * @param {string} tag - The tag to check for
     * @returns {boolean} True if the GameObject has the tag
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * Remove a tag from this GameObject
     * @param {string} tag - The tag to remove
     */
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index !== -1) {
            this.tags.splice(index, 1);
        }
    }

    /**
     * Get the world position of this GameObject
     * @returns {Vector2} The world position
     */
    getWorldPositionOriginal() {
        let worldPos = this.position.clone();
        if (this.parent) {
            const parentWorldPos = this.parent.getWorldPosition();
            worldPos = worldPos.rotate(this.parent.angle * Math.PI / 180);
            worldPos = worldPos.add(parentWorldPos);
        }
        return worldPos;
    }

    getWorldPosition() {
        let worldPos = this.position.clone();
        let currentParent = this.parent;
        let totalAngle = 0;

        // Accumulate rotation from all ancestors
        while (currentParent) {
            totalAngle += currentParent.angle;
            currentParent = currentParent.parent;
        }

        // Rotate local position by total ancestor angle
        worldPos = worldPos.rotate(totalAngle * Math.PI / 180);

        // Add world position of topmost parent (if any)
        if (this.parent) {
            worldPos = worldPos.add(this.parent.getWorldPosition());
        }

        return worldPos;
    }

    /**
     * Convert a world position to local space
     * @param {Vector2} worldPosition - Position in world space
     * @returns {Vector2} Position in local space
     */
    worldToLocalPosition(worldPosition) {
        if (!this.parent) return worldPosition.subtract(this.position);
        
        const parentWorldPos = this.parent.getWorldPosition();
        let localToParent = worldPosition.subtract(parentWorldPos);
        localToParent = localToParent.rotate(-this.parent.angle * Math.PI / 180);
        return localToParent.subtract(this.position);
    }
    
    /**
     * Find a child by name (including deep search through children)
     * @param {string} name - The name of the GameObject to find
     * @param {boolean} deep - Whether to search recursively through all children
     * @returns {GameObject|null} The found GameObject or null
     */
    findChild(name, deep = true) {
        // First, check direct children
        for (const child of this.children) {
            if (child.name === name) return child;
        }
        
        // If not found and deep search is enabled, search in children's children
        if (deep) {
            for (const child of this.children) {
                const found = child.findChild(name, true);
                if (found) return found;
            }
        }
        
        return null;
    }

    /**
     * Set the selection state of this GameObject
     * @param {boolean} selected - Whether the GameObject is selected
     */
    setSelected(selected) {
        this.selected = selected;
    }
    
    /**
     * Rename this GameObject
     * @param {string} newName - The new name
     */
    rename(newName) {
        this.name = newName;
    }

    getWorldRotation() {
        let rotation = this.angle;
        let currentParent = this.parent;
        
        while (currentParent) {
            rotation += currentParent.angle;
            currentParent = currentParent.parent;
        }
        
        return rotation;
    }
    
    getWorldScale() {
        let scale = this.scale.clone();
        let currentParent = this.parent;
        
        while (currentParent) {
            scale.x *= currentParent.scale.x;
            scale.y *= currentParent.scale.y;
            currentParent = currentParent.parent;
        }
        
        return scale;
    }
    
    /**
     * Serialize this GameObject to JSON
     * @returns {Object} Serialized GameObject data
     */
    toJSON() {
        return {
            id: this.id, // Include the ID for reference
            name: this.name,
            position: { x: this.position.x, y: this.position.y },
            scale: { x: this.scale.x, y: this.scale.y }, // Add scale
            size: { width: this.size.x, height: this.size.y },
            angle: this.angle,
            depth: this.depth,
            active: this.active,
            editorColor: this.editorColor,
            visible: this.visible, // Add visible property
            tags: [...this.tags],
            collisionEnabled: this.collisionEnabled,
            collisionLayer: this.collisionLayer,
            collisionMask: this.collisionMask,
            modules: this.modules.map(module => ({
                type: module.constructor.name,
                id: module.id,
                data: module.toJSON ? module.toJSON() : {}
            })),
            children: this.children.map(child => child.toJSON())
        };
    }
    
    /**
     * Create a GameObject from serialized data
     * @param {Object} json - Serialized GameObject data
     * @returns {GameObject} The created GameObject
     */
    static fromJSON(json) {
        const obj = new GameObject(json.name);
        // Restore ID if available
        if (json.id) obj.id = json.id;
        
        obj.position = new Vector2(json.position.x, json.position.y);
        obj.size = new Vector2(json.size.width, json.size.height);
        // Restore scale if available
        if (json.scale) obj.scale = new Vector2(json.scale.x, json.scale.y);
        
        obj.angle = json.angle;
        obj.depth = json.depth;
        obj.active = json.active;
        if (json.visible !== undefined) obj.visible = json.visible;
        obj.tags = [...json.tags];
    
        if (json.collisionEnabled !== undefined) obj.collisionEnabled = json.collisionEnabled;
        if (json.collisionLayer !== undefined) obj.collisionLayer = json.collisionLayer;
        if (json.collisionMask !== undefined) obj.collisionMask = json.collisionMask;
        
        // Add modules - with improved module class lookup
        if (json.modules && Array.isArray(json.modules)) {
            json.modules.forEach(moduleData => {
                // Try to get the module class from registry or window
                const moduleTypeName = moduleData.type;
                let ModuleClass = null;
                
                // Try module registry first
                if (window.moduleRegistry) {
                    ModuleClass = window.moduleRegistry.getModuleClass(moduleTypeName);
                }
                
                // Fall back to global scope with various naming conventions
                if (!ModuleClass) {
                    // Try PascalCase (standard naming convention)
                    if (window[moduleTypeName]) {
                        ModuleClass = window[moduleTypeName];
                    }
                    // If not found, try other possible variations to be more robust
                    else if (moduleTypeName) {
                        // Try camelCase variation
                        const camelCase = moduleTypeName.charAt(0).toLowerCase() + moduleTypeName.slice(1);
                        if (window[camelCase]) {
                            ModuleClass = window[camelCase];
                        }
                        // Try capitalized version
                        const capitalized = moduleTypeName.charAt(0).toUpperCase() + moduleTypeName.slice(1);
                        if (window[capitalized]) {
                            ModuleClass = window[capitalized];
                        }
                    }
                }
                
                if (ModuleClass) {
                    try {
                        // Create the module instance
                        const module = new ModuleClass();
                        
                        // Restore the module's ID and type
                        if (moduleData.id) module.id = moduleData.id;
                        module.type = moduleTypeName; // Explicitly set type to what was saved
                        
                        // Initialize from saved data if module has fromJSON method
                        if (moduleData.data && typeof module.fromJSON === 'function') {
                            module.fromJSON(moduleData.data);
                        } else if (moduleData.exposedValues) {
                            // Fall back to copying exposed values if no specific fromJSON method
                            for (const key in moduleData.exposedValues) {
                                if (key in module) {
                                    module[key] = moduleData.exposedValues[key];
                                }
                            }
                        }
                        
                        // Add module to game object
                        obj.addModule(module);
                        
                    } catch (error) {
                        console.error(`Error restoring module ${moduleTypeName}:`, error);
                        // Create a placeholder module to preserve data
                        createPlaceholderModule(obj, moduleData, moduleTypeName);
                    }
                } else {
                    console.warn(`Module class ${moduleTypeName} not found when restoring game object.`);
                    // Create a placeholder module to preserve data
                    createPlaceholderModule(obj, moduleData, moduleTypeName);
                }
            });
        }
        
        // Add children
        json.children.forEach(childJson => {
            const child = GameObject.fromJSON(childJson);
            obj.addChild(child);
        });
        
        return obj;
    }

    /**
     * Copy properties from one module to another, with special handling for GameObject references
     * @param {Module} sourceModule - The source module to copy from
     * @param {Module} targetModule - The target module to copy to
     * @param {GameObject} newGameObject - The new GameObject that owns the target module
     */
    copyModuleProperties(sourceModule, targetModule, newGameObject) {
        // First, ensure we have all the necessary objects
        if (!sourceModule || !targetModule || !newGameObject) {
            console.warn("copyModuleProperties: Missing required arguments");
            return;
        }
    
        const originalGameObject = this; // Store reference to original GameObject
        
        // Get all property names (including non-enumerable ones)
        const propertyNames = new Set([
            ...Object.getOwnPropertyNames(sourceModule), 
            ...Object.keys(sourceModule)
        ]);
        
        // Process each property
        for (const key of propertyNames) {
            try {
                // Skip special properties and functions
                if (key === 'id' || key === 'gameObject' || key === 'constructor' || 
                    key.startsWith('__') || typeof sourceModule[key] === 'function') {
                    continue;
                }
                
                // Get the source value
                const value = sourceModule[key];
                
                // Handle different value types
                if (value === null || value === undefined) {
                    targetModule[key] = value;
                } 
                else if (value === originalGameObject) {
                    // Direct reference to the original GameObject
                    targetModule[key] = newGameObject;
                }
                else if (value === sourceModule.gameObject) {
                    // Another way to reference the original GameObject
                    targetModule[key] = newGameObject;
                }
                else if (value instanceof Vector2) {
                    // Deep clone Vector2 (or anything with a clone method)
                    targetModule[key] = value.clone();
                }
                else if (Array.isArray(value)) {
                    // Process arrays - create a new array for the clone
                    targetModule[key] = deepCloneArray(value, originalGameObject, newGameObject);
                }
                else if (typeof value === 'object' && value !== null && 
                         !(value instanceof HTMLElement)) {
                    // For any other objects that aren't DOM elements
                    if (typeof value.clone === 'function') {
                        // Use clone method if available
                        targetModule[key] = value.clone();
                    } else {
                        // Do a deep clone with reference replacement
                        targetModule[key] = deepCloneWithReplacements(value, originalGameObject, newGameObject);
                    }
                } else {
                    // For primitives, do direct assignment
                    targetModule[key] = value;
                }
            } catch (e) {
                console.warn(`Error cloning property ${key} in module ${sourceModule.constructor.name}:`, e);
            }
        }
        
        // Handle private properties for exposed properties
        if (Array.isArray(sourceModule.exposedProperties)) {
            for (const prop of sourceModule.exposedProperties) {
                const propName = prop.name;
                const privatePropName = `_${propName}`;
                
                // Copy the private property if it exists
                if (privatePropName in sourceModule) {
                    const privateValue = sourceModule[privatePropName];
                    
                    if (privateValue === originalGameObject) {
                        targetModule[privatePropName] = newGameObject;
                    } else if (typeof privateValue === 'object' && privateValue !== null) {
                        if (typeof privateValue.clone === 'function') {
                            targetModule[privatePropName] = privateValue.clone();
                        } else {
                            targetModule[privatePropName] = deepCloneWithReplacements(
                                privateValue, originalGameObject, newGameObject
                            );
                        }
                    } else {
                        targetModule[privatePropName] = privateValue;
                    }
                }
            }
        }
    }

    deepCloneObject(obj, newGameObject) {
        if (!obj) return obj;
        
        try {
            // For DOM elements, return as-is
            if (obj instanceof HTMLElement) return obj;
            
            // For objects with clone method, use it
            if (typeof obj.clone === 'function') return obj.clone();
            
            const clone = {};
            
            for (const key in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
                
                const value = obj[key];
                
                if (value === this || value === this.gameObject) {
                    clone[key] = newGameObject;
                } else if (value instanceof Vector2) {
                    clone[key] = value.clone();
                } else if (Array.isArray(value)) {
                    clone[key] = this.deepCloneArray(value, newGameObject);
                } else if (typeof value === 'object' && value !== null && !(value instanceof HTMLElement)) {
                    clone[key] = this.deepCloneObject(value, newGameObject);
                } else {
                    clone[key] = value;
                }
            }
            
            return clone;
            
        } catch (e) {
            console.warn("Failed to deep clone object:", e);
            return {}; // Return empty object as fallback
        }
    }

    /**
     * Deep clone an array, replacing GameObject references
     * @param {Array} arr - The array to clone
     * @param {GameObject} newGameObject - The new GameObject to use for replacements
     * @returns {Array} - Cloned array
     */
    deepCloneArray(arr, originalGameObject, newGameObject) {
        if (!arr) return arr;
        
        return arr.map(item => {
            if (item === originalGameObject || item === originalGameObject.gameObject) {
                return newGameObject;
            }
            else if (item === null || item === undefined || typeof item !== 'object') {
                return item; // Direct copy for primitives
            }
            else if (typeof item.clone === 'function') {
                return item.clone();
            }
            else if (Array.isArray(item)) {
                return this.deepCloneArray(item, originalGameObject, newGameObject);
            }
            else if (item instanceof HTMLElement) {
                return item; // Keep DOM references intact
            }
            else {
                return this.deepCloneWithReplacements(item, originalGameObject, newGameObject);
            }
        });
    }

    /**
     * Deep clone an object with GameObject reference replacements
     * @param {Object} obj - Object to clone
     * @param {GameObject} newGameObject - The new GameObject to use for replacements
     * @returns {Object} Cloned object
     */
    deepCloneWithReplacements(obj, originalGameObject, newGameObject) {
        if (!obj) return obj;
        if (obj === originalGameObject) return newGameObject;
        
        // Skip non-objects and DOM elements
        if (typeof obj !== 'object' || obj instanceof HTMLElement) return obj;
        
        // Handle special objects
        if (typeof obj.clone === 'function') return obj.clone();
        if (obj instanceof Date) return new Date(obj.getTime());
        
        // Handle arrays
        if (Array.isArray(obj)) {
            return this.deepCloneArray(obj, originalGameObject, newGameObject);
        }
        
        // Create a new object of the same type
        const clone = Object.create(Object.getPrototypeOf(obj));
        
        // Copy all properties with reference checks
        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            
            const value = obj[key];
            
            if (value === originalGameObject || value === originalGameObject.gameObject) {
                // Replace GameObject references
                clone[key] = newGameObject;
            } 
            else if (value === null || value === undefined || typeof value !== 'object') {
                // Direct copy for primitives and null/undefined
                clone[key] = value;
            }
            else if (typeof value.clone === 'function') {
                // Use clone method if available
                clone[key] = value.clone(); 
            }
            else if (value instanceof HTMLElement) {
                // Keep references to DOM elements intact
                clone[key] = value;
            }
            else if (Array.isArray(value)) {
                // Deep clone arrays
                clone[key] = this.deepCloneArray(value, originalGameObject, newGameObject);
            }
            else {
                // Deep clone other objects
                clone[key] = this.deepCloneWithReplacements(value, originalGameObject, newGameObject);
            }
        }
        
        return clone;
    }

    /**
     * Recursively replace missed GameObject references in the cloned module
     * @param {Object} obj - The module or object to scan
     * @param {GameObject} newGameObject - The new GameObject to use for replacements
     */
    replaceMissedReferences(obj, newGameObject) {
        if (!obj || typeof obj !== 'object') return;
        
        // Use a Set to track visited objects and avoid circular reference issues
        const visited = new Set();
        
        function scan(o) {
            if (!o || typeof o !== 'object' || visited.has(o)) return;
            visited.add(o);
            
            // Check all properties
            for (const key in o) {
                if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
                if (key === 'gameObject') continue; // Skip the gameObject property itself
                
                const value = o[key];
                
                if (value === this) {
                    // Replace references to the original GameObject
                    o[key] = newGameObject;
                } else if (value && typeof value === 'object' && !visited.has(value)) {
                    // Recursively scan nested objects
                    scan(value);
                }
            }
        }
        
        scan.call(this, obj);
    }

    /**
     * Thoroughly scan an object to find and replace all references to the original GameObject
     * @param {Object} obj - The object to scan
     * @param {GameObject} originalObj - The original GameObject to replace
     * @param {GameObject} newObj - The replacement GameObject
     */
    deepScanAndReplaceAllReferences(obj, originalObj, newObj) {
        if (!obj || typeof obj !== 'object') return;
        
        // Use a WeakMap to track visited objects and avoid circular reference issues
        const visited = new WeakMap();
        
        const scan = (o) => {
            if (!o || typeof o !== 'object' || visited.has(o)) return;
            visited.set(o, true);
            
            // Check all properties recursively
            for (const key in o) {
                if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
                
                const value = o[key];
                
                // Replace direct references
                if (value === originalObj || value === originalObj.gameObject) {
                    o[key] = newObj;
                    continue;
                }
                
                // Recursively scan objects and arrays
                if (typeof value === 'object' && value !== null && !visited.has(value)) {
                    scan(value);
                }
            }
        };
        
        scan(obj);
    }

    /**
     * Clone this GameObject, including all modules and children
     * @returns {GameObject} A deep copy of this GameObject
     */
    clone(addNameCopySuffix = true) {
        const originalGameObject = this; 
        
        // Create new GameObject
        // Only add " (Copy)" if not already present
        let newName = this.name;
        if (addNameCopySuffix && !newName.trim().endsWith("(Copy)")) {
            newName += " (Copy)";
        }
        const cloned = new GameObject(newName);
        
        // Copy basic properties
        cloned.position = this.position.clone();
        cloned.scale = this.scale.clone();
        cloned.size = this.size.clone();
        cloned.origin = this.origin.clone();
        cloned.angle = this.angle;
        cloned.depth = this.depth;
        cloned.active = this.active;
        cloned.visible = this.visible;
        cloned.tags = [...this.tags];
        cloned.editorColor = this.editorColor;
        cloned.collisionEnabled = this.collisionEnabled;
        cloned.collisionLayer = this.collisionLayer;
        cloned.collisionMask = this.collisionMask;
    
        // Copy original position if it exists
        if (this._originalPosition) {
            cloned._originalPosition = { x: this._originalPosition.x, y: this._originalPosition.y };
        }
        
        // Clone modules with proper reference handling
        for (const module of this.modules) {
            try {
                // First get the module class
                let ModuleClass = module.constructor;
                if (!ModuleClass && module.type) {
                    ModuleClass = window.moduleRegistry?.getModuleClass(module.type)
                              || window[module.type];
                }
                
                if (!ModuleClass) {
                    console.warn(`Could not find class for module type ${module.type}`);
                    createPlaceholderModule(cloned, { id: module.id, type: module.type }, module.type);
                    continue;
                }
                
                // Create a new module instance
                const clonedModule = new ModuleClass();
                
                // Generate a new unique ID for the cloned module
                clonedModule.id = crypto.randomUUID();
                
                // Store the module type explicitly
                clonedModule.type = module.type || ModuleClass.name;
                
                // IMPORTANT: Set the gameObject reference first so that 
                // fromJSON has the correct reference when restoring properties
                clonedModule.gameObject = cloned;
                
                // Now restore data from the original module
                const data = module.toJSON();
                if (data) {
                    clonedModule.fromJSON(data);
                }
                
                // Proper attachment
                clonedModule.attachTo(cloned);
                
                // Add the module to the cloned game object's modules array
                cloned.modules.push(clonedModule);
                
                // Call onAttach explicitly if it exists
                if (typeof clonedModule.onAttach === 'function') {
                    clonedModule.onAttach(cloned);
                }
                
                // Deep scan for any missed references
                deepScanAndReplaceReferences(clonedModule, originalGameObject, cloned);
                
            } catch (error) {
                console.error(`Error cloning module ${module.type || module.constructor?.name}:`, error);
            }
        }
        
        // Clone children recursively
        for (const child of this.children) {
            const clonedChild = child.clone();
            cloned.addChild(clonedChild);
        }

        // Final pass to catch any remaining references
        for (const module of cloned.modules) {
            // Replace any remaining references to the original GameObject
            deepScanAndReplaceAllReferences(module, originalGameObject, cloned);
            
            // Also check for private properties
            for (const key in module) {
                if (key.startsWith('_') && module[key] === originalGameObject) {
                    module[key] = cloned;
                }
            }
        }
        
        return cloned;
    }
    
}

function deepScanAndReplaceAllReferences(obj, originalObj, newObj) {
    if (!obj || typeof obj !== 'object') return;
    
    const visited = new WeakMap();
    
    const scan = (o) => {
        if (!o || typeof o !== 'object' || visited.has(o)) return;
        visited.set(o, true);
        
        for (const key in o) {
            if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
            
            const value = o[key];
            
            if (value === originalObj || value === originalObj.gameObject) {
                console.log(`Replacing reference in ${o.constructor.name}.${key}`);
                o[key] = newObj;
            }
            
            if (typeof value === 'object' && value !== null && !visited.has(value)) {
                scan(value);
            }
        }
    };
    
    scan(obj);
}

/**
 * Helper to find available module class 
 * @param {string} moduleName - The module class name to find
 * @returns {Class|null} - The module class or null if not found
 */
function findModuleClass(moduleName) {
    if (!moduleName) return null;
    
    // Check registry first (most reliable source)
    if (window.moduleRegistry) {
        const moduleClass = window.moduleRegistry.getModuleClass(moduleName);
        if (moduleClass) return moduleClass;
    }
    
    // Try direct global lookup with original name
    if (window[moduleName]) return window[moduleName];
    
    // Try camelCase variation
    const camelCase = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
    if (window[camelCase]) return window[camelCase];
    
    // Try capitalized version
    const capitalized = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    if (window[capitalized]) return window[capitalized];
    
    // Not found
    return null;
}

/**
 * Function to copy module properties (outside class to avoid 'this' context issues)
 */
function copyModuleProperties(sourceModule, targetModule, newGameObject, originalGameObject) {
    // First, ensure we have all the necessary objects
    if (!sourceModule || !targetModule || !newGameObject || !originalGameObject) {
        console.warn("copyModuleProperties: Missing required arguments");
        return;
    }
    
    // Get all property names (including non-enumerable ones)
    const propertyNames = new Set([
        ...Object.getOwnPropertyNames(sourceModule), 
        ...Object.keys(sourceModule)
    ]);
    
    // Process each property
    for (const key of propertyNames) {
        try {
            // Skip special properties and functions
            if (key === 'id' || key === 'gameObject' || key === 'constructor' || 
                key.startsWith('__') || typeof sourceModule[key] === 'function') {
                continue;
            }
            
            // Get the source value
            const value = sourceModule[key];
            
            // Handle different value types
            if (value === null || value === undefined) {
                targetModule[key] = value;
            } 
            else if (value === originalGameObject) {
                // Direct reference to the original GameObject
                targetModule[key] = newGameObject;
            }
            else if (value === sourceModule.gameObject) {
                // Another way to reference the original GameObject
                targetModule[key] = newGameObject;
            }
            else if (value instanceof Vector2) {
                // Deep clone Vector2 (or anything with a clone method)
                targetModule[key] = value.clone();
            }
            else if (Array.isArray(value)) {
                // Process arrays - create a new array for the clone
                targetModule[key] = deepCloneArray(value, originalGameObject, newGameObject);
            }
            else if (typeof value === 'object' && value !== null && 
                     !(value instanceof HTMLElement)) {
                // For any other objects that aren't DOM elements
                if (typeof value.clone === 'function') {
                    // Use clone method if available
                    targetModule[key] = value.clone();
                } else {
                    // Do a deep clone with reference replacement
                    targetModule[key] = deepCloneWithReplacements(value, originalGameObject, newGameObject);
                }
            } else {
                // For primitives, do direct assignment
                targetModule[key] = value;
            }
        } catch (e) {
            console.warn(`Error cloning property ${key} in module ${sourceModule.constructor.name}:`, e);
        }
    }
    
    // Handle private properties for exposed properties
    if (Array.isArray(sourceModule.exposedProperties)) {
        for (const prop of sourceModule.exposedProperties) {
            const propName = prop.name;
            const privatePropName = `_${propName}`;
            
            // Copy the private property if it exists
            if (privatePropName in sourceModule) {
                const privateValue = sourceModule[privatePropName];
                
                if (privateValue === originalGameObject) {
                    targetModule[privatePropName] = newGameObject;
                } else if (typeof privateValue === 'object' && privateValue !== null) {
                    if (typeof privateValue.clone === 'function') {
                        targetModule[privatePropName] = privateValue.clone();
                    } else {
                        targetModule[privatePropName] = deepCloneWithReplacements(
                            privateValue, originalGameObject, newGameObject
                        );
                    }
                } else {
                    targetModule[privatePropName] = privateValue;
                }
            }
        }
    }

    targetModule.gameObject = newGameObject;
}

/**
 * Deep clone an array, replacing GameObject references (standalone function)
 */
function deepCloneArray(arr, originalGameObject, newGameObject) {
    if (!arr) return arr;
    
    return arr.map(item => {
        if (item === originalGameObject || item === originalGameObject.gameObject) {
            return newGameObject;
        }
        else if (item === null || item === undefined || typeof item !== 'object') {
            return item; // Direct copy for primitives
        }
        else if (typeof item.clone === 'function') {
            return item.clone();
        }
        else if (Array.isArray(item)) {
            return deepCloneArray(item, originalGameObject, newGameObject);
        }
        else if (item instanceof HTMLElement) {
            return item; // Keep DOM references intact
        }
        else {
            return deepCloneWithReplacements(item, originalGameObject, newGameObject);
        }
    });
}

/**
 * Deep clone an object with GameObject reference replacements (standalone function)
 */
function deepCloneWithReplacements(obj, originalGameObject, newGameObject) {
    if (!obj) return obj;
    if (obj === originalGameObject) return newGameObject;
    
    // Skip non-objects and DOM elements
    if (typeof obj !== 'object' || obj instanceof HTMLElement) return obj;
    
    // Handle special objects
    if (typeof obj.clone === 'function') return obj.clone();
    if (obj instanceof Date) return new Date(obj.getTime());
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return deepCloneArray(obj, originalGameObject, newGameObject);
    }
    
    // Create a new object of the same type
    const clone = Object.create(Object.getPrototypeOf(obj));
    
    // Copy all properties with reference checks
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        
        const value = obj[key];
        
        if (value === originalGameObject || value === originalGameObject.gameObject) {
            // Replace GameObject references
            clone[key] = newGameObject;
        } 
        else if (value === null || value === undefined || typeof value !== 'object') {
            // Direct copy for primitives and null/undefined
            clone[key] = value;
        }
        else if (typeof value.clone === 'function') {
            // Use clone method if available
            clone[key] = value.clone(); 
        }
        else if (value instanceof HTMLElement) {
            // Keep references to DOM elements intact
            clone[key] = value;
        }
        else if (Array.isArray(value)) {
            // Deep clone arrays
            clone[key] = deepCloneArray(value, originalGameObject, newGameObject);
        }
        else {
            // Deep clone other objects
            clone[key] = deepCloneWithReplacements(value, originalGameObject, newGameObject);
        }
    }
    
    return clone;
}

/**
 * Perform a deep scan of an object to find and replace all references to the original GameObject
 * @param {Object} obj - The object to scan
 * @param {GameObject} original - The original GameObject to replace
 * @param {GameObject} replacement - The replacement GameObject
 */
function deepScanAndReplaceReferences(obj, original, replacement) {
    if (!obj || typeof obj !== 'object') return;
    
    // Use a Set to track objects we've already visited to avoid circular references
    const visited = new Set();
    
    function _scan(o) {
        if (!o || typeof o !== 'object' || visited.has(o)) return;
        visited.add(o);
        
        // Check all properties of the object
        for (const key in o) {
            if (!o.hasOwnProperty(key)) continue;
            
            // Skip the 'gameObject' property as it's already set correctly
            if (key === 'gameObject') continue;
            
            const value = o[key];
            
            // If the value is a reference to the original GameObject, replace it
            if (value === original) {
                o[key] = replacement;
            }
            // Recursively scan objects
            else if (value && typeof value === 'object' && !visited.has(value)) {
                _scan(value);
            }
        }
    }
    
    _scan(obj);
}

/**
 * Deep clone an object while replacing references to the original GameObject with the cloned one
 * @param {Object} obj - The object to clone
 * @param {GameObject} originalGameObject - The original GameObject to replace references to
 * @param {GameObject} clonedGameObject - The new GameObject to replace references with
 * @returns {Object} - A deep clone with replaced references
 */
function deepCloneWithReferenceReplacement(obj, originalGameObject, clonedGameObject) {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Handle null
    if (obj === null) return null;
    
    // Handle Date objects
    if (obj instanceof Date) return new Date(obj.getTime());
    
    // Handle GameObject references
    if (obj === originalGameObject) return clonedGameObject;
    
    // Handle Vector2 instances
    if (obj instanceof Vector2) return obj.clone();
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (item === originalGameObject) return clonedGameObject;
            return deepCloneWithReferenceReplacement(item, originalGameObject, clonedGameObject);
        });
    }
    
    // Skip functions (they can't be reliably cloned)
    if (typeof obj === 'function') return undefined;
    
    // Handle objects with their own clone method
    if (typeof obj.clone === 'function') return obj.clone();
    
    // Handle regular objects - deep copy each property
    try {
        // For regular objects, create a new object of the same type
        const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
        
        // Copy each property with reference replacement
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (obj[key] === originalGameObject) {
                    clone[key] = clonedGameObject;
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    clone[key] = deepCloneWithReferenceReplacement(obj[key], originalGameObject, clonedGameObject);
                } else {
                    clone[key] = obj[key];
                }
            }
        }
        
        return clone;
    } catch (e) {
        // Fallback to simpler approach for objects that cause errors
        console.warn("Error during deep clone, using simpler clone:", e);
        
        const simpleClone = {};
        for (const key in obj) {
            if (obj[key] === originalGameObject) {
                simpleClone[key] = clonedGameObject;
            } else if (typeof obj[key] !== 'function') {
                simpleClone[key] = obj[key];
            }
        }
        
        return simpleClone;
    }
}

/**
 * Replace all references to originalObj with newObj in the given object
 * @param {Object} obj - The object to search through
 * @param {Object} originalObj - The object to replace
 * @param {Object} newObj - The replacement object
 */
function replaceReferences(obj, originalObj, newObj) {
    if (!obj || typeof obj !== 'object' || originalObj === null || newObj === null) {
        return;
    }
    
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (obj[key] === originalObj) {
                obj[key] = newObj;
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                replaceReferences(obj[key], originalObj, newObj);
            }
        }
    }
}

/**
 * Safely clone an object, handling non-serializable values like functions, and replacing gameObject references
 * @param {any} obj - The object to clone
 * @param {GameObject} originalGameObject - The original GameObject to replace references to
 * @param {GameObject} newGameObject - The new GameObject to replace references with
 * @returns {any} - A deep clone of the object
 */
function safeClone(obj, originalGameObject, newGameObject) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    // Handle GameObject references
    if (originalGameObject && obj === originalGameObject) {
        return newGameObject;
    }
    
    // Handle primitive types
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return obj;
    }
    
    // Handle Vector2 objects
    if (obj instanceof Vector2) {
        return obj.clone();
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    // Handle arrays with special item handling
    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (originalGameObject && item === originalGameObject) {
                return newGameObject;
            }
            return safeClone(item, originalGameObject, newGameObject);
        });
    }

    // Skip functions - they can't be cloned reliably
    if (typeof obj === 'function') {
        return undefined;
    }

    // Handle objects that have their own clone method
    if (typeof obj.clone === 'function') {
        return obj.clone();
    }

    // For regular objects, create a new object and copy properties
    try {
        // Try using structuredClone first for performance
        const cloned = structuredClone(obj);
        
        // Still need to check for and replace gameObject references
        if (originalGameObject && newGameObject) {
            // Recursively search for references to replace
            replaceReferences(cloned, originalGameObject, newGameObject);
        }
        
        return cloned;
    } catch (e) {
        // Fall back to manual cloning when structuredClone fails
        const clonedObj = Array.isArray(obj) ? [] : {};
        
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (typeof obj[key] === 'function') {
                    // Skip functions - they can't be cloned reliably
                    continue;
                }
                
                // Replace GameObject references
                if (originalGameObject && obj[key] === originalGameObject) {
                    clonedObj[key] = newGameObject;
                } else {
                    clonedObj[key] = safeClone(obj[key], originalGameObject, newGameObject);
                }
            }
        }
        
        return clonedObj;
    }
}

function createPlaceholderModule(gameObj, moduleData, typeName) {
    try {
        // Check if Module class is available
        if (typeof Module === 'undefined') {
            console.error("Module base class not available for placeholder creation");
            return null;
        }

        // Create a basic module that preserves the data
        const placeholderModule = new Module(`${typeName || 'Unknown'} (Missing)`);
        placeholderModule.id = moduleData.id || crypto.randomUUID();
        placeholderModule.type = typeName || 'UnknownModule';
        placeholderModule.missingModule = true;
        placeholderModule.originalData = moduleData;
        placeholderModule.gameObject = gameObj;  // Make sure to set this reference
        
        // Add the placeholder module directly to avoid using addModule which could have side effects
        gameObj.modules.push(placeholderModule);
        
        console.warn(`Created placeholder for missing module: ${typeName}. Available modules: ${
            Array.from(window.moduleRegistry?.modules?.keys() || []).join(', ')
        }`);
        
        return placeholderModule;
    } catch (e) {
        console.error("Failed to create placeholder module:", e);
        return null;
    }
}