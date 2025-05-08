class GameObject {
    constructor(name = "GameObject") {
        this.name = name;
        this.position = new Vector2();
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
        this.drawFallbackShape(ctx);
        
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
        
        // Draw square representation
        const size = 20; // Base size
        ctx.beginPath();
        ctx.rect(-size/2, -size/2, size, size);
        ctx.fillStyle = this.selected ? '#ffffff' : this.editorColor;
        ctx.fill();
        
        // Draw outline if selected
        if (this.selected) {
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 2 / (this.editor?.camera?.zoom || 1);
            ctx.stroke();
        }
        
        // Draw origin point
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000';
        ctx.fill();
        
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
     * Add a module to this GameObject
     * @param {Module} module - The module to add
     * @returns {Module} The added module
     */
    addModule(module) {
        if (!module) {
            console.error("Attempted to add null or undefined module to GameObject:", this.name);
            return null;
        }
        
        // Set bidirectional reference
        module.gameObject = this;
        this.modules.push(module);
        
        // If module has an onAttach method, call it
        if (typeof module.onAttach === 'function') {
            module.onAttach(this);
        }
        
        return module;
    }

    /**
     * Get a module by type
     * @param {class} moduleType - The class/type of module to find
     * @returns {Module} The found module or null
     */
    getModule(moduleType) {
        return this.modules.find(module => module instanceof moduleType);
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
            angle: this.angle,
            depth: this.depth,
            active: this.active,
            tags: [...this.tags],
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
        obj.angle = json.angle;
        obj.depth = json.depth;
        obj.active = json.active;
        obj.tags = [...json.tags];
        
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