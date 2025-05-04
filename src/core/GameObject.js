class GameObject {
    constructor(name = "GameObject") {
        this.name = name;
        this.position = new Vector2();
        this.angle = 0;
        this.depth = 0;
        this.modules = [];
        this.children = [];
        this.parent = null;
        this.active = true;
        this.tags = [];
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

    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        // Apply local transform
        const worldPos = this.getWorldPosition();
        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(this.angle * Math.PI / 180);
        
        // Draw all modules
        this.modules.forEach(module => {
            if (module.enabled && module.draw) module.draw(ctx);
        });
        
        ctx.restore();
        
        // Draw all children
        this.children.forEach(child => child.draw(ctx));
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
        module.gameObject = this;
        this.modules.push(module);
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
     * Add a child GameObject
     * @param {GameObject} child - The child to add
     * @returns {GameObject} The added child
     */
    addChild(child) {
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
}