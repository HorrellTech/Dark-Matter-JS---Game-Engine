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

        /** @type {Array<string>} Required modules for this module */
        this._requirements = [];
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
        // Override in subclass but provide safety
        if (!this.gameObject) {
            console.warn(`Module ${this.name} has no gameObject reference during start()`);
        }
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
        // Override in subclass but provide safety
        if (!this.gameObject) {
            console.warn(`Module ${this.name} has no gameObject reference during loop()`);
            this.enabled = false; // Disable to prevent further errors
        }
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
     * Called when the module is attached to a GameObject
     * @param {GameObject} gameObject - The GameObject this module is attached to
     */
    onAttach(gameObject) {
        // This is called when the module is added to a GameObject
        // Override in subclasses if needed
    }

    /**
     * Define required modules for this module
     * Modules listed here will be automatically added before this module
     * @param {...string} moduleNames - List of module names required by this module
     */
    requires(...moduleNames) {
        if (!this._requirements) {
            this._requirements = [];
        }
        this._requirements.push(...moduleNames);
        return this;
    }
    
    /**
     * Get all required modules for this module
     * @returns {Array<string>} Array of required module names
     */
    getRequirements() {
        return this._requirements || [];
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
     * Clone this module instance
     * @returns {Module} A new instance of this module with the same properties
     */
    clone() {
        const cloned = new this.constructor();
        
        // Copy all properties except gameObject reference
        Object.keys(this).forEach(key => {
            if (key !== 'gameObject' && typeof this[key] !== 'function') {
                if (this[key] && typeof this[key].clone === 'function') {
                    cloned[key] = this[key].clone();
                } else {
                    cloned[key] = this[key];
                }
            }
        });
        
        return cloned;
    }

    /**
     * Register a module class to be available in the Add Module dropdown
     * @param {Class} moduleClass - The module class to register
     */
    registerModuleClass(moduleClass) {
        if (!moduleClass || !(moduleClass.prototype instanceof Module)) {
            console.error('Not a valid module class:', moduleClass);
            return;
        }
        
        // Check if already registered
        const alreadyRegistered = this.availableModules.some(mod => 
            mod.name === moduleClass.name || mod === moduleClass);
        
        if (!alreadyRegistered) {
            this.availableModules.push(moduleClass);
            console.log(`Registered module: ${moduleClass.name}`);
            
            // Update the dropdown if it's open
            if (this.moduleDropdown && 
                this.moduleDropdown.style.display !== 'none') {
                this.populateModuleDropdown();
            }
        }
    }

    /**
     * Get the list of exposed properties that should be editable in the Inspector
     * @returns {Array<Object>} Array of property descriptors
     */
    getExposedProperties() {
        // Start with properties explicitly marked as exposed
        let exposed = this.exposedProperties || [];
        
        // Also include any properties in this.properties object
        for (const key in this.properties) {
            if (!exposed.some(prop => prop.name === key)) {
                exposed.push({
                    name: key,
                    type: typeof this.properties[key],
                    value: this.properties[key]
                });
            }
        }
        
        return exposed;
    }

    /**
     * Register a property to be exposed in the Inspector
     * @param {string} name - Property name
     * @param {string} type - Property type (string, number, boolean, etc.)
     * @param {any} defaultValue - Default value
     * @param {Object} options - Additional options (min, max, step, etc.)
     */
    exposeProperty(name, type, defaultValue, options = {}) {
        if (!this.exposedProperties) {
            this.exposedProperties = [];
        }
        
        this.exposedProperties.push({
            name,
            type,
            value: defaultValue,
            options
        });
        
        // Store the value in a private property with a different name
        // to avoid conflicts with getters/setters
        const privatePropName = `_${name}`;
        
        // Only set it if it's not already defined
        if (this[privatePropName] === undefined) {
            this[privatePropName] = defaultValue;
        }
        
        // Create property accessor that uses the private property
        if (!Object.getOwnPropertyDescriptor(this, name)) {
            Object.defineProperty(this, name, {
                get: function() {
                    return this[privatePropName];
                },
                set: function(value) {
                    const oldValue = this[privatePropName];
                    this[privatePropName] = value;
                    
                    // Call onChange handler if specified
                    const propDef = this.exposedProperties?.find(p => p.name === name);
                    if (propDef?.options?.onChange && oldValue !== value) {
                        propDef.options.onChange.call(this, value);
                    }
                },
                enumerable: true,
                configurable: true
            });
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
     * Set a property value
     * @param {string} name - Property name
     * @param {any} value - New value
     */
    setProperty(name, value) {
        const privatePropName = `_${name}`;
        
        if (this.hasOwnProperty(privatePropName)) {
            // If we have a private property, use it
            this[privatePropName] = value;
        } else {
            // Otherwise set directly
            this[name] = value;
        }
        
        // Call onChange handler if specified in property options
        const propDef = this.exposedProperties?.find(p => p.name === name);
        if (propDef?.options?.onChange) {
            propDef.options.onChange.call(this, value);
        }
    }

    /**
     * Get a property value
     * @param {string} key - Property name
     * @param {any} defaultValue - Default value if property doesn't exist
     * @returns {any} The property value or default value
     */
    getProperty(name, defaultValue) {
        const privatePropName = `_${name}`;
        
        if (this.hasOwnProperty(privatePropName)) {
            // If we have a private property, use it
            return this[privatePropName];
        }
        
        // Otherwise get directly
        return this[name] !== undefined ? this[name] : defaultValue;
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
            properties: this.properties,
            requirements: this._requirements
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
        this._requirements = json.requirements || [];
    }
}

// Make the Module class available globally
window.Module = Module;