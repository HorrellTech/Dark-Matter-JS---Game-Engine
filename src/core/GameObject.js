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

        this.collisionEnabled = true;  // Flag to enable/disable collision
        this.collisionLayer = 0;       // Collision layer for filtering
        this.collisionMask = 0xFFFF;   // Collision mask for filtering
    }

    generateRandomColor() {
        // Generate a semi-bright color for better visibility on dark backgrounds
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 60%)`;
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
        this.modules.forEach(module => {
            if (module.enabled && module.start) module.start();
        });
        this.children.forEach(child => child.start());
    }

    beginLoop() {
        if (!this.active) return;
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
        const existingModule = this.getModuleByType(module.constructor.name);
        if (existingModule) {
            console.warn(`GameObject already has a ${module.constructor.name} module`);
            return existingModule;
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
    getWorldPosition() {
        let worldPos = this.position.clone();
        if (this.parent) {
            const parentWorldPos = this.parent.getWorldPosition();
            worldPos = worldPos.rotate(this.parent.angle * Math.PI / 180);
            worldPos = worldPos.add(parentWorldPos);
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
            name: this.name,
            position: { x: this.position.x, y: this.position.y },
            size: { width: this.size.x, height: this.size.y },
            angle: this.angle,
            depth: this.depth,
            active: this.active,
            tags: [...this.tags],
            collisionEnabled: this.collisionEnabled,
            collisionLayer: this.collisionLayer,
            collisionMask: this.collisionMask,
            modules: this.modules.map(module => module.toJSON()),
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
        obj.position = new Vector2(json.position.x, json.position.y);
        obj.size = new Vector2(json.size.x, json.size.y);
        obj.angle = json.angle;
        obj.depth = json.depth;
        obj.active = json.active;
        obj.tags = [...json.tags];

        if (json.collisionEnabled !== undefined) obj.collisionEnabled = json.collisionEnabled;
        if (json.collisionLayer !== undefined) obj.collisionLayer = json.collisionLayer;
        if (json.collisionMask !== undefined) obj.collisionMask = json.collisionMask;
        
        // Add modules
        // This requires a module registry to create instances
        // We'll implement this later
        
        // Add children
        json.children.forEach(childJson => {
            const child = GameObject.fromJSON(childJson);
            obj.addChild(child);
        });
        
        return obj;
    }

    /**
     * Clone this GameObject, including all modules and children
     * @returns {GameObject} A deep copy of this GameObject
     */
    clone() {
        const cloned = new GameObject(this.name);
        
        // Copy basic properties
        cloned.position = this.position.clone();
        cloned.scale = this.scale.clone();
        cloned.angle = this.angle;
        cloned.depth = this.depth;
        cloned.active = this.active;
        cloned.visible = this.visible;
        cloned.tags = [...this.tags];
        cloned.editorColor = this.editorColor;
        
        // Don't clone children or modules here - the engine will handle this separately
        
        return cloned;
    }
}