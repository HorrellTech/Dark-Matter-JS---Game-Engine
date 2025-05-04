/**
 * Module - Base class for all game object modules
 * 
 * Modules can be attached to GameObjects to extend their functionality.
 * Each module goes through a specific lifecycle and can override methods
 * to implement custom behavior at different stages.
 * 
 * Lifecycle:
 * 1. preload - Called before the game starts, used for loading assets
 * 2. start - Called once when the module is first activated
 * 3. beginLoop - Called at the start of each frame
 * 4. loop - Called every frame (main update logic)
 * 5. endLoop - Called at the end of each frame
 * 6. draw - Called when the module should render
 * 7. onDestroy - Called when the module is being destroyed
 */
class Module {
    /**
     * Create a new Module
     * @param {string} name - The name of this module instance
     */
    constructor(name = "Module") {
        /** @type {string} Name of the module */
        this.name = name;
        
        /** @type {GameObject} GameObject this module is attached to */
        this.gameObject = null;
        
        /** @type {boolean} Whether this module is active */
        this.enabled = true;
        
        /** @type {Object} Custom properties for this module */
        this.properties = {};
    }

    /**
     * Called before the game starts, used for loading assets
     * Override this to load resources needed by your module
     * @returns {Promise<void>}
     */
    async preload() {
        // Override in subclass to implement custom loading behavior
    }

    /**
     * Called once when the module is first activated
     * Use this for initialization logic
     */
    start() {
        // Override in subclass to implement startup behavior
    }

    /**
     * Called at the start of each frame
     * Useful for pre-update operations
     */
    beginLoop() {
        // Override in subclass to implement early frame behavior
    }

    /**
     * Called every frame (main update logic)
     * Use this for your main logic
     * @param {number} deltaTime - Time in seconds since the last frame
     */
    loop(deltaTime) {
        // Override in subclass to implement per-frame behavior
    }

    /**
     * Called at the end of each frame
     * Useful for post-update operations
     */
    endLoop() {
        // Override in subclass to implement late frame behavior  
    }

    /**
     * Called when the module should render
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        // Override in subclass to implement rendering behavior
    }

    /**
     * Called when the module is being destroyed
     * Use this to clean up resources
     */
    onDestroy() {
        // Override in subclass to implement cleanup behavior
    }

    /**
     * Get the world position of the attached GameObject
     * @returns {Vector2} World position 
     */
    getWorldPosition() {
        return this.gameObject ? this.gameObject.getWorldPosition() : new Vector2();
    }

    /**
     * Get the local position of the attached GameObject
     * @returns {Vector2} Local position
     */
    getLocalPosition() {
        return this.gameObject ? this.gameObject.position : new Vector2();
    }

    /**
     * Set the local position of the attached GameObject
     * @param {Vector2} position - New local position
     */
    setLocalPosition(position) {
        if (this.gameObject) {
            this.gameObject.position = position;
        }
    }

    /**
     * Enable this module
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable this module
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Toggle this module's enabled state
     */
    toggle() {
        this.enabled = !this.enabled;
    }

    /**
     * Get a module from the parent GameObject by type/class
     * @param {class} moduleType - The class/type of module to find
     * @returns {Module} The found module or null
     */
    getModule(moduleType) {
        if (!this.gameObject) return null;
        
        return this.gameObject.modules.find(module => module instanceof moduleType);
    }

    /**
     * Set a serializable property value
     * @param {string} key - Property name
     * @param {any} value - Property value 
     */
    setProperty(key, value) {
        this.properties[key] = value;
    }

    /**
     * Get a property value
     * @param {string} key - Property name
     * @param {any} defaultValue - Default value if property doesn't exist
     * @returns {any} The property value or default value
     */
    getProperty(key, defaultValue = null) {
        return key in this.properties ? this.properties[key] : defaultValue;
    }
    
    /**
     * Serialize this module to JSON
     * @returns {Object} Serialized module data
     */
    toJSON() {
        return {
            name: this.name,
            type: this.constructor.name,
            enabled: this.enabled,
            properties: this.properties
        };
    }
    
    /**
     * Deserialize from JSON data
     * @param {Object} json - Serialized module data 
     */
    fromJSON(json) {
        this.name = json.name;
        this.enabled = json.enabled;
        this.properties = json.properties || {};
    }
}

// Make the Module class available globally
window.Module = Module;