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
     * Clone this GameObject, including all modules and children
     * @returns {GameObject} A deep copy of this GameObject
     */
    clone() {
        // Create a new GameObject with the same name
        const cloned = new GameObject(this.name + " (Copy)");
        
        // Copy basic properties
        cloned.position = this.position.clone();
        cloned.scale = this.scale.clone();
        cloned.size = this.size.clone();
        cloned.angle = this.angle;
        cloned.depth = this.depth;
        cloned.active = this.active;
        cloned.visible = this.visible;
        cloned.tags = [...this.tags];
        cloned.editorColor = this.editorColor;
        cloned.collisionEnabled = this.collisionEnabled;
        cloned.collisionLayer = this.collisionLayer;
        cloned.collisionMask = this.collisionMask;
        
        // Clone all modules
        this.modules.forEach(module => {
            try {
                // Find the constructor for this module
                // Try to find the module class using multiple approaches
                let ModuleClass = null;

                // 1. Try constructor name in window scope
                if (window[module.constructor.name]) {
                    ModuleClass = window[module.constructor.name];
                }
                // 2. Try module registry with constructor name
                else if (window.moduleRegistry && window.moduleRegistry.getModuleClass(module.constructor.name)) {
                    ModuleClass = window.moduleRegistry.getModuleClass(module.constructor.name);
                } 
                // 3. Try using module.type as fallback
                else if (module.type && window[module.type]) {
                    ModuleClass = window[module.type];
                }
                // 4. Try module registry with module.type
                else if (module.type && window.moduleRegistry && window.moduleRegistry.getModuleClass(module.type)) {
                    ModuleClass = window.moduleRegistry.getModuleClass(module.type);
                }
                // 5. Last resort - look through all global properties for matching class
                else if (module.type) {
                    // Try camelCase variation
                    const camelCase = module.type.charAt(0).toLowerCase() + module.type.slice(1);
                    if (window[camelCase]) {
                        ModuleClass = window[camelCase];
                    } else {
                        // Try capitalized version
                        const capitalized = module.type.charAt(0).toUpperCase() + module.type.slice(1);
                        if (window[capitalized]) {
                            ModuleClass = window[capitalized];
                        }
                    }
                }
                
                if (ModuleClass) {
                    // Create a new instance
                    const clonedModule = new ModuleClass();
                    
                    // Generate a new unique ID for the module
                    clonedModule.id = crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    
                    // Set the gameObject reference to the new object FIRST
                    clonedModule.gameObject = cloned;
                    
                    // Perform a scan of all properties of the module to find and replace any references
                    // to the original GameObject with references to the new GameObject
                    for (const key in module) {
                        // Skip these special properties
                        if (key === 'id' || key === 'gameObject') continue;
                        
                        try {
                            // Handle Vector2 objects
                            if (module[key] instanceof Vector2) {
                                clonedModule[key] = module[key].clone();
                            } 
                            // Handle arrays (like vertices in polygons)
                            else if (Array.isArray(module[key])) {
                                // Deep clone the array with gameObject reference replacement
                                clonedModule[key] = module[key].map(item => {
                                    if (item instanceof Vector2) {
                                        return item.clone();
                                    } else if (item === this) {
                                        // Replace references to this GameObject with the cloned one
                                        return cloned;
                                    } else if (item === module.gameObject) {
                                        // Replace references to the module's gameObject with the cloned one
                                        return cloned;
                                    } else if (typeof item === 'object' && item !== null) {
                                        return deepCloneWithReferenceReplacement(item, this, cloned);
                                    }
                                    return item;
                                });
                            }
                            // Handle objects that have their own clone method
                            else if (module[key] && typeof module[key] === 'object' && typeof module[key].clone === 'function') {
                                clonedModule[key] = module[key].clone();
                            }
                            // Replace direct references to the gameObject
                            else if (module[key] === this || module[key] === module.gameObject) {
                                clonedModule[key] = cloned;
                            }
                            // Handle plain objects - deep clone with reference replacement
                            else if (module[key] && typeof module[key] === 'object' && module[key] !== null) {
                                clonedModule[key] = deepCloneWithReferenceReplacement(module[key], this, cloned);
                            }
                            // Handle primitive values
                            else {
                                clonedModule[key] = module[key];
                            }
                        } catch (e) {
                            console.warn(`Error cloning module property ${key}:`, e);
                            // Try direct assignment as fallback
                            clonedModule[key] = module[key];
                        }
                    }
                    
                    // Also copy private properties that store exposed values (_propertyName)
                    if (module.exposedProperties && Array.isArray(module.exposedProperties)) {
                        module.exposedProperties.forEach(prop => {
                            const privatePropName = `_${prop.name}`;
                            if (module.hasOwnProperty(privatePropName)) {
                                const value = module[privatePropName];
    
                                try {
                                    // Use the same deep cloning logic with reference replacement
                                    if (value instanceof Vector2) {
                                        clonedModule[privatePropName] = value.clone();
                                    } else if (value === this || value === module.gameObject) {
                                        clonedModule[privatePropName] = cloned;
                                    } else if (Array.isArray(value)) {
                                        clonedModule[privatePropName] = value.map(item => {
                                            if (item instanceof Vector2) return item.clone();
                                            if (item === this || item === module.gameObject) return cloned;
                                            if (typeof item === 'object' && item !== null) 
                                                return deepCloneWithReferenceReplacement(item, this, cloned);
                                            return item;
                                        });
                                    } else if (value && typeof value === 'object' && typeof value.clone === 'function') {
                                        clonedModule[privatePropName] = value.clone();
                                    } else if (value && typeof value === 'object' && value !== null) {
                                        clonedModule[privatePropName] = deepCloneWithReferenceReplacement(value, this, cloned);
                                    } else {
                                        clonedModule[privatePropName] = value;
                                    }
                                } catch (e) {
                                    console.warn(`Error cloning private property ${privatePropName}:`, e);
                                    // Use direct assignment as fallback
                                    clonedModule[privatePropName] = value;
                                }
                            }
                        });
                    }
                    
                    // Perform a deep scan to find any overlooked references to the original GameObject
                    deepScanAndReplaceReferences(clonedModule, this, cloned);
                    
                    // If the module has a specific cloning method, use it for additional properties
                    if (typeof module._cloneCustomData === 'function') {
                        module._cloneCustomData(clonedModule);
                    }
                    
                    // Add the cloned module directly to avoid reset/reconfiguration in addModule
                    cloned.modules.push(clonedModule);
                    
                    // Call onAttach explicitly to establish the parent-child relationship
                    if (typeof clonedModule.onAttach === 'function') {
                        clonedModule.onAttach(cloned);
                    }
                    
                } else {
                    // Handle case where module class isn't found
                    console.warn(`Module class ${module.constructor.name} not found, creating placeholder`);
                    const placeholderModule = new Module(`${module.constructor.name || module.type} (Missing)`);
                    placeholderModule.type = module.constructor.name || module.type;
                    placeholderModule.missingModule = true;
                    placeholderModule.gameObject = cloned;
                    
                    cloned.modules.push(placeholderModule);
                }
            } catch (error) {
                console.error(`Error cloning module ${module.constructor.name}:`, error);
            }
        });
        
        // Clone all children recursively
        this.children.forEach(child => {
            const clonedChild = child.clone();
            cloned.addChild(clonedChild);
        });
        
        return cloned;
    }
    
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
    // Create a basic module that preserves the data
    const placeholderModule = new Module(`${typeName || 'Unknown'} (Missing)`);
    placeholderModule.id = moduleData.id;
    placeholderModule.type = typeName || 'UnknownModule';
    placeholderModule.missingModule = true;
    placeholderModule.originalData = moduleData;
    
    // Add the placeholder module to preserve the structure
    gameObj.addModule(placeholderModule);
    
    console.warn(`Created placeholder for missing module: ${typeName}`);
}